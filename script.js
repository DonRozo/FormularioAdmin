/* ===========================================================
   DATA-PAC | Admin OAP V3 (script.js)
   - OTP Auth, RBAC, Sorting, Formularios Reales, Pesos
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

// Reglas V2 Restauradas
const PARENT_RULES = {
  CFG_Linea: { fk: "PACGlobalID", parent: "CFG_PAC", weight: "Peso" },
  CFG_Programa: { fk: "LineaGlobalID", parent: "CFG_Linea", weight: "Peso" },
  CFG_Proyecto: { fk: "ProgramaGlobalID", parent: "CFG_Programa", weight: "Peso" },
  CFG_Objetivo: { fk: "ProyectoGlobalID", parent: "CFG_Proyecto", weight: "Peso" },
  CFG_Actividad: { fk: "ObjetivoGlobalID", parent: "CFG_Objetivo", weight: "Peso" },
  PLAN_SubActividadVigencia: { fk: "SubActividadGlobalID", parent: "CFG_SubActividad", weight: "PesoSubActividad" },
  PLAN_TareaVigencia: { fk: "TareaGlobalID", parent: "CFG_Tarea", weight: "PesoTarea" }
};
const FK_MAPPING = {
  PACGlobalID: "CFG_PAC", LineaGlobalID: "CFG_Linea", ProgramaGlobalID: "CFG_Programa",
  ProyectoGlobalID: "CFG_Proyecto", ObjetivoGlobalID: "CFG_Objetivo", ActividadGlobalID: "CFG_Actividad",
  SubActividadGlobalID: "CFG_SubActividad", TareaGlobalID: "CFG_Tarea", PersonaGlobalID: "SEG_Persona",
  RolID: "SEG_Rol"
};
const CHILDREN_RULES = [
  { parent: "CFG_PAC", child: "CFG_Linea", fk: "PACGlobalID" }, { parent: "CFG_Linea", child: "CFG_Programa", fk: "LineaGlobalID" },
  { parent: "CFG_Programa", child: "CFG_Proyecto", fk: "ProgramaGlobalID" }, { parent: "CFG_Proyecto", child: "CFG_Objetivo", fk: "ProyectoGlobalID" },
  { parent: "CFG_Objetivo", child: "CFG_Actividad", fk: "ObjetivoGlobalID" }, { parent: "CFG_Actividad", child: "CFG_SubActividad", fk: "ActividadGlobalID" },
  { parent: "CFG_SubActividad", child: "CFG_Tarea", fk: "SubActividadGlobalID" }, { parent: "CFG_SubActividad", child: "PLAN_SubActividadVigencia", fk: "SubActividadGlobalID" },
  { parent: "CFG_Tarea", child: "PLAN_TareaVigencia", fk: "TareaGlobalID" }
];

/* ===== Estado ===== */
const SESSION = { personaID: null, personaGlobalID: null, nombre: null, roles: [], isSuperAdmin: false, isVisualizador: false, maxPerm: "Ver", allowedGuids: {}, assignedTasks: new Set(), tablePermissions: {} };
let currentEntityKey = null, currentRows = [], editingRow = null, metaCache = {}, catalogs = {};
let currentSort = { col: null, dir: 0 }; // 0: none, 1: asc, -1: desc

const uiApp = document.getElementById("app-main"), elStatus = document.getElementById("status"), elOtpStatus = document.getElementById("otp-status"), modal = document.getElementById("modal"), formDyn = document.getElementById("form-dynamic");

