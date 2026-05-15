import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(ROOT, "data");
const CONFIG_PATH = path.join(DATA_DIR, "kpi-config.json");
const HISTORY_PATH = path.join(DATA_DIR, "kpi-history.json");
const HISTORY_MAX = 200;

// ─── KPI defaults (must mirror the immutable base in src/Dashboard.jsx) ───
const KPI_DEFAULTS = [
  {
    id: "flujo", title: "Flujo Recuperado", unit: "MDP",
    description: "Meta anual de recuperación de flujo. Ref. 2025: $38.25M",
    direction: "higher", target: 43, excede: 47.3,
    thresholds: [
      { level: "DEFICIENTE", max: 35, color: "#dc2626" },
      { level: "NO CUMPLE", max: 38.25, color: "#f59e0b" },
      { level: "CUMPLE", max: 43, color: "#6b7280" },
      { level: "SOBRESALE", max: 45.15, color: "#3b82f6" },
      { level: "EXCEDE", max: Infinity, color: "#22c55e" },
    ],
  },
  {
    id: "traspJuridico", title: "Traspasos a Jurídico", unit: "clientes",
    description: "Enviar menos clientes a jurídico (menor es mejor)",
    direction: "lower", target: 10,
    thresholds: [
      { level: "DEFICIENTE", min: 12, color: "#dc2626" },
      { level: "NO CUMPLE", min: 11, color: "#f59e0b" },
      { level: "CUMPLE", min: 10, color: "#6b7280" },
      { level: "SOBRESALE", min: 9, color: "#3b82f6" },
      { level: "EXCEDE", min: 0, color: "#22c55e" },
    ],
  },
  {
    id: "traspComercial", title: "Traspasos a Comercial", unit: "clientes",
    description: "Enviar más clientes a comercial (mayor es mejor)",
    direction: "higher", target: 9,
    thresholds: [
      { level: "DEFICIENTE", max: 7, color: "#dc2626" },
      { level: "NO CUMPLE", max: 8, color: "#f59e0b" },
      { level: "CUMPLE", max: 9, color: "#6b7280" },
      { level: "SOBRESALE", max: 10, color: "#3b82f6" },
      { level: "EXCEDE", max: Infinity, color: "#22c55e" },
    ],
  },
  {
    id: "apoyoComercial", title: "Apoyo a Comercial", unit: "MDP",
    description: "Flujo recuperado en apoyo a comercial",
    direction: "higher", target: 127, excede: 150,
    thresholds: [
      { level: "DEFICIENTE", max: 102, color: "#dc2626" },
      { level: "NO CUMPLE", max: 115, color: "#f59e0b" },
      { level: "CUMPLE", max: 127, color: "#6b7280" },
      { level: "SOBRESALE", max: 150, color: "#3b82f6" },
      { level: "EXCEDE", max: Infinity, color: "#22c55e" },
    ],
  },
];

const DEFAULT_BY_ID = Object.fromEntries(KPI_DEFAULTS.map(k => [k.id, k]));

// ─── Serialization (Infinity is not valid JSON, serialize as null) ───
function serializeKpis(kpis) {
  return kpis.map(k => ({
    ...k,
    thresholds: k.thresholds.map(t => ({
      ...t,
      ...(t.max === Infinity ? { max: null } : {}),
    })),
  }));
}
function deserializeKpis(kpis) {
  return kpis.map(k => ({
    ...k,
    thresholds: k.thresholds.map(t => ({
      ...t,
      ...(t.max === null ? { max: Infinity } : {}),
    })),
  }));
}

