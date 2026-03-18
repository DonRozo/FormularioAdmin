/* ===========================================================
   DATA-PAC | Admin OAP V3 (script.js)
   - OTP Auth, RBAC, Auditoría, Personas Genéricas, Duplicar
   - MEJORA FINAL: RolID Amigable y Banner Rojo para Duplicados
   =========================================================== */

const SERVICE_URL = "https://services6.arcgis.com/yq6pe3Lw2oWFjWtF/arcgis/rest/services/DATAPAC_V3/FeatureServer";
const URL_WEBHOOK_POWERAUTOMATE = "https://default64f30d63182749d899511db17d0949.e4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1123b3fd4a854b40b2b22dd45b03ca7c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Qz68D2G5RAq9cmMvOew1roy8bD3YQPtju4KPW2vEtvc";

const ENTITY = {
  SEG_Rol: { id: 0 }, CFG_PAC: { id: 1 }, CFG_Linea: { id: 2 }, CFG_Programa: { id: 3 }, CFG_Proyecto: { id: 4 }, CFG_Objetivo: { id: 5 },
  CFG_Actividad: { id: 6 }, CFG_SubActividad: { id: 7 }, CFG_Tarea: { id: 8 }, REP_AvanceTarea: { id: 9 }, REP_TareaUbicacion_PT: { id: 10 }, REP_ReporteNarrativo: { id: 11 },
  FIN_TodoGasto: { id: 12 }, PLAN_SubActividadVigencia: { id: 13 }, PLAN_TareaVigencia: { id: 14 }, SEG_Asignacion: { id: 15 }, SEG_Persona: { id: 16 }, SEG_OTP: { id: 17 },
  FIN_ResumenTodoGastoActividad: { id: 18 }, REP_AvanceSubActividad: { id: 19 }, REP_AvanceActividad: { id: 20 }, SEG_PersonaRol: { id: 21 }, SEG_Alcance: { id: 22 }, AUD_HistorialCambio: { id: 23 },
  AUD_EventoSistema: { id: 24 }, WF_SolicitudRevision: { id: 25 }, WF_AprobacionPaso: { id: 26 }, WF_Notificacion: { id: 27 }, BI_AvanceActividad: { id: 28 }, BI_AvanceObjetivo: { id: 29 },
  BI_AvanceProyecto: { id: 30 }, BI_AvancePrograma: { id: 31 }, BI_AvanceLinea: { id: 32 }, BI_AvancePAC: { id: 33 }
};

const HARD_READONLY = new Set(["AUD_HistorialCambio", "AUD_EventoSistema", "BI_AvanceActividad", "BI_AvanceObjetivo", "BI_AvanceProyecto", "BI_AvancePrograma", "BI_AvanceLinea", "BI_AvancePAC", "FIN_TodoGasto", "FIN_ResumenTodoGastoActividad", "REP_AvanceSubActividad", "REP_AvanceActividad", "SEG_OTP"]);

const PARENT_RULES = {
  CFG_Linea: { fk: "PACGlobalID", parent: "CFG_PAC", weight: "Peso", parentText: "PACID" },
  CFG_Programa: { fk: "LineaGlobalID", parent: "CFG_Linea", weight: "Peso", parentText: "LineaID" },
  CFG_Proyecto: { fk: "ProgramaGlobalID", parent: "CFG_Programa", weight: "Peso", parentText: "ProgramaID" },
  CFG_Objetivo: { fk: "ProyectoGlobalID", parent: "CFG_Proyecto", weight: "Peso", parentText: "ProyectoID" },
  CFG_Actividad: { fk: "ObjetivoGlobalID", parent: "CFG_Objetivo", weight: "Peso", parentText: "ObjetivoID" },
  PLAN_SubActividadVigencia: { fk: "SubActividadGlobalID", parent: "CFG_SubActividad", weight: "PesoSubActividad" },
  PLAN_TareaVigencia: { fk: "TareaGlobalID", parent: "CFG_Tarea", weight: "PesoTarea" }
};

const FK_MAPPING = {
  PACGlobalID: "CFG_PAC", LineaGlobalID: "CFG_Linea", ProgramaGlobalID: "CFG_Programa",
  ProyectoGlobalID: "CFG_Proyecto", ObjetivoGlobalID: "CFG_Objetivo", ActividadGlobalID: "CFG_Actividad",
  SubActividadGlobalID: "CFG_SubActividad", TareaGlobalID: "CFG_Tarea", PersonaGlobalID: "SEG_Persona",
  ResponsableGlobalID: "SEG_Persona", PersonaID: "SEG_Persona" 
  // Nota: RolID se procesa ahora de forma específica en openModalForm y renderTable
};

const CHILDREN_RULES = [
  { parent: "CFG_PAC", child: "CFG_Linea", fk: "PACGlobalID" }, { parent: "CFG_Linea", child: "CFG_Programa", fk: "LineaGlobalID" },
  { parent: "CFG_Programa", child: "CFG_Proyecto", fk: "ProgramaGlobalID" }, { parent: "CFG_Proyecto", child: "CFG_Objetivo", fk: "ProyectoGlobalID" },
  { parent: "CFG_Objetivo", child: "CFG_Actividad", fk: "ObjetivoGlobalID" }, { parent: "CFG_Actividad", child: "CFG_SubActividad", fk: "ActividadGlobalID" },
  { parent: "CFG_SubActividad", child: "CFG_Tarea", fk: "SubActividadGlobalID" }, { parent: "CFG_SubActividad", child: "PLAN_SubActividadVigencia", fk: "SubActividadGlobalID" },
  { parent: "CFG_Tarea", child: "PLAN_TareaVigencia", fk: "TareaGlobalID" }
];

const UNIQUE_FIELDS = {
  CFG_PAC: "PACID", CFG_Linea: "LineaID", CFG_Programa: "ProgramaID", CFG_Proyecto: "ProyectoID",
  CFG_Objetivo: "ObjetivoID", CFG_Actividad: "ActividadID", CFG_SubActividad: "CodigoSubActividad", CFG_Tarea: "CodigoTarea",
  SEG_Asignacion: "ClaveUnicaAsignacion"
};

const PERSON_FIELDS_CONFIG = {
  REP_AvanceTarea: [ { textF: "Responsable", guidF: "ResponsableGlobalID" } ],
  REP_ReporteNarrativo: [ { textF: "Responsable", guidF: "ResponsableGlobalID" } ]
};

const SEARCH_FIELDS = {
  CFG_PAC: ["PACID", "Nombre"], CFG_Linea: ["LineaID", "Nombre"], CFG_Programa: ["ProgramaID", "Nombre"],
  CFG_Proyecto: ["ProyectoID", "Nombre"], CFG_Objetivo: ["ObjetivoID", "Nombre"],
  CFG_Actividad: ["ActividadID", "NombreActividad", "Nombre"],
  CFG_SubActividad: ["CodigoSubActividad", "NombreSubActividad", "SiglaVariable"],
  CFG_Tarea: ["CodigoTarea", "NombreTarea"],
  PLAN_SubActividadVigencia: ["UnidadMedida", "SiglaVariable"],
  PLAN_TareaVigencia: ["UnidadMedida", "ObservacionReglaAvance"],
  SEG_Persona: ["PersonaID", "Nombre", "Cedula", "Correo", "Dependencia", "RolPrincipal"],
  SEG_Rol: ["RolID", "NombreRol"], SEG_Asignacion: ["ClaveUnicaAsignacion", "Estado"],
  SEG_OTP: ["Correo", "Usado", "IP"],
  REP_AvanceTarea: ["Responsable", "Observaciones", "Periodo", "MotivoAjuste"],
  REP_ReporteNarrativo: ["Responsable", "TextoNarrativo", "PrincipalesLogros", "DescripcionLogrosAlcanzados"],
  AUD_HistorialCambio: ["TipoObjeto", "ObjetoGlobalID", "CampoModificado", "ValorAnterior", "ValorNuevo", "MotivoCambio", "OrigenCambio"],
  AUD_EventoSistema: ["TipoEvento", "Entidad", "Resultado", "DetalleEvento"],
  WF_SolicitudRevision: ["EstadoActual", "ComentarioSolicitante"]
};

/* ===== Estado ===== */
const SESSION = { personaID: null, personaGlobalID: null, nombre: null, roles: [], isSuperAdmin: false, isVisualizador: false, maxPerm: "Ver", allowedGuids: {}, assignedTasks: new Set(), tablePermissions: {} };
let currentEntityKey = null, currentRows = [], editingRow = null, metaCache = {}, catalogs = {};
let currentSort = { col: null, dir: 0 }; 

const uiApp = document.getElementById("app-main"), elStatus = document.getElementById("status"), elOtpStatus = document.getElementById("otp-status"), modal = document.getElementById("modal"), formDyn = document.getElementById("form-dynamic");

function setStatus(msg, type="info", isOtp=false){
  const el = isOtp ? elOtpStatus : elStatus; if(!el) return;
  el.textContent = (type === "error" ? "❌ " : (type === "success" ? "✅ " : "ℹ️ ")) + msg;
  el.style.color = type === "error" ? "#d64545" : "inherit";
}

// NUEVO: Ayudante para mostrar banner rojo dentro del formulario
function showFormError(msg) {
    const errDiv = document.getElementById("form-error");
    if(errDiv) { errDiv.textContent = msg; errDiv.style.display = "block"; }
}

function esc(s){ return (s ?? "").toString().replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function entityUrl(key){ return `${SERVICE_URL}/${ENTITY[key].id}`; }
function isReadOnly(key){ return HARD_READONLY.has(key) || !hasWritePermission(key); }
function canDelete(){ return SESSION.isSuperAdmin; } 
function generateGUID() { return '{' + crypto.randomUUID().toUpperCase() + '}'; }

/* ===== FETCH & POST CORE ===== */
async function fetchJson(url, params){
  params = params || {}; params._ts = Date.now();
  if (url.endsWith("/query")) {
      const form = new URLSearchParams();
      Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null) form.append(k, v); });
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      if(!r.ok) throw new Error(`HTTP ${r.status} al consultar ${url}`);
      const json = await r.json();
      if (json.error) throw new Error(json.error.message || "Error en base de datos AGOL");
      return json;
  } else {
      const u = new URL(url);
      Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null) u.searchParams.set(k,v); });
      const r = await fetch(u.toString(), { method: "GET", cache: "no-store" });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
  }
}

