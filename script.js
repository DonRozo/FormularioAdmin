/* ===========================================================
   DATA-PAC | Admin OAP V3 (script.js)
   - OTP Auth, RBAC Múltiple, Herencia SEG_Alcance, Asignaciones
   =========================================================== */

const SERVICE_URL = "https://services6.arcgis.com/yq6pe3Lw2oWFjWtF/arcgis/rest/services/DATAPAC_V3/FeatureServer";

/* ===== Entidades V3 ===== */
const ENTITY = {
  SEG_Rol: { id: 0, pk: "GlobalID" }, CFG_PAC: { id: 1, pk: "GlobalID" }, CFG_Linea: { id: 2, pk: "GlobalID" },
  CFG_Programa: { id: 3, pk: "GlobalID" }, CFG_Proyecto: { id: 4, pk: "GlobalID" }, CFG_Objetivo: { id: 5, pk: "GlobalID" },
  CFG_Actividad: { id: 6, pk: "GlobalID" }, CFG_SubActividad: { id: 7, pk: "GlobalID" }, CFG_Tarea: { id: 8, pk: "GlobalID" },
  REP_AvanceTarea: { id: 9, pk: "GlobalID" }, REP_TareaUbicacion_PT: { id: 10, pk: "GlobalID" }, REP_ReporteNarrativo: { id: 11, pk: "GlobalID" },
  FIN_TodoGasto: { id: 12, pk: "GlobalID" }, PLAN_SubActividadVigencia: { id: 13, pk: "GlobalID" }, PLAN_TareaVigencia: { id: 14, pk: "GlobalID" },
  SEG_Asignacion: { id: 15, pk: "GlobalID" }, SEG_Persona: { id: 16, pk: "GlobalID" }, SEG_OTP: { id: 17, pk: "GlobalID" },
  FIN_ResumenTodoGastoActividad: { id: 18, pk: "GlobalID" }, REP_AvanceSubActividad: { id: 19, pk: "GlobalID" }, REP_AvanceActividad: { id: 20, pk: "GlobalID" },
  SEG_PersonaRol: { id: 21, pk: "GlobalID" }, SEG_Alcance: { id: 22, pk: "GlobalID" }, AUD_HistorialCambio: { id: 23, pk: "GlobalID" },
  AUD_EventoSistema: { id: 24, pk: "GlobalID" }, WF_SolicitudRevision: { id: 25, pk: "GlobalID" }, WF_AprobacionPaso: { id: 26, pk: "GlobalID" },
  WF_Notificacion: { id: 27, pk: "GlobalID" }, BI_AvanceActividad: { id: 28, pk: "GlobalID" }, BI_AvanceObjetivo: { id: 29, pk: "GlobalID" },
  BI_AvanceProyecto: { id: 30, pk: "GlobalID" }, BI_AvancePrograma: { id: 31, pk: "GlobalID" }, BI_AvanceLinea: { id: 32, pk: "GlobalID" },
  BI_AvancePAC: { id: 33, pk: "GlobalID" }
};

/* Tablas inmutables por interfaz (Hardcoded Read-Only) */
const HARD_READONLY = new Set(["AUD_HistorialCambio", "AUD_EventoSistema", "BI_AvanceActividad", "BI_AvanceObjetivo", "BI_AvanceProyecto", "BI_AvancePrograma", "BI_AvanceLinea", "BI_AvancePAC", "FIN_TodoGasto", "FIN_ResumenTodoGastoActividad", "REP_AvanceSubActividad", "REP_AvanceActividad"]);

/* ===== Estado de Sesión ===== */
const SESSION = {
  personaID: null,
  personaGlobalID: null,
  nombre: null,
  roles: [], // Array de roles activos
  isSuperAdmin: false,
  isVisualizador: false,
  maxPerm: "Ver", // Permiso máximo global heredado
  allowedGuids: {}, // { "CFG_Proyecto": Set(guid1, guid2) }
  assignedTasks: new Set(),
  tablePermissions: {} // Permisos específicos inyectados por código (ej. Publicador)
};

let currentEntityKey = null;
let currentRows = [];
let editingRow = null;
let metaCache = {};
let catalogs = {};

