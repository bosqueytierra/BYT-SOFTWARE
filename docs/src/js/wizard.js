// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL =====
// Ruta: BYT_SOFTWARE/src/js/wizard.js
// Este archivo es la versión completa y corregida del wizard.js.
// Incluye:
// - carga de proveedores desde Supabase (window.supabase) con fallback REST/local
// - carga de materiales desde src/lib/materialsApi.js (Supabase) con cache
// - BroadcastChannel + localStorage fallback para sincronización entre pestañas
// - métodos de navegación (anterior/siguiente), actualización de botones y progresos
// - cálculo de totales BYT, impresión y guardado (local placeholder)
// - hotfix: método actualizarBotonesNavegacion para evitar TypeError

class WizardCotizacion {
  constructor() {
    this.pasoActual = 1;
    this.totalPasos = 10;
    this.proveedores = null; // cache de proveedores cargados desde Supabase
    this.materiales = null; // cache de materiales cargados desde Supabase

    // Fallback local (seed) en caso de que Supabase no responda inmediatamente
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
        doer: { nombre: 'DOER', factor: 0.1, materiales: {
          'estructuras_fierro_1': { nombre: 'Estructuras Fierro 1', cantidad: 0, precio: 0, lugar: 'Doer' },
          'estructuras_fierro_2': { nombre: 'Estructuras Fierro 2', cantidad: 0, precio: 0, lugar: 'Doer' }
        }},
        eplum: { nombre: 'EPLUM', factor: 0.1, materiales: {
          'puertas_eplum_1': { nombre: 'Puertas Eplum 1', cantidad: 0, precio: 0, lugar: 'Eplum' },
          'puertas_eplum_2': { nombre: 'Puertas Eplum 2', cantidad: 0, precio: 0, lugar: 'Eplum' },
          'puertas_eplum_3': { nombre: 'Puertas Eplum 3', cantidad: 0, precio: 0, lugar: 'Eplum' }
        }},
        cuarzo: { nombre: 'CUARZO', factor: 0.1, materiales: {
          'estructuras_cuarzo_1': { nombre: 'Estructuras Cuarzo 1', cantidad: 0, precio: 0, lugar: 'Marco 1' },
          'estructuras_cuarzo_2': { nombre: 'Estructuras Cuarzo 2', cantidad: 0, precio: 0, lugar: 'Marco 1' }
        }},
        almuerzo: { nombre: 'ALMUERZO', factor: 0.1, materiales: {
          'almuerzo_1': { nombre: 'Almuerzo 1', cantidad: 0, precio: 0, lugar: '' }
        }},
        transporte: { nombre: 'TRANSPORTE', factor: 0.1, materiales: {
          'transporte_1': { nombre: 'Transporte y despacho 1', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
          'transporte_2': { nombre: 'Transporte y despacho 2', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' },
          'transporte_3': { nombre: 'Transporte y despacho 3', cantidad: 0, precio: 0, lugar: 'Indicar Lugar', destino: 'Indicar Lugar' }
        }}
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

  // -------------------- Inicialización --------------------
  init() {
    this.actualizarProgreso();
    // safe: wrap mostrarPaso para que errores no bloqueen init
    try {
      this.mostrarPaso(1);
    } catch (e) {
      console.error('Error mostrando paso inicial:', e);
    }
    this.actualizarBarraSuperior();

    // Cargar datos en background
    this.loadProviders().catch(err => console.warn('No se pudieron cargar proveedores:', err));
    this.loadMaterials().catch(err => console.warn('No se pudieron cargar materiales:', err));

    // BroadcastChannel + storage fallback
    try {
      const bcP = new BroadcastChannel('byt-providers');
      bcP.onmessage = (ev) => {
        if (ev.data?.type === 'providers-updated') this.loadProviders().catch(console.error);
      };
      this._providersBroadcastChannel = bcP;
    } catch (e) { /* no support */ }

    try {
      const bcM = new BroadcastChannel('byt-materials');
      bcM.onmessage = (ev) => {
        if (ev.data?.type === 'materials-updated') this.loadMaterials().catch(console.error);
      };
      this._materialsBroadcastChannel = bcM;
    } catch (e) { /* no support */ }

    window.addEventListener('storage', (e) => {
      if (e.key === 'byt_providers_updated_at') this.loadProviders().catch(console.error);
      if (e.key === 'byt_materials_updated_at') this.loadMaterials().catch(console.error);
    });
  }

  // -------------------- Proveedores --------------------
  async loadProviders() {
    try {
      if (Array.isArray(this.proveedores) && this.proveedores.length) return this.proveedores;

      let providers = [];
      if (window.supabase && typeof window.supabase.from === 'function') {
        try {
          const { data, error } = await window.supabase
            .from('providers')
            .select('id,name,website,phone,notes,active,created_at')
            .order('name', { ascending: true });
          if (!error && Array.isArray(data)) {
            providers = data;
            console.log('Proveedores cargados desde window.supabase:', providers.length);
          } else if (error) {
            console.warn('Supabase client error al listar providers:', error);
          }
        } catch (e) {
          console.warn('Error usando window.supabase:', e);
        }
      } else {
        console.warn('window.supabase no disponible en esta página.');
      }

      // fallback REST público (ANON) — solo si no hay providers
      if ((!providers || providers.length === 0)) {
        try {
          const url = 'https://qwbeectinjasekkjzxls.supabase.co/rest/v1/providers?select=id,name,active&order=name.asc';
          const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';
          const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: 'application/json' } });
          if (r.ok) {
            const body = await r.json();
            if (Array.isArray(body)) providers = body.map(p => ({ id: p.id, name: p.name, active: p.active }));
            console.log('Proveedores cargados por REST fallback:', providers.length);
          } else {
            console.warn('REST fallback providers status:', r.status);
          }
        } catch (e) {
          console.warn('Error fetch REST fallback providers:', e);
        }
      }

      if (!providers || providers.length === 0) {
        providers = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
        console.log('Usando providerSeed local:', providers.length);
      }

      this.proveedores = providers;
      this.fillProviderSelects();
      return this.proveedores;
    } catch (err) {
      console.error('loadProviders error:', err);
      this.proveedores = (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
      this.fillProviderSelects();
      return this.proveedores;
    }
  }

  // -------------------- Materiales (Supabase) --------------------
  async loadMaterials({ onlyActive = true } = {}) {
    try {
      if (Array.isArray(this.materiales) && this.materiales.length) return this.materiales;

      const mod = await import('../lib/materialsApi.js');
      const res = await mod.listMaterials({ onlyActive });
      if (res?.error) {
        console.error('materialsApi.listMaterials error', res.error);
        this.materiales = [];
      } else {
        this.materiales = res.data || [];
      }
      window.wizardMaterials = this.materiales;
      this.onMaterialsLoaded();
      return this.materiales;
    } catch (err) {
      console.error('Error al cargar materials:', err);
      this.materiales = [];
      this.onMaterialsLoaded();
      return this.materiales;
    }
  }

  onMaterialsLoaded() {
    console.log('Materials cargados en wizard:', (this.materiales || []).length);
    try {
      const selects = document.querySelectorAll('select.material-select');
      if (selects && selects.length && Array.isArray(this.materiales)) {
        selects.forEach(select => {
          const current = select.getAttribute('data-current') || select.value || '';
          select.innerHTML = '<option value="">-- Selecciona material --</option>';
          this.materiales.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name + (m.price ? ` ($${m.price})` : '');
            select.appendChild(opt);
          });
          if (current) select.value = current;
        });
      }
    } catch (e) { /* no bloquear */ }
  }

  // -------------------- UI Helpers --------------------
  fillProviderSelects() {
    const list = Array.isArray(this.proveedores) && this.proveedores.length ? this.proveedores : (this.providerSeed || []).map(n => ({ id: n, name: n, active: true }));
    const selects = document.querySelectorAll('select.lugar-select');
    selects.forEach(select => {
      const currentVal = select.getAttribute('data-current') || select.value || '';
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

  // Hotfix: asegurar existencia del método que actualiza botones
  actualizarBotonesNavegacion() {
    try {
      const btnAnterior = document.getElementById('btn-anterior');
      const btnSiguiente = document.getElementById('btn-siguiente');
      if (btnAnterior) btnAnterior.style.display = this.pasoActual > 1 ? 'inline-block' : 'none';
      if (btnSiguiente) {
        const isUltimo = (typeof this.totalPasos === 'number') ? (this.pasoActual >= this.totalPasos) : false;
        btnSiguiente.textContent = isUltimo ? 'Finalizar' : 'Siguiente →';
      }
    } catch (err) {
      console.warn('Fallback actualizarBotonesNavegacion falló:', err);
    }
  }

  mostrarPaso(numeroPaso) {
    for (let i = 1; i <= this.totalPasos; i++) {
      const paso = document.getElementById(`paso-${i}`);
      if (paso) paso.style.display = 'none';
    }
    const pasoActivo = document.getElementById(`paso-${numeroPaso}`);
    if (pasoActivo) pasoActivo.style.display = 'block';
    this.generarContenidoPaso(numeroPaso);
    this.actualizarBotonesNavegacion();
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
    }
  }

  // (generarPasoCliente, generarPasoMaterial, generarPasoTraspasados, generarPasoFactor,
  // generarPasoResumen) --- estas funciones ya están definidas más abajo (omito repetición)

  // ---- Navegación de pasos ----
  anteriorPaso() {
    if (this.pasoActual > 1) {
      this.pasoActual -= 1;
      this.mostrarPaso(this.pasoActual);
      this.actualizarProgreso();
    }
  }

  siguientePaso() {
    if (!this.validarPasoActual()) return;
    if (this.pasoActual < this.totalPasos) {
      this.pasoActual += 1;
      this.mostrarPaso(this.pasoActual);
      this.actualizarProgreso();
    }
  }

  // Las funciones de generación de pasos y edición están definidas más arriba en el archivo.
  // Para mantener el archivo legible aquí, incluyo ahora las implementaciones completas
  // (copiadas desde la versión anterior) — empiezan a continuación.

  // --- generarPasoCliente (repetido para integridad) ---
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
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" class="form-control" id="direccion" value="${this.datos.cliente.direccion || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Encargado</label>
            <input type="text" class="form-control" id="encargado" value="${this.datos.cliente.encargado || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notas del Proyecto</label>
          <textarea class="form-control" id="notas" rows="4" placeholder="Describir detalles específicos del proyecto...">${this.datos.cliente.notas || ''}</textarea>
        </div>
      </div>
    `;
    const campos = ['nombre_proyecto', 'nombre_cliente', 'direccion', 'encargado', 'notas'];
    campos.forEach(campo => {
      const input = document.getElementById(campo);
      if (input) input.addEventListener('input', () => {
        this.datos.cliente[campo === 'nombre_cliente' ? 'nombre' : campo] = input.value;
      });
    });
  }

  // --- generarPasoMaterial (repetido para integridad) ---
  generarPasoMaterial(container, categoria) {
    const estructurasBYT = {
      quincalleria: { nombre: 'Quincallería', materiales: [
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
      ]},
      tableros: { nombre: 'Tableros', materiales: [
        { nombre: 'Melamina 18mm TIPO 1', cantidad: 0, precio: 0 },
        { nombre: 'Melamina 18mm TIPO 2', cantidad: 0, precio: 0 },
        { nombre: 'Melamina 18mm TIPO 3', cantidad: 0, precio: 0 },
        { nombre: 'Melamina 15mm TIPO 1', cantidad: 0, precio: 0 },
        { nombre: 'Melamina 15mm TIPO 2', cantidad: 0, precio: 0 },
        { nombre: 'Melamina 15mm TIPO 3', cantidad: 0, precio: 0 },
        { nombre: 'Durolac', cantidad: 0, precio: 0 },
        { nombre: 'MDF', cantidad: 0, precio: 0 }
      ]},
      tapacantos: { nombre: 'Tapacantos', materiales: [
        { nombre: 'Metros de tapacanto delgado TIPO 1', cantidad: 0, precio: 400 },
        { nombre: 'Metros de tapacanto delgado TIPO 2', cantidad: 0, precio: 400 },
        { nombre: 'Metros de tapacanto delgado TIPO 3', cantidad: 0, precio: 400 },
        { nombre: 'Metros de tapacanto grueso tipo 1', cantidad: 0, precio: 800 },
        { nombre: 'Metros de tapacanto grueso tipo 2', cantidad: 0, precio: 800 },
        { nombre: 'Metros de tapacanto grueso tipo 3', cantidad: 0, precio: 800 }
      ]},
      servicios_externos: { nombre: 'Servicios Externo de corte', materiales: [
        { nombre: 'Servicio Corte tablero EXTERNO', cantidad: 0, precio: 7000 },
        { nombre: 'Servicio Pegado tapacanto Delgado', cantidad: 0, precio: 450 },
        { nombre: 'Servicio Corte Durolac EXTERNO', cantidad: 0, precio: 3400 },
        { nombre: 'Servicio Pegado tapacanto Grueso', cantidad: 0, precio: 700 }
      ]},
      tableros_madera: { nombre: 'Tableros de Madera', materiales: [
        { nombre: 'Panel de Pino 30 mm', cantidad: 0, precio: 0 },
        { nombre: 'Panel de Pino 18 mm', cantidad: 0, precio: 0 },
        { nombre: 'Panel de Pino 16 mm', cantidad: 0, precio: 0 },
        { nombre: 'Terciado 18 mm', cantidad: 0, precio: 0 },
        { nombre: 'Terciado 12 mm', cantidad: 0, precio: 0 }
      ]},
      led_electricidad: { nombre: 'Led y electricidad', materiales: [
        { nombre: 'Canaleta Led TIPO 1', cantidad: 0, precio: 0 },
        { nombre: 'Canaleta Led TIPO 2', cantidad: 0, precio: 0 },
        { nombre: 'Cinta Led TIPO 1', cantidad: 0, precio: 0 },
        { nombre: 'Cinta Led TIPO 2', cantidad: 0, precio: 0 },
        { nombre: 'Fuente de Poder TIPO 1', cantidad: 0, precio: 0 },
        { nombre: 'Fuente de Poder TIPO 2', cantidad: 0, precio: 0 },
        { nombre: 'Interruptor Led', cantidad: 0, precio: 0 },
        { nombre: 'Cables Led', cantidad: 0, precio: 0 },
        { nombre: 'Cables Cordón', cantidad: 0, precio: 0 }
      ]},
      otras_compras: { nombre: 'Otras compras', materiales: [
        { nombre: 'Extras a Considerar', cantidad: 0, precio: 0 },
        { nombre: 'Vidrios', cantidad: 0, precio: 0 },
        { nombre: 'Ripado', cantidad: 0, precio: 0 }
      ]}
    };

    const estructura = estructurasBYT[categoria];
    if (!estructura) return;

    if (!this.datos.materiales[categoria] || Object.keys(this.datos.materiales[categoria]).length === 0) {
      estructura.materiales.forEach((material, index) => {
        const id = `${categoria}_${index}`;
        this.datos.materiales[categoria][id] = {
          nombre: material.nombre,
          cantidad: material.cantidad,
          precio: material.precio,
          lugar: material.lugar || ''
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
                <th style="width:25%;">Material</th>
                <th style="width:25%;">Descripción</th>
                <th style="width:20%;">Lugar de compra</th>
                <th style="width:10%;">Cantidad</th>
                <th style="width:15%;">Valor Unitario</th>
                <th style="width:15%;">Valor Total</th>
              </tr>
            </thead>
            <tbody id="tabla-${categoria}"></tbody>
          </table>
        </div>
        ${categoria === 'otras_compras' ? `<div style="margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="wizard.agregarMaterial('${categoria}')">+ Agregar Material Extra</button></div>` : ''}
        <div style="text-align:right; margin-top:15px; padding:15px; background:#e8f5e8; border-radius:8px; border:2px solid #4CAF50;">
          <strong style="font-size:18px;">SUBTOTAL ${estructura.nombre.toUpperCase()}: <span id="subtotal_${categoria}" style="color:#2e7d32; font-size:20px; font-weight:bold;">$0</span></strong>
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
      let opcionesHtml = '';
      const listaProv = Array.isArray(this.proveedores) && this.proveedores.length ? this.proveedores : (this.providerSeed || []).map(n => ({ id: n, name: n }));
      opcionesHtml += `<option value="">-- Selecciona proveedor --</option>`;
      listaProv.forEach(p => {
        const selected = ((material.lugar_id && p.id === material.lugar_id) || (!material.lugar_id && p.name === material.lugar)) ? 'selected' : '';
        opcionesHtml += `<option value="${(p.id||p.name).toString().replace(/"/g,'&quot;')}" ${selected}>${(p.name||p.id)}</option>`;
      });

      html += `
        <tr>
          <td>${material.nombre}</td>
          <td><input type="text" class="form-control" value="${material.descripcion || ''}" placeholder="Descripción opcional..." onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'descripcion', this.value)"></td>
          <td><select class="form-control lugar-select" data-current="${(material.lugar_id||material.lugar||'')}" onchange="wizard.onProveedorChange('${categoria}', '${materialId}', this.value)">${opcionesHtml}</select></td>
          <td><input type="number" class="form-control" value="${material.cantidad || 0}" onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'cantidad', this.value)"></td>
          <td><input type="number" class="form-control" value="${material.precio || 0}" onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'precio', this.value)"></td>
          <td style="font-weight:bold;">$${((material.cantidad || 0) * (material.precio || 0)).toLocaleString()}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
    this.fillProviderSelects();
    this.actualizarSubtotalCategoria(categoria);
  }

  onProveedorChange(categoria, materialId, value) {
    let nombre = value;
    if (Array.isArray(this.proveedores) && this.proveedores.length) {
      const p = this.proveedores.find(x => (x.id === value || x.name === value));
      if (p) nombre = p.name;
    } else if (this.providerSeed && this.providerSeed.includes(value)) {
      nombre = value;
    }
    if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
    this.datos.materiales[categoria][materialId].lugar_id = value || '';
    this.datos.materiales[categoria][materialId].lugar = nombre || '';
    this.cargarMaterialesCategoria(categoria);
    this.actualizarBarraSuperior();
  }

  agregarMaterial(categoria) {
    const nombre = prompt('Nombre del material:');
    if (nombre) {
      const materialId = 'material_' + Date.now();
      this.datos.materiales[categoria][materialId] = { nombre: nombre, cantidad: 0, precio: 0, lugar: '' };
      this.cargarMaterialesCategoria(categoria);
    }
  }

  actualizarMaterial(categoria, materialId, campo, valor) {
    if (!this.datos.materiales[categoria] || !this.datos.materiales[categoria][materialId]) return;
    if (campo === 'cantidad' || campo === 'precio') this.datos.materiales[categoria][materialId][campo] = parseFloat(valor) || 0;
    else this.datos.materiales[categoria][materialId][campo] = valor;
    this.cargarMaterialesCategoria(categoria);
    this.actualizarBarraSuperior();
  }

  eliminarMaterial(categoria, materialId) {
    if (confirm('¿Eliminar este material?')) {
      delete this.datos.materiales[categoria][materialId];
      this.cargarMaterialesCategoria(categoria);
      this.actualizarBarraSuperior();
    }
  }

  actualizarSubtotalCategoria(categoria) {
    let subtotal = 0;
    const materiales = this.datos.materiales[categoria];
    Object.values(materiales).forEach(material => subtotal += (material.cantidad || 0) * (material.precio || 0));
    const elemento = document.getElementById(`subtotal_${categoria}`);
    if (elemento) elemento.textContent = '$' + subtotal.toLocaleString();
  }

  generarPasoTraspasados(container) {
    let html = `<div class="card"><h3 class="card-title">💰 Valores Traspasados</h3><p style="background:#fff3cd;padding:15px;border-radius:8px;margin-bottom:20px;"><strong>ℹ️ Estructura BYT:</strong> Cada categoría tiene factor 0.1 (10%) sobre el total traspaso<br><code>Total = Suma Materiales + (Suma Materiales × Factor 0.1)</code></p>`;
    Object.keys(this.datos.valoresTraspasados).forEach(key => {
      const categoria = this.datos.valoresTraspasados[key];
      html += `<div style="border:2px solid #e0e0e0;border-radius:12px;padding:20px;background:#f9f9f9;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <h4 style="margin:0;color:var(--color-primary);">Valores Traspasados ${categoria.nombre}</h4>
          <div style="display:flex;align-items:center;gap:10px;"><label>Factor:</label><select class="form-control" style="width:80px;" onchange="wizard.actualizarFactorTraspasado('${key}', this.value)">${this.generarOpcionesFactor(categoria.factor)}</select></div>
        </div>
        <div class="table-container"><table class="table" style="font-size:14px;"><thead><tr><th>Materiales</th><th>Descripción</th><th>Lugar de compra</th><th>Cantidad</th><th>Valor unitario</th><th>Valor total</th></tr></thead><tbody>`;
      Object.keys(categoria.materiales).forEach(materialKey => {
        const material = categoria.materiales[materialKey];
        const total = material.cantidad * material.precio;
        html += `<tr>
          <td>${material.nombre}</td>
          <td>${material.nombre}</td>
          <td><input type="text" class="form-control" value="${material.lugar || ''}" onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'lugar', this.value)" style="width:120px;font-size:12px;"></td>
          <td><input type="number" class="form-control" value="${material.cantidad}" onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'cantidad', this.value)" style="width:80px;"></td>
          <td><input type="number" class="form-control" value="${material.precio}" onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'precio', this.value)" style="width:100px;"></td>
          <td style="font-weight:bold;">$${total.toLocaleString()}</td>
        </tr>`;
      });
      let totalTraspaso = 0;
      Object.values(categoria.materiales).forEach(material => totalTraspaso += material.cantidad * material.precio);
      const cobroPorTraspaso = totalTraspaso * categoria.factor;
      html += `</tbody></table></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:15px;padding:15px;background:#e8f5e8;border-radius:8px;">
          <div><strong>Total Traspaso: <span id="total_traspaso_${key}">$${totalTraspaso.toLocaleString()}</span></strong></div>
          <div><strong>Cobro por traspaso (${(categoria.factor*100)}%): <span id="cobro_traspaso_${key}" style="color:#2e7d32;">$${cobroPorTraspaso.toLocaleString()}</span></strong></div>
        </div></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
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
    this.datos.valoresTraspasados[categoria].factor = parseFloat(nuevoFactor);
    let totalTraspaso = 0;
    Object.values(this.datos.valoresTraspasados[categoria].materiales).forEach(material => totalTraspaso += material.cantidad * material.precio);
    const cobroPorTraspaso = totalTraspaso * parseFloat(nuevoFactor);
    const totalElement = document.getElementById(`total_traspaso_${categoria}`);
    const cobroElement = document.getElementById(`cobro_traspaso_${categoria}`);
    if (totalElement) totalElement.textContent = '$' + totalTraspaso.toLocaleString();
    if (cobroElement) cobroElement.textContent = '$' + cobroPorTraspaso.toLocaleString();
    this.actualizarBarraSuperior();
  }

  actualizarMaterialTraspasado(categoria, materialKey, campo, valor) {
    this.datos.valoresTraspasados[categoria].materiales[materialKey][campo] = (campo === 'cantidad' || campo === 'precio') ? (parseFloat(valor) || 0) : valor;
    let totalTraspaso = 0;
    Object.values(this.datos.valoresTraspasados[categoria].materiales).forEach(material => totalTraspaso += material.cantidad * material.precio);
    const factor = this.datos.valoresTraspasados[categoria].factor;
    const cobroPorTraspaso = totalTraspaso * factor;
    const totalElement = document.getElementById(`total_traspaso_${categoria}`);
    const cobroElement = document.getElementById(`cobro_traspaso_${categoria}`);
    if (totalElement) totalElement.textContent = '$' + totalTraspaso.toLocaleString();
    if (cobroElement) cobroElement.textContent = '$' + cobroPorTraspaso.toLocaleString();
    this.generarPasoTraspasados(document.getElementById(`paso-8`));
    this.actualizarBarraSuperior();
  }

  generarPasoFactor(container) {
    container.innerHTML = `
      <div class="card">
        <h3 class="card-title">⚙️ Factor General BYT</h3>
        <p style="background:#fff3cd;padding:15px;border-radius:8px;margin-bottom:20px;"><strong>📋 Información:</strong> El factor general se aplica a todos los materiales para calcular la ganancia base de BYT.</p>
        <div class="form-group">
          <label class="form-label">Factor General</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="number" class="form-control" id="factor_general" value="${this.datos.factorGeneral}" step="0.1" min="1" max="3" onchange="wizard.actualizarFactor(this.value)" style="width:120px;">
            <span style="color:#666;">(Ejemplo: 1.3 = 30% de ganancia)</span>
          </div>
        </div>
        <div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;">
          <h5>💡 Factores Sugeridos:</h5>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;">
            <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(2)">2.0x (100%)</button>
            <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(2.5)">2.5x (150%)</button>
            <button type="button" class="btn btn-outline-secondary" onclick="wizard.establecerFactor(3)">3.0x (200%)</button>
          </div>
        </div>
      </div>
    `;
  }

  actualizarFactor(valor) { this.datos.factorGeneral = parseFloat(valor) || 1.3; this.actualizarBarraSuperior(); }
  establecerFactor(factor) { this.datos.factorGeneral = factor; const input = document.getElementById('factor_general'); if (input) input.value = factor; this.actualizarBarraSuperior(); }

  calcularTotalesBYT() {
    let totalMateriales = 0;
    Object.keys(this.datos.materiales).forEach(cat => Object.values(this.datos.materiales[cat]).forEach(m => totalMateriales += (m.cantidad || 0)*(m.precio||0)));
    let totalTraspasos = 0, totalTraspasosFactor = 0, detalleTraspasados = {};
    Object.keys(this.datos.valoresTraspasados).forEach(catKey => {
      const cat = this.datos.valoresTraspasados[catKey];
      let subtotalCategoria = 0;
      Object.values(cat.materiales).forEach(m => subtotalCategoria += (m.cantidad||0)*(m.precio||0));
      const cobroFactor = subtotalCategoria * cat.factor;
      detalleTraspasados[catKey] = { subtotal: subtotalCategoria, factor: cat.factor, cobroFactor, total: subtotalCategoria + cobroFactor };
      totalTraspasos += subtotalCategoria;
      totalTraspasosFactor += cobroFactor;
    });
    const materialesConFactor = totalMateriales * this.datos.factorGeneral;
    const subtotalSinIVA = materialesConFactor + totalTraspasos + totalTraspasosFactor;
    const iva = subtotalSinIVA * 0.19;
    const totalConIVA = subtotalSinIVA + iva;
    const ganancia = subtotalSinIVA - totalMateriales - totalTraspasos;
    return { totalMateriales, factorGeneral: this.datos.factorGeneral, materialesConFactor, totalTraspasos, totalTraspasosFactor, totalTraspasados: totalTraspasos + totalTraspasosFactor, detalleTraspasados, subtotalSinIVA, iva, totalConIVA, ganancia };
  }

  actualizarBarraSuperior() {
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
      const elemento = document.getElementById(id);
      if (!elemento) return;
      const valor = elementos[id];
      if (id === 'factor-valor') elemento.textContent = valor;
      else elemento.textContent = '$' + (typeof valor === 'number' ? valor.toLocaleString() : '0');
    });
  }

  generarPasoResumen(container) {
    const totales = this.calcularTotalesBYT();
    container.innerHTML = `
      <div class="card">
        <h3 class="card-title">Resumen Final del Proyecto</h3>
        <div style="margin:20px 0;">
          <h4 style="color:var(--color-primary);">📦 Materiales</h4>
          <div class="summary-grid">
            <div class="summary-item"><span class="summary-label">Total Materiales Base</span><span class="summary-value">$${totales.totalMateriales.toLocaleString()}</span></div>
            <div class="summary-item"><span class="summary-label">Factor General BYT</span><span class="summary-value" style="color:#ff9800;">${totales.factorGeneral}x</span></div>
            <div class="summary-item"><span class="summary-label">Materiales con Factor</span><span class="summary-value">$${totales.materialesConFactor.toLocaleString()}</span></div>
            <div class="summary-item"><span class="summary-label">Ganancia del Proyecto</span><span class="summary-value" style="color:#4caf50;">$${totales.ganancia.toLocaleString()}</span></div>
          </div>
        </div>
        <div style="margin-top:30px;text-align:center;display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
          <button type="button" class="btn" onclick="wizard.guardarCotizacion()" style="padding:15px 40px;font-size:18px;background:linear-gradient(135deg,var(--color-primary),#245847);">💾 Guardar Cotización Completa</button>
          <button type="button" class="btn" onclick="wizard.imprimirCotizacion()" style="padding:15px 40px;font-size:18px;background:linear-gradient(135deg,#2196F3,#1976D2);color:white;">🖨️ Imprimir Cotización</button>
        </div>
      </div>
    `;
  }

  validarPasoActual() {
    const pasoInfo = this.pasosPlan[this.pasoActual - 1];
    if (pasoInfo.tipo === 'cliente') {
      const nombre = document.getElementById('nombre_proyecto');
      const cliente = document.getElementById('nombre_cliente');
      if (!nombre?.value || !cliente?.value) { alert('Por favor complete los campos obligatorios'); return false; }
    }
    return true;
  }

  async guardarCotizacion() {
    try {
      const cotizacion = { ...this.datos, fecha: new Date().toISOString(), numero: 'COT-' + Date.now() };
      console.log('Guardando cotización (local):', cotizacion);
      alert('¡Cotización guardada exitosamente!');
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      alert('Error al guardar la cotización: ' + (error.message || error));
    }
  }

  imprimirCotizacion() {
    const totales = this.calcularTotalesBYT();
    const fecha = new Date().toLocaleDateString('es-CO');
    const numero = 'COT-' + Date.now();
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Cotización ${numero} - BYT</title><style>${this.obtenerEstilosImpresion()}</style></head><body>${this.generarHTMLImpresion(totales, fecha, numero)}</body></html>
    `);
    ventanaImpresion.document.close();
    ventanaImpresion.onload = function() { setTimeout(()=> ventanaImpresion.print(), 500); };
  }

  obtenerEstilosImpresion() {
    return `
      @media print { *{margin:0;padding:0;box-sizing:border-box} body{font-family:Arial,sans-serif;font-size:12px;line-height:1.4;} .no-print{display:none!important} }
      body{font-family:Arial,sans-serif;max-width:210mm;margin:0 auto;padding:15mm;background:white;color:#333}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2e5e4e;padding-bottom:20px;margin-bottom:30px}
    `;
  }

  generarHTMLImpresion(totales, fecha, numero) {
    let detalleMateriales = '';
    Object.keys(this.datos.materiales).forEach(categoria => {
      const materiales = this.datos.materiales[categoria];
      let hayMateriales = false, filasCategoria = '';
      Object.values(materiales).forEach(material => {
        if ((material.cantidad || 0) > 0) {
          hayMateriales = true;
          const subtotal = (material.cantidad||0)*(material.precio||0);
          filasCategoria += `<tr><td>${material.nombre}</td><td>${material.descripcion || '-'}</td><td>${material.lugar || '-'}</td><td style="text-align:center;">${material.cantidad}</td><td style="text-align:right;">$${(material.precio||0).toLocaleString()}</td><td style="text-align:right;font-weight:bold;">$${subtotal.toLocaleString()}</td></tr>`;
        }
      });
      if (hayMateriales) detalleMateriales += `<tr style="background:#e8f5e8;"><td colspan="6" style="font-weight:bold;color:#2e7d32;text-transform:uppercase;">${categoria.replace(/_/g,' ')}</td></tr>${filasCategoria}`;
    });

    let detalleTraspasados = '';
    Object.keys(this.datos.valoresTraspasados).forEach(categoriaKey => {
      const categoria = this.datos.valoresTraspasados[categoriaKey];
      let hayTraspasados = false, filasCategoria = '';
      Object.values(categoria.materiales).forEach(material => {
        if ((material.cantidad || 0) > 0) {
          hayTraspasados = true;
          const subtotal = (material.cantidad||0)*(material.precio||0);
          filasCategoria += `<tr><td>${material.nombre}</td><td>${material.descripcion || '-'}</td><td style="text-align:center;">${material.cantidad}</td><td style="text-align:right;">$${(material.precio||0).toLocaleString()}</td><td style="text-align:right;">$${subtotal.toLocaleString()}</td></tr>`;
        }
      });
      if (hayTraspasados) detalleTraspasados += `<tr style="background:#fff3e0;"><td colspan="5" style="font-weight:bold;color:#f57c00;text-transform:uppercase;">${categoriaKey} (Factor: ${categoria.factor})</td></tr>${filasCategoria}`;
    });

    return `
      <div class="header"><div class="logo-section"><div class="company-name">BYT SOFTWARE</div><div class="company-subtitle">Sistemas de Cotización y Gestión</div></div><div class="cotizacion-info"><div class="cotizacion-numero">${numero}</div><div>Fecha: ${fecha}</div></div></div>
      <div class="section"><div class="section-title">📋 INFORMACIÓN DEL PROYECTO</div><div class="info-grid"><div class="info-item"><div class="info-label">Proyecto:</div><div>${this.datos.cliente.nombre_proyecto || 'Sin especificar'}</div></div><div class="info-item"><div class="info-label">Cliente:</div><div>${this.datos.cliente.nombre || 'Sin especificar'}</div></div><div class="info-item"><div class="info-label">Dirección:</div><div>${this.datos.cliente.direccion || 'No especificada'}</div></div><div class="info-item"><div class="info-label">Encargado:</div><div>${this.datos.cliente.encargado || 'No especificado'}</div></div></div></div>
      ${detalleMateriales ? `<div class="section"><div class="section-title">🔧 DETALLE DE MATERIALES</div><table class="table"><thead><tr><th>Material</th><th>Descripción</th><th>Lugar de Compra</th><th>Cant.</th><th>Valor Unit.</th><th>Subtotal</th></tr></thead><tbody>${detalleMateriales}</tbody></table></div>` : ''}
      ${detalleTraspasados ? `<div class="section"><div class="section-title">🏢 SERVICIOS TRASPASADOS</div><table class="table"><thead><tr><th>Servicio</th><th>Descripción</th><th>Cant.</th><th>Valor Unit.</th><th>Subtotal</th></tr></thead><tbody>${detalleTraspasados}</tbody></table></div>` : ''}
      <div class="footer"><p>Cotización generada por BYT SOFTWARE - Sistema de Gestión de Proyectos</p><p>Esta cotización es válida por 30 días a partir de la fecha de emisión</p></div>
    `;
  }
}

// Instancia global del wizard
let wizard;

// Funciones globales para navegación (compatibilidad con botones inline)
function anteriorPaso() { wizard?.anteriorPaso(); }
function siguientePaso() { wizard?.siguientePaso(); }

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.wizard-container')) {
    try {
      wizard = new WizardCotizacion();
    } catch (err) {
      console.error('Error inicializando WizardCotizacion:', err);
      // fallback: exponer clase para diagnóstico
      window.WizardCotizacionError = err;
    }
  }
});
