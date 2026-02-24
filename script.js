/* ===========================================================
   DATA-PAC | Admin OAP (script.js) - Drawer Tablas FUNCIONAL
   - Funciona con tu index.html real (panel--nav2 / panel--content2)
   - Inyecta botón "☰ Tablas" en el encabezado
   - Agrega overlay y cierra con click fuera / ESC
   =========================================================== */

const SERVICE_URL =
  "https://services6.arcgis.com/yq6pe3Lw2oWFjWtF/arcgis/rest/services/DATAPAC_V1/FeatureServer";

const ENTITY = {
  CFG_PAC:        { id: 1,  pk: "PACID" },
  CFG_Linea:      { id: 2,  pk: "LineaID" },
  CFG_Programa:   { id: 3,  pk: "ProgramaID" },
  CFG_Proyecto:   { id: 4,  pk: "ProyectoID" },
  CFG_Objetivo:   { id: 5,  pk: "ObjetivoID" },
  CFG_Actividad:  { id: 6,  pk: "ActividadID" },
  CFG_Indicador:  { id: 7,  pk: "IndicadorID" },
  SEG_Persona:    { id: 8,  pk: "PersonaID" },
  SEG_Asignacion: { id: 9,  pk: "AsignacionID" },
  SEG_OTP:        { id: 10, pk: "OTPID" }
};

const FRIENDLY = {
  CFG_PAC: "PAC",
  CFG_Linea: "Líneas",
  CFG_Programa: "Programas",
  CFG_Proyecto: "Proyectos",
  CFG_Objetivo: "Objetivos",
  CFG_Actividad: "Actividades",
  CFG_Indicador: "Indicadores",
  SEG_Persona: "Personas",
  SEG_Asignacion: "Asignaciones",
  SEG_OTP: "OTP (auditoría)"
};

const FRIENDLY_DESC = {
  CFG_PAC: "Configuración base del PAC (raíz).",
  CFG_Linea: "Líneas estratégicas del PAC (dependen del PAC).",
  CFG_Programa: "Programas (dependen de una Línea).",
  CFG_Proyecto: "Proyectos (dependen de un Programa).",
  CFG_Objetivo: "Objetivos (dependen de un Proyecto).",
  CFG_Actividad: "Actividades (dependen de un Objetivo).",
  CFG_Indicador: "Indicadores (dependen de una Actividad).",
  SEG_Persona: "Usuarios y datos básicos para el reporte.",
  SEG_Asignacion: "Qué persona reporta qué actividad/indicador.",
  SEG_OTP: "Auditoría y control de códigos OTP."
};

const FIELDS = {
  CFG_PAC:       ["PACID","Nombre","Peso","Vigencia"],
  CFG_Linea:     ["LineaID","PACID","Nombre","Peso","Vigencia"],
  CFG_Programa:  ["ProgramaID","LineaID","Nombre","Peso","Vigencia"],
  CFG_Proyecto:  ["ProyectoID","ProgramaID","Nombre","Peso","Vigencia"],
  CFG_Objetivo:  ["ObjetivoID","ProyectoID","Nombre","Peso","Vigencia"],
  CFG_Actividad: ["ActividadID","ObjetivoID","Nombre","Peso","Vigencia","Activo"],
  CFG_Indicador: ["IndicadorID","ActividadID","CodigoIndicador","NombreIndicador","UnidadMedida","MetaAnual","PesoIndicador","MetodoCalculo","Vigencia","Activo","Descripcion","LineaBase","Meta","Clasificacion","Entidad"],
  SEG_Persona:   ["PersonaID","Cedula","Nombre","Correo","Dependencia","Activo"],
  SEG_Asignacion:["AsignacionID","PersonaID","ActividadID","IndicadorID","Vigencia","Activo"],
  SEG_OTP:       ["OTPID","PersonaID","Correo","CodigoHash","CodigoUlt4","FechaEnvio","FechaExpira","Usado","Intentos","IP","UserAgent"]
};

