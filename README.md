# KPI's Recuperación y Seguimiento — Dashboard

Dashboard interactivo para monitoreo de KPIs de recuperación y seguimiento, conectado a Google Sheets.

## Despliegue en Railway

### 1. Sube a GitHub

```bash
git init
git add .
git commit -m "Initial commit - KPI Dashboard"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/kpi-dashboard.git
git push -u origin main
```

### 2. Despliega en Railway

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Clic en **"New Project"**
3. Selecciona **"Deploy from GitHub Repo"**
4. Elige el repositorio `kpi-dashboard`
5. Railway detectará automáticamente que es un proyecto Node.js
6. Configuración automática:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
7. Clic en **"Deploy"**
8. Una vez desplegado, ve a **Settings → Networking → Generate Domain** para obtener tu URL pública

### 3. Conecta tu Google Sheets

1. Abre tu Google Sheets
2. Ve a **Archivo → Compartir → Publicar en la web**
3. Selecciona **"Documento completo"** → **"Página web"** → **"Publicar"**
4. Copia el ID del spreadsheet de la URL (la parte entre `/d/` y `/edit`)
5. En el dashboard, ve a la pestaña **Config** y pega el ID

### Hojas requeridas en Google Sheets

| Nombre de hoja         | Contenido                    |
|------------------------|------------------------------|
| Traspasos              | Todos los traspasos          |
| Pagos                  | Flujo recuperado             |
| PAGOS APOYO COMERCIAL  | Pagos de apoyo comercial     |
| Gasto Extrajudicial    | Gastos de cobranza           |
| Bitacora STAFF         | Bitácora de tareas staff     |
| Actividades STAFF      | Lista de actividades         |
| Calendario Trasp. CV   | Calendario de traspasos      |
| Bitacora STAFF TAB CA  | Bitácora staff cartera       |
| Totales                | Resumen de totales           |

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)
