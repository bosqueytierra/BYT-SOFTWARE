// ===== WIZARD DE COTIZACIONES BYT - VERSION FUNCIONAL =====

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
        this.mostrarPaso(1);
        this.actualizarBarraSuperior(); // ⚡ Inicializar barra superior
    }
    
    actualizarProgreso() {
        const progreso = (this.pasoActual / this.totalPasos) * 100;
        const barraProgreso = document.getElementById('progreso-barra');
        const textoProgreso = document.getElementById('progreso-texto');
        
        if (barraProgreso) {
            barraProgreso.style.width = progreso + '%';
        }
        
        if (textoProgreso) {
            const pasoInfo = this.pasosPlan[this.pasoActual - 1];
            textoProgreso.textContent = `Paso ${this.pasoActual} de ${this.totalPasos}: ${pasoInfo ? pasoInfo.titulo : 'Cargando...'}`;
        }
    }
    
    mostrarPaso(numeroPaso) {
        // Ocultar todos los pasos
        for (let i = 1; i <= this.totalPasos; i++) {
            const paso = document.getElementById(`paso-${i}`);
            if (paso) {
                paso.style.display = 'none';
            }
        }
        
        // Mostrar paso actual
        const pasoActivo = document.getElementById(`paso-${numeroPaso}`);
        if (pasoActivo) {
            pasoActivo.style.display = 'block';
        }
        
        // Generar contenido del paso
        this.generarContenidoPaso(numeroPaso);
        
        // Actualizar botones de navegación
        this.actualizarBotonesNavegacion();
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
        }
    }
    
    generarPasoCliente(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Datos del Cliente y Proyecto</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre del Proyecto *</label>
                        <input type="text" class="form-control" id="nombre_proyecto" 
                               value="${this.datos.cliente.nombre_proyecto || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-control" id="nombre_cliente" 
                               value="${this.datos.cliente.nombre || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Dirección</label>
                        <input type="text" class="form-control" id="direccion" 
                               value="${this.datos.cliente.direccion || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Encargado</label>
                        <input type="text" class="form-control" id="encargado" 
                               value="${this.datos.cliente.encargado || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas del Proyecto</label>
                    <textarea class="form-control" id="notas" rows="4" 
                              placeholder="Describir detalles específicos del proyecto...">${this.datos.cliente.notas || ''}</textarea>
                </div>
            </div>
        `;
        
        // Event listeners
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
        // ESTRUCTURA EXACTA DE TU PLANILLA EXCEL DE BYT
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
                    precio: material.precio
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
                    <td>${material.nombre}</td>
                    <td>
                        <input type="text" class="form-control" value="${material.descripcion || ''}" 
                               placeholder="Descripción opcional..."
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'descripcion', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control" value="${material.lugar || ''}" 
                               placeholder="Lugar de compra..."
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'lugar', this.value)">
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${material.cantidad || 0}" 
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'cantidad', this.value)">
                    </td>
                    <td>
                        <input type="number" class="form-control" value="${material.precio || 0}" 
                               onchange="wizard.actualizarMaterial('${categoria}', '${materialId}', 'precio', this.value)">
                    </td>
                    <td style="font-weight: bold;">$${((material.cantidad || 0) * (material.precio || 0)).toLocaleString()}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        this.actualizarSubtotalCategoria(categoria);
    }
    
    agregarMaterial(categoria) {
        const nombre = prompt('Nombre del material:');
        if (nombre) {
            const materialId = 'material_' + Date.now();
            this.datos.materiales[categoria][materialId] = {
                nombre: nombre,
                cantidad: 0,
                precio: 0
            };
            this.cargarMaterialesCategoria(categoria);
        }
    }
    
    actualizarMaterial(categoria, materialId, campo, valor) {
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
                    <strong>� Estructura BYT:</strong> Cada categoría tiene factor 0.1 (10%) sobre el total traspaso<br>
                    <code>Total = Suma Materiales + (Suma Materiales × Factor 0.1)</code>
                </p>
        `;
        
        Object.keys(this.datos.valoresTraspasados).forEach(key => {
            const categoria = this.datos.valoresTraspasados[key];
            html += `
                <div style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; background: #f9f9f9; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; color: var(--color-primary);">
                            Valores Traspasados ${categoria.nombre}
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
                const total = material.cantidad * material.precio;
                html += `
                    <tr>
                        <td>${material.nombre}</td>
                        <td>${material.nombre}</td>
                        <td>
                            <input type="text" class="form-control" value="${material.lugar || ''}" 
                                   onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'lugar', this.value)" 
                                   style="width: 120px; font-size: 12px;">
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${material.cantidad}" 
                                   onchange="wizard.actualizarMaterialTraspasado('${key}', '${materialKey}', 'cantidad', this.value)" 
                                   style="width: 80px;">
                        </td>
                        <td>
                            <input type="number" class="form-control" value="${material.precio}" 
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
                totalTraspaso += material.cantidad * material.precio;
            });
            const cobroPorTraspaso = totalTraspaso * categoria.factor;
            
            html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <div>
                            <strong>Total Traspaso: <span id="total_traspaso_${key}">$${totalTraspaso.toLocaleString()}</span></strong>
                        </div>
                        <div>
                            <strong>Cobro por traspaso (${(categoria.factor * 100)}%): 
                                <span id="cobro_traspaso_${key}" style="color: #2e7d32;">$${cobroPorTraspaso.toLocaleString()}</span>
                            </strong>
                        </div>
                    </div>
                </div>
            `;
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
        
        // Recalcular totales
        let totalTraspaso = 0;
        Object.values(this.datos.valoresTraspasados[categoria].materiales).forEach(material => {
            totalTraspaso += material.cantidad * material.precio;
        });
        
        const cobroPorTraspaso = totalTraspaso * parseFloat(nuevoFactor);
        
        // Actualizar UI
        const totalElement = document.getElementById(`total_traspaso_${categoria}`);
        const cobroElement = document.getElementById(`cobro_traspaso_${categoria}`);
        
        if (totalElement) totalElement.textContent = '$' + totalTraspaso.toLocaleString();
        if (cobroElement) cobroElement.textContent = '$' + cobroPorTraspaso.toLocaleString();
        
        this.actualizarBarraSuperior(); // ⚡ Actualización en tiempo real
    }
    
    actualizarMaterialTraspasado(categoria, materialKey, campo, valor) {
        this.datos.valoresTraspasados[categoria].materiales[materialKey][campo] = 
            (campo === 'cantidad' || campo === 'precio') ? (parseFloat(valor) || 0) : valor;
        
        // Recalcular totales
        let totalTraspaso = 0;
        Object.values(this.datos.valoresTraspasados[categoria].materiales).forEach(material => {
            totalTraspaso += material.cantidad * material.precio;
        });
        
        const factor = this.datos.valoresTraspasados[categoria].factor;
        const cobroPorTraspaso = totalTraspaso * factor;
        
        // Actualizar UI
        const totalElement = document.getElementById(`total_traspaso_${categoria}`);
        const cobroElement = document.getElementById(`cobro_traspaso_${categoria}`);
        
        if (totalElement) totalElement.textContent = '$' + totalTraspaso.toLocaleString();
        if (cobroElement) cobroElement.textContent = '$' + cobroPorTraspaso.toLocaleString();
        
        // Actualizar fila específica
        this.generarPasoTraspasados(document.getElementById(`paso-8`));
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
    
    // FUNCIÓN CENTRAL DE CÁLCULOS BYT EN TIEMPO REAL
    calcularTotalesBYT() {
        // 1. Calcular total de materiales
        let totalMateriales = 0;
        Object.keys(this.datos.materiales).forEach(categoria => {
            Object.values(this.datos.materiales[categoria]).forEach(material => {
                totalMateriales += (material.cantidad || 0) * (material.precio || 0);
            });
        });
        
        // 2. Calcular total de traspasados base y con factores
        let totalTraspasos = 0;
        let totalTraspasosFactor = 0;
        let detalleTraspasados = {};
        
        Object.keys(this.datos.valoresTraspasados).forEach(categoriaKey => {
            const categoria = this.datos.valoresTraspasados[categoriaKey];
            let subtotalCategoria = 0;
            
            Object.values(categoria.materiales).forEach(material => {
                subtotalCategoria += (material.cantidad || 0) * (material.precio || 0);
            });
            
            const cobroFactor = subtotalCategoria * categoria.factor;
            
            detalleTraspasados[categoriaKey] = {
                subtotal: subtotalCategoria,
                factor: categoria.factor,
                cobroFactor: cobroFactor,
                total: subtotalCategoria + cobroFactor
            };
            
            totalTraspasos += subtotalCategoria;
            totalTraspasosFactor += cobroFactor;
        });
        
        // 3. Aplicar FÓRMULA BYT COMPLETA: 
        // (Materiales × Factor General) + (Traspasados) + (Traspasados × Factor Individual)
        const materialesConFactor = totalMateriales * this.datos.factorGeneral;
        const subtotalSinIVA = materialesConFactor + totalTraspasos + totalTraspasosFactor;
        const iva = subtotalSinIVA * 0.19;
        const totalConIVA = subtotalSinIVA + iva;
        
        // Ganancia = TOTAL DEL PROYECTO - Materiales - Traspasados
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
    
    // ACTUALIZAR BARRA SUPERIOR EN TIEMPO REAL
    actualizarBarraSuperior() {
        const totales = this.calcularTotalesBYT();
        
        // Actualizar elementos de la barra superior
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
            if (elemento) {
                const valor = elementos[id];
                if (id === 'factor-valor') {
                    elemento.textContent = valor;
                } else {
                    elemento.textContent = '$' + (typeof valor === 'number' ? valor.toLocaleString() : '0');
                }
            }
        });
    }
    
    generarPasoResumen(container) {
        // Usar la función central de cálculos BYT
        const totales = this.calcularTotalesBYT();
        
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
                    <h4 style="color: #2e7d32;