const COL_LABEL = {
  PACID:"Código PAC", LineaID:"Código Línea", ProgramaID:"Código Programa", ProyectoID:"Código Proyecto",
  ObjetivoID:"Código Objetivo", ActividadID:"Código Actividad", IndicadorID:"ID Indicador",
  CodigoIndicador:"Código Indicador", Nombre:"Nombre", NombreIndicador:"Nombre Indicador",
  UnidadMedida:"Unidad", MetaAnual:"Meta anual", Peso:"Peso", PesoIndicador:"Peso indicador",
  MetodoCalculo:"Método de cálculo", Vigencia:"Vigencia", Activo:"Activo", Descripcion:"Descripción",
  LineaBase:"Línea base", Meta:"Meta", Clasificacion:"Clasificación", Entidad:"Entidad",
  Cedula:"Cédula", Correo:"Correo", Dependencia:"Dependencia", PersonaID:"Persona",
  AsignacionID:"Asignación", OTPID:"OTP", CodigoUlt4:"Código (últ. 4)", FechaEnvio:"Fecha envío",
  FechaExpira:"Fecha expira", Usado:"Usado", Intentos:"Intentos", IP:"IP", UserAgent:"Agente"
};

const FIELD_UI = {
  Vigencia:{ type:"number", min:2020, max:2100 },
  Peso:{ type:"number", step:"any" },
  MetaAnual:{ type:"number", step:"any" },
  PesoIndicador:{ type:"number", step:"any" },
  LineaBase:{ type:"number", step:"any" },
  Intentos:{ type:"number", step:"1", min:0 },
  Correo:{ type:"email" },
  Activo:{ type:"select", values:["SI","NO"] },
  Usado:{ type:"select", values:["SI","NO"] }
};

const HELP_TEXT = {
  PACID:"Ej: PAC-2024-2027",
  LineaID:"Ej: LIN-01",
  ProgramaID:"Ej: PROG-01",
  ProyectoID:"Ej: PROY-01",
  ObjetivoID:"Ej: OBJ-01",
  ActividadID:"Ej: ACT-01",
  CodigoIndicador:"Ej: IND-001",
  Nombre:"Nombre descriptivo. Evita abreviaturas internas.",
  NombreIndicador:"Nombre claro del indicador, tal como se reportará.",
  Peso:"Decimales con punto. Ej: 1.5 (no 1,5).",
  PesoIndicador:"Decimales con punto. Ej: 0.5",
  MetaAnual:"Valor numérico (si aplica). Decimales con punto.",
  UnidadMedida:"Ej: Número, %, Ha, Km, etc.",
  MetodoCalculo:"Ej: DIRECTO, PROMEDIO, PONDERADO (según metodología).",
  Cedula:"Sin puntos ni comas.",
  Correo:"Correo institucional.",
  Dependencia:"Nombre de la dependencia responsable.",
  Descripcion:"Describe alcance y forma de medición.",
  LineaBase:"Valor inicial de referencia (si aplica).",
  Meta:"Meta definida para la vigencia (texto si aplica)."
};

const DEFAULT_MAXLEN = 120;

let currentEntityKey = "CFG_PAC";
let currentRows = [];
let editingRow = null;

let catalogs = { PAC:[], Linea:[], Programa:[], Proyecto:[], Objetivo:[], Actividad:[], Indicador:[], Persona:[] };
let fieldLengths = {};

const elH = document.getElementById("h-entity");
const elP = document.getElementById("p-entity");
const elHead = document.getElementById("tbl-head");
const elBody = document.getElementById("tbl-body");
const elSearch = document.getElementById("txt-search");
const elVig = document.getElementById("sel-vigencia");
const elStatus = document.getElementById("status");

const btnReload = document.getElementById("btn-reload");
const btnNew = document.getElementById("btn-new");

const modal = document.getElementById("modal");
const formDyn = document.getElementById("form-dynamic");
const btnClose = document.getElementById("btn-close");
const btnSave = document.getElementById("btn-save");
const btnDelete = document.getElementById("btn-delete");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");

