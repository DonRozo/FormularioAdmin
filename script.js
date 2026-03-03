/* ===========================================================
   DATA-PAC | Admin OAP (script.js) - DATAPAC_V2
   - Mantiene estética y UX
   - GlobalID/GUID: ocultos en forms y no visibles en tablas
   - Relaciones: dropdown obligatorio (padre) por jerarquía (usa *GlobalID)
   - Dominios: autocomplete (datalist) + validación
   - Pesos: suma hijos <= 100 por padre (+vigencia cuando aplica)
   - Unicidad: códigos manuales (según tabla) + validación por alcance
   - Delete seguro: no borrar padres con hijos
   - Drawer Tablas: botón ☰ Tablas + overlay + ESC
   =========================================================== */

const SERVICE_URL =
  "https://services6.arcgis.com/yq6pe3Lw2oWFjWtF/arcgis/rest/services/DATAPAC_V2/FeatureServer";

/* ===== Entidades (según índices del servicio) ===== */
const ENTITY = {
  CFG_PAC:        { id: 1,  pk: "PACID" },
  CFG_Linea:      { id: 2,  pk: "LineaID" },
  CFG_Programa:   { id: 3,  pk: "ProgramaID" },
  CFG_Proyecto:   { id: 4,  pk: "ProyectoID" },
  CFG_Objetivo:   { id: 5,  pk: "ObjetivoID" },
  CFG_Actividad:  { id: 6,  pk: "ActividadID" },
  CFG_SubActividad:{id: 7,  pk: "CodigoSubActividad" },
  CFG_Tarea:      { id: 8,  pk: "CodigoTarea" },

  REP_AvanceTarea:{ id: 9,  pk: "GlobalID" },
  REP_TareaUbicacion_PT:{ id: 10, pk: "GlobalID" },
  REP_ReporteNarrativo:{ id: 11, pk: "GlobalID" },

  FIN_TodoGasto:  { id: 12, pk: "GlobalID" },
  PLAN_SubActividadVigencia:{ id: 13, pk: "GlobalID" },
  PLAN_TareaVigencia:{ id: 14, pk: "GlobalID" },

  SEG_Asignacion: { id: 15, pk: "GlobalID" },
  SEG_Persona:    { id: 16, pk: "Cedula" }, // PK lógico en UI; técnicamente usa GlobalID
  SEG_OTP:        { id: 17, pk: "GlobalID" },

  FIN_ResumenTodoGastoActividad:{ id: 18, pk: "GlobalID" },
  REP_AvanceSubActividad:{ id: 19, pk: "GlobalID" },
  REP_AvanceActividad:{ id: 20, pk: "GlobalID" }
};

const FRIENDLY = {
  CFG_PAC: "PAC",
  CFG_Linea: "Líneas",
  CFG_Programa: "Programas",
  CFG_Proyecto: "Proyectos",
  CFG_Objetivo: "Objetivos",
  CFG_Actividad: "Actividades",
  CFG_SubActividad: "Subactividades",
  CFG_Tarea: "Tareas",

  PLAN_SubActividadVigencia: "Plan Subactividad (Vigencia)",
  PLAN_TareaVigencia: "Plan Tarea (Vigencia)",

  SEG_Persona: "Personas",
  SEG_Asignacion: "Asignaciones",
  SEG_OTP: "OTP (auditoría)",

  FIN_ResumenTodoGastoActividad: "Resumen TodoGasto (Actividad)",
  FIN_TodoGasto: "TodoGasto (Detalle)",

  REP_ReporteNarrativo: "Reporte narrativo",
  REP_AvanceTarea: "Avance de tarea",
  REP_TareaUbicacion_PT: "Ubicaciones de avance",

  REP_AvanceSubActividad: "Avance Subactividad (calc)",
  REP_AvanceActividad: "Avance Actividad (calc)"
};

const FRIENDLY_DESC = {
  CFG_PAC: "Configuración base del PAC (raíz).",
  CFG_Linea: "Líneas estratégicas (dependen del PAC).",
  CFG_Programa: "Programas (dependen de una Línea).",
  CFG_Proyecto: "Proyectos (dependen de un Programa).",
  CFG_Objetivo: "Objetivos (dependen de un Proyecto).",
  CFG_Actividad: "Actividades (dependen de un Objetivo).",
  CFG_SubActividad: "Subactividades (dependen de una Actividad).",
  CFG_Tarea: "Tareas (dependen de una Subactividad).",

  PLAN_SubActividadVigencia: "Planeación por vigencia (meta/peso/aplica) de Subactividades.",
  PLAN_TareaVigencia: "Planeación por vigencia (meta/peso/aplica) de Tareas.",

  SEG_Persona: "Personas/usuarios para asignación y trazabilidad.",
  SEG_Asignacion: "Asigna qué persona reporta qué tarea (y su vigencia).",
  SEG_OTP: "Auditoría y control de códigos OTP.",

  FIN_ResumenTodoGastoActividad: "Resumen financiero por ActividadID (solo lectura).",
  FIN_TodoGasto: "Movimientos financieros por Actividad (solo lectura).",

  REP_ReporteNarrativo: "Registro narrativo trimestral por Actividad (solo lectura).",
  REP_AvanceTarea: "Avances reportados por tarea (solo lectura).",
  REP_TareaUbicacion_PT: "Ubicación geográfica de avances (solo lectura).",

  REP_AvanceSubActividad: "Avance calculado (AUTO) por Subactividad (solo lectura).",
  REP_AvanceActividad: "Avance calculado (AUTO) por Actividad (solo lectura)."
};

