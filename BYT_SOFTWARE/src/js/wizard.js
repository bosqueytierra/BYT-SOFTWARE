// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL =====
// Archivo completo: conserva tu estructura original y añade selects para "Lugar de compra"
// + carga de proveedores desde Supabase (window.supabase) con fallback seed
// + funciones: loadProviders(), fillProviderSelects(), onProveedorChange()
// + parche seguro en mostrarPaso para evitar TypeError si actualizarBotonesNavegacion no existe

class WizardCotizacion {
    constructor() {
        this.pasoActual = 1;
        this.totalPasos = 10;

        // cache de proveedores (se cargan desde Supabase o fallback seed)
        this.proveedores = null;
        this.providerSeed = [
          'Otro Proveedor','Imperial','Homecenter','WantingChile','Demasled','Dph','Eplum',
          'Ferreteria Santa Rosa','Masisa','CasaChic','MercadoLibre','LedStudio','Marco Cuarzo',
          'Quincalleria Rey','Eli Cortes','OV Estructuras Metalicas','HBT','Doer','Ikea',
          'Emilio Pohl','CasaMusa','Provelcar','Enko','Ferreteria San Martin','Arteformas',
          'Ferretek','Sergio Astorga Pinturas','Bertrand','MyR','Placacentro','Bookstore','RyR','Pernos Kim'
        ];

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
    
    init() {
        this.actualizarProgreso();

        // Cargar proveedores en background antes de renderizar para que selects se puedan rellenar
        this.loadProviders().catch(() => {});

        this.mostrarPaso(1);
        this.actualizarBarraSuperior();

        // (Opcional) activar BroadcastChannel/storage listeners si hay paneles admin que actualizan providers
        try {
            const bc = new BroadcastChannel('byt-providers');
            bc.onmessage = (ev) => {
                if (ev.data?.type === 'providers-updated') {
                    this.loadProviders().catch(console.error);
                }
            };
        } catch (e) {
            // no bloquear si no existe
        }
    }
    
    // ---------------- Providers (Supabase) ----------------
    async loadProviders() {
        try {
            if (Array.isArray(this.proveedores) && this.proveedores.length) return this.proveedores;

            let providers = [];

            if (window.supabase && typeof window.supabase.from === 'function') {
                try {
                    const { data, error } = await window.supabase
                        .from('providers')
                        .select('id,name,active')
                        .order('name', { ascending: true });
                    if (!error && Array.isArray(data)) {
                        providers = data.map(p => ({ id: p.id, name: p.name, active: p.active }));
                        console.log('Proveedores cargados desde Supabase:', providers.length);
                    } else if (error) {
                        console.warn('Supabase providers list error', error);
                    }
                } catch (e) {
                    console.warn('Error usando window.supabase:', e);
                }
            } else {
                console.warn('window.supabase no disponible en esta página.');
            }

            // fallback seed local
            if (!providers || providers.length === 0) {
                providers = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
                console.log('Usando providerSeed local:', providers.length);
            }

            this.proveedores = providers;
            // rellenar selects si ya están renderizados
            this.fillProviderSelects();
            return this.proveedores;
        } catch (err) {
            console.error('loadProviders error:', err);
            this.proveedores = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
            this.fillProviderSelects();
            return this.proveedores;
        }
    }

    // Rellena todos los <select class="lugar-select"> con los proveedores cargados
    fillProviderSelects() {
        const list = Array.isArray(this.proveedores) && this.proveedores.length ? this.proveedores : (this.providerSeed || []).map(n => ({ id: n, name: n }));
        const selects = document.querySelectorAll('select.lugar-select');
        selects.forEach(select => {
            const currentVal = select.getAttribute('data-current') || select.value || '';
            // Limpiar opciones
            select.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '-- Selecciona proveedor --';
            select.appendChild(placeholder);
            list.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id || p.name || '';
                opt.textContent = p.name || p.id || '';
                select.appendChild(opt);
            });
            if (currentVal) select.value = currentVal;
        });
    }

    // Handler cuando cambian selects de proveedor en las tablas
    onProveedorChange(categoria, materialId, value) {
        let nombre = value;
        if (Array.isArray(this.proveedores) && this.proveedores.length) {
            const p = this.proveedores.find(x => (String(x.id) === String(value) || x.name === value));
            if (p) nombre = p.name;
        }
        if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
        this.datos.materiales[categoria][materialId].lugar_id = value || '';
        this.datos.materiales[categoria][materialId].lugar = nombre || '';
        // refrescar UI y totales
        this.cargarMaterialesCategoria(categoria);
        this.actualizarBarraSuperior();
    }

    // ---------------- UI helpers / progreso ----------------
    actualizarProgreso() {
        const progreso = (this.pasoActual / this.totalPasos) * 100;
        const barraProgreso = document.getElementById('progreso-barra');
        const textoProgreso = document.getElementById('progreso-texto');

        if (barraProgreso) barraProgreso.style.width = progreso + '%';

        if (textoProgreso) {
            const pasoInfo = this.pasosPlan[this.pasoActual - 1];
            textoProgreso.textContent = `Paso ${this.pasoActual} de ${this.totalPasos}: ${pasoInfo ? pasoInfo.titulo : 'Cargando...'}`;
        }
    }

    // mostrarPaso parcheado (llamada segura a actualizarBotonesNavegacion)
    mostrarPaso(numeroPaso) {
        this.pasoActual = numeroPaso;

        // ocultar todos
        for (let i = 1; i <= this.totalPasos; i++) {
            const paso = document.getElementById(`paso-${i}`);
            if (paso) paso.style.display = 'none';
        }

        // mostrar actual
        const pasoActivo = document.getElementById(`paso-${numeroPaso}`);
        if (pasoActivo) pasoActivo.style.display = 'block';

        // generar contenido
        try {
            this.generarContenidoPaso(numeroPaso);
        } catch (e) {
            console.error('generarContenidoPaso error', e);
        }

        // actualizar botones si existe la función
        if (typeof this.actualizarBotonesNavegacion === 'function') {
            try { this.actualizarBotonesNavegacion(); } catch (e) { console.error('actualizarBotonesNavegacion error', e); }
        } else {
            console.warn('actualizarBotonesNavegacion no está definida; se omite.');
        }
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

    // ---------------- PASOS ----------------
    generarPasoCliente(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Datos del Cliente y Proyecto</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre del Proyecto *</label>
                        <input type="text" class="form-control" id="nombre_proyecto" value="${this.datos.cliente.nombre_proyecto || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-control" id="nombre_cliente" value="${this.datos.cliente.nombre || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Dirección</label><input type="text" class="form-control" id="direccion" value="${this.datos.cliente.direccion || ''}"></div>
                    <div class="form-group"><label class="form-label">Encargado</label><input type="text" class="form-control" id="encargado" value="${this.datos.cliente.encargado || ''}"></div>
                </div>
                <div class="form-group"><label class="form-label">Notas del Proyecto</label><textarea class="form-control" id="notas" rows="4" placeholder="Describir detalles...">${this.datos.cliente.notas || ''}</textarea></div>
            </div>
        `;
        const campos = ['nombre_proyecto','nombre_cliente','direccion','encargado','notas'];
        campos.forEach(c => {
            const el = document.getElementById(c);
            if (el) el.addEventListener('input', () => { this.datos.cliente[c === 'nombre_cliente' ? 'nombre' : c] = el.value; });
        });
    }

    generarPasoMaterial(container, categoria) {
        const estructurasBYT = {
            quincalleria: { nombre: 'Quincallería', materiales: [
                { nombre:'Bisagras paquete Recta', cantidad:0, precio:0 }, { nombre:'Bisagras paquete Curva', cantidad:0, precio:0 },
                { nombre:'Bisagras paquete SemiCurva', cantidad:0, precio:0 }, { nombre:'Corredera Telescópica', cantidad:0, precio:0 },
                { nombre:'Manillas tipo 1', cantidad:0, precio:0 }, { nombre:'Manillas tipo 2', cantidad:0, precio:0 },
                { nombre:'Tip On', cantidad:0, precio:0 }, { nombre:'Zócalo PVC', cantidad:0, precio:0 },
                { nombre:'Juego Zócalo Patas', cantidad:0, precio:0 }, { nombre:'Barra Closet', cantidad:0, precio:0 },
                { nombre:'Perfil tubular redondo', cantidad:0, precio:0 }
            ]},
            tableros: { nombre: 'Tableros', materiales: [
                { nombre:'Melamina 18mm TIPO 1', cantidad:0, precio:0 }, { nombre:'Melamina 18mm TIPO 2', cantidad:0, precio:0 },
                { nombre:'Melamina 18mm TIPO 3', cantidad:0, precio:0 }, { nombre:'Melamina 15mm TIPO 1', cantidad:0, precio:0 },
                { nombre:'Melamina 15mm TIPO 2', cantidad:0, precio:0 }, { nombre:'Melamina 15mm TIPO 3', cantidad:0, precio:0 },
                { nombre:'Durolac', cantidad:0, precio:0 }, { nombre:'MDF', cantidad:0, precio:0 }
            ]},
            tapacantos: { nombre: 'Tapacantos', materiales: [
                { nombre:'Metros de tapacanto delgado TIPO 1', cantidad:0, precio:400 }, { nombre:'Metros de tapacanto delgado TIPO 2', cantidad:0, precio:400 },
                { nombre:'Metros de tapacanto delgado TIPO 3', cantidad:0, precio:400 }, { nombre:'Metros de tapacanto grueso tipo 1', cantidad:0, precio:800 },
                { nombre:'Metros de tapacanto grueso tipo 2', cantidad:0, precio:800 }, { nombre:'Metros de tapacanto grueso tipo 3', cantidad:0, precio:800 }
            ]},
            servicios_externos: { nombre: 'Servicios Externo de corte', materiales: [
                { nombre:'Servicio Corte tablero EXTERNO', cantidad:0, precio:7000 }, { nombre:'Servicio Pegado tapacanto Delgado', cantidad:0, precio:450 },
                { nombre:'Servicio Corte Durolac EXTERNO', cantidad:0, precio:3400 }, { nombre:'Servicio Pegado tapacanto Grueso', cantidad:0, precio:700 }
            ]},
            tableros_madera: { nombre:'Tableros de Madera', materiales: [
                { nombre:'Panel de Pino 30 mm', cantidad:0, precio:0 }, { nombre:'Panel de Pino 18 mm', cantidad:0, precio:0 },
                { nombre:'Panel de Pino 16 mm', cantidad:0, precio:0 }, { nombre:'Terciado 18 mm', cantidad:0, precio:0 },
                { nombre:'Terciado 12 mm', cantidad:0, precio:0 }
            ]},
            led_electricidad: { nombre:'Led y electricidad', materiales: [
                { nombre:'Canaleta Led TIPO 1', cantidad:0, precio:0 }, { nombre:'Canaleta Led TIPO 2', cantidad:0, precio:0 },
                { nombre:'Cinta Led TIPO 1', cantidad:0, precio:0 }, { nombre:'Cinta Led TIPO 2', cantidad:0, precio:0 },
                { nombre:'Fuente de Poder TIPO 1', cantidad:0, precio:0 }, { nombre:'Fuente de Poder TIPO 2', cantidad:0, precio:0 },
                { nombre:'Interruptor Led', cantidad:0, precio:0 }, { nombre:'Cables Led', cantidad:0, precio:0 }, { nombre:'Cables Cordón', cantidad:0, precio:0 }
            ]},
            otras_compras: { nombre:'Otras compras', materiales: [
                { nombre:'Extras a Considerar', cantidad:0, precio:0 }, { nombre:'Vidrios', cantidad:0, precio:0 }, { nombre:'Ripado', cantidad:0, precio:0 }
            ]}
        };

        const estructura = estructurasBYT[categoria];
        if (!estructura) return;

        // inicializar si necesario
        if (!this.datos.materiales[categoria] || Object.keys(this.datos.materiales[categoria]).length === 0) {
            estructura.materiales.forEach((m, idx) => {
                const id = `${categoria}_${idx}`;
                this.datos.materiales[categoria][id] = { nombre: m.nombre, cantidad: m.cantidad, precio: m.precio, descripcion: '', lugar: '' };
            });
        }

        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">${estructura.nombre}</h3>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width:25%;">Material</th>
                                <th style="width:25%;">Descripción</th>
                                <th style="width:20%;">Lugar de compra</th>
                                <th style="width:10%;">Cantidad</th>
                                <th style="width:10%;">Valor Unitario</th>
                                <th style="width:10%;">Valor Total</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-${categoria}"></tbody>
                    </table>
                </div>
                ${categoria === 'otras_compras' ? `<div style="margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="wizard.agregarMaterial('${categoria}')">+ Agregar Material Extra</button></div>` : ''}
                <div style="text-align:right;margin-top:15px;padding:15px;background:#e8f5e8;border-radius:8px;border:2px solid #4CAF50;">
                    <strong style="font-size:18px;">SUBTOTAL ${estructura.nombre.toUpperCase()}: <span id="subtotal_${categoria}" style="color:#2e7d32;font-size:20px;font-weight:bold;">$0</span></strong>
                </div>
            </div>
        `;
        this.cargarMaterialesCategoria(categoria);
    }

    // ----------------- cargarMaterialesCategoria: ahora usa select.lugar-select -----------------
    cargarMaterialesCategoria(categoria) {
        const tbody = document.getElementById(`tabla-${categoria}`);
        if (!tbody) return;
        let html = '';
        const materiales = this.datos.materiales[categoria] || {};
        Object.keys(materiales).forEach(materialId => {
            const material = materiales[materialId];
            const lugarCurrent = (material.lugar_id || material.lugar || '');
            html += `
                <tr>
                    <td>${material.nombre}</td>
                    <td><input type="text" class="form-control" value="${material.descripcion || ''}" placeholder="Descripción..." onchange="wizard.actualizarMaterial('${categoria}','${materialId}','descripcion',this.value)"></td>
                    <td>
                        <select class="form-control lugar-select" data-current="${lugarCurrent}" onchange="wizard.onProveedorChange('${categoria}','${materialId}',this.value)">
                            <option value="">-- Selecciona proveedor --</option>
                        </select>
                    </td>
                    <td><input type="number" class="form-control" value="${material.cantidad || 0}" onchange="wizard.actualizarMaterial('${categoria}','${materialId}','cantidad',this.value)"></td>
                    <td><input type="number" class="form-control" value="${material.precio || 0}" onchange="wizard.actualizarMaterial('${categoria}','${materialId}','precio',this.value)"></td>
                    <td style="font-weight:bold;">$${((material.cantidad || 0)*(material.precio || 0)).toLocaleString()}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // rellenar selects con proveedores (cargados de Supabase o seed)
        this.fillProviderSelects();
        this.actualizarSubtotalCategoria(categoria);
    }

    agregarMaterial(categoria) {
        const nombre = prompt('Nombre del material:');
        if (!nombre) return;
        const materialId = 'material_' + Date.now();
        this.datos.materiales[categoria][materialId] = { nombre, cantidad: 0, precio: 0, descripcion: '', lugar: '' };
        this.cargarMaterialesCategoria(categoria);
    }

    actualizarMaterial(categoria, materialId, campo, valor) {
        if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
        if (campo === 'cantidad' || campo === 'precio') this.datos.materiales[categoria][materialId][campo] = parseFloat(valor) || 0;
        else this.datos.materiales[categoria][materialId][campo] = valor;
        this.cargarMaterialesCategoria(categoria);
        this.actualizarBarraSuperior();
    }

    eliminarMaterial(categoria, materialId) {
        if (!confirm('¿Eliminar este material?')) return;
        delete this.datos.materiales[categoria][materialId];
        this.cargarMaterialesCategoria(categoria);
        this.actualizarBarraSuperior();
    }

    actualizarSubtotalCategoria(categoria) {
        let subtotal = 0;
        const materiales = this.datos.materiales[categoria] || {};
        Object.values(materiales).forEach(mat => subtotal += ((mat.cantidad || 0)*(mat.precio || 0)));
        const el = document.getElementById(`subtotal_${categoria}`);
        if (el) el.textContent = '$' + subtotal.toLocaleString();
    }

    // ---------------- Traspasados ----------------
    generarPasoTraspasados(container) {
        let html = `<div class="card"><h3 class="card-title">💰 Valores Traspasados</h3><p style="background:#fff3cd;padding:15px;border-radius:8px;margin-bottom:20px;"><strong>ℹ️ Estructura BYT:</strong> Cada categoría tiene factor 0.1 (10%) sobre el total traspaso<br><code>Total = Suma Materiales + (Suma Materiales × Factor 0.1)</code></p>`;
        Object.keys(this.datos.valoresTraspasados).forEach(key => {
            const cat = this.datos.valoresTraspasados[key];
            html += `<div style="border:2px solid #e0e0e0;border-radius:12px;padding:20px;background:#f9f9f9;margin-bottom:20px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;"><h4 style="margin:0">${cat.nombre}</h4><div><label>Factor:</label><select onchange="wizard.actualizarFactorTraspasado('${key}',this.value)">${this.generarOpcionesFactor(cat.factor)}</select></div></div><div class="table-container"><table class="table" style="font-size:14px;"><thead><tr><th>Materiales</th><th>Descripción</th><th>Lugar</th><th>Cantidad</th><th>Valor unitario</th><th>Valor total</th></tr></thead><tbody>`;
            Object.keys(cat.materiales).forEach(mk => {
                const m = cat.materiales[mk];
                const total = ((m.cantidad || 0)*(m.precio || 0));
                html += `<tr><td>${m.nombre}</td><td>${m.descripcion || ''}</td><td><input type="text" class="form-control" value="${m.lugar || ''}" onchange="wizard.actualizarMaterialTraspasado('${key}','${mk}','lugar',this.value)"></td><td><input type="number" class="form-control" value="${m.cantidad || 0}" onchange="wizard.actualizarMaterialTraspasado('${key}','${mk}','cantidad',this.value)"></td><td><input type="number" class="form-control" value="${m.precio || 0}" onchange="wizard.actualizarMaterialTraspasado('${key}','${mk}','precio',this.value)"></td><td style="font-weight:bold;">$${total.toLocaleString()}</td></tr>`;
            });
            let totalTr = 0;
            Object.values(cat.materiales).forEach(m => totalTr += ((m.cantidad || 0)*(m.precio || 0)));
            const cobro = totalTr * (cat.factor || 0);
            html += `</tbody></table></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:15px;padding:15px;background:#e8f5e8;border-radius:8px;"><div><strong>Total Traspaso: <span id="total_traspaso_${key}">$${totalTr.toLocaleString()}</span></strong></div><div><strong>Cobro por traspaso (${((cat.factor||0)*100)}%): <span id="cobro_traspaso_${key}" style="color:#2e7d32;">$${cobro.toLocaleString()}</span></strong></div></div></div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    generarOpcionesFactor(factorActual) {
        let opciones = '';
        for (let i = 0; i <= 40; i++) {
            const valor = i * 0.1;
            const sel = Math.abs(valor - factorActual) < 0.01 ? 'selected' : '';
            opciones += `<option value="${valor}" ${sel}>${valor.toFixed(1)}</option>`;
        }
        return opciones;
    }

    actualizarFactorTraspasado(categoria, nuevoFactor) {
        this.datos.valoresTraspasados[categoria].factor = parseFloat(nuevoFactor);
        let totalTraspaso = 0;
        Object.values(this.datos.valoresTraspasados[categoria].materiales).forEach(m => totalTraspaso += ((m.cantidad || 0)*(m.precio || 0)));
        const cobro = totalTraspaso * (this.datos.valoresTraspasados[categoria].factor || 0);
        const elT = document.getElementById(`total_traspaso_${categoria}`);
        const elC = document.getElementById(`cobro_traspaso_${categoria}`);
        if (elT) elT.textContent = '$' + totalTraspaso.toLocaleString();
        if (elC) elC.textContent = '$' + cobro.toLocaleString();
        this.actualizarBarraSuperior();
    }

    actualizarMaterialTraspasado(categoria, materialKey, campo, valor) {
        this.datos.valoresTraspasados[categoria].materiales[materialKey][campo] = (campo === 'cantidad' || campo === 'precio') ? (parseFloat(valor) || 0) : valor;
        const paso8 = document.getElementById('paso-8');
        if (paso8) this.generarPasoTraspasados(paso8);
        this.actualizarBarraSuperior();
    }

    // ---------------- Factor ----------------
    generarPasoFactor(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">⚙️ Factor General BYT</h3>
                <div class="form-group">
                    <label class="form-label">Factor General</label>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <input type="number" class="form-control" id="factor_general" value="${this.datos.factorGeneral}" step="0.1" min="1" max="5" onchange="wizard.actualizarFactor(this.value)" style="width:120px;">
                        <span style="color:#666;">(Ej: 1.3)</span>
                    </div>
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="btn" onclick="wizard.establecerFactor(1.3)">1.3x</button>
                    <button class="btn" onclick="wizard.establecerFactor(2)">2.0x</button>
                    <button class="btn" onclick="wizard.establecerFactor(2.5)">2.5x</button>
                </div>
            </div>
        `;
    }

    actualizarFactor(valor) { this.datos.factorGeneral = parseFloat(valor) || 1.3; this.actualizarBarraSuperior(); }
    establecerFactor(f) { this.datos.factorGeneral = f; const el = document.getElementById('factor_general'); if (el) el.value = f; this.actualizarBarraSuperior(); }

    // ---------------- Cálculos ----------------
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
            totalTraspasos += subtotal;
            totalTraspasosFactor += cobro;
        });
        const materialesConFactor = totalMateriales * this.datos.factorGeneral;
        const subtotalSinIVA = materialesConFactor + totalTraspasos + totalTraspasosFactor;
        const iva = subtotalSinIVA * 0.19;
        const totalConIVA = subtotalSinIVA + iva;
        const ganancia = subtotalSinIVA - totalMateriales - totalTraspasos;
        return { totalMateriales, factorGeneral: this.datos.factorGeneral, materialesConFactor, totalTraspasos, totalTraspasosFactor, totalTraspasados: totalTraspasos + totalTraspasosFactor, detalleTraspasados, subtotalSinIVA, iva, totalConIVA, ganancia };
    }

    actualizarBarraSuperior() {
        const tot = this.calcularTotalesBYT();
        const map = { 'total-materiales': tot.totalMateriales, 'factor-valor': tot.factorGeneral + 'x', 'neto-valor': tot.subtotalSinIVA, 'iva-valor': tot.iva, 'total-proyecto': tot.totalConIVA, 'ganancia-valor': tot.ganancia };
        Object.keys(map).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const v = map[id];
            if (id === 'factor-valor') el.textContent = v;
            else el.textContent = '$' + (typeof v === 'number' ? v.toLocaleString() : '0');
        });
    }

    // ---------------- Resumen final ----------------
    generarPasoResumen(container) {
        const totales = this.calcularTotalesBYT();
        let categoriasHtml = '';
        Object.keys(this.datos.materiales).forEach(cat => {
            const materiales = this.datos.materiales[cat] || {};
            const filas = Object.values(materiales).map(m => {
                const sub = ((m.cantidad || 0)*(m.precio || 0));
                return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${m.nombre}</td><td style="padding:8px;border-bottom:1px solid #eee">${m.lugar || '-'}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${m.cantidad || 0}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(m.precio||0).toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${sub.toLocaleString()}</td></tr>`;
            }).join('');
            const subtotalCat = Object.values(materiales).reduce((s,m) => s + ((m.cantidad || 0)*(m.precio || 0)),0);
            categoriasHtml += `<div style="margin-bottom:16px;"><h4 style="margin:6px 0 10px;color:#2e6b57;text-transform:capitalize">${cat.replace(/_/g,' ')}</h4><table style="width:100%;border-collapse:collapse;border:1px solid #e6eee9"><thead><tr style="background:#f2fbf6"><th style="padding:10px;text-align:left">Material</th><th style="padding:10px;text-align:left">Lugar</th><th style="padding:10px;text-align:center">Cant.</th><th style="padding:10px;text-align:right">V. Unit.</th><th style="padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>${filas || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#777">No hay materiales</td></tr>`}</tbody><tfoot><tr><td colspan="4" style="padding:10px;border-top:1px solid #e6eee9;text-align:right;font-weight:700">Subtotal ${cat.replace(/_/g,' ')}:</td><td style="padding:10px;border-top:1px solid #e6eee9;text-align:right;font-weight:700">$${subtotalCat.toLocaleString()}</td></tr></tfoot></table></div>`;
        });

        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Resumen Final del Proyecto</h3>
                <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px;">
                    <div style="flex:1;min-width:180px;padding:12px;background:#ffffff;border-radius:8px;border:1px solid #e9f3ec"><div style="font-size:12px;color:#666">Total Materiales Base</div><div style="font-size:18px;color:#2e7d32;font-weight:700">$${totales.totalMateriales.toLocaleString()}</div></div>
                    <div style="flex:1;min-width:180px;padding:12px;background:#fff8f0;border-radius:8px;border:1px solid #f7efe6"><div style="font-size:12px;color:#666">Factor General BYT</div><div style="font-size:18px;color:#e67e22;font-weight:700">${totales.factorGeneral}x</div></div>
                    <div style="flex:1;min-width:180px;padding:12px;background:#f6fbff;border-radius:8px;border:1px solid #e9f4fb"><div style="font-size:12px;color:#666">Materiales con Factor</div><div style="font-size:18px;color:#333;font-weight:700">$${totales.materialesConFactor.toLocaleString()}</div></div>
                    <div style="flex:1;min-width:180px;padding:12px;background:#fffef6;border-radius:8px;border:1px solid #f9f7ea"><div style="font-size:12px;color:#666">Ganancia</div><div style="font-size:18px;color:#2e7d32;font-weight:700">$${totales.ganancia.toLocaleString()}</div></div>
                </div>
                <div style="margin-bottom:12px;"><h4 style="color:#2e6b57;margin-bottom:8px;">Detalle por Categoría</h4>${categoriasHtml}</div>
                <div style="display:flex;gap:12px;justify-content:flex-end;align-items:flex-end;margin-top:8px;">
                    <div style="text-align:right;"><div style="font-size:12px;color:#666">Subtotal (sin IVA)</div><div style="font-size:18px;font-weight:700;color:#333">$${totales.subtotalSinIVA.toLocaleString()}</div></div>
                    <div style="text-align:right;margin-left:18px;"><div style="font-size:12px;color:#666">IVA (19%)</div><div style="font-size:18px;font-weight:700;color:#333">$${totales.iva.toLocaleString()}</div></div>
                    <div style="text-align:right;margin-left:18px;"><div style="font-size:12px;color:#666">TOTAL PROYECTO</div><div style="font-size:22px;font-weight:900;color:#2e7d32">$${totales.totalConIVA.toLocaleString()}</div></div>
                </div>
                <div style="margin-top:18px;display:flex;gap:12px;justify-content:center">
                    <button class="btn" onclick="wizard.guardarCotizacion()" style="background:#2e7d32;color:#fff;padding:10px 18px;border-radius:6px;border:0">💾 Guardar Cotización Completa</button>
                    <button class="btn" onclick="wizard.imprimirCotizacion()" style="background:#1976D2;color:#fff;padding:10px 18px;border-radius:6px;border:0">🖨️ Imprimir Cotización</button>
                </div>
            </div>
        `;
    }

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
        else { this.guardarCotizacion(); }
    }

    validarPasoActual() {
        const pasoInfo = this.pasosPlan[this.pasoActual - 1];
        if (pasoInfo?.tipo === 'cliente') {
            const nombre = document.getElementById('nombre_proyecto'); const cliente = document.getElementById('nombre_cliente');
            if (!nombre?.value || !cliente?.value) { alert('Por favor complete los campos obligatorios'); return false; }
        }
        return true;
    }

    async guardarCotizacion() {
        try {
            const cotizacion = { ...this.datos, fecha: new Date().toISOString(), numero: 'COT-' + Date.now() };
            console.log('Guardando cotización:', cotizacion);
            alert('¡Cotización guardada exitosamente!');
        } catch (err) {
            console.error('guardarCotizacion error', err);
            alert('Error al guardar: ' + (err.message || err));
        }
    }

    // ---------------- Impresión ----------------
    imprimirCotizacion() {
        const totales = this.calcularTotalesBYT();
        const fecha = new Date().toLocaleDateString('es-CL');
        const numero = 'COT-' + Date.now();
        const popup = window.open('', '_blank');
        const html = this._buildPrintHtml(totales, fecha, numero);
        popup.document.write(html);
        popup.document.close();
        popup.onload = () => setTimeout(()=> popup.print(), 400);
    }

    _buildPrintHtml(totales, fecha, numero) {
        let categoriasHtml = '';
        Object.keys(this.datos.materiales).forEach(cat => {
            const materiales = this.datos.materiales[cat] || {};
            const filas = Object.values(materiales).map(m => {
                const subtotal = ((m.cantidad || 0)*(m.precio || 0));
                return `<tr><td style="padding:6px;border:1px solid #ddd">${m.nombre}</td><td style="padding:6px;border:1px solid #ddd">${m.descripcion || '-'}</td><td style="padding:6px;border:1px solid #ddd">${m.lugar || '-'}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${m.cantidad || 0}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">$${(m.precio||0).toLocaleString()}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">$${subtotal.toLocaleString()}</td></tr>`;
            }).join('');
            const subtotalCat = Object.values(materiales).reduce((s,m) => s + ((m.cantidad || 0)*(m.precio || 0)), 0);
            categoriasHtml += `<h3 style="margin:12px 0 6px;color:#2e5e4e">${cat.replace(/_/g,' ')}</h3><table style="width:100%;border-collapse:collapse;margin-bottom:10px"><thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Material</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Descripción</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Lugar</th><th style="padding:8px;border:1px solid #ddd;text-align:center">Cant.</th><th style="padding:8px;border:1px solid #ddd;text-align:right">V.Unit.</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th></tr></thead><tbody>${filas || `<tr><td colspan="6" style="padding:10px;text-align:center;color:#666">Sin materiales</td></tr>`}</tbody><tfoot><tr><td colspan="5" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">Subtotal ${cat.replace(/_/g,' ')}:</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">$${subtotalCat.toLocaleString()}</td></tr></tfoot></table>`;
        });

        return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cotización ${numero}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;color:#222;padding:18px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2e5e4e;padding-bottom:12px;margin-bottom:14px}.company{color:#2e5e4e;font-size:18px;font-weight:700}.meta{text-align:right;font-size:13px;color:#444}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #e0e0e0;padding:8px}th{background:#f7f7f7;text-align:left}.totals{margin-top:10px;display:flex;gap:18px;justify-content:flex-end}.totals .box{padding:10px 14px;background:#f7f7f7;border-radius:6px;min-width:160px;text-align:right}.big-total{font-size:20px;color:#2e7d32;font-weight:900}</style></head><body><div class="header"><div class="company">BYT SOFTWARE</div><div class="meta">Cotización: ${numero}<br>Fecha: ${fecha}</div></div>${categoriasHtml}<div style="margin-top:18px;"><h3 style="color:#2e5e4e;margin-bottom:8px">Totales</h3><div class="totals"><div class="box"><div style="font-size:12px;color:#666">Subtotal (sin IVA)</div><strong>$${totales.subtotalSinIVA.toLocaleString()}</strong></div><div class="box"><div style="font-size:12px;color:#666">IVA (19%)</div><strong>$${totales.iva.toLocaleString()}</strong></div><div class="box"><div style="font-size:12px;color:#666">TOTAL</div><div class="big-total">$${totales.totalConIVA.toLocaleString()}</div></div></div></div><div style="margin-top:24px;font-size:11px;color:#666">Documento generado por BYT SOFTWARE - Válido como referencia.</div></body></html>`;
    }
}

// Instancia global del wizard
let wizard = null;

// Funciones globales para navegación (para los botones del HTML)
function anteriorPaso() { wizard?.anteriorPaso(); }
function siguientePaso() { wizard?.siguientePaso(); }

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.wizard-container')) {
        try { wizard = new WizardCotizacion(); console.log('WizardCotizacion inicializado'); }
        catch (e) { console.error('Error inicializando wizard:', e); window.WizardInitError = e; }
    }
});