/* ---------- Drawer (Tablas) ---------- */
function ensureOverlay(){
  if (document.getElementById("sidebar-overlay")) return;
  const ov = document.createElement("div");
  ov.id = "sidebar-overlay";
  document.body.appendChild(ov);
  ov.addEventListener("click", ()=> document.body.classList.remove("sidebar-open"));
}

function ensureTablesButton(){
  const right = document.querySelector(".topbar__right");
  if (!right) return;
  if (document.getElementById("btn-tables")) return;

  const btn = document.createElement("button");
  btn.id = "btn-tables";
  btn.className = "btn btn--ghost";
  btn.type = "button";
  btn.textContent = "☰ Tablas";
  right.prepend(btn);

  btn.addEventListener("click", ()=>{
    document.body.classList.toggle("sidebar-open");
  });

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") document.body.classList.remove("sidebar-open");
  });
}

function closeDrawer(){
  document.body.classList.remove("sidebar-open");
}

/* ---------- Utils ---------- */
function setStatus(msg, type="info"){
  if (!elStatus) return;
  const prefix = type==="error" ? "❌ " : (type==="success" ? "✅ " : "ℹ️ ");
  elStatus.textContent = prefix + msg;
}

function esc(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function debounce(fn, ms){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

function entityUrl(key){ return `${SERVICE_URL}/${ENTITY[key].id}`; }

async function fetchJson(url, params){
  const u = new URL(url);
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r = await fetch(u.toString(), { method:"GET" });
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function postForm(url, obj){
  const form = new URLSearchParams();
  Object.entries(obj).forEach(([k,v])=>{
    if(v === undefined) return;
    form.append(k, typeof v==="string" ? v : JSON.stringify(v));
  });
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body: form
  });
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return await r.json();
}

function labelCol(c){ return COL_LABEL[c] || c; }

/* ---------- Metadata lengths ---------- */
async function loadEntityMetadata(key){
  const meta = await fetchJson(`${entityUrl(key)}?f=pjson`, {});
  const map = {};
  (meta.fields||[]).forEach(f=>{
    if(typeof f.length === "number" && f.length>0) map[f.name]=f.length;
  });
  fieldLengths[key]=map;
}

function getMaxLenForField(entityKey, fieldName){
  const m = fieldLengths[entityKey] || {};
  if (m[fieldName]) return m[fieldName];
  if (fieldName.endsWith("ID") || fieldName.includes("Codigo")) return 60;
  return DEFAULT_MAXLEN;
}

/* ---------- Query where ---------- */
function buildWhere(key){
  const q = (elSearch?.value || "").trim().replaceAll("'","''");
  const vig = (elVig?.value || "").trim();
  const parts = ["1=1"];
  if (vig && FIELDS[key].includes("Vigencia")) parts.push(`Vigencia = ${Number(vig)}`);

  if (q){
    const candidates = ["Nombre","NombreIndicador","CodigoIndicador","Cedula","Correo","Dependencia","Clasificacion","Entidad","UnidadMedida","MetodoCalculo"];
    const usable = candidates.filter(f => FIELDS[key].includes(f));
    if (usable.length){
      parts.push("(" + usable.map(f => `${f} LIKE '%${q}%'`).join(" OR ") + ")");
    }
  }
  return parts.join(" AND ");
}

/* ---------- Catalogs ---------- */
async function loadCatalogs(){
  const vig = (elVig?.value || "").trim();
  const vigWhere = vig ? `Vigencia = ${Number(vig)}` : "1=1";

  async function list(key, outFields, orderBy){
    const r = await fetchJson(`${entityUrl(key)}/query`, {
      f:"json",
      where: FIELDS[key].includes("Vigencia") ? vigWhere : "1=1",
      outFields,
      orderByFields: orderBy || outFields.split(",")[0] + " ASC",
      returnGeometry:"false"
    });
    return (r.features||[]).map(f=>f.attributes);
  }

  catalogs.PAC       = await list("CFG_PAC","PACID,Nombre,Vigencia","Nombre ASC");
  catalogs.Linea     = await list("CFG_Linea","LineaID,PACID,Nombre,Vigencia","Nombre ASC");
  catalogs.Programa  = await list("CFG_Programa","ProgramaID,LineaID,Nombre,Vigencia","Nombre ASC");
  catalogs.Proyecto  = await list("CFG_Proyecto","ProyectoID,ProgramaID,Nombre,Vigencia","Nombre ASC");
  catalogs.Objetivo  = await list("CFG_Objetivo","ObjetivoID,ProyectoID,Nombre,Vigencia","Nombre ASC");
  catalogs.Actividad = await list("CFG_Actividad","ActividadID,ObjetivoID,Nombre,Vigencia,Activo","Nombre ASC");
  catalogs.Indicador = await list("CFG_Indicador","IndicadorID,ActividadID,CodigoIndicador,NombreIndicador,Vigencia,Activo","NombreIndicador ASC");
  catalogs.Persona   = await list("SEG_Persona","PersonaID,Nombre,Cedula,Correo,Activo","Nombre ASC");
}

/* ---------- Table render ---------- */
function renderTable(key, rows){
  const cols = ["__actions", ...FIELDS[key]];

  elHead.innerHTML = `<tr>${
    cols.map(c => c==="__actions"
      ? `<th style="width:210px;">Acciones</th>`
      : `<th title="${esc(c)}">${esc(labelCol(c))}</th>`
    ).join("")
  }</tr>`;

  elBody.innerHTML = rows.map(r=>{
    const a = r.attributes;
    const oid = a.OBJECTID;

    const tds = cols.map(c=>{
      if(c==="__actions"){
        const disDel = (key==="SEG_OTP");
        return `<td>
          <div class="rowactions">
            <button class="btn btn--ghost btn-xs" data-act="edit" data-oid="${oid}">Editar</button>
            <button class="btn btn--danger btn-xs" data-act="del" data-oid="${oid}" ${disDel?"disabled":""}>Eliminar</button>
          </div>
        </td>`;
      }

      const v = a[c];
      if (c.startsWith("Fecha") && v){
        const d = new Date(v);
        return `<td title="${esc(d.toISOString())}">${esc(d.toLocaleString())}</td>`;
      }
      return `<td title="${esc(v)}">${esc(v)}</td>`;
    }).join("");

    return `<tr>${tds}</tr>`;
  }).join("");

  elBody.querySelectorAll("button[data-act]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const act = b.getAttribute("data-act");
      const oid = Number(b.getAttribute("data-oid"));
      const row = currentRows.find(x => x.attributes.OBJECTID === oid);
      if(!row) return;
      if(act==="edit") openModalEdit(key, row);
      if(act==="del") confirmDelete(key, row);
    });
  });
}

