// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL + Persistencia Robusta =====
//
// Versión completa y actualizada del wizard.js
// - Espera robusta por la inicialización de Supabase (evento + polling).
// - Uso de window.supabase o window.globalSupabase.client.
// - Autosave silencioso cada 20s con notificación "AutoSave aplicado".
// - CRUD completo: save (insert/update), load, list, delete, duplicate.
// - Mantiene toda la lógica BYT original (pasos, cálculo, impresión).
// - Añadido: gestión de Partidas en Paso 1 (mínimo 1, con IDs estables y validación).
//
// Reemplaza BYT_SOFTWARE/src/js/wizard.js por este contenido. Haz backup antes.

class WizardCotizacion {
    constructor() {
        this.pasoActual = 1;
        this.totalPasos = 10;

        this.proveedores = null;
        this.providerSeed = [
            'Otro Proveedor','Imperial','Homecenter','WantingChile','Demasled','Dph','Eplum',
            'Ferreteria Santa Rosa','Masisa','CasaChic','MercadoLibre','LedStudio','Marco Cuarzo',
            'Quincalleria Rey','Eli Cortes','OV Estructuras Metalicas','HBT','Doer','Ikea',
            'Emilio Pohl','CasaMusa','Provelcar','Enko','Ferreteria San Martin','Arteformas',
            'Ferretek','Sergio Astorga Pinturas','Bertrand','MyR','Placacentro','Bookstore','RyR','Pernos Kim'
        ];

        this.datos = {
            cliente: {
                nombre_proyecto: '',
                nombre: '',
                direccion: '',
                comuna: '',
                correo: '',
                telefono: '',
                encargado: '',
                notas: ''
            },
            materiales: {
                quincalleria: {},
                tableros: {},
                tapacantos: {},
                servicios_externos: {},
                tableros_madera: {},
                led_electricidad: {},
                otras_compras: {}
            },
            valoresTraspasados: {
                doer: { 
                    nombre: 'Estructuras de fierro',
                    factor: 0.1,
                    materiales: {
                        'estructuras_fierro_1': { nombre: 'Estructuras Fierro 1', cantidad: 0, precio: 0, lugar: '' },
                        'estructuras_fierro_2': { nombre: 'Estructuras Fierro 2', cantidad: 0, precio: 0, lugar: '' }
                    }
                },
                eplum: { 
                    nombre: 'Puertas de Aluminio, vidrios',
                    factor: 0.1,
                    materiales: {
                        'puertas_eplum_1': { nombre: 'Puertas vidrio 1', cantidad: 0, precio: 0, lugar: '' },
                        'puertas_eplum_2': { nombre: 'Puertas vidrio 2', cantidad: 0, precio: 0, lugar: '' },
                        'puertas_eplum_3': { nombre: 'Puertas vidrio 3', cantidad: 0, precio: 0, lugar: '' }
                    }
                },
                cuarzo: { 
                    nombre: 'Piedras, granitos y ultracompactos',
                    factor: 0.1,
                    materiales: {
                        'estructuras_cuarzo_1': { nombre: 'Estructuras Cuarzo 1', cantidad: 0, precio: 0, lugar: '' },
                        'estructuras_cuarzo_2': { nombre: 'Estructuras Cuarzo 2', cantidad: 0, precio: 0, lugar: '' }
                    }
                },
                almuerzo: { 
                    nombre: 'Viaticos',
                    factor: 0.1,
                    materiales: {
                        'almuerzo_1': { nombre: 'Almuerzo 1', cantidad: 0, precio: 0, lugar: '' }
                    }
                },
                transporte: { 
                    nombre: 'Transporte, bencina, despachos',
                    factor: 0.1,
                    materiales: {
                        'transporte_1': { nombre: 'Transporte y despacho 1', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
                        'transporte_2': { nombre: 'Transporte y despacho 2', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
                        'transporte_3': { nombre: 'Transporte y despacho 3', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' }
                    }
                }
            },
            factorGeneral: 2,
            partidas: [] // nuevo: arreglo de partidas {id, nombre}
        };

        // Supabase client cache (se inicializa con _ensureSupabase)
        this._supabase = null;

        // Autosave internals
        this._autosaveInterval = null;
        this._lastSavedSnapshot = null;

        // Plan de pasos
        this.pasosPlan = [
            { numero: 1, titulo: 'Datos del Cliente', categoria: 'cliente', tipo: 'cliente' },
            { numero: 2, titulo: 'Quincallería', categoria: 'quincalleria', tipo: 'material' },
            { numero: 3, titulo: 'Tableros', categoria: 'tableros', tipo: 'material' },
            { numero: 4, titulo: 'Tapacantos', categoria: 'tapacantos', tipo: 'material' },
            { numero: 5, titulo: 'Tableros de Madera', categoria: 'tableros_madera', tipo: 'material' },
            { numero: 6, titulo: 'LED y Electricidad', categoria: 'led_electricidad', tipo: 'material' },
            { numero: 7, titulo: 'Otras Compras', categoria: 'otras_compras', tipo: 'material' },
            { numero: 8, titulo: 'Valores Traspasados', categoria: 'traspasados', tipo: 'traspasados' },
            { numero: 9, titulo: 'Factor General', categoria: 'factor', tipo: 'factor' },
            { numero: 10, titulo: 'Resumen Final', categoria: 'resumen', tipo: 'resumen' }
        ];

        // Inicializar
        this.init();
    }

    // ------------- Init -------------
    init() {
        try {
            this._ensurePartidasInit();
            this.actualizarProgreso();
            this.mostrarPaso(1);
            this.actualizarBarraSuperior();
        } catch (e) {
            console.error('Error inicializando wizard:', e);
        }

        // Intentar inicializar supabase en background (no bloqueante)
        this.initSupabase();

        // Cargar proveedores (no bloquear UI)
        this.loadProviders().catch(() => {});

        // Iniciar autosave silencioso cada 20s
        this.startAutosave();

        // Preparar contenedor de toasts para autoreportes
        this._ensureAutosaveToastContainer();
    }

    // ------------- Supabase helpers -------------
    // initSupabase: intenta tomar cliente si ya existe; no espera.
    initSupabase() {
        try {
            if (this._supabase && typeof this._supabase.from === 'function') return this._supabase;

            if (window.supabase && typeof window.supabase.from === 'function') {
                this._supabase = window.supabase;
                return this._supabase;
            }

            // Si hay un globalSupabase con client (algunos proyectos lo definen así)
            if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                this._supabase = window.globalSupabase.client;
                return this._supabase;
            }

            // No está listo aún (no advertimos fuertemente aquí; lo maneja _ensureSupabase)
            return null;
        } catch (e) {
            console.error('initSupabase error', e);
            return null;
        }
    }

    // _ensureSupabase: espera (polling + evento) hasta waitMs por un cliente válido.
    async _ensureSupabase(waitMs = 5000) {
        try {
            if (this._supabase && typeof this._supabase.from === 'function') return this._supabase;

            // Comprobaciones rápidas
            if (window.supabase && typeof window.supabase.from === 'function') {
                this._supabase = window.supabase;
                return this._supabase;
            }
            if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                this._supabase = window.globalSupabase.client;
                return this._supabase;
            }

            // Escuchar evento 'supabase:ready' si lo despacha el initializer
            let resolved = false;
            const onReady = () => {
                if (window.supabase && typeof window.supabase.from === 'function') {
                    this._supabase = window.supabase;
                    resolved = true;
                } else if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                    this._supabase = window.globalSupabase.client;
                    resolved = true;
                }
            };
            window.addEventListener('supabase:ready', onReady);

            // Polling con timeout
            const start = Date.now();
            while (!resolved && (Date.now() - start) < waitMs) {
                if (window.supabase && typeof window.supabase.from === 'function') {
                    this._supabase = window.supabase;
                    resolved = true;
                    break;
                }
                if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                    this._supabase = window.globalSupabase.client;
                    resolved = true;
                    break;
                }
                await new Promise(res => setTimeout(res, 200));
            }

            window.removeEventListener('supabase:ready', onReady);
            if (resolved) return this._supabase;

            console.warn('[Wizard] initSupabase timeout: supabase no disponible después de espera');
            return null;
        } catch (e) {
            console.error('_ensureSupabase error', e);
            return null;
        }
    }

    // ------------- Providers -------------
    async loadProviders() {
        try {
            if (Array.isArray(this.proveedores) && this.proveedores.length) return this.proveedores;
            let providers = [];

            const supa = await this._ensureSupabase(3000);
            if (supa) {
                try {
                    const { data, error } = await supa.from('providers').select('id,name,active').order('name', { ascending: true });
                    if (!error && Array.isArray(data)) providers = data.map(p => ({ id: p.id, name: p.name, active: p.active }));
                    else if (error) console.warn('Supabase providers error', error);
                } catch (e) {
                    console.warn('Error querying providers', e);
                }
            }

            if (!providers || providers.length === 0) {
                providers = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
            }

            this.proveedores = providers;
            this.fillProviderSelects();
            return this.proveedores;
        } catch (err) {
            console.error('loadProviders error', err);
            this.proveedores = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
            this.fillProviderSelects();
            return this.proveedores;
        }
    }

    // ------------- fillProviderSelects (robusta) -------------
    fillProviderSelects() {
        try {
            const list = Array.isArray(this.proveedores) && this.proveedores.length
                ? this.proveedores
                : (this.providerSeed || []).map(n => ({ id: n, name: n }));

            const selects = document.querySelectorAll('select.lugar-select');
            selects.forEach(select => {
                // valor guardado (puede venir como id o como nombre)
                const rawCurrent = select.getAttribute('data-current') ?? select.value ?? '';
                const currentVal = rawCurrent !== null && rawCurrent !== undefined ? String(rawCurrent).trim() : '';

                // reconstruir opciones pero sin tocar atributos externos del select
                // guardamos el tabindex, name, id y data-* existentes
                const preserved = {
                    id: select.id || '',
                    name: select.name || '',
                    className: select.className || '',
                    dataset: { ...select.dataset }
                };

                // Limpiamos las opciones y re-poblamos
                select.innerHTML = '';
                const ph = document.createElement('option');
                ph.value = '';
                ph.textContent = '-- Selecciona proveedor --';
                select.appendChild(ph);

                list.forEach(p => {
                    const opt = document.createElement('option');
                    // siempre usar strings para value
                    const val = (p.id !== undefined && p.id !== null) ? String(p.id) : String(p.name);
                    opt.value = val;
                    opt.textContent = String(p.name ?? val);
                    // dejar el nombre también en dataset para comparar por nombre si fuera necesario
                    opt.dataset.name = String(p.name ?? '');
                    select.appendChild(opt);
                });

                // Restaurar dataset si existía (para no perder identificadores)
                Object.keys(preserved.dataset || {}).forEach(k => {
                    try { select.dataset[k] = preserved.dataset[k]; } catch (e) {}
                });

                // seleccionar la opción correspondiente (comparar por value, texto o data-name)
                if (currentVal) {
                    let matched = false;
                    for (let i = 0; i < select.options.length; i++) {
                        const o = select.options[i];
                        const oVal = o.value !== undefined && o.value !== null ? String(o.value).trim() : '';
                        const oText = o.textContent !== undefined && o.textContent !== null ? String(o.textContent).trim() : '';
                        const oName = (o.dataset && o.dataset.name) ? String(o.dataset.name).trim() : '';
                        if (oVal === currentVal || oText === currentVal || oName === currentVal) {
                            select.selectedIndex = i;
                            matched = true;
                            break;
                        }
                    }
                    // si no matchea con ninguna opción, agregamos una opción con ese valor (para no perder la info)
                    if (!matched) {
                        const extra = document.createElement('option');
                        extra.value = currentVal;
                        extra.textContent = currentVal;
                        extra.dataset.name = currentVal;
                        extra.selected = true;
                        select.appendChild(extra);
                    }
                } else {
                    // asegurar que quede en la opción placeholder
                    select.value = '';
                }
            });
        } catch (e) {
            console.error('fillProviderSelects error', e);
        }
    }

    // ------------- onProveedorChange (sin re-render) -------------
    onProveedorChange(categoria, materialId, providerValue) {
        try {
            const valueStr = providerValue !== undefined && providerValue !== null ? String(providerValue).trim() : '';
            // Buscar nombre en la lista de proveedores (puede venir id o nombre)
            let providerName = valueStr;
            if (Array.isArray(this.proveedores) && this.proveedores.length) {
                const p = this.proveedores.find(x => {
                    const idStr = (x.id !== undefined && x.id !== null) ? String(x.id) : '';
                    const nameStr = (x.name !== undefined && x.name !== null) ? String(x.name) : '';
                    return idStr === valueStr || nameStr === valueStr;
                });
                if (p) providerName = p.name ?? String(p.id);
            }

            if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;

            // Actualizar datos en memoria (no re-renderizar toda la tabla)
            this.datos.materiales[categoria][materialId].lugar_id = valueStr; // guardamos el id/valor tal cual (string)
            this.datos.materiales[categoria][materialId].lugar = providerName || '';

            // Aseguramos que el select tenga la opción correcta y actualizar subtotales/barra superior
            // Preferimos dejar el DOM del select intacto; solo re-poblamos options si providers cambian
            this.actualizarSubtotalCategoria(categoria);
            this.actualizarBarraSuperior();

            // Si la opción seleccionada no está en la lista actual, forzamos fillProviderSelects para agregarla
            // Esto no reconstruye filas, solo repuebla opciones dentro de cada select existente.
            const currentSelect = document.querySelector(`select.lugar-select[data-current="${this.escapeAttr(valueStr)}"]`);
            if (!currentSelect) {
                // actualizamos data-current del select que disparó el cambio (si se puede identificar)
                const byMaterial = document.querySelector(`select.lugar-select[data-material-id="${this.escapeAttr(materialId)}"]`);
                if (byMaterial) {
                    byMaterial.setAttribute('data-current', valueStr);
                    try { byMaterial.value = valueStr; } catch (e) {}
                }
                this.fillProviderSelects();
            } else {
                // asegurar que el select correspondiente tenga el value seleccionado
                try { currentSelect.value = valueStr; } catch (e) {}
            }

        } catch (e) {
            console.error('onProveedorChange error', e);
        }
    }

    // ------------- onProveedorChangeTraspasado (sin re-render) -------------
    onProveedorChangeTraspasado(categoriaKey, materialKey, providerValue) {
        try {
            const valueStr = providerValue !== undefined && providerValue !== null ? String(providerValue).trim() : '';
            let providerName = valueStr;
            if (Array.isArray(this.proveedores) && this.proveedores.length) {
                const p = this.proveedores.find(x => {
                    const idStr = (x.id !== undefined && x.id !== null) ? String(x.id) : '';
                    const nameStr = (x.name !== undefined && x.name !== null) ? String(x.name) : '';
                    return idStr === valueStr || nameStr === valueStr;
                });
                if (p) providerName = p.name ?? String(p.id);
            }

            if (!this.datos.valoresTraspasados[categoriaKey] || !this.datos.valoresTraspasados[categoriaKey].materiales[materialKey]) return;

            // Actualizar datos en memoria
            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar_id = valueStr;
            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar = providerName || '';

            // Refrescar solo lo necesario: repoblar opciones si hace falta y recalcular totales visibles
            this.fillProviderSelects();

            // Actualizar totales visibles del paso 8 (si están renderizados)
            const totalEl = document.getElementById(`total_traspaso_${categoriaKey}`);
            const cobroEl = document.getElementById(`cobro_traspaso_${categoriaKey}`);
            if (totalEl && cobroEl) {
                let totalTraspaso = 0;
                Object.values(this.datos.valoresTraspasados[categoriaKey].materiales).forEach(m => {
                    totalTraspaso += (m.cantidad || 0) * (m.precio || 0);
                });
                const cobro = totalTraspaso * (this.datos.valoresTraspasados[categoriaKey].factor || 0);
                totalEl.textContent = `$${totalTraspaso.toLocaleString()}`;
                cobroEl.textContent = `$${cobro.toLocaleString()}`;
            } else {
                // fallback: si no están los elementos, regeneramos el paso (caso extremo)
                const paso8 = document.getElementById('paso-8');
                if (paso8) this.generarPasoTraspasados(paso8);
            }

            this.actualizarBarraSuperior();
        } catch (e) {
            console.error('onProveedorChangeTraspasado error', e);
        }
    }

    // ------------- UI / Progreso -------------
    actualizarProgreso() {
        const progreso = (this.pasoActual / this.totalPasos) * 100;
        const barraProgreso = document.getElementById('progreso-barra');
        const textoProgreso = document.getElementById('progreso-texto');
        if (barraProgreso) barraProgreso.style.width = `${progreso}%`;
        if (textoProgreso) {
            const pasoInfo = this.pasosPlan[this.pasoActual - 1];
            textoProgreso.textContent = `Paso ${this.pasoActual} de ${this.totalPasos}: ${pasoInfo ? pasoInfo.titulo : 'Cargando...'}`;
        }
    }

    actualizarBotonesNavegacion() {
        const btnAnterior = document.getElementById('btn-anterior');
        const btnSiguiente = document.getElementById('btn-siguiente');

        if (btnAnterior) {
            btnAnterior.style.display = this.pasoActual > 1 ? 'inline-block' : 'none';
        }

        if (btnSiguiente) {
            btnSiguiente.textContent = this.pasoActual < this.totalPasos ? 'Siguiente →' : 'Finalizar';
        }
    }

    // ------------- Métodos de navegación (se añaden para evitar TypeError) -------------
    anteriorPaso() {
        if (this.pasoActual > 1) {
            this.pasoActual--;
            this.actualizarProgreso();
            this.mostrarPaso(this.pasoActual);
        }
    }

    siguientePaso() {
        if (this.pasoActual < this.totalPasos) {
            this.pasoActual++;
            this.actualizarProgreso();
            this.mostrarPaso(this.pasoActual);
        } else {
            // finalizar: intentar guardar
            try { this.saveCotizacionSupabase(); } catch (e) { console.error('Error al finalizar/siguientePaso:', e); }
        }
    }

    mostrarPaso(numeroPaso) {
        this.pasoActual = Number(numeroPaso) || 1;
        for (let i = 1; i <= this.totalPasos; i++) {
            const paso = document.getElementById(`paso-${i}`);
            if (paso) paso.style.display = 'none';
        }
        const pasoActivo = document.getElementById(`paso-${this.pasoActual}`);
        if (pasoActivo) pasoActivo.style.display = 'block';
        try { this.generarContenidoPaso(this.pasoActual); } catch (e) { console.error('generarContenidoPaso error', e); }
        try { this.actualizarBotonesNavegacion(); } catch (e) {}
    }

    generarContenidoPaso(paso) {
        const pasoInfo = this.pasosPlan[paso - 1];
        const container = document.getElementById(`paso-${paso}`);
        if (!container) return;
        switch (pasoInfo.tipo) {
            case 'cliente':
                this.generarPasoCliente(container);
                break;
            case 'material':
                this.generarPasoMaterial(container, pasoInfo.categoria);
                break;
            case 'traspasados':
                this.generarPasoTraspasados(container);
                break;
            case 'factor':
                this.generarPasoFactor(container);
                break;
            case 'resumen':
                this.generarPasoResumen(container);
                break;
            default:
                container.innerHTML = '<div class="card"><p>Paso no implementado</p></div>';
        }
    }

    // ------------- PASOS (completos) -------------generarPasoCliente
    generarPasoCliente(container) {
        this._ensurePartidasInit();

        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Datos del Cliente y Proyecto</h3>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre del Proyecto *</label>
                        <input type="text" class="form-control" id="nombre_proyecto" 
                               value="${this.escapeHtml(this.datos.cliente.nombre_proyecto || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-control" id="nombre_cliente" 
                               value="${this.escapeHtml(this.datos.cliente.nombre || '')}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Dirección</label>
                        <input type="text" class="form-control" id="direccion" 
                               value="${this.escapeHtml(this.datos.cliente.direccion || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Comuna</label>
                        <input type="text" class="form-control" id="comuna" 
                               value="${this.escapeHtml(this.datos.cliente.comuna || '')}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Correo Electrónico</label>
                        <input type="email" class="form-control" id="correo"
                               inputmode="email" autocomplete="email"
                               value="${this.escapeHtml(this.datos.cliente.correo || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número de contacto</label>
                        <input type="tel" class="form-control" id="telefono"
                               inputmode="tel" pattern="^[0-9+()\\s-]{6,}$"
                               value="${this.escapeHtml(this.datos.cliente.telefono || '')}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Encargado</label>
                        <input type="text" class="form-control" id="encargado" 
                               value="${this.escapeHtml(this.datos.cliente.encargado || '')}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Notas del Proyecto</label>
                    <textarea class="form-control" id="notas" rows="4" 
                              placeholder="Describir detalles específicos del proyecto...">${this.escapeHtml(this.datos.cliente.notas || '')}</textarea>
                </div>
            </div>

            <div class="card" style="margin-top:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <div>
                        <h3 class="card-title" style="margin-bottom:4px;">Partidas / Áreas del proyecto</h3>
                        <p class="muted" style="margin:0;">Define las partidas (ej: Cocina, Closet visita, Mueble baño). Al menos una es obligatoria.</p>
                    </div>
                    <button type="button" class="btn btn-secondary" style="white-space:nowrap;" onclick="window.bytWizard.agregarPartida()">
                        + Agregar partida
                    </button>
                </div>
                <div id="partidas-list" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;"></div>
            </div>
        `;

        ['nombre_proyecto','nombre_cliente','direccion','comuna','correo','telefono','encargado','notas'].forEach(c => {
            const el = document.getElementById(c);
            if (el) {
                el.addEventListener('input', () => {
                    const key = (c === 'nombre_cliente') ? 'nombre' : c;
                    this.datos.cliente[key] = el.value;
                });
            }
        });

        this._renderPartidasUI();
    }

    _renderPartidasUI() {
        const listEl = document.getElementById('partidas-list');
        if (!listEl) return;
        this._ensurePartidasInit();

        listEl.innerHTML = '';

        this.datos.partidas.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.alignItems = 'center';
            row.style.flexWrap = 'wrap';
            row.style.padding = '10px';
            row.style.border = '1px solid #e3e8ea';
            row.style.borderRadius = '10px';
            row.style.background = '#f9fbfb';

            row.innerHTML = `
                <div style="flex:1; min-width:240px;">
                    <label class="form-label" style="font-size:13px; margin-bottom:6px;">Nombre de la partida ${this.escapeHtml('#' + (idx+1))}</label>
                    <input type="text" class="form-control" value="${this.escapeAttr(p.nombre || '')}" placeholder="Ej: Cocina" data-partida-id="${this.escapeAttr(p.id)}">
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" class="btn btn-secondary" data-action="delete" data-partida-id="${this.escapeAttr(p.id)}" ${this.datos.partidas.length <= 1 ? 'disabled' : ''}>
                        Eliminar
                    </button>
                </div>
            `;
            listEl.appendChild(row);
        });

        // Bind inputs
        listEl.querySelectorAll('input[data-partida-id]').forEach(inp => {
            inp.oninput = () => {
                const id = inp.getAttribute('data-partida-id');
                this._actualizarPartidaNombre(id, inp.value);
            };
        });
        listEl.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-partida-id');
                this.eliminarPartida(id);
            };
        });
    }

    _ensurePartidasInit() {
        if (!Array.isArray(this.datos.partidas)) this.datos.partidas = [];
        // asegurar IDs y mínimo 1
        this.datos.partidas = this.datos.partidas.map(p => ({
            id: p.id || this._genPartidaId(),
            nombre: p.nombre || ''
        }));
        if (this.datos.partidas.length === 0) {
            this.datos.partidas.push({ id: this._genPartidaId(), nombre: '' });
        }
    }

    _genPartidaId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'part-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
    }

    agregarPartida() {
        this._ensurePartidasInit();
        this.datos.partidas.push({ id: this._genPartidaId(), nombre: '' });
        this._renderPartidasUI();
    }

    eliminarPartida(id) {
        this._ensurePartidasInit();
        if (this.datos.partidas.length <= 1) {
            alert('Debe existir al menos una partida.');
            return;
        }
        this.datos.partidas = this.datos.partidas.filter(p => p.id !== id);
        if (this.datos.partidas.length === 0) {
            this.datos.partidas.push({ id: this._genPartidaId(), nombre: '' });
        }
        this._renderPartidasUI();
    }

    _actualizarPartidaNombre(id, nombre) {
        this._ensurePartidasInit();
        const p = this.datos.partidas.find(x => x.id === id);
        if (p) {
            p.nombre = nombre;
        }
    }

    generarPasoMaterial(container, categoria) {
        const estructurasBYT = {
            quincalleria: {
                nombre: 'Quincallería',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Bisagras paquete Recta', cantidad: 0, precio: 0 },
                    { nombre: 'Bisagras paquete Curva', cantidad: 0, precio: 0 },
                    { nombre: 'Bisagras paquete SemiCurva', cantidad: 0, precio: 0 },
                    { nombre: 'Corredera Telescópica', cantidad: 0, precio: 0 },
                    { nombre: 'Manillas tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Manillas tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Expulsador Tip On', cantidad: 0, precio: 0 },
                    { nombre: 'Zócalo PVC', cantidad: 0, precio: 0 },
                    { nombre: 'Juego zócalo patas', cantidad: 0, precio: 0 },
                    { nombre: 'Barra closet', cantidad: 0, precio: 0 },
                    { nombre: 'Perfil tubular redondo', cantidad: 0, precio: 0 }
                ]
            },
            tableros: {
                nombre: 'Tableros',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor total',
                materiales: [
                    { nombre: 'Melamina 18mm tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 18mm tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 18mm tipo 3', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm tipo 3', cantidad: 0, precio: 0 },
                    { nombre: 'Durolac', cantidad: 0, precio: 0 },
                    { nombre: 'MDF', cantidad: 0, precio: 0 }
                ]
            },
            tapacantos: {
                nombre: 'Tapacantos',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Metros de tapacanto delgado tipo 1', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto delgado tipo 2', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto delgado tipo 3', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto grueso tipo 1', cantidad: 0, precio: 800 },
                    { nombre: 'Metros de tapacanto grueso tipo 2', cantidad: 0, precio: 800 },
                    { nombre: 'Metros de tapacanto grueso tipo 3', cantidad: 0, precio: 800 }
                ]
            },
            servicios_externos: {
                nombre: 'Servicios Externo de corte',
                descripcion: 'Esta conversa con tableros y tapacantos ya que depende de eso los metros y la cantidad de tableros',
                materiales: [
                    { nombre: 'Servicio Corte tablero Ext o Int', cantidad: 0, precio: 7000 },
                    { nombre: 'Servicio pegado tapacanto delgado', cantidad: 0, precio: 450 },
                    { nombre: 'Servicio corte durolac Ext o Int', cantidad: 0, precio: 3400 },
                    { nombre: 'Servicio pegado tapacanto grueso', cantidad: 0, precio: 700 }
                ]
            },
            tableros_madera: {
                nombre: 'Tableros de Madera',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Panel de madera 30 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de madera 18 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de madera 16 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de Terciado 18 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de Terciado 12 mm', cantidad: 0, precio: 0 }
                ]
            },
            led_electricidad: {
                nombre: 'Led y electricidad',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Canaleta Led tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Canaleta Led tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Cinta Led tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Cinta Led tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Fuente de Poder tipo 1', cantidad: 0, precio: 0 },
                    { nombre: 'Fuente de Poder tipo 2', cantidad: 0, precio: 0 },
                    { nombre: 'Interruptor Led', cantidad: 0, precio: 0 },
                    { nombre: 'Cables Led', cantidad: 0, precio: 0 },
                    { nombre: 'Cables Cordón', cantidad: 0, precio: 0 }
                ]
            },
            otras_compras: {
                nombre: 'Otras compras',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Extras a Considerar', cantidad: 0, precio: 0 },
                    { nombre: 'Vidrios', cantidad: 0, precio: 0 },
                    { nombre: 'Ripado', cantidad: 0, precio: 0 }
                ]
            }
        };

        const estructura = estructurasBYT[categoria];
        if (!estructura) return;

        // Inicializar materiales si no existen
        if (!this.datos.materiales[categoria] || Object.keys(this.datos.materiales[categoria]).length === 0) {
            estructura.materiales.forEach((material, index) => {
                const id = `${categoria}_${index}`;
                this.datos.materiales[categoria][id] = {
                    nombre: material.nombre,
                    cantidad: material.cantidad,
                    precio: material.precio,
                    descripcion: '',
                    lugar: ''
                };
            });
        }

        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">${estructura.nombre}</h3>

                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 25%;">Material</th>
                                <th style="width: 25%;">Descripción</th>
                                <th style="width: 20%;">Lugar de compra</th>
                                <th style="width: 10%;">Cantidad</th>
                                <th style="width: 15%;">Valor Unitario</th>
                                <th style="width: 15%;">Valor Total</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-${categoria}">
                        </tbody>
                    </table>
                </div>

                ${categoria === 'otras_compras' ? `
                <div style="margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="window.bytWizard.agregarMaterial('${categoria}')">
                        + Agregar Material Extra
                    </button>
                </div>` : ''}

                <div style="text-align: right; margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px; border: 2px solid #4CAF50;">
                    <strong style="font-size: 18px;">SUBTOTAL ${estructura.nombre.toUpperCase()}: 
                        <span id="subtotal_${categoria}" style="color: #2e7d32; font-size: 20px; font-weight: bold;">
                            $0
                        </span>
                    </strong>
                </div>
            </div>
        `;

        this.cargarMaterialesCategoria(categoria);
    }

    cargarMaterialesCategoria(categoria) {
        const tbody = document.getElementById(`tabla-${categoria}`);
        if (!tbody) return;

        let html = '';
        const materiales = this.datos.materiales[categoria] || {};

        Object.keys(materiales).forEach(materialId => {
            const material = materiales[materialId];
            html += `
                <tr>
                    <td>${this.escapeHtml(material.nombre)}</td>
                    <td>
                        <input type="text" class="form-control" value="${this.escapeAttr(material.descripcion || '')}" 
                               placeholder="Descripción opcional..."
                               onchange="window.bytWizard.actualizarMaterial('${categoria}', '${materialId}', 'descripcion', this.value)">
                    </td>
                    <td>
                        <select class="form-control lugar-select" data-material-id="${this.escapeAttr(materialId)}" data-current="${this.escapeAttr(material.lugar_id ?? material.lugar ?? '')}" onchange="window.bytWizard.onProveedorChange('${categoria}', '${materialId}', this.value)">
                            <option value="">-- Selecciona proveedor --</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${Number(material.cantidad || 0)}" 
                               onchange="window.bytWizard.actualizarMaterial('${categoria}', '${materialId}', 'cantidad', this.value)">
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${Number(material.precio || 0)}" 
                               onchange="window.bytWizard.actualizarMaterial('${categoria}', '${materialId}', 'precio', this.value)">
                    </td>
                    <td style="font-weight: bold;">$${(((material.cantidad || 0) * (material.precio || 0)) || 0).toLocaleString()}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        // rellenar selects de lugar de compra con proveedores cargados (si ya están)
        this.fillProviderSelects();
        this.actualizarSubtotalCategoria(categoria);
    }

    agregarMaterial(categoria) {
        const nombre = prompt('Nombre del material:');
        if (nombre) {
            const materialId = 'material_' + Date.now();
            this.datos.materiales[categoria][materialId] = {
                nombre: nombre,
                cantidad: 0,
                precio: 0,
                descripcion: '',
                lugar: ''
            };
            this.cargarMaterialesCategoria(categoria);
        }
    }

    actualizarMaterial(categoria, materialId, campo, valor) {
        if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
        if (campo === 'cantidad' || campo === 'precio') {
            this.datos.materiales[categoria][materialId][campo] = parseFloat(valor) || 0;
        } else {
            this.datos.materiales[categoria][materialId][campo] = valor;
        }
        this.cargarMaterialesCategoria(categoria);
        this.actualizarBarraSuperior(); // ⚡ Actualización en tiempo real
    }

    eliminarMaterial(categoria, materialId) {
        if (confirm('¿Eliminar este material?')) {
            delete this.datos.materiales[categoria][materialId];
            this.cargarMaterialesCategoria(categoria);
        }
    }

    actualizarSubtotalCategoria(categoria) {
        let subtotal = 0;
        const materiales = this.datos.materiales[categoria];

        Object.values(materiales).forEach(material => {
            subtotal += (material.cantidad || 0) * (material.precio || 0);
        });

        const elemento = document.getElementById(`subtotal_${categoria}`);
        if (elemento) {
            elemento.textContent = '$' + subtotal.toLocaleString();
        }
    }

    generarPasoTraspasados(container) {
        let html = `
            <div class="card">
                <h3 class="card-title">💰 Valores Traspasados</h3>
                <p style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>ℹ️ Estructura BYT:</strong> Cada categoría tiene factor 0.1 (10%) sobre el total traspaso<br>
                    <code>Total = Suma Materiales + (Suma Materiales × Factor 0.1)</code>
                </p>
        `;

        Object.keys(this.datos.valoresTraspasados).forEach(key => {
            const categoria = this.datos.valoresTraspasados[key];
            html += `
                <div style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; background: #f9f9f9; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; color: var(--color-primary);">
                            Valores Traspasados ${this.escapeHtml(categoria.nombre)}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label>Factor:</label>
                            <select class="form-control" style="width: 80px;" onchange="window.bytWizard.actualizarFactorTraspasado('${key}', this.value)">
                                ${this.generarOpcionesFactor(categoria.factor)}
                            </select>
                        </div>
                    </div>

                    <div class="table-container">
                        <table class="table" style="font-size: 14px;">
                            <thead>
                                <tr>
                                    <th>Materiales</th>
                                    <th>Descripción</th>
                                    <th>Lugar de compra</th>
                                    <th>Cantidad</th>
                                    <th>Valor unitario</th>
                                    <th>Valor total</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            Object.keys(categoria.materiales).forEach(materialKey => {
                const material = categoria.materiales[materialKey];
                const total = (material.cantidad || 0) * (material.precio || 0);
                html += `
                    <tr>
                        <td>${this.escapeHtml(material.nombre)}</td>
                        <td>${this.escapeHtml(material.descripcion || '')}</td>
                        <td>
                            <select class="form-control lugar-select" data-current="${this.escapeAttr(material.lugar_id ?? material.lugar ?? '')}" data-material-id="${this.escapeAttr(materialKey)}" onchange="window.bytWizard.onProveedorChangeTraspasado('${key}', '${materialKey}', this.value)" style="width: 120px; font-size: 12px;">
                                <option value="">-- Selecciona proveedor --</option>
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${Number(material.cantidad || 0)}" 
                                   onchange="window.bytWizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'cantidad', this.value)" 
                                   style="width: 80px;">
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${Number(material.precio || 0)}" 
                                   onchange="window.bytWizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'precio', this.value)" 
                                   style="width: 100px;">
                        </td>
                        <td style="font-weight: bold;">$${total.toLocaleString()}</td>
                    </tr>
                `;
            });

            // Calcular total traspaso
            let totalTraspaso = 0;
            Object.values(categoria.materiales).forEach(material => {
                totalTraspaso += material.cantidad * material.precio;
            });
            const cobroPorTraspaso = totalTraspaso * (categoria.factor || 0);

            html += `
                            </tbody>
                        </table>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <div>
                            <strong>Total Traspaso: <span id="total_traspaso_${key}">$${totalTraspaso.toLocaleString()}</span></strong>
                        </div>
                        <div>
                            <strong>Cobro por traspaso (${((categoria.factor || 0) * 100)}%): 
                                <span id="cobro_traspaso_${key}" style="color: #2e7d32;">$${cobroPorTraspaso.toLocaleString()}</span>
                            </strong>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // rellenar selects de lugar de compra dentro de traspasados si proveedores ya cargados
        this.fillProviderSelects();
    }

    generarOpcionesFactor(factorActual) {
        let opciones = '';
        for (let i = 0; i <= 40; i++) {
            const valor = i * 0.1;
            const selected = Math.abs(valor - (factorActual || 0)) < 0.01 ? 'selected' : '';
            opciones += `<option value="${valor}" ${selected}>${valor.toFixed(1)}</option>`;
        }
        return opciones;
    }

    actualizarFactorTraspasado(categoria, nuevoFactor) {
        if (!this.datos.valoresTraspasados[categoria]) return;
        this.datos.valoresTraspasados[categoria].factor = parseFloat(nuevoFactor) || 0;
        const paso8 = document.getElementById('paso-8');
        if (paso8) this.generarPasoTraspasados(paso8);
        this.actualizarBarraSuperior(); // ⚡ Actualización en tiempo real
    }

    actualizarMaterialTraspasado(categoria, materialKey, campo, valor) {
        if (!this.datos.valoresTraspasados[categoria] || !this.datos.valoresTraspasados[categoria].materiales[materialKey]) return;
        if (campo === 'cantidad' || campo === 'precio') this.datos.valoresTraspasados[categoria].materiales[materialKey][campo] = parseFloat(valor) || 0;
        else this.datos.valoresTraspasados[categoria].materiales[materialKey][campo] = valor;
        const paso8 = document.getElementById('paso-8');
        if (paso8) this.generarPasoTraspasados(paso8);
        this.actualizarBarraSuperior(); // ⚡ Actualización en tiempo real
    }

    generarPasoFactor(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">⚙️ Factor General BYT</h3>
                <p style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>📋 Información:</strong> El factor general se aplica a todos los materiales para calcular la ganancia base.
                </p>

                <div class="form-group">
                    <label class="form-label">Factor General</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" class="form-control" id="factor_general" 
                               value="${this.datos.factorGeneral}" step="0.1" min="1" max="3"
                               onchange="window.bytWizard.actualizarFactor(this.value)" style="width: 120px;">
                        <span style="color: #666;">(Ejemplo: 2 = 100% de ganancia)</span>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h5>💡 Factores Sugeridos:</h5>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn btn-outline-secondary" onclick="window.bytWizard.establecerFactor(2.5)">
                            2.0x (100%)
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="window.bytWizard.establecerFactor(3.0)">
                            2.5x (150%)
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="window.bytWizard.establecerFactor(3.5)">
                            3.0x (200%)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    actualizarFactor(valor) {
        this.datos.factorGeneral = parseFloat(valor) || 2;
        this.actualizarBarraSuperior(); // ⚡ Actualización en tiempo real
    }

    establecerFactor(factor) {
        this.datos.factorGeneral = factor;
        const input = document.getElementById('factor_general');
        if (input) {
            input.value = factor;
        }
        this.actualizarBarraSuperior();
    }

    // ------------- Cálculos BYT -------------
    calcularTotalesBYT() {
        let totalMateriales = 0;
        Object.keys(this.datos.materiales).forEach(categoria => {
            Object.values(this.datos.materiales[categoria]).forEach(material => {
                totalMateriales += (material.cantidad || 0) * (material.precio || 0);
            });
        });

        let totalTraspasos = 0;
        let totalTraspasosFactor = 0;
        let detalleTraspasados = {};

        Object.keys(this.datos.valoresTraspasados).forEach(categoriaKey => {
            const categoria = this.datos.valoresTraspasados[categoriaKey];
            let subtotalCategoria = 0;
            Object.values(categoria.materiales).forEach(material => {
                subtotalCategoria += (material.cantidad || 0) * (material.precio || 0);
            });
            const cobroFactor = subtotalCategoria * (categoria.factor || 0);

            detalleTraspasados[categoriaKey] = {
                subtotal: subtotalCategoria,
                factor: categoria.factor,
                cobroFactor,
                total: subtotalCategoria + cobroFactor
            };

            totalTraspasos += subtotalCategoria;
            totalTraspasosFactor += cobroFactor;
        });

        const materialesConFactor = totalMateriales * this.datos.factorGeneral;
        const subtotalSinIVA = materialesConFactor + totalTraspasos + totalTraspasosFactor;
        const iva = subtotalSinIVA * 0.19;
        const totalConIVA = subtotalSinIVA + iva;
        const ganancia = subtotalSinIVA - totalMateriales - totalTraspasos;

        return {
            totalMateriales,
            factorGeneral: this.datos.factorGeneral,
            materialesConFactor,
            totalTraspasos,
            totalTraspasosFactor,
            totalTraspasados: totalTraspasos + totalTraspasosFactor,
            detalleTraspasados,
            subtotalSinIVA,
            iva,
            totalConIVA,
            ganancia
        };
    }

    // ------------- Barra superior -------------
    actualizarBarraSuperior() {
        try {
            const totales = this.calcularTotalesBYT();

            const elementos = {
                'total-materiales': totales.totalMateriales,
                'factor-valor': totales.factorGeneral + 'x',
                'neto-valor': totales.subtotalSinIVA,
                'iva-valor': totales.iva,
                'total-proyecto': totales.totalConIVA,
                'ganancia-valor': totales.ganancia
            };

            Object.keys(elementos).forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const valor = elementos[id];
                if (id === 'factor-valor') {
                    el.textContent = valor;
                } else {
                    el.textContent = '$' + (typeof valor === 'number' ? valor.toLocaleString() : '0');
                }
            });
        } catch (e) {
            console.error('actualizarBarraSuperior error', e);
        }
    }

    generarPasoResumen(container) {
        const totales = this.calcularTotalesBYT();
        const fecha = new Date().toLocaleDateString('es-CL');
        const numero = this.datos.numero || ('COT-' + Date.now());

        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Resumen Final del Proyecto</h3>

                <div style="margin: 20px 0;">
                    <h4 style="color: var(--color-primary);">📦 Materiales</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Total Materiales Base</span>
                            <span class="summary-value">$${totales.totalMateriales.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Factor General BYT</span>
                            <span class="summary-value" style="color: #ff9800;">${totales.factorGeneral}x</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Materiales con Factor</span>
                            <span class="summary-value">$${totales.materialesConFactor.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Ganancia del Proyecto</span>
                            <span class="summary-value" style="color: #4caf50;">$${totales.ganancia.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <h4 style="color: var(--color-primary);">🏢 Valores Traspasados</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Traspasados Base</span>
                            <span class="summary-value">$${totales.totalTraspasos.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Factores Individuales</span>
                            <span class="summary-value">$${totales.totalTraspasosFactor.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label"><strong>Total Traspasados</strong></span>
                            <span class="summary-value">$${totales.totalTraspasados.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #f0f8f0; border-left: 4px solid #4caf50; border-radius: 8px;">
                    <h4 style="color: #2e7d32; margin-bottom: 10px;">💵 Cálculo de Ganancia BYT</h4>
                    <div style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; font-size: 14px;">
                        Ganancia = TOTAL DEL PROYECTO - Materiales - Traspasados<br>
                        Ganancia = $${totales.subtotalSinIVA.toLocaleString()} - $${totales.totalMateriales.toLocaleString()} - $${totales.totalTraspasos.toLocaleString()}
                    </div>
                    <div style="text-align: center; font-size: 18px; color: #2e7d32; font-weight: bold; margin-top: 10px;">
                        = $${totales.ganancia.toLocaleString()}
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid var(--color-primary); border-radius: 8px;">
                    <h4 style="color: var(--color-primary); margin-bottom: 10px;">🧮 Fórmula BYT Completa Aplicada</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">
                            (Materiales × Factor General) + (Traspasados) + (Traspasados × Factor Individual)
                        </div>
                        <div style="font-family: monospace; font-size: 14px; line-height: 1.6;">
                            <div>• Materiales con Factor: $${totales.totalMateriales.toLocaleString()} × ${totales.factorGeneral} = $${totales.materialesConFactor.toLocaleString()}</div>
                            <div>• Traspasados Base: $${totales.totalTraspasos.toLocaleString()}</div>
                            <div>• Traspasados × Factor: $${totales.totalTraspasosFactor.toLocaleString()}</div>
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold;">
                                SUBTOTAL = $${totales.materialesConFactor.toLocaleString()} + $${totales.totalTraspasos.toLocaleString()} + $${totales.totalTraspasosFactor.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; font-size: 20px; color: #2e5e4e; font-weight: bold; background: #f0f8f0; padding: 10px; border-radius: 6px;">
                        NETO = $${totales.subtotalSinIVA.toLocaleString()}
                    </div>
                </div>

                <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px;">
                    <h4 style="color: var(--color-primary); text-align: center; margin-bottom: 20px;">💰 Totales Finales</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Subtotal (sin IVA)</span>
                            <span class="summary-value">$${totales.subtotalSinIVA.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">IVA (19%)</span>
                            <span class="summary-value">$${totales.iva.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label"><strong>TOTAL PROYECTO</strong></span>
                            <span class="summary-value" style="font-size: 24px; color: #2e5e4e; font-weight: bold;">
                                $${totales.totalConIVA.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #fff; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <h4 style="color: var(--color-primary);">👤 Información del Proyecto</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px;">
                        <div><strong>Proyecto:</strong> ${this.escapeHtml(this.datos.cliente.nombre_proyecto || 'Sin nombre')}</div>
                        <div><strong>Cliente:</strong> ${this.escapeHtml(this.datos.cliente.nombre || 'Sin especificar')}</div>
                        <div><strong>Dirección:</strong> ${this.escapeHtml(this.datos.cliente.direccion || 'No especificada')}</div>
                        <div><strong>Encargado:</strong> ${this.escapeHtml(this.datos.cliente.encargado || 'No especificado')}</div>
                    </div>
                    ${this.datos.cliente.notas ? `<div style="margin-top: 10px;"><strong>Notas:</strong> ${this.datos.cliente.notas}</div>` : ''}
                </div>

                <div style="margin-top: 30px; text-align: center; display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="btn" onclick="window.bytWizard.saveCotizacionSupabase()" 
                            style="padding: 15px 40px; font-size: 18px; background: linear-gradient(135deg, var(--color-primary), #245847);">
                        💾 Guardar Cotización Completa
                    </button>
                    <button type="button" class="btn" onclick="window.bytWizard.imprimirCotizacion()" 
                            style="padding: 15px 40px; font-size: 18px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white;">
                        🖨️ Imprimir Cotización
                    </button>
                </div>
            </div>
        `;
    }

    // ------------- Guardado/CRUD en Supabase -------------
    _buildRowFromDatos() {
        const tot = this.calcularTotalesBYT();
        const numero = this.datos.numero || ('COT-' + Date.now());
        const project_key = (this.datos.cliente.nombre_proyecto || numero).toString().slice(0,200);
        const cliente = this.datos.cliente || {};
        return {
            numero,
            project_key,
            cliente,
            data: this.datos,
            subtotal: Number(tot.subtotalSinIVA || 0),
            iva: Number(tot.iva || 0),
            total: Number(tot.totalConIVA || 0),
            estado: this.datos.estado || 'borrador'
        };
    }

    validateBeforeSave() {
        const hasProyecto = !!(this.datos && this.datos.cliente && String(this.datos.cliente.nombre_proyecto || '').trim() !== '');
        const partidas = Array.isArray(this.datos.partidas) ? this.datos.partidas : [];
        const hasPartida = partidas.some(p => String(p.nombre || '').trim() !== '');
        return hasProyecto && hasPartida;
    }

    async saveCotizacionSupabase({ forceNew = false, silent = false } = {}) {
        try {
            if (!this.validateBeforeSave()) {
                if (!silent) alert('Nombre del proyecto y al menos una partida con nombre son obligatorios.');
                return { ok:false, error:'validation' };
            }

            const supa = await this._ensureSupabase(5000);
            if (!supa) {
                console.warn('No hay cliente supabase disponible (después de esperar)');
                if (!silent) alert('Servicio de persistencia no disponible. Intenta de nuevo más tarde.');
                return { ok:false, error:'no-supabase' };
            }

            // Obtener user id si hay sesión
            let user_id = null;
            try {
                const userResp = await supa.auth.getUser();
                if (userResp?.data?.user) user_id = userResp.data.user.id;
            } catch (e) { /* no auth */ }

            const row = this._buildRowFromDatos();
            row.user_id = user_id;

            if (this.datos._id && !forceNew) {
                const updates = {
                    numero: row.numero,
                    project_key: row.project_key,
                    cliente: row.cliente,
                    data: row.data,
                    subtotal: row.subtotal,
                    iva: row.iva,
                    total: row.total,
                    estado: row.estado,
                    updated_at: new Date().toISOString(),
                    version: (this.datos.version || 1) + 1
                };
                const { data, error } = await supa.from('cotizaciones').update(updates).eq('id', this.datos._id).select().single();
                if (error) {
                    console.error('Error updating cotizacion:', error);
                    if (!silent) alert('Error al actualizar cotización: ' + (error.message || error));
                    return { ok:false, error };
                }
                this.datos._id = data.id;
                this.datos.numero = data.numero;
                this.datos.version = data.version;
                this.datos._updated_at = data.updated_at;
                if (!silent) this._showToast('Cotización actualizada');
                return { ok:true, data };
            } else {
                const insertRow = {
                    numero: row.numero,
                    project_key: row.project_key,
                    cliente: row.cliente,
                    data: row.data,
                    subtotal: row.subtotal,
                    iva: row.iva,
                    total: row.total,
                    estado: row.estado,
                    user_id: row.user_id
                };
                const { data, error } = await supa.from('cotizaciones').insert([insertRow]).select().single();
                if (error) {
                    console.error('Error inserting cotizacion:', error);
                    if (!silent) alert('Error al guardar cotización: ' + (error.message || error));
                    return { ok:false, error };
                }
                this.datos._id = data.id;
                this.datos.numero = data.numero;
                this.datos.version = data.version || 1;
                this.datos._created_at = data.created_at;
                this.datos._updated_at = data.updated_at;
                if (!silent) this._showToast('Cotización guardada');
                return { ok:true, data };
            }
        } catch (err) {
            console.error('saveCotizacionSupabase error', err);
            if (!silent) alert('Error guardando cotización: ' + (err?.message || err));
            return { ok:false, error: err };
        }
    }

    async loadCotizacionSupabase(id) {
        try {
            const supa = await this._ensureSupabase(5000);
            if (!supa) throw new Error('no-supabase');

            const { data, error } = await supa.from('cotizaciones').select('*').eq('id', id).single();
            if (error) throw error;
            if (!data) throw new Error('No data found');

            if (data.data) this.datos = data.data;
            this.datos._id = data.id;
            this.datos.numero = data.numero;
            this.datos.version = data.version;
            this.datos._created_at = data.created_at;
            this.datos._updated_at = data.updated_at;

            this._ensurePartidasInit();
            this.actualizarBarraSuperior();
            this.mostrarPaso(1);
            this._showToast('Cotización cargada');
            return { ok:true, data };
        } catch (err) {
            console.error('loadCotizacionSupabase error', err);
            alert('Error cargando cotización: ' + (err?.message || err));
            return { ok:false, error: err };
        }
    }

    async listCotizacionesSupabase({ limit = 50, offset = 0, filtro = {} } = {}) {
        try {
            const supa = await this._ensureSupabase(5000);
            if (!supa) throw new Error('no-supabase');

            const userResp = await supa.auth.getUser();
            const user_id = userResp?.data?.user?.id || null;

            // Supabase range uses start,end inclusive
            const start = offset;
            const end = Math.max(offset, offset + limit - 1);

            let query = supa.from('cotizaciones').select('id,numero,cliente,subtotal,total,created_at,updated_at,project_key').order('created_at', { ascending: false }).range(start, end);
            if (user_id) query = query.eq('user_id', user_id);

            if (filtro?.numero) query = query.ilike('numero', `%${filtro.numero}%`);
            if (filtro?.project_key) query = query.ilike('project_key', `%${filtro.project_key}%`);

            const { data, error } = await query;
            if (error) throw error;
            return { ok:true, data };
        } catch (err) {
            console.error('listCotizacionesSupabase error', err);
            return { ok:false, error: err };
        }
    }

    async deleteCotizacionSupabase(id) {
        try {
            const supa = await this._ensureSupabase(5000);
            if (!supa) throw new Error('no-supabase');
            const { data, error } = await supa.from('cotizaciones').delete().eq('id', id).select().single();
            if (error) throw error;
            if (this.datos._id === id) {
                this.datos = { cliente: { nombre_proyecto:'', nombre:'', direccion:'', comuna:'', correo:'', telefono:'', encargado:'', notas:'' }, materiales: { quincalleria:{}, tableros:{}, tapacantos:{}, servicios_externos:{}, tableros_madera:{}, led_electricidad:{}, otras_compras:{} }, valoresTraspasados: JSON.parse(JSON.stringify(this.datos.valoresTraspasados || {})), factorGeneral: 2, partidas: [] };
                this._ensurePartidasInit();
                this.mostrarPaso(1);
                this.actualizarBarraSuperior();
            }
            this._showToast('Cotización eliminada');
            return { ok:true, data };
        } catch (err) {
            console.error('deleteCotizacionSupabase error', err);
            return { ok:false, error: err };
        }
    }

    async duplicateCotizacion(id) {
        try {
            const r = await this.loadCotizacionSupabase(id);
            if (!r.ok) return r;
            const cloned = JSON.parse(JSON.stringify(this.datos));
            delete cloned._id;
            cloned.numero = 'COT-' + Date.now();
            cloned._created_at = null;
            cloned._updated_at = null;
            cloned.version = 1;

            // Regenerar IDs de partidas manteniendo nombres
            if (Array.isArray(cloned.partidas)) {
                cloned.partidas = cloned.partidas.map(p => ({ id: this._genPartidaId(), nombre: p.nombre || '' }));
            } else {
                cloned.partidas = [{ id: this._genPartidaId(), nombre: '' }];
            }

            const prev = this.datos;
            this.datos = cloned;
            const res = await this.saveCotizacionSupabase({ forceNew: true });
            return res;
        } catch (err) {
            console.error('duplicateCotizacion error', err);
            return { ok:false, error: err };
        }
    }

    // ------------- Autosave 20s -------------
    startAutosave() {
        try {
            if (this._autosaveInterval) clearInterval(this._autosaveInterval);
            this._lastSavedSnapshot = JSON.stringify(this.datos);
            this._autosaveInterval = setInterval(async () => {
                try {
                    const snapshot = JSON.stringify(this.datos);
                    if (snapshot === this._lastSavedSnapshot) return;
                    if (!this.validateBeforeSave()) return;
                    const res = await this.saveCotizacionSupabase({ forceNew: false, silent: true });
                    if (res && res.ok) {
                        this._lastSavedSnapshot = snapshot;
                        this._showAutosaveToast();
                    }
                } catch (e) {
                    console.warn('Autosave loop error', e);
                }
            }, 20000);
        } catch (e) { console.error('startAutosave error', e); }
    }

    stopAutosave() {
        try { if (this._autosaveInterval) { clearInterval(this._autosaveInterval); this._autosaveInterval = null; } } catch (e) { console.error('stopAutosave error', e); }
    }

    _ensureAutosaveToastContainer() {
        if (document.getElementById('byt-autosave-container')) return;
        const c = document.createElement('div');
        c.id = 'byt-autosave-container';
        c.style.position = 'fixed';
        c.style.top = '12px';
        c.style.right = '12px';
        c.style.zIndex = 99999;
        document.body.appendChild(c);
    }

    _showToast(message = 'Guardado', duration = 2500) {
        try {
            this._ensureAutosaveToastContainer();
            const container = document.getElementById('byt-autosave-container');
            const t = document.createElement('div');
            t.className = 'byt-toast';
            t.style.background = '#2e7d32';
            t.style.color = '#fff';
            t.style.padding = '10px 14px';
            t.style.marginTop = '8px';
            t.style.borderRadius = '6px';
            t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            t.style.fontSize = '13px';
            t.textContent = message;
            container.appendChild(t);
            setTimeout(()=> {
                t.style.transition = 'opacity 300ms';
                t.style.opacity = 0;
                setTimeout(()=> t.remove(), 350);
            }, duration);
        } catch (e) { console.warn('_showToast error', e); }
    }

    _showAutosaveToast() { this._showToast('AutoSave aplicado', 1400); }

    // ------------- Impresión -------------
    imprimirCotizacion() {
        try {
            const totales = this.calcularTotalesBYT();
            const fecha = new Date().toLocaleDateString('es-CL');
            const numero = this.datos.numero || ('COT-' + Date.now());

            // Generar HTML completo (incluye estilos)
            const html = this.generarHTMLImpresion(totales, fecha, numero);
            const ventanaImpresion = window.open('', '_blank');
            if (!ventanaImpresion) { alert('No se pudo abrir ventana de impresión (popup bloqueado)'); return; }
            ventanaImpresion.document.write(html);
            ventanaImpresion.document.close();

            ventanaImpresion.onload = function() {
                setTimeout(() => {
                    ventanaImpresion.print();
                }, 500);
            };
        } catch (e) {
            console.error('imprimirCotizacion error', e);
            alert('Error al imprimir: ' + (e?.message || e));
        }
    }

    previsualizarImpresion() {
        try {
            const totales = this.calcularTotalesBYT();
            const fecha = new Date().toLocaleDateString('es-CL');
            const numero = this.datos.numero || ('COT-' + Date.now());
            const html = this.generarHTMLImpresion(totales, fecha, numero);
            const w = window.open('', '_blank');
            if (!w) { alert('No se pudo abrir la previsualización (popup bloqueado).'); return; }
            w.document.write(html);
            w.document.close();
        } catch (e) {
            console.error('previsualizarImpresion error', e);
            alert('Error al generar previsualización: ' + (e?.message || e));
        }
    }

    obtenerEstilosImpresion() {
        return `
            @media print {
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
                .no-print { display: none !important; }
            }

            body {
                font-family: Arial, sans-serif;
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                background: white;
                color: #333;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #2e5e4e;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }

            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #2e5e4e;
                margin-bottom: 5px;
            }

            .cotizacion-info {
                text-align: right;
                flex: 1;
            }

            .section {
                margin: 25px 0;
            }

            .section-title {
                background: #2e5e4e;
                color: white;
                padding: 8px 15px;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
            }

            .table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }

            .table th,
            .table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }

            .table th {
                background: #f5f5f5;
                font-weight: bold;
                color: #333;
            }

            .formula-box {
                background: #e3f2fd;
                border: 2px solid #2196F3;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }

            .totales-finales {
                background: #f0f8f0;
                border: 3px solid #4CAF50;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
            }
        `;
    }

    generarHTMLImpresion(totales, fecha, numero) {
        // Generar detalle de materiales
        let detalleMateriales = '';
        Object.keys(this.datos.materiales).forEach(categoria => {
            const materiales = this.datos.materiales[categoria] || {};
            let filasCategoria = '';
            Object.values(materiales).forEach(material => {
                if ((material.cantidad || 0) > 0) {
                    const subtotal = (material.cantidad || 0) * (material.precio || 0);
                    filasCategoria += `
                        <tr>
                            <td>${this.escapeHtml(material.nombre)}</td>
                            <td>${this.escapeHtml(material.descripcion || '-')}</td>
                            <td>${this.escapeHtml(material.lugar || '-')}</td>
                            <td style="text-align: center;">${material.cantidad}</td>
                            <td style="text-align: right;">$${(material.precio || 0).toLocaleString()}</td>
                            <td style="text-align: right; font-weight: bold;">$${subtotal.toLocaleString()}</td>
                        </tr>
                    `;
                }
            });

            if (filasCategoria) {
                detalleMateriales += `
                    <tr style="background: #e8f5e8;">
                        <td colspan="6" style="font-weight: bold; color: #2e7d32; text-transform: uppercase;">
                            ${this.escapeHtml(categoria.replace(/_/g, ' '))}
                        </td>
                    </tr>
                    ${filasCategoria}
                `;
            }
        });

        // Generar detalle de traspasados
        let detalleTraspasados = '';
        Object.keys(this.datos.valoresTraspasados).forEach(categoriaKey => {
            const categoria = this.datos.valoresTraspasados[categoriaKey];
            let filasCategoria = '';
            Object.values(categoria.materiales).forEach(material => {
                if ((material.cantidad || 0) > 0) {
                    const subtotal = (material.cantidad || 0) * (material.precio || 0);
                    filasCategoria += `
                        <tr>
                            <td>${this.escapeHtml(material.nombre)}</td>
                            <td>${this.escapeHtml(material.descripcion || '-')}</td>
                            <td style="text-align: center;">${material.cantidad}</td>
                            <td style="text-align: right;">$${(material.precio || 0).toLocaleString()}</td>
                            <td style="text-align: right;">$${subtotal.toLocaleString()}</td>
                        </tr>
                    `;
                }
            });

            if (filasCategoria) {
                detalleTraspasados += `
                    <tr style="background: #fff3e0;">
                        <td colspan="5" style="font-weight: bold; color: #f57c00; text-transform: uppercase;">
                            ${this.escapeHtml(categoriaKey)} (Factor: ${categoria.factor})
                        </td>
                    </tr>
                    ${filasCategoria}
                `;
            }
        });

        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cotización ${numero} - BYT SOFTWARE</title>
                <style>${this.obtenerEstilosImpresion()}</style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">BYT SOFTWARE</div>
                    <div class="cotizacion-info">
                        <div><strong>Cotización:</strong> ${numero}</div>
                        <div><strong>Fecha:</strong> ${fecha}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">📋 INFORMACIÓN DEL PROYECTO</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div style="padding:8px;background:#f8f9fa;border-left:4px solid #2e5e4e;"><strong>Proyecto:</strong> ${this.escapeHtml(this.datos.cliente.nombre_proyecto || 'Sin especificar')}</div>
                        <div style="padding:8px;background:#f8f9fa;border-left:4px solid #2e5e4e;"><strong>Cliente:</strong> ${this.escapeHtml(this.datos.cliente.nombre || 'Sin especificar')}</div>
                        <div style="padding:8px;background:#f8f9fa;border-left:4px solid #2e5e4e;"><strong>Dirección:</strong> ${this.escapeHtml(this.datos.cliente.direccion || 'No especificada')}</div>
                        <div style="padding:8px;background:#f8f9fa;border-left:4px solid #2e5e4e;"><strong>Encargado:</strong> ${this.escapeHtml(this.datos.cliente.encargado || 'No especificado')}</div>
                    </div>
                    ${this.datos.cliente.notas ? `<div style="padding:8px;background:#fff;border:1px solid #e6efe9;border-radius:6px;"><strong>Notas:</strong><div>${this.escapeHtml(this.datos.cliente.notas)}</div></div>` : ''}
                </div>

                ${detalleMateriales ? `
                <div class="section">
                    <div class="section-title">🔧 DETALLE DE MATERIALES</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Descripción</th>
                                <th>Lugar de Compra</th>
                                <th>Cant.</th>
                                <th>Valor Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalleMateriales}
                        </tbody>
                    </table>
                </div>` : ''}

                ${detalleTraspasados ? `
                <div class="section">
                    <div class="section-title">🏢 SERVICIOS TRASPASADOS</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Descripción</th>
                                <th>Cant.</th>
                                <th>Valor Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalleTraspasados}
                        </tbody>
                    </table>
                </div>` : ''}

                <div class="totales-finales">
                    <table class="table" style="margin:0">
                        <tr><td><strong>Subtotal (sin IVA):</strong></td><td style="text-align:right">$${totales.subtotalSinIVA.toLocaleString()}</td></tr>
                        <tr><td><strong>IVA (19%):</strong></td><td style="text-align:right">$${totales.iva.toLocaleString()}</td></tr>
                        <tr style="background:#e8f5e8;"><td><strong>TOTAL FINAL:</strong></td><td style="text-align:right;font-weight:bold;color:#2e7d32">$${totales.totalConIVA.toLocaleString()}</td></tr>
                    </table>
                </div>

                <div style="margin-top:18px;font-size:11px;color:#666">Cotización generada por BYT SOFTWARE - Válida por 30 días</div>
            </body>
            </html>
        `;
    }

    // ------------- Utilities -------------
    escapeHtml(str) {
        if (str === undefined || str === null) return '';
        return String(str).replace(/[&<>"']/g, (s) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]);
    }
    escapeAttr(str) { return this.escapeHtml(String(str || '')).replace(/"/g,'&#34;'); }
}

// ------------- Globals & init -------------
let bytWizard = null;

function anteriorPaso() {
    // Candidates in preferred order
    const candidates = [window.bytWizard, window.wizard, window.__bytWizardProxy];
    for (const inst of candidates) {
        if (!inst) continue;
        // If method exists use it
        if (typeof inst.anteriorPaso === 'function') {
            try { return inst.anteriorPaso(); } catch (e) { console.error('Error calling anteriorPaso on instance', e); return; }
        }
        // Fallback: if mostrarPaso exists and pasoActual is numeric, decrement and call mostrarPaso
        if (typeof inst.mostrarPaso === 'function' && typeof inst.pasoActual !== 'undefined') {
            try {
                inst.pasoActual = Math.max(1, Number(inst.pasoActual || 1) - 1);
                if (typeof inst.actualizarProgreso === 'function') try { inst.actualizarProgreso(); } catch (_) {}
                return inst.mostrarPaso(inst.pasoActual);
            } catch (e) {
                console.error('Fallback anteriorPaso error', e);
                return;
            }
        }
        // Last resort: mutate pasoActual if available
        if (typeof inst.pasoActual !== 'undefined') {
            try { inst.pasoActual = Math.max(1, Number(inst.pasoActual || 1) - 1); return; } catch (e) {}
        }
    }
    console.error('Wizard instance not available for anteriorPaso. bytWizard:', window.bytWizard, 'wizard:', window.wizard);
}

function siguientePaso() {
    const candidates = [window.bytWizard, window.wizard, window.__bytWizardProxy];
    for (const inst of candidates) {
        if (!inst) continue;
        if (typeof inst.siguientePaso === 'function') {
            try { return inst.siguientePaso(); } catch (e) { console.error('Error calling siguientePaso on instance', e); return; }
        }
        // Fallback: if mostrarPaso exists and pasoActual is numeric, increment and call mostrarPaso
        if (typeof inst.mostrarPaso === 'function' && typeof inst.pasoActual !== 'undefined') {
            try {
                const max = (typeof inst.totalPasos === 'number' && inst.totalPasos > 0) ? inst.totalPasos : 999;
                inst.pasoActual = Math.min(max, Number(inst.pasoActual || 1) + 1);
                if (typeof inst.actualizarProgreso === 'function') try { inst.actualizarProgreso(); } catch (_) {}
                return inst.mostrarPaso(inst.pasoActual);
            } catch (e) {
                console.error('Fallback siguientePaso error', e);
                return;
            }
        }
        // Last resort: mutate pasoActual if available
        if (typeof inst.pasoActual !== 'undefined') {
            try { inst.pasoActual = Number(inst.pasoActual || 1) + 1; return; } catch (e) {}
        }
    }
    console.error('Wizard instance not available for siguientePaso. bytWizard:', window.bytWizard, 'wizard:', window.wizard);
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        bytWizard = new WizardCotizacion();
        // Exponer explicitamente la instancia en window.bytWizard
        window.bytWizard = bytWizard;

        // Crear un proxy seguro que delegue a bytWizard y que se pueda usar si alguna parte del HTML llama a "wizard?.siguientePaso()"
        // Solo creamos/reemplazamos window.wizard si NO existe un elemento DOM con id/name "wizard".
        try {
            const existing = Object.prototype.hasOwnProperty.call(window, 'wizard') ? window.wizard : undefined;
            const isDOM = (existing && (existing instanceof HTMLElement || existing instanceof Node));
            if (!isDOM) {
                // build a lightweight proxy that forwards property access and binds methods to the instance
                const proxy = new Proxy(bytWizard, {
                    get(target, prop) {
                        const val = target[prop];
                        if (typeof val === 'function') {
                            return val.bind(target);
                        }
                        return val;
                    },
                    set(target, prop, value) {
                        // allow writable properties on the instance
                        try {
                            target[prop] = value;
                            return true;
                        } catch (e) { return false; }
                    },
                    has(target, prop) {
                        return prop in target;
                    }
                });
                // keep a reference in window.__bytWizardProxy for the wrapper functions to try if needed
                window.__bytWizardProxy = proxy;
                // expose as window.wizard for compatibility (so inline onclick="wizard?.siguientePaso()" works)
                window.wizard = proxy;
                console.log('window.wizard set as proxy to window.bytWizard (no DOM conflict detected).');
            } else {
                // si existe un elemento DOM llamado 'wizard', no lo sobrescribimos; se usa window.bytWizard explícitamente
                console.warn('No sobrescribiendo window.wizard porque existe un elemento DOM con ese nombre/id. Usar window.bytWizard en su lugar.');
            }
        } catch (e) {
            // fallback: exponer al menos window.bytWizard y la referencia proxy en __bytWizardProxy
            try {
                const proxyFallback = new Proxy(bytWizard, {
                    get(target, prop) {
                        const val = target[prop];
                        if (typeof val === 'function') return val.bind(target);
                        return val;
                    }
                });
                window.__bytWizardProxy = proxyFallback;
                console.warn('No se pudo evaluar window.wizard; se expuso window.__bytWizardProxy como fallback.');
            } catch (er) {
                console.warn('No se pudo crear proxy fallback para bytWizard', er);
            }
        }

        console.log('WizardCotizacion inicializado (window.bytWizard)');
    } catch (e) {
        console.error('Error inicializando WizardCotizacion:', e);
    }
});
