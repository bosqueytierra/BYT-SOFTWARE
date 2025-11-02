// ===== CATEGORÍAS DE MATERIALES - ESTRUCTURA REAL BYT =====
const categoriasMateriales = {
    quincalleria: {
        nombre: 'Quincallería',
        descripcion: 'Bisagras, correderas, manillas y accesorios',
        items: [
            { id: 'bisagras_recta', nombre: 'Bisagras paquete Recta', precio: 0, unidad: 'paquete', lugarCompra: '', observaciones: '' },
            { id: 'bisagras_curva', nombre: 'Bisagras paquete Curva', precio: 0, unidad: 'paquete', lugarCompra: '', observaciones: '' },
            { id: 'bisagras_semicurva', nombre: 'Bisagras paquete SemiCurva', precio: 0, unidad: 'paquete', lugarCompra: '', observaciones: '' },
            { id: 'corredera_telescopica_1', nombre: 'Corredera Telescópica Tipo 1', precio: 0, unidad: 'par', lugarCompra: '', observaciones: '' },
            { id: 'corredera_telescopica_2', nombre: 'Corredera Telescópica Tipo 2', precio: 0, unidad: 'par', lugarCompra: '', observaciones: '' },
            { id: 'corredera_telescopica_3', nombre: 'Corredera Telescópica Tipo 3', precio: 0, unidad: 'par', lugarCompra: '', observaciones: '' },
            { id: 'manillas_tipo1', nombre: 'Manillas Tipo 1', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'manillas_tipo2', nombre: 'Manillas Tipo 2', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'tip_on', nombre: 'Tip On', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'zocalo_pvc', nombre: 'Zócalo PVC', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'juego_zocalo_patas', nombre: 'Juego Zócalo Patas', precio: 0, unidad: 'juego', lugarCompra: '', observaciones: '' },
            { id: 'barra_closet', nombre: 'Barra Closet', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'perfil_tubular', nombre: 'Perfil Tubular Redondo', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' }
        ]
    },
    
    tableros: {
        nombre: 'Tableros',
        descripcion: 'Melaminas, MDF y Durolac',
        items: [
            { id: 'melamina_18_tipo1', nombre: 'Melamina 18mm TIPO 1', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'melamina_18_tipo2', nombre: 'Melamina 18mm TIPO 2', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'melamina_18_tipo3', nombre: 'Melamina 18mm TIPO 3', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'melamina_15_tipo1', nombre: 'Melamina 15mm TIPO 1', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'melamina_15_tipo2', nombre: 'Melamina 15mm TIPO 2', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'melamina_15_tipo3', nombre: 'Melamina 15mm TIPO 3', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'durolac_1', nombre: 'Durolac Tipo 1', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'durolac_2', nombre: 'Durolac Tipo 2', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'mdf_1', nombre: 'MDF Tipo 1', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'mdf_2', nombre: 'MDF Tipo 2', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'mdf_3', nombre: 'MDF Tipo 3', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' }
        ]
    },
    
    tapacantos: {
        nombre: 'Tapacantos',
        descripcion: 'Tapacantos delgados y gruesos',
        items: [
            { id: 'tapacanto_delgado_tipo1', nombre: 'Metros de tapacanto delgado TIPO 1', precio: 400, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'tapacanto_delgado_tipo2', nombre: 'Metros de tapacanto delgado TIPO 2', precio: 400, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'tapacanto_delgado_tipo3', nombre: 'Metros de tapacanto delgado TIPO 3', precio: 400, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'tapacanto_grueso_tipo1', nombre: 'Metros de tapacanto grueso TIPO 1', precio: 800, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'tapacanto_grueso_tipo2', nombre: 'Metros de tapacanto grueso TIPO 2', precio: 800, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'tapacanto_grueso_tipo3', nombre: 'Metros de tapacanto grueso TIPO 3', precio: 800, unidad: 'metro', lugarCompra: '', observaciones: '' }
        ]
    },
    
    servicios_externos: {
        nombre: 'Servicios Externos de Corte',
        descripcion: 'Servicios que dependen de tableros y tapacantos',
        calculoAutomatico: true,
        items: [
            { id: 'servicio_corte_tablero', nombre: 'Servicio Corte tablero EXTERNO', precio: 7000, unidad: 'servicio', lugarCompra: '', observaciones: '', dependeDe: ['tableros'] },
            { id: 'servicio_pegado_delgado', nombre: 'Servicio Pegado tapacanto Delgado', precio: 450, unidad: 'metro', lugarCompra: '', observaciones: '', dependeDe: ['tapacantos_delgado'] },
            { id: 'servicio_corte_durolac', nombre: 'Servicio Corte Durolac EXTERNO', precio: 3400, unidad: 'servicio', lugarCompra: '', observaciones: '', dependeDe: ['durolac'] },
            { id: 'servicio_pegado_grueso', nombre: 'Servicio Pegado tapacanto Grueso', precio: 700, unidad: 'metro', lugarCompra: '', observaciones: '', dependeDe: ['tapacantos_grueso'] }
        ]
    },
    
    tableros_madera: {
        nombre: 'Tableros de Madera',
        descripcion: 'Paneles de pino y terciado',
        items: [
            { id: 'panel_pino_30', nombre: 'Panel de Pino 30 mm', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'panel_pino_18', nombre: 'Panel de Pino 18 mm', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'panel_pino_16', nombre: 'Panel de Pino 16 mm', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'terciado_18', nombre: 'Terciado 18 mm', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' },
            { id: 'terciado_12', nombre: 'Terciado 12 mm', precio: 0, unidad: 'placa', lugarCompra: '', observaciones: '' }
        ]
    },
    
    led_electricidad: {
        nombre: 'LED y Electricidad',
        descripcion: 'Canaletas, cintas LED y fuentes de poder',
        items: [
            { id: 'canaleta_led_tipo1', nombre: 'Canaleta LED TIPO 1', precio: 9990, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'canaleta_led_tipo2', nombre: 'Canaleta LED TIPO 2', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'cinta_led_tipo1', nombre: 'Cinta LED TIPO 1', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'cinta_led_tipo2', nombre: 'Cinta LED TIPO 2', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'fuente_poder_tipo1', nombre: 'Fuente de Poder TIPO 1', precio: 20000, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'fuente_poder_tipo2', nombre: 'Fuente de Poder TIPO 2', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'interruptor_led', nombre: 'Interruptor LED', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'cables_led', nombre: 'Cables LED', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' },
            { id: 'cables_cordon', nombre: 'Cables Cordón', precio: 0, unidad: 'metro', lugarCompra: '', observaciones: '' }
        ]
    },

    otras_compras: {
        nombre: 'Otras Compras',
        descripcion: 'Extras, vidrios y ripado',
        items: [
            { id: 'extras_considerar', nombre: 'Extras a Considerar', precio: 0, unidad: 'unidad', lugarCompra: '', observaciones: '' },
            { id: 'vidrios', nombre: 'Vidrios', precio: 0, unidad: 'm²', lugarCompra: '', observaciones: '' },
            { id: 'ripado', nombre: 'Ripado', precio: 0, unidad: 'm²', lugarCompra: '', observaciones: '' }
        ]
    }
};

// ===== VALORES TRASPASADOS =====
const valoresTraspasados = {
    doer: {
        nombre: 'Valores Traspasados DOER',
        descripcion: 'Estructuras de fierro',
        factorPorDefecto: 0.1,
        proveedor: 'DOER',
        items: [
            { id: 'estructura_fierro_1', nombre: 'Estructuras Fierro 1', precio: 0, unidad: 'servicio', proveedor: 'Doer', observaciones: '' },
            { id: 'estructura_fierro_2', nombre: 'Estructuras Fierro 2', precio: 0, unidad: 'servicio', proveedor: 'Doer', observaciones: '' }
        ]
    },
    eplum: {
        nombre: 'Valores Traspasados EPLUM',
        descripcion: 'Puertas especializadas',
        factorPorDefecto: 0.1,
        proveedor: 'EPLUM',
        items: [
            { id: 'puerta_eplum_1', nombre: 'Puertas Eplum 1', precio: 0, unidad: 'unidad', proveedor: 'Eplum', observaciones: '' },
            { id: 'puerta_eplum_2', nombre: 'Puertas Eplum 2', precio: 0, unidad: 'unidad', proveedor: 'Eplum', observaciones: '' },
            { id: 'puerta_eplum_3', nombre: 'Puertas Eplum 3', precio: 0, unidad: 'unidad', proveedor: 'Eplum', observaciones: '' }
        ]
    },
    cuarzo: {
        nombre: 'Valores Traspasados CUARZO',
        descripcion: 'Estructuras de cuarzo',
        factorPorDefecto: 0.1,
        proveedor: 'MARCO',
        items: [
            { id: 'estructura_cuarzo_1', nombre: 'Estructuras Cuarzo 1', precio: 0, unidad: 'm²', proveedor: 'Marco 1', observaciones: '' },
            { id: 'estructura_cuarzo_2', nombre: 'Estructuras Cuarzo 2', precio: 0, unidad: 'm²', proveedor: 'Marco 1', observaciones: '' }
        ]
    },
    almuerzo: {
        nombre: 'Valores Traspasados ALMUERZO',
        descripcion: 'Alimentación para trabajadores',
        factorPorDefecto: 0.1,
        proveedor: 'INTERNO',
        items: [
            { id: 'almuerzo_trabajadores', nombre: 'Almuerzo', precio: 40000, unidad: 'día', cantidad: 2, proveedor: 'Interno', observaciones: '' }
        ]
    },
    transporte: {
        nombre: 'Valores Traspasados TRANSPORTE',
        descripcion: 'Transporte y despacho',
        factorPorDefecto: 0.1,
        proveedor: 'EXTERNO',
        items: [
            { id: 'transporte_1', nombre: 'Transporte y despacho 1', precio: 0, unidad: 'viaje', lugar: 'Indicar Lugar', destino: 'Indicar Lugar', encargado: '', observaciones: '' },
            { id: 'transporte_2', nombre: 'Transporte y despacho 2', precio: 0, unidad: 'viaje', lugar: 'Indicar Lugar', destino: 'Indicar Lugar', encargado: '', observaciones: '' },
            { id: 'transporte_3', nombre: 'Transporte y despacho 3', precio: 0, unidad: 'viaje', lugar: 'Indicar Lugar', destino: 'Indicar Lugar', encargado: '', observaciones: '' }
        ]
    }
};

// ===== OPCIONES DE FACTORES =====
const opcionesFactor = [
    { valor: 0, texto: '0 (Sin factor)' },
    { valor: 0.1, texto: '0.1 (10%)' },
    { valor: 0.2, texto: '0.2 (20%)' },
    { valor: 0.3, texto: '0.3 (30%)' },
    { valor: 0.4, texto: '0.4 (40%)' },
    { valor: 0.5, texto: '0.5 (50%)' },
    { valor: 0.6, texto: '0.6 (60%)' },
    { valor: 0.7, texto: '0.7 (70%)' },
    { valor: 0.8, texto: '0.8 (80%)' },
    { valor: 0.9, texto: '0.9 (90%)' },
    { valor: 1.0, texto: '1.0 (100%)' },
    { valor: 1.1, texto: '1.1 (110%)' },
    { valor: 1.2, texto: '1.2 (120%)' },
    { valor: 1.3, texto: '1.3 (130%)' },
    { valor: 1.4, texto: '1.4 (140%)' },
    { valor: 1.5, texto: '1.5 (150%)' },
    { valor: 1.6, texto: '1.6 (160%)' },
    { valor: 1.7, texto: '1.7 (170%)' },
    { valor: 1.8, texto: '1.8 (180%)' },
    { valor: 1.9, texto: '1.9 (190%)' },
    { valor: 2.0, texto: '2.0 (200%)' },
    { valor: 2.5, texto: '2.5 (250%)' },
    { valor: 3.0, texto: '3.0 (300%)' }
];

// ===== CONFIGURACIÓN DEL SISTEMA =====
const configuracionSistema = {
    iva: 19, // Porcentaje de IVA
    factorGanancia: 1.3, // Factor de ganancia por defecto
    moneda: 'CLP',
    empresa: {
        nombre: 'Bosque y Tierra',
        rut: '12.345.678-9',
        direccion: 'Dirección de la empresa',
        telefono: '+56 9 1234 5678',
        email: 'contacto@bosqueytierra.cl'
    }
};

// ===== FUNCIONES DE UTILIDAD =====

// Formatear precio en pesos chilenos
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(precio);
}

// Obtener item por ID de una categoría
function obtenerItemPorId(categoria, id) {
    const cat = categoriasMateriales[categoria];
    if (!cat) return null;
    return cat.items.find(item => item.id === id) || null;
}

// Calcular subtotal de una categoría de materiales
function calcularSubtotalCategoria(datosCategoria, categoriaKey) {
    let subtotal = 0;
    const categoria = categoriasMateriales[categoriaKey];
    
    if (!categoria || !datosCategoria) return 0;
    
    categoria.items.forEach(item => {
        const datos = datosCategoria[item.id];
        if (datos) {
            const cantidad = parseFloat(datos.cantidad) || 0;
            const precioUnitario = parseFloat(datos.precioUnitario) || item.precio || 0;
            subtotal += cantidad * precioUnitario;
        }
    });
    
    return subtotal;
}

// Calcular subtotal de valores traspasados
function calcularSubtotalTraspasado(datosTraspasado, categoriaKey) {
    const categoria = valoresTraspasados[categoriaKey];
    if (!categoria || !datosTraspasado) return 0;
    
    let subtotal = 0;
    categoria.items.forEach(item => {
        const datos = datosTraspasado[item.id];
        if (datos) {
            const cantidad = parseFloat(datos.cantidad) || 0;
            const precioUnitario = parseFloat(datos.precioUnitario) || item.precio || 0;
            subtotal += cantidad * precioUnitario;
        }
    });
    
    // Aplicar factor específico del traspasado
    const factor = parseFloat(datosTraspasado.factor) || categoria.factorPorDefecto || 0.1;
    return subtotal * factor;
}

// Calcular servicios externos automáticamente
function calcularServiciosExternos(datosCotizacion) {
    let totalServicios = 0;
    const servicios = categoriasMateriales.servicios_externos;
    
    if (!servicios || !datosCotizacion.materiales) return 0;
    
    servicios.items.forEach(servicio => {
        let cantidad = 0;
        
        // Calcular cantidad basada en dependencias
        if (servicio.dependeDe) {
            servicio.dependeDe.forEach(dependencia => {
                switch(dependencia) {
                    case 'tableros':
                        // Sumar todas las melaminas
                        const tableros = datosCotizacion.materiales.tableros;
                        if (tableros) {
                            Object.keys(tableros).forEach(tableroClave => {
                                if (tableroClave.includes('melamina')) {
                                    cantidad += parseFloat(tableros[tableroClave].cantidad) || 0;
                                }
                            });
                        }
                        break;
                        
                    case 'tapacantos_delgado':
                        // Sumar tapacantos delgados
                        const tapacantos = datosCotizacion.materiales.tapacantos;
                        if (tapacantos) {
                            Object.keys(tapacantos).forEach(tapacantoClave => {
                                if (tapacantoClave.includes('delgado')) {
                                    cantidad += parseFloat(tapacantos[tapacantoClave].cantidad) || 0;
                                }
                            });
                        }
                        break;
                        
                    case 'tapacantos_grueso':
                        // Sumar tapacantos gruesos
                        const tapacantosGruesos = datosCotizacion.materiales.tapacantos;
                        if (tapacantosGruesos) {
                            Object.keys(tapacantosGruesos).forEach(tapacantoClave => {
                                if (tapacantoClave.includes('grueso')) {
                                    cantidad += parseFloat(tapacantosGruesos[tapacantoClave].cantidad) || 0;
                                }
                            });
                        }
                        break;
                        
                    case 'durolac':
                        // Sumar durolac
                        const tablerosD = datosCotizacion.materiales.tableros;
                        if (tablerosD) {
                            Object.keys(tablerosD).forEach(tableroClave => {
                                if (tableroClave.includes('durolac')) {
                                    cantidad += parseFloat(tablerosD[tableroClave].cantidad) || 0;
                                }
                            });
                        }
                        break;
                }
            });
        }
        
        if (cantidad > 0) {
            totalServicios += cantidad * servicio.precio;
        }
    });
    
    return totalServicios;
}

// Calcular totales del proyecto - NUEVA LÓGICA
function calcularTotales(datosCotizacion) {
    let totalMateriales = 0;
    let totalTraspasados = 0;
    let totalServicios = 0;
    
    // 1. Sumar todas las categorías de materiales normales
    if (datosCotizacion.materiales) {
        for (const categoriaKey in datosCotizacion.materiales) {
            if (categoriasMateriales[categoriaKey] && categoriaKey !== 'servicios_externos') {
                totalMateriales += calcularSubtotalCategoria(datosCotizacion.materiales[categoriaKey], categoriaKey);
            }
        }
    }
    
    // 2. Calcular servicios externos automáticamente
    totalServicios = calcularServiciosExternos(datosCotizacion);
    
    // 3. Aplicar FACTOR GENERAL a materiales + servicios
    const factorGeneral = parseFloat(datosCotizacion.factorGeneral) || configuracionSistema.factorGanancia;
    const totalMaterialesConFactor = (totalMateriales + totalServicios) * factorGeneral;
    
    // 4. Sumar valores traspasados (cada uno con su propio factor)
    if (datosCotizacion.valoresTraspasados) {
        for (const categoriaKey in datosCotizacion.valoresTraspasados) {
            if (valoresTraspasados[categoriaKey]) {
                totalTraspasados += calcularSubtotalTraspasado(datosCotizacion.valoresTraspasados[categoriaKey], categoriaKey);
            }
        }
    }
    
    // 5. Total antes de IVA
    const totalNeto = totalMaterialesConFactor + totalTraspasados;
    
    // 6. Calcular IVA
    const iva = totalNeto * (configuracionSistema.iva / 100);
    const totalProyecto = totalNeto + iva;
    
    // 7. Calcular ganancia
    const costoBase = totalMateriales + totalServicios + (totalTraspasados / (datosCotizacion.factorTraspasadoPromedio || 1.1));
    const ganancia = totalNeto - costoBase;
    
    return {
        // Materiales base
        totalMateriales,
        totalServicios,
        totalMaterialesBase: totalMateriales + totalServicios,
        
        // Con factor general
        factorGeneral,
        totalMaterialesConFactor,
        
        // Traspasados
        totalTraspasados,
        
        // Totales finales
        totalNeto,
        iva,
        totalProyecto,
        ganancia,
        
        // Información adicional
        costoBase
    };
}

// Validar datos de cotización
function validarDatosCotizacion(datos) {
    const errores = [];
    
    // Validar cliente
    if (!datos.cliente?.nombre) {
        errores.push('El nombre del cliente es obligatorio');
    }
    
    if (!datos.cliente?.nombre_proyecto) {
        errores.push('El nombre del proyecto es obligatorio');
    }
    
    // Validar que tenga al menos un material o valor
    let tieneItems = false;
    
    if (datos.materiales) {
        for (const categoria in datos.materiales) {
            for (const item in datos.materiales[categoria]) {
                if (parseFloat(datos.materiales[categoria][item]) > 0) {
                    tieneItems = true;
                    break;
                }
            }
            if (tieneItems) break;
        }
    }
    
    if (!tieneItems && datos.valoresTraspasados) {
        for (const concepto in datos.valoresTraspasados) {
            if (parseFloat(datos.valoresTraspasados[concepto]) > 0) {
                tieneItems = true;
                break;
            }
        }
    }
    
    if (!tieneItems) {
        errores.push('Debe agregar al menos un material o valor al proyecto');
    }
    
    return errores;
}

// Exportar para uso global
window.categorias = {
    materiales: categoriasMateriales,
    valoresTraspasados,
    opcionesFactor,
    configuracion: configuracionSistema,
    formatearPrecio,
    obtenerItemPorId,
    calcularSubtotalCategoria,
    calcularSubtotalTraspasado,
    calcularServiciosExternos,
    calcularTotales,
    validarDatosCotizacion
};