async function loadEntity(key){
  currentEntityKey = key;
  elH.textContent = FRIENDLY[key] || key;
  elP.textContent = FRIENDLY_DESC[key] || "";
  btnNew.disabled = (key==="SEG_OTP");

  setStatus("Cargando…");
  const r = await fetchJson(`${entityUrl(key)}/query`, {
    f:"json",
    where: buildWhere(key),
    outFields: ["OBJECTID", ...FIELDS[key]].join(","),
    orderByFields: "OBJECTID DESC",
    returnGeometry:"false"
  });

  currentRows = r.features || [];
  renderTable(key, currentRows);
  setStatus(`Listo. Registros: ${currentRows.length}`,"success");
}

/* ---------- Modal ---------- */
function openModal(){
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  editingRow = null;
  formDyn.innerHTML = "";
  btnDelete.style.display = "none";
}

/* ---------- Form builder + counters ---------- */
function makeInput(entityKey, name, value){
  const ui = FIELD_UI[name] || { type:"text" };
  const help = HELP_TEXT[name] || "";
  const maxLen = getMaxLenForField(entityKey, name);
  const showCounter = (ui.type === "text" || ui.type === "email" || ["Descripcion","Meta","UserAgent","CodigoHash"].includes(name));

  if(ui.type==="select"){
    const opts = (ui.values||[]).map(v => `<option value="${esc(v)}" ${String(value)===String(v)?"selected":""}>${esc(v)}</option>`).join("");
    return `
      <div class="field">
        <label>${esc(labelCol(name))}</label>
        <select data-field="${esc(name)}">${opts}</select>
        <div class="field__meta"><div class="help-text">${esc(help)}</div><span></span></div>
      </div>`;
  }

  if(name.startsWith("Fecha")){
    const raw = value ?? "";
    const txt = raw ? new Date(raw).toLocaleString() : "";
    return `
      <div class="field">
        <label>${esc(labelCol(name))}</label>
        <input type="text" data-field="${esc(name)}" data-raw="${esc(raw)}" value="${esc(txt)}" disabled />
        <div class="field__meta"><div class="help-text">${esc(help)}</div><span></span></div>
      </div>`;
  }

  if(["Descripcion","Meta","UserAgent","CodigoHash"].includes(name)){
    return `
      <div class="field">
        <label>${esc(labelCol(name))}</label>
        <textarea rows="3" data-field="${esc(name)}" maxlength="${maxLen}" data-maxlen="${maxLen}">${esc(value ?? "")}</textarea>
        <div class="field__meta">
          <div class="help-text">${esc(help)}</div>
          ${showCounter ? `<span class="charcount" data-cc-for="${esc(name)}">${maxLen}</span>` : `<span></span>`}
        </div>
      </div>`;
  }

  const attrs=[];
  if(ui.min!==undefined) attrs.push(`min="${ui.min}"`);
  if(ui.max!==undefined) attrs.push(`max="${ui.max}"`);
  if(ui.step!==undefined) attrs.push(`step="${ui.step}"`);

  return `
    <div class="field">
      <label>${esc(labelCol(name))}</label>
      <input ${attrs.join(" ")} type="${ui.type || "text"}" data-field="${esc(name)}" value="${esc(value ?? "")}"
        ${showCounter ? `maxlength="${maxLen}" data-maxlen="${maxLen}"` : ""} />
      <div class="field__meta">
        <div class="help-text">${esc(help)}</div>
        ${showCounter ? `<span class="charcount" data-cc-for="${esc(name)}">${maxLen}</span>` : `<span></span>`}
      </div>
    </div>`;
}