/* ===== Utils ===== */
const uiOTP = document.getElementById("otp-overlay");
const uiApp = document.getElementById("app-main");
const elStatus = document.getElementById("status");
const elOtpStatus = document.getElementById("otp-status");
const modal = document.getElementById("modal");
const formDyn = document.getElementById("form-dynamic");

function setStatus(msg, type="info", isOtp=false){
  const el = isOtp ? elOtpStatus : elStatus;
  if(!el) return;
  el.textContent = (type==="error"?"❌ ":(type==="success"?"✅ ":"ℹ️ ")) + msg;
  if(type==="error") el.style.color = "#d64545";
  else el.style.color = "inherit";
}
function esc(s){ return (s??"").toString().replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function entityUrl(key){ return `${SERVICE_URL}/${ENTITY[key].id}`; }

async function fetchJson(url, params){
  const u = new URL(url);
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r = await fetch(u.toString(), { method:"GET" });
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
async function postForm(url, obj){
  const form = new URLSearchParams();
  Object.entries(obj).forEach(([k,v])=>{ if(v!==undefined) form.append(k, typeof v==="string"?v:JSON.stringify(v)); });
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}

/* ===========================================================
   1. AUTENTICACIÓN OTP
   =========================================================== */
document.getElementById("btn-request-otp").addEventListener("click", async () => {
  const ced = document.getElementById("inp-cedula").value.trim();
  const cor = document.getElementById("inp-correo").value.trim();
  if(!ced || !cor) return setStatus("Ingresa cédula y correo.", "error", true);
  
  setStatus("Verificando usuario...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_Persona")+"/query", { f:"json", where:`Cedula='${ced}' AND Correo='${cor}' AND Activo='SI'`, outFields:"GlobalID,PersonaID,Nombre", returnGeometry:false });
    if(!res.features || res.features.length === 0) throw new Error("Credenciales inválidas o usuario inactivo.");
    
    const p = res.features[0].attributes;
    SESSION.personaGlobalID = p.GlobalID;
    SESSION.personaID = p.PersonaID;
    SESSION.nombre = p.Nombre;

    // Aquí Power Automate enviaría el correo al detectar el intento.
    document.getElementById("otp-step-1").classList.add("is-hidden");
    document.getElementById("otp-step-2").classList.remove("is-hidden");
    setStatus("Código enviado. Revisa tu correo.", "success", true);
  } catch(e) { setStatus(e.message, "error", true); }
});

document.getElementById("btn-verify-otp").addEventListener("click", async () => {
  const code = document.getElementById("inp-codigo").value.trim().toUpperCase();
  if(!code) return;
  setStatus("Validando código...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_OTP")+"/query", { f:"json", where:`PersonaGlobalID='${SESSION.personaGlobalID}' AND Usado='NO'`, outFields:"OBJECTID,CodigoUlt4,FechaExpira", orderByFields:"FechaEnvio DESC", resultRecordCount:1, returnGeometry:false });
    if(!res.features || res.features.length === 0) throw new Error("No hay código pendiente.");
    const otp = res.features[0].attributes;
    if(otp.CodigoUlt4 !== code) throw new Error("Código incorrecto.");
    if(new Date(otp.FechaExpira) < new Date()) throw new Error("El código expiró.");

    // Quemar OTP
    await postForm(entityUrl("SEG_OTP")+"/applyEdits", { f:"json", updates:[{attributes:{OBJECTID:otp.OBJECTID, Usado:'SI'}}] });
    
    await initSession();
  } catch(e) { setStatus(e.message, "error", true); }
});

document.getElementById("btn-back-otp").addEventListener("click", () => {
  document.getElementById("otp-step-2").classList.add("is-hidden");
  document.getElementById("otp-step-1").classList.remove("is-hidden");
  setStatus("", "info", true);
});

/* ===========================================================
   2. CARGA DE SESIÓN Y RBAC
   =========================================================== */