/* ===== Entidades de solo lectura ===== */
const READONLY = new Set([
  "FIN_ResumenTodoGastoActividad",
  "FIN_TodoGasto",
  "REP_ReporteNarrativo",
  "REP_AvanceTarea",
  "REP_TareaUbicacion_PT",
  "REP_AvanceSubActividad",
  "REP_AvanceActividad",
  "SEG_OTP"
]);

/* ===== Campos (DATA) - del modelo DATAPAC_V2 ===== */
const FIELDS = {
  CFG_PAC:        ["PACID","Nombre","Peso","Vigencia","Activo","GlobalID"],
  CFG_Linea:      ["LineaID","PACID","PACGlobalID","Nombre","Peso","Vigencia","Activo","GlobalID"],
  CFG_Programa:   ["ProgramaID","LineaID","LineaGlobalID","Nombre","Peso","Vigencia","Activo","GlobalID"],
  CFG_Proyecto:   ["ProyectoID","ProgramaID","ProgramaGlobalID","Nombre","Peso","Vigencia","Activo","GlobalID"],
  CFG_Objetivo:   ["ObjetivoID","ProyectoID","ProyectoGlobalID","Nombre","Peso","Vigencia","Activo","GlobalID"],
  CFG_Actividad:  ["ActividadID","ObjetivoID","ObjetivoGlobalID","Nombre","NombreActividad","Peso","Vigencia","VigenciaInicio","VigenciaFin","Activo","GlobalID"],

  CFG_SubActividad:["CodigoSubActividad","ActividadGlobalID","NombreSubActividad","SiglaVariable","UnidadMedida","GlobalID"],
  CFG_Tarea:      ["CodigoTarea","SubActividadGlobalID","NombreTarea","Definicion","Orden","UnidadMedida","FrecuenciaReporte","TipoValorAvance","EsGeorreferenciable","GlobalID"],

  PLAN_SubActividadVigencia:["SubActividadGlobalID","Vigencia","Aplica","MetaProgramada","PesoSubActividad","ObservacionesPlaneacion","GlobalID"],
  PLAN_TareaVigencia:["TareaGlobalID","Vigencia","Aplica","MetaProgramada","PesoTarea","Orden","GlobalID"],

  SEG_Persona:    ["Cedula","Nombre","Correo","Dependencia","Activo","PersonaID","GlobalID"],
  SEG_Asignacion: ["PersonaGlobalID","TareaGlobalID","ActividadID","IndicadorID","Vigencia","Activo","GlobalID"],

  FIN_ResumenTodoGastoActividad:["ActividadID","FechaCorte","Comprometido","Obligado","Pagos","PorcPagos","GlobalID"],
  FIN_TodoGasto:  ["ActividadID","ActividadGlobalID","FechaCorte","Fuente","CompromisoInicial","CompromisoFinal","SaldoCompromiso","Obligaciones","Pagos","GlobalID"],

  REP_ReporteNarrativo:["ActividadGlobalID","Vigencia","Periodo","Responsable","TextoNarrativo","PrincipalesLogros","DescripcionLogrosAlcanzados","FechaRegistro","GlobalID"],

  REP_AvanceTarea:["TareaGlobalID","Vigencia","Periodo","ValorReportado","Responsable","Observaciones","EvidenciaURL","FechaRegistro","GlobalID"],
  REP_TareaUbicacion_PT:["AvanceTareaGlobalID","CodigoDANE","MunicipioNombre","DescripcionSitio","FechaRegistro","GlobalID"],

  REP_AvanceSubActividad:["SubActividadGlobalID","Vigencia","Periodo","AplicaVigencia","PesoEfectivoVigencia","AvanceCalculado","FechaCalculo","GlobalID"],
  REP_AvanceActividad:["ActividadGlobalID","Vigencia","Periodo","AvanceCalculado","FechaCalculo","GlobalID"]
};