function wireCharCounters(){
  const inputs = formDyn.querySelectorAll('input[data-maxlen], textarea[data-maxlen]');
  inputs.forEach(inp=>{
    const field = inp.getAttribute("data-field");
    const max = Number(inp.getAttribute("data-maxlen")) || 0;
    const badge = formDyn.querySelector(`.charcount[data-cc-for="${CSS.escape(field)}"]`);
    if(!badge || !max) return;

    const update = ()=>{
      const len = (inp.value || "").length;
      const remain = Math.max(0, max - len);
      badge.textContent = remain;
      if (remain <= Math.max(10, Math.round(max*0.10))) badge.classList.add("is-low");
      else badge.classList.remove("is-low");
    };
    inp.addEventListener("input", update);
    update();
  });
}

/* Helpers (igual a lo que ya usabas) */
function optionsFrom(list, idField, labelFn){
  const opts = list.map(x => `<option value="${esc(x[idField])}">${esc(labelFn(x))}</option>`).join("");
  return `<option value="">— Selecciona —</option>${opts}`;
}

function makeHelpers(key){
  if(key==="CFG_Linea"){
    return `
      <div class="field">
        <label>PAC (selección rápida)</label>
        <select id="helper-pac"></select>
        <div class="help-text">Esto llena <span class="mono">PACID</span>.</div>
      </div>`;
  }
  if(key==="CFG_Programa"){
    return `
      <div class="grid2">
        <div class="field">
          <label>Línea (selección rápida)</label>
          <select id="helper-linea"></select>
          <div class="help-text">Esto llena <span class="mono">LineaID</span>.</div>
        </div>
        <div class="field">
          <label>Filtrar por PAC</label>
          <select id="helper-pac"></select>
        </div>
      </div>`;
  }
  return "";
}

