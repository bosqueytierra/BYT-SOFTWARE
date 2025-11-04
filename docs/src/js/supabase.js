import { supabase } from '../supabaseClient';

// ===== FUNCIONES DE COTIZACIONES =====

async function guardarCotizacion(datosCompletos) {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .insert([{
                nombre_proyecto: datosCompletos.cliente.nombre_proyecto,
                cliente: datosCompletos.cliente.nombre,
                direccion: datosCompletos.cliente.direccion,
                encargado: datosCompletos.cliente.encargado,
                notas: datosCompletos.cliente.notas,
                
                quincalleria: JSON.stringify(datosCompletos.materiales.quincalleria || {}),
                tableros: JSON.stringify(datosCompletos.materiales.tableros || {}),
                tapacantos: JSON.stringify(datosCompletos.materiales.tapacantos || {}),
                corte: JSON.stringify(datosCompletos.materiales.corte || {}),
                madera: JSON.stringify(datosCompletos.materiales.madera || {}),
                led: JSON.stringify(datosCompletos.materiales.led || {}),
                
                fierro: datosCompletos.valoresTraspasados.fierro || 0,
                cuarzo: datosCompletos.valoresTraspasados.cuarzo || 0,
                ventanas: datosCompletos.valoresTraspasados.ventanas || 0,
                transporte: datosCompletos.valoresTraspasados.transporte || 0,
                almuerzo: datosCompletos.valoresTraspasados.almuerzo || 0,
                extras: JSON.stringify(datosCompletos.valoresTraspasados.extras || {}),
                
                total_materiales: datosCompletos.totales.totalMateriales,
                factor: datosCompletos.totales.factor,
                total_neto: datosCompletos.totales.totalNeto,
                iva: datosCompletos.totales.iva,
                total_proyecto: datosCompletos.totales.totalProyecto,
                ganancia: datosCompletos.totales.ganancia,
                
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;
        console.log('Cotización guardada exitosamente:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        return { success: false, error: error.message || error };
    }
}

async function obtenerCotizaciones() {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener cotizaciones:', error);
        return { success: false, error: error.message || error };
    }
}

async function obtenerCotizacionPorId(id) {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        return { success: false, error: error.message || error };
    }
}

async function actualizarCotizacion(id, datosActualizados) {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .update(datosActualizados)
            .eq('id', id);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al actualizar cotización:', error);
        return { success: false, error: error.message || error };
    }
}

async function eliminarCotizacion(id) {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        return { success: false, error: error.message || error };
    }
}

// ===== FUNCIONES DE UTILIDAD =====

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    notification.textContent = mensaje;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transition: all 0.3s ease;
        transform: translateX(100%);
    `;
    
    switch(tipo) {
        case 'success':
            notification.style.background = '#4caf50';
            break;
        case 'error':
            notification.style.background = '#f44336';
            break;
        case 'warning':
            notification.style.background = '#ff9800';
            break;
        default:
            notification.style.background = '#2196f3';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Validar conexión a Supabase (consulta simple)
async function validarConexionSupabase() {
    try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*', { count: 'exact' })
            .limit(1);

        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error de conexión con Supabase:', error);
        return { success: false, error: error.message || error };
    }
}

// Función de prueba con URL/KEY diferentes (no cambia el cliente global)
async function testWithCustom(url, anonKey, email, password) {
    try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
        const tmpClient = mod.createClient(url, anonKey);
        const res = await tmpClient.auth.signInWithPassword({ email, password });
        return res;
    } catch (err) {
        console.error('Error en testWithCustom:', err);
        return { error: err };
    }
}

// Exportar funciones para uso global
window.supabaseClient = {
    guardarCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    actualizarCotizacion,
    eliminarCotizacion,
    validarConexion: validarConexionSupabase,
    testWithCustom
};

window.utils = {
    mostrarNotificacion
};
