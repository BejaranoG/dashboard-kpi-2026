import { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/* ═══════════════════════════════════════════════════════════════════
   KPI'S RECUPERACIÓN Y SEGUIMIENTO — DARK FINTECH EDITION
   ═══════════════════════════════════════════════════════════════════ */

const SHEET_NAMES = {
  traspasos: "Traspasos", pagos: "Pagos", apoyoComercial: "PAGOS APOYO COMERCIAL",
  gastoExtrajudicial: "Gasto Extrajudicial", bitacoraStaff: "Bitacora STAFF",
  actividadesStaff: "Actividades STAFF", calendarioCV: "Calendario Trasp. CV",
  bitacoraStaffCA: "Bitacora STAFF TAB CA", totales: "Totales",
};

function parseCSV(csv) {
  const lines = csv.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const vals = []; let cur = ""; let inQ = false;
    for (const c of line) { if (c === '"') inQ = !inQ; else if (c === "," && !inQ) { vals.push(cur.trim()); cur = ""; } else cur += c; }
    vals.push(cur.trim()); return vals;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => { const vals = parseRow(line); const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] || ""; }); return obj; });
}
function parseNum(v) { if (!v) return 0; return parseFloat(String(v).replace(/\$/g, "").replace(/,/g, "")) || 0; }
function fmt(n) { return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
function fmtShort(n) { if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`; if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`; return `$${fmt(n)}`; }

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const PIE_COLORS = ["#06d6a0","#ff6b6b","#4ecdc4","#ffd166","#a78bfa","#f472b6","#38bdf8","#fb923c","#34d399","#e879f9","#facc15","#67e8f9"];

const TABS = [
  { id: "ingresos", label: "Ingresos / Salidas" },
  { id: "flujo", label: "Flujo Recuperado" },
  { id: "traspasos", label: "Traspasos" },
  { id: "staff", label: "Staff" },
  { id: "bases", label: "Bases" },
  { id: "gastos", label: "Gastos" },
  { id: "apoyo", label: "Apoyo Comercial" },
  { id: "info", label: "Info" },
];

const DEFAULT = {
  traspasos: [
    { NumeroCliente:"9262",SaldoNeto:25802834.16,TipoTraspaso:"COMERCIAL-RS",Cliente:"EXPORTADORA SAN PABLO, S. DE R.L. DE C.V.",Mes:"mayo",DiasImpago:91,SaldoImpago:3387000,DiasContacto:0 },
    { NumeroCliente:"9894",SaldoNeto:731279.84,TipoTraspaso:"COMERCIAL-RS",Cliente:"HMR REHABILITACION SAS DE CV",Mes:"enero",DiasImpago:25,SaldoImpago:109225.6,DiasContacto:2 },
    { NumeroCliente:"10698",SaldoNeto:2985413.49,TipoTraspaso:"COMERCIAL-RS",Cliente:"MARICRUZ NAVARRETE",Mes:"enero",DiasImpago:146,SaldoImpago:1494072.67,DiasContacto:12 },
    { NumeroCliente:"9027",SaldoNeto:1095014.5,TipoTraspaso:"JURIDICO-RS",Cliente:"DATILERA DON ROBERTO",Mes:"febrero",DiasImpago:0,SaldoImpago:0,DiasContacto:3 },
    { NumeroCliente:"9970",SaldoNeto:526325,TipoTraspaso:"COMERCIAL-RS",Cliente:"ISRAEL ALBERTO PRINGLE LOMBERA",Mes:"febrero",DiasImpago:29,SaldoImpago:60052.25,DiasContacto:0 },
    { NumeroCliente:"10607",SaldoNeto:1398000,TipoTraspaso:"COMERCIAL-RS",Cliente:"MARIO ESCALANTE LUGO",Mes:"febrero",DiasImpago:117,SaldoImpago:169974.09,DiasContacto:0 },
    { NumeroCliente:"7796",SaldoNeto:2360434,TipoTraspaso:"COMERCIAL-RS",Cliente:"BELEN SANTILLAN SILVA",Mes:"abril",DiasImpago:108,SaldoImpago:131363.49,DiasContacto:0 },
    { NumeroCliente:"10150",SaldoNeto:3664801.75,TipoTraspaso:"COMERCIAL-RS",Cliente:"FARM ROCK SOCIEDAD DE RESPONSABILIDAD LIMITADA",Mes:"abril",DiasImpago:156,SaldoImpago:670571.37,DiasContacto:0 },
    { NumeroCliente:"10540",SaldoNeto:632000,TipoTraspaso:"JURIDICO-RS",Cliente:"PROYECTISTAS DE SERVICIOS SA DE CV",Mes:"marzo",DiasImpago:0,SaldoImpago:0,DiasContacto:0 },
    { NumeroCliente:"9860",SaldoNeto:4400000,TipoTraspaso:"COMERCIAL-RS",Cliente:"INMOBIKSA SA DE CV",Mes:"junio",DiasImpago:0,SaldoImpago:0,DiasContacto:0 },
    { NumeroCliente:"8100",SaldoNeto:5800434.88,TipoTraspaso:"COMERCIAL-RS",Cliente:"SOCIEDAD PEREZ",Mes:"septiembre",DiasImpago:0,SaldoImpago:0,DiasContacto:0 },
    { NumeroCliente:"8500",SaldoNeto:3249472.91,TipoTraspaso:"RS-COMERCIAL",Cliente:"RAMON MARQUEZ MARTINEZ",Mes:"diciembre" },
    { NumeroCliente:"7796",SaldoNeto:2294559.82,TipoTraspaso:"RS-COMERCIAL",Cliente:"BELEN SANTILLAN SILVA",Mes:"mayo" },
    { NumeroCliente:"8427",SaldoNeto:2259746.2,TipoTraspaso:"RS-COMERCIAL",Cliente:"CAVAS VALMAR S DE R.L DE C.V",Mes:"junio" },
    { NumeroCliente:"9400",SaldoNeto:2025071.81,TipoTraspaso:"RS-COMERCIAL",Cliente:"SERGIO GERARDO BALLESTEROS RESCE",Mes:"diciembre" },
    { NumeroCliente:"10607",SaldoNeto:1200000,TipoTraspaso:"RS-COMERCIAL",Cliente:"MARIO ESCALANTE LUGO",Mes:"julio" },
    { NumeroCliente:"9027",SaldoNeto:1089898.62,TipoTraspaso:"RS-COMERCIAL",Cliente:"DATILERA DON ROBERTO",Mes:"mayo" },
    { NumeroCliente:"10200",SaldoNeto:1076231.17,TipoTraspaso:"RS-COMERCIAL",Cliente:"AGRICOLA 4 COYOTES",Mes:"mayo" },
    { NumeroCliente:"10300",SaldoNeto:308000,TipoTraspaso:"RS-COMERCIAL",Cliente:"FRANCISCO JAVIER LOPEZ BRAMBILA",Mes:"julio" },
    { NumeroCliente:"10540",SaldoNeto:265000,TipoTraspaso:"RS-COMERCIAL",Cliente:"PROYECTISTAS DE SERVICIOS SA DE CV",Mes:"julio" },
    { NumeroCliente:"10900",SaldoNeto:13136000,TipoTraspaso:"RS-JURIDICO",Cliente:"JESUS ANTONIO SESMA ESCALANTE",Mes:"marzo" },
    { NumeroCliente:"9860",SaldoNeto:4917373.61,TipoTraspaso:"RS-JURIDICO",Cliente:"INMOBIKSA SA DE CV",Mes:"octubre" },
    { NumeroCliente:"10698",SaldoNeto:4618660.22,TipoTraspaso:"RS-JURIDICO",Cliente:"MARICRUZ NAVARRETE",Mes:"junio" },
    { NumeroCliente:"10150",SaldoNeto:3794558.14,TipoTraspaso:"RS-JURIDICO",Cliente:"FARM ROCK SOCIEDAD DE RESPONSABILIDAD LIMITADA",Mes:"junio" },
    { NumeroCliente:"10500",SaldoNeto:948936.04,TipoTraspaso:"RS-JURIDICO",Cliente:"MANUEL SIBRIAN MEZA",Mes:"septiembre" },
  ],
  pagos: [
    { Cliente:"ECOHOGARES",PagoRecibido:6176592.33,Mes:"octubre" },{ Cliente:"Casfam S.A. de C.V.",PagoRecibido:5000000,Mes:"octubre" },
    { Cliente:"EXPORTADORA SAN PABLO",PagoRecibido:4287012.74,Mes:"agosto" },{ Cliente:"ALTO PRODUCTOS",PagoRecibido:3767115.33,Mes:"septiembre" },
    { Cliente:"VISION DESARROLLOS INMOBILIARIOS",PagoRecibido:3367382.48,Mes:"marzo" },{ Cliente:"Jeronimo Bertran Passani",PagoRecibido:3052665.08,Mes:"enero" },
    { Cliente:"JORGE HUMBERTO JONES GARAY",PagoRecibido:1854865.27,Mes:"mayo" },{ Cliente:"RAMON MARQUEZ MARTINEZ",PagoRecibido:1134942.88,Mes:"febrero" },
    { Cliente:"S.C.P. PESQUERA CALIFORNIA",PagoRecibido:1091566.06,Mes:"diciembre" },{ Cliente:"SEA URCHIN PACIFIC",PagoRecibido:947677.78,Mes:"julio" },
    { Cliente:"BAJA RED",PagoRecibido:932592.8,Mes:"enero" },{ Cliente:"SM Invernaderos",PagoRecibido:764964.11,Mes:"marzo" },
    { Cliente:"Mountain Side Ranch",PagoRecibido:703780,Mes:"mayo" },{ Cliente:"Roberto Carlos Rios Lizardi",PagoRecibido:530076.35,Mes:"febrero" },
    { Cliente:"Interblinds",PagoRecibido:497032.71,Mes:"enero" },{ Cliente:"SERGIO GERARDO BALLESTEROS",PagoRecibido:466596.13,Mes:"diciembre" },
    { Cliente:"AGROPRODUCTOS Y SERVICIOS",PagoRecibido:450000,Mes:"marzo" },
  ],
  apoyoComercial: [
    { Cliente:"OFICEMART",PagoRecibido:61665581.28,Mes:"octubre" },{ Cliente:"PROCESADORA UOVO",PagoRecibido:10179646.64,Mes:"diciembre" },
    { Cliente:"Credibroker",PagoRecibido:5221180.8,Mes:"noviembre" },{ Cliente:"FERNANDO BELTRAN RENDON",PagoRecibido:5000000,Mes:"septiembre" },
    { Cliente:"INDUSTRIAS Y TARIMAS",PagoRecibido:4367575.38,Mes:"octubre" },{ Cliente:"FRANCISCO RUBEN ESQUER",PagoRecibido:2000000,Mes:"octubre" },
    { Cliente:"FERNANDO BELTRAN RENDON",PagoRecibido:1241100,Mes:"enero" },{ Cliente:"MGS",PagoRecibido:1236450.78,Mes:"diciembre" },
    { Cliente:"EMBALAJES DAMAR",PagoRecibido:873824.04,Mes:"noviembre" },{ Cliente:"ADMINISTRADORA DE INMUEBLES",PagoRecibido:651057.4,Mes:"septiembre" },
    { Cliente:"ADEPRO",PagoRecibido:645078.05,Mes:"noviembre" },{ Cliente:"ANALITICA FREMEX",PagoRecibido:444190.82,Mes:"octubre" },
  ],
  gastoExtrajudicial: [
    { Cliente:"VISION DESARROLLOS INMOBILIARIOS",SaldoImpago:1155892.04,SaldoNeto:5361269,Despacho:"CARLOS MENDOZA",Honorario:37451,MesNombre:"Febrero",Pago:"Cliente" },
    { Cliente:"RAMON MARQUEZ MARTINEZ",SaldoImpago:280313.76,SaldoNeto:3402538,Despacho:"MIGUEL DUARTE",Honorario:15877.98,MesNombre:"Marzo",Pago:"Cliente" },
    { Cliente:"OPERADORA DE BARES Y CANTINAS BAJA RED",SaldoImpago:232868.87,SaldoNeto:2360493,Despacho:"CARLOS MENDOZA",Honorario:12575,MesNombre:"Mayo",Pago:"Cliente" },
    { Cliente:"SOCIEDAD PEREZ SPR DE RI",SaldoImpago:2580042.96,SaldoNeto:5790231.93,Despacho:"SERGIO A. CORRALES",Honorario:4499.99,MesNombre:"Agosto",Pago:"PK" },
  ],
  actividades: [
    "SOLICITUD DE GASTOS DE NOTARIAS","SOLICITUD DE BUROS","ELABORACION DE CARTAS DE RETENCION",
    "SOLICITUD DE CARTAS STP","CONTROL DE EXCEPCIONES","SOLICTUD DE LISTAS NEGRAS",
    "SOLICITUD DE RUG","SOLICITUD DE RRPC","CAPTURAR DISPOSICIONES",
    "SOLICITUD DE LIBERACION DE GARANTIA","SOLICITUD DE PAGOS A PROVEEDORES",
    "ELABORACION DE SOLICITUD DE CREDITO","ELABORACION DE PAGARES",
    "ELABORACION DE REPORTES DE VISITA","ELABORACION DE SOLICITUD DE ALTAS DE SIOFF",
    "SOLICITUD DE ACTUALIZACIONES DE CLG","PASAR OPERACIONES","ELABORACION DE CHECKLIST",
    "ELABORACION DE CARATULAS, HTYC, TABLA DE AMORTIZACION","ELABORACION DE CICS",
    "ELABORACION DE CARTAS PAGO","SOLICUTUD DE RELACIONES PATRIMONIALES",
    "SOLICITUD DE PAGOS ESPECIALES O LINEALES","REGISTRO DE PAGOS REPORTADOS","REGISTRO DE TRASPASOS",
  ],
  promedioStaff: 0.08, promedioCalendario: 0.0, promedioStaffCA: -0.33,
  totales: { flujoRecibido:37976757.97,traspComercial:9,saldoComercial:13767980.53,traspJuridico:5,saldoJuridico:27415528.01 },
};

const V = {
  bg: "#0a0e17", surface: "rgba(255,255,255,0.03)", glass: "rgba(255,255,255,0.05)",
  glassBorder: "rgba(255,255,255,0.08)", text: "#e2e8f0", textMuted: "#64748b", textDim: "#475569",
  cyan: "#06d6a0", coral: "#ff6b6b", amber: "#ffd166", purple: "#a78bfa", blue: "#38bdf8",
  mono: "'JetBrains Mono', 'Fira Code', monospace", sans: "'Outfit', sans-serif",
};
const glassCard = { background: V.glass, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1px solid ${V.glassBorder}`, borderRadius: 16 };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 18px rgba(6,214,160,0.12)}50%{box-shadow:0 0 30px rgba(6,214,160,0.22)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fade-card{animation:fadeUp 0.45s ease both}
`;

// ─── AUTH SYSTEM ────────────────────────────────────────────────────
const USERS = {
  "gerardo.bejarano": { name: "Gerardo Bejarano", hash: "8f3d4a" },
  "ramon.perez": { name: "Ramon Perez", hash: "8f3d4a" },
  "scarlett.oregel": { name: "Scarlett Oregel", hash: "8f3d4a" },
};
// Simple hash for password check (not meant for banking-level security)
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(16).slice(0, 6);
}
const PASS_HASH = simpleHash("rs2026!");

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  function handleLogin(e) {
    if (e) e.preventDefault();
    const u = user.trim().toLowerCase();
    const account = USERS[u];
    if (!account) {
      setError("Usuario no encontrado");
      setShake(true); setTimeout(() => setShake(false), 500);
      return;
    }
    if (simpleHash(pass) !== PASS_HASH) {
      setError("Contraseña incorrecta");
      setShake(true); setTimeout(() => setShake(false), 500);
      return;
    }
    onLogin({ username: u, name: account.name });
  }

  return (
    <div style={{ fontFamily: V.sans, background: V.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{CSS}{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.1); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.05); } }
        @keyframes shakeX { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes typeIn { from { width: 0; } to { width: 100%; } }
        .shake { animation: shakeX 0.4s ease; }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,214,160,0.08) 0%, transparent 70%)", filter: "blur(80px)", animation: "float1 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "10%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", filter: "blur(80px)", animation: "float2 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "60%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)", filter: "blur(60px)", animation: "float1 12s ease-in-out infinite reverse" }} />
      </div>

      {/* Grid pattern overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.03, backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

      {/* Login card */}
      <div className={`fade-card ${shake ? "shake" : ""}`} style={{
        ...glassCard, width: 400, padding: "0", position: "relative", zIndex: 1,
        boxShadow: "0 8px 60px rgba(0,0,0,0.4), 0 0 40px rgba(6,214,160,0.06)",
      }}>
        {/* Top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${V.cyan}, ${V.blue}, ${V.purple})` }} />

        <div style={{ padding: "36px 32px 32px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${V.cyan}, ${V.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: V.bg, boxShadow: `0 0 30px ${V.cyan}33`, marginBottom: 16 }}>K</div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: V.text, letterSpacing: -0.3, margin: "0 0 4px" }}>KPI's Recuperación & Seguimiento</h1>
            <p style={{ fontSize: 11, fontFamily: V.mono, color: V.textDim, letterSpacing: 1.5, margin: 0 }}>ACCESO AL DASHBOARD</p>
          </div>

          {/* Form */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontFamily: V.mono, color: V.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Usuario</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.4 }}>👤</span>
                <input type="text" value={user} onChange={e => { setUser(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="nombre.apellido"
                  style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10, border: `1px solid ${error && !user ? V.coral + "88" : V.glassBorder}`, background: "rgba(255,255,255,0.04)", color: V.text, fontSize: 13, fontFamily: V.mono, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = V.cyan}
                  onBlur={e => e.target.style.borderColor = V.glassBorder}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 10, fontFamily: V.mono, color: V.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.4 }}>🔒</span>
                <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••"
                  style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10, border: `1px solid ${error && pass ? V.coral + "88" : V.glassBorder}`, background: "rgba(255,255,255,0.04)", color: V.text, fontSize: 13, fontFamily: V.mono, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = V.cyan}
                  onBlur={e => e.target.style.borderColor = V.glassBorder}
                />
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(255,107,107,0.08)", border: `1px solid rgba(255,107,107,0.2)`, fontSize: 12, fontFamily: V.mono, color: V.coral, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>⚠</span> {error}
              </div>
            )}

            <button onClick={handleLogin} style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${V.cyan}, ${V.blue})`,
              color: V.bg, fontSize: 13, fontFamily: V.mono, fontWeight: 700,
              letterSpacing: 1.5, cursor: "pointer", transition: "all 0.2s",
              boxShadow: `0 4px 20px ${V.cyan}33`,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 28px ${V.cyan}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 20px ${V.cyan}33`; }}
            >INICIAR SESIÓN</button>
          </div>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, fontFamily: V.mono, color: V.textDim, letterSpacing: 0.5 }}>
            Acceso restringido • Solo personal autorizado
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent = V.cyan, delay = 0, sub }) {
  return (
    <div className="fade-card" style={{ ...glassCard, padding: "18px 22px", position: "relative", overflow: "hidden", animationDelay: `${delay}ms` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div style={{ fontSize: 10, fontFamily: V.mono, color: V.textMuted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 26, fontFamily: V.mono, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: V.textDim, marginTop: 5, fontFamily: V.mono }}>{sub}</div>}
    </div>
  );
}

function GlassTable({ columns, data, accent = V.cyan }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const perPage = 8;
  useEffect(() => setPage(0), [data]);
  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [data, sortCol, sortDir]);
  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);
  return (
    <div style={{ ...glassCard, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => { setSortCol(col.key); setSortDir(sortCol === col.key && sortDir === "desc" ? "asc" : "desc"); }}
                style={{ padding: "11px 14px", textAlign: col.align || "left", fontSize: 10, fontFamily: V.mono, fontWeight: 700, color: accent, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${V.glassBorder}`, whiteSpace: "nowrap", background: "rgba(255,255,255,0.02)" }}>
                {col.label}{sortCol === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: 28, textAlign: "center", color: V.textDim, fontFamily: V.mono, fontSize: 12 }}>— sin datos —</td></tr>
            ) : paged.map((row, i) => (
              <tr key={i} style={{ transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12, fontFamily: col.mono ? V.mono : V.sans, fontWeight: col.mono ? 500 : 400, color: col.mono ? V.text : V.textMuted, textAlign: col.align || "left", whiteSpace: col.nowrap ? "nowrap" : "normal", maxWidth: col.maxW || "none", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px", borderTop: `1px solid ${V.glassBorder}` }}>
          <span style={{ fontSize: 11, fontFamily: V.mono, color: V.textDim }}>{page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} / {sorted.length}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[["‹",-1],["›",1]].map(([s,d]) => <button key={s} onClick={() => setPage(p => Math.max(0,Math.min(totalPages-1,p+d)))} style={{ padding:"3px 9px",background:"rgba(255,255,255,0.06)",border:`1px solid ${V.glassBorder}`,borderRadius:6,color:V.textMuted,cursor:"pointer",fontSize:13,fontFamily:V.mono }}>{s}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ value, min, max, label, color = V.cyan, size = 140 }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = size * 0.38, stroke = size * 0.06, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, dashLen = circ * 0.75, filled = dashLen * pct;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} strokeDasharray={`${dashLen} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.8s ease", filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fontFamily={V.mono} fontWeight="700" fill={color}>{typeof value === "number" ? value.toFixed(1) : value}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={8} fontFamily={V.mono} fontWeight="500" fill={V.textDim} letterSpacing="1">{label}</text>
      </svg>
    </div>
  );
}

function Panel({ title, accent = V.cyan, children, delay = 0 }) {
  return (
    <div className="fade-card" style={{ ...glassCard, overflow: "hidden", animationDelay: `${delay}ms` }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${V.glassBorder}`, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}88` }} />
        <h3 style={{ fontSize: 12, fontFamily: V.mono, fontWeight: 700, color: V.text, letterSpacing: 0.8, textTransform: "uppercase" }}>{title}</h3>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function MiniPie({ data, valueKey = "PagoRecibido" }) {
  const byMonth = {}; data.forEach(d => { const m = d.Mes || "otros"; byMonth[m] = (byMonth[m] || 0) + (d[valueKey] || 0); });
  const pieData = Object.entries(byMonth).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value);
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={48} dataKey="value" paddingAngle={3} strokeWidth={0}>
            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#1a1f2e", border: `1px solid ${V.glassBorder}`, borderRadius: 10, fontFamily: V.mono, fontSize: 11, color: V.text }} formatter={v => fmtShort(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 6 }}>
        {pieData.map((d, i) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: V.mono, color: V.textDim }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [authUser, setAuthUser] = useState(null);

  function handleLogin(user) {
    setAuthUser(user);
  }

  function handleLogout() {
    setAuthUser(null);
  }

  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  return <DashboardMain user={authUser} onLogout={handleLogout} />;
}

function DashboardMain({ user, onLogout }) {
  const [tab, setTab] = useState("ingresos");
  const [meses, setMeses] = useState([]);  // empty = todos
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mesDropdown, setMesDropdown] = useState(false);

  const HARDCODED_SHEET_ID = "10rg3pmSvTFg5_4czZyzih03r_TCtqBmdNWWG_peuM84";

  const byMes = useCallback(arr => meses.length === 0 ? arr : arr.filter(d => d.Mes && meses.includes(String(d.Mes).toLowerCase())), [meses]);
  const byTipo = useCallback(tipo => data.traspasos.filter(d => d.TipoTraspaso === tipo), [data]);
  const sum = (arr, k) => arr.reduce((s, d) => s + (d[k] || 0), 0);

  const ingCom = useMemo(() => byMes(byTipo("COMERCIAL-RS")), [byMes, byTipo]);
  const ingJur = useMemo(() => byMes(byTipo("JURIDICO-RS")), [byMes, byTipo]);
  const salCom = useMemo(() => byMes(byTipo("RS-COMERCIAL")), [byMes, byTipo]);
  const salJur = useMemo(() => byMes(byTipo("RS-JURIDICO")), [byMes, byTipo]);
  const pagos = useMemo(() => byMes(data.pagos), [byMes, data.pagos]);
  const apoyo = useMemo(() => byMes(data.apoyoComercial), [byMes, data.apoyoComercial]);

  // ─── Data loading with hardcoded Sheet ID ───
  async function fetchSheet(name) {
    const url = `https://docs.google.com/spreadsheets/d/${HARDCODED_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok || text.trimStart().startsWith("<!") || text.trimStart().startsWith("<html")) return null;
      return parseCSV(text);
    } catch { return null; }
  }

  async function loadData() {
    setLoading(true);
    try {
      const nd = { ...DEFAULT };
      const tr = await fetchSheet(SHEET_NAMES.traspasos);
      if (tr) nd.traspasos = tr.filter(r => r["Tipo Traspaso"] && r["Cliente"]).map(r => ({ NumeroCliente: r["Numero Cliente"]||"", SaldoNeto: parseNum(r["Saldo Neto"]), TipoTraspaso: r["Tipo Traspaso"].trim(), Cliente: r["Cliente"].trim(), Mes: (r["Mes"]||"").toLowerCase().trim(), DiasImpago: parseNum(r["DIAS DE IMPAGO"]), SaldoImpago: parseNum(r["SALDO EN IMPAGO"]), DiasContacto: parseNum(r["Dias para contacto"]) }));
      const pg = await fetchSheet(SHEET_NAMES.pagos);
      if (pg) nd.pagos = pg.filter(r => r["Cliente"]&&r["Pago Recibido"]).map(r => ({ Cliente: r["Cliente"].trim(), PagoRecibido: parseNum(r["Pago Recibido"]), Mes: (r["Mes"]||"").toLowerCase().trim() }));
      const ap = await fetchSheet(SHEET_NAMES.apoyoComercial);
      if (ap) nd.apoyoComercial = ap.filter(r => r["Cliente"]&&r["Pago Recibido"]).map(r => ({ Cliente: r["Cliente"].trim(), PagoRecibido: parseNum(r["Pago Recibido"]), Mes: (r["Mes"]||"").toLowerCase().trim() }));
      const ge = await fetchSheet(SHEET_NAMES.gastoExtrajudicial);
      if (ge) nd.gastoExtrajudicial = ge.filter(r => r["Cliente"]).map(r => ({ Cliente: r["Cliente"].trim(), SaldoImpago: parseNum(r["Saldo en Impago"]), SaldoNeto: parseNum(r["Saldo Neto"]), Despacho: (r["Despacho"]||"").trim(), Honorario: parseNum(r["Honorario"]), MesNombre: (r["Mes Nombre"]||"").trim(), Pago: (r["Pago"]||"").trim() }));
      const bs = await fetchSheet(SHEET_NAMES.bitacoraStaff); if (bs?.[0]?.["PROMEDIO"]) nd.promedioStaff = parseNum(bs[0]["PROMEDIO"]);
      const ac = await fetchSheet(SHEET_NAMES.actividadesStaff); if (ac) { const a = ac.map(r => (r["ACTIVIDADES STAFF COBRANZA"]||Object.values(r)[0]||"").trim()).filter(x => x && x !== "ACTIVIDADES STAFF COBRANZA"); if (a.length) nd.actividades = a; }
      const ca = await fetchSheet(SHEET_NAMES.calendarioCV); if (ca?.[0]?.["Resultado Promedio"]) nd.promedioCalendario = parseNum(ca[0]["Resultado Promedio"]);
      const cb = await fetchSheet(SHEET_NAMES.bitacoraStaffCA); if (cb?.[0]?.["PROMEDIO"]) nd.promedioStaffCA = parseNum(cb[0]["PROMEDIO"]);
      const to = await fetchSheet(SHEET_NAMES.totales); if (to?.[0]) nd.totales = { flujoRecibido: parseNum(to[0]["Flujo Recibido"]), traspComercial: parseNum(to[0]["Traspasos a Comercial"]), saldoComercial: parseNum(to[0]["Saldo Neto a Comercial"]), traspJuridico: parseNum(to[0]["Traspasos a Juridico"]), saldoJuridico: parseNum(to[0]["Saldo Neto a Juridico"]) };
      setData(nd); setConnected(true);
      setLastUpdate(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Auto-load data on mount
  useEffect(() => { loadData(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!mesDropdown) return;
    const handler = () => setMesDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [mesDropdown]);

  const traspCols = [
    { key: "Mes", label: "Mes", nowrap: true },
    { key: "Cliente", label: "Cliente", maxW: 250 },
    { key: "SaldoNeto", label: "Saldo Neto", align: "right", nowrap: true, mono: true, render: v => `$${fmt(v)}` },
  ];
  const pagoCols = [
    { key: "Cliente", label: "Cliente", maxW: 260 },
    { key: "PagoRecibido", label: "Pago Recibido", align: "right", nowrap: true, mono: true, render: v => `$${fmt(v)}` },
  ];

  return (
    <div style={{ fontFamily: V.sans, background: V.bg, color: V.text, minHeight: "100vh", position: "relative" }}>
      <style>{CSS}</style>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,214,160,0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.05) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <header style={{ padding: "18px 28px", borderBottom: `1px solid ${V.glassBorder}`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(10,14,23,0.85)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${V.cyan}, ${V.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: V.bg, boxShadow: `0 0 18px ${V.cyan}44` }}>K</div>
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>KPI's Recuperación & Seguimiento</h1>
                <span style={{ fontSize: 10, fontFamily: V.mono, color: V.textDim, letterSpacing: 1 }}>DASHBOARD {new Date().getFullYear()}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, marginRight: 6 }}>
                {[["NM","#dc2626"],["NC","#f59e0b"],["C","#6b7280"],["S","#3b82f6"],["E","#22c55e"]].map(([l,c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontFamily: V.mono, color: V.textDim }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: `0 0 5px ${c}66` }} />{l}
                  </div>
                ))}
              </div>
              {/* Multi-month filter */}
              <div style={{ position: "relative" }}>
                <button onClick={(e) => { e.stopPropagation(); setMesDropdown(!mesDropdown); }} style={{
                  padding: "6px 26px 6px 10px", borderRadius: 8, border: `1px solid ${V.glassBorder}`,
                  background: V.glass, color: V.text, fontSize: 11, fontFamily: V.mono, fontWeight: 600,
                  cursor: "pointer", appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center",
                }}>
                  {meses.length === 0 ? "Todos los meses" : meses.length === 1 ? meses[0].charAt(0).toUpperCase() + meses[0].slice(1) : `${meses.length} meses`}
                </button>
                {mesDropdown && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 50,
                    ...glassCard, background: "rgba(15,20,30,0.95)", backdropFilter: "blur(20px)",
                    padding: 6, minWidth: 180, maxHeight: 320, overflowY: "auto",
                  }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setMeses([]); setMesDropdown(false); }} style={{
                      width: "100%", padding: "7px 10px", background: meses.length === 0 ? `${V.cyan}22` : "transparent",
                      border: "none", borderRadius: 6, color: meses.length === 0 ? V.cyan : V.textMuted,
                      fontSize: 11, fontFamily: V.mono, fontWeight: 600, cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${meses.length === 0 ? V.cyan : V.textDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: V.cyan, flexShrink: 0 }}>
                        {meses.length === 0 ? "✓" : ""}
                      </span>
                      Todos
                    </button>
                    {MESES.map(m => {
                      const active = meses.includes(m);
                      return (
                        <button key={m} onClick={() => {
                          setMeses(prev => active ? prev.filter(x => x !== m) : [...prev, m]);
                        }} style={{
                          width: "100%", padding: "7px 10px", background: active ? `${V.cyan}15` : "transparent",
                          border: "none", borderRadius: 6, color: active ? V.cyan : V.textMuted,
                          fontSize: 11, fontFamily: V.mono, fontWeight: active ? 600 : 400, cursor: "pointer", textAlign: "left",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${active ? V.cyan : V.textDim}`, background: active ? `${V.cyan}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: V.cyan, flexShrink: 0 }}>
                            {active ? "✓" : ""}
                          </span>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                      );
                    })}
                    {meses.length > 0 && (
                      <button onClick={() => { setMeses([]); setMesDropdown(false); }} style={{
                        width: "100%", padding: "6px 10px", marginTop: 4, background: "rgba(255,107,107,0.08)",
                        border: `1px solid rgba(255,107,107,0.15)`, borderRadius: 6, color: V.coral,
                        fontSize: 10, fontFamily: V.mono, fontWeight: 600, cursor: "pointer", textAlign: "center",
                      }}>Limpiar filtro</button>
                    )}
                  </div>
                )}
              </div>
              {/* Refresh button */}
              <button onClick={loadData} disabled={loading} title={lastUpdate ? `Última actualización: ${lastUpdate}` : "Cargar datos"} style={{
                padding: "5px 10px", borderRadius: 8, border: `1px solid ${V.glassBorder}`,
                background: loading ? "rgba(255,255,255,0.02)" : V.glass,
                color: loading ? V.textDim : V.cyan, fontSize: 12, fontFamily: V.mono, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(6,214,160,0.1)"; }}
                onMouseLeave={e => e.currentTarget.style.background = loading ? "rgba(255,255,255,0.02)" : V.glass}
              >
                <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none", fontSize: 13 }}>↻</span>
                {loading ? "" : ""}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 16, background: connected ? "rgba(6,214,160,0.1)" : "rgba(255,209,102,0.1)", border: `1px solid ${connected ? V.cyan : V.amber}33` }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? V.cyan : V.amber, boxShadow: `0 0 5px ${connected ? V.cyan : V.amber}` }} />
                <span style={{ fontSize: 9, fontFamily: V.mono, color: connected ? V.cyan : V.amber, fontWeight: 600 }}>{connected ? "LIVE" : "DEMO"}</span>
              </div>
              {/* User badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px 5px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: `1px solid ${V.glassBorder}` }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg, ${V.purple}, ${V.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                  {user.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span style={{ fontSize: 10, fontFamily: V.mono, color: V.textMuted, fontWeight: 600 }}>{user.name}</span>
                <button onClick={onLogout} title="Cerrar sesión" style={{
                  background: "rgba(255,107,107,0.1)", border: `1px solid rgba(255,107,107,0.2)`,
                  borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 10, color: V.coral, transition: "all 0.2s", padding: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,107,107,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,107,107,0.1)"; }}
                >✕</button>
              </div>
            </div>
          </div>
        </header>

        {/* NAV */}
        <nav style={{ padding: "0 28px", borderBottom: `1px solid ${V.glassBorder}`, background: "rgba(10,14,23,0.5)", backdropFilter: "blur(10px)", position: "sticky", top: 60, zIndex: 9 }}>
          <div style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "11px 16px", background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${V.cyan}` : "2px solid transparent", color: tab === t.id ? V.cyan : V.textDim, cursor: "pointer", fontSize: 11, fontFamily: V.mono, fontWeight: tab === t.id ? 700 : 500, letterSpacing: 0.5, whiteSpace: "nowrap", transition: "all 0.2s" }}>{t.label}</button>
            ))}
          </div>
        </nav>

        {/* CONTENT */}
        <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }} key={tab + meses.join(",")}>

          {tab === "ingresos" && (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
              <Metric label="Ing. Comercial" value={fmtShort(sum(ingCom,"SaldoNeto"))} accent={V.cyan} delay={0} sub={`${ingCom.length} clientes`} />
              <Metric label="Ing. Jurídico" value={fmtShort(sum(ingJur,"SaldoNeto"))} accent={V.coral} delay={70} sub={`${ingJur.length} clientes`} />
              <Metric label="Sal. Comercial" value={fmtShort(sum(salCom,"SaldoNeto"))} accent={V.blue} delay={140} sub={`${salCom.length} clientes`} />
              <Metric label="Sal. Jurídico" value={fmtShort(sum(salJur,"SaldoNeto"))} accent={V.purple} delay={210} sub={`${salJur.length} clientes`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <Panel title="Ingresos — Comercial" accent={V.cyan} delay={80}><GlassTable columns={traspCols} data={ingCom} accent={V.cyan} /></Panel>
              <Panel title="Ingresos — Jurídico" accent={V.coral} delay={150}><GlassTable columns={traspCols} data={ingJur} accent={V.coral} /></Panel>
              <Panel title="Salidas → Comercial" accent={V.blue} delay={220}><GlassTable columns={traspCols} data={salCom} accent={V.blue} /></Panel>
              <Panel title="Salidas → Jurídico" accent={V.purple} delay={290}><GlassTable columns={traspCols} data={salJur} accent={V.purple} /></Panel>
            </div>
          </>)}

          {tab === "flujo" && (() => {
            const agg = {}; pagos.forEach(p => { agg[p.Cliente] = (agg[p.Cliente] || 0) + p.PagoRecibido; });
            const arr = Object.entries(agg).map(([Cliente, PagoRecibido]) => ({ Cliente, PagoRecibido })).sort((a, b) => b.PagoRecibido - a.PagoRecibido);
            const total = sum(pagos, "PagoRecibido");
            return (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
                <Metric label="Flujo 2025" value={fmtShort(total)} accent={V.cyan} sub={`${arr.length} clientes`} />
                <Metric label="Flujo 2024" value="$29.93M" accent={V.amber} delay={70} sub="Año anterior (referencia)" />
                <Metric label="Variación vs 2024" value={`${total > 29930000 ? "+" : ""}${((total/29930000-1)*100).toFixed(1)}%`} accent={total>29930000?V.cyan:V.coral} delay={140} sub="Crecimiento interanual" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
                <Panel title="Detalle de Pagos" accent={V.cyan} delay={80}><GlassTable columns={pagoCols} data={arr} accent={V.cyan} /></Panel>
                <Panel title="Distribución Mensual" accent={V.cyan} delay={160}><MiniPie data={pagos} /></Panel>
              </div>
            </>);
          })()}

          {tab === "traspasos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <Panel title="Traspasos a Comercial" accent={V.blue}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "14px 0" }}>
                  <Ring value={data.totales.traspComercial} min={10} max={18} label="RECORD COUNT" color={V.blue} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontFamily: V.mono, color: V.textDim, letterSpacing: 2, marginBottom: 5 }}>SALDO NETO</div>
                    <div style={{ fontSize: 22, fontFamily: V.mono, fontWeight: 700, color: V.blue }}>{fmtShort(data.totales.saldoComercial)}</div>
                  </div>
                </div>
              </Panel>
              <Panel title="Traspasos a Jurídico" accent={V.coral} delay={80}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "14px 0" }}>
                  <Ring value={data.totales.traspJuridico} min={2} max={7} label="CLIENTES" color={V.coral} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontFamily: V.mono, color: V.textDim, letterSpacing: 2, marginBottom: 5 }}>SALDO NETO</div>
                    <div style={{ fontSize: 22, fontFamily: V.mono, fontWeight: 700, color: V.coral }}>{fmtShort(data.totales.saldoJuridico)}</div>
                  </div>
                </div>
              </Panel>
              <div style={{ gridColumn: "1 / -1" }}>
                <Panel title="Tiempo Promedio de Contacto" accent={V.amber} delay={160}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36, padding: "10px 0" }}>
                    <Ring value={1.47} min={0} max={5} label="DÍAS" color={V.amber} size={150} />
                    <div><div style={{ fontSize: 9, fontFamily: V.mono, color: V.textDim, letterSpacing: 2, marginBottom: 4 }}>BITÁCORA TRASPASO-CONTACTO</div><div style={{ fontSize: 13, color: V.textMuted, lineHeight: 1.6, maxWidth: 320 }}>Promedio de días entre traspaso y primer contacto con el cliente.</div></div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {tab === "staff" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <Panel title="Tiempo Promedio — Tareas Staff" accent={V.amber}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0" }}>
                  <Ring value={data.promedioStaff} min={0} max={5} label="PROMEDIO DÍAS" color={V.amber} size={160} />
                </div>
              </Panel>
              <Panel title="Actividades Staff Cobranza" accent={V.amber} delay={80}>
                <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 3 }}>
                  {data.actividades.map((a, i) => (
                    <div key={i} style={{ padding: "8px 10px", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.03)", color: V.textMuted, display: "flex", alignItems: "center", gap: 9, transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontFamily: V.mono, fontSize: 9, color: V.amber, fontWeight: 700, minWidth: 18 }}>{String(i+1).padStart(2,"0")}</span>{a}
                    </div>
                  ))}
                </div>
                <div style={{ padding: "7px 10px", borderTop: `1px solid ${V.glassBorder}`, fontSize: 10, fontFamily: V.mono, color: V.textDim }}>{data.actividades.length} actividades</div>
              </Panel>
            </div>
          )}

          {tab === "bases" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <Panel title="Bitácora Staff — Tab CA" accent={V.purple}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0" }}>
                  <Ring value={data.promedioStaffCA} min={-2} max={5} label="PROMEDIO" color={V.purple} size={160} />
                </div>
              </Panel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Panel title="Calendario Trasp. CV" accent={V.purple} delay={80}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
                    <Ring value={data.promedioCalendario} min={0} max={5} label="RESULTADO" color="#94a3b8" size={120} />
                  </div>
                </Panel>
                <Panel title="Bases de Datos R&S" accent="#94a3b8" delay={160}>
                  {["Reporte de Cartera Activa","Base de IMOR","Base de Traspaso a CV","Cuadro de Saldos"].map((b,i) => (
                    <div key={i} style={{ padding: "7px 10px", marginBottom: 3, borderRadius: 7, background: "rgba(255,255,255,0.03)", fontSize: 11, fontFamily: V.mono, color: V.textMuted, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: V.purple }}>›</span>{b}
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.12)", fontSize: 11, color: V.amber, lineHeight: 1.5 }}>Cada mes se incorporan al calendario los clientes en riesgo de traspaso a cartera vencida.</div>
                </Panel>
              </div>
            </div>
          )}

          {tab === "gastos" && (<>
            <Metric label="Total Honorarios" value={fmtShort(sum(data.gastoExtrajudicial,"Honorario"))} accent={V.cyan} sub={`${data.gastoExtrajudicial.length} registros`} />
            <div style={{ marginTop: 18 }}>
              <Panel title="Gastos por Cobranza Extrajudicial" accent={V.cyan} delay={80}>
                <GlassTable columns={[
                  { key: "Cliente", label: "Cliente", maxW: 200 },
                  { key: "SaldoNeto", label: "Saldo Neto", align: "right", nowrap: true, mono: true, render: v => `$${fmt(v)}` },
                  { key: "SaldoImpago", label: "Saldo Impago", align: "right", nowrap: true, mono: true, render: v => `$${fmt(v)}` },
                  { key: "Despacho", label: "Despacho" },
                  { key: "Honorario", label: "Honorario", align: "right", nowrap: true, mono: true, render: v => `$${fmt(v)}` },
                  { key: "Pago", label: "Pago", nowrap: true },
                ]} data={data.gastoExtrajudicial} accent={V.cyan} />
              </Panel>
            </div>
          </>)}

          {tab === "apoyo" && (() => {
            const agg = {}; apoyo.forEach(p => { agg[p.Cliente] = (agg[p.Cliente] || 0) + p.PagoRecibido; });
            const arr = Object.entries(agg).map(([Cliente, PagoRecibido]) => ({ Cliente, PagoRecibido })).sort((a, b) => b.PagoRecibido - a.PagoRecibido);
            return (<>
              <Metric label="Apoyo Comercial" value={fmtShort(sum(apoyo,"PagoRecibido"))} accent={V.cyan} sub={`${arr.length} clientes`} />
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, marginTop: 18 }}>
                <Panel title="Flujo Recuperado" accent={V.cyan} delay={80}><GlassTable columns={pagoCols} data={arr} accent={V.cyan} /></Panel>
                <Panel title="Distribución Mensual" accent={V.cyan} delay={160}><MiniPie data={apoyo} /></Panel>
              </div>
            </>);
          })()}

          {tab === "info" && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <Panel title="Estado de Conexión" accent={V.cyan}>
                <div style={{ padding: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: 14, borderRadius: 10, background: connected ? "rgba(6,214,160,0.06)" : "rgba(255,209,102,0.06)", border: `1px solid ${connected ? "rgba(6,214,160,0.15)" : "rgba(255,209,102,0.15)"}` }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: connected ? V.cyan : V.amber, boxShadow: `0 0 8px ${connected ? V.cyan : V.amber}66` }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: connected ? V.cyan : V.amber }}>{connected ? "Conectado a Google Sheets" : "Usando datos de demostración"}</div>
                      {lastUpdate && <div style={{ fontSize: 10, fontFamily: V.mono, color: V.textDim, marginTop: 2 }}>Última actualización: {lastUpdate}</div>}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontFamily: V.mono, color: V.textDim, marginBottom: 6, letterSpacing: 1 }}>FUENTE DE DATOS:</div>
                    <div style={{ fontSize: 12, fontFamily: V.mono, color: V.textMuted, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${V.glassBorder}`, wordBreak: "break-all" }}>
                      ID: {HARDCODED_SHEET_ID}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontFamily: V.mono, color: V.textDim, marginBottom: 6, letterSpacing: 1 }}>HOJAS VINCULADAS:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {Object.values(SHEET_NAMES).map(n => <span key={n} style={{ fontSize: 10, fontFamily: V.mono, padding: "4px 8px", borderRadius: 5, background: connected ? "rgba(6,214,160,0.08)" : "rgba(255,255,255,0.04)", color: connected ? V.cyan : V.textDim, border: `1px solid ${connected ? "rgba(6,214,160,0.15)" : V.glassBorder}` }}>{n}</span>)}
                    </div>
                  </div>
                  <button onClick={loadData} disabled={loading} style={{
                    width: "100%", padding: "11px", borderRadius: 9, border: "none",
                    background: loading ? V.textDim : `linear-gradient(135deg, ${V.cyan}, ${V.blue})`,
                    color: V.bg, fontSize: 12, fontFamily: V.mono, fontWeight: 700, letterSpacing: 1,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : `0 4px 18px ${V.cyan}33`,
                  }}>
                    {loading ? "ACTUALIZANDO..." : "↻  ACTUALIZAR DATOS"}
                  </button>
                  <div style={{ marginTop: 16, fontSize: 11, fontFamily: V.mono, color: V.textDim, lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, color: V.textMuted, marginBottom: 4 }}>Notas:</div>
                    Los datos se cargan automáticamente al iniciar sesión. Usa el botón de actualizar (↻) en el header o aquí cuando hagas cambios en el Google Sheets.
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
