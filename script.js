/* ===========================================================
   DATA-PAC | Admin OAP (script.js) - Integridad PRO + UX
   - GUID: ocultos en forms (hidden) / no visibles en tablas
   - FK: dropdown obligatorio (padre) por jerarquía
   - Dominios: autocomplete (datalist) + validación
   - Pesos: suma hijos <= 100 por padre+vigencia
   - Unicidad: códigos manuales + CodigoIndicador
   - Delete seguro: no borrar padres con hijos
   - Drawer Tablas: botón ☰ Tablas + overlay + ESC
   =========================================================== */

const SERVICE_URL =
  "https://services6.arcgis.com/yq6pe3Lw2oWFjWtF/arcgis/rest/services/DATAPAC_V1/FeatureServer";

/* ===== Entidades ===== */
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

/* ===== Campos (DATA) ===== */
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

/* ===== Campos visibles por entidad (UI) - sin GUID ===== */
const DISPLAY_FIELDS = {
  CFG_PAC:       ["PACID","Nombre","Peso","Vigencia"],
  CFG_Linea:     ["LineaID","PACID","Nombre","Peso","Vigencia"],
  CFG_Programa:  ["ProgramaID","LineaID","Nombre","Peso","Vigencia"],
  CFG_Proyecto:  ["ProyectoID","ProgramaID","Nombre","Peso","Vigencia"],
  CFG_Objetivo:  ["ObjetivoID","ProyectoID","Nombre","Peso","Vigencia"],
  CFG_Actividad: ["ActividadID","ObjetivoID","Nombre","Peso","Vigencia","Activo"],
  CFG_Indicador: ["ActividadID","CodigoIndicador","NombreIndicador","UnidadMedida","MetaAnual","PesoIndicador","MetodoCalculo","Vigencia","Activo","Clasificacion","Entidad"],
  SEG_Persona:   ["Cedula","Nombre","Correo","Dependencia","Activo"],
  SEG_Asignacion:["PersonaID","ActividadID","IndicadorID","Vigencia","Activo"],  // se “resuelve” con lookup
  SEG_OTP:       ["Correo","CodigoUlt4","FechaEnvio","FechaExpira","Usado","Intentos"]
};

const COL_LABEL = {
  PACID:"Código PAC", LineaID:"Código Línea", ProgramaID:"Código Programa", ProyectoID:"Código Proyecto",
  ObjetivoID:"Código Objetivo", ActividadID:"Código Actividad", IndicadorID:"Indicador",
  CodigoIndicador:"Código Indicador", Nombre:"Nombre", NombreIndicador:"Nombre Indicador",
  UnidadMedida:"Unidad", MetaAnual:"Meta anual", Peso:"Peso", PesoIndicador:"Peso indicador",
  MetodoCalculo:"Método de cálculo", Vigencia:"Vigencia", Activo:"Activo",
  Descripcion:"Descripción", LineaBase:"Línea base", Meta:"Meta", Clasificacion:"Clasificación", Entidad:"Entidad",
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
  Peso:"Decimales con punto. Ej: 1.5 (no 1,5).",
  PesoIndicador:"Decimales con punto. Ej: 0.5",
  MetodoCalculo:"Selecciona del listado (dominio).",
  UnidadMedida:"Selecciona del listado (dominio)."
};

const DEFAULT_MAXLEN = 120;

/* ===== Jerarquía (FK + peso) ===== */
const PARENT_RULES = {
  CFG_Linea:     { parentField:"PACID",       parentEntity:"CFG_PAC",       weightField:"Peso" },
  CFG_Programa:  { parentField:"LineaID",     parentEntity:"CFG_Linea",     weightField:"Peso" },
  CFG_Proyecto:  { parentField:"ProgramaID",  parentEntity:"CFG_Programa",  weightField:"Peso" },
  CFG_Objetivo:  { parentField:"ProyectoID",  parentEntity:"CFG_Proyecto",  weightField:"Peso" },
  CFG_Actividad: { parentField:"ObjetivoID",  parentEntity:"CFG_Objetivo",  weightField:"Peso" },
  CFG_Indicador: { parentField:"ActividadID", parentEntity:"CFG_Actividad", weightField:"PesoIndicador" }
};

