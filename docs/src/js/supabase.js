// Configuración de Supabase para BYT SOFTWARE (Documentación)
// NOTA: Este archivo es para documentación. La aplicación real debe usar
// BYT_SOFTWARE/src/supabaseClient.js como cliente canónico.

import { createClient } from '@supabase/supabase-js';

// PLACEHOLDER - Replace with your actual values in production
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Funciones para manejar cotizaciones
export class SupabaseManager {
    
    // Guardar cotización completa
    async guardarCotizacion(cotizacion) {
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .insert([
                    {
                        numero: cotizacion.numero,
                        cliente_nombre: cotizacion.cliente.nombre,
                        cliente_proyecto: cotizacion.cliente.nombre_proyecto,
                        cliente_direccion: cotizacion.cliente.direccion,
                        cliente_encargado: cotizacion.cliente.encargado,
                        cliente_notas: cotizacion.cliente.notas,
                        materiales: JSON.stringify(cotizacion.materiales),
                        traspasados: JSON.stringify(cotizacion.valoresTraspasados),
                        factor_general: cotizacion.factorGeneral,
                        totales: JSON.stringify({
                            totalMateriales: cotizacion.totalMateriales,
                            totalTraspasados: cotizacion.totalTraspasados,
                            subtotal: cotizacion.subtotal,
                            iva: cotizacion.iva,
                            total: cotizacion.total,
                            ganancia: cotizacion.ganancia
                        }),
                        fecha_creacion: new Date().toISOString(),
                        estado: 'activa'
                    }
                ])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };

        } catch (error) {
            console.error('Error guardando cotización:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener todas las cotizaciones
    async obtenerCotizaciones() {
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            if (error) throw error;
            return { success: true, data };

        } catch (error) {
            console.error('Error obteniendo cotizaciones:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener cotización por ID
    async obtenerCotizacion(id) {
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Parsear los JSON almacenados
            if (data) {
                data.materiales = JSON.parse(data.materiales || '{}');
                data.traspasados = JSON.parse(data.traspasados || '{}');
                data.totales = JSON.parse(data.totales || '{}');
            }

            return { success: true, data };

        } catch (error) {
            console.error('Error obteniendo cotización:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar cotización
    async actualizarCotizacion(id, cotizacion) {
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .update({
                    cliente_nombre: cotizacion.cliente.nombre,
                    cliente_proyecto: cotizacion.cliente.nombre_proyecto,
                    cliente_direccion: cotizacion.cliente.direccion,
                    cliente_encargado: cotizacion.cliente.encargado,
                    cliente_notas: cotizacion.cliente.notas,
                    materiales: JSON.stringify(cotizacion.materiales),
                    traspasados: JSON.stringify(cotizacion.valoresTraspasados),
                    factor_general: cotizacion.factorGeneral,
                    totales: JSON.stringify(cotizacion.totales),
                    fecha_modificacion: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };

        } catch (error) {
            console.error('Error actualizando cotización:', error);
            return { success: false, error: error.message };
        }
    }

    // Eliminar cotización
    async eliminarCotizacion(id) {
        try {
            const { error } = await supabase
                .from('cotizaciones')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };

        } catch (error) {
            console.error('Error eliminando cotización:', error);
            return { success: false, error: error.message };
        }
    }
}