function setStatus(msg, type="info", isOtp=false){
  const el = isOtp ? elOtpStatus : elStatus; if(!el) return;
  el.textContent = (type==="error"?"❌ ":(type==="success"?"✅ ":"ℹ️ ")) + msg;
  el.style.color = type==="error" ? "#d64545" : "inherit";
}
function esc(s){ return (s??"").toString().replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function entityUrl(key){ return `${SERVICE_URL}/${ENTITY[key].id}`; }
function isReadOnly(key){ return HARD_READONLY.has(key) || !hasWritePermission(key); }
function canDelete(){ return SESSION.isSuperAdmin; } // Borrado exclusivo Superadmin
function generateGUID() { return '{' + crypto.randomUUID().toUpperCase() + '}'; }

async function fetchJson(url, params){
  const u = new URL(url); Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r = await fetch(u.toString(), { method:"GET" }); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json();
}
async function postForm(url, obj){
  const form = new URLSearchParams(); form.append("f", "json");
  if(obj.adds) form.append("adds", JSON.stringify(obj.adds));
  if(obj.updates) form.append("updates", JSON.stringify(obj.updates));
  if(obj.deletes) form.append("deletes", obj.deletes);
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}

/* ===========================================================
   1. AUTENTICACIÓN OTP (V3)
   =========================================================== */
document.getElementById("btn-request-otp").addEventListener("click", async () => {
  const ced = document.getElementById("inp-cedula").value.trim(), cor = document.getElementById("inp-correo").value.trim().toLowerCase(), btn = document.getElementById("btn-request-otp");
  if(!ced || !cor) return setStatus("Ingresa cédula y correo.", "error", true);
  btn.disabled = true; btn.textContent = "Validando..."; setStatus("Verificando...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_Persona")+"/query", { f:"json", where:`Cedula='${ced}' AND Correo='${cor}' AND Activo='SI'`, outFields:"GlobalID,PersonaID,Nombre", returnGeometry:false });
    if(!res.features?.length) throw new Error("Credenciales inválidas.");
    const p = res.features[0].attributes; SESSION.personaGlobalID = p.GlobalID; SESSION.personaID = p.PersonaID; SESSION.nombre = p.Nombre;
    btn.textContent = "Generando código...";
    const webhookRes = await fetch(URL_WEBHOOK_POWERAUTOMATE, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({cedula: ced, correo: cor}) });
    if(webhookRes.status === 200 || webhookRes.status === 202) {
        document.getElementById("otp-step-1").classList.add("is-hidden"); document.getElementById("otp-step-2").classList.remove("is-hidden"); setStatus("Código enviado.", "success", true);
    } else throw new Error(`Error PA: ${webhookRes.status}`);
  } catch(e) { setStatus(e.message, "error", true); } finally { btn.disabled = false; btn.textContent = "Solicitar Código"; }
});

document.getElementById("btn-verify-otp").addEventListener("click", async () => {
  const code = document.getElementById("inp-codigo").value.trim(); if(!code) return;
  setStatus("Validando código...", "info", true);
  try {
    const res = await fetchJson(entityUrl("SEG_OTP")+"/query", { f:"json", where:`PersonaGlobalID='${SESSION.personaGlobalID}' AND CodigoHash='${code}' AND Usado='NO'`, outFields:"OBJECTID", returnGeometry:false });
    if(!res.features?.length) throw new Error("Código incorrecto.");
    await postForm(entityUrl("SEG_OTP")+"/applyEdits", { updates:[{attributes:{OBJECTID: res.features[0].attributes.OBJECTID, Usado:'SI'}}] });
    await initSession();
  } catch(e) { setStatus(e.message, "error", true); }
});

document.getElementById("btn-back-otp").addEventListener("click", () => {
  document.getElementById("otp-step-2").classList.add("is-hidden"); document.getElementById("otp-step-1").classList.remove("is-hidden"); setStatus("", "info", true);
});

/* ===========================================================
   2. CARGA DE SESIÓN, ROLES Y CATÁLOGOS
   =========================================================== */