/* ===== Campos visibles por entidad (UI) - sin GUID/GlobalID ===== */
const DISPLAY_FIELDS = {
  CFG_PAC:        ["PACID","Nombre","Peso","Vigencia","Activo"],
  CFG_Linea:      ["LineaID","PACID","Nombre","Peso","Vigencia","Activo"],
  CFG_Programa:   ["ProgramaID","LineaID","Nombre","Peso","Vigencia","Activo"],
  CFG_Proyecto:   ["ProyectoID","ProgramaID","Nombre","Peso","Vigencia","Activo"],
  CFG_Objetivo:   ["ObjetivoID","ProyectoID","Nombre","Peso","Vigencia","Activo"],
  CFG_Actividad:  ["ActividadID","ObjetivoID","Nombre","Peso","Vigencia","VigenciaInicio","VigenciaFin","Activo"],

  CFG_SubActividad:["CodigoSubActividad","ActividadGlobalID","NombreSubActividad","SiglaVariable","UnidadMedida"],
  CFG_Tarea:      ["CodigoTarea","SubActividadGlobalID","NombreTarea","Orden","UnidadMedida","FrecuenciaReporte","TipoValorAvance","EsGeorreferenciable"],

  PLAN_SubActividadVigencia:["SubActividadGlobalID","Vigencia","Aplica","MetaProgramada","PesoSubActividad"],
  PLAN_TareaVigencia:["TareaGlobalID","Vigencia","Aplica","MetaProgramada","PesoTarea","Orden"],

  SEG_Persona:    ["Cedula","Nombre","Correo","Dependencia","Activo"],
  SEG_Asignacion: ["PersonaGlobalID","TareaGlobalID","Vigencia","Activo"],

  FIN_ResumenTodoGastoActividad:["ActividadID","FechaCorte","Comprometido","Obligado","Pagos","PorcPagos"],
  FIN_TodoGasto:  ["ActividadID","FechaCorte","Fuente","CompromisoInicial","CompromisoFinal","SaldoCompromiso","Obligaciones","Pagos"],

  REP_ReporteNarrativo:["ActividadGlobalID","Vigencia","Periodo","Responsable","PrincipalesLogros","FechaRegistro"],
  REP_AvanceTarea:["TareaGlobalID","Vigencia","Periodo","ValorReportado","Responsable","FechaRegistro"],
  REP_TareaUbicacion_PT:["AvanceTareaGlobalID","MunicipioNombre","DescripcionSitio","FechaRegistro"],

  REP_AvanceSubActividad:["SubActividadGlobalID","Vigencia","Periodo","AplicaVigencia","PesoEfectivoVigencia","AvanceCalculado","FechaCalculo"],
  REP_AvanceActividad:["ActividadGlobalID","Vigencia","Periodo","AvanceCalculado","FechaCalculo"]
};

const COL_LABEL = {
  // comunes
  Nombre:"Nombre",
  Peso:"Peso",
  Vigencia:"Vigencia",
  Activo:"Activo",
  GlobalID:"GlobalID",

  // estructura
  PACID:"Código PAC",
  LineaID:"Código Línea",
  ProgramaID:"Código Programa",
  ProyectoID:"Código Proyecto",
  ObjetivoID:"Código Objetivo",
  ActividadID:"Código Actividad",

  PACGlobalID:"PAC (GlobalID)",
  LineaGlobalID:"Línea (GlobalID)",
  ProgramaGlobalID:"Programa (GlobalID)",
  ProyectoGlobalID:"Proyecto (GlobalID)",
  ObjetivoGlobalID:"Objetivo (GlobalID)",

  // actividad ampliada
  NombreActividad:"Nombre actividad",
  VigenciaInicio:"Vigencia inicio",
  VigenciaFin:"Vigencia fin",

  // subactividad / tarea
  CodigoSubActividad:"Código Subactividad",
  ActividadGlobalID:"Actividad",
  NombreSubActividad:"Nombre Subactividad",
  SiglaVariable:"Sigla/Variable",
  UnidadMedida:"Unidad",
  CodigoTarea:"Código Tarea",
  SubActividadGlobalID:"Subactividad",
  NombreTarea:"Nombre Tarea",
  Definicion:"Definición",
  Orden:"Orden",
  FrecuenciaReporte:"Frecuencia",
  TipoValorAvance:"Tipo valor avance",
  EsGeorreferenciable:"Georreferenciable",

  // planeación
  Aplica:"Aplica",
  MetaProgramada:"Meta programada",
  ObservacionesPlaneacion:"Observaciones",
  PesoSubActividad:"Peso Subactividad",
  TareaGlobalID:"Tarea",
  PesoTarea:"Peso Tarea",

  // seguridad
  Cedula:"Cédula",
  Correo:"Correo",
  Dependencia:"Dependencia",
  PersonaID:"PersonaID",
  PersonaGlobalID:"Persona",

  // financiero
  FechaCorte:"Fecha corte",
  Fuente:"Fuente",
  Comprometido:"Comprometido",
  Obligado:"Obligado",
  Pagos:"Pagos",
  PorcPagos:"% Pagos",
  CompromisoInicial:"Compromiso inicial",
  CompromisoFinal:"Compromiso final",
  SaldoCompromiso:"Saldo compromiso",
  Obligaciones:"Obligaciones",

  // reportes
  Periodo:"Periodo",
  Responsable:"Responsable",
  TextoNarrativo:"Texto narrativo",
  PrincipalesLogros:"Principales logros",
  DescripcionLogrosAlcanzados:"Descripción logros",
  FechaRegistro:"Fecha registro",
  ValorReportado:"Valor reportado",
  Observaciones:"Observaciones",
  EvidenciaURL:"Evidencia (URL)",

  // ubicaciones
  AvanceTareaGlobalID:"Avance Tarea",
  CodigoDANE:"Código DANE",
  MunicipioNombre:"Municipio",
  DescripcionSitio:"Descripción sitio",
  Shape:"Geometría",

  // calculados
  AplicaVigencia:"Aplica (vigencia)",
  PesoEfectivoVigencia:"Peso efectivo",
  AvanceCalculado:"Avance calculado",
  FechaCalculo:"Fecha cálculo"
};

