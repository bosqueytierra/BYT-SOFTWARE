// ===== CONFIGURACIÓN SUPABASE (usa el cliente ya inicializado por supabaseBrowserClient.js) =====

// Obtiene el cliente Supabase ya inicializado desde window.supabase
// Si no está disponible, espera por el evento 'supabase:ready'
function getSupabaseClient() {
    // Si ya está disponible en window, usarlo directamente
    if (window.supabase && typeof window.supabase.from === 'function') {
        return window.supabase;
    }
    
    // Si window.globalSupabase.client está disponible, usarlo
    if (window.globalSupabase && window.globalSupabase.client && typeof window.globalSupabase.client.from === 'function') {
        return window.globalSupabase.client;
    }
    
    return null;
}

// Espera a que Supabase esté inicializado (con timeout)
async function waitForSupabase(timeoutMs = 5000) {
    const client = getSupabaseClient();
    if (client) return client;
    
    // Esperar por el evento supabase:ready
    return new Promise((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                console.warn('[globalSupabase] Timeout esperando inicialización de Supabase');
                resolve(null);
            }
        }, timeoutMs);
        
        const onReady = () => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(getSupabaseClient());
            }
        };
        
        const cleanup = () => {
            window.removeEventListener('supabase:ready', onReady);
            clearTimeout(timeout);
        };
        
        window.addEventListener('supabase:ready', onReady);
        
        // También hacer polling por si el evento ya se disparó
        const interval = setInterval(() => {
            const client = getSupabaseClient();
            if (client && !resolved) {
                resolved = true;
                clearInterval(interval);
                cleanup();
                resolve(client);
            }
        }, 100);
        
        setTimeout(() => clearInterval(interval), timeoutMs);
    });
}

// ===== FUNCIONES DE COTIZACIONES =====
// Usan el cliente Supabase ya inicializado
async function guardarCotizacion(datosCompletos) {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            throw new Error('Servicio de persistencia no disponible');
        }

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
        return { success: false, error: error.message || String(error) };
    }
}

async function obtenerCotizaciones() {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            throw new Error('Servicio de persistencia no disponible');
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener cotizaciones:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function obtenerCotizacionPorId(id) {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            throw new Error('Servicio de persistencia no disponible');
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function actualizarCotizacion(id, datosActualizados) {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            throw new Error('Servicio de persistencia no disponible');
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .update(datosActualizados)
            .eq('id', id);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al actualizar cotización:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function eliminarCotizacion(id) {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            throw new Error('Servicio de persistencia no disponible');
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// ===== UTILIDADES =====
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
        case 'success': notification.style.background = '#4caf50'; break;
        case 'error': notification.style.background = '#f44336'; break;
        case 'warning': notification.style.background = '#ff9800'; break;
        default: notification.style.background = '#2196f3';
    }
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => { try { document.body.removeChild(notification); } catch(e){} }, 300);
    }, 3000);
}

async function validarConexionSupabase() {
    try {
        const supabase = await waitForSupabase();
        if (!supabase || typeof supabase.from !== 'function') {
            return false;
        }
        // simple ping: listar 1 row (no crítico si tabla no existe)
        const { error } = await supabase.from('cotizaciones').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        return true;
    } catch (error) {
        console.error('Error de conexión con Supabase:', error);
        return false;
    }
}

// Exponer funciones globalmente
window.supabaseClient = {
    guardarCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    actualizarCotizacion,
    eliminarCotizacion,
    validarConexion: validarConexionSupabase,
    getClient: getSupabaseClient
};

window.utils = {
    mostrarNotificacion
};
