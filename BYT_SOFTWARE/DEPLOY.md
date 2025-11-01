# 🚀 BYT SOFTWARE - Deployment en la Nube

## 📋 Configuración Supabase

### 1. Configurar Base de Datos
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crear nuevo proyecto o usar existente
3. Ve a **SQL Editor**
4. Ejecutar el script `database/setup.sql`

### 2. Obtener Credenciales
En tu proyecto Supabase:
- **Settings** → **API**
- Copiar **Project URL** y **anon public key**

## ⚡ Deploy en Vercel

### 1. Preparación
```bash
npm install
```

### 2. Deploy
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### 3. Configurar Variables de Entorno
En Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
NODE_ENV=production
```

### 4. Configurar Dominio Personalizado
1. Vercel Dashboard → Settings → Domains
2. Agregar tu dominio personalizado
3. Configurar DNS según instrucciones de Vercel

## 🔧 Estructura del Proyecto

```
BYT_SOFTWARE/
├── src/
│   ├── js/
│   │   ├── wizard.js          # Wizard principal
│   │   └── supabase.js        # Cliente Supabase
│   ├── pages/                 # Páginas HTML
│   └── styles/                # CSS
├── database/
│   └── setup.sql              # Script de base de datos
├── server.js                  # Servidor Node.js
├── package.json               # Dependencias
└── vercel.json               # Configuración Vercel
```

## 🎯 URLs Importantes

- **Desarrollo**: http://localhost:8000
- **Producción**: https://tu-dominio.com
- **Supabase**: https://supabase.com/dashboard

## 🔐 Seguridad

- Variables de entorno en Vercel
- RLS habilitado en Supabase
- HTTPS automático con Vercel

## 📞 Soporte

Para problemas de deployment contactar al equipo de desarrollo.