async function postForm(url, obj){
  const form = new URLSearchParams(); form.append("f", "json");
  if(obj.adds) form.append("adds", JSON.stringify(obj.adds));
  if(obj.updates) form.append("updates", JSON.stringify(obj.updates));
  if(obj.deletes) form.append("deletes", obj.deletes);
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}

/* ===== MÓDULO DE AUDITORÍA ===== */
function serializeAuditRecord(attrs) {
  const clean = { ...attrs };
  delete clean.Shape; delete clean.CreationDate; delete clean.Creator; delete clean.EditDate; delete clean.Editor;
  const str = JSON.stringify(clean); return str.length > 1000 ? str.substring(0, 997) + "..." : str;
}
async function writeAuditEvent(tipo, entidad, objGid, resultado, detalle) {
  if (!SESSION.personaID) return;
  try {
    const attrs = { GlobalID: generateGUID(), TipoEvento: tipo, Entidad: entidad, ObjetoGlobalID: objGid || "", Resultado: resultado, DetalleEvento: detalle ? detalle.substring(0, 255) : "", PersonaID: SESSION.personaID, FechaEvento: Date.now() };
    await postForm(`${entityUrl("AUD_EventoSistema")}/applyEdits`, { adds: [{attributes: attrs}] });
  } catch(e) { console.warn("Auditoría Evento falló:", e); }
}
async function writeAuditHistory(tipoObj, objId, objGid, campo, valAnt, valNuevo, motivo) {
  if (!SESSION.personaID) return;
  try {
    const attrs = { GlobalID: generateGUID(), TipoObjeto: tipoObj, ObjetoID: String(objId || 0), ObjetoGlobalID: objGid || "", CampoModificado: campo || "", ValorAnterior: valAnt ? String(valAnt).substring(0, 1000) : "", ValorNuevo: valNuevo ? String(valNuevo).substring(0, 1000) : "", PersonaID: SESSION.personaID, FechaCambio: Date.now(), MotivoCambio: motivo || "", OrigenCambio: "APP_ADMIN" };
    await postForm(`${entityUrl("AUD_HistorialCambio")}/applyEdits`, { adds: [{attributes: attrs}] });
  } catch(e) { console.warn("Auditoría Historial falló:", e); }
}

/* ===== 1. AUTENTICACIÓN OTP ===== */
document.getElementById("btn-request-otp").addEventListener("click", async () => {
  const ced = document.getElementById("inp-cedula").value.trim(), cor = document.getElementById("inp-correo").value.trim().toLowerCase(), btn = document.getElementById("btn-request-otp");
  if(!ced || !cor) return setStatus("Ingresa cédula y correo.", "error", true);
  btn.disabled = true; btn.textContent = "Validando..."; setStatus("Verificando...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_Persona") + "/query", { f: "json", where: `Cedula='${ced}' AND Correo='${cor}' AND Activo='SI'`, outFields: "GlobalID,PersonaID,Nombre", returnGeometry: false });
    if(!res.features || res.features.length === 0) throw new Error("Credenciales inválidas.");
    
    const p = res.features[0].attributes; SESSION.personaGlobalID = p.GlobalID; SESSION.personaID = p.PersonaID; SESSION.nombre = p.Nombre;
    
    btn.textContent = "Generando código...";
    const webhookRes = await fetch(URL_WEBHOOK_POWERAUTOMATE, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({cedula: ced, correo: cor}) });
    
    if(webhookRes.status === 200 || webhookRes.status === 202) {
        document.getElementById("otp-step-1").classList.add("is-hidden"); document.getElementById("otp-step-2").classList.remove("is-hidden"); setStatus("Código enviado.", "success", true);
    } else { throw new Error(`Error PA: ${webhookRes.status}`); }
  } catch(e) { setStatus(e.message, "error", true); } finally { btn.disabled = false; btn.textContent = "Solicitar Código"; }
});

document.getElementById("btn-verify-otp").addEventListener("click", async () => {
  const code = document.getElementById("inp-codigo").value.trim(); if(!code) return;
  setStatus("Validando código...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_OTP") + "/query", { f: "json", where: `PersonaGlobalID='${SESSION.personaGlobalID}' AND CodigoHash='${code}' AND Usado='NO'`, outFields: "OBJECTID", returnGeometry: false });
    if(!res.features || res.features.length === 0) throw new Error("Código incorrecto.");
    
    await postForm(entityUrl("SEG_OTP") + "/applyEdits", { updates: [{attributes: {OBJECTID: res.features[0].attributes.OBJECTID, Usado: 'SI'}}] });
    await writeAuditEvent("OTP_VALIDATE", "SEG_Persona", SESSION.personaGlobalID, "OK", "Ingreso exitoso al panel Admin");
    await initSession();
  } catch(e) { setStatus(e.message, "error", true); }
});

document.getElementById("btn-back-otp").addEventListener("click", () => {
  document.getElementById("otp-step-2").classList.add("is-hidden"); document.getElementById("otp-step-1").classList.remove("is-hidden"); setStatus("", "info", true);
});

/* ===== 2. CARGA DE SESIÓN, CATÁLOGOS Y CONTEXTO PAC ===== */
async function initSession() {
  setStatus("Cargando perfil...", "info", true);
  try {
    const resR = await fetchJson(entityUrl("SEG_PersonaRol") + "/query", { f: "json", where: `PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields: "RolID", returnGeometry: false });
    SESSION.roles = (resR.features || []).map(f => String(f.attributes.RolID).trim().toUpperCase());
    if(SESSION.roles.some(r => r === "SUPERADMIN")) SESSION.isSuperAdmin = true;
    if(SESSION.roles.length === 1 && SESSION.roles[0] === "VISUALIZADOR") SESSION.isVisualizador = true;

    const resA = await fetchJson(entityUrl("SEG_Alcance") + "/query", { f: "json", where: `PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields: "NivelJerarquia,ObjetoGlobalID,Permiso", returnGeometry: false });
    const alcances = (resA.features || []).map(f => f.attributes);
    const permWeight = {"Ver":1, "Revisar":2, "Aprobar":3, "Editar":4, "Administrar":5}; let maxW = 0;
    
    alcances.forEach(a => { if(permWeight[a.Permiso] > maxW) { maxW = permWeight[a.Permiso]; SESSION.maxPerm = a.Permiso; } });
    if(SESSION.isSuperAdmin) SESSION.maxPerm = "Administrar";

    const resAsig = await fetchJson(entityUrl("SEG_Asignacion") + "/query", { f: "json", where: `PersonaGlobalID='${SESSION.personaGlobalID}' AND Activo='SI'`, outFields: "TareaGlobalID", returnGeometry: false });
    (resAsig.features || []).forEach(f => SESSION.assignedTasks.add(f.attributes.TareaGlobalID));
    
    if(!SESSION.isSuperAdmin) await resolveHierarchy(alcances);

    await loadCatalogs(true);
    document.getElementById("otp-overlay").style.display = "none"; uiApp.style.display = "flex";
    document.getElementById("pill-user").textContent = `Usuario: ${SESSION.nombre} (${SESSION.roles.join(", ")})`;
    
    const btnClone = document.getElementById("btn-open-clone");
    if (btnClone) {
        btnClone.style.display = SESSION.isSuperAdmin ? "inline-flex" : "none";
    }
    
    buildDynamicMenu();
  } catch(e) { setStatus(e.message, "error", true); }
}

async function resolveHierarchy(alcances) {
  const cfgs = ["CFG_PAC","CFG_Linea","CFG_Programa","CFG_Proyecto","CFG_Objetivo","CFG_Actividad","CFG_SubActividad","CFG_Tarea"];
  cfgs.forEach(c => SESSION.allowedGuids[c] = new Set());
  
  alcances.forEach(alc => {
    let k = `CFG_${alc.NivelJerarquia.charAt(0) + alc.NivelJerarquia.slice(1).toLowerCase()}`;
    if(alc.NivelJerarquia === "SUBACTIVIDAD") k = "CFG_SubActividad"; if(alc.NivelJerarquia === "PAC") k = "CFG_PAC";
    if(SESSION.allowedGuids[k] && alc.ObjetoGlobalID) SESSION.allowedGuids[k].add(alc.ObjetoGlobalID);
  });
  
  const arbol = {};
  for(let c of cfgs) {
    const r = await fetchJson(entityUrl(c) + "/query", { f: "json", where: "1=1", outFields: "GlobalID,PACGlobalID,LineaGlobalID,ProgramaGlobalID,ProyectoGlobalID,ObjetivoGlobalID,ActividadGlobalID,SubActividadGlobalID", returnGeometry: false });
    arbol[c] = (r.features || []).map(f => f.attributes);
  }
  
  function propagate(pKey, cKey, fk) {
    if(SESSION.allowedGuids[pKey].size === 0) return;
    arbol[cKey].forEach(row => { if(SESSION.allowedGuids[pKey].has(row[fk])) SESSION.allowedGuids[cKey].add(row.GlobalID); });
  }
  
  propagate("CFG_PAC", "CFG_Linea", "PACGlobalID"); propagate("CFG_Linea", "CFG_Programa", "LineaGlobalID");
  propagate("CFG_Programa", "CFG_Proyecto", "ProgramaGlobalID"); propagate("CFG_Proyecto", "CFG_Objetivo", "ProyectoGlobalID");
  propagate("CFG_Objetivo", "CFG_Actividad", "ObjetivoGlobalID"); propagate("CFG_Actividad", "CFG_SubActividad", "ActividadGlobalID");
  propagate("CFG_SubActividad", "CFG_Tarea", "SubActividadGlobalID");
}

