-- Tabla principal de cotizaciones para BYT SOFTWARE
-- Ejecutar este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    
    -- Información del cliente
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_proyecto VARCHAR(255) NOT NULL,
    cliente_direccion TEXT,
    cliente_encargado VARCHAR(255),
    cliente_notas TEXT,
    
    -- Datos de la cotización (almacenados como JSON)
    materiales JSONB NOT NULL DEFAULT '{}',
    traspasados JSONB NOT NULL DEFAULT '{}',
    factor_general DECIMAL(10,2) DEFAULT 1.3,
    
    -- Totales calculados
    totales JSONB NOT NULL DEFAULT '{}',
    
    -- Metadatos
    estado VARCHAR(50) DEFAULT 'activa',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para búsquedas rápidas
    CONSTRAINT valid_estado CHECK (estado IN ('activa', 'finalizada', 'cancelada'))
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(numero);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_proyecto ON cotizaciones(cliente_proyecto);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);

-- Habilitar Row Level Security (RLS)
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Permitir todas las operaciones en cotizaciones" ON cotizaciones
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger para actualizar fecha_modificacion automáticamente
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cotizaciones_modtime
    BEFORE UPDATE ON cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

-- Función para generar número de cotización automático
CREATE OR REPLACE FUNCTION generar_numero_cotizacion()
RETURNS TEXT AS $$
BEGIN
    RETURN 'COT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM cotizaciones 
        WHERE DATE(fecha_creacion) = CURRENT_DATE
    )::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE cotizaciones IS 'Tabla principal para almacenar cotizaciones de BYT SOFTWARE';
COMMENT ON COLUMN cotizaciones.materiales IS 'JSON con todos los materiales organizados por categorías';
COMMENT ON COLUMN cotizaciones.traspasados IS 'JSON con servicios traspasados y sus factores';
COMMENT ON COLUMN cotizaciones.totales IS 'JSON con todos los totales calculados (materiales, traspasados, IVA, etc.)';

-- Insertar datos de prueba (opcional)
-- INSERT INTO cotizaciones (
--     numero, cliente_nombre, cliente_proyecto, 
--     materiales, traspasados, totales
-- ) VALUES (
--     'COT-TEST-001', 
--     'Cliente de Prueba', 
--     'Proyecto de Prueba',
--     '{"quincalleria": {}, "tableros": {}}',
--     '{"DOER": {"factor": 1.5, "materiales": {}}}',
--     '{"total": 1000000, "iva": 190000}'
-- );