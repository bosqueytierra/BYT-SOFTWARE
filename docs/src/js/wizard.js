// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL + CRUD Supabase + Autosave =====
//
// Este archivo integra tu wizard funcional original y añade:
// - Inicialización y uso de window.supabase (creado por supabaseBrowserClient.js)
// - Funciones CRUD: save/load/list/delete/duplicate para tabla "cotizaciones"
// - Autosave cada 20s con notificación tipo "AutoSave aplicado"
// - Validación mínima (nombre proyecto obligatorio)
// - No se cambió la lógica de cálculo BYT original; la amplié con persistencia.
//
// Reemplaza BYT_SOFTWARE/src/js/wizard.js por este archivo. Haz backup antes.

class WizardCotizacion {
    constructor() {
        this.pasoActual = 1;
        this.totalPasos = 10;
        this.datos = {
            cliente: {},
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
                    nombre: 'DOER',
                    factor: 0.1,
                    materiales: {
                        'estructuras_fierro_1': { nombre: 'Estructuras Fierro 1', cantidad: 0, precio: 0, lugar: 'Doer' },
                        'estructuras_fierro_2': { nombre: 'Estructuras Fierro 2', cantidad: 0, precio: 0, lugar: 'Doer' }
                    }
                },
                eplum: { 
                    nombre: 'EPLUM',
                    factor: 0.1,
                    materiales: {
                        'puertas_eplum_1': { nombre: 'Puertas Eplum 1', cantidad: 0, precio: 0, lugar: 'Eplum' },
                        'puertas_eplum_2': { nombre: 'Puertas Eplum 2', cantidad: 0, precio: 0, lugar: 'Eplum' },
                        'puertas_eplum_3': { nombre: 'Puertas Eplum 3', cantidad: 0, precio: 0, lugar: 'Eplum' }
                    }
                },
                cuarzo: { 
                    nombre: 'CUARZO',
                    factor: 0.1,
                    materiales: {
                        'estructuras_cuarzo_1': { nombre: 'Estructuras Cuarzo 1', cantidad: 0, precio: 0, lugar: 'Marco 1' },
                        'estructuras_cuarzo_2': { nombre: 'Estructuras Cuarzo 2', cantidad: 0, precio: 0, lugar: 'Marco 1' }
                    }
                },
                almuerzo: { 
                    nombre: 'ALMUERZO',
                    factor: 0.1,
                    materiales: {
                        'almuerzo_1': { nombre: 'Almuerzo 1', cantidad: 0, precio: 0, lugar: '' }
                    }
                },
                transporte: { 
                    nombre: 'TRANSPORTE',
                    factor: 0.1,
                    materiales: {
                        'transporte_1': { nombre: 'Transporte y despacho 1', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
                        'transporte_2': { nombre: 'Transporte y despacho 2', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
                        'transporte_3': { nombre: 'Transporte y despacho 3', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' }
                    }
                }
            },
            factorGeneral: 1.3
        };
        
        // cache de proveedores
        this.proveedores = null;
        // seed en caso de no tener supabase / REST
        this.providerSeed = [
            'Otro Proveedor','Imperial','Homecenter','WantingChile','Demasled','Dph','Eplum',
            'Ferreteria Santa Rosa','Masisa','CasaChic','MercadoLibre','LedStudio','Marco Cuarzo',
            'Quincalleria Rey','Eli Cortes','OV Estructuras Metalicas','HBT','Doer','Ikea',
            'Emilio Pohl','CasaMusa','Provelcar','Enko','Ferreteria San Martin','Arteformas',
            'Ferretek','Sergio Astorga Pinturas','Bertrand','MyR','Placacentro','Bookstore','RyR','Pernos Kim'
        ];

        // Supabase client interno (se inicializa con initSupabase)
        this._supabase = null;

        // Autosave management
        this._autosaveInterval = null;
        this._lastSavedSnapshot = null; // stringified JSON snapshot last saved

        // Metadata: id on DB, version etc.
        // this.datos._id will hold DB id once saved
        // this.datos.version will hold version integer

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
        
        this.init();
    }
    
    // ------------- Init -------------
    init() {
        this.actualizarProgreso();
        this.mostrarPaso(1);
        this.actualizarBarraSuperior(); // ⚡ Inicializar barra superior

        // Inicializar supabase (usa window.supabase creado por supabaseBrowserClient.js)
        this.initSupabase();

        // Cargar proveedores (llenará selects lugar de compra)
        this.loadProviders().catch(()=>{});

        // Iniciar autosave cada 20 segundos
        this.startAutosave();

        // Crear contenedor para notificaciones de autosave (si no existe)
        this._ensureAutosaveToastContainer();
    }

    // ------------- SUPABASE INIT -------------
    initSupabase() {
        try {
            if (this._supabase && typeof this._supabase.from === 'function') return this._supabase;
            if (window.supabase && typeof window.supabase.from === 'function') {
                this._supabase = window.supabase;
                return this._supabase;
            }
            // Si no existe window.supabase aún, intentar esperar un poco (por si se carga async)
            if (!window.supabase) {
                console.warn('[Wizard] window.supabase no está definido. Asegurate que supabaseBrowserClient.js se haya cargado.');
            }
            return null;
        } catch (e) {
            console.error('initSupabase error', e);
            return null;
        }
    }

    // ------------- Providers -------------
    async loadProviders() {
        try {
            if (Array.isArray(this.proveedores) && this.proveedores.length) return this.proveedores;
            let providers = [];

            // Si supabase disponible, leer tabla providers
            const supa = this.initSupabase();
            if (supa) {
                try {
                    const { data, error } = await supa.from('providers').select('id,name,active').order('name', { ascending: true });
                    if (!error && Array.isArray(data)) providers = data.map(p => ({ id: p.id, name: p.name, active: p.active }));
                    else if (error) console.warn('Supabase providers error', error);
                } catch (e) {
                    console.warn('Error leyendo providers desde supabase', e);
                }
            }

            // Fallback local seed si no hay resultado
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

    fillProviderSelects() {
        try {
            const list = Array.isArray(this.proveedores) && this.proveedores.length ? this.proveedores : (this.providerSeed || []).map(n => ({ id: n, name: n }));
            const selects = document.querySelectorAll('select.lugar-select');
            selects.forEach(select => {
                const currentVal = select.getAttribute('data-current') || select.value || '';
                select.innerHTML = '';
                const ph = document.createElement('option'); ph.value = ''; ph.textContent = '-- Selecciona proveedor --'; select.appendChild(ph);
                list.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = (p.id !== undefined && p.id !== null) ? p.id : p.name;
                    opt.textContent = p.name ?? String(p.id);
                    select.appendChild(opt);
                });
                if (currentVal) {
                    try { select.value = currentVal; } catch (e) {}
                }
            });
        } catch (e) {
            console.error('fillProviderSelects error', e);
        }
    }

    onProveedorChange(categoria, materialId, providerValue) {
        try {
            let providerName = providerValue;
            if (Array.isArray(this.proveedores) && this.proveedores.length) {
                const p = this.proveedores.find(x => String(x.id) === String(providerValue) || x.name === providerValue);
                if (p) providerName = p.name;
            }
            if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
            this.datos.materiales[categoria][materialId].lugar_id = providerValue || '';
            this.datos.materiales[categoria][materialId].lugar = providerName || '';
            this.cargarMaterialesCategoria(categoria);
            this.actualizarBarraSuperior();
        } catch (e) { console.error('onProveedorChange error', e); }
    }

    onProveedorChangeTraspasado(categoriaKey, materialKey, providerValue) {
        try {
            let providerName = providerValue;
            if (Array.isArray(this.proveedores) && this.proveedores.length) {
                const p = this.proveedores.find(x => String(x.id) === String(providerValue) || x.name === providerValue);
                if (p) providerName = p.name;
            }
            if (!this.datos.valoresTraspasados[categoriaKey] || !this.datos.valoresTraspasados[categoriaKey].materiales[materialKey]) return;
            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar_id = providerValue || '';
            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar = providerName || '';
            const paso8 = document.getElementById('paso-8');
            if (paso8) this.generarPasoTraspasados(paso8);
            this.actualizarBarraSuperior();
        } catch (e) { console.error('onProveedorChangeTraspasado error', e); }
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
          case 'cliente': this.generarPasoCliente(container); break;
          case 'material': this.generarPasoMaterial(container, pasoInfo.categoria); break;
          case 'traspasados': this.generarPasoTraspasados(container); break;
          case 'factor': this.generarPasoFactor(container); break;
          case 'resumen': this.generarPasoResumen(container); break;
          default: container.innerHTML = '<div class="card"><p>Paso no implementado</p></div>';
        }
    }