function safeLabel(code, name) {
    const c = code ? String(code).trim() : ""; const n = name ? String(name).trim() : "";
    if (c && n) return `${c} - ${n}`; if (c) return c; if (n) return n; return "(sin etiqueta)";
}

function buildEntityLabel(entityKey, item) {
    if (!item) return "(sin etiqueta)";
    switch (entityKey) {
        case "CFG_PAC": return safeLabel(item.PACID, item.Nombre);
        case "CFG_Linea": return safeLabel(item.LineaID, item.Nombre);
        case "CFG_Programa": return safeLabel(item.ProgramaID, item.Nombre);
        case "CFG_Proyecto": return safeLabel(item.ProyectoID, item.Nombre);
        case "CFG_Objetivo": return safeLabel(item.ObjetivoID, item.Nombre);
        case "CFG_Actividad": return safeLabel(item.ActividadID, item.NombreActividad || item.Nombre);
        case "CFG_SubActividad": return safeLabel(item.CodigoSubActividad, item.NombreSubActividad);
        case "CFG_Tarea": return safeLabel(item.CodigoTarea, item.NombreTarea);
        case "SEG_Persona": 
            if (item.Nombre && item.Cedula) return `${item.Nombre} — ${item.Cedula}`;
            if (item.Nombre && item.Correo) return `${item.Nombre} — ${item.Correo}`;
            if (item.PersonaID && item.Nombre) return `${item.PersonaID} — ${item.Nombre}`;
            return item.Nombre || item.GlobalID || "(sin etiqueta)";
        case "SEG_Rol": return item.NombreRol || item.RolID; 
        default: return item.GlobalID || "(sin etiqueta)";
    }
}

async function loadCatalogs(forceBase = false) {
  const vig = document.getElementById("sel-vigencia").value; const vigW = vig ? `Vigencia=${vig}` : "1=1";
  async function fetchCat(k, nameF, extra=""){
    const isStruct = k.startsWith("CFG_") || k.startsWith("SEG_");
    if (!forceBase && isStruct && catalogs[k] && catalogs[k].length > 0) return; 
    
    const w = (!isStruct && metaCache[k]?.fieldsByName?.["Vigencia"]) ? vigW : "1=1";
    const orderClause = (k === "SEG_Rol") ? "Orden ASC" : `${nameF} ASC`;
    const r = await fetchJson(`${entityUrl(k)}/query`, { f: "json", where: w, outFields: `GlobalID,${nameF}${extra}`, orderByFields: orderClause, returnGeometry: false });
    catalogs[k] = (r.features || []).map(f => f.attributes);
  }
  
  if(!metaCache["CFG_PAC"]) { for(let k of Object.keys(FK_MAPPING)) await getMeta(FK_MAPPING[k]); }
  
  await fetchCat("CFG_PAC", "Nombre", ",PACID,Activo"); await fetchCat("CFG_Linea", "Nombre", ",LineaID,PACGlobalID");
  await fetchCat("CFG_Programa", "Nombre", ",ProgramaID,LineaGlobalID"); await fetchCat("CFG_Proyecto", "Nombre", ",ProyectoID,ProgramaGlobalID");
  await fetchCat("CFG_Objetivo", "Nombre", ",ObjetivoID,ProyectoGlobalID"); await fetchCat("CFG_Actividad", "NombreActividad", ",ActividadID,Nombre,ObjetivoGlobalID");
  await fetchCat("CFG_SubActividad", "NombreSubActividad", ",CodigoSubActividad,ActividadGlobalID"); await fetchCat("CFG_Tarea", "NombreTarea", ",CodigoTarea,SubActividadGlobalID");
  await fetchCat("SEG_Persona", "Nombre", ",Cedula,Correo,PersonaID"); await fetchCat("SEG_Rol", "NombreRol", ",RolID,Orden,Descripcion");

  if (forceBase) {
      const selPac = document.getElementById("sel-pac");
      const currentPac = selPac.value;
      selPac.innerHTML = catalogs["CFG_PAC"].map(p => `<option value="${esc(p.GlobalID)}">${esc(p.PACID)} - ${esc(p.Nombre)}</option>`).join("");
      if (currentPac && catalogs["CFG_PAC"].some(p => p.GlobalID === currentPac)) {
          selPac.value = currentPac;
      } else if (catalogs["CFG_PAC"].length > 0) {
          const activePac = catalogs["CFG_PAC"].find(p => p.Activo === 'SI' || p.Activo === 'Si');
          selPac.value = activePac ? activePac.GlobalID : catalogs["CFG_PAC"][0].GlobalID;
      }
  }
}

/* ===== 3. MENÚ DINÁMICO & CONTEXTO PAC ===== */
function buildDynamicMenu() {
  const nav = document.getElementById("navlist"); nav.innerHTML = "";
  const groups = [ { label: "Configuración Base", prefix: "CFG_" }, { label: "Planeación", prefix: "PLAN_" }, { label: "Reportes Operativos", prefix: "REP_" }, { label: "Aprobaciones", prefix: "WF_" }, { label: "Analítica y Finanzas", prefixes: ["BI_", "FIN_"] }, { label: "Seguridad y Auditoría", prefixes: ["SEG_", "AUD_"] } ];
  let vis = new Set();
  
  if(SESSION.isSuperAdmin) {
      Object.keys(ENTITY).forEach(k => vis.add(k));
  } else {
    if(SESSION.roles.includes("PUBLICADOR")) { ["WF_SolicitudRevision", "WF_AprobacionPaso", "CFG_PAC", "CFG_Linea", "BI_AvanceActividad", "BI_AvanceObjetivo", "BI_AvanceProyecto", "BI_AvancePrograma", "BI_AvanceLinea", "BI_AvancePAC"].forEach(t => vis.add(t)); ["CFG_Programa", "CFG_Proyecto", "CFG_Objetivo", "CFG_Actividad", "REP_AvanceTarea", "REP_ReporteNarrativo"].forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; }); }
    if(SESSION.roles.includes("APROBADOR")) Object.keys(ENTITY).filter(k => k.startsWith("CFG_") || k.startsWith("PLAN_") || k.startsWith("REP_") || k.startsWith("WF_") || k.startsWith("FIN_")).forEach(t => vis.add(t));
    if(SESSION.roles.includes("EDITOR")) { Object.keys(ENTITY).filter(k => k.startsWith("CFG_")).forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; }); ["REP_AvanceTarea", "REP_ReporteNarrativo", "WF_SolicitudRevision"].forEach(t => vis.add(t)); }
    if(SESSION.isVisualizador) Object.keys(ENTITY).filter(k => k.startsWith("BI_") || k.startsWith("FIN_") || k.startsWith("CFG_")).forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; });
  }
  
  groups.forEach(g => {
    let html = `<div class="navgroup">${g.label}</div>`, has = false;
    Object.keys(ENTITY).forEach(k => {
      if((g.prefix ? k.startsWith(g.prefix) : g.prefixes.some(p => k.startsWith(p))) && vis.has(k)) {
        has = true; html += `<button class="navitem" onclick="loadEntity('${k}', true)"><span class="navitem__title">${k}</span></button>`;
      }
    });
    if(has) nav.innerHTML += html;
  });
}

function hasWritePermission(key) {
  if(HARD_READONLY.has(key)) return false; if(SESSION.isSuperAdmin) return true;
  if(SESSION.tablePermissions[key] === "Ver" || SESSION.maxPerm === "Ver") return false; return true;
}

