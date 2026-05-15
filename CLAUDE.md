# CLAUDE.md

Guía para futuras sesiones de Claude Code en este repositorio.

## Resumen del proyecto

Dashboard SPA en React + Vite que lee datos en vivo desde un Google Sheets público (vía endpoint `gviz/tq?tqx=out:csv`) y muestra los KPIs de Recuperación & Seguimiento para 2026. El backend es un Express mínimo (`server/index.js`) que sirve el `dist/` y expone `/api/kpi-config` para que cualquier usuario logueado pueda editar metas y umbrales desde el tab **Ajustes** sin tocar código. Despliegue en Railway con `npm run build` + `npm run start`.

- ID del Sheet: harcodeado en `src/Dashboard.jsx` (`HARDCODED_SHEET_ID`). Para cambiar de hoja se edita esa constante.
- El Sheet debe estar publicado en la web (`Archivo → Compartir → Publicar en la web`).
- La pestaña de login usa hash simple (`simpleHash`) y la contraseña actual de todos los usuarios es `rs2026!`. No es seguridad real, solo gating visual.
- La configuración editable de KPIs se persiste en disco como JSON en `${DATA_DIR}/kpi-config.json` + `kpi-history.json`. En Railway, monta un Volume y setea `DATA_DIR=/data` (sin esto, los cambios se pierden en cada redeploy).

## Comandos

```bash
npm install         # instalar dependencias
npm run dev         # Vite dev server (puerto 5173). Necesita el backend corriendo aparte para /api/*
npm run dev:server  # backend Express en :3000 (Vite proxy-ea /api → aquí)
npm run build       # build de producción a dist/
npm run preview     # previsualizar dist/ con Vite preview
npm run start       # corre el backend Express, que sirve dist/ + /api/* (usado por Railway, lee $PORT)
```

En desarrollo necesitas dos procesos: `npm run dev` (frontend con HMR) y en otra terminal `npm run dev:server` (backend). En producción es un solo proceso (`npm run start`).

## Arquitectura

Tres piezas:

- `src/main.jsx` — entrypoint, monta `<Dashboard />` en `#root`.
- `src/Dashboard.jsx` — todo el dashboard (auth, fetch, parsing, UI, charts, editor de KPIs) en un solo archivo. Sección por sección, de arriba a abajo:
  1. `SHEET_NAMES`, helpers de CSV (`parseCSV`, `parseNum`, `fmt`, `fmtShort`).
  2. `normalizeMes` — normaliza nombres de mes (acentos, abreviaturas, números). **Todos los datos cargados pasan por aquí**; los filtros de mes asumen valores normalizados (`enero`...`diciembre`).
  3. `KPI_DEFAULTS` — **valores base inmutables** de los 4 KPIs con umbrales por nivel (DEFICIENTE / NO CUMPLE / CUMPLE / SOBRESALE / EXCEDE). `direction: "lower"` invierte la lógica de comparación. Los valores vivos (meta + umbrales) se cargan en runtime desde `/api/kpi-config` y se mezclan sobre estos defaults con `mergeKpiConfig`. **Si tocas estos defaults, replica el cambio en `server/index.js`** (mismo array allí para fallback cuando no hay config persistida).
  4. `evaluateKPI`, `cloneKpiDefs`, `mergeKpiConfig`, `validateKpiDraft` — helpers para el editor del tab Ajustes.
  5. `DARK_THEME` / `LIGHT_THEME` / `V` — paleta de colores. `V` es un objeto mutable; `applyTheme(mode)` sobrescribe sus propiedades con el tema activo durante el render de `DashboardMain`.
  6. `getCSS()` — CSS global que se inyecta inline (depende de `V`, por eso es función y no constante).
  7. Componentes presentacionales: `KPISemaforo`, `LoginScreen`, `Metric`, `GlassTable`, `Ring`, `Panel`, `MiniPie`, `AjustesPanel`.
  8. `Dashboard` (wrapper de auth) → `DashboardMain` (lógica real, fetch, tabs, filtros, state `kpiDefs`).
- `server/index.js` — Express mínimo. Sirve `dist/` y expone:
  - `GET /api/kpi-config` → config persistida (o defaults si nunca se guardó).
  - `POST /api/kpi-config` → valida (campos numéricos, monotonicidad de umbrales) y persiste a `${DATA_DIR}/kpi-config.json` + agrega entrada al historial.
  - `GET /api/kpi-history` → últimas 200 entradas con `at` (ISO timestamp), `by` (nombre del usuario logueado, best-effort) y `kpis` (snapshot).
  - `GET /api/kpi-defaults` → devuelve los defaults base (no usado por el frontend actual, útil para debug).
  - Solo se persisten campos editables (`target`, `excede`, valores de `thresholds`). Título, descripción, dirección, unidad y colores siempre vienen de `KPI_DEFAULTS`.
  - `Infinity` no es JSON válido → se serializa como `null` y se reconvierte al cargar.