/* ===== Reglas de unicidad (puedes ajustar si cambia negocio) ===== */
const UNIQUE_RULES = [
  // códigos manuales (por vigencia si existe)
  { entity:"CFG_PAC",       field:"PACID",       scope:["Vigencia"] },
  { entity:"CFG_Linea",     field:"LineaID",     scope:["Vigencia"] },
  { entity:"CFG_Programa",  field:"ProgramaID",  scope:["Vigencia"] },
  { entity:"CFG_Proyecto",  field:"ProyectoID",  scope:["Vigencia"] },
  { entity:"CFG_Objetivo",  field:"ObjetivoID",  scope:["Vigencia"] },
  { entity:"CFG_Actividad", field:"ActividadID", scope:["Vigencia"] },

  // CodigoIndicador: recomendado al menos por Vigencia (y si quieres por ActividadID también)
  { entity:"CFG_Indicador", field:"CodigoIndicador", scope:["Vigencia"] }
];

/* ===== Bloqueo de borrado por hijos ===== */
const CHILDREN_RULES = [
  { parent:"CFG_PAC", child:"CFG_Linea",     fk:"PACID" },
  { parent:"CFG_Linea", child:"CFG_Programa", fk:"LineaID" },
  { parent:"CFG_Programa", child:"CFG_Proyecto", fk:"ProgramaID" },
  { parent:"CFG_Proyecto", child:"CFG_Objetivo", fk:"ProyectoID" },
  { parent:"CFG_Objetivo", child:"CFG_Actividad", fk:"ObjetivoID" },
  { parent:"CFG_Actividad", child:"CFG_Indicador", fk:"ActividadID" }
];

/* ===== Estado ===== */
let currentEntityKey = "CFG_PAC";
let currentRows = [];
let editingRow = null;

let catalogs = { PAC:[], Linea:[], Programa:[], Proyecto:[], Objetivo:[], Actividad:[], Indicador:[], Persona:[] };
let metaCache = {};
let fieldLengths = {};

/* ===== DOM ===== */
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

/* ===== Drawer ===== */
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
  btn.addEventListener("click", ()=> document.body.classList.toggle("sidebar-open"));
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") document.body.classList.remove("sidebar-open"); });
}
function closeDrawer(){ document.body.classList.remove("sidebar-open"); }

/* ===== Utils ===== */
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
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
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
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body: form });
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return await r.json();
}
function labelCol(c){ return COL_LABEL[c] || c; }

