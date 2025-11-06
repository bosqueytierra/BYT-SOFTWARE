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
                    nombre: 'Doer (Diseño)',
                    valor: 0,
                    factor: 0.1,
                    descripcion: 'Servicios de diseño y planos'
                },
                eplum: { 
                    nombre: 'Eplum (Instalación)',
                    valor: 0,
                    factor: 0.1,
                    descripcion: 'Instalación eléctrica y plomería'
                },
                cuarzo: { 
                    nombre: 'Cuarzo',
                    valor: 0,
                    factor: 0.1,
                    descripcion: 'Fabricación e instalación de cuarzo'
                },
                almuerzo: { 
                    nombre: 'Almuerzo',
                    valor: 0,
                    factor: 0.1,
                    descripcion: 'Servicios de alimentación'
                },
                transporte: { 
                    nombre: 'Transporte',
                    valor: 0,
                    factor: 0.1,
                    descripcion: 'Fletes y traslados'
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
        this.actualizarResumen();
    }
    
    // Actualizar barra de progreso
    actualizarProgreso() {
        const progreso = (this.pasoActual / this.totalPasos) * 100;
        const progressFill = document.querySelector('.progress-fill');
        const stepInfo = document.querySelector('.step-info');
        
        if (progressFill) {
            progressFill.style.width = `${progreso}%`;
        }
        
        if (stepInfo) {
            const pasoInfo = this.pasosPlan[this.pasoActual - 1];
            stepInfo.innerHTML = `
                <span>Paso ${this.pasoActual} de ${this.totalPasos}</span>
                <span><strong>${pasoInfo.titulo}</strong></span>
            `;
        }
    }
    
    // Mostrar paso específico
    mostrarPaso(numeroPaso) {
        // Ocultar todos los pasos
        const pasos = document.querySelectorAll('.wizard-step');
        pasos.forEach(paso => paso.style.display = 'none');
        
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
    
    // Generar contenido específico de cada paso
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
    
    // Generar paso de datos del cliente
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
        
        // Agregar event listeners
        const campos = ['nombre_proyecto', 'nombre_cliente', 'direccion', 'encargado', 'notas'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) {
                input.addEventListener('input', () => {
                    this.datos.cliente[campo === 'nombre_cliente' ? 'nombre' : campo] = input.value;
                    this.actualizarResumen();
                });
            }
        });
    }
    
    // Generar paso de material - NUEVA ESTRUCTURA
    generarPasoMaterial(container, categoria) {
        const categoriaInfo = window.categorias.materiales[categoria];
        if (!categoriaInfo) return;
        
        let html = `
            <div class="card">
                <h3 class="card-title">${categoriaInfo.nombre}</h3>
                <p style="color: #666; margin-bottom: 20px;">${categoriaInfo.descripcion}</p>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Unidad</th>
                                <th>Precio Unit.</th>
                                <th>Total</th>
                                <th>Lugar Compra</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        categoriaInfo.items.forEach(item => {
            const datosActuales = this.datos.materiales[categoria][item.id] || {
                cantidad: 0,
                precioUnitario: item.precio,
                lugarCompra: item.lugarCompra || '',
                observaciones: item.observaciones || ''
            };
            
            const total = (parseFloat(datosActuales.cantidad) || 0) * (parseFloat(datosActuales.precioUnitario) || 0);
            
            html += `
                <tr>
                    <td><strong>${item.nombre}</strong></td>
                    <td>
                        <input type="number" class="form-control" 
                               id="${item.id}_cantidad" 
                               value="${datosActuales.cantidad}"
                               min="0" step="0.01" style="width: 80px;">
                    </td>
                    <td>${item.unidad}</td>
                    <td>
                        <input type="number" class="form-control" 
                               id="${item.id}_precio" 
                               value="${datosActuales.precioUnitario}"
                               min="0" step="1" style="width: 100px;">
                    </td>
                    <td>
                        <span id="${item.id}_total" style="font-weight: 600; color: var(--color-primary);">
                            ${window.categorias.formatearPrecio(total)}
                        </span>
                    </td>
                    <td>
                        <input type="text" class="form-control" 
                               id="${item.id}_lugar" 
                               value="${datosActuales.lugarCompra}"
                               placeholder="Proveedor" style="width: 120px;">
                    </td>
                    <td>
                        <input type="text" class="form-control" 
                               id="${item.id}_obs" 
                               value="${datosActuales.observaciones}"
                               placeholder="Notas" style="width: 150px;">
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 20px; text-align: right; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Subtotal ${categoriaInfo.nombre}: 
                        <span id="subtotal_${categoria}" style="color: var(--color-primary); font-size: 18px;">
                            $0
                        </span>
                    </strong>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Agregar event listeners para cálculos automáticos
        categoriaInfo.items.forEach(item => {
            const inputCantidad = document.getElementById(`${item.id}_cantidad`);
            const inputPrecio = document.getElementById(`${item.id}_precio`);
            const inputLugar = document.getElementById(`${item.id}_lugar`);
            const inputObs = document.getElementById(`${item.id}_obs`);
            
            const actualizarItem = () => {
                const cantidad = parseFloat(inputCantidad.value) || 0;
                const precio = parseFloat(inputPrecio.value) || 0;
                const total = cantidad * precio;
                
                // Actualizar datos
                this.datos.materiales[categoria][item.id] = {
                    cantidad: cantidad,
                    precioUnitario: precio,
                    lugarCompra: inputLugar.value,
                    observaciones: inputObs.value
                };
                
                // Actualizar total del item
                document.getElementById(`${item.id}_total`).textContent = 
                    window.categorias.formatearPrecio(total);
                
                // Actualizar subtotal de categoría
                this.actualizarSubtotalCategoria(categoria);
                this.actualizarResumen();
            };
            
            if (inputCantidad) inputCantidad.addEventListener('input', actualizarItem);
            if (inputPrecio) inputPrecio.addEventListener('input', actualizarItem);
            if (inputLugar) inputLugar.addEventListener('input', actualizarItem);
            if (inputObs) inputObs.addEventListener('input', actualizarItem);
        });
        
        // Calcular subtotal inicial
        this.actualizarSubtotalCategoria(categoria);
    }
    
    // Generar paso de valores traspasados - LÓGICA BYT SIMPLIFICADA
    generarPasoTraspasados(container) {
        let html = `
            <div class="card">
                <h3 class="card-title">💰 Valores Traspasados</h3>
                <p style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>🔍 Fórmula BYT:</strong><br>
                    <code>NETO = (Materiales × Factor General) + (Traspasados) + (Traspasados × Factor Individual)</code>
                </p>
                <div style="display: grid; gap: 15px;">
        `;
        
        Object.keys(this.datos.valoresTraspasados).forEach(categoriaKey => {
            const categoriaInfo = this.datos.valoresTraspasados[categoriaKey];
            
            html += `
                <div style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; background: #f9f9f9;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                        <h4 style="color: var(--color-primary); margin: 0;">
                            ${categoriaInfo.nombre}
                        </h4>
                        <div style="font-size: 0.9em; color: #666;">
                            Ganancia: +${(categoriaInfo.factor * 100).toFixed(0)}%
                        </div>
                    </div>
                    
                    <p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">
                        ${categoriaInfo.descripcion}
                    </p>
                    
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">💵 Valor a Traspasar</label>
                            <input type="number" class="form-control" id="valor_${categoriaKey}" 
                                   value="${categoriaInfo.valor}" placeholder="0" 
                                   onchange="wizard.actualizarValorTraspasado('${categoriaKey}', 'valor', this.value)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">📈 Factor de Ganancia</label>
                            <select class="form-control" id="factor_${categoriaKey}" 
                                    onchange="wizard.actualizarValorTraspasado('${categoriaKey}', 'factor', this.value)">
                                <option value="0.05" ${categoriaInfo.factor === 0.05 ? 'selected' : ''}>5%</option>
                                <option value="0.1" ${categoriaInfo.factor === 0.1 ? 'selected' : ''}>10%</option>
                                <option value="0.15" ${categoriaInfo.factor === 0.15 ? 'selected' : ''}>15%</option>
                                <option value="0.2" ${categoriaInfo.factor === 0.2 ? 'selected' : ''}>20%</option>
                                <option value="0.25" ${categoriaInfo.factor === 0.25 ? 'selected' : ''}>25%</option>
                                <option value="0.3" ${categoriaInfo.factor === 0.3 ? 'selected' : ''}>30%</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: right;">
                        <small style="color: #666;">Ganancia generada: </small>
                        <strong style="color: var(--color-primary);" id="ganancia_${categoriaKey}">
                            ${this.formatearPrecio(categoriaInfo.valor * categoriaInfo.factor)}
                        </strong>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
            
            html += `
                <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px;">
                    <h4 style="color: var(--color-primary); margin-bottom: 15px;">
                        ${categoriaInfo.nombre}
                    </h4>
                    <p style="color: #666; margin-bottom: 15px;">${categoriaInfo.descripcion}</p>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Factor de Ganancia</label>
                            <select class="form-control" id="factor_${categoriaKey}">
            `;
            
            window.categorias.opcionesFactor.forEach(opcion => {
                const selected = opcion.valor === datosActuales.factor ? 'selected' : '';
                html += `<option value="${opcion.valor}" ${selected}>${opcion.texto}</option>`;
            });
            
            html += `
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-container" style="margin-top: 15px;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Servicio</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Subtotal</th>
                                    <th>Proveedor</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            categoriaInfo.items.forEach(item => {
                const datosItem = datosActuales[item.id] || {
                    cantidad: item.cantidad || 0,
                    precioUnitario: item.precio || 0,
                    proveedor: item.proveedor || ''
                };
                
                const subtotal = (parseFloat(datosItem.cantidad) || 0) * (parseFloat(datosItem.precioUnitario) || 0);
                
                html += `
                    <tr>
                        <td><strong>${item.nombre}</strong></td>
                        <td>
                            <input type="number" class="form-control" 
                                   id="${categoriaKey}_${item.id}_cantidad" 
                                   value="${datosItem.cantidad}"
                                   min="0" step="0.01" style="width: 80px;">
                        </td>
                        <td>
                            <input type="number" class="form-control" 
                                   id="${categoriaKey}_${item.id}_precio" 
                                   value="${datosItem.precioUnitario}"
                                   min="0" step="1000" style="width: 100px;">
                        </td>
                        <td>
                            <span id="${categoriaKey}_${item.id}_subtotal" style="font-weight: 600;">
                                ${window.categorias.formatearPrecio(subtotal)}
                            </span>
                        </td>
                        <td>
                            <input type="text" class="form-control" 
                                   id="${categoriaKey}_${item.id}_proveedor" 
                                   value="${datosItem.proveedor}"
                                   placeholder="Proveedor" style="width: 120px;">
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: right; margin-top: 15px; padding: 10px; background: #f8f9fa;">
                        <strong>Total con Factor: 
                            <span id="total_${categoriaKey}" style="color: var(--color-primary); font-size: 16px;">
                                $0
                            </span>
                        </strong>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Agregar event listeners
        Object.keys(window.categorias.valoresTraspasados).forEach(categoriaKey => {
            const categoriaInfo = window.categorias.valoresTraspasados[categoriaKey];
            
            // Factor
            const selectFactor = document.getElementById(`factor_${categoriaKey}`);
            if (selectFactor) {
                selectFactor.addEventListener('change', () => {
                    this.datos.valoresTraspasados[categoriaKey].factor = parseFloat(selectFactor.value);
                    this.actualizarTotalTraspasado(categoriaKey);
                    this.actualizarResumen();
                });
            }
            
            // Items
            categoriaInfo.items.forEach(item => {
                const actualizarTraspasado = () => {
                    const cantidad = parseFloat(document.getElementById(`${categoriaKey}_${item.id}_cantidad`).value) || 0;
                    const precio = parseFloat(document.getElementById(`${categoriaKey}_${item.id}_precio`).value) || 0;
                    const proveedor = document.getElementById(`${categoriaKey}_${item.id}_proveedor`).value;
                    
                    this.datos.valoresTraspasados[categoriaKey][item.id] = {
                        cantidad,
                        precioUnitario: precio,
                        proveedor
                    };
                    
                    // Actualizar subtotal del item
                    const subtotal = cantidad * precio;
                    document.getElementById(`${categoriaKey}_${item.id}_subtotal`).textContent = 
                        window.categorias.formatearPrecio(subtotal);
                    
                    this.actualizarTotalTraspasado(categoriaKey);
                    this.actualizarResumen();
                };
                
                document.getElementById(`${categoriaKey}_${item.id}_cantidad`).addEventListener('input', actualizarTraspasado);
                document.getElementById(`${categoriaKey}_${item.id}_precio`).addEventListener('input', actualizarTraspasado);
                document.getElementById(`${categoriaKey}_${item.id}_proveedor`).addEventListener('input', actualizarTraspasado);
            });
            
            // Calcular total inicial
            this.actualizarTotalTraspasado(categoriaKey);
        });
    }

    // Actualizar subtotal de categoría
    actualizarSubtotalCategoria(categoria) {
        const subtotal = window.categorias.calcularSubtotalCategoria(this.datos.materiales[categoria], categoria);
        const elemento = document.getElementById(`subtotal_${categoria}`);
        if (elemento) {
            elemento.textContent = window.categorias.formatearPrecio(subtotal);
        }
    }
    
    // Actualizar total de traspasado
    actualizarTotalTraspasado(categoriaKey) {
        const total = window.categorias.calcularSubtotalTraspasado(this.datos.valoresTraspasados[categoriaKey], categoriaKey);
        const elemento = document.getElementById(`total_${categoriaKey}`);
        if (elemento) {
            elemento.textContent = window.categorias.formatearPrecio(total);
        }
    }

    // Generar paso de factor general
    generarPasoFactor(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Factor General de Ganancia</h3>
                <p>Este factor se aplica a todas las categorías de materiales (NO a valores traspasados)</p>
                
                <div class="form-group" style="max-width: 300px;">
                    <label class="form-label">Seleccionar Factor</label>
                    <select class="form-control" id="factor_general">
                        ${window.categorias.opcionesFactor.map(opcion => 
                            `<option value="${opcion.valor}" ${opcion.valor === this.datos.factorGeneral ? 'selected' : ''}>${opcion.texto}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h4>Explicación del Factor:</h4>
                    <ul style="margin: 15px 0;">
                        <li><strong>1.0</strong> = Sin ganancia (solo recuperar costos)</li>
                        <li><strong>1.3</strong> = 30% de ganancia (recomendado)</li>
                        <li><strong>2.0</strong> = 100% de ganancia (duplicar precio)</li>
                    </ul>
                    <p><strong>Nota:</strong> Los valores traspasados tienen sus propios factores individuales.</p>
                </div>
            </div>
        `;
        
        // Event listener
        const selectFactor = document.getElementById('factor_general');
        if (selectFactor) {
            selectFactor.addEventListener('change', () => {
                this.datos.factorGeneral = parseFloat(selectFactor.value);
                this.actualizarResumen();
            });
        }
    }
    
    // Generar paso de extras
    generarPasoExtras(container) {
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Gastos Extras</h3>
                <p>Agregue gastos adicionales no contemplados en las categorías anteriores</p>
                <div id="extras-container">
                    <!-- Los extras se cargarán aquí -->
                </div>
                <button type="button" class="btn btn-secondary" onclick="wizard.agregarExtra()">
                    + Agregar Gasto Extra
                </button>
            </div>
        `;
        
        this.cargarExtras();
    }
    
    // Cargar extras existentes
    cargarExtras() {
        const container = document.getElementById('extras-container');
        if (!container) return;
        
        const extras = this.datos.valoresTraspasados.extras || {};
        container.innerHTML = '';
        
        Object.keys(extras).forEach((key, index) => {
            this.agregarCampoExtra(key, extras[key], index);
        });
    }
    
    // Agregar nuevo extra
    agregarExtra() {
        const key = `extra_${Date.now()}`;
        this.agregarCampoExtra(key, 0);
    }
    
    // Agregar campo de extra
    agregarCampoExtra(key, valor = 0, index = null) {
        const container = document.getElementById('extras-container');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = 'form-row';
        div.style.marginBottom = '15px';
        div.innerHTML = `
            <div class="form-group" style="flex: 2;">
                <input type="text" class="form-control" 
                       placeholder="Descripción del gasto" 
                       id="desc_${key}" 
                       value="${key.replace('extra_', '').replace(/\d+/, '') || ''}">
            </div>
            <div class="form-group" style="flex: 1;">
                <input type="number" class="form-control" 
                       placeholder="Monto" 
                       id="valor_${key}" 
                       value="${valor}"
                       min="0" step="1000">
            </div>
            <button type="button" class="btn btn-secondary" 
                    onclick="wizard.eliminarExtra('${key}')" 
                    style="padding: 12px; background: #f44336;">
                ✕
            </button>
        `;
        
        container.appendChild(div);
        
        // Event listeners
        document.getElementById(`desc_${key}`).addEventListener('input', (e) => {
            if (e.target.value.trim()) {
                this.datos.valoresTraspasados.extras[key] = 
                    this.datos.valoresTraspasados.extras[key] || 0;
            }
        });
        
        document.getElementById(`valor_${key}`).addEventListener('input', (e) => {
            this.datos.valoresTraspasados.extras[key] = parseFloat(e.target.value) || 0;
            this.actualizarResumen();
        });
    }
    
    // Eliminar extra
    eliminarExtra(key) {
        delete this.datos.valoresTraspasados.extras[key];
        this.cargarExtras();
        this.actualizarResumen();
    }
    
    // Generar paso de resumen - NUEVA ESTRUCTURA
    generarPasoResumen(container) {
        const totales = window.categorias.calcularTotales(this.datos);
        
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">Resumen Final del Proyecto</h3>
                <p style="color: #666;">Revise todos los datos antes de guardar la cotización</p>
                
                <!-- Resumen de Materiales -->
                <div style="margin: 20px 0;">
                    <h4 style="color: var(--color-primary);">📦 Materiales y Servicios</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Total Materiales Base</span>
                            <span class="summary-value">${window.categorias.formatearPrecio(totales.totalMaterialesBase)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Factor General</span>
                            <span class="summary-value" style="color: #ff9800;">${this.datos.factorGeneral}x</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Materiales con Factor</span>
                            <span class="summary-value">${window.categorias.formatearPrecio(totales.totalMaterialesConFactor)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Servicios Externos</span>
                            <span class="summary-value">${window.categorias.formatearPrecio(totales.totalServicios)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Resumen de Traspasados -->
                <div style="margin: 20px 0;">
                    <h4 style="color: var(--color-primary);">🏢 Valores Traspasados</h4>
                    <div class="summary-grid">
        `;
        
        // Mostrar detalle de cada traspasado
        Object.keys(window.categorias.valoresTraspasados).forEach(key => {
            const categoria = window.categorias.valoresTraspasados[key];
            const total = window.categorias.calcularSubtotalTraspasado(this.datos.valoresTraspasados[key], key);
            const factor = this.datos.valoresTraspasados[key]?.factor || categoria.factorPorDefecto;
            
            container.innerHTML += `
                        <div class="summary-item">
                            <span class="summary-label">${categoria.proveedor} (${factor}x)</span>
                            <span class="summary-value">${window.categorias.formatearPrecio(total)}</span>
                        </div>
            `;
        });
        
        container.innerHTML += `
                        <div class="summary-item" style="border-top: 2px solid #e0e0e0; padding-top: 10px;">
                            <span class="summary-label"><strong>Total Traspasados</strong></span>
                            <span class="summary-value"><strong>${window.categorias.formatearPrecio(totales.totalTraspasados)}</strong></span>
                        </div>
                    </div>
                </div>
                
                <!-- Totales Finales -->
                <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px;">
                    <h4 style="color: var(--color-primary); text-align: center; margin-bottom: 20px;">💰 Totales Finales</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Subtotal (sin IVA)</span>
                            <span class="summary-value" style="font-size: 18px;">${window.categorias.formatearPrecio(totales.totalNeto)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">IVA (19%)</span>
                            <span class="summary-value" style="font-size: 18px; color: #ff9800;">${window.categorias.formatearPrecio(totales.iva)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label"><strong>TOTAL PROYECTO</strong></span>
                            <span class="summary-value" style="font-size: 24px; color: #2e5e4e; font-weight: bold;">
                                ${window.categorias.formatearPrecio(totales.totalProyecto)}
                            </span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Ganancia Estimada</span>
                            <span class="summary-value" style="font-size: 18px; color: #4caf50;">${window.categorias.formatearPrecio(totales.ganancia)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Información del Cliente -->
                <div style="margin: 20px 0; padding: 15px; background: #fff; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <h4 style="color: var(--color-primary);">👤 Información del Proyecto</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px;">
                        <div><strong>Proyecto:</strong> ${this.datos.cliente.nombre_proyecto || 'Sin nombre'}</div>
                        <div><strong>Cliente:</strong> ${this.datos.cliente.nombre || 'Sin especificar'}</div>
                        <div><strong>Dirección:</strong> ${this.datos.cliente.direccion || 'No especificada'}</div>
                        <div><strong>Encargado:</strong> ${this.datos.cliente.encargado || 'No especificado'}</div>
                    </div>
                    ${this.datos.cliente.notas ? `<div style="margin-top: 10px;"><strong>Notas:</strong> ${this.datos.cliente.notas}</div>` : ''}
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                    <button type="button" class="btn" onclick="wizard.guardarCotizacion()" 
                            style="padding: 15px 40px; font-size: 18px; background: linear-gradient(135deg, var(--color-primary), #245847);">
                        💾 Guardar Cotización Completa
                    </button>
                </div>
            </div>
        `;
    }
    
    // Actualizar resumen en barra superior - LÓGICA BYT EXACTA
    actualizarResumen() {
        const totales = this.calcularTotalesBYT();
        
        const elementos = {
            'total-materiales': totales.valorMateriales,
            'factor-valor': this.datos.factorGeneral + 'x',
            'neto-valor': totales.neto,
            'iva-valor': totales.iva,
            'total-proyecto': totales.total,
            'ganancia-valor': totales.ganancia
        };
        
        for (const [id, valor] of Object.entries(elementos)) {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (id === 'factor-valor') {
                    elemento.textContent = valor;
                } else {
                    elemento.textContent = this.formatearPrecio(valor);
                }
            }
        }
    }

    // CÁLCULO SEGÚN FÓRMULA BYT EXACTA
    calcularTotalesBYT() {
        // 1. VALOR MATERIALES (categorías NO traspasadas, sin factor)
        let valorMateriales = 0;
        const categoriasMateriales = ['quincalleria', 'tableros', 'tapacantos', 'tableros_madera', 'led_electricidad', 'otras_compras'];
        
        categoriasMateriales.forEach(categoria => {
            const items = this.datos.materiales[categoria] || {};
            Object.values(items).forEach(item => {
                if (item.cantidad && item.precio) {
                    valorMateriales += item.cantidad * item.precio;
                }
            });
        });

        // 2. SUMA DE CATEGORÍAS TRASPASADAS (sin factor)
        let sumaTraspasados = 0;
        let sumaTraspasadosConFactor = 0;
        
        Object.entries(this.datos.valoresTraspasados).forEach(([key, datos]) => {
            const valor = datos.valor || 0;
            const factor = datos.factor || 0;
            
            sumaTraspasados += valor;
            sumaTraspasadosConFactor += valor * factor;
        });

        // 3. NETO (según fórmula BYT)
        // NETO = (Valor Materiales × Factor General) + (Suma Traspasados) + (Suma Traspasados × Factor Individual)
        const neto = (valorMateriales * this.datos.factorGeneral) + sumaTraspasados + sumaTraspasadosConFactor;

        // 4. IVA (19% sobre el NETO)
        const iva = neto * 0.19;

        // 5. TOTAL A COBRAR
        const total = neto + iva;

        // 6. GANANCIA (Total - Traspasados sin factor - Materiales)
        const ganancia = total - sumaTraspasados - valorMateriales;

        return {
            valorMateriales,
            sumaTraspasados,
            sumaTraspasadosConFactor,
            neto,
            iva,
            total,
            ganancia
        };
    }

    // Formatear precio
    formatearPrecio(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    }
    
    // Actualizar botones de navegación
    actualizarBotonesNavegacion() {
        const btnAnterior = document.getElementById('btn-anterior');
        const btnSiguiente = document.getElementById('btn-siguiente');
        
        if (btnAnterior) {
            btnAnterior.style.display = this.pasoActual === 1 ? 'none' : 'inline-block';
        }
        
        if (btnSiguiente) {
            btnSiguiente.textContent = this.pasoActual === this.totalPasos ? 'Finalizar' : 'Siguiente';
        }
    }
    
    // Navegar al paso anterior
    anteriorPaso() {
        if (this.pasoActual > 1) {
            this.pasoActual--;
            this.actualizarProgreso();
            this.mostrarPaso(this.pasoActual);
        }
    }
    
    // Navegar al paso siguiente
    siguientePaso() {
        if (this.validarPasoActual()) {
            if (this.pasoActual < this.totalPasos) {
                this.pasoActual++;
                this.actualizarProgreso();
                this.mostrarPaso(this.pasoActual);
            } else {
                // Último paso - guardar
                this.guardarCotizacion();
            }
        }
    }
    
    // Validar paso actual
    validarPasoActual() {
        if (this.pasoActual === 1) {
            // Validar datos del cliente
            const nombre = document.getElementById('nombre_proyecto')?.value;
            const cliente = document.getElementById('nombre_cliente')?.value;
            
            if (!nombre || !cliente) {
                window.utils.mostrarNotificacion('Por favor complete los campos obligatorios', 'error');
                return false;
            }
        }
        return true;
    }
    
    // Guardar cotización
    async guardarCotizacion() {
        try {
            // Validar datos completos
            const errores = window.categorias.validarDatosCotizacion(this.datos);
            if (errores.length > 0) {
                window.utils.mostrarNotificacion(errores[0], 'error');
                return;
            }
            
            // Calcular totales finales
            const totales = window.categorias.calcularTotales(this.datos);
            this.datos.totales = totales;
            
            window.utils.mostrarNotificacion('Guardando cotización...', 'info');
            
            // Guardar en Supabase
            const resultado = await window.supabaseClient.guardarCotizacion(this.datos);
            
            if (resultado.success) {
                window.utils.mostrarNotificacion('Cotización guardada exitosamente', 'success');
                
                // Redirigir después de un momento
                setTimeout(() => {
                    window.location.href = 'consultar.html';
                }, 1500);
            } else {
                throw new Error(resultado.error);
            }
            
        } catch (error) {
            console.error('Error al guardar cotización:', error);
            window.utils.mostrarNotificacion('Error al guardar la cotización: ' + error.message, 'error');
        }
    }
}

// Instancia global del wizard
let wizard;

// Funciones globales para navegación
function anteriorPaso() {
    wizard?.anteriorPaso();
}

function siguientePaso() {
    wizard?.siguientePaso();
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.wizard-container')) {
        wizard = new WizardCotizacion();
    }
});

// ===== FUNCIONES DE CÁLCULO BYT (SIN MODIFICAR ESTRUCTURA EXISTENTE) =====

/**
 * Calcula totales según fórmula BYT exacta
 */
function calcularTotalesBYT_Externo(datosCotizacion) {
    try {
        // 1. Calcular valor total de materiales
        let valorMateriales = 0;
        const detallesPorCategoria = {};
        
        Object.keys(datosCotizacion.materiales).forEach(categoria => {
            let subtotalCategoria = 0;
            const materialesCategoria = datosCotizacion.materiales[categoria];
            
            Object.keys(materialesCategoria).forEach(material => {
                const datos = materialesCategoria[material];
                if (datos && datos.precio && datos.cantidad) {
                    const subtotal = datos.precio * datos.cantidad;
                    subtotalCategoria += subtotal;
                    valorMateriales += subtotal;
                }
            });
            
            detallesPorCategoria[categoria] = {
                subtotal: subtotalCategoria,
                materiales: Object.keys(materialesCategoria).length
            };
        });

        // 2. Calcular suma de valores traspasados
        let sumaTraspasados = 0;
        let sumaFactoresIndividuales = 0;
        const detallesTraspasados = {};
        
        Object.keys(datosCotizacion.valoresTraspasados).forEach(concepto => {
            const datos = datosCotizacion.valoresTraspasados[concepto];
            if (datos && datos.valor > 0) {
                sumaTraspasados += datos.valor;
                const factorIndividual = datos.valor * datos.factor;
                sumaFactoresIndividuales += factorIndividual;
                
                detallesTraspasados[concepto] = {
                    nombre: datos.nombre,
                    valor: datos.valor,
                    factor: datos.factor,
                    factorIndividual: factorIndividual
                };
            }
        });

        // 3. Aplicar fórmula BYT
        const factorGeneral = datosCotizacion.factorGeneral || 1.3;
        const materialesConFactor = valorMateriales * factorGeneral;
        const subtotalSinIVA = materialesConFactor + sumaTraspasados + sumaFactoresIndividuales;
        
        // 4. Calcular IVA y total final
        const iva = subtotalSinIVA * 0.19;
        const totalConIVA = subtotalSinIVA + iva;

        return {
            valorMateriales: valorMateriales,
            factorGeneral: factorGeneral,
            materialesConFactor: materialesConFactor,
            sumaTraspasados: sumaTraspasados,
            sumaFactoresIndividuales: sumaFactoresIndividuales,
            subtotalSinIVA: subtotalSinIVA,
            iva: iva,
            totalConIVA: totalConIVA,
            detallesPorCategoria: detallesPorCategoria,
            detallesTraspasados: detallesTraspasados,
            gananciaEstimada: materialesConFactor - valorMateriales,
            margenGanancia: ((materialesConFactor - valorMateriales) / materialesConFactor * 100).toFixed(2)
        };
        
    } catch (error) {
        console.error('Error en cálculo BYT:', error);
        return null;
    }
}

/**
 * Formatea un valor monetario colombiano
 */
function formatearMonedaBYT(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}