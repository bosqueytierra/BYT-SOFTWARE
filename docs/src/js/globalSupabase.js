// ===== CONFIGURACIÓN SUPABASE =====
// Configuración del cliente Supabase
// NOTE: This file contains the Public ANON KEY hardcoded as requested. For production, move the key to environment variables or GitHub Secrets.
const SUPABASE_URL = 'https://paatfcaylifoqbsqqvpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYXRmY2F5bGlmb3Fic3FxdnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODg2NTgsImV4cCI6MjA3NTk2NDY1OH0.A4-1_eqqWhYDTFvqrdolwNQgx4HUsVNE07Y_VK25feE';

// Cliente Supabase (se cargará dinámicamente)
let supabase = null;

// Función para inicializar Supabase
async function initSupabase() {
    try {
        // Cargar la librería de Supabase desde CDN
        if (!window.supabase) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            
            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }

        // Inicializar el cliente
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return false;
    }
}

// ===== FUNCIONES DE COTIZACIONES =====

// Guardar cotización en Supabase
async function guardarCotizacion(datosCompletos) {
    try {
        if (!supabase) {
            await initSupabase();
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .insert([{
                nombre_proyecto: datosCompletos.cliente.nombre_proyecto,
                cliente: datosCompletos.cliente.nombre,
                direccion: datosCompletos.cliente.direccion,
                encargado: datosCompletos.cliente.encargado,
                notas: datosCompletos.cliente.notas,
                
                // Materiales (almacenar como JSON)
                quincalleria: JSON.stringify(datosCompletos.materiales.quincalleria || {}),
                tableros: JSON.stringify(datosCompletos.materiales.tableros || {}),
                tapacantos: JSON.stringify(datosCompletos.materiales.tapacantos || {}),
                corte: JSON.stringify(datosCompletos.materiales.corte || {}),
                madera: JSON.stringify(datosCompletos.materiales.madera || {}),
                led: JSON.stringify(datosCompletos.materiales.led || {}),
                
                // Valores traspasados
                fierro: datosCompletos.valoresTraspasados.fierro || 0,
                cuarzo: datosCompletos.valoresTraspasados.cuarzo || 0,
                ventanas: datosCompletos.valoresTraspasados.ventanas || 0,
                transporte: datosCompletos.valoresTraspasados.transporte || 0,
                almuerzo: datosCompletos.valoresTraspasados.almuerzo || 0,
                extras: JSON.stringify(datosCompletos.valoresTraspasados.extras || {}),
                
                // Totales
                total_materiales: datosCompletos.totales.totalMateriales,
                factor: datosCompletos.totales.factor,
                total_neto: datosCompletos.totales.totalNeto,
                iva: datosCompletos.totales.iva,
                total_proyecto: datosCompletos.totales.totalProyecto,
                ganancia: datosCompletos.totales.ganancia,
                
                created_at: new Date().toISOString()
            }]);

        if (error) {
            throw error;
        }

        console.log('Cotización guardada exitosamente:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        return { success: false, error: error.message };
    }
}

// Obtener todas las cotizaciones
async function obtenerCotizaciones() {
    try {
        if (!supabase) {
            await initSupabase();
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener cotizaciones:', error);
        return { success: false, error: error.message };
    }
}

// Obtener cotización por ID
async function obtenerCotizacionPorId(id) {
    try {
        if (!supabase) {
            await initSupabase();
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        return { success: false, error: error.message };
    }
}

// Actualizar cotización
async function actualizarCotizacion(id, datosActualizados) {
    try {
        if (!supabase) {
            await initSupabase();
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .update(datosActualizados)
            .eq('id', id);

        if (error) {
            throw error;
        }

        return { success: true, data };
        
    } catch (error) {
        console.error('Error al actualizar cotización:', error);
        return { success: false, error: error.message };
    }
}

// Eliminar cotización
async function eliminarCotizacion(id) {
    try {
        if (!supabase) {
            await initSupabase();
        }

        const { data, error } = await supabase
            .from('cotizaciones')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        return { success: true, data };
        
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        return { success: false, error: error.message };
    }
}

// ===== FUNCIONES DE UTILIDAD =====

// Mostrar notificación
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Validar conexión a Supabase
async function validarConexionSupabase() {
    try {
        if (!supabase) {
            await initSupabase();
        }
        
        // Hacer una consulta simple para validar la conexión
        const { data, error } = await supabase
            .from('cotizaciones')
            .select('count', { count: 'exact' })
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // PGRST116 es "tabla no encontrada"
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Error de conexión con Supabase:', error);
        return false;
    }
}

// Exportar funciones para uso global
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