### Tema (light/dark)

- `INITIAL_THEME` se lee de `localStorage["rs-theme"]` al cargar el módulo.
- `DashboardMain` llama a `applyTheme(themeMode)` en cada render — esto muta `V` antes de que los hijos lo lean.
- `glassCard()` es función (no constante) para que `V.glass` y `V.glassBorder` se evalúen en cada render.
- `index.html` aplica la clase `rs-light` al `<body>` antes de que React monte, para evitar FOUC.
- Los acentos (`V.cyan`, `V.coral`, etc.) cambian de tono en light mode para mantener contraste.

### Filtro de mes

- `meses` (state en `DashboardMain`) es un array de strings normalizados (`["enero", "febrero", ...]`). Vacío = todos.
- `byMes(arr)` filtra cualquier array que tenga campo `Mes` (todos los datasets lo tienen tras `normalizeMes`). Para `gastoExtrajudicial`, también acepta `MesNombre` como fallback.
- El KPI tab (`tab === "kpis"`) **ignora intencionalmente** el filtro de mes — las metas son anuales.

### Datos esperados del Sheet

Los nombres exactos de hoja están en `SHEET_NAMES`. Columnas críticas por hoja:

| Hoja                    | Columnas usadas                                                                                 |
|-------------------------|--------------------------------------------------------------------------------------------------|
| `Traspasos`             | `Tipo Traspaso`, `Cliente`, `Numero Cliente`, `Saldo Neto`, `Mes`, `DIAS DE IMPAGO`, `SALDO EN IMPAGO`, `Dias para contacto` |
| `Pagos`                 | `Cliente`, `Pago Recibido`, `Mes`                                                                |
| `PAGOS APOYO COMERCIAL` | `Cliente`, `Pago Recibido`, `Mes`                                                                |
| `Gasto Extrajudicial`   | `Cliente`, `Saldo Neto`, `Saldo en Impago`, `Despacho`, `Honorario`, `Mes Nombre`, `Pago`        |
| `Bitacora STAFF`        | `PROMEDIO` (primera fila)                                                                        |
| `Actividades STAFF`     | columna `ACTIVIDADES STAFF COBRANZA` (o primera columna)                                         |
| `Calendario Trasp. CV`  | `Resultado Promedio` (primera fila)                                                              |
| `Bitacora STAFF TAB CA` | `PROMEDIO` (primera fila)                                                                        |
| `Totales`               | `Flujo Recibido`, `Traspasos a Comercial`, `Saldo Neto a Comercial`, `Traspasos a Juridico`, `Saldo Neto a Juridico` |

`Tipo Traspaso` debe ser uno de: `COMERCIAL-RS`, `JURIDICO-RS`, `RS-COMERCIAL`, `RS-JURIDICO`.

## Convenciones

- Todo en un solo archivo `Dashboard.jsx` por simplicidad. **No** dividir en componentes separados a menos que sea claramente necesario.
- Estilos inline con el objeto `V` — no usar CSS modules ni Tailwind.
- Para agregar un color que dependa del tema: agregarlo a **ambos** `DARK_THEME` y `LIGHT_THEME`, luego referenciarlo como `V.miColor` en el JSX. Nunca harcodear `rgba(255,255,255,...)` para fondos sutiles porque rompen en light mode.
- Cuando se cambien valores que afectan el render inicial (theme inicial, etc.), también revisar `index.html` para evitar FOUC.

## Despliegue

Railway autodetecta el proyecto. Confirmar:
- Build: `npm run build`
- Start: `npm run start` (corre Express, sirve `dist/` + `/api/*`)
- Variable `PORT`: Railway la setea sola.
- **Variable `DATA_DIR`**: debe apuntar a un Railway Volume montado (ej. `/data`). Sin esto, `kpi-config.json` y `kpi-history.json` viven en el filesystem efímero del contenedor y se **borran en cada redeploy**.

### Setup del Volume (una sola vez)

1. En el proyecto de Railway, abrir el servicio → **Settings → Volumes → New Volume**.
2. Mount path: `/data` (cualquiera, debe coincidir con `DATA_DIR`).
3. En **Variables**, agregar `DATA_DIR=/data`.
4. Redeploy.

Si quieres seedear la config inicial sin tocar el dashboard, puedes hacer `railway run -- node -e "..."` o simplemente abrir el tab Ajustes, ajustar valores y guardar.