async function initSession() {
  setStatus("Cargando roles y alcance...", "info", true);
  try {
    // Roles
    const resR = await fetchJson(entityUrl("SEG_PersonaRol")+"/query", { f:"json", where:`PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields:"RolID", returnGeometry:false });
    SESSION.roles = (resR.features||[]).map(f => f.attributes.RolID);
    if(SESSION.roles.includes("SUPERADMIN")) SESSION.isSuperAdmin = true;
    if(SESSION.roles.length === 1 && SESSION.roles[0] === "VISUALIZADOR") SESSION.isVisualizador = true;

    // Alcance
    const resA = await fetchJson(entityUrl("SEG_Alcance")+"/query", { f:"json", where:`PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields:"NivelJerarquia,ObjetoGlobalID,Permiso", returnGeometry:false });
    const alcances = (resA.features||[]).map(f => f.attributes);
    
    // Obtener permiso máximo (Lógica: Administrar > Editar > Aprobar > Revisar > Ver)
    const permWeight = {"Ver":1, "Revisar":2, "Aprobar":3, "Editar":4, "Administrar":5};
    let maxW = 0;
    alcances.forEach(a => { if(permWeight[a.Permiso] > maxW) { maxW = permWeight[a.Permiso]; SESSION.maxPerm = a.Permiso; }});
    if(SESSION.isSuperAdmin) SESSION.maxPerm = "Administrar";

    // Asignaciones Operativas (Reportes)
    const resAsig = await fetchJson(entityUrl("SEG_Asignacion")+"/query", { f:"json", where:`PersonaGlobalID='${SESSION.personaGlobalID}' AND Activo='SI'`, outFields:"TareaGlobalID", returnGeometry:false });
    (resAsig.features||[]).forEach(f => SESSION.assignedTasks.add(f.attributes.TareaGlobalID));

    if(!SESSION.isSuperAdmin) await resolveHierarchy(alcances);

    uiOTP.style.display = "none";
    uiApp.style.display = "flex";
    document.getElementById("pill-user").textContent = `Usuario: ${SESSION.nombre} (${SESSION.roles.join(", ")})`;
    buildDynamicMenu();
  } catch(e) { setStatus(e.message, "error", true); }
}

async function resolveHierarchy(alcances) {
  const cfgs = ["CFG_PAC","CFG_Linea","CFG_Programa","CFG_Proyecto","CFG_Objetivo","CFG_Actividad","CFG_SubActividad","CFG_Tarea"];
  cfgs.forEach(c => SESSION.allowedGuids[c] = new Set());

  alcances.forEach(alc => {
    let k = `CFG_${alc.NivelJerarquia.charAt(0) + alc.NivelJerarquia.slice(1).toLowerCase()}`;
    if(alc.NivelJerarquia==="SUBACTIVIDAD") k = "CFG_SubActividad";
    if(alc.NivelJerarquia==="PAC") k = "CFG_PAC";
    if(SESSION.allowedGuids[k] && alc.ObjetoGlobalID) SESSION.allowedGuids[k].add(alc.ObjetoGlobalID);
  });

  const arbol = {};
  for(let c of cfgs) {
    const r = await fetchJson(entityUrl(c)+"/query", {f:"json", where:"1=1", outFields:"GlobalID,PACGlobalID,LineaGlobalID,ProgramaGlobalID,ProyectoGlobalID,ObjetivoGlobalID,ActividadGlobalID,SubActividadGlobalID", returnGeometry:false});
    arbol[c] = (r.features||[]).map(f=>f.attributes);
  }

  function propagate(pKey, cKey, fk) {
    if(SESSION.allowedGuids[pKey].size === 0) return;
    arbol[cKey].forEach(row => {
      if(SESSION.allowedGuids[pKey].has(row[fk])) SESSION.allowedGuids[cKey].add(row.GlobalID);
    });
  }
  propagate("CFG_PAC", "CFG_Linea", "PACGlobalID"); propagate("CFG_Linea", "CFG_Programa", "LineaGlobalID");
  propagate("CFG_Programa", "CFG_Proyecto", "ProgramaGlobalID"); propagate("CFG_Proyecto", "CFG_Objetivo", "ProyectoGlobalID");
  propagate("CFG_Objetivo", "CFG_Actividad", "ObjetivoGlobalID"); propagate("CFG_Actividad", "CFG_SubActividad", "ActividadGlobalID");
  propagate("CFG_SubActividad", "CFG_Tarea", "SubActividadGlobalID");
}