/* ===== UI hints ===== */
const FIELD_UI = {
  Vigencia:{ type:"number", min:2020, max:2100 },
  Peso:{ type:"number", step:"any" },
  PesoSubActividad:{ type:"number", step:"any" },
  PesoTarea:{ type:"number", step:"any" },
  MetaProgramada:{ type:"number", step:"any" },
  ValorReportado:{ type:"number", step:"any" },
  Comprometido:{ type:"number", step:"any" },
  Obligado:{ type:"number", step:"any" },
  Pagos:{ type:"number", step:"any" },
  PorcPagos:{ type:"number", step:"any" },
  CompromisoInicial:{ type:"number", step:"any" },
  CompromisoFinal:{ type:"number", step:"any" },
  SaldoCompromiso:{ type:"number", step:"any" },
  Obligaciones:{ type:"number", step:"any" },
  Orden:{ type:"number", step:"1", min:0 },
  Correo:{ type:"email" },
  Activo:{ type:"select", values:["SI","NO"] },
  Aplica:{ type:"select", values:["SI","NO"] },
  AplicaVigencia:{ type:"select", values:["SI","NO"] },
  EsGeorreferenciable:{ type:"select", values:["SI","NO"] }
};

const HELP_TEXT = {
  Peso:"Decimales con punto. Ej: 1.5 (no 1,5).",
  PesoSubActividad:"Peso (%) por vigencia para la Subactividad. Debe sumar máximo 100% por Actividad.",
  PesoTarea:"Peso (%) por vigencia para la Tarea. Debe sumar máximo 100% por Subactividad.",
  UnidadMedida:"Selecciona del listado (dominio si existe).",
  FrecuenciaReporte:"Selecciona del listado (dominio).",
  TipoValorAvance:"Selecciona del listado (dominio)."
};

const DEFAULT_MAXLEN = 160;

/* ===== Jerarquía (FK con GlobalID) + control de pesos ===== */
const PARENT_RULES = {
  CFG_Linea:       { parentField:"PACGlobalID",       parentEntity:"CFG_PAC",        weightField:"Peso" },
  CFG_Programa:    { parentField:"LineaGlobalID",     parentEntity:"CFG_Linea",      weightField:"Peso" },
  CFG_Proyecto:    { parentField:"ProgramaGlobalID",  parentEntity:"CFG_Programa",   weightField:"Peso" },
  CFG_Objetivo:    { parentField:"ProyectoGlobalID",  parentEntity:"CFG_Proyecto",   weightField:"Peso" },
  CFG_Actividad:   { parentField:"ObjetivoGlobalID",  parentEntity:"CFG_Objetivo",   weightField:"Peso" },
  CFG_SubActividad:{ parentField:"ActividadGlobalID", parentEntity:"CFG_Actividad",  weightField:null },
  CFG_Tarea:       { parentField:"SubActividadGlobalID", parentEntity:"CFG_SubActividad", weightField:null },

  PLAN_SubActividadVigencia:{ parentField:"SubActividadGlobalID", parentEntity:"CFG_SubActividad", weightField:"PesoSubActividad" },
  PLAN_TareaVigencia:       { parentField:"TareaGlobalID",        parentEntity:"CFG_Tarea",        weightField:"PesoTarea" },

  // reportes (para lookup)
  REP_AvanceTarea:{ parentField:"TareaGlobalID", parentEntity:"CFG_Tarea", weightField:null },
  REP_TareaUbicacion_PT:{ parentField:"AvanceTareaGlobalID", parentEntity:"REP_AvanceTarea", weightField:null },
  REP_ReporteNarrativo:{ parentField:"ActividadGlobalID", parentEntity:"CFG_Actividad", weightField:null },

  SEG_Asignacion:{ parentField:"PersonaGlobalID", parentEntity:"SEG_Persona", weightField:null }
};

/* ===== Selects adicionales (FK no jerárquico) ===== */
const SELECT_RULES = {
  SEG_Asignacion: {
    PersonaGlobalID: { entity:"SEG_Persona" },
    TareaGlobalID:   { entity:"CFG_Tarea" }
  },
  CFG_Linea: {
    PACGlobalID: { entity:"CFG_PAC" }
  },
  CFG_Programa: {
    LineaGlobalID: { entity:"CFG_Linea" }
  },
  CFG_Proyecto: {
    ProgramaGlobalID: { entity:"CFG_Programa" }
  },
  CFG_Objetivo: {
    ProyectoGlobalID: { entity:"CFG_Proyecto" }
  },
  CFG_Actividad: {
    ObjetivoGlobalID: { entity:"CFG_Objetivo" }
  },
  CFG_SubActividad: {
    ActividadGlobalID: { entity:"CFG_Actividad" }
  },
  CFG_Tarea: {
    SubActividadGlobalID: { entity:"CFG_SubActividad" }
  },
  PLAN_SubActividadVigencia: {
    SubActividadGlobalID: { entity:"CFG_SubActividad" }
  },
  PLAN_TareaVigencia: {
    TareaGlobalID: { entity:"CFG_Tarea" }
  }
};

