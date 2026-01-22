// ===== CONFIGURACIÓN SUPABASE (modificado para usar el cliente ya creado y evitar duplicados) =====

const SUPABASE_URL = 'https://qwbeectinjasekkjzxls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';

let supabaseClient = null;

// Inicializa usando el cliente ya existente (creado por supabaseBrowserClient.js). No crea uno nuevo.
async function initSupabase() {
    try {
        if (window.supabase && typeof window.supabase.from === 'function') {
            supabaseClient = window.supabase;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = supabaseClient;
            return true;
        }
        if (supabaseClient && typeof supabaseClient.from !== 'function') {
            // nada
        } else if (supabaseClient && typeof supabaseClient.from === 'function') {
            window.supabase = supabaseClient;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = supabaseClient;
            return true;
        }

        const waitMs = 1500;
        const start = Date.now();
        let resolved = false;
        const onReady = () => {
            if (window.supabase && typeof window.supabase.from === 'function') {
                supabaseClient = window.supabase;
                window.globalSupabase = window.globalSupabase || {};
                window.globalSupabase.client = supabaseClient;
                resolved = true;
            }
        };
        window.addEventListener('supabase:ready', onReady);

        while (!resolved && (Date.now() - start) < waitMs) {
            if (window.supabase && typeof window.supabase.from === 'function') {
                supabaseClient = window.supabase;
                window.globalSupabase = window.globalSupabase || {};
                window.globalSupabase.client = supabaseClient;
                resolved = true;
                break;
            }
            await new Promise(res => setTimeout(res, 100));
        }
        window.removeEventListener('supabase:ready', onReady);

        if (resolved) return true;

        console.warn('Supabase no inicializado: no se encontró cliente en window.supabase');
        return false;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return false;
    }
}

// ===== FUNCIONES DE COTIZACIONES =====
async function guardarCotizacion(datosCompletos) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
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
                estado: 'borrador',
                created_at: new Date().toISOString(),
                partidas: JSON.stringify(datosCompletos?.cliente?.partidas || datosCompletos?.partidas || [])
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
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
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
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
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
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
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

// Nuevo: actualizar solo el estado de la cotización
async function actualizarEstadoCotizacion(id, estado) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { error } = await supabaseClient
            .from('cotizaciones')
            .update({ estado })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar estado de cotización:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function eliminarCotizacion(id) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
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

// ===== FUNCIONES DE VENTAS (fan-out por partida) =====

// Helper: parsear partidas desde cotización (acepta objeto, string JSON, data.partidas, cliente.partidas)
function extraerPartidas(cotizacion) {
    const candidatos = [
        cotizacion.partidas,
        cotizacion.data,
        cotizacion.data?.partidas,
        cotizacion.cliente,
        cotizacion.data?.cliente
    ];
    for (const c of candidatos) {
        if (!c) continue;
        if (typeof c === 'string') {
            try {
                const parsed = JSON.parse(c);
                if (Array.isArray(parsed)) return parsed;
                if (parsed?.partidas && Array.isArray(parsed.partidas)) return parsed.partidas;
                if (parsed?.cliente?.partidas && Array.isArray(parsed.cliente.partidas)) return parsed.cliente.partidas;
            } catch (_) { /* ignore */ }
        }
        if (c?.partidas && Array.isArray(c.partidas)) return c.partidas;
        if (c?.cliente?.partidas && Array.isArray(c.cliente.partidas)) return c.cliente.partidas;
        if (Array.isArray(c)) return c;
    }
    return [];
}

// Crea/actualiza ventas por partida; limpia previas para la cotización
async function crearOVincularVentaDesdeCotizacion(cotizacion, estadoVenta = 'en_ejecucion') {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }
        const partidas = extraerPartidas(cotizacion);

        // Limpia ventas previas de esta cotización para evitar residuos
        await supabaseClient.from('ventas').delete().eq('cotizacion_id', cotizacion.id);

        if (!partidas.length) return { success: true }; // sin partidas, nada que crear

        const rows = partidas.map((p, idx) => {
            const partidaId =
              p.id || p.uuid || p.key || p._id ||
              (crypto?.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${idx.toString().padStart(12,'0')}`);
            const partidaNombre = p.nombre || p.partida || p.titulo || 'Partida';
            return {
                cotizacion_id: cotizacion.id,
                partida_id: partidaId,
                partida_nombre: partidaNombre,
                proyecto: cotizacion.nombre_proyecto || cotizacion.project_key || cotizacion.data?.cliente?.nombre_proyecto || cotizacion.data?.cliente?.nombre || 'Sin nombre',
                cliente: cotizacion.cliente || cotizacion.data?.cliente?.nombre || null,
                total_cotizado: cotizacion.total_proyecto || cotizacion.total || 0,
                total_venta: 0, // se llenará manualmente luego
                estado: estadoVenta,
                updated_at: new Date().toISOString()
            };
        });

        const { error } = await supabaseClient
            .from('ventas')
            .upsert(rows, { onConflict: 'cotizacion_id,partida_id' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error al crear/actualizar venta desde cotización:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Actualiza estado de ventas de una cotización (todas sus partidas)
async function actualizarEstadoVentaPorCotizacion(cotizacionId, estado) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }
        const { error } = await supabaseClient
            .from('ventas')
            .update({ estado, updated_at: new Date().toISOString() })
            .eq('cotizacion_id', cotizacionId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar estado de venta:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Nuevo: actualizar monto de venta por partida
async function actualizarMontoVenta(id, total_venta) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }
        const { error } = await supabaseClient
            .from('ventas')
            .update({ total_venta, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar monto de venta:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Eliminar todas las ventas de una cotización (cuando ya no está aprobada)
async function eliminarVentasPorCotizacion(cotizacionId) {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }
        const { error, count } = await supabaseClient
            .from('ventas')
            .delete({ count: 'exact' })
            .eq('cotizacion_id', cotizacionId);
        if (error) throw error;
        return { success: true, count: count ?? 0 };
    } catch (error) {
        console.error('Error al eliminar ventas de cotización:', error);
        return { success: false, error: error.message || String(error), count: 0 };
    }
}

async function listarVentas() {
    try {
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
        }
        const { data, error } = await supabaseClient
            .from('ventas')
            .select('*')
            .order('proyecto', { ascending: true })
            .order('partida_nombre', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al listar ventas:', error);
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
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) return false;
        }
        const { error } = await supabaseClient.from('cotizaciones').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        return true;
    } catch (error) {
        console.error('Error de conexión con Supabase:', error);
        return false;
    }
}

// Exponer funciones globalmente
window.supabaseClient = {
    init: initSupabase,
    guardarCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    actualizarCotizacion,
    actualizarEstadoCotizacion,
    eliminarCotizacion,
    validarConexion: validarConexionSupabase,
    // Ventas
    crearOVincularVentaDesdeCotizacion,
    actualizarEstadoVentaPorCotizacion,
    eliminarVentasPorCotizacion,
    actualizarMontoVenta,
    listarVentas
};

window.utils = { mostrarNotificacion };