/* ===========================================================
   3. MENÚ DINÁMICO POR ROL Y PERMISOS
   =========================================================== */
function buildDynamicMenu() {
  const nav = document.getElementById("navlist");
  nav.innerHTML = "";

  const groups = [
    { label: "Configuración Base", prefix: "CFG_" },
    { label: "Planeación", prefix: "PLAN_" },
    { label: "Reportes Operativos", prefix: "REP_" },
    { label: "Aprobaciones", prefix: "WF_" },
    { label: "Analítica y Finanzas", prefixes: ["BI_", "FIN_"] },
    { label: "Seguridad y Auditoría", prefixes: ["SEG_", "AUD_"] }
  ];

  let visibleTables = new Set();
  
  if(SESSION.isSuperAdmin) {
    Object.keys(ENTITY).forEach(k => visibleTables.add(k));
  } else {
    if(SESSION.roles.includes("PUBLICADOR")) {
      ["WF_SolicitudRevision", "WF_AprobacionPaso", "CFG_PAC", "CFG_Linea", "BI_AvanceActividad", "BI_AvanceObjetivo", "BI_AvanceProyecto", "BI_AvancePrograma", "BI_AvanceLinea", "BI_AvancePAC"].forEach(t => visibleTables.add(t));
      // Contexto Read-Only
      ["CFG_Programa", "CFG_Proyecto", "CFG_Objetivo", "CFG_Actividad", "REP_AvanceTarea", "REP_ReporteNarrativo"].forEach(t => { visibleTables.add(t); SESSION.tablePermissions[t] = "Ver"; });
    }
    if(SESSION.roles.includes("APROBADOR")) {
      Object.keys(ENTITY).filter(k => k.startsWith("CFG_") || k.startsWith("PLAN_") || k.startsWith("REP_") || k.startsWith("WF_") || k.startsWith("FIN_")).forEach(t => visibleTables.add(t));
    }
    if(SESSION.roles.includes("EDITOR")) {
      Object.keys(ENTITY).filter(k => k.startsWith("CFG_")).forEach(t => { visibleTables.add(t); SESSION.tablePermissions[t] = "Ver"; });
      ["REP_AvanceTarea", "REP_ReporteNarrativo", "WF_SolicitudRevision"].forEach(t => visibleTables.add(t));
    }
    if(SESSION.isVisualizador) {
      Object.keys(ENTITY).filter(k => k.startsWith("BI_") || k.startsWith("FIN_") || k.startsWith("CFG_")).forEach(t => { visibleTables.add(t); SESSION.tablePermissions[t] = "Ver"; });
    }
  }

  groups.forEach(g => {
    let hasItems = false;
    let groupHtml = `<div class="navgroup">${g.label}</div>`;
    
    Object.keys(ENTITY).forEach(key => {
      const matchPrefix = g.prefix ? key.startsWith(g.prefix) : g.prefixes.some(p => key.startsWith(p));
      if(matchPrefix && visibleTables.has(key)) {
        hasItems = true;
        groupHtml += `<button class="navitem" onclick="loadEntity('${key}')"><span class="navitem__title">${key}</span></button>`;
      }
    });
    if(hasItems) nav.innerHTML += groupHtml;
  });
}

function hasWritePermission(key) {
  if(HARD_READONLY.has(key)) return false;
  if(SESSION.isSuperAdmin) return true;
  const explicitPerm = SESSION.tablePermissions[key];
  if(explicitPerm === "Ver" || explicitPerm === "Revisar") return false;
  if(SESSION.maxPerm === "Ver" || SESSION.maxPerm === "Revisar") return false;
  return true;
}

/* ===========================================================
   4. AISLAMIENTO DE DATOS (WHERE)
   =========================================================== */