async function initSession() {
  setStatus("Cargando perfil...", "info", true);
  try {
    const resR = await fetchJson(entityUrl("SEG_PersonaRol")+"/query", { f:"json", where:`PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields:"RolID", returnGeometry:false });
    SESSION.roles = (resR.features||[]).map(f => f.attributes.RolID);
    if(SESSION.roles.includes("SUPERADMIN")) SESSION.isSuperAdmin = true;
    if(SESSION.roles.length === 1 && SESSION.roles[0] === "VISUALIZADOR") SESSION.isVisualizador = true;

    const resA = await fetchJson(entityUrl("SEG_Alcance")+"/query", { f:"json", where:`PersonaID='${SESSION.personaID}' AND Activo='SI'`, outFields:"NivelJerarquia,ObjetoGlobalID,Permiso", returnGeometry:false });
    const alcances = (resA.features||[]).map(f => f.attributes);
    const permWeight = {"Ver":1, "Revisar":2, "Aprobar":3, "Editar":4, "Administrar":5}; let maxW = 0;
    alcances.forEach(a => { if(permWeight[a.Permiso] > maxW) { maxW = permWeight[a.Permiso]; SESSION.maxPerm = a.Permiso; }});
    if(SESSION.isSuperAdmin) SESSION.maxPerm = "Administrar";

    const resAsig = await fetchJson(entityUrl("SEG_Asignacion")+"/query", { f:"json", where:`PersonaGlobalID='${SESSION.personaGlobalID}' AND Activo='SI'`, outFields:"TareaGlobalID", returnGeometry:false });
    (resAsig.features||[]).forEach(f => SESSION.assignedTasks.add(f.attributes.TareaGlobalID));
    if(!SESSION.isSuperAdmin) await resolveHierarchy(alcances);

    await loadCatalogs();
    document.getElementById("otp-overlay").style.display = "none"; uiApp.style.display = "flex";
    document.getElementById("pill-user").textContent = `Usuario: ${SESSION.nombre} (${SESSION.roles.join(", ")})`;
    buildDynamicMenu();
  } catch(e) { setStatus(e.message, "error", true); }
}

async function resolveHierarchy(alcances) {
  const cfgs = ["CFG_PAC","CFG_Linea","CFG_Programa","CFG_Proyecto","CFG_Objetivo","CFG_Actividad","CFG_SubActividad","CFG_Tarea"];
  cfgs.forEach(c => SESSION.allowedGuids[c] = new Set());
  alcances.forEach(alc => {
    let k = `CFG_${alc.NivelJerarquia.charAt(0) + alc.NivelJerarquia.slice(1).toLowerCase()}`;
    if(alc.NivelJerarquia==="SUBACTIVIDAD") k = "CFG_SubActividad"; if(alc.NivelJerarquia==="PAC") k = "CFG_PAC";
    if(SESSION.allowedGuids[k] && alc.ObjetoGlobalID) SESSION.allowedGuids[k].add(alc.ObjetoGlobalID);
  });
  const arbol = {};
  for(let c of cfgs) {
    const r = await fetchJson(entityUrl(c)+"/query", {f:"json", where:"1=1", outFields:"GlobalID,PACGlobalID,LineaGlobalID,ProgramaGlobalID,ProyectoGlobalID,ObjetivoGlobalID,ActividadGlobalID,SubActividadGlobalID", returnGeometry:false});
    arbol[c] = (r.features||[]).map(f=>f.attributes);
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

async function loadCatalogs() {
  const v = document.getElementById("sel-vigencia").value; const vigW = v ? `Vigencia=${v}` : "1=1";
  async function fetchCat(k, nameF, extra=""){
    const w = (metaCache[k]?.fieldsByName?.["Vigencia"]) ? vigW : "1=1";
    const r = await fetchJson(`${entityUrl(k)}/query`, { f:"json", where:w, outFields:`GlobalID,${nameF}${extra}`, orderByFields:`${nameF} ASC`, returnGeometry:false });
    catalogs[k] = (r.features||[]).map(f=>f.attributes);
  }
  if(!metaCache["CFG_PAC"]) { for(let k of Object.keys(FK_MAPPING)) await getMeta(FK_MAPPING[k]); }
  await fetchCat("CFG_PAC", "Nombre", ",PACID"); await fetchCat("CFG_Linea", "Nombre", ",LineaID");
  await fetchCat("CFG_Programa", "Nombre", ",ProgramaID"); await fetchCat("CFG_Proyecto", "Nombre", ",ProyectoID");
  await fetchCat("CFG_Objetivo", "Nombre", ",ObjetivoID"); await fetchCat("CFG_Actividad", "NombreActividad", ",ActividadID");
  await fetchCat("CFG_SubActividad", "NombreSubActividad", ",CodigoSubActividad"); await fetchCat("CFG_Tarea", "NombreTarea", ",CodigoTarea");
  await fetchCat("SEG_Persona", "Nombre", ",Cedula"); await fetchCat("SEG_Rol", "NombreRol", ",RolID");
}
function labelCatalog(entity, a) {
  if(!a) return "";
  if(entity.includes("PAC")) return `${a.PACID||""} - ${a.Nombre||""}`; if(entity.includes("Linea")) return `${a.LineaID||""} - ${a.Nombre||""}`;
  if(entity.includes("Programa")) return `${a.ProgramaID||""} - ${a.Nombre||""}`; if(entity.includes("Proyecto")) return `${a.ProyectoID||""} - ${a.Nombre||""}`;
  if(entity.includes("Objetivo")) return `${a.ObjetivoID||""} - ${a.Nombre||""}`; if(entity.includes("Actividad")) return `${a.ActividadID||""} - ${a.NombreActividad||""}`;
  if(entity.includes("SubActividad")) return `${a.CodigoSubActividad||""} - ${a.NombreSubActividad||""}`; if(entity.includes("Tarea")) return `${a.CodigoTarea||""} - ${a.NombreTarea||""}`;
  if(entity.includes("Persona")) return `${a.Nombre||""} (${a.Cedula||""})`; if(entity.includes("Rol")) return `${a.NombreRol||""}`;
  return a.GlobalID || "";
}

/* ===== 3. MENÚ DINÁMICO & SEGURIDAD ===== */
function buildDynamicMenu() {
  const nav = document.getElementById("navlist"); nav.innerHTML = "";
  const groups = [ { label: "Configuración Base", prefix: "CFG_" }, { label: "Planeación", prefix: "PLAN_" }, { label: "Reportes Operativos", prefix: "REP_" }, { label: "Aprobaciones", prefix: "WF_" }, { label: "Analítica y Finanzas", prefixes: ["BI_", "FIN_"] }, { label: "Seguridad y Auditoría", prefixes: ["SEG_", "AUD_"] } ];
  let vis = new Set();
  if(SESSION.isSuperAdmin) Object.keys(ENTITY).forEach(k => vis.add(k));
  else {
    if(SESSION.roles.includes("PUBLICADOR")) { ["WF_SolicitudRevision", "WF_AprobacionPaso", "CFG_PAC", "CFG_Linea", "BI_AvanceActividad", "BI_AvanceObjetivo", "BI_AvanceProyecto", "BI_AvancePrograma", "BI_AvanceLinea", "BI_AvancePAC"].forEach(t => vis.add(t)); ["CFG_Programa", "CFG_Proyecto", "CFG_Objetivo", "CFG_Actividad", "REP_AvanceTarea", "REP_ReporteNarrativo"].forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; }); }
    if(SESSION.roles.includes("APROBADOR")) Object.keys(ENTITY).filter(k => k.startsWith("CFG_") || k.startsWith("PLAN_") || k.startsWith("REP_") || k.startsWith("WF_") || k.startsWith("FIN_")).forEach(t => vis.add(t));
    if(SESSION.roles.includes("EDITOR")) { Object.keys(ENTITY).filter(k => k.startsWith("CFG_")).forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; }); ["REP_AvanceTarea", "REP_ReporteNarrativo", "WF_SolicitudRevision"].forEach(t => vis.add(t)); }
    if(SESSION.isVisualizador) Object.keys(ENTITY).filter(k => k.startsWith("BI_") || k.startsWith("FIN_") || k.startsWith("CFG_")).forEach(t => { vis.add(t); SESSION.tablePermissions[t] = "Ver"; });
  }
  groups.forEach(g => {
    let html = `<div class="navgroup">${g.label}</div>`, has = false;
    Object.keys(ENTITY).forEach(k => {
      if((g.prefix ? k.startsWith(g.prefix) : g.prefixes.some(p => k.startsWith(p))) && vis.has(k)) {
        has = true; html += `<button class="navitem" onclick="loadEntity('${k}')"><span class="navitem__title">${k}</span></button>`;
      }
    });
    if(has) nav.innerHTML += html;
  });
}
function hasWritePermission(key) {
  if(HARD_READONLY.has(key)) return false; if(SESSION.isSuperAdmin) return true;
  if(SESSION.tablePermissions[key] === "Ver" || SESSION.maxPerm === "Ver") return false; return true;
}
function buildWhere(key) {
  let w = "1=1", vig = document.getElementById("sel-vigencia").value;
  if(vig && metaCache[key]?.fieldsByName?.["Vigencia"]) w += ` AND Vigencia = ${vig}`;
  if(SESSION.isSuperAdmin) return w;
  if(SESSION.allowedGuids[key]) {
    const guids = Array.from(SESSION.allowedGuids[key]); if(!guids.length) return "1=0";
    w += ` AND GlobalID IN (${guids.map(g => `'${g}'`).join(",")})`;
  }
  if(["REP_AvanceTarea", "PLAN_TareaVigencia"].includes(key)) {
    const tG = Array.from(SESSION.assignedTasks); if(!tG.length && SESSION.maxPerm === "Ver") return "1=0"; 
    if(tG.length) w += ` AND TareaGlobalID IN (${tG.map(g => `'${g}'`).join(",")})`;
  }
  return w;
}

/* ===== 4. TABLA CON ORDENAMIENTO ===== */
async function getMeta(key){
  if(metaCache[key]) return metaCache[key];
  const m = await fetchJson(`${entityUrl(key)}?f=pjson`);
  const fieldsByName = {}, domainsByField = {};
  m.fields.forEach(f => { fieldsByName[f.name] = f; if(f.domain?.codedValues) domainsByField[f.name] = f.domain.codedValues; });
  
  // EL ERROR ESTABA AQUÍ: Se cambió "fields" por "fields: m.fields"
  metaCache[key] = { fields: m.fields, fieldsByName, domainsByField }; 
  return metaCache[key];
}

async function loadEntity(key) {
  currentEntityKey = key; document.querySelectorAll(".navitem").forEach(b => { b.classList.toggle("is-active", b.textContent.includes(key)); });
  document.getElementById("h-entity").textContent = key;
  document.getElementById("btn-new").style.display = (hasWritePermission(key) && !key.startsWith("WF_")) ? "inline-flex" : "none";
  setStatus("Cargando datos..."); await getMeta(key);
  const r = await fetchJson(`${entityUrl(key)}/query`, { f:"json", where: buildWhere(key), outFields: "*", returnGeometry:false });
  currentRows = r.features || []; currentSort = { col: null, dir: 0 };
  renderTable(); setStatus(`Cargados ${currentRows.length} registros.`, "success");
}

window.toggleSort = function(col) {
  if(currentSort.col === col) { currentSort.dir = currentSort.dir === 1 ? -1 : (currentSort.dir === -1 ? 0 : 1); if(!currentSort.dir) currentSort.col = null; } 
  else { currentSort.col = col; currentSort.dir = 1; }
  renderTable();
};

function renderTable() {
  const key = currentEntityKey, canWrite = hasWritePermission(key), canDel = canDelete();
  let fields = metaCache[key].fields.filter(f => f.name === "OBJECTID" || (!f.name.includes("GlobalID") && !f.name.includes("Guid") && f.name !== "PersonaID" && f.name !== "IndicadorID"));
  
  let sortedRows = [...currentRows];
  if(currentSort.col) {
    sortedRows.sort((a,b) => {
      let va = a.attributes[currentSort.col], vb = b.attributes[currentSort.col];
      if(va === vb) return 0; if(va == null) return 1; if(vb == null) return -1;
      if(typeof va === 'string') return va.localeCompare(vb) * currentSort.dir;
      return (va < vb ? -1 : 1) * currentSort.dir;
    });
  }

  const ths = fields.map(f => {
    let c = ""; if(currentSort.col === f.name) c = currentSort.dir === 1 ? "sort-asc" : "sort-desc";
    return `<th class="sortable ${c}" onclick="toggleSort('${f.name}')">${f.alias}</th>`;
  }).join("");
  document.getElementById("tbl-head").innerHTML = `<tr><th style="width:160px;">Acciones</th>${ths}</tr>`;

  document.getElementById("tbl-body").innerHTML = sortedRows.map(r => {
    const oid = r.attributes.OBJECTID;
    let tds = `<td><div class="rowactions">
      <button class="btn btn--ghost btn-xs" onclick="openModalForm(${oid})" ${canWrite?'':'disabled'}>${canWrite?'Editar':'Ver'}</button>
      ${canDel ? `<button class="btn btn--danger btn-xs" onclick="confirmDelete(${oid})">Eliminar</button>` : ''}
    </div></td>`;
    tds += fields.map(f => {
      let v = r.attributes[f.name]; if(f.type === "esriFieldTypeDate" && v) v = new Date(v).toLocaleDateString();
      return `<td>${esc(v)}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

/* ===== 5. FORMULARIOS REALES (V2->V3) ===== */
function openModalForm(oid = null) {
  const key = currentEntityKey; editingRow = oid ? currentRows.find(x => x.attributes.OBJECTID === oid) : null;
  document.getElementById("modal-title").textContent = oid ? `Editar ${key}` : `Nuevo ${key}`;
  document.getElementById("btn-delete").style.display = (oid && canDelete()) ? "inline-flex" : "none";
  document.getElementById("btn-save").style.display = hasWritePermission(key) ? "inline-flex" : "none";
  
  let html = "";
  metaCache[key].fields.forEach(f => {
    if(f.name === "OBJECTID" || f.name.includes("GlobalID") || f.name.includes("Guid") || f.name==="PersonaID") {
      // Ocultos para el DOM interno si es necesario, pero no visibles. GlobalID lo generamos si es nuevo.
      return; 
    }
    const val = editingRow ? editingRow.attributes[f.name] : (f.name === "Vigencia" ? document.getElementById("sel-vigencia").value : "");
    const dom = metaCache[key].domainsByField[f.name];
    const isFK = FK_MAPPING[f.name]; // Si es llave como RolID
    
    if(dom) {
      let opts = dom.map(d => `<option value="${esc(d.code)}" ${val===d.code?'selected':''}>${esc(d.name)}</option>`).join("");
      html += `<div class="field"><label>${f.alias}</label><select data-field="${f.name}"><option value="">- Selecciona -</option>${opts}</select></div>`;
    } 
    else if(isFK && catalogs[FK_MAPPING[f.name]]) {
      let opts = catalogs[FK_MAPPING[f.name]].map(c => `<option value="${esc(c.GlobalID || c[f.name])}" ${val===(c.GlobalID || c[f.name])?'selected':''}>${esc(labelCatalog(FK_MAPPING[f.name], c))}</option>`).join("");
      html += `<div class="field"><label>${f.alias}</label><select data-field="${f.name}" data-parent="1"><option value="">- Selecciona -</option>${opts}</select></div>`;
    }
    else {
      const type = (f.name.includes("Peso") || f.name.includes("Valor") || f.type==="esriFieldTypeDouble") ? "number" : "text";
      const isWeight = PARENT_RULES[key]?.weight === f.name;
      html += `<div class="field"><label>${f.alias}</label>
        <input type="${type}" data-field="${f.name}" value="${esc(val)}" ${isWeight?'step="0.01"':''} />
        ${isWeight ? `<span class="weight-helper" style="font-size:11px; font-weight:bold; margin-top:4px;"></span>` : ''}
      </div>`;
    }
  });

  // Añadir los FKs GlobalID ocultos pero conectados al formulario para que viajen en el payload
  metaCache[key].fields.forEach(f => {
    if(FK_MAPPING[f.name] && f.name.includes("GlobalID")) {
      const val = editingRow ? editingRow.attributes[f.name] : "";
      let opts = catalogs[FK_MAPPING[f.name]].map(c => `<option value="${esc(c.GlobalID)}" ${val===c.GlobalID?'selected':''}>${esc(labelCatalog(FK_MAPPING[f.name], c))}</option>`).join("");
      html += `<div class="field"><label>${f.alias}</label><select data-field="${f.name}" data-parent="1" data-fk="1"><option value="">- Selecciona -</option>${opts}</select></div>`;
    }
  });

  formDyn.innerHTML = `<div class="formgrid">${html}</div>`;
  document.getElementById("modal").classList.add("is-open");
  
  if(PARENT_RULES[key]) {
    formDyn.querySelectorAll("select[data-parent]").forEach(s => s.addEventListener("change", () => checkWeight(key)));
    formDyn.querySelectorAll(`input[data-field="${PARENT_RULES[key].weight}"]`).forEach(i => i.addEventListener("input", () => checkWeight(key)));
    checkWeight(key);
  }
}

async function checkWeight(key) {
  const rule = PARENT_RULES[key]; if(!rule) return;
  const helper = formDyn.querySelector(".weight-helper"), pSel = formDyn.querySelector(`select[data-field="${rule.fk}"]`), wInp = formDyn.querySelector(`input[data-field="${rule.weight}"]`);
  if(!helper || !pSel || !wInp) return;
  if(!pSel.value) { helper.textContent = "Selecciona el padre primero."; helper.style.color="var(--muted)"; return; }
  
  const v = document.getElementById("sel-vigencia").value;
  const w = `${rule.fk}='${pSel.value}'` + (v && metaCache[key].fieldsByName["Vigencia"] ? ` AND Vigencia=${v}` : "");
  try {
    const r = await fetchJson(`${entityUrl(key)}/query`, { f:"json", where:w, outFields:`OBJECTID,${rule.weight}`, returnGeometry:false });
    let sum = 0; const myOid = editingRow?.attributes?.OBJECTID;
    (r.features||[]).forEach(f => { if(f.attributes.OBJECTID !== myOid) sum += (f.attributes[rule.weight]||0); });
    const current = Number(wInp.value)||0; const total = sum + current;
    helper.textContent = `Ocupado: ${sum.toFixed(2)}% | Total con este: ${total.toFixed(2)}%`;
    helper.style.color = total > 100 ? "#d64545" : "#15803d";
    wInp.setAttribute("data-invalid", total > 100.001 ? "1" : "0");
  } catch(e) {}
}

async function save() {
  const key = currentEntityKey, attrs = {};
  if(editingRow) attrs.OBJECTID = editingRow.attributes.OBJECTID;
  else attrs.GlobalID = generateGUID(); // Generar en cliente para nuevos
  
  // Trazabilidad V3
  if(metaCache[key].fieldsByName["PersonaUltimaEdicionID"]) attrs.PersonaUltimaEdicionID = SESSION.personaID;

  formDyn.querySelectorAll("[data-field]").forEach(el => { 
    let v = el.value; if(el.type==="number" && v!=="") v = Number(v); if(v==="") v = null;
    attrs[el.getAttribute("data-field")] = v; 
  });

  if(formDyn.querySelector("[data-invalid='1']")) throw new Error("El peso total excede el 100%.");

  const url = `${entityUrl(key)}/applyEdits`;
  const p = editingRow ? { updates: [{attributes:attrs}] } : { adds: [{attributes:attrs}] };
  const res = await postForm(url, p);
  if(res.error || (res.addResults && !res.addResults[0].success) || (res.updateResults && !res.updateResults[0].success)) throw new Error("Error en servidor al guardar.");
  
  document.getElementById("modal").classList.remove("is-open");
  await loadEntity(key);
}

document.getElementById("btn-save").addEventListener("click", async () => {
  const btn = document.getElementById("btn-save"); btn.disabled=true;
  try { await save(); setStatus("Guardado con éxito.", "success"); } catch(e) { setStatus(e.message, "error"); } finally { btn.disabled=false; }
});

/* ===== 6. BORRADO CON REGLAS ===== */
document.getElementById("btn-delete").addEventListener("click", async () => {
  const key = currentEntityKey; if(!editingRow || !canDelete()) return;
  const btn = document.getElementById("btn-delete"); btn.disabled=true;
  try {
    const parentGid = editingRow.attributes.GlobalID;
    if(parentGid) {
      for(let r of CHILDREN_RULES.filter(x => x.parent === key)) {
        const check = await fetchJson(`${entityUrl(r.child)}/query`, { f:"json", where:`${r.fk}='${parentGid}'`, outFields:"OBJECTID", returnGeometry:false });
        if(check.features?.length > 0) throw new Error(`No se puede eliminar: tiene registros hijos en ${r.child}.`);
      }
    }
    await postForm(`${entityUrl(key)}/applyEdits`, { deletes: String(editingRow.attributes.OBJECTID) });
    document.getElementById("modal").classList.remove("is-open"); await loadEntity(key); setStatus("Eliminado.", "success");
  } catch(e) { setStatus(e.message, "error"); } finally { btn.disabled=false; }
});

/* ===== 7. EVENTOS GENERALES ===== */
document.getElementById("btn-close").addEventListener("click", () => document.getElementById("modal").classList.remove("is-open"));
document.getElementById("btn-reload").addEventListener("click", () => loadEntity(currentEntityKey));
document.getElementById("btn-new").addEventListener("click", () => openModalForm(null));
document.getElementById("sel-vigencia").addEventListener("change", async () => { await loadCatalogs(); if(currentEntityKey) await loadEntity(currentEntityKey); });
let tOut; document.getElementById("txt-search").addEventListener("input", () => { clearTimeout(tOut); tOut = setTimeout(() => loadEntity(currentEntityKey), 300); });