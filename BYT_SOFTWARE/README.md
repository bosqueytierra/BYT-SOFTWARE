# BYT SOFTWARE

## Sistema de Gestión para Bosque y Tierra

### 🌟 Descripción del Proyecto

BYT SOFTWARE es una aplicación web local desarrollada para Bosque y Tierra, empresa dedicada al diseño y fabricación de muebles personalizados. El sistema permite gestionar cotizaciones de proyectos, calcular costos de materiales, aplicar factores de ganancia y generar reportes detallados.

### 🚀 Características Principales

- **Panel Administrativo**: Interfaz moderna y profesional con colores corporativos
- **Wizard de Cotizaciones**: Proceso guiado en 14 pasos para crear cotizaciones completas
- **Base de Datos**: Integración con Supabase (PostgreSQL) para almacenamiento
- **Cálculos Automáticos**: Sistema inteligente de cálculo de totales, IVA y ganancias
- **Gestión de Materiales**: Categorización completa de materiales y precios
- **Valores Traspasados**: Manejo de costos externos (fierro, cuarzo, transporte, etc.)
- **Consulta y Filtros**: Sistema avanzado de búsqueda y filtrado de cotizaciones
- **Responsive Design**: Adaptable a diferentes tamaños de pantalla

### 🏗️ Estructura del Proyecto

```
BYT_SOFTWARE/
├── index.html                    # Pantalla de inicio con carga
├── src/
│   ├── pages/
│   │   ├── menu_principal.html   # Dashboard principal
│   │   ├── login/
│   │   │   └── login.html        # Autenticación
│   │   ├── cotizaciones/
│   │   │   ├── nueva.html        # Wizard de nueva cotización
│   │   │   ├── consultar.html    # Lista de cotizaciones
│   │   │   └── detalle.html      # Vista detallada
│   │   ├── compras/              # Módulo futuro
│   │   ├── finanzas/             # Módulo futuro
│   │   └── configuracion/        # Módulo futuro
│   ├── js/
│   │   ├── globalSupabase.js     # Conexión y funciones de BD
│   │   ├── categorias.js         # Materiales y cálculos
│   │   └── wizard.js             # Lógica del wizard
│   ├── styles/
│   │   └── global.css            # Estilos globales
│   └── assets/
│       └── logo_byt.png          # Logo corporativo
└── README.md
```

### 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: CSS Variables y Grid/Flexbox
- **Tipografía**: Segoe UI
- **Futuro**: Electron para aplicación de escritorio

### ⚙️ Configuración

#### 1. Configurar Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Editar `src/js/globalSupabase.js`:
   ```javascript
   const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   const SUPABASE_ANON_KEY = 'tu-clave-anonima';
   ```

#### 2. Crear Tabla de Cotizaciones

Ejecutar en el SQL Editor de Supabase:

```sql
CREATE TABLE cotizaciones (
    id SERIAL PRIMARY KEY,
    nombre_proyecto VARCHAR(255) NOT NULL,
    cliente VARCHAR(255) NOT NULL,
    direccion TEXT,
    encargado VARCHAR(255),
    notas TEXT,
    
    -- Materiales (JSON)
    quincalleria JSONB DEFAULT '{}',
    tableros JSONB DEFAULT '{}',
    tapacantos JSONB DEFAULT '{}',
    corte JSONB DEFAULT '{}',
    madera JSONB DEFAULT '{}',
    led JSONB DEFAULT '{}',
    
    -- Valores traspasados
    fierro DECIMAL(10,2) DEFAULT 0,
    cuarzo DECIMAL(10,2) DEFAULT 0,
    ventanas DECIMAL(10,2) DEFAULT 0,
    transporte DECIMAL(10,2) DEFAULT 0,
    almuerzo DECIMAL(10,2) DEFAULT 0,
    extras JSONB DEFAULT '{}',
    
    -- Totales
    total_materiales DECIMAL(10,2) DEFAULT 0,
    factor DECIMAL(3,2) DEFAULT 1.30,
    total_neto DECIMAL(10,2) DEFAULT 0,
    iva DECIMAL(10,2) DEFAULT 0,
    total_proyecto DECIMAL(10,2) DEFAULT 0,
    ganancia DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Configurar Logo

Reemplazar `src/assets/logo_placeholder.txt` con `logo_byt.png` (imagen real del logo).

### 🎯 Uso del Sistema

#### Login
- Usuario: `admin`
- Contraseña: `byt2025`

#### Crear Nueva Cotización
1. Ir a "Cotizaciones" → "Nueva"
2. Seguir el wizard de 14 pasos:
   - Paso 1: Datos del cliente
   - Pasos 2-7: Materiales (quincallería, tableros, tapacantos, corte, madera, LED)
   - Pasos 8-13: Valores traspasados (fierro, cuarzo, ventanas, transporte, almuerzo, extras)
   - Paso 14: Resumen y guardado

#### Consultar Cotizaciones
- Lista completa con filtros de búsqueda
- Ordenamiento por fecha, cliente o total
- Acciones: Ver detalle, editar, duplicar, eliminar

### 📊 Categorías de Materiales

El sistema incluye las siguientes categorías predefinidas:

1. **Quincallería**: Bisagras, manillas, correderas, tornillos, etc.
2. **Tableros**: Melamina, MDF, terciado, OSB en diferentes espesores
3. **Tapacantos**: PVC, ABS, melamina, madera
4. **Corte y Mecanizado**: Cortes rectos/curvos, perforaciones, canteado
5. **Madera Sólida**: Pino, raulí, lingue, roble + barnices y tintes
6. **Iluminación LED**: Cintas, perfiles, difusores, fuentes, controladores

### 💰 Sistema de Cálculos

- **Total Materiales**: Suma de cantidad × precio de todos los materiales
- **Factor de Ganancia**: Multiplicador configurable (por defecto 1.3x)
- **Subtotal**: Total materiales + valores traspasados × factor
- **IVA**: 19% sobre el subtotal
- **Total Proyecto**: Subtotal + IVA
- **Ganancia**: Diferencia entre subtotal y costo base

### 🎨 Diseño

#### Colores Corporativos
- **Verde Principal**: `#2e5e4e`
- **Fondo**: `#f4f5f3`
- **Hover**: `#245847`

#### Tipografía
- **Familia**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Pesos**: 400 (normal), 500 (medium), 600 (semi-bold)

### 🔧 Funcionalidades Futuras

- [ ] Módulo de Compras
- [ ] Módulo de Finanzas
- [ ] Configuración avanzada del sistema
- [ ] Edición de cotizaciones existentes
- [ ] Duplicación de cotizaciones
- [ ] Exportación a PDF
- [ ] Integración con Electron
- [ ] Sistema de usuarios y permisos
- [ ] Reportes avanzados
- [ ] Backup automático

### 🚀 Ejecución

#### Desarrollo Local
1. Abrir `index.html` en un navegador web
2. O usar un servidor local:
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js
   npx serve .
   
   # Con PHP
   php -S localhost:8000
   ```

#### Preparación para Electron
El código está preparado para ser empaquetado con Electron para crear una aplicación de escritorio nativa.

### 👥 Soporte

Para soporte técnico o consultas sobre el sistema, contactar al desarrollador del proyecto.

### 📄 Licencia

Software interno desarrollado exclusivamente para Bosque y Tierra.

---

**BYT SOFTWARE v1.0** - Sistema de Gestión de Cotizaciones  
*Desarrollado para Bosque y Tierra - 2025*