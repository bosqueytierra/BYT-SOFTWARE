// ===== CONFIGURACIÓN SUPABASE (modificado para exponer cliente global y despachar evento) =====

// Configuración del cliente Supabase
const SUPABASE_URL = 'https://qwbeectinjasekkjzxls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';

let supabase = null;

// Inicializa la librería y crea el client; expone window.supabase y window.globalSupabase.client
async function initSupabase() {
    try {
        // 1) Si ya hay cliente creado (p.ej. por supabaseBrowserClient.js), úsalo
        if (window.supabase && typeof window.supabase.from === 'function') {
            supabase = window.supabase;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = supabase;
            return true;
        }

        // 2) Si este módulo ya creó el cliente antes, reutilizar
        if (supabase && typeof supabase.from === 'function') {
            window.supabase = supabase;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = supabase;
            return true;
        }

        // 3) Si la librería UMD no está cargada, cargarla
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
                s.async = false; // mantener ejecución ordenada
                s.onload = () => resolve();
                s.onerror = (e) => reject(new Error('No se pudo cargar supabase-js: ' + e));
                document.head.appendChild(s);
            });
        }

        // 4) Crear cliente desde la librería UMD
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Exponer el cliente en globals para compatibilidad con wizard y otros scripts
        window.supabase = supabase; // cliente en window.supabase (método .from disponible)
        window.globalSupabase = window.globalSupabase || {};
        window.globalSupabase.client = supabase;

        // Opcional: despachar evento para quien lo escuche
        try {
            window.dispatchEvent(new Event('supabase:ready'));
        } catch (e) { /* no crítico */ }

        console.log('Supabase inicializado correctamente y expuesto en window.supabase');
        return true;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return false;
    }
}

// ===== FUNCIONES DE COTIZACIONES =====
// (Mantengo tus funciones expuestas, pero usan la variable supabase que ahora se inicializa)
async function guardarCotizacion(datosCompletos) {
    try {
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
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
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
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
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
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
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
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
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) throw new Error('Supabase no inicializado');
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
        if (!supabase || typeof supabase.from !== 'function') {
            const ok = await initSupabase();
            if (!ok) return false;
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
    init: initSupabase,
    guardarCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    actualizarCotizacion,
    eliminarCotizacion,
    validarConexion: validarConexionSupabase
};

window.utils = {
    mostrarNotificacion
};