/* ===== Reglas de unicidad ===== */
const UNIQUE_RULES = [
  { entity:"CFG_PAC",        field:"PACID",        scope:["Vigencia"] },
  { entity:"CFG_Linea",      field:"LineaID",      scope:["Vigencia"] },
  { entity:"CFG_Programa",   field:"ProgramaID",   scope:["Vigencia"] },
  { entity:"CFG_Proyecto",   field:"ProyectoID",   scope:["Vigencia"] },
  { entity:"CFG_Objetivo",   field:"ObjetivoID",   scope:["Vigencia"] },
  { entity:"CFG_Actividad",  field:"ActividadID",  scope:["Vigencia"] },

  // Subactividad/Tarea: por padre
  { entity:"CFG_SubActividad", field:"CodigoSubActividad", scope:["ActividadGlobalID"] },
  { entity:"CFG_Tarea",        field:"CodigoTarea",        scope:["SubActividadGlobalID"] }
];

/* ===== Bloqueo de borrado por hijos (relaciones con GlobalID) ===== */
const CHILDREN_RULES = [
  { parent:"CFG_PAC",         child:"CFG_Linea",      fk:"PACGlobalID" },
  { parent:"CFG_Linea",       child:"CFG_Programa",   fk:"LineaGlobalID" },
  { parent:"CFG_Programa",    child:"CFG_Proyecto",   fk:"ProgramaGlobalID" },
  { parent:"CFG_Proyecto",    child:"CFG_Objetivo",   fk:"ProyectoGlobalID" },
  { parent:"CFG_Objetivo",    child:"CFG_Actividad",  fk:"ObjetivoGlobalID" },
  { parent:"CFG_Actividad",   child:"CFG_SubActividad",fk:"ActividadGlobalID" },
  { parent:"CFG_SubActividad",child:"CFG_Tarea",      fk:"SubActividadGlobalID" },

  { parent:"CFG_SubActividad",child:"PLAN_SubActividadVigencia", fk:"SubActividadGlobalID" },
  { parent:"CFG_Tarea",       child:"PLAN_TareaVigencia",        fk:"TareaGlobalID" },

  { parent:"SEG_Persona",     child:"SEG_Asignacion", fk:"PersonaGlobalID" }
];

/* ===== Estado ===== */
let currentEntityKey = "CFG_PAC";
let currentRows = [];
let editingRow = null;

let catalogs = {
  CFG_PAC:[], CFG_Linea:[], CFG_Programa:[], CFG_Proyecto:[], CFG_Objetivo:[], CFG_Actividad:[],
  CFG_SubActividad:[], CFG_Tarea:[], SEG_Persona:[], REP_AvanceTarea:[]
};
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
function labelCol(c){ return COL_LABEL[c] || c; }
function isReadOnly(key){ return READONLY.has(key); }

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
  if (fieldName.includes("Codigo")) return 60;
  if (fieldName.endsWith("ID")) return 80;
  return DEFAULT_MAXLEN;
}
function isGuidLikeField(entityKey, fieldName){
  const f = metaCache[entityKey]?.fieldsByName?.[fieldName];
  if (!f) return false;
  return (f.type === "esriFieldTypeGUID" || f.type === "esriFieldTypeGlobalID");
}
function shouldHideField(entityKey, fieldName){
  // ocultar cualquier GUID/GlobalID y los campos internos PersonaID/IndicadorID en admin
  if (isGuidLikeField(entityKey, fieldName)) return true;
  if (["PersonaID","IndicadorID"].includes(fieldName)) return true;
  return false;
}