function wireHelpers(key){
  const setField = (field, value) => {
    const el = formDyn.querySelector(`[data-field="${field}"]`);
    if(el) el.value = value ?? "";
  };

  if(key==="CFG_Linea"){
    const sel = document.getElementById("helper-pac");
    if (sel){
      sel.innerHTML = optionsFrom(catalogs.PAC,"PACID",x=>`${x.PACID} — ${x.Nombre}`);
      sel.addEventListener("change", ()=> setField("PACID", sel.value));
    }
  }

  if(key==="CFG_Programa"){
    const pac = document.getElementById("helper-pac");
    const linea = document.getElementById("helper-linea");
    if (pac && linea){
      pac.innerHTML = optionsFrom(catalogs.PAC,"PACID",x=>`${x.PACID} — ${x.Nombre}`);

      const refresh = ()=>{
        const pacid = pac.value;
        const list = pacid ? catalogs.Linea.filter(x=>String(x.PACID)===String(pacid)) : catalogs.Linea;
        linea.innerHTML = optionsFrom(list,"LineaID",x=>`${x.LineaID} — ${x.Nombre}`);
      };

      pac.addEventListener("change", refresh);
      linea.addEventListener("change", ()=> setField("LineaID", linea.value));
      refresh();
    }
  }
}

async function openModalNew(key){
  editingRow = null;
  if(!fieldLengths[key]) await loadEntityMetadata(key);

  modalTitle.textContent = `Nuevo • ${FRIENDLY[key] || key}`;
  modalSubtitle.textContent = FRIENDLY_DESC[key] || "Completa los campos y guarda.";
  btnDelete.style.display = "none";

  const helpers = makeHelpers(key);
  const inputs = FIELDS[key].map(f => makeInput(key, f, "")).join("");

  formDyn.innerHTML = `
    ${helpers ? `<div class="card--soft" style="margin-bottom:12px;">${helpers}</div>` : ""}
    <div class="formgrid">${inputs}</div>
  `;

  const vigField = formDyn.querySelector(`[data-field="Vigencia"]`);
  if (vigField && elVig.value) vigField.value = elVig.value;

  const activoField = formDyn.querySelector(`[data-field="Activo"]`);
  if (activoField && !activoField.value) activoField.value = "SI";

  wireHelpers(key);
  wireCharCounters();
  openModal();
}

async function openModalEdit(key, row){
  editingRow = row;
  if(!fieldLengths[key]) await loadEntityMetadata(key);

  modalTitle.textContent = `Editar • ${FRIENDLY[key] || key}`;
  modalSubtitle.textContent = "Actualiza y guarda los cambios.";
  btnDelete.style.display = (key==="SEG_OTP") ? "none" : "inline-flex";

  const helpers = makeHelpers(key);
  const inputs = FIELDS[key].map(f => makeInput(key, f, row.attributes[f])).join("");

  formDyn.innerHTML = `
    ${helpers ? `<div class="card--soft" style="margin-bottom:12px;">${helpers}</div>` : ""}
    <div class="formgrid">${inputs}</div>
  `;

  wireHelpers(key);
  wireCharCounters();
  openModal();
}

function readForm(key){
  const a = {};
  formDyn.querySelectorAll("[data-field]").forEach(el=>{
    const f = el.getAttribute("data-field");

    if (f.startsWith("Fecha") && el.disabled){
      const raw = el.getAttribute("data-raw");
      a[f] = raw ? Number(raw) : null;
      return;
    }

    let v = el.value;
    const ui = FIELD_UI[f];

    if (ui?.type === "number"){
      v = (v==="" ? null : Number(String(v).replace(",", ".")));
      if (v!==null && !isFinite(v)) v = null;
    }

    if (String(f).endsWith("ID") && v==="") v = null;
    if (v==="") v = null;

    a[f] = v;
  });

  const requiredParent = { CFG_Linea:"PACID", CFG_Programa:"LineaID" };
  if (requiredParent[key] && !a[requiredParent[key]]) {
    throw new Error(`Debe diligenciar ${requiredParent[key]} (usa selección rápida).`);
  }

  const pk = ENTITY[key].pk;
  const pkManual = ["PACID","LineaID","ProgramaID","ProyectoID","ObjetivoID","ActividadID"];
  if (!editingRow && pkManual.includes(pk) && !a[pk]) {
    throw new Error(`El campo ${pk} es obligatorio.`);
  }

  return a;
}

