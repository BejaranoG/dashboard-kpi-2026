# CLAUDE.md

Guía para futuras sesiones de Claude Code en este repositorio.

## Resumen del proyecto

Dashboard SPA en React + Vite que lee datos en vivo desde un Google Sheets público (vía endpoint `gviz/tq?tqx=out:csv`) y muestra los KPIs de Recuperación & Seguimiento para 2026. Despliegue en Railway con `npm run build` + `npm run start` (serve estático sobre el directorio `dist/`).

- ID del Sheet: harcodeado en `src/Dashboard.jsx` (`HARDCODED_SHEET_ID`). Para cambiar de hoja se edita esa constante.
- El Sheet debe estar publicado en la web (`Archivo → Compartir → Publicar en la web`).
- La pestaña de login usa hash simple (`simpleHash`) y la contraseña actual de todos los usuarios es `rs2026!`. No es seguridad real, solo gating visual.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (Vite, puerto 5173 por default)
npm run build      # build de producción a dist/
npm run preview    # previsualizar dist/ localmente
npm run start      # serve dist/ (usado por Railway, lee $PORT)
```

## Arquitectura

Solo hay dos archivos JS de aplicación:

- `src/main.jsx` — entrypoint, monta `<Dashboard />` en `#root`.
- `src/Dashboard.jsx` — todo el dashboard (auth, fetch, parsing, UI, charts) en un solo archivo. Sección por sección, de arriba a abajo:
  1. `SHEET_NAMES`, helpers de CSV (`parseCSV`, `parseNum`, `fmt`, `fmtShort`).
  2. `normalizeMes` — normaliza nombres de mes (acentos, abreviaturas, números). **Todos los datos cargados pasan por aquí**; los filtros de mes asumen valores normalizados (`enero`...`diciembre`).
  3. `KPI_DEFS` — definición de los 4 KPIs con umbrales por nivel (DEFICIENTE / NO CUMPLE / CUMPLE / SOBRESALE / EXCEDE). `direction: "lower"` invierte la lógica de comparación.
  4. `DARK_THEME` / `LIGHT_THEME` / `V` — paleta de colores. `V` es un objeto mutable; `applyTheme(mode)` sobrescribe sus propiedades con el tema activo durante el render de `DashboardMain`.
  5. `getCSS()` — CSS global que se inyecta inline (depende de `V`, por eso es función y no constante).
  6. Componentes presentacionales: `KPISemaforo`, `LoginScreen`, `Metric`, `GlassTable`, `Ring`, `Panel`, `MiniPie`.
  7. `Dashboard` (wrapper de auth) → `DashboardMain` (lógica real, fetch, tabs, filtros).

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
- Start: `npm run start`
- Variable opcional: `PORT` (Railway la setea sola).