/* ===== Catálogos (para selects / lookups) ===== */
async function loadCatalogs(){
  const vig = (elVig?.value || "").trim();
  const vigWhere = vig ? `Vigencia = ${Number(vig)}` : "1=1";

  async function list(key, outFields, orderBy){
    await loadEntityMetadata(key);
    const where = (FIELDS[key] || []).includes("Vigencia") ? vigWhere : "1=1";
    const r = await fetchJson(`${entityUrl(key)}/query`, {
      f:"json",
      where,
      outFields,
      orderByFields: orderBy || outFields.split(",")[0] + " ASC",
      returnGeometry:"false"
    });
    return (r.features||[]).map(f=>f.attributes);
  }

  // Estructura (incluye GlobalID + código + nombre)
  catalogs.CFG_PAC        = await list("CFG_PAC",        "GlobalID,PACID,Nombre,Vigencia", "Nombre ASC");
  catalogs.CFG_Linea      = await list("CFG_Linea",      "GlobalID,LineaID,Nombre,PACID,PACGlobalID,Vigencia", "Nombre ASC");
  catalogs.CFG_Programa   = await list("CFG_Programa",   "GlobalID,ProgramaID,Nombre,LineaID,LineaGlobalID,Vigencia", "Nombre ASC");
  catalogs.CFG_Proyecto   = await list("CFG_Proyecto",   "GlobalID,ProyectoID,Nombre,ProgramaID,ProgramaGlobalID,Vigencia", "Nombre ASC");
  catalogs.CFG_Objetivo   = await list("CFG_Objetivo",   "GlobalID,ObjetivoID,Nombre,ProyectoID,ProyectoGlobalID,Vigencia", "Nombre ASC");
  catalogs.CFG_Actividad  = await list("CFG_Actividad",  "GlobalID,ActividadID,Nombre,ObjetivoID,ObjetivoGlobalID,Vigencia,Activo", "Nombre ASC");

  catalogs.CFG_SubActividad = await list("CFG_SubActividad", "GlobalID,CodigoSubActividad,NombreSubActividad,ActividadGlobalID", "NombreSubActividad ASC");
  catalogs.CFG_Tarea        = await list("CFG_Tarea",        "GlobalID,CodigoTarea,NombreTarea,SubActividadGlobalID,Orden", "Orden ASC");

  catalogs.SEG_Persona    = await list("SEG_Persona",    "GlobalID,Cedula,Nombre,Correo,Activo", "Nombre ASC");

  // para resolver ubicaciones -> avance tarea
  catalogs.REP_AvanceTarea = await list("REP_AvanceTarea", "GlobalID,TareaGlobalID,Vigencia,Periodo,FechaRegistro", "FechaRegistro DESC");
}

/* ===== Lookups para mostrar en tablas (en vez de GlobalID) ===== */
function lookupByGlobalId(list, globalId, labelFn){
  const x = (list || []).find(r => String(r.GlobalID) === String(globalId));
  return x ? labelFn(x) : (globalId || "");
}