    // ------------- Los pasos (igual que tu código original) -------------
    generarPasoCliente(container) {
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
        `;
        
        const campos = ['nombre_proyecto', 'nombre_cliente', 'direccion', 'encargado', 'notas'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) {
                input.addEventListener('input', () => {
                    this.datos.cliente[campo === 'nombre_cliente' ? 'nombre' : campo] = input.value;
                });
            }
        });
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
                    { nombre: 'Tip On', cantidad: 0, precio: 0 },
                    { nombre: 'Zócalo PVC', cantidad: 0, precio: 0 },
                    { nombre: 'Juego Zócalo Patas', cantidad: 0, precio: 0 },
                    { nombre: 'Barra Closet', cantidad: 0, precio: 0 },
                    { nombre: 'Perfil tubular redondo', cantidad: 0, precio: 0 }
                ]
            },
            tableros: {
                nombre: 'Tableros',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor total',
                materiales: [
                    { nombre: 'Melamina 18mm TIPO 1', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 18mm TIPO 2', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 18mm TIPO 3', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm TIPO 1', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm TIPO 2', cantidad: 0, precio: 0 },
                    { nombre: 'Melamina 15mm TIPO 3', cantidad: 0, precio: 0 },
                    { nombre: 'Durolac', cantidad: 0, precio: 0 },
                    { nombre: 'MDF', cantidad: 0, precio: 0 }
                ]
            },
            tapacantos: {
                nombre: 'Tapacantos',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Metros de tapacanto delgado TIPO 1', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto delgado TIPO 2', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto delgado TIPO 3', cantidad: 0, precio: 400 },
                    { nombre: 'Metros de tapacanto grueso tipo 1', cantidad: 0, precio: 800 },
                    { nombre: 'Metros de tapacanto grueso tipo 2', cantidad: 0, precio: 800 },
                    { nombre: 'Metros de tapacanto grueso tipo 3', cantidad: 0, precio: 800 }
                ]
            },
            servicios_externos: {
                nombre: 'Servicios Externo de corte',
                descripcion: 'Esta conversa con tableros y tapacantos ya que depende de eso los metros y la cantidad de tableros',
                materiales: [
                    { nombre: 'Servicio Corte tablero EXTERNO', cantidad: 0, precio: 7000 },
                    { nombre: 'Servicio Pegado tapacanto Delgado', cantidad: 0, precio: 450 },
                    { nombre: 'Servicio Corte Durolac EXTERNO', cantidad: 0, precio: 3400 },
                    { nombre: 'Servicio Pegado tapacanto Grueso', cantidad: 0, precio: 700 }
                ]
            },
            tableros_madera: {
                nombre: 'Tableros de Madera',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Panel de Pino 30 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de Pino 18 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Panel de Pino 16 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Terciado 18 mm', cantidad: 0, precio: 0 },
                    { nombre: 'Terciado 12 mm', cantidad: 0, precio: 0 }
                ]
            },
            led_electricidad: {
                nombre: 'Led y electricidad',
                descripcion: 'Materiales | Descripción | Lugar de compra | Cantidad | Valor unitario | Valor total',
                materiales: [
                    { nombre: 'Canaleta Led TIPO 1', cantidad: 0, precio: 0 },
                    { nombre: 'Canaleta Led TIPO 2', cantidad: 0, precio: 0 },
                    { nombre: 'Cinta Led TIPO 1', cantidad: 0, precio: 0 },
                    { nombre: 'Cinta Led TIPO 2', cantidad: 0, precio: 0 },
                    { nombre: 'Fuente de Poder TIPO 1', cantidad: 0, precio: 0 },
                    { nombre: 'Fuente de Poder TIPO 2', cantidad: 0, precio: 0 },
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
                            <!-- Se llena con TU estructura BYT -->
                        </tbody>
                    </table>
                </div>
                
                ${categoria === 'otras_compras' ? `
                <div style="margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="wizard.agregarMaterial('${categoria}')">
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
        const materiales = this.datos.materiales[categoria];
        
        Object.keys(materiales).forEach(materialId => {
            const material = materiales[materialId];
            html += `
                <tr>
                    <td>${this.escapeHtml(material.nombre)}</td>
                    <td>
                        <input type="text" class="form-control" value="${this.escapeAttr(material.descripcion || '')}" 
                               placeholder="Descripción opcional..."
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'descripcion', this.value)">
                    </td>
                    <td>
                        <select class="form-control lugar-select" data-current="${this.escapeAttr(material.lugar || '')}" onchange="wizard.onProveedorChange('${categoria}', '${materialId}', this.value)">
                            <option value="">-- Selecciona proveedor --</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${Number(material.cantidad || 0)}" 
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'cantidad', this.value)">
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${Number(material.precio || 0)}" 
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'precio', this.value)">
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
                            <select class="form-control" style="width: 80px;" onchange="wizard.actualizarFactorTraspasado('${key}', this.value)">
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
                            <select class="form-control lugar-select" data-current="${this.escapeAttr(material.lugar || '')}" onchange="wizard.onProveedorChangeTraspasado('${key}', '${materialKey}', this.value)" style="width: 120px; font-size: 12px;">
                                <option value="">-- Selecciona proveedor --</option>
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${Number(material.cantidad || 0)}" 
                                   onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'cantidad', this.value)" 
                                   style="width: 80px;">
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${Number(material.precio || 0)}" 
                                   onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'precio', this.value)" 
                                   style="width: 100px;">
                        </td>
                        <td style="font-weight: bold;">$${total.toLocaleString()}</td>
                    </tr>
                `;
            });
            
            // Calcular total traspaso
            let totalTraspaso = 0;
            Object.values(categoria.materiales).forEach(material => {
                totalTraspaso += (material.cantidad || 0) * (material.precio || 0);
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
            const selected = Math.abs(valor - factorActual) < 0.01 ? 'selected' : '';
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
                    <strong>📋 Información:</strong> El factor general se aplica a todos los materiales para calcular la ganancia base de BYT.
                </p>
                
                <div class="form-group">
                    <label class="form-label">Factor General</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" class="form-control" id="factor_general" 
                               value="${this.datos.factorGeneral}" step="0.1" min="1" max="3"
                               onchange="wizard.actualizarFactor(this.value)" style="width: 120px;">
                        <span style="color: #666;">(Ejemplo: 1.3 = 30% de ganancia)</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h5>💡 Factores Sugeridos:</h5>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(2)">
                            2.0x (100%)
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(2.5)">
                            2.5x (150%)
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(3)">
                            3.0x (200%)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    actualizarFactor(valor) {
        this.datos.factorGeneral = parseFloat(valor) || 1.3;
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
        Object.keys(this.datos.materiales).forEach(cat => Object.values(this.datos.materiales[cat]).forEach(m => totalMateriales += ((m.cantidad||0)*(m.precio||0))));
        let totalTraspasos = 0, totalTraspasosFactor = 0;
        const detalleTraspasados = {};
        Object.keys(this.datos.valoresTraspasados).forEach(k => {
          const c = this.datos.valoresTraspasados[k];
          let subtotal = 0;
          Object.values(c.materiales).forEach(m => subtotal += ((m.cantidad||0)*(m.precio||0)));
          const cobro = subtotal * (c.factor || 0);
          detalleTraspasados[k] = { subtotal, factor: c.factor, cobro, total: subtotal + cobro };
          totalTraspasos += subtotal; totalTraspasosFactor += cobro;
        });
        const materialesConFactor = totalMateriales * this.datos.factorGeneral;
        const subtotalSinIVA = materialesConFactor + totalTraspasos + totalTraspasosFactor;
        const iva = subtotalSinIVA * 0.19;
        const totalConIVA = subtotalSinIVA + iva;
        const ganancia = subtotalSinIVA - totalMateriales - totalTraspasos;
        return { totalMateriales, factorGeneral: this.datos.factorGeneral, materialesConFactor, totalTraspasos, totalTraspasosFactor, totalTraspasados: totalTraspasos + totalTraspasosFactor, detalleTraspasados, subtotalSinIVA, iva, totalConIVA, ganancia };
    }

    actualizarBarraSuperior() {
        try {
            const tot = this.calcularTotalesBYT();
            const map = { 'total-materiales': tot.totalMateriales, 'factor-valor': tot.factorGeneral + 'x', 'neto-valor': tot.subtotalSinIVA, 'iva-valor': tot.iva, 'total-proyecto': tot.totalConIVA, 'ganancia-valor': tot.ganancia };
            Object.keys(map).forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const v = map[id];
                if (id === 'factor-valor') el.textContent = v;
                else el.textContent = '$' + (typeof v === 'number' ? v.toLocaleString() : '0');
            });
        } catch (e) { console.error('actualizarBarraSuperior error', e); }
    }

    generarPasoResumen(container) {
        const totales = this.calcularTotalesBYT();
        const fecha = new Date().toLocaleDateString('es-CL');
        const numero = this.datos.numero || ('COT-' + Date.now());
        // Use simplified summary (original logic kept)
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Resumen Final del Proyecto</h3>
                <div style="margin:20px 0;">
                  <strong>Proyecto:</strong> ${this.escapeHtml(this.datos.cliente.nombre_proyecto || 'Sin nombre')}<br>
                  <strong>Cliente:</strong> ${this.escapeHtml(this.datos.cliente.nombre || 'Sin especificar')}<br>
                  <strong>Fecha:</strong> ${fecha}<br>
                  <strong>Nº Cotización:</strong> ${numero}
                </div>
                <div style="margin:10px 0;">
                  <strong>Subtotal (sin IVA):</strong> $${totales.subtotalSinIVA.toLocaleString()}<br>
                  <strong>IVA (19%):</strong> $${totales.iva.toLocaleString()}<br>
                  <strong>TOTAL:</strong> $${totales.totalConIVA.toLocaleString()}
                </div>
                <div style="margin-top:20px;text-align:center">
                  <button class="btn" onclick="wizard.saveCotizacionSupabase()">💾 Guardar</button>
                  <button class="btn" onclick="wizard.saveCotizacionSupabase({forceNew:true})" style="margin-left:8px">💾 Guardar como nuevo</button>
                  <button class="btn" onclick="wizard.previsualizarImpresion()" style="margin-left:8px">🔎 Previsualizar</button>
                  <button class="btn" onclick="wizard.imprimirCotizacion()" style="margin-left:8px">🖨️ Imprimir</button>
                </div>
            </div>
        `;
    }

    // ------------- Navegación -------------
    actualizarBotonesNavegacion() {
        const btnAnterior = document.getElementById('btn-anterior');
        const btnSiguiente = document.getElementById('btn-siguiente');
        if (btnAnterior) btnAnterior.style.display = this.pasoActual > 1 ? 'inline-block' : 'none';
        if (btnSiguiente) btnSiguiente.textContent = this.pasoActual < this.totalPasos ? 'Siguiente →' : 'Finalizar';
    }

    anteriorPaso() {
        if (this.pasoActual > 1) { this.pasoActual--; this.actualizarProgreso(); this.mostrarPaso(this.pasoActual); }
    }

    siguientePaso() {
        if (!this.validarPasoActual()) return;
        if (this.pasoActual < this.totalPasos) { this.pasoActual++; this.actualizarProgreso(); this.mostrarPaso(this.pasoActual); }
        else { this.saveCotizacionSupabase(); }
    }

    validarPasoActual() {
        try {
            const pasoInfo = this.pasosPlan[this.pasoActual - 1];
            if (pasoInfo?.tipo === 'cliente') {
                const nombre = document.getElementById('nombre_proyecto'); const cliente = document.getElementById('nombre_cliente');
                if (!nombre?.value || !cliente?.value) { alert('Por favor complete los campos obligatorios'); return false; }
            }
        } catch (e) { console.warn('validarPasoActual error', e); }
        return true;
    }

    // ------------- Guardar / leer / CRUD con Supabase -------------
    // Genera el objeto row que vamos a guardar en la tabla cotizaciones
    _buildRowFromDatos() {
        const tot = this.calcularTotalesBYT();
        const numero = this.datos.numero || ('COT-' + Date.now());
        const project_key = (this.datos.cliente.nombre_proyecto || numero).toString().slice(0,200);
        const cliente = this.datos.cliente || {};
        const row = {
            numero,
            project_key,
            cliente,
            data: this.datos,
            subtotal: Number(tot.subtotalSinIVA || 0),
            iva: Number(tot.iva || 0),
            total: Number(tot.totalConIVA || 0),
            estado: this.datos.estado || 'borrador'
        };
        return row;
    }

    // Validaciones mínimas antes de guardar
    validateBeforeSave() {
        if (!this.datos?.cliente?.nombre_proyecto || String(this.datos.cliente.nombre_proyecto).trim() === '') {
            // No guardamos si no hay nombre de proyecto
            return false;
        }
        return true;
    }

    // Guardar en Supabase: insert o update según this.datos._id. forceNew = true fuerza un insert.
    async saveCotizacionSupabase({ forceNew = false, silent = false } = {}) {
        try {
            if (!this.validateBeforeSave()) {
                if (!silent) alert('Nombre del proyecto es obligatorio para guardar.');
                return { ok:false, error: 'validation' };
            }

            const supa = this.initSupabase();
            if (!supa) {
                console.warn('No hay cliente supabase disponible');
                return { ok:false, error: 'no-supabase' };
            }

            // Obtener user id de la sesión
            let user_id = null;
            try {
                const userResp = await supa.auth.getUser();
                if (userResp?.data?.user) user_id = userResp.data.user.id;
            } catch (e) {
                // continuo sin user id (pero en RLS necesitarás autenticación)
                console.warn('No se pudo obtener user desde supabase.auth', e);
            }

            const row = this._buildRowFromDatos();
            row.user_id = user_id;

            if (this.datos._id && !forceNew) {
                // Update
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
                    // version increment (optimistic - optional)
                    version: (this.datos.version || 1) + 1
                };
                const { data, error } = await supa.from('cotizaciones').update(updates).eq('id', this.datos._id).select().single();
                if (error) {
                    console.error('Error updating cotizacion:', error);
                    if (!silent) alert('Error al actualizar cotización: ' + (error.message || error));
                    return { ok:false, error };
                }
                // sincronizar metadatos
                this.datos._id = data.id;
                this.datos.numero = data.numero;
                this.datos.version = data.version;
                this.datos._updated_at = data.updated_at;
                if (!silent) this._showToast('Cotización actualizada');
                return { ok:true, data };
            } else {
                // Insert
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
                // guardar metadatos en wizard
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

    // Cargar una cotización por id (rehidrata this.datos y re-renderiza)
    async loadCotizacionSupabase(id) {
        try {
            const supa = this.initSupabase();
            if (!supa) throw new Error('no-supabase');

            const { data, error } = await supa.from('cotizaciones').select('*').eq('id', id).single();
            if (error) throw error;
            if (!data) throw new Error('No data found');

            // Aplicar data
            if (data.data) this.datos = data.data;
            // preservar metadatos
            this.datos._id = data.id;
            this.datos.numero = data.numero;
            this.datos.version = data.version;
            this.datos._created_at = data.created_at;
            this.datos._updated_at = data.updated_at;

            // Re-render
            this.actualizarBarraSuperior();
            this.mostrarPaso(1); // posicionado en primer paso cuando se abre (según tu pedido)
            if (document.querySelector('.wizard-container')) {
              // Forzar regenerar paso actual
              this.generarContenidoPaso(this.pasoActual);
            }
            this._showToast('Cotización cargada');
            return { ok:true, data };
        } catch (err) {
            console.error('loadCotizacionSupabase error', err);
            alert('Error cargando cotización: ' + (err?.message || err));
            return { ok:false, error: err };
        }
    }

    // Listar cotizaciones del usuario autenticado (paginado)
    async listCotizacionesSupabase({ limit = 50, offset = 0, filtro = {} } = {}) {
        try {
            const supa = this.initSupabase();
            if (!supa) throw new Error('no-supabase');

            // Construir query: listar solo del user actual
            const userResp = await supa.auth.getUser();
            const user_id = userResp?.data?.user?.id || null;
            let query = supa.from('cotizaciones').select('id,numero,cliente,subtotal,total,created_at,updated_at').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
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

    // Eliminar cotización por id
    async deleteCotizacionSupabase(id) {
        try {
            const supa = this.initSupabase();
            if (!supa) throw new Error('no-supabase');
            const { data, error } = await supa.from('cotizaciones').delete().eq('id', id).select().single();
            if (error) throw error;
            // Si la cotización eliminada es la que está abierta, limpiar wizard
            if (this.datos._id === id) {
                this.datos = { cliente: {}, materiales: { quincalleria:{}, tableros:{}, tapacantos:{}, servicios_externos:{}, tableros_madera:{}, led_electricidad:{}, otras_compras:{} }, valoresTraspasados: this.datos.valoresTraspasados, factorGeneral: 1.3 };
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

    // Duplicar una cotización (crea nueva con nuevo numero)
    async duplicateCotizacion(id) {
        try {
            const load = await this.loadCotizacionSupabase(id);
            if (!load.ok) return load;
            // clonar datos
            const cloned = JSON.parse(JSON.stringify(this.datos));
            // remover metadatos
            delete cloned._id;
            cloned.numero = 'COT-' + Date.now();
            cloned._created_at = null;
            cloned._updated_at = null;
            cloned.version = 1;
            // asignar temporalmente al wizard y guardar como nuevo
            const prevDatos = this.datos;
            this.datos = cloned;
            const res = await this.saveCotizacionSupabase({ forceNew: true });
            // dejar wizard con la copia guardada
            return res;
        } catch (err) {
            console.error('duplicateCotizacion error', err);
            return { ok:false, error: err };
        }
    }

    // ------------- Autosave 20s con toast -------------
    startAutosave() {
        try {
            // Si ya hay uno, limpiarlo
            if (this._autosaveInterval) clearInterval(this._autosaveInterval);
            // Primer snapshot
            this._lastSavedSnapshot = JSON.stringify(this.datos);
            // Interval cada 20s
            this._autosaveInterval = setInterval(async () => {
                try {
                    const snapshot = JSON.stringify(this.datos);
                    if (snapshot === this._lastSavedSnapshot) return; // sin cambios
                    // Intentar guardar silenciosamente (si validación permite)
                    if (!this.validateBeforeSave()) {
                        // no guardamos (no tiene nombre de proyecto)
                        return;
                    }
                    const res = await this.saveCotizacionSupabase({ forceNew: false, silent: true });
                    if (res.ok) {
                        this._lastSavedSnapshot = snapshot;
                        this._showAutosaveToast();
                    }
                } catch (e) {
                    console.warn('Autosave error', e);
                }
            }, 20000); // 20000 ms = 20s
        } catch (e) { console.error('startAutosave error', e); }
    }

    stopAutosave() {
        try {
            if (this._autosaveInterval) {
                clearInterval(this._autosaveInterval);
                this._autosaveInterval = null;
            }
        } catch (e) { console.error('stopAutosave error', e); }
    }

    // crea un contenedor para toasts si no existe
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

    // Notificación genérica (toast) corta
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

    _showAutosaveToast() {
        this._showToast('AutoSave aplicado', 1600);
    }

    // ------------- Impresión / export -------------
    imprimirCotizacion() {
        try {
            const totales = this.calcularTotalesBYT();
            const fecha = new Date().toLocaleDateString('es-CL');
            const numero = this.datos.numero || ('COT-' + Date.now());
            const html = this.generarHTMLImpresion(totales, fecha, numero);
            const popup = window.open('', '_blank');
            if (!popup) { alert('No se pudo abrir ventana de impresión (popup bloqueado)'); return; }
            popup.document.write(html);
            popup.document.close();
            popup.onload = () => setTimeout(() => popup.print(), 400);
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
      @page { size: A4; margin: 15mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #222; margin: 0; padding: 0; }
      .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #2e5e4e; padding-bottom:10px; margin-bottom:12px; }
      .company-name { color:#2e5e4e; font-weight:800; font-size:20px; }
      .meta { text-align:right; font-size:12px; color:#555; }
      table { width:100%; border-collapse:collapse; margin-bottom:12px; }
      th, td { border:1px solid #e6efe9; padding:8px; vertical-align:middle; }
      th { background:#f2fbf6; color:#2e6b57; font-weight:700; }
      tfoot td { font-weight:800; background:#f7fff7; }
      .category-title { font-size:14px; color:#2e6b57; margin:8px 0; font-weight:700; }
      .totals { display:flex; justify-content:flex-end; gap:12px; margin-top:8px; }
      .totals .box { padding:10px 14px; background:#f7fff7; border:1px solid #e6efe9; border-radius:6px; min-width:160px; text-align:right; }
      .big-total { font-size:18px; font-weight:900; color:#2e7d32; }
      @media print {
        .no-print { display:none !important; }
        a { color: inherit; text-decoration: none; }
      }
    `;
    }

    generarHTMLImpresion(totales, fecha, numero) {
        const proyecto = this.escapeHtml(this.datos.cliente.nombre_proyecto || 'Sin nombre');
        const cliente = this.escapeHtml(this.datos.cliente.nombre || 'Sin especificar');
        const direccion = this.escapeHtml(this.datos.cliente.direccion || '-');
        const encargado = this.escapeHtml(this.datos.cliente.encargado || '-');

        let detalleHtml = '';
        Object.keys(this.datos.materiales).forEach(catKey => {
          const materiales = this.datos.materiales[catKey] || {};
          const filas = Object.values(materiales).map(m => {
            const sub = ((m.cantidad || 0) * (m.precio || 0));
            return `<tr>
              <td>${this.escapeHtml(m.nombre)}</td>
              <td>${this.escapeHtml(m.descripcion || '')}</td>
              <td style="text-align:center">${this.escapeHtml(m.lugar || '')}</td>
              <td style="text-align:center">${Number(m.cantidad || 0)}</td>
              <td style="text-align:right">$${Number(m.precio || 0).toLocaleString()}</td>
              <td style="text-align:right;font-weight:700">$${sub.toLocaleString()}</td>
            </tr>`;
          }).join('');
          const subtotalCat = Object.values(materiales).reduce((s,m) => s + ((m.cantidad || 0) * (m.precio || 0)), 0);
          if (filas) {
            detalleHtml += `
              <div class="category">
                <div class="category-title">${catKey.replace(/_/g,' ').toUpperCase()}</div>
                <table>
                  <thead><tr><th>Material</th><th>Descripción</th><th style="width:80px">Cant.</th><th style="width:120px">V. Unit.</th><th style="width:140px">Subtotal</th></tr></thead>
                  <tbody>${filas}</tbody>
                  <tfoot><tr><td colspan="4" style="text-align:right">Subtotal ${catKey.replace(/_/g,' ')}:</td><td style="text-align:right">$${subtotalCat.toLocaleString()}</td></tr></tfoot>
                </table>
              </div>
            `;
          }
        });

        const totalesHtml = `
          <div class="totals">
            <div class="box"><div style="font-size:12px;color:#666">Subtotal (sin IVA)</div><div style="font-weight:800">$${totales.subtotalSinIVA.toLocaleString()}</div></div>
            <div class="box"><div style="font-size:12px;color:#666">IVA (19%)</div><div style="font-weight:800">$${totales.iva.toLocaleString()}</div></div>
            <div class="box"><div style="font-size:12px;color:#666">TOTAL</div><div class="big-total">$${totales.totalConIVA.toLocaleString()}</div></div>
          </div>
        `;

        return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cotización ${numero}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${this.obtenerEstilosImpresion()}</style></head><body>
          <div class="header">
            <div><div class="company-name">BYT SOFTWARE</div><div style="color:#666;font-size:13px">Cotización profesional por proyecto</div></div>
            <div class="meta"><div><strong>Cotización:</strong> ${numero}</div><div><strong>Fecha:</strong> ${fecha}</div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 260px;gap:12px;margin-bottom:14px">
            <div>
              <div style="font-size:13px;color:#666;margin-bottom:6px"><strong>Proyecto:</strong> ${proyecto}</div>
              <div style="font-size:13px;color:#666;margin-bottom:6px"><strong>Cliente:</strong> ${cliente}</div>
              <div style="font-size:13px;color:#666;margin-bottom:6px"><strong>Dirección:</strong> ${direccion}</div>
              <div style="font-size:13px;color:#666"><strong>Encargado:</strong> ${encargado}</div>
            </div>
            <div>${totalesHtml}</div>
          </div>
          ${detalleHtml}
          <div style="margin-top:16px;color:#666;font-size:12px"><div><strong>Observaciones:</strong></div><div style="margin-top:6px;color:#444">${this.escapeHtml(this.datos.cliente.notas || 'Sin observaciones')}</div></div>
          <div style="margin-top:28px;font-size:11px;color:#777">Documento generado por BYT SOFTWARE - Válido como referencia.</div>
        </body></html>`;
    }

    // ------------- Utilities -------------
    escapeHtml(str) {
        if (str === undefined || str === null) return '';
        return String(str).replace(/[&<>"']/g, (s) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]);
    }
    escapeAttr(str) { return this.escapeHtml(String(str || '')).replace(/"/g,'&#34;'); }
}

// ------------- Globals & init -------------
let wizard = null;

function anteriorPaso() { if (window.wizard && typeof window.wizard.anteriorPaso === 'function') window.wizard.anteriorPaso(); else console.error('anteriorPaso no disponible'); }
function siguientePaso() { if (window.wizard && typeof window.wizard.siguientePaso === 'function') window.wizard.siguientePaso(); else console.error('siguientePaso no disponible'); }

document.addEventListener('DOMContentLoaded', function() {
  try {
    // create instance (only one)
    wizard = new WizardCotizacion();
    window.wizard = wizard;
    console.log('WizardCotizacion inicializado');
  } catch (e) {
    console.error('Error inicializando WizardCotizacion:', e);
  }
});