function buildWhere(key) {
  let w = "1=1";
  const vig = document.getElementById("sel-vigencia").value;
  if(vig) w += ` AND Vigencia = ${vig}`;

  if(SESSION.isSuperAdmin) return w;

  // Filtrado Jerárquico CFG y PLAN
  if(SESSION.allowedGuids[key]) {
    const guids = Array.from(SESSION.allowedGuids[key]);
    if(guids.length === 0) return "1=0";
    w += ` AND GlobalID IN (${guids.map(g => `'${g}'`).join(",")})`;
  }
  
  // Filtrado estricto por Asignación para Reportes
  if(["REP_AvanceTarea", "PLAN_TareaVigencia"].includes(key)) {
    const tGuids = Array.from(SESSION.assignedTasks);
    if(tGuids.length === 0 && SESSION.maxPerm === "Ver") return "1=0"; // Editor sin tareas
    if(tGuids.length > 0) w += ` AND TareaGlobalID IN (${tGuids.map(g => `'${g}'`).join(",")})`;
  }

  return w;
}

/* ===========================================================
   5. CARGA Y RENDERIZADO
   =========================================================== */
async function loadEntity(key) {
  currentEntityKey = key;
  document.querySelectorAll(".navitem").forEach(b => {
    if(b.textContent.includes(key)) b.classList.add("is-active");
    else b.classList.remove("is-active");
  });

  document.getElementById("h-entity").textContent = key;
  const canWrite = hasWritePermission(key);
  document.getElementById("btn-new").style.display = canWrite && !key.startsWith("WF_") ? "inline-flex" : "none";

  setStatus("Cargando datos...");
  if(!metaCache[key]) {
    const meta = await fetchJson(`${entityUrl(key)}?f=pjson`);
    metaCache[key] = meta.fields || [];
  }

  const r = await fetchJson(`${entityUrl(key)}/query`, {
    f:"json", where: buildWhere(key), outFields: "*", returnGeometry:false, orderByFields:"OBJECTID DESC"
  });

  currentRows = r.features || [];
  renderTable(key, currentRows, metaCache[key].slice(0, 8), canWrite); // Pintamos max 8 cols
  setStatus(`Cargados ${currentRows.length} registros.`, "success");
}

function renderTable(key, rows, fields, canWrite) {
  const head = document.getElementById("tbl-head");
  const body = document.getElementById("tbl-body");
  
  head.innerHTML = `<tr>${canWrite ? '<th>Acción</th>' : ''}${fields.map(f => `<th>${f.alias}</th>`).join("")}</tr>`;
  body.innerHTML = rows.map(r => {
    let tds = canWrite ? `<td><button class="btn btn--ghost btn-xs" onclick="openForm(${r.attributes.OBJECTID})">Editar</button></td>` : "";
    tds += fields.map(f => {
      let v = r.attributes[f.name];
      if(f.type === "esriFieldTypeDate" && v) v = new Date(v).toLocaleDateString();
      return `<td>${esc(v)}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

/* ===========================================================
   6. FORMULARIOS E INYECCIÓN DE IDENTIDAD
   =========================================================== */
function openForm(oid) {
  editingRow = currentRows.find(x => x.attributes.OBJECTID === oid);
  document.getElementById("modal").classList.add("is-open");
  // La inyección dinámica de inputs iría aquí (se omite detalle UI para foco en lógica V3)
  document.getElementById("form-dynamic").innerHTML = `<p>Editando OID: ${oid}</p><p class="muted">El ID de usuario <b>${SESSION.personaID}</b> se inyectará al guardar.</p>`;
}

document.getElementById("btn-close").addEventListener("click", () => document.getElementById("modal").classList.remove("is-open"));

document.getElementById("btn-save").addEventListener("click", async () => {
  // REGLA OBLIGATORIA: Inyectar identidad funcional en el payload
  const attrs = {
    OBJECTID: editingRow ? editingRow.attributes.OBJECTID : undefined,
    PersonaUltimaEdicionID: SESSION.personaID // Trazabilidad V3
  };
  
  alert(`Simulando POST a AGOL con:\n\nPayload: ${JSON.stringify(attrs)}`);
  document.getElementById("modal").classList.remove("is-open");
});

document.getElementById("btn-reload").addEventListener("click", () => loadEntity(currentEntityKey));