async function save(key){
  const url = `${entityUrl(key)}/applyEdits`;
  const attrs = readForm(key);

  if (editingRow){
    attrs.OBJECTID = editingRow.attributes.OBJECTID;
    const res = await postForm(url, { f:"json", updates:[{attributes:attrs}] });
    if (res?.error) throw new Error(res.error.message || "Error al actualizar.");
    if (!(res.updateResults||[]).every(x=>x.success)) throw new Error("No se actualizó correctamente.");
  } else {
    const res = await postForm(url, { f:"json", adds:[{attributes:attrs}] });
    if (res?.error) throw new Error(res.error.message || "Error al crear.");
    if (!(res.addResults||[]).every(x=>x.success)) throw new Error("No se creó correctamente.");
  }

  closeModal();
  await loadCatalogs();
  await loadEntity(key);
  setStatus("Guardado correctamente.","success");
}

async function del(key, row){
  const url = `${entityUrl(key)}/applyEdits`;
  const oid = row.attributes.OBJECTID;
  const res = await postForm(url, { f:"json", deletes:String(oid) });
  if (res?.error) throw new Error(res.error.message || "Error al eliminar.");
  if (!(res.deleteResults||[]).every(x=>x.success)) throw new Error("No se eliminó correctamente.");
  closeModal();
  await loadCatalogs();
  await loadEntity(key);
  setStatus("Eliminado correctamente.","success");
}

function confirmDelete(key, row){
  if (key==="SEG_OTP") return;
  openModalEdit(key, row);
  btnDelete.onclick = async ()=>{
    try{
      btnDelete.disabled = true;
      await del(key, row);
    }catch(e){
      console.error(e);
      setStatus(e.message || "Error eliminando.","error");
    }finally{
      btnDelete.disabled = false;
    }
  };
}

/* ---------- Nav wiring ---------- */
function wireNav(){
  document.querySelectorAll(".navitem").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      document.querySelectorAll(".navitem").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const key = btn.getAttribute("data-entity");
      if(!key || !ENTITY[key]) return;

      closeDrawer();
      await loadEntity(key);
    });
  });
}

/* ---------- Boot ---------- */
(async function main(){
  try{
    ensureOverlay();
    ensureTablesButton();
    wireNav();

    btnReload.addEventListener("click", async ()=>{
      setStatus("Recargando…");
      await loadCatalogs();
      await loadEntity(currentEntityKey);
      setStatus("Listo.","success");
    });

    btnNew.addEventListener("click", async ()=>{
      if (currentEntityKey==="SEG_OTP") return;
      await loadCatalogs();
      await openModalNew(currentEntityKey);
    });

    btnClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e)=>{ if(e.target===modal) closeModal(); });

    btnSave.addEventListener("click", async ()=>{
      try{
        btnSave.disabled = true;
        await save(currentEntityKey);
      }catch(e){
        console.error(e);
        setStatus(e.message || "Error guardando.","error");
      }finally{
        btnSave.disabled = false;
      }
    });

    elSearch.addEventListener("input", debounce(async ()=>{
      await loadEntity(currentEntityKey);
    }, 250));

    elVig.addEventListener("change", async ()=>{
      await loadCatalogs();
      await loadEntity(currentEntityKey);
    });

    await loadEntityMetadata(currentEntityKey);
    await loadCatalogs();
    await loadEntity(currentEntityKey);

    setStatus("Listo.","success");
  }catch(e){
    console.error(e);
    setStatus("Error inicializando la administración.","error");
  }
})();