// ─── Validation: keep editable fields only, enforce monotonicity ───
function validateAndMerge(incoming) {
  if (!incoming || !Array.isArray(incoming.kpis)) {
    return { error: "Payload inválido: falta `kpis` (array)." };
  }
  const out = [];
  for (const def of KPI_DEFAULTS) {
    const patch = incoming.kpis.find(k => k && k.id === def.id);
    if (!patch) { out.push(def); continue; }

    const target = Number(patch.target);
    if (!Number.isFinite(target)) return { error: `KPI ${def.id}: target inválido.` };

    let excede;
    if (def.excede !== undefined) {
      excede = Number(patch.excede);
      if (!Number.isFinite(excede)) return { error: `KPI ${def.id}: excede inválido.` };
    }

    if (!Array.isArray(patch.thresholds) || patch.thresholds.length !== def.thresholds.length) {
      return { error: `KPI ${def.id}: debe tener ${def.thresholds.length} umbrales.` };
    }

    const thresholds = def.thresholds.map((baseT, i) => {
      const p = patch.thresholds[i];
      const merged = { ...baseT };
      if (def.direction === "higher") {
        if (i < def.thresholds.length - 1) {
          const v = Number(p?.max);
          if (!Number.isFinite(v)) throw new Error(`KPI ${def.id} umbral ${baseT.level}: max inválido.`);
          merged.max = v;
        } else {
          merged.max = Infinity;
        }
      } else {
        const v = Number(p?.min);
        if (!Number.isFinite(v)) throw new Error(`KPI ${def.id} umbral ${baseT.level}: min inválido.`);
        merged.min = v;
      }
      return merged;
    });

    // Monotonicity check
    if (def.direction === "higher") {
      for (let i = 1; i < thresholds.length - 1; i++) {
        if (thresholds[i].max <= thresholds[i - 1].max) {
          return { error: `KPI ${def.id}: los umbrales (mayor es mejor) deben ser crecientes.` };
        }
      }
    } else {
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i].min >= thresholds[i - 1].min) {
          return { error: `KPI ${def.id}: los umbrales (menor es mejor) deben ser decrecientes.` };
        }
      }
    }

    const merged = { ...def, target, thresholds };
    if (excede !== undefined) merged.excede = excede;
    out.push(merged);
  }
  return { kpis: out };
}

// ─── File I/O helpers ───
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
async function readJSON(p, fallback) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
async function writeJSONAtomic(p, data) {
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, p);
}

async function loadConfig() {
  const stored = await readJSON(CONFIG_PATH, null);
  if (!stored) return { kpis: KPI_DEFAULTS, updatedAt: null, updatedBy: null };
  return {
    kpis: deserializeKpis(stored.kpis || []),
    updatedAt: stored.updatedAt || null,
    updatedBy: stored.updatedBy || null,
  };
}
async function loadHistory() {
  const h = await readJSON(HISTORY_PATH, []);
  return Array.isArray(h) ? h : [];
}

// ─── App ───
const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/api/kpi-config", async (_req, res) => {
  try {
    const { kpis, updatedAt, updatedBy } = await loadConfig();
    res.json({ kpis: serializeKpis(kpis), updatedAt, updatedBy });
  } catch (e) {
    console.error("GET /api/kpi-config failed:", e);
    res.status(500).json({ error: "No se pudo leer la configuración." });
  }
});

app.get("/api/kpi-defaults", (_req, res) => {
  res.json({ kpis: serializeKpis(KPI_DEFAULTS) });
});

app.post("/api/kpi-config", async (req, res) => {
  try {
    let result;
    try {
      result = validateAndMerge(req.body);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (result.error) return res.status(400).json({ error: result.error });

    const updatedAt = new Date().toISOString();
    const updatedBy = String(req.body?.updatedBy || "").slice(0, 80) || null;
    const payload = {
      kpis: serializeKpis(result.kpis),
      updatedAt,
      updatedBy,
    };

    await ensureDataDir();
    await writeJSONAtomic(CONFIG_PATH, payload);

    // Append history entry
    const history = await loadHistory();
    history.push({ at: updatedAt, by: updatedBy, kpis: payload.kpis });
    while (history.length > HISTORY_MAX) history.shift();
    await writeJSONAtomic(HISTORY_PATH, history);

    res.json(payload);
  } catch (e) {
    console.error("POST /api/kpi-config failed:", e);
    res.status(500).json({ error: "No se pudo guardar la configuración." });
  }
});

app.get("/api/kpi-history", async (_req, res) => {
  try {
    const history = await loadHistory();
    res.json({ history });
  } catch (e) {
    console.error("GET /api/kpi-history failed:", e);
    res.status(500).json({ error: "No se pudo leer el historial." });
  }
});

// Static dist/ (production)
const DIST = path.resolve(ROOT, "dist");
app.use(express.static(DIST));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"), (err) => {
    if (err) res.status(404).end();
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`KPI dashboard server listening on :${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
});