function labelPAC(x){ return `${x.PACID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelLinea(x){ return `${x.LineaID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelPrograma(x){ return `${x.ProgramaID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelProyecto(x){ return `${x.ProyectoID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelObjetivo(x){ return `${x.ObjetivoID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelActividad(x){ return `${x.ActividadID || ""}${x.Nombre ? " — " + x.Nombre : ""}`.trim(); }
function labelSubActividad(x){ return `${x.CodigoSubActividad || ""}${x.NombreSubActividad ? " — " + x.NombreSubActividad : ""}`.trim(); }
function labelTarea(x){ return `${x.CodigoTarea || ""}${x.NombreTarea ? " — " + x.NombreTarea : ""}`.trim(); }
function labelPersona(x){ return `${x.Nombre || ""}${x.Cedula ? " - " + x.Cedula : ""}`.trim(); }

/* ===== Query ===== */
function buildWhere(key){
  const q = (elSearch?.value || "").trim().replaceAll("'","''");
  const vig = (elVig?.value || "").trim();
  const parts = ["1=1"];
  if (vig && (FIELDS[key] || []).includes("Vigencia")) parts.push(`Vigencia = ${Number(vig)}`);

  if (q){
    const candidates = [
      "Nombre","NombreActividad","NombreSubActividad","NombreTarea","PACID","LineaID","ProgramaID","ProyectoID","ObjetivoID","ActividadID",
      "CodigoSubActividad","CodigoTarea","Cedula","Correo","Dependencia","Fuente","MunicipioNombre","DescripcionSitio","Responsable"
    ];
    const usable = candidates.filter(f => (FIELDS[key] || []).includes(f));
    if (usable.length){
      parts.push("(" + usable.map(f => `${f} LIKE '%${q}%'`).join(" OR ") + ")");
    }
  }
  return parts.join(" AND ");
}

/* ===== Render tabla ===== */
function renderTable(key, rows){
  const cols = ["__actions", ...(DISPLAY_FIELDS[key] || (FIELDS[key] || []).filter(f=>!shouldHideField(key,f)))];

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
        const dis = isReadOnly(key);
        return `<td>
          <div class="rowactions">
            <button class="btn btn--ghost btn-xs" data-act="edit" data-oid="${oid}" ${dis?"disabled":""}>Editar</button>
            <button class="btn btn--danger btn-xs" data-act="del" data-oid="${oid}" ${dis?"disabled":""}>Eliminar</button>
          </div>
        </td>`;
      }

      // Resoluciones (mostrar nombre en vez de GlobalID)
      if (c==="PACGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_PAC, a.PACGlobalID, labelPAC))}</td>`;
      if (c==="LineaGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Linea, a.LineaGlobalID, labelLinea))}</td>`;
      if (c==="ProgramaGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Programa, a.ProgramaGlobalID, labelPrograma))}</td>`;
      if (c==="ProyectoGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Proyecto, a.ProyectoGlobalID, labelProyecto))}</td>`;
      if (c==="ObjetivoGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Objetivo, a.ObjetivoGlobalID, labelObjetivo))}</td>`;
      if (c==="ActividadGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Actividad, a.ActividadGlobalID, labelActividad))}</td>`;
      if (c==="SubActividadGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_SubActividad, a.SubActividadGlobalID, labelSubActividad))}</td>`;
      if (c==="TareaGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.CFG_Tarea, a.TareaGlobalID, labelTarea))}</td>`;
      if (c==="PersonaGlobalID") return `<td>${esc(lookupByGlobalId(catalogs.SEG_Persona, a.PersonaGlobalID, labelPersona))}</td>`;
      if (key==="REP_TareaUbicacion_PT" && c==="AvanceTareaGlobalID"){
        return `<td>${esc(lookupByGlobalId(catalogs.REP_AvanceTarea, a.AvanceTareaGlobalID, x=>`${x.Vigencia || ""} ${x.Periodo || ""}`.trim()))}</td>`;
      }

      const v = a[c];
      if ((c.startsWith("Fecha") || c.endsWith("Fecha") || c.includes("Fecha")) && v){
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
  btnNew.disabled = isReadOnly(key);

  setStatus("Cargando…");
  await loadEntityMetadata(key);
  await loadCatalogs();

  const outFields = ["OBJECTID", ...(FIELDS[key] || [])].join(",");
  const r = await fetchJson(`${entityUrl(key)}/query`, {
    f:"json",
    where: buildWhere(key),
    outFields,
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

/* ===== Select (FK) ===== */
function optionsFrom(list, valueField, labelFn){
  const opts = (list || []).map(x => `<option value="${esc(x[valueField])}">${esc(labelFn(x))}</option>`).join("");
  return `<option value="">— Selecciona —</option>${opts}`;
}
function getCatalogForEntity(entityKey){
  return catalogs[entityKey] || [];
}
function getLabelFn(entityKey){
  if (entityKey==="CFG_PAC") return labelPAC;
  if (entityKey==="CFG_Linea") return labelLinea;
  if (entityKey==="CFG_Programa") return labelPrograma;
  if (entityKey==="CFG_Proyecto") return labelProyecto;
  if (entityKey==="CFG_Objetivo") return labelObjetivo;
  if (entityKey==="CFG_Actividad") return labelActividad;
  if (entityKey==="CFG_SubActividad") return labelSubActividad;
  if (entityKey==="CFG_Tarea") return labelTarea;
  if (entityKey==="SEG_Persona") return labelPersona;
  if (entityKey==="REP_AvanceTarea") return (x)=>`${x.Vigencia || ""} ${x.Periodo || ""}`.trim();
  return (x)=>x.GlobalID;
}

function makeSelectField(entityKey, fieldName, targetEntity, currentValue){
  const list = getCatalogForEntity(targetEntity);
  const labelFn = getLabelFn(targetEntity);
  const opts = optionsFrom(list, "GlobalID", labelFn);

  return `
    <div class="field">
      <label>${esc(labelCol(fieldName))}</label>
      <select data-field="${esc(fieldName)}" data-fk="1">${opts}</select>
      <div class="field__meta"><div class="help-text">Selecciona el registro relacionado (no se digita).</div><span></span></div>
    </div>`;
}
function setSelectValue(fieldName, value){
  const sel = formDyn.querySelector(`select[data-field="${CSS.escape(fieldName)}"]`);
  if (sel) sel.value = value ?? "";
}

/* ===== Input general (oculta GUID/GlobalID) ===== */
function makeInput(entityKey, fieldName, value){
  const ui = FIELD_UI[fieldName] || { type:"text" };
  const help = HELP_TEXT[fieldName] || "";
  const maxLen = getMaxLenForField(entityKey, fieldName);

  // Select FK (jerarquía + extra)
  const selectRule = SELECT_RULES?.[entityKey]?.[fieldName];
  if (selectRule?.entity){
    return makeSelectField(entityKey, fieldName, selectRule.entity, value);
  }

  // GUID/GlobalID: oculto
  if (shouldHideField(entityKey, fieldName)){
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
  if(["Definicion","ObservacionesPlaneacion","TextoNarrativo","PrincipalesLogros","DescripcionLogrosAlcanzados","Observaciones","EvidenciaURL","DescripcionSitio"].includes(fieldName)){
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
  if (isReadOnly(entityKey)) return;
  editingRow = null;
  await loadEntityMetadata(entityKey);
  await loadCatalogs();

  modalTitle.textContent = `Nuevo • ${FRIENDLY[entityKey] || entityKey}`;
  modalSubtitle.textContent = FRIENDLY_DESC[entityKey] || "Completa los campos y guarda.";
  btnDelete.style.display = "none";

  const inputs = (FIELDS[entityKey] || [])
    .filter(f => !["GlobalID"].includes(f)) // GlobalID se lo asigna AGOL
    .map(f => makeInput(entityKey, f, ""))
    .join("");

  formDyn.innerHTML = `<div class="formgrid">${inputs}</div>`;

  // defaults
  const vigField = formDyn.querySelector(`[data-field="Vigencia"]`);
  if (vigField && elVig.value) vigField.value = elVig.value;

  const activoField = formDyn.querySelector(`[data-field="Activo"]`);
  if (activoField && !activoField.value) activoField.value = "SI";

  const aplicaField = formDyn.querySelector(`[data-field="Aplica"]`);
  if (aplicaField && !aplicaField.value) aplicaField.value = "SI";

  wireCharCounters();
  openModal();
}

async function openModalEdit(entityKey, row){
  if (isReadOnly(entityKey)) return;
  editingRow = row;
  await loadEntityMetadata(entityKey);
  await loadCatalogs();

  modalTitle.textContent = `Editar • ${FRIENDLY[entityKey] || entityKey}`;
  modalSubtitle.textContent = "Actualiza y guarda los cambios.";
  btnDelete.style.display = "inline-flex";

  const inputs = (FIELDS[entityKey] || [])
    .filter(f => !["GlobalID"].includes(f))
    .map(f => makeInput(entityKey, f, row.attributes[f]))
    .join("");
  formDyn.innerHTML = `<div class="formgrid">${inputs}</div>`;

  // set selects
  formDyn.querySelectorAll("select[data-field]").forEach(sel=>{
    const f = sel.getAttribute("data-field");
    setSelectValue(f, row.attributes[f]);
  });

  wireCharCounters();
  openModal();
}

/* ===== Validaciones ===== */
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

    if (v==="") v = null;
    a[f] = v;
  });

  // FK requerido (si es select)
  formDyn.querySelectorAll('select[data-fk="1"]').forEach(sel=>{
    const f = sel.getAttribute("data-field");
    if (!a[f]) throw new Error(`Debes seleccionar ${labelCol(f)} (registro relacionado).`);
  });

  // PK lógico requerido (cuando aplica) para evitar registros sin código
  const pk = ENTITY[entityKey].pk;
  if (!editingRow && pk && !isGuidLikeField(entityKey, pk) && !a[pk]){
    // solo exigir si el campo está en el form (no es oculto)
    const inForm = !!formDyn.querySelector(`[data-field="${CSS.escape(pk)}"]`);
    if (inForm) throw new Error(`El campo ${labelCol(pk)} es obligatorio.`);
  }

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

    for (const s of (r.scope || [])){
      const sv = attrs[s];
      if (sv !== null && sv !== undefined) parts.push(`${s} = '${String(sv).replaceAll("'", "''")}'`);
    }

    const qr = await fetchJson(`${entityUrl(entityKey)}/query`, {
      f:"json",
      where: parts.join(" AND "),
      outFields: "OBJECTID",
      returnGeometry: "false"
    });

    const hits = (qr.features || []).map(f => f.attributes.OBJECTID);
    const myOID = editingRow?.attributes?.OBJECTID ?? null;

    const exists = hits.some(oid => myOID ? oid !== myOID : true);
    if (exists) throw new Error(`Ya existe un registro con ${labelCol(field)} = "${val}". Verifica duplicados.`);
  }
}

async function validateWeightSum(entityKey, attrs){
  const rule = PARENT_RULES[entityKey];
  if (!rule) return;

  const { parentField, weightField } = rule;
  if (!weightField) return;
  if (attrs[weightField] === null || attrs[weightField] === undefined) return;

  const parentVal = attrs[parentField];
  if (!parentVal) return;

  const vig = attrs.Vigencia ?? (elVig?.value ? Number(elVig.value) : null);

  const whereParts = [`${parentField} = '${String(parentVal).replaceAll("'", "''")}'`];
  if ((FIELDS[entityKey] || []).includes("Vigencia") && vig) whereParts.push(`Vigencia = ${Number(vig)}`);
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

function getRowGlobalID(entityKey, row){
  return row?.attributes?.GlobalID ?? null;
}

async function validateDeleteHasChildren(entityKey, row){
  const parentGID = getRowGlobalID(entityKey, row);
  if (!parentGID) return;

  const rules = CHILDREN_RULES.filter(r => r.parent === entityKey);
  for (const rr of rules){
    const child = rr.child;
    const fk = rr.fk;

    const r = await fetchJson(`${entityUrl(child)}/query`, {
      f:"json",
      where: `${fk} = '${String(parentGID).replaceAll("'", "''")}'`,
      outFields: "OBJECTID",
      returnGeometry:"false"
    });

    if ((r.features || []).length > 0){
      throw new Error(`No se puede eliminar: existen registros hijos en ${FRIENDLY[child]} (relación ${labelCol(fk)}).`);
    }
  }
}

/* ===== Save/Delete ===== */
async function save(entityKey){
  if (isReadOnly(entityKey)) return;

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
  if (isReadOnly(entityKey)) return;

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
  if (isReadOnly(entityKey)) return;
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
      if (isReadOnly(currentEntityKey)) return;
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

    // init
    await loadEntityMetadata(currentEntityKey);
    await loadCatalogs();
    await loadEntity(currentEntityKey);

    setStatus("Listo.","success");
  }catch(e){
    console.error(e);
    setStatus("Error inicializando la administración.","error");
  }
})();