/* GUID */
function genGuid(){
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const s4 = () => Math.floor((1+Math.random())*0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/* ===== Metadata ===== */
async function loadEntityMetadata(key){
  if (metaCache[key]) return metaCache[key];

  const meta = await fetchJson(`${entityUrl(key)}?f=pjson`, {});
  const fieldsByName = {};
  const domainsByField = {};
  const lengths = {};

  (meta.fields || []).forEach(f=>{
    fieldsByName[f.name] = f;
    if (typeof f.length === "number" && f.length > 0) lengths[f.name] = f.length;
    if (f.domain?.type === "codedValue" && Array.isArray(f.domain.codedValues)){
      domainsByField[f.name] = f.domain.codedValues;
    }
  });

  metaCache[key] = { fieldsByName, domainsByField };
  fieldLengths[key] = lengths;
  return metaCache[key];
}
function getMaxLenForField(entityKey, fieldName){
  const m = fieldLengths[entityKey] || {};
  if (m[fieldName]) return m[fieldName];
  if (fieldName.endsWith("ID") || fieldName.includes("Codigo")) return 60;
  return DEFAULT_MAXLEN;
}
function isGuidField(entityKey, fieldName){
  const f = metaCache[entityKey]?.fieldsByName?.[fieldName];
  if (!f) return false;
  if (f.type === "esriFieldTypeGUID") return true;
  if (f.type === "esriFieldTypeString" && (f.length === 38 || f.length === 36)) return true;
  return false;
}

/* ===== Catálogos ===== */
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

/* ===== Lookups para mostrar en tablas (en vez de GUID) ===== */
function lookupPersona(personaId){
  const p = catalogs.Persona.find(x => String(x.PersonaID) === String(personaId));
  if (!p) return personaId || "";
  return `${p.Nombre}${p.Cedula ? " - " + p.Cedula : ""}`;
}
function lookupIndicador(indId){
  const i = catalogs.Indicador.find(x => String(x.IndicadorID) === String(indId));
  if (!i) return indId || "";
  return `${i.CodigoIndicador || ""}${i.NombreIndicador ? " — " + i.NombreIndicador : ""}`.trim();
}
function lookupActividad(actId){
  const a = catalogs.Actividad.find(x => String(x.ActividadID) === String(actId));
  if (!a) return actId || "";
  return `${a.ActividadID || ""}${a.Nombre ? " — " + a.Nombre : ""}`.trim();
}

/* ===== Query ===== */
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

/* ===== Render tabla (sin GUID) ===== */
function renderTable(key, rows){
  const cols = ["__actions", ...(DISPLAY_FIELDS[key] || FIELDS[key])];

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

      // Resoluciones (Asignaciones)
      if (key==="SEG_Asignacion" && c==="PersonaID") return `<td>${esc(lookupPersona(a.PersonaID))}</td>`;
      if (key==="SEG_Asignacion" && c==="IndicadorID") return `<td>${esc(lookupIndicador(a.IndicadorID))}</td>`;
      if (key==="SEG_Asignacion" && c==="ActividadID") return `<td>${esc(lookupActividad(a.ActividadID))}</td>`;

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

/* ===== Modal ===== */
function openModal(){ modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); }
function closeModal(){
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  editingRow = null;
  formDyn.innerHTML = "";
  btnDelete.style.display = "none";
}

/* ===== Dominios -> autocomplete ===== */
function makeDomainAutocomplete(entityKey, fieldName, value, codedValues){
  const idList = `dl_${entityKey}_${fieldName}`;
  const maxLen = getMaxLenForField(entityKey, fieldName);
  const htmlOptions = codedValues.map(cv =>
    `<option value="${esc(cv.code)}" label="${esc(cv.name)}"></option>`
  ).join("");
  const help = HELP_TEXT[fieldName] || "Selecciona del listado.";
  return `
    <div class="field">
      <label>${esc(labelCol(fieldName))}</label>
      <input type="text" data-field="${esc(fieldName)}" value="${esc(value ?? "")}"
        list="${idList}" maxlength="${maxLen}" data-maxlen="${maxLen}" />
      <datalist id="${idList}">${htmlOptions}</datalist>
      <div class="field__meta"><div class="help-text">${esc(help)}</div><span class="charcount" data-cc-for="${esc(fieldName)}">${maxLen}</span></div>
    </div>`;
}

/* ===== FK padre -> select ===== */
function optionsFrom(list, idField, labelFn){
  const opts = list.map(x => `<option value="${esc(x[idField])}">${esc(labelFn(x))}</option>`).join("");
  return `<option value="">— Selecciona —</option>${opts}`;
}
function makeParentSelect(entityKey, parentField, parentEntity, currentValue){
  let list = [];
  if (parentEntity === "CFG_PAC") list = catalogs.PAC;
  if (parentEntity === "CFG_Linea") list = catalogs.Linea;
  if (parentEntity === "CFG_Programa") list = catalogs.Programa;
  if (parentEntity === "CFG_Proyecto") list = catalogs.Proyecto;
  if (parentEntity === "CFG_Objetivo") list = catalogs.Objetivo;
  if (parentEntity === "CFG_Actividad") list = catalogs.Actividad;

  const labelFn = (x)=>{
    const pk = ENTITY[parentEntity].pk;
    const n = x.Nombre || x.NombreIndicador || "";
    return `${x[pk]}${n ? " — " + n : ""}`;
  };

  const opts = optionsFrom(list, ENTITY[parentEntity].pk, labelFn);

  return `
    <div class="field">
      <label>${esc(labelCol(parentField))}</label>
      <select data-field="${esc(parentField)}" data-fk="1">${opts}</select>
      <div class="field__meta"><div class="help-text">Selecciona el registro padre (no se digita).</div><span></span></div>
    </div>`;
}
function setSelectValue(fieldName, value){
  const sel = formDyn.querySelector(`select[data-field="${fieldName}"]`);
  if (sel) sel.value = value ?? "";
}

/* ===== Input general (oculta GUID) ===== */
function makeInput(entityKey, fieldName, value){
  const ui = FIELD_UI[fieldName] || { type:"text" };
  const help = HELP_TEXT[fieldName] || "";
  const maxLen = getMaxLenForField(entityKey, fieldName);

  // FK padre
  const rule = PARENT_RULES[entityKey];
  if (rule && fieldName === rule.parentField){
    return makeParentSelect(entityKey, fieldName, rule.parentEntity, value);
  }

  // GUID: oculto (hidden)
  if (isGuidField(entityKey, fieldName)){
    const v = value ?? "";
    return `<input type="hidden" data-field="${esc(fieldName)}" value="${esc(v)}" />`;
  }

  // dominio codedValue
  const coded = metaCache[entityKey]?.domainsByField?.[fieldName];
  if (coded && (ui.type === "text" || ui.type === "email" || ui.type === undefined)){
    return makeDomainAutocomplete(entityKey, fieldName, value, coded);
  }

  // select normal
  if(ui.type==="select"){
    const opts = (ui.values||[]).map(v => `<option value="${esc(v)}" ${String(value)===String(v)?"selected":""}>${esc(v)}</option>`).join("");
    return `
      <div class="field">
        <label>${esc(labelCol(fieldName))}</label>
        <select data-field="${esc(fieldName)}">${opts}</select>
        <div class="field__meta"><div class="help-text">${esc(help)}</div><span></span></div>
      </div>`;
  }

  // textarea
  if(["Descripcion","Meta","UserAgent","CodigoHash"].includes(fieldName)){
    return `
      <div class="field">
        <label>${esc(labelCol(fieldName))}</label>
        <textarea rows="3" data-field="${esc(fieldName)}" maxlength="${maxLen}" data-maxlen="${maxLen}">${esc(value ?? "")}</textarea>
        <div class="field__meta"><div class="help-text">${esc(help)}</div><span class="charcount" data-cc-for="${esc(fieldName)}">${maxLen}</span></div>
      </div>`;
  }

  // number attrs
  const attrs=[];
  if(ui.min!==undefined) attrs.push(`min="${ui.min}"`);
  if(ui.max!==undefined) attrs.push(`max="${ui.max}"`);
  if(ui.step!==undefined) attrs.push(`step="${ui.step}"`);

  const showCounter = (ui.type === "text" || ui.type === "email");
  return `
    <div class="field">
      <label>${esc(labelCol(fieldName))}</label>
      <input ${attrs.join(" ")} type="${ui.type || "text"}" data-field="${esc(fieldName)}" value="${esc(value ?? "")}"
        ${showCounter ? `maxlength="${maxLen}" data-maxlen="${maxLen}"` : ""} />
      <div class="field__meta">
        <div class="help-text">${esc(help)}</div>
        ${showCounter ? `<span class="charcount" data-cc-for="${esc(fieldName)}">${maxLen}</span>` : `<span></span>`}
      </div>
    </div>`;
}

/* contador */
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

/* ===== Open modal ===== */
async function openModalNew(entityKey){
  editingRow = null;
  await loadEntityMetadata(entityKey);
  await loadCatalogs();

  // generar GUID PK si aplica
  const pk = ENTITY[entityKey].pk;
  const pkIsGuid = isGuidField(entityKey, pk);
  const guidVal = pkIsGuid ? genGuid() : null;

  modalTitle.textContent = `Nuevo • ${FRIENDLY[entityKey] || entityKey}`;
  modalSubtitle.textContent = FRIENDLY_DESC[entityKey] || "Completa los campos y guarda.";
  btnDelete.style.display = "none";

  const inputs = FIELDS[entityKey].map(f => {
    if (pkIsGuid && f === pk) return makeInput(entityKey, f, guidVal);
    return makeInput(entityKey, f, "");
  }).join("");

  formDyn.innerHTML = `<div class="formgrid">${inputs}</div>`;

  // defaults
  const vigField = formDyn.querySelector(`[data-field="Vigencia"]`);
  if (vigField && elVig.value) vigField.value = elVig.value;

  const activoField = formDyn.querySelector(`[data-field="Activo"]`);
  if (activoField && !activoField.value) activoField.value = "SI";

  wireCharCounters();
  openModal();
}

async function openModalEdit(entityKey, row){
  editingRow = row;
  await loadEntityMetadata(entityKey);
  await loadCatalogs();

  modalTitle.textContent = `Editar • ${FRIENDLY[entityKey] || entityKey}`;
  modalSubtitle.textContent = "Actualiza y guarda los cambios.";
  btnDelete.style.display = (entityKey==="SEG_OTP") ? "none" : "inline-flex";

  const inputs = FIELDS[entityKey].map(f => makeInput(entityKey, f, row.attributes[f])).join("");
  formDyn.innerHTML = `<div class="formgrid">${inputs}</div>`;

  // set fk value (si aplica)
  const rule = PARENT_RULES[entityKey];
  if (rule) setSelectValue(rule.parentField, row.attributes[rule.parentField]);

  wireCharCounters();
  openModal();
}

/* ===== Validaciones: dominios, unicidad, pesos, delete padres ===== */
function validateDomainValue(entityKey, fieldName, value){
  const codedValues = metaCache[entityKey]?.domainsByField?.[fieldName];
  if (!codedValues) return;
  if (value === null || value === undefined || value === "") return;
  const ok = codedValues.some(cv => String(cv.code) === String(value));
  if (!ok) throw new Error(`El campo "${labelCol(fieldName)}" debe seleccionarse del listado (dominio).`);
}

function readForm(entityKey){
  const a = {};
  formDyn.querySelectorAll("[data-field]").forEach(el=>{
    const f = el.getAttribute("data-field");
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

  // FK requerido
  const rule = PARENT_RULES[entityKey];
  if (rule && !a[rule.parentField]) throw new Error(`Debes seleccionar ${labelCol(rule.parentField)} (registro padre).`);

  // PK manual requerido si no GUID
  const pk = ENTITY[entityKey].pk;
  if (!editingRow && !isGuidField(entityKey, pk) && !a[pk]) throw new Error(`El campo ${labelCol(pk)} es obligatorio.`);

  // dominios
  Object.keys(a).forEach(fn => validateDomainValue(entityKey, fn, a[fn]));

  return a;
}

async function validateUnique(entityKey, attrs){
  const rules = UNIQUE_RULES.filter(r => r.entity === entityKey);
  if (!rules.length) return;

  for (const r of rules){
    const field = r.field;
    const val = attrs[field];
    if (!val) continue;

    const parts = [`${field} = '${String(val).replaceAll("'", "''")}'`];

    // scope (ej. vigencia)
    for (const s of (r.scope || [])){
      if (attrs[s] !== null && attrs[s] !== undefined) parts.push(`${s} = ${Number(attrs[s])}`);
    }

    // excluir edición
    const url = `${entityUrl(entityKey)}/query`;
    const qr = await fetchJson(url, {
      f:"json",
      where: parts.join(" AND "),
      outFields: "OBJECTID",
      returnGeometry: "false"
    });

    const hits = (qr.features || []).map(f => f.attributes.OBJECTID);
    const myOID = editingRow?.attributes?.OBJECTID ?? null;

    const exists = hits.some(oid => myOID ? oid !== myOID : true);
    if (exists){
      throw new Error(`Ya existe un registro con ${labelCol(field)} = "${val}". Verifica duplicados.`);
    }
  }
}

async function validateWeightSum(entityKey, attrs){
  const rule = PARENT_RULES[entityKey];
  if (!rule) return;

  const { parentField, weightField } = rule;
  if (!weightField || attrs[weightField] === null || attrs[weightField] === undefined) return;

  const parentVal = attrs[parentField];
  if (!parentVal) return;

  const vig = attrs.Vigencia ?? (elVig?.value ? Number(elVig.value) : null);

  const whereParts = [`${parentField} = '${String(parentVal).replaceAll("'", "''")}'`];
  if (FIELDS[entityKey].includes("Vigencia") && vig) whereParts.push(`Vigencia = ${Number(vig)}`);
  const where = whereParts.join(" AND ");

  const r = await fetchJson(`${entityUrl(entityKey)}/query`, {
    f:"json",
    where,
    outFields: `OBJECTID,${weightField}`,
    returnGeometry:"false"
  });

  const list = (r.features || []).map(f => f.attributes);
  const myOID = editingRow?.attributes?.OBJECTID ?? null;

  const sumExisting = list.reduce((acc, x)=>{
    if (myOID && x.OBJECTID === myOID) return acc;
    const w = Number(x[weightField]);
    return acc + (isFinite(w) ? w : 0);
  }, 0);

  const newW = Number(attrs[weightField]);
  const total = sumExisting + (isFinite(newW) ? newW : 0);

  if (total > 100.000001){
    const remaining = Math.max(0, 100 - sumExisting);
    throw new Error(
      `El ${labelCol(weightField)} excede el 100% para este padre.\n` +
      `Suma actual (sin este registro): ${sumExisting}\n` +
      `Disponible: ${remaining}\n` +
      `Intentas guardar: ${newW}`
    );
  }
}

async function validateDeleteHasChildren(entityKey, row){
  const pk = ENTITY[entityKey].pk;
  const pkVal = row.attributes[pk];
  if (!pkVal) return;

  const rules = CHILDREN_RULES.filter(r => r.parent === entityKey);
  for (const rr of rules){
    const child = rr.child;
    const fk = rr.fk;

    const r = await fetchJson(`${entityUrl(child)}/query`, {
      f:"json",
      where: `${fk} = '${String(pkVal).replaceAll("'", "''")}'`,
      outFields: "OBJECTID",
      returnGeometry:"false"
    });

    if ((r.features || []).length > 0){
      throw new Error(`No se puede eliminar: existen registros hijos en ${FRIENDLY[child]} (relación ${fk}).`);
    }
  }
}

/* ===== Save/Delete ===== */
async function save(entityKey){
  const url = `${entityUrl(entityKey)}/applyEdits`;
  const attrs = readForm(entityKey);

  await validateUnique(entityKey, attrs);
  await validateWeightSum(entityKey, attrs);

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
  await loadEntity(entityKey);
  setStatus("Guardado correctamente.","success");
}

async function del(entityKey, row){
  await validateDeleteHasChildren(entityKey, row);

  const url = `${entityUrl(entityKey)}/applyEdits`;
  const oid = row.attributes.OBJECTID;
  const res = await postForm(url, { f:"json", deletes:String(oid) });
  if (res?.error) throw new Error(res.error.message || "Error al eliminar.");
  if (!(res.deleteResults||[]).every(x=>x.success)) throw new Error("No se eliminó correctamente.");

  closeModal();
  await loadCatalogs();
  await loadEntity(entityKey);
  setStatus("Eliminado correctamente.","success");
}

function confirmDelete(entityKey, row){
  if (entityKey==="SEG_OTP") return;
  openModalEdit(entityKey, row);
  btnDelete.onclick = async ()=>{
    try{
      btnDelete.disabled = true;
      await del(entityKey, row);
    }catch(e){
      console.error(e);
      setStatus(e.message || "Error eliminando.","error");
    }finally{
      btnDelete.disabled = false;
    }
  };
}

/* ===== Nav ===== */
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

/* ===== Boot ===== */
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

    // precarga metadata del inicial
    await loadEntityMetadata(currentEntityKey);
    await loadCatalogs();
    await loadEntity(currentEntityKey);

    setStatus("Listo.","success");
  }catch(e){
    console.error(e);
    setStatus("Error inicializando la administración.","error");
  }
})();