function getGuidsInPac(entityKey, pacGid) {
    if (!pacGid) return [];
    if (entityKey === "CFG_PAC") return [pacGid];
    const lineas = catalogs["CFG_Linea"].filter(x => x.PACGlobalID === pacGid).map(x => x.GlobalID);
    if (entityKey === "CFG_Linea") return lineas;
    const programas = catalogs["CFG_Programa"].filter(x => lineas.includes(x.LineaGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_Programa") return programas;
    const proyectos = catalogs["CFG_Proyecto"].filter(x => programas.includes(x.ProgramaGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_Proyecto") return proyectos;
    const objetivos = catalogs["CFG_Objetivo"].filter(x => proyectos.includes(x.ProyectoGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_Objetivo") return objetivos;
    const actividades = catalogs["CFG_Actividad"].filter(x => objetivos.includes(x.ObjetivoGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_Actividad" || entityKey === "REP_ReporteNarrativo") return actividades;
    const subactividades = catalogs["CFG_SubActividad"].filter(x => actividades.includes(x.ActividadGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_SubActividad" || entityKey === "PLAN_SubActividadVigencia") return subactividades;
    const tareas = catalogs["CFG_Tarea"].filter(x => subactividades.includes(x.SubActividadGlobalID)).map(x => x.GlobalID);
    if (entityKey === "CFG_Tarea" || entityKey === "PLAN_TareaVigencia" || entityKey === "REP_AvanceTarea") return tareas;
    return null; 
}

function getPacWhere(entityKey, pacGid) {
   if (!pacGid) return "1=0"; 
   const guids = getGuidsInPac(entityKey, pacGid);
   if (guids === null) return "1=1"; 
   if (guids.length === 0) return "1=0"; 
   
   let fkField = "GlobalID";
   if (entityKey === "PLAN_SubActividadVigencia") fkField = "SubActividadGlobalID";
   if (entityKey === "PLAN_TareaVigencia" || entityKey === "REP_AvanceTarea") fkField = "TareaGlobalID";
   if (entityKey === "REP_ReporteNarrativo") fkField = "ActividadGlobalID";
   
   if (guids.length <= 500) {
       return `${fkField} IN (${guids.map(g => `'${g}'`).join(",")})`;
   } else {
       const chunks = [];
       for(let i=0; i<guids.length; i+=500) {
           chunks.push(`${fkField} IN (${guids.slice(i, i+500).map(g => `'${g}'`).join(",")})`);
       }
       return `(${chunks.join(" OR ")})`;
   }
}

function buildSecurityWhere(key) {
  let w = "1=1";
  const isCfg = key.startsWith("CFG_") || key.startsWith("SEG_");
  const isPlanOrRep = key.startsWith("PLAN_") || key.startsWith("REP_") || key.startsWith("FIN_") || key.startsWith("BI_") || key.startsWith("WF_");
  
  const pacGid = document.getElementById("sel-pac").value;
  if (pacGid && (isCfg || isPlanOrRep) && !key.startsWith("SEG_")) { 
      const pacWhere = getPacWhere(key, pacGid);
      if (pacWhere !== "1=1") w += ` AND ${pacWhere}`;
  }

  const vig = document.getElementById("sel-vigencia").value;
  if (!key.startsWith("CFG_") && !key.startsWith("SEG_") && vig && metaCache[key]?.fieldsByName?.["Vigencia"]) {
      w += ` AND Vigencia = ${vig}`;
  }

  if(SESSION.isSuperAdmin) return w;
  
  if(SESSION.allowedGuids[key]) {
    const guids = Array.from(SESSION.allowedGuids[key]); 
    if(!guids.length) return "1=0";
    w += ` AND GlobalID IN (${guids.map(g => `'${g}'`).join(",")})`;
  }
  if(["REP_AvanceTarea", "PLAN_TareaVigencia"].includes(key)) {
    const tG = Array.from(SESSION.assignedTasks); 
    if(!tG.length && SESSION.maxPerm === "Ver") return "1=0"; 
    if(tG.length) w += ` AND TareaGlobalID IN (${tG.map(g => `'${g}'`).join(",")})`;
  }
  return w;
}

function buildWhere(key) {
  const securityW = buildSecurityWhere(key);
  const st = document.getElementById("txt-search").value.trim().toUpperCase();
  if(!st) return securityW;

  let sFields = SEARCH_FIELDS[key];
  if(!sFields && metaCache[key]) {
      sFields = metaCache[key].fields.filter(f => f.type === "esriFieldTypeString" && !f.name.includes("GlobalID") && !f.name.includes("Guid")).map(f => f.name);
  }
  if(!sFields || !sFields.length) return securityW;

  const validFields = sFields.filter(f => metaCache[key].fieldsByName[f]);
  if(!validFields.length) return securityW;

  const clauses = validFields.map(f => {
      const metaF = metaCache[key].fieldsByName[f];
      if (metaF.type === "esriFieldTypeString") return `UPPER(${f}) LIKE '%${st}%'`;
      if (!isNaN(st) && ["esriFieldTypeInteger", "esriFieldTypeDouble", "esriFieldTypeSmallInteger"].includes(metaF.type)) return `${f} = ${Number(st)}`;
      return null;
  }).filter(x => x !== null);

  if(!clauses.length) return securityW;
  return `${securityW} AND (${clauses.join(" OR ")})`;
}

/* ===== 4. TABLA CON ORDENAMIENTO Y ACCIÓN DUPLICAR ===== */
async function getMeta(key){
  if(metaCache[key]) return metaCache[key];
  const m = await fetchJson(`${entityUrl(key)}?f=pjson`);
  const fieldsByName = {}, domainsByField = {};
  m.fields.forEach(f => { fieldsByName[f.name] = f; if(f.domain?.codedValues) domainsByField[f.name] = f.domain.codedValues; });
  metaCache[key] = { fields: m.fields, fieldsByName, domainsByField }; 
  return metaCache[key];
}

async function loadEntity(key, clearSearch = false) {
  if (clearSearch) document.getElementById("txt-search").value = "";
  
  currentEntityKey = key; 
  document.querySelectorAll(".navitem").forEach(b => { 
      const titleEl = b.querySelector('.navitem__title');
      if(titleEl) {
          b.classList.toggle("is-active", titleEl.textContent === key); 
      }
  });
  
  const isCfg = key.startsWith("CFG_");
  const pacSel = document.getElementById("sel-pac");
  const pacName = pacSel.options[pacSel.selectedIndex]?.text || "PAC";
  const vig = document.getElementById("sel-vigencia").value || "Todas";
  
  document.getElementById("h-entity").textContent = key;
  document.getElementById("p-entity").textContent = isCfg ? `Estructura base de ${pacName}` : `Planeación/Operación en ${vig} para ${pacName}`;
  document.getElementById("btn-new").style.display = (hasWritePermission(key) && !key.startsWith("WF_")) ? "inline-flex" : "none";
  
  setStatus("Cargando datos...", "info"); 
  document.getElementById("tbl-head").innerHTML = "";
  document.getElementById("tbl-body").innerHTML = "";

  try {
      await getMeta(key);
      const r = await fetchJson(`${entityUrl(key)}/query`, { f: "json", where: buildWhere(key), outFields: "*", returnGeometry: false });
      currentRows = r.features || []; 
      currentSort = { col: null, dir: 0 };
      
      renderTable(); 
      
      const st = document.getElementById("txt-search").value.trim();
      if (currentRows.length === 0 && st) { setStatus(`Sin resultados para '${st}'.`, "info"); } 
      else { setStatus(`Cargados ${currentRows.length} registros.`, "success"); }
  } catch (e) {
      console.error(`Error cargando entidad ${key}:`, e);
      setStatus(`Error al cargar la tabla: ${e.message}`, "error");
      document.getElementById("tbl-body").innerHTML = `<tr><td colspan="10" style="text-align:center; color:#d64545;">${esc(e.message)}</td></tr>`;
  }
}

window.toggleSort = function(col) {
  if(currentSort.col === col) { currentSort.dir = currentSort.dir === 1 ? -1 : (currentSort.dir === -1 ? 0 : 1); if(!currentSort.dir) currentSort.col = null; } 
  else { currentSort.col = col; currentSort.dir = 1; }
  renderTable();
};

function renderTable() {
  const key = currentEntityKey, canWrite = hasWritePermission(key), canDel = canDelete();
  const techFields = ["CreationDate", "Creator", "EditDate", "Editor", "PersonaUltimaEdicionID", "FechaUltimaEdicionFuncional", "PersonaID", "ClaveUnicaAsignacion", "PersonaRolID", "AlcanceID"];
  
  if (PERSON_FIELDS_CONFIG[key]) { PERSON_FIELDS_CONFIG[key].forEach(c => techFields.push(c.guidF)); }
  if (key === "SEG_Asignacion") techFields.push("PersonaGlobalID", "TareaGlobalID", "ActividadID"); 
  
  let fields = metaCache[key].fields.filter(f => 
    f.name === "OBJECTID" || (!f.name.includes("GlobalID") && !f.name.includes("Guid") && !techFields.includes(f.name) && f.name !== "IndicadorID" && !(key === "CFG_Actividad" && f.name === "Nombre"))
  );

  if (key === "SEG_Asignacion") {
      fields.splice(1, 0, {name:"_Persona_Virtual", alias:"Persona"}, {name:"_Actividad_Virtual", alias:"Actividad"}, {name:"_Tarea_Virtual", alias:"Tarea"});
  } else if (key === "SEG_PersonaRol") {
      fields.splice(1, 0, {name:"_Persona_Virtual", alias:"Persona"});
  } else if (key === "SEG_Alcance") {
      fields.splice(2, 0, {name:"_Objeto_Virtual", alias:"Objeto de Alcance"});
  }
  
  let sortedRows = [...currentRows];
  if(currentSort.col && !currentSort.col.includes("_Virtual")) {
    sortedRows.sort((a,b) => {
      let va = a.attributes[currentSort.col], vb = b.attributes[currentSort.col];
      if(va === vb) return 0; if(va == null) return 1; if(vb == null) return -1;
      if(typeof va === 'string') return va.localeCompare(vb) * currentSort.dir;
      return (va < vb ? -1 : 1) * currentSort.dir;
    });
  }

  const ths = fields.map(f => {
    let c = ""; if(currentSort.col === f.name) c = currentSort.dir === 1 ? "sort-asc" : "sort-desc";
    return `<th class="${f.name.includes('_Virtual')?'':'sortable'} ${c}" ${f.name.includes('_Virtual')?'':'onclick="toggleSort(\''+f.name+'\')"'}>${f.alias}</th>`;
  }).join("");
  document.getElementById("tbl-head").innerHTML = `<tr><th style="width:200px;">Acciones</th>${ths}</tr>`;

  const allowDuplicate = key.startsWith("CFG_") || key.startsWith("PLAN_");

  document.getElementById("tbl-body").innerHTML = sortedRows.map(r => {
    const oid = r.attributes.OBJECTID;
    let tds = `<td><div class="rowactions">
      <button class="btn btn--ghost btn-xs" onclick="openModalForm(${oid}, false)" ${canWrite?'':'disabled'}>${canWrite?'Editar':'Ver'}</button>
      ${allowDuplicate && canWrite ? `<button class="btn btn--ghost btn-xs" onclick="openModalForm(${oid}, true)">Duplicar</button>` : ''}
      ${canDel ? `<button class="btn btn--danger btn-xs" onclick="confirmDelete(${oid})">Eliminar</button>` : ''}
    </div></td>`;
    tds += fields.map(f => {
      let rawVal = r.attributes[f.name];
      let displayVal = rawVal;

      if (f.name === "_Persona_Virtual") {
          const pgid = r.attributes.PersonaGlobalID || r.attributes.PersonaID;
          const p = catalogs["SEG_Persona"]?.find(x => x.GlobalID === pgid || String(x.PersonaID) === String(pgid));
          displayVal = p ? p.Nombre : pgid;
      } else if (f.name === "_Actividad_Virtual" && key === "SEG_Asignacion") {
          const tGid = r.attributes.TareaGlobalID;
          const tar = catalogs["CFG_Tarea"]?.find(t => t.GlobalID === tGid);
          if (tar) {
              const sub = catalogs["CFG_SubActividad"]?.find(s => s.GlobalID === tar.SubActividadGlobalID);
              if (sub) {
                  const act = catalogs["CFG_Actividad"]?.find(a => a.GlobalID === sub.ActividadGlobalID);
                  displayVal = act ? act.NombreActividad : "";
              }
          }
      } else if (f.name === "_Tarea_Virtual" && key === "SEG_Asignacion") {
          const tGid = r.attributes.TareaGlobalID;
          const tar = catalogs["CFG_Tarea"]?.find(t => t.GlobalID === tGid);
          displayVal = tar ? `${tar.CodigoTarea||''} - ${tar.NombreTarea||''}` : tGid;
      } else if (f.name === "RolID") {
          const rawStr = String(rawVal).trim().toLowerCase();
          const rol = catalogs["SEG_Rol"]?.find(x => 
              String(x.RolID).trim().toLowerCase() === rawStr || 
              (x.NombreRol && x.NombreRol.trim().toLowerCase() === rawStr) || 
              (x.Descripcion && x.Descripcion.trim().toLowerCase() === rawStr)
          );
          displayVal = rol ? rol.NombreRol : rawVal;
      } else if (f.name === "_Objeto_Virtual" && key === "SEG_Alcance") {
          const nivel = r.attributes.NivelJerarquia;
          const objGid = r.attributes.ObjetoGlobalID || r.attributes.ObjetoID;
          if (nivel && objGid) {
              let catKey = "CFG_" + nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
              if(nivel.toUpperCase() === "SUBACTIVIDAD") catKey = "CFG_SubActividad";
              if(nivel.toUpperCase() === "PAC") catKey = "CFG_PAC";
              const obj = catalogs[catKey]?.find(x => x.GlobalID === objGid || String(x.OBJECTID) === String(objGid) || String(x[catKey.replace('CFG_','')+'ID']) === String(objGid) || x.CodigoTarea === objGid || x.CodigoSubActividad === objGid);
              if (obj) displayVal = buildEntityLabel(catKey, obj);
          }
      } else if (f.type === "esriFieldTypeDate" && rawVal) {
          displayVal = new Date(rawVal).toLocaleDateString();
      }

      return `<td>${esc(displayVal)}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

/* ===== 5. BORRADO CON REGLAS Y AUDITORÍA ===== */
window.confirmDelete = async function(oid) {
  const key = currentEntityKey;
  if (!canDelete()) return;
  const row = currentRows.find(x => x.attributes.OBJECTID === oid);
  if (!row) return;

  if (!confirm(`¿Estás seguro de que deseas eliminar este registro de ${key}? Esta acción es irreversible.`)) return;

  setStatus("Verificando dependencias...", "info");
  const parentGid = row.attributes.GlobalID;

  try {
    if (parentGid) {
      for (let r of CHILDREN_RULES.filter(x => x.parent === key)) {
        const check = await fetchJson(`${entityUrl(r.child)}/query`, { f: "json", where: `${r.fk}='${parentGid}'`, outFields: "OBJECTID", returnGeometry: false });
        if (check.features?.length > 0) {
            await writeAuditEvent("DELETE_BLOCKED", key, parentGid, "BLOCKED", `Dependencias en ${r.child}`);
            alert(`⚠️ NO SE PUEDE ELIMINAR:\nEste registro tiene elementos hijos en la tabla [${r.child}].\n\nDebes eliminar primero los hijos vinculados.`);
            throw new Error(`Dependencias encontradas en ${r.child}.`);
        }
      }
    }
    
    const res = await postForm(`${entityUrl(key)}/applyEdits`, { deletes: String(oid) });
    if (res.error) throw new Error(res.error.message || "Error en el servidor al eliminar.");
    if (res.deleteResults && res.deleteResults.length > 0 && !res.deleteResults[0].success) {
      throw new Error(`AGOL rechazó el borrado: ${res.deleteResults[0].error?.description || res.deleteResults[0].error?.message || "Error desconocido"}`);
    }
    
    await writeAuditEvent("DELETE", key, parentGid, "OK", "Registro eliminado exitosamente.");
    await writeAuditHistory(key, oid, parentGid, "__DELETE__", serializeAuditRecord(row.attributes), "", "Borrado de interfaz Admin");

    if(key.startsWith("CFG_")) await loadCatalogs(true); 
    await loadEntity(key, false); setStatus("Registro eliminado exitosamente.", "success");
  } catch(e) {
    if (!e.message.includes("Dependencias encontradas")) {
        await writeAuditEvent("DELETE", key, parentGid, "ERROR", e.message);
    }
    setStatus(e.message, "error");
  }
};

/* ===== 6. FORMULARIOS ===== */
function openModalForm(oid = null, isDuplicate = false) {
  const key = currentEntityKey; 
  window.isDuplicating = isDuplicate; 
  editingRow = oid ? currentRows.find(x => x.attributes.OBJECTID === oid) : null;
  
  if (isDuplicate) {
      document.getElementById("modal-title").textContent = `Duplicar ${key}`;
      document.getElementById("btn-delete").style.display = "none";
  } else {
      document.getElementById("modal-title").textContent = oid ? `Editar ${key}` : `Nuevo ${key}`;
      document.getElementById("btn-delete").style.display = (oid && canDelete()) ? "inline-flex" : "none";
  }
  
  document.getElementById("btn-save").style.display = hasWritePermission(key) ? "inline-flex" : "none";
  
  let html = "", hiddenHtml = "";
  const techFields = ["OBJECTID", "CreationDate", "Creator", "EditDate", "Editor", "PersonaUltimaEdicionID", "FechaUltimaEdicionFuncional", "PersonaID", "ClaveUnicaAsignacion", "PersonaRolID", "AlcanceID"];
  const parentTextF = PARENT_RULES[key]?.parentText;
  const largeTextFields = ["Definicion", "ObservacionesPlaneacion", "TextoNarrativo", "PrincipalesLogros", "DescripcionLogrosAlcanzados", "Observaciones", "DescripcionSitio"];

  let sortedFields = [...metaCache[key].fields];
  const parentFk = PARENT_RULES[key]?.fk;
  
  sortedFields.sort((a, b) => {
      if (a.name === parentFk) return -1;
      if (b.name === parentFk) return 1;
      if (key === "SEG_Asignacion") {
          if (a.name === "PersonaGlobalID") return -1;
          if (b.name === "PersonaGlobalID") return 1;
          if (a.name === "TareaGlobalID") return -1;
          if (b.name === "TareaGlobalID") return 1;
      }
      const isAPerson = PERSON_FIELDS_CONFIG[key]?.some(c => c.guidF === a.name);
      const isBPerson = PERSON_FIELDS_CONFIG[key]?.some(c => c.guidF === b.name);
      if (isAPerson && !isBPerson) return -1;
      if (!isAPerson && isBPerson) return 1;
      return 0;
  });

  sortedFields.forEach(f => {
    if(techFields.includes(f.name) && !(key === "SEG_PersonaRol" && f.name === "PersonaID")) return;

    const val = editingRow ? editingRow.attributes[f.name] : (f.name === "Vigencia" ? document.getElementById("sel-vigencia").value : "");
    const dom = metaCache[key].domainsByField[f.name];
    const isFK = FK_MAPPING[f.name];
    
    if(
        f.name === parentTextF || 
        (key === "CFG_Actividad" && f.name === "Nombre") ||
        (key === "SEG_Persona" && f.name === "DependenciaCodigo") ||
        (key === "SEG_Asignacion" && (f.name === "IndicadorID" || f.name === "ClaveUnicaAsignacion" || f.name === "ActividadID")) ||
        (key === "SEG_Alcance" && (f.name === "ObjetoGlobalID" || f.name === "ObjetoID")) ||
        (key === "SEG_PersonaRol" && f.name === "PersonaRolID")
    ) {
        hiddenHtml += `<input type="hidden" data-field="${f.name}" data-type="${f.type}" id="hidden-${f.name}" value="${esc(val)}" />`; 
        return;
    }
    
    if (PERSON_FIELDS_CONFIG[key]) {
        const pConf = PERSON_FIELDS_CONFIG[key].find(c => c.textF === f.name || c.guidF === f.name);
        if (pConf) {
            if (f.name === pConf.textF) {
                hiddenHtml += `<input type="hidden" data-field="${f.name}" data-type="${f.type}" id="hidden-${f.name}" value="${esc(val)}" />`;
                return;
            }
            if (f.name === pConf.guidF) {
                let currentFkVal = val;
                let oldNameHint = "";
                if (editingRow && !currentFkVal) {
                     const oldName = editingRow.attributes[pConf.textF];
                     if (oldName) {
                         const matches = catalogs["SEG_Persona"]?.filter(p => p.Nombre && p.Nombre.trim().toLowerCase() === oldName.trim().toLowerCase());
                         if (matches && matches.length === 1) currentFkVal = matches[0].GlobalID; 
                         else oldNameHint = `(Antiguo: ${esc(oldName)})`;
                     }
                }
                let opts = catalogs["SEG_Persona"].map(c => `<option value="${esc(c.GlobalID)}" ${currentFkVal===c.GlobalID?'selected':''}>${esc(buildEntityLabel("SEG_Persona", c))}</option>`).join("");
                html += `<div class="field" id="field-wrap-${f.name}">
                            <label>${f.alias} <span style="color:#d64545">*</span></label>
                            <select data-field="${f.name}" data-type="${f.type}" id="sel-${f.name}">
                                <option value="">- Seleccione ${f.alias.replace(' ID','')} - ${oldNameHint}</option>
                                ${opts}
                            </select>
                            ${oldNameHint ? `<span class="help-text" style="color:#d64545;">Debe reasignar una persona válida.</span>` : ''}
                         </div>`;
                return;
            }
        }
    }
    
    // Tratamiento especial exhaustivo para RolID (Selector y auto-resolución legacy)
    if (f.name === "RolID") {
        let currentRolVal = val;
        let oldRolHint = "";
        
        if (editingRow && currentRolVal) {
            const rawStr = String(currentRolVal).trim().toLowerCase();
            let matchedRol = catalogs["SEG_Rol"]?.find(r => String(r.RolID).trim().toLowerCase() === rawStr);
            
            if (!matchedRol) {
                matchedRol = catalogs["SEG_Rol"]?.find(r => 
                    (r.NombreRol && r.NombreRol.trim().toLowerCase() === rawStr) ||
                    (r.Descripcion && r.Descripcion.trim().toLowerCase() === rawStr)
                );
                if (matchedRol) {
                    currentRolVal = matchedRol.RolID; 
                } else {
                    oldRolHint = `(Antiguo: ${esc(currentRolVal)})`;
                    currentRolVal = ""; 
                }
            }
        }

        let opts = (catalogs["SEG_Rol"] || []).map(c => `<option value="${esc(c.RolID)}" ${String(currentRolVal) === String(c.RolID) ? 'selected' : ''}>${esc(c.NombreRol)}</option>`).join("");
        html += `<div class="field" id="field-wrap-${f.name}">
                    <label>${f.alias} <span style="color:#d64545">*</span></label>
                    <select data-field="${f.name}" data-type="${f.type}" id="sel-${f.name}">
                        <option value="">- Seleccione Rol -</option>
                        ${opts}
                    </select>
                    ${oldRolHint ? `<span class="help-text" style="color:#d64545;">El valor actual (${esc(val)}) no corresponde a un rol válido del catálogo. Seleccione uno.</span>` : ''}
                 </div>`;
        return;
    }

    if (key === "SEG_Asignacion" && f.name === "TareaGlobalID") {
        let actOpts = `<option value="">- Seleccione Actividad -</option>`;
        catalogs["CFG_Actividad"]?.forEach(a => { actOpts += `<option value="${a.GlobalID}">${buildEntityLabel("CFG_Actividad", a)}</option>`; });
        html += `<div class="field"><label>Actividad (Filtro)</label><select id="sel-synthetic-actividad">${actOpts}</select></div>`;
    }

    if (key === "SEG_Alcance" && f.name === "NivelJerarquia") {
        let opts = dom.map(d => `<option value="${esc(d.code)}" ${val===d.code?'selected':''}>${esc(d.name)}</option>`).join("");
        html += `<div class="field" id="field-wrap-${f.name}"><label>${f.alias}</label><select data-field="${f.name}" data-type="${f.type}">${opts}</select></div>`;
        html += `<div class="field"><label>Objeto de Alcance <span style="color:#d64545">*</span></label><select id="sel-alcance-objeto"><option value="">- Seleccione Nivel Primero -</option></select></div>`;
        return;
    }

    if(f.name.includes("GlobalID") || f.name.includes("Guid") || (key === "SEG_PersonaRol" && f.name === "PersonaID")) {
        let lookupKey = isFK || f.name.replace("GlobalID","");
        if(key === "SEG_PersonaRol" && f.name === "PersonaID") lookupKey = "SEG_Persona";
        
        if(lookupKey && catalogs[lookupKey]) {
            let opts = catalogs[lookupKey].map(c => `<option value="${esc(c.GlobalID || c[f.name])}" ${val===(c.GlobalID || c[f.name])?'selected':''}>${esc(buildEntityLabel(lookupKey, c))}</option>`).join("");
            html += `<div class="field" id="field-wrap-${f.name}"><label>${f.alias}</label><select data-field="${f.name}" data-type="${f.type}" data-parent="1"><option value="">- Selecciona -</option>${opts}</select></div>`;
        }
        return; 
    }
    
    if(dom) {
      let opts = dom.map(d => `<option value="${esc(d.code)}" ${val===d.code?'selected':''}>${esc(d.name)}</option>`).join("");
      html += `<div class="field" id="field-wrap-${f.name}"><label>${f.alias}</label><select data-field="${f.name}" data-type="${f.type}"><option value="">- Selecciona -</option>${opts}</select></div>`;
    } 
    else {
      const isWeight = PARENT_RULES[key]?.weight === f.name;
      const isDate = f.type === "esriFieldTypeDate";
      const type = isDate ? "date" : ((f.name.includes("Peso") || f.name.includes("Valor") || f.type==="esriFieldTypeDouble" || f.type==="esriFieldTypeInteger" || f.type==="esriFieldTypeSmallInteger") ? "number" : "text");

      let inputVal = val;
      if (isDate && val) {
          const d = new Date(val);
          inputVal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      }

      if (largeTextFields.includes(f.name)) {
          html += `<div class="field" id="field-wrap-${f.name}"><label>${f.alias}</label><textarea data-field="${f.name}" data-type="${f.type}" rows="4" spellcheck="true" lang="es">${esc(val)}</textarea></div>`;
      } else {
          const spellAttr = type === "text" ? 'spellcheck="true" lang="es"' : '';
          html += `<div class="field" id="field-wrap-${f.name}"><label>${f.alias}</label>
            <input type="${type}" data-field="${f.name}" data-type="${f.type}" value="${esc(inputVal)}" ${isWeight?'step="0.01"':''} ${spellAttr} />
            ${isWeight ? `<span class="weight-helper" style="font-size:11px; font-weight:bold; margin-top:4px;"></span>` : ''}
          </div>`;
      }
    }
  });

  formDyn.innerHTML = `<div id="form-error" style="display:none; color:#991b1b; background:#fee2e2; border:1px solid #f87171; padding:10px; border-radius:6px; margin-bottom:15px; font-weight:600; font-size:13px;"></div><div class="formgrid">${html}</div>${hiddenHtml}`;
  document.getElementById("modal").classList.add("is-open");
  
  if(PARENT_RULES[key]) {
    const pSel = formDyn.querySelector(`select[data-field="${PARENT_RULES[key].fk}"]`);
    if(pSel) {
        pSel.addEventListener("change", (e) => {
            checkWeight(key);
            if (parentTextF) {
                const hInput = document.getElementById(`hidden-${parentTextF}`);
                if(hInput) {
                    const pEntity = PARENT_RULES[key].parent;
                    const pObj = catalogs[pEntity]?.find(x => x.GlobalID === e.target.value);
                    hInput.value = pObj ? (pObj[parentTextF] || "") : "";
                }
            }
        });
    }
    formDyn.querySelectorAll(`input[data-field="${PARENT_RULES[key].weight}"]`).forEach(i => i.addEventListener("input", () => checkWeight(key)));
    checkWeight(key);
  }

  if (key === "SEG_Asignacion") {
      const selAct = document.getElementById("sel-synthetic-actividad");
      const selTar = formDyn.querySelector('[data-field="TareaGlobalID"]');
      const updateTareas = () => {
          const actGid = selAct.value;
          const subActs = catalogs["CFG_SubActividad"]?.filter(s => s.ActividadGlobalID === actGid).map(s => s.GlobalID) || [];
          const validTareas = catalogs["CFG_Tarea"]?.filter(t => subActs.includes(t.SubActividadGlobalID)) || [];
          let opts = `<option value="">- Selecciona Tarea -</option>`;
          validTareas.forEach(t => {
              const sel = (editingRow && editingRow.attributes.TareaGlobalID === t.GlobalID) ? 'selected' : '';
              opts += `<option value="${t.GlobalID}" ${sel}>${buildEntityLabel("CFG_Tarea", t)}</option>`;
          });
          selTar.innerHTML = opts;
      };
      if (selAct && selTar) {
          selAct.addEventListener("change", updateTareas);
          if (editingRow && editingRow.attributes.TareaGlobalID) {
              const tar = catalogs["CFG_Tarea"]?.find(t => t.GlobalID === editingRow.attributes.TareaGlobalID);
              if (tar) {
                  const sub = catalogs["CFG_SubActividad"]?.find(s => s.GlobalID === tar.SubActividadGlobalID);
                  if (sub) { selAct.value = sub.ActividadGlobalID; updateTareas(); selTar.value = tar.GlobalID; }
              }
          }
      }
  }

  if (key === "SEG_Alcance") {
      const selNivel = formDyn.querySelector('[data-field="NivelJerarquia"]');
      const selObj = document.getElementById("sel-alcance-objeto");
      const updateObjetos = () => {
          const nivel = selNivel.value;
          selObj.innerHTML = `<option value="">- Seleccione Objeto -</option>`;
          if (!nivel) return;
          let catKey = "CFG_" + nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
          if(nivel.toUpperCase() === "SUBACTIVIDAD") catKey = "CFG_SubActividad";
          if(nivel.toUpperCase() === "PAC") catKey = "CFG_PAC";
          
          let opts = `<option value="">- Selecciona -</option>`;
          (catalogs[catKey] || []).forEach(i => {
               const isSel = (editingRow && (editingRow.attributes.ObjetoGlobalID === i.GlobalID || String(editingRow.attributes.ObjetoID) === String(i[catKey.replace('CFG_','')+'ID'] || i.OBJECTID))) ? 'selected' : '';
               opts += `<option value="${i.GlobalID}" ${isSel}>${buildEntityLabel(catKey, i)}</option>`;
          });
          selObj.innerHTML = opts;
      };
      if (selNivel && selObj) {
          selNivel.addEventListener("change", updateObjetos);
          if (editingRow) updateObjetos();
      }
  }

  if (key === "PLAN_TareaVigencia") {
      const elAplica = formDyn.querySelector('[data-field="AplicaTopeAcumulado"]');
      const toggleTopes = () => {
          const val = elAplica ? elAplica.value : "";
          const show = (val === "SI" || val === "Si" || val === "si");
          ["TopeAcumT1", "TopeAcumT2", "TopeAcumT3", "TopeAcumT4", "ObservacionReglaAvance"].forEach(f => {
              const wrap = document.getElementById(`field-wrap-${f}`);
              if (wrap) wrap.style.display = show ? "" : "none";
          });
      };
      if (elAplica) {
          elAplica.addEventListener("change", toggleTopes);
          toggleTopes();
      }
  }
}

formDyn.addEventListener("input", (e) => {
    if(e.target.classList.contains("field-error")) e.target.classList.remove("field-error");
    const errDiv = document.getElementById("form-error");
    if(errDiv) errDiv.style.display = "none";
});

async function checkWeight(key) {
  const rule = PARENT_RULES[key]; 
  if(!rule) return;
  const helper = formDyn.querySelector(".weight-helper"), pSel = formDyn.querySelector(`select[data-field="${rule.fk}"]`), wInp = formDyn.querySelector(`input[data-field="${rule.weight}"]`);
  if(!helper || !pSel || !wInp) return;
  
  if(!pSel.value) { 
      helper.textContent = "Selecciona el padre primero."; helper.style.color="var(--muted)"; return; 
  }
  
  const v = document.getElementById("sel-vigencia").value;
  let w = `${rule.fk}='${pSel.value}'`;
  if (!key.startsWith("CFG_") && v && metaCache[key].fieldsByName["Vigencia"]) w += ` AND Vigencia=${v}`;
  
  try {
    const r = await fetchJson(`${entityUrl(key)}/query`, { f: "json", where: w, outFields: `OBJECTID,${rule.weight}`, returnGeometry: false });
    let sum = 0; const myOid = (editingRow && !window.isDuplicating) ? editingRow.attributes.OBJECTID : null;
    (r.features || []).forEach(f => { if(f.attributes.OBJECTID !== myOid) sum += (f.attributes[rule.weight] || 0); });
    
    const current = Number(wInp.value) || 0; const total = sum + current;
    helper.textContent = `Ocupado: ${sum.toFixed(2)}% | Total con este: ${total.toFixed(2)}%`;
    helper.style.color = total > 100 ? "#d64545" : "#15803d";
    wInp.setAttribute("data-invalid", total > 100.001 ? "1" : "0");
  } catch(e) {}
}

/* ===== 7. GUARDADO CON VALIDACIONES (TOPES Y DUPLICADOS) ===== */
async function save() {
  const errDiv = document.getElementById("form-error");
  if(errDiv) errDiv.style.display = "none";

  const key = currentEntityKey, attrs = {};
  const isUpdate = !!editingRow && !window.isDuplicating;
  const isDuplicate = window.isDuplicating;
  const originalAttrs = editingRow ? editingRow.attributes : null;

  if(isUpdate) attrs.OBJECTID = originalAttrs.OBJECTID;
  else attrs.GlobalID = generateGUID(); 
  
  if(metaCache[key].fieldsByName["PersonaUltimaEdicionID"]) attrs.PersonaUltimaEdicionID = SESSION.personaID;

  formDyn.querySelectorAll("[data-field]").forEach(el => { 
    let v = el.value; const fType = el.getAttribute("data-type");
    if (v === "") v = null;
    else if (el.type === "number" || fType === "esriFieldTypeDouble" || fType === "esriFieldTypeInteger" || fType === "esriFieldTypeSmallInteger") v = Number(v);
    else if (el.type === "date" || fType === "esriFieldTypeDate") {
        if (v.includes("-")) v = new Date(v + "T12:00:00Z").getTime();
        else v = Number(v);
    }
    attrs[el.getAttribute("data-field")] = v; 
  });

  if (PARENT_RULES[key] && !attrs[PARENT_RULES[key].fk]) {
      showFormError("Debe seleccionar el nivel superior (padre) antes de guardar.");
      throw new Error("Validation Error");
  }
  if(formDyn.querySelector("[data-invalid='1']")) {
      showFormError("El peso total excede el 100%.");
      throw new Error("Validation Error");
  }

  if(key === "CFG_Actividad") attrs["Nombre"] = attrs["NombreActividad"];

  if (key === "SEG_Persona") {
      attrs["DependenciaCodigo"] = attrs["Dependencia"];
  }
  if (key === "SEG_Asignacion") {
      const vig = attrs["Vigencia"] || document.getElementById("sel-vigencia").value;
      if (!attrs["PersonaGlobalID"] || !attrs["TareaGlobalID"] || !vig) {
          showFormError("Debe seleccionar Persona, Tarea y Vigencia.");
          throw new Error("Validation Error");
      }
      attrs["ClaveUnicaAsignacion"] = `${attrs["PersonaGlobalID"]}|${attrs["TareaGlobalID"]}|${vig}`;
  }
  if (key === "SEG_Alcance") {
      const nivel = attrs["NivelJerarquia"];
      const selObjVal = document.getElementById("sel-alcance-objeto")?.value;
      if (!nivel || !selObjVal) {
          showFormError("Debe seleccionar el Nivel y el Objeto de alcance.");
          throw new Error("Validation Error");
      }
      attrs["ObjetoGlobalID"] = selObjVal;
      let catKey = "CFG_" + nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
      if(nivel.toUpperCase() === "SUBACTIVIDAD") catKey = "CFG_SubActividad";
      if(nivel.toUpperCase() === "PAC") catKey = "CFG_PAC";
      const objItem = catalogs[catKey]?.find(x => x.GlobalID === selObjVal);
      if (objItem) {
          const idField = catKey.replace("CFG_", "") + "ID";
          attrs["ObjetoID"] = objItem[idField] || objItem.CodigoTarea || objItem.CodigoSubActividad || String(objItem.OBJECTID);
      }
  }

  if (PERSON_FIELDS_CONFIG[key]) {
      for (let pConf of PERSON_FIELDS_CONFIG[key]) {
          const selGid = attrs[pConf.guidF];
          if (!selGid) {
              const inputEl = document.getElementById(`sel-${pConf.guidF}`);
              if(inputEl) { inputEl.classList.add("field-error"); inputEl.focus(); }
              showFormError(`Debe seleccionar una opción válida para ${pConf.textF} de la lista.`);
              throw new Error("Validation Error");
          }
          const personObj = catalogs["SEG_Persona"]?.find(p => p.GlobalID === selGid);
          if (!personObj) {
              showFormError(`La persona seleccionada no pudo resolverse en el catálogo.`);
              throw new Error("Validation Error");
          }
          attrs[pConf.textF] = personObj.Nombre;
      }
  }

  if (key === "PLAN_TareaVigencia" && (attrs["AplicaTopeAcumulado"] === "SI" || attrs["AplicaTopeAcumulado"] === "Si")) {
      const t1 = Number(attrs["TopeAcumT1"]) || 0; const t2 = Number(attrs["TopeAcumT2"]) || 0;
      const t3 = Number(attrs["TopeAcumT3"]) || 0; const t4 = Number(attrs["TopeAcumT4"]) || 0;
      if (!(t1 >= 0 && t1 <= t2 && t2 <= t3 && t3 <= t4 && t4 <= 100)) {
          showFormError("Los topes acumulados deben ser numéricos, crecientes y no superar 100%. Revise los valores de Máximo T1, T2, T3 y T4.");
          throw new Error("Validation Error");
      }
  }

  if (key === "REP_AvanceTarea") {
      const tareaId = attrs["TareaGlobalID"];
      const vig = attrs["Vigencia"] || document.getElementById("sel-vigencia").value;
      const perStr = attrs["Periodo"]; const valor = Number(attrs["ValorReportado"]);

      if (tareaId && vig && perStr && !isNaN(valor)) {
          let mappedPer = "";
          if (perStr.includes("1") || perStr === "T1") mappedPer = "T1";
          else if (perStr.includes("2") || perStr === "T2") mappedPer = "T2";
          else if (perStr.includes("3") || perStr === "T3") mappedPer = "T3";
          else if (perStr.includes("4") || perStr === "T4") mappedPer = "T4";

          if (mappedPer) {
              const planRes = await fetchJson(`${entityUrl("PLAN_TareaVigencia")}/query`, { f: "json", where: `TareaGlobalID='${tareaId}' AND Vigencia=${vig}`, outFields: "AplicaTopeAcumulado,TopeAcumT1,TopeAcumT2,TopeAcumT3,TopeAcumT4", returnGeometry: false });
              if (planRes.features && planRes.features.length > 0) {
                  const pAttrs = planRes.features[0].attributes;
                  if (pAttrs.AplicaTopeAcumulado === "SI" || pAttrs.AplicaTopeAcumulado === "Si") {
                      const maxVal = Number(pAttrs[`TopeAcum${mappedPer}`]);
                      if (!isNaN(maxVal) && valor > maxVal) {
                          showFormError(`Esta tarea tiene tope acumulado para ${mappedPer}. El máximo permitido es ${maxVal}%.`);
                          throw new Error("Validation Error");
                      }
                  }
              }
          }
      }
  }

  const uniqueField = UNIQUE_FIELDS[key];
  if (uniqueField && attrs[uniqueField]) {
      const codeVal = attrs[uniqueField]; const fMeta = metaCache[key].fieldsByName[uniqueField];
      const isStr = fMeta && fMeta.type === "esriFieldTypeString";
      
      let dupWhere = `${uniqueField} = ${isStr ? `'${codeVal}'` : codeVal}`;
      if (!key.startsWith("CFG_") && attrs.Vigencia && metaCache[key].fieldsByName["Vigencia"]) dupWhere += ` AND Vigencia = ${attrs.Vigencia}`;
      if (isUpdate) dupWhere += ` AND OBJECTID <> ${originalAttrs.OBJECTID}`;
      
      const dupCheck = await fetchJson(`${entityUrl(key)}/query`, { f: "json", where: dupWhere, outFields: "OBJECTID", returnGeometry: false });
      if (dupCheck.features && dupCheck.features.length > 0) {
          const inputEl = formDyn.querySelector(`[data-field="${uniqueField}"]`);
          if(inputEl) { inputEl.classList.add("field-error"); inputEl.focus(); }
          
          let errMsg = `Ya existe un registro con este identificador.`;
          if (key === "SEG_Asignacion") errMsg = "Ya existe una asignación para esta persona, tarea y vigencia.";
          else if (!key.startsWith("CFG_") && attrs.Vigencia) errMsg = `Ya existe un registro con este identificador para la vigencia ${attrs.Vigencia}.`;
          
          showFormError(errMsg);
          throw new Error("Validation Error");
      }
  }

  if (!isUpdate && (key === "PLAN_SubActividadVigencia" || key === "PLAN_TareaVigencia")) {
      const fkField = PARENT_RULES[key].fk; const fkVal = attrs[fkField];
      const vigVal = attrs.Vigencia || document.getElementById("sel-vigencia").value;
      if (fkVal && vigVal) {
          const dupWherePlan = `${fkField} = '${fkVal}' AND Vigencia = ${vigVal}`;
          const dupCheckPlan = await fetchJson(`${entityUrl(key)}/query`, { f: "json", where: dupWherePlan, outFields: "OBJECTID", returnGeometry: false });
          if (dupCheckPlan.features && dupCheckPlan.features.length > 0) {
              const errMsg = "No se puede guardar porque el registro ya existe para esta combinación de Padre y Vigencia.";
              showFormError(errMsg);
              throw new Error("Validation Error");
          }
      }
  }

  const url = `${entityUrl(key)}/applyEdits`;
  const p = isUpdate ? { updates: [{attributes: attrs}] } : { adds: [{attributes: attrs}] };
  
  try {
      const res = await postForm(url, p);
      if (res.error) throw new Error(res.error.message || "Error genérico en el servidor.");
      if (res.addResults && res.addResults.length > 0 && !res.addResults[0].success) throw new Error(`Error al crear: ${res.addResults[0].error?.description || "Desconocido"}`);
      if (res.updateResults && res.updateResults.length > 0 && !res.updateResults[0].success) throw new Error(`Error al actualizar: ${res.updateResults[0].error?.description || "Desconocido"}`);
      
      const resultingObjectId = isUpdate ? attrs.OBJECTID : res.addResults[0].objectId;
      const resultingGlobalId = isUpdate ? originalAttrs.GlobalID : attrs.GlobalID;

      if (isUpdate) {
          let changes = [];
          for(let k in attrs) {
              if (k === "OBJECTID" || k === "GlobalID" || k === "PersonaUltimaEdicionID" || (key === "CFG_Actividad" && k === "Nombre")) continue;
              const oldV = originalAttrs[k] == null ? "" : originalAttrs[k]; const newV = attrs[k] == null ? "" : attrs[k];
              if (String(oldV) !== String(newV)) changes.push({ campo: k, old: oldV, new: newV });
          }
          if (changes.length > 0) {
              await writeAuditEvent("UPDATE", key, resultingGlobalId, "OK", `Modificados ${changes.length} campos.`);
              for(let c of changes) await writeAuditHistory(key, resultingObjectId, resultingGlobalId, c.campo, c.old, c.new, "");
          }
      } else {
          await writeAuditEvent("CREATE", key, resultingGlobalId, "OK", `Registro creado exitosamente${isDuplicate ? " (Vía Duplicado)" : ""}.`);
          await writeAuditHistory(key, resultingObjectId, resultingGlobalId, "__CREATE__", "", serializeAuditRecord(attrs), "");
      }

      document.getElementById("modal").classList.remove("is-open");
      if(key.startsWith("CFG_") || key.startsWith("SEG_")) await loadCatalogs(true); 
      await loadEntity(key, false);
  } catch (err) {
      await writeAuditEvent(isUpdate ? "UPDATE" : "CREATE", key, isUpdate ? originalAttrs.GlobalID : attrs.GlobalID, "ERROR", err.message); throw err;
  }
}

document.getElementById("btn-save").addEventListener("click", async () => {
  const btn = document.getElementById("btn-save"); const originalText = btn.textContent;
  try { 
      btn.disabled = true; btn.textContent = "Guardando... ⏳"; setStatus("Verificando datos y enviando...", "info"); 
      await save(); 
      setStatus("Guardado con éxito.", "success"); 
  } catch(e) { 
      if (e.message !== "Validation Error") setStatus(e.message, "error"); 
  } finally { 
      btn.disabled = false; btn.textContent = originalText; 
  }
});

/* ===== 8. EVENTOS Y CLONACIÓN ===== */
document.getElementById("btn-close").addEventListener("click", () => document.getElementById("modal").classList.remove("is-open"));
document.getElementById("btn-reload").addEventListener("click", () => loadEntity(currentEntityKey, false));
document.getElementById("btn-new").addEventListener("click", () => openModalForm(null, false));
document.getElementById("sel-vigencia").addEventListener("change", async () => { await loadCatalogs(); if(currentEntityKey) await loadEntity(currentEntityKey, false); });
document.getElementById("sel-pac").addEventListener("change", async () => { await loadCatalogs(); if(currentEntityKey) await loadEntity(currentEntityKey, false); });

let tOut; 
document.getElementById("txt-search").addEventListener("input", () => { 
    clearTimeout(tOut); tOut = setTimeout(() => { if(currentEntityKey) loadEntity(currentEntityKey, false); }, 350); 
});

/* Lógica del Modal de Clonación Segura */
const btnOpenClone = document.getElementById("btn-open-clone");
if (btnOpenClone) {
    btnOpenClone.addEventListener("click", () => {
        if(!SESSION.isSuperAdmin) return alert("Acceso denegado: Privilegios insuficientes.");
        document.getElementById("modal-clone").classList.add("is-open");
    });
}
const btnCloseClone = document.getElementById("btn-close-clone");
if (btnCloseClone) {
    btnCloseClone.addEventListener("click", () => {
        document.getElementById("modal-clone").classList.remove("is-open");
    });
}

const btnExecClone = document.getElementById("btn-exec-clone");
if (btnExecClone) {
    btnExecClone.addEventListener("click", async () => {
        if(!SESSION.isSuperAdmin) return;
        
        const origen = document.getElementById("sel-clone-origen").value;
        const destino = document.getElementById("sel-clone-destino").value;
        const pacGid = document.getElementById("sel-pac").value;
        
        if(!origen || !destino) return alert("Debe seleccionar vigencia origen y destino.");
        if(origen === destino) return alert("El origen y el destino no pueden ser iguales.");
        
        const conf1 = confirm(`¿Está seguro de que desea clonar la vigencia ${origen} hacia la vigencia ${destino}? Esta acción creará registros nuevos en las tablas anuales de planeación.`);
        if(!conf1) return;
        
        const conf2 = confirm(`Confirme nuevamente: se clonarán masivamente registros desde ${origen} hacia ${destino}. No debe ejecutar este proceso dos veces para la misma combinación.`);
        if(!conf2) return;
        
        btnExecClone.disabled = true;
        btnExecClone.textContent = "Clonando... ⏳";
        setStatus(`Iniciando clonación de ${origen} a ${destino}...`, "info");
        
        try {
            const resSub = await processClone("PLAN_SubActividadVigencia", origen, destino, "SubActividadGlobalID", pacGid);
            const resTar = await processClone("PLAN_TareaVigencia", origen, destino, "TareaGlobalID", pacGid);
            
            const msg = `Clonación finalizada:\n\n- PLAN_SubActividadVigencia: ${resSub.created} creados, ${resSub.skipped} omitidos, ${resSub.errors} errores\n- PLAN_TareaVigencia: ${resTar.created} creados, ${resTar.skipped} omitidos, ${resTar.errors} errores`;
            
            alert(msg);
            setStatus("Clonación completada.", "success");
            
            await writeAuditEvent("CLONE_VIGENCIA", "PLAN_SubActividadVigencia / PLAN_TareaVigencia", "", "OK", `Clonación de ${origen} hacia ${destino}. SubActividades: ${resSub.created}. Tareas: ${resTar.created}.`);
            
            document.getElementById("modal-clone").classList.remove("is-open");
            if(currentEntityKey) await loadEntity(currentEntityKey, false);
        } catch(e) {
            setStatus(`Error crítico en clonación: ${e.message}`, "error");
            await writeAuditEvent("CLONE_VIGENCIA", "Varias", "", "ERROR", e.message);
        } finally {
            btnExecClone.disabled = false;
            btnExecClone.textContent = "Ejecutar";
        }
    });
}

async function processClone(entityKey, origen, destino, fkField, pacGid) {
    const result = { created: 0, skipped: 0, errors: 0 };
    const sourceRes = await fetchJson(`${entityUrl(entityKey)}/query`, { f:"json", where:`Vigencia=${origen}`, outFields:"*", returnGeometry:false });
    let sourceRows = sourceRes.features || [];
    if(sourceRows.length === 0) return result;
    
    const validGuids = getGuidsInPac(entityKey, pacGid);
    if (validGuids !== null) {
        sourceRows = sourceRows.filter(r => validGuids.includes(r.attributes[fkField]));
    }
    if(sourceRows.length === 0) return result;
    
    const targetRes = await fetchJson(`${entityUrl(entityKey)}/query`, { f:"json", where:`Vigencia=${destino}`, outFields:fkField, returnGeometry:false });
    const targetRows = targetRes.features || [];
    const existingFks = new Set(targetRows.map(r => r.attributes[fkField]));
    
    const adds = [];
    for(let row of sourceRows) {
        const attrs = row.attributes;
        const fkVal = attrs[fkField];
        if(existingFks.has(fkVal)) { result.skipped++; continue; }
        
        const newAttrs = { ...attrs };
        delete newAttrs.OBJECTID;
        newAttrs.GlobalID = generateGUID();
        newAttrs.Vigencia = Number(destino);
        
        delete newAttrs.CreationDate; delete newAttrs.Creator; delete newAttrs.EditDate; delete newAttrs.Editor;
        if(newAttrs.PersonaUltimaEdicionID !== undefined) newAttrs.PersonaUltimaEdicionID = SESSION.personaID;
        
        adds.push({ attributes: newAttrs });
    }
    
    if(adds.length === 0) return result;
    const chunkSize = 100;
    for(let i=0; i<adds.length; i+=chunkSize) {
        const chunk = adds.slice(i, i+chunkSize);
        try {
            const postRes = await postForm(`${entityUrl(entityKey)}/applyEdits`, { adds: chunk });
            if(postRes.addResults) {
                postRes.addResults.forEach(r => { if(r.success) result.created++; else result.errors++; });
            }
        } catch(e) {
            console.error(`Error clonando chunk de ${entityKey}:`, e);
            result.errors += chunk.length;
        }
    }
    return result;
}