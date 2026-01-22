// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL + Persistencia Robusta =====

// Versión base: V13 (con servicio de corte en Tableros y pegado de cantos en Tapacantos).
// Cambios:
// - Servicio de corte (melaminas/durolac) en Tableros, con proveedor y valor unitario editables. Se suma a materiales antes de factor/IVA. Se imprime en texto.
// - Servicio de pegado de tapacantos (delgado/grueso) en Tapacantos, con proveedor y valor unitario editables. Se suma a materiales antes de factor/IVA. Se imprime en texto.
// - Se mantienen estilos de chips, progreso, autosave, etc.

// Colores resaltado paso activo:
//   fondo: #bfe7c7
//   texto: #1b5e20
//   borde: #7fbf90
// 
// Haz backup antes de reemplazar.

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
            // Extras por categoría de materiales
            quincalleriaExtras: [],
            tablerosExtras: [],
            tapacantosExtras: [],
            tablerosMaderaExtras: [],
            ledElectricidadExtras: [],
            // Extras globales de traspaso (no por categoría)
            traspasosExtras: [],
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
                        'puertas_eplum_1': { nombre: 'Puertas vidrio 1', cantidad: 0, precio: 0 },
                        'puertas_eplum_2': { nombre: 'Puertas vidrio 2', cantidad: 0, precio: 0 },
                        'puertas_eplum_3': { nombre: 'Puertas vidrio 3', cantidad: 0, precio: 0 }
                    }
                },
                cuarzo: { 
                    nombre: 'Piedras, granitos y ultracompactos',
                    factor: 0.1,
                    materiales: {
                        'estructuras_cuarzo_1': { nombre: 'Estructuras Cuarzo 1', cantidad: 0, precio: 0 },
                        'estructuras_cuarzo_2': { nombre: 'Estructuras Cuarzo 2', cantidad: 0, precio: 0 }
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
            partidas: [],

            // Servicio de corte tableros
            tablerosCorte: {
                corteExternoValorMelaminaUnit: 7000,
                corteExternoPlanchasMelamina: 0,
                corteExternoTotalMelaminas: 0,
                corteExternoProveedorMelamina: '',

                corteExternoValorDurolacUnit: 3000,
                corteExternoPlanchasDurolac: 0,
                corteExternoTotalDurolac: 0,
                corteExternoProveedorDurolac: ''
            },

            // Servicio de pegado de tapacantos
            tapacantosCorte: {
                pegadoValorDelgadoUnit: 450,
                pegadoPlanchasDelgado: 0,
                pegadoTotalDelgado: 0,
                pegadoProveedorDelgado: '',

                pegadoValorGruesoUnit: 700,
                pegadoPlanchasGrueso: 0,
                pegadoTotalGrueso: 0,
                pegadoProveedorGrueso: ''
            }
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

        // Mapa de extras por categoría de materiales
        this.extraConfig = {
            quincalleria: { key: 'quincalleriaExtras', label: 'Quincallería extra' },
            tableros: { key: 'tablerosExtras', label: 'Tableros extra' },
            tapacantos: { key: 'tapacantosExtras', label: 'Tapacantos extra' },
            tableros_madera: { key: 'tablerosMaderaExtras', label: 'Tableros de Madera extra' },
            led_electricidad: { key: 'ledElectricidadExtras', label: 'LED y Electricidad extra' }
            // otras_compras no lleva extras
        };

        // Inicializar
        this.init();
    }

    // ------------- Init -------------
    init() {
        try {
            this._ensurePartidasInit();
            this._ensureExtrasInitAll();
            this._ensureTraspasoExtrasInit();
            this._ensureCorteTablerosInit();
            this._ensureCorteTapacantosInit();
            this._ensurePasoNavStyles(); // inyecta estilos para resalte de chips
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

    // ------------- Estilos para chips activos -------------
    _ensurePasoNavStyles() {
        try {
            if (document.getElementById('byt-paso-nav-style')) return;
            const style = document.createElement('style');
            style.id = 'byt-paso-nav-style';
            style.textContent = `
                .paso-nav-activo {
                    background-color: #bfe7c7 !important;
                    color: #1b5e20 !important;
                    font-weight: 700 !important;
                    border: 1px solid #7fbf90 !important;
                }
            `;
            document.head.appendChild(style);
        } catch (e) { console.warn('No se pudo inyectar estilos de pasos', e); }
    }

    // ------------- Supabase helpers -------------
    initSupabase() {
        try {
            if (this._supabase && typeof this._supabase.from === 'function') return this._supabase;

            if (window.supabase && typeof window.supabase.from === 'function') {
                this._supabase = window.supabase;
                return this._supabase;
            }

            if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                this._supabase = window.globalSupabase.client;
                return this._supabase;
            }

            return null;
        } catch (e) {
            console.error('initSupabase error', e);
            return null;
        }
    }

    async _ensureSupabase(waitMs = 5000) {
        try {
            if (this._supabase && typeof this._supabase.from === 'function') return this._supabase;

            if (window.supabase && typeof window.supabase.from === 'function') {
                this._supabase = window.supabase;
                return this._supabase;
            }
            if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
                this._supabase = window.globalSupabase.client;
                return this._supabase;
            }

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

    fillProviderSelects() {
        try {
            const list = Array.isArray(this.proveedores) && this.proveedores.length
                ? this.proveedores
                : (this.providerSeed || []).map(n => ({ id: n, name: n }));

            const selects = document.querySelectorAll('select.lugar-select');
            selects.forEach(select => {
                const rawCurrent = select.getAttribute('data-current') ?? select.value ?? '';
                const currentVal = rawCurrent !== null && rawCurrent !== undefined ? String(rawCurrent).trim() : '';

                const preserved = {
                    id: select.id || '',
                    name: select.name || '',
                    className: select.className || '',
                    dataset: { ...select.dataset }
                };

                select.innerHTML = '';
                const ph = document.createElement('option');
                ph.value = '';
                ph.textContent = '-- Selecciona proveedor --';
                select.appendChild(ph);

                list.forEach(p => {
                    const opt = document.createElement('option');
                    const val = (p.id !== undefined && p.id !== null) ? String(p.id) : String(p.name);
                    opt.value = val;
                    opt.textContent = String(p.name ?? val);
                    opt.dataset.name = String(p.name ?? '');
                    select.appendChild(opt);
                });

                Object.keys(preserved.dataset || {}).forEach(k => {
                    try { select.dataset[k] = preserved.dataset[k]; } catch (e) {}
                });

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
                    if (!matched) {
                        const extra = document.createElement('option');
                        extra.value = currentVal;
                        extra.textContent = currentVal;
                        extra.dataset.name = currentVal;
                        extra.selected = true;
                        select.appendChild(extra);
                    }
                } else {
                    select.value = '';
                }
            });

            // Selects de servicio de corte/pegado
            const corteSelects = document.querySelectorAll('select.corte-proveedor-select, select.tapacanto-proveedor-select');
            corteSelects.forEach(select => {
                const currentVal = (select.getAttribute('data-current') ?? '').toString().trim();
                select.innerHTML = '';
                const ph = document.createElement('option');
                ph.value = '';
                ph.textContent = '-- Selecciona proveedor --';
                select.appendChild(ph);

                list.forEach(p => {
                    const opt = document.createElement('option');
                    const val = (p.id !== undefined && p.id !== null) ? String(p.id) : String(p.name);
                    opt.value = val;
                    opt.textContent = String(p.name ?? val);
                    opt.dataset.name = String(p.name ?? '');
                    select.appendChild(opt);
                });

                if (currentVal) {
                    let matched = false;
                    for (let i = 0; i < select.options.length; i++) {
                        const o = select.options[i];
                        const oVal = (o.value || '').trim();
                        const oText = (o.textContent || '').trim();
                        const oName = (o.dataset && o.dataset.name) ? String(o.dataset.name).trim() : '';
                        if (oVal === currentVal || oText === currentVal || oName === currentVal) {
                            select.selectedIndex = i; matched = true; break;
                        }
                    }
                    if (!matched) {
                        const extra = document.createElement('option');
                        extra.value = currentVal;
                        extra.textContent = currentVal;
                        extra.dataset.name = currentVal;
                        extra.selected = true;
                        select.appendChild(extra);
                    }
                } else {
                    select.value = '';
                }
            });

        } catch (e) {
            console.error('fillProviderSelects error', e);
        }
    }

    onProveedorChange(categoria, materialId, providerValue) {
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

            if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;

            this.datos.materiales[categoria][materialId].lugar_id = valueStr;
            this.datos.materiales[categoria][materialId].lugar = providerName || '';

            this.actualizarSubtotalCategoria(categoria);
            this.actualizarBarraSuperior();

        } catch (e) {
            console.error('onProveedorChange error', e);
        }
    }

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

            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar_id = valueStr;
            this.datos.valoresTraspasados[categoriaKey].materiales[materialKey].lugar = providerName || '';

            // Actualiza el select actual para que conserve la selección tras rellenar opciones
            const sel = document.querySelector(`select.lugar-select[data-material-id=\