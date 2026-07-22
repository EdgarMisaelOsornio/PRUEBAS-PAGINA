/* =========================
   PLAZA PICKER — WANSOFT
   ========================= */

/* ─────────────────────────────────────────────
   CATÁLOGO DE PLAZAS — cargado desde localStorage
   (fallback: plazas predeterminadas del XLSX)
───────────────────────────────────────────── */

const PLAZAS_PREDETERMINADAS = [
  "AGS - CCO SUPER VOY ANDENES SAP",
  "AGS - CCO SUPER VOY FOOD SAP",
  "CDJ - CCO DON CAMIONE SAP",
  "CDJ - CCO SUPER VOY 1 SAP",
  "CDJ - CCO SUPER VOY ISLA 2 SAP",
  "CDMX - SEN CASA DEL MEXICANO SAP",
  "CDMX - SEN LA ISLA SAP",
  "CDMX - SEN LAS CARNITAS SAP",
  "CDMX - SEN LAS LUCHONAS 6 SAP",
  "CDMX - SEN MOLIENDAS DE MEXICO 1 SAP",
  "CDMX - SEN MOLIENDAS DE MEXICO 5 SAP",
  "CDMX - SEN MOLIENDAS DE MEXICO 7 SAP",
  "CDMX - SEN MOLIENDAS DE MEXICO SAP",
  "CDMX - SEN PIZZERIA NEPTUNO SAP",
  "CDMX - SEN RINCON DULCE SAP",
  "CDMX - SEN STAR GREEN SAP",
  "CDMX - SEN SUPER VOY 1 SAP",
  "CDMX - SEN SUPER VOY 2 SAP",
  "CDMX - SEN SUPER VOY 3 SAP",
  "CDMX - SEN SUPER VOY 4 SAP",
  "CDMX - SEN SUPER VOY 5 SAP",
  "CDMX - SEN SUPER VOY 6 SAP",
  "CDMX - SEN SUPER VOY 7 SAP",
  "CDMX - SEN SUPER VOY 8 SAP",
  "CDMX - SEN SUPER VOY ANDENES SAP",
  "CDMX - SEN TAMALES CALLE SAP",
  "CDV - SEN DON CAMIONE 1 SAP",
  "CDV - SEN SUPER VOY 1 SAP",
  "CDV - SEN SUPER VOY 2 SAP",
  "CHIH - SEN SUPER VOY 1 SAP",
  "CHIH - SEN SUPER VOY 3 SAP",
  "CONS - SEN SUPER VOY 1 SAP",
  "DGO - SEN SUPER VOY 1 SAP",
  "DGO - SEN SUPER VOY 2 SAP",
  "DGO - SEN SUPER VOY 3 SAP",
  "ENC - SEN SUPER VOY ANDENES SAP",
  "FRES - SEN SUPER VOY 1 SAP",
  "FRES - SEN SUPER VOY 2 SAP",
  "GDL - CCO CASA DEL MEXICANO SAP",
  "GDL - CCO RINCON DULCE SAP",
  "GDL - CCO SUPER VOY 3 ANDEN SAP",
  "GDL - CCO SUPER VOY 7 ANDEN SAP",
  "GDL - CCO SUPER VOY 7 SALA ESPERA SAP",
  "GOMP - SEN SUPER VOY 1 SAP",
  "GOMP - SEN SUPER VOY 2 SAP",
  "GUA - SEN SUPER VOY SAP",
  "HER - CCO CASA DEL MEXICANO SAP",
  "HER - CCO SUPER VOY ANDENES SAP",
  "HER - CCO SUPER VOY SALA ESPERA SAP",
  "LMO - CCO SUPER VOY ANDEN SAP"
];

// Cargar desde localStorage o usar predeterminadas
function _cargarCatalogoPlazas() {
  try {
    const saved = localStorage.getItem("wansoft_plazas_catalogo");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  return [...PLAZAS_PREDETERMINADAS];
}

function _guardarCatalogoPlazas() {
  try {
    localStorage.setItem("wansoft_plazas_catalogo", JSON.stringify(PLAZAS_CATALOGO));
    _actualizarContadorPlazas();
  } catch(e) {}
}

let PLAZAS_CATALOGO = _cargarCatalogoPlazas();

/* ────────────────────────────────────────────────────────
   MODAL GESTIONAR PLAZAS
──────────────────────────────────────────────────────── */

function abrirModalPlazas() {
  renderListaPlazasModal();
  _actualizarContadorPlazas();
  document.getElementById("modalPlazas").classList.add("open");
  // Drag & drop en la zona de importación
  const zone = document.getElementById("plazasImportZone");
  if (zone && !zone._ddReady) {
    zone._ddReady = true;
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dd-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dd-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.classList.remove("dd-over");
      const file = e.dataTransfer.files[0];
      if (file) _procesarArchivoExcel(file);
    });
  }
}

function cerrarModalPlazas() {
  document.getElementById("modalPlazas").classList.remove("open");
  const inp = document.getElementById("plazasModalSearch");
  if (inp) inp.value = "";
}

function renderListaPlazasModal() {
  const list = document.getElementById("plazasModalList");
  if (!list) return;
  const q = (document.getElementById("plazasModalSearch")?.value || "").toUpperCase().trim();
  const filtradas = PLAZAS_CATALOGO.filter(p => !q || p.toUpperCase().includes(q));

  if (filtradas.length === 0) {
    list.innerHTML = `<div class="plazas-empty">Sin resultados para "<strong>${q}</strong>"</div>`;
    return;
  }

  list.innerHTML = filtradas.map((p, i) => {
    const idxReal = PLAZAS_CATALOGO.indexOf(p);
    const label = q
      ? p.replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + ")","gi"), "<em>$1</em>")
      : p;
    return `<div class="plaza-modal-item">
      <span class="plaza-modal-name">${label}</span>
      <button class="plaza-modal-del" onclick="eliminarPlazaCatalogo(${idxReal})" title="Eliminar">✕</button>
    </div>`;
  }).join("");
}

function _actualizarContadorPlazas() {
  const el = document.getElementById("plazasCount");
  if (el) el.textContent = PLAZAS_CATALOGO.length + " plaza" + (PLAZAS_CATALOGO.length !== 1 ? "s" : "");
}

function agregarPlazaCatalogo() {
  const inp = document.getElementById("nuevaPlazaInput");
  if (!inp) return;
  const nombre = inp.value.trim().toUpperCase();
  if (!nombre) return;
  if (PLAZAS_CATALOGO.includes(nombre)) {
    inp.classList.add("input-error");
    setTimeout(() => inp.classList.remove("input-error"), 1000);
    return;
  }
  PLAZAS_CATALOGO.push(nombre);
  PLAZAS_CATALOGO.sort();
  _guardarCatalogoPlazas();
  renderListaPlazasModal();
  inp.value = "";
  inp.focus();
}

function eliminarPlazaCatalogo(idx) {
  if (idx < 0 || idx >= PLAZAS_CATALOGO.length) return;
  PLAZAS_CATALOGO.splice(idx, 1);
  _guardarCatalogoPlazas();
  renderListaPlazasModal();
}

function restaurarPlazasPredeterminadas() {
  if (!confirm("¿Restaurar el catálogo original de " + PLAZAS_PREDETERMINADAS.length + " plazas? Se perderán los cambios actuales.")) return;
  PLAZAS_CATALOGO.length = 0;
  PLAZAS_PREDETERMINADAS.forEach(p => PLAZAS_CATALOGO.push(p));
  _guardarCatalogoPlazas();
  renderListaPlazasModal();
}

/* ────────────────────────────────────────────────────────
   IMPORTAR EXCEL (.xlsx)
──────────────────────────────────────────────────────── */

function importarExcelPlazas(input) {
  const file = input?.files?.[0];
  if (file) _procesarArchivoExcel(file);
  if (input) input.value = ""; // limpiar para poder volver a seleccionar el mismo archivo
}

function _procesarArchivoExcel(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    alert("Por favor selecciona un archivo .xlsx o .xls");
    return;
  }

  const zone = document.getElementById("plazasImportZone");
  if (zone) zone.classList.add("importing");

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Extraer valores de la primera columna no vacíos
      const nuevas = [];
      rows.forEach(row => {
        const val = String(row[0] || "").trim().toUpperCase();
        if (val && !nuevas.includes(val)) nuevas.push(val);
      });

      if (nuevas.length === 0) {
        alert("No se encontraron plazas en la primera columna del Excel.");
        return;
      }

      // Fusionar o reemplazar
      const confirmar = confirm(
        "Se encontraron " + nuevas.length + " plazas en el archivo.\n\n" +
        "¿Deseas REEMPLAZAR el catálogo completo?\n" +
        "(Cancela para AGREGAR las nuevas al catálogo existente)"
      );

      if (confirmar) {
        PLAZAS_CATALOGO.length = 0;
        nuevas.forEach(p => PLAZAS_CATALOGO.push(p));
      } else {
        nuevas.forEach(p => {
          if (!PLAZAS_CATALOGO.includes(p)) PLAZAS_CATALOGO.push(p);
        });
        PLAZAS_CATALOGO.sort();
      }

      _guardarCatalogoPlazas();
      renderListaPlazasModal();

    } catch(err) {
      alert("Error al leer el archivo: " + err.message);
    } finally {
      if (zone) zone.classList.remove("importing");
    }
  };
  reader.readAsArrayBuffer(file);
}

const _plazasSeleccionadas = {};





function _getPlazas(id) {
  if (!_plazasSeleccionadas[id]) _plazasSeleccionadas[id] = [];
  return _plazasSeleccionadas[id];
}

function _actualizarTextarea(id) {
  const ta = document.getElementById("in-plazas-" + id);
  if (ta) {
    ta.value = _getPlazas(id).join("\n");
    syncPage(id);
  }
}

function _renderChips(id) {
  const container = document.getElementById("plaza-chips-" + id);
  if (!container) return;
  const plazas = _getPlazas(id);
  container.innerHTML = plazas.map(p =>
    `<span class="plaza-chip">${p}<button type="button" title="Quitar" onclick="quitarPlaza('${id}', '${p.replace(/'/g, "\\'")}')">\u2715</button></span>`
  ).join("");
}

function abrirDropdownPlazas(id) {
  filtrarPlazas(id);
}

function filtrarPlazas(id) {
  const input = document.getElementById("plaza-search-" + id);
  const dropdown = document.getElementById("plaza-dropdown-" + id);
  if (!input || !dropdown) return;

  const query = input.value.toUpperCase().trim();
  const seleccionadas = _getPlazas(id);

  const coincidencias = PLAZAS_CATALOGO.filter(p =>
    !query || p.toUpperCase().includes(query)
  );

  if (coincidencias.length === 0) {
    dropdown.innerHTML = `<li class="plaza-dropdown-empty">Sin resultados</li>`;
  } else {
    dropdown.innerHTML = coincidencias.map(p => {
      const yaEsta = seleccionadas.includes(p);
      const esc = p.replace(/'/g, "\\\'");
      const labelHtml = query
        ? p.replace(new RegExp("(" + query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + ")", "gi"), "<em>$1</em>")
        : p;
      return `<li class="${yaEsta ? "ya-seleccionada" : ""}" onclick="agregarPlaza('${id}', '${esc}')">${labelHtml}${yaEsta ? " \u2713" : ""}</li>`;
    }).join("");
  }

  dropdown.classList.add("open");
}

function agregarPlaza(id, plaza) {
  const plazas = _getPlazas(id);
  if (!plazas.includes(plaza)) {
    plazas.push(plaza);
    _renderChips(id);
    _actualizarTextarea(id);
  }
  const input = document.getElementById("plaza-search-" + id);
  if (input) { input.value = ""; }
  filtrarPlazas(id);
}

function quitarPlaza(id, plaza) {
  const plazas = _getPlazas(id);
  const idx = plazas.indexOf(plaza);
  if (idx !== -1) plazas.splice(idx, 1);
  _renderChips(id);
  _actualizarTextarea(id);
}

document.addEventListener("click", function(e) {
  document.querySelectorAll(".plaza-dropdown.open").forEach(function(dd) {
    const wrap = dd.closest(".plaza-search-wrap");
    if (wrap && !wrap.contains(e.target)) {
      dd.classList.remove("open");
    }
  });
});

/* =========================
   MAYUSCULAS AUTOMATICAS
   ========================= */



function toUpper(input) {
  const pos = input.selectionStart;
  input.value = input.value.toUpperCase();
  input.setSelectionRange(pos, pos);
}

function toUpperTextarea(el) {
  const pos = el.selectionStart;
  el.value = el.value.toUpperCase();
  el.setSelectionRange(pos, pos);
}

let pageCount = 0;

/* =========================
   SISTEMAS — en memoria (fuente: sistemas.js cargado como script)
   Los cambios se guardan en GitHub vía /api/github
   ========================= */

// Copia mutable en memoria — se actualiza tras cada commit exitoso
let sistemasEnMemoria = [...SISTEMAS_CONFIG];

function getSistemas() {
  return sistemasEnMemoria;
}

function esCorporativo(nombreSistema) {
  return sistemasEnMemoria.find(s => s.nombre === nombreSistema)?.tipo === 'corporativo';
}

function esWansoft(nombreSistema) {
  return sistemasEnMemoria.find(s => s.nombre === nombreSistema)?.tipo === 'wansoft';
}

// Genera el contenido de sistemas.js a partir de la lista actual
function generarContenidoSistemasJS(lista) {
  const lineas = lista
    .map(s => `  { nombre: "${s.nombre}", tipo: "${s.tipo}" }`)
    .join(',\n');
  return (
`/**
 * ============================================================
 *  CONFIGURACIÓN DE SISTEMAS — sistemas.js
 * ============================================================
 *  Archivo gestionado automáticamente desde el panel de politicas.html
 *  Puedes editar desde la página con el botón ⚙️ Gestionar sistemas
 *
 *  tipo: "normal"      → tabla simple  (usuario + contraseña)
 *        "corporativo" → tabla múltiple (Comisión, Citas, GN)
 *        "wansoft"     → formato Grupo Estrella Blanca / Los Senderos (con Plaza)
 * ============================================================
 */

const SISTEMAS_CONFIG = [
${lineas}
];
`);
}

// Guarda la lista en GitHub haciendo commit de sistemas.js
async function guardarSistemasEnGitHub(lista) {
  const FILE_PATH = 'public/POLITICAS/sistemas.js';

  // 1. Obtener SHA del archivo actual
  const resGET = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
  const meta = await resGET.json();
  if (!meta.sha) throw new Error('No se pudo obtener el SHA de sistemas.js');

  // 2. Generar contenido y codificar en base64
  const contenido = generarContenidoSistemasJS(lista);
  const base64 = btoa(unescape(encodeURIComponent(contenido)));

  // 3. Commit vía API route (el token queda seguro en el servidor)
  const resPUT = await fetch('/api/github', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: FILE_PATH,
      sha: meta.sha,
      content: base64,
      message: `⚙️ Sistemas actualizados: ${lista.length} sistema(s)`
    })
  });

  if (!resPUT.ok) throw new Error('Error al hacer commit en GitHub');

  // 4. Actualizar la copia en memoria para que la sesión actual lo refleje
  sistemasEnMemoria = lista.map(s => ({ ...s }));
  return true;
}

/* =========================
   TOAST
   ========================= */

function showToast(msg, esError = false) {
  let t = document.getElementById('sd-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'sd-toast';
    t.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
      padding:12px 22px; border-radius:12px; font-size:14px; font-weight:600;
      color:#fff; z-index:9999; opacity:0; transition:all 0.3s ease;
      box-shadow:0 8px 30px rgba(0,0,0,0.25); pointer-events:none; white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = esError ? '#e17055' : '#0f766e';
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3200);
}

/* =========================
   MODAL — GESTIÓN DE SISTEMAS
   ========================= */

let dragSrcIndex = null;
// Lista de trabajo en el modal (se aplica solo al guardar)
let listaModal = [];

function abrirModalSistemas() {
  listaModal = sistemasEnMemoria.map(s => ({ ...s }));
  renderListaSistemas();
  actualizarBtnGuardar();
  document.getElementById('modalSistemas').classList.add('open');
  document.getElementById('nuevoSistemaNombre').focus();
}

function cerrarModalSistemas() {
  document.getElementById('modalSistemas').classList.remove('open');
  // Refrescar selects y hojas con la lista en memoria (sin cambios no guardados)
  actualizarTodosLosSelects();
  for (let id = 1; id <= pageCount; id++) {
    if (document.getElementById('sheet-' + id) || document.getElementById('sheet-wansoft-' + id)) syncPage(id);
  }
}

document.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalSistemas')) cerrarModalSistemas();
});

function actualizarBtnGuardar() {
  const btn = document.getElementById('btnGuardarGitHub');
  if (!btn) return;
  const hayDiferencia = JSON.stringify(listaModal) !== JSON.stringify(sistemasEnMemoria);
  btn.disabled = !hayDiferencia;
  btn.style.opacity = hayDiferencia ? '1' : '0.45';
}

function renderListaSistemas() {
  const container = document.getElementById('sistemasList');
  const count = document.getElementById('sistemasCount');
  count.textContent = `${listaModal.length} sistema${listaModal.length !== 1 ? 's' : ''}`;

  container.innerHTML = '';

  if (listaModal.length === 0) {
    container.innerHTML = '<div style="text-align:center;opacity:0.4;font-size:13px;padding:20px 0;">Sin sistemas. Agrega uno abajo ↓</div>';
    return;
  }

  listaModal.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'sistema-row';
    row.draggable = true;
    row.dataset.index = i;

    const esCorp = s.tipo === 'corporativo';
    row.innerHTML = `
      <span class="drag-handle" title="Arrastrar para reordenar">⠿</span>
      <span class="sistema-nombre">${s.nombre}</span>
      <span class="badge-tipo ${esCorp ? 'badge-corp' : 'badge-normal'}">
        ${esCorp ? 'Corporativo' : 'Normal'}
      </span>
      <button class="btn-del-sistema" onclick="eliminarSistema(${i})" title="Eliminar sistema">🗑</button>
    `;

    row.addEventListener('dragstart', () => {
      dragSrcIndex = i;
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (e) => e.preventDefault());
    row.addEventListener('drop', () => {
      if (dragSrcIndex === null || dragSrcIndex === i) return;
      const [moved] = listaModal.splice(dragSrcIndex, 1);
      listaModal.splice(i, 0, moved);
      dragSrcIndex = null;
      renderListaSistemas();
      actualizarBtnGuardar();
    });

    container.appendChild(row);
  });
}

function agregarSistema() {
  const input = document.getElementById('nuevoSistemaNombre');
  const nombre = input.value.trim().toUpperCase();
  if (!nombre) { input.focus(); return; }

  const tipo = document.querySelector('input[name="nuevoTipo"]:checked')?.value || 'normal';

  if (listaModal.find(s => s.nombre === nombre)) {
    input.style.borderColor = '#e17055';
    input.placeholder = '⚠️ Ya existe ese sistema';
    input.value = '';
    setTimeout(() => {
      input.style.borderColor = '';
      input.placeholder = 'Nombre del sistema';
    }, 1800);
    return;
  }

  listaModal.push({ nombre, tipo });
  input.value = '';
  input.focus();
  renderListaSistemas();
  actualizarBtnGuardar();
}

function eliminarSistema(index) {
  const nombre = listaModal[index]?.nombre;
  if (!nombre) return;
  if (!confirm(`¿Eliminar el sistema "${nombre}"?`)) return;
  listaModal.splice(index, 1);
  renderListaSistemas();
  actualizarBtnGuardar();
}

function restaurarSistemas() {
  if (!confirm('¿Restaurar la lista predeterminada de sistemas?')) return;
  listaModal = SISTEMAS_CONFIG.map(s => ({ ...s }));
  renderListaSistemas();
  actualizarBtnGuardar();
}

async function guardarCambiosSistemas() {
  const btn = document.getElementById('btnGuardarGitHub');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Guardando...';

  try {
    await guardarSistemasEnGitHub(listaModal);
    showToast('✅ Sistemas guardados en GitHub');
    actualizarBtnGuardar();
    // Refrescar selects con la nueva lista
    actualizarTodosLosSelects();
    for (let id = 1; id <= pageCount; id++) {
      if (document.getElementById('sheet-' + id)) syncPage(id);
    }
  } catch (e) {
    console.error(e);
    showToast('❌ Error al guardar en GitHub', true);
    btn.disabled = false;
  } finally {
    btn.textContent = textoOriginal;
    actualizarBtnGuardar();
  }
}

/* =========================
   UTILIDADES
   ========================= */

function fechaActual() {
  const meses = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
  ];
  const f = new Date();
  const diaFormateado = String(f.getDate()).padStart(2, '0');
  return `<b>Ciudad de México</b> a <b>${diaFormateado}</b> de <b>${meses[f.getMonth()]}</b> de <b>${f.getFullYear()}</b>`;
}

function $(id) { return document.getElementById(id); }

/* =========================
   SELECTS — poblar dinámicamente
   ========================= */

function buildSistemaOptions(selectEl, valorSeleccionado) {
  selectEl.innerHTML = '';
  sistemasEnMemoria.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nombre;
    opt.textContent = s.nombre;
    if (s.nombre === valorSeleccionado) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function actualizarTodosLosSelects() {
  for (let id = 1; id <= pageCount; id++) {
    const sel = $('in-sistema-' + id);
    if (!sel) continue;
    const valorActual = sel.value;
    buildSistemaOptions(sel, valorActual);
  }
}

/* =========================
   FORMULARIO
   ========================= */

function renderTemplate(templateId, id) {
  let html = $(templateId).innerHTML;
  return html.replace(/{{id}}/g, id);
}

function addPage(prefill = null) {
  pageCount++;
  const id = pageCount;

  $('forms').insertAdjacentHTML('beforeend', renderTemplate('template-form-card', id));
  $('sheets').insertAdjacentHTML('beforeend', renderTemplate('template-sheet', id));
  $('sheets').insertAdjacentHTML('beforeend', renderTemplate('template-sheet-wansoft', id));

  const selectEl = $('in-sistema-' + id);
  const sistemaInicial = prefill?.sistema ?? sistemasEnMemoria[0]?.nombre ?? 'E-TRANSPORTE';
  buildSistemaOptions(selectEl, sistemaInicial);

  $('in-solicitante-' + id).value = prefill?.solicitante ?? '';
  $('in-ticket-'     + id).value = prefill?.ticket      ?? '';
  $('in-nombre-'     + id).value = prefill?.nombre      ?? '';
  $('in-usuario-'    + id).value = prefill?.usuario     ?? '';
  $('in-plazas-'     + id).value = prefill?.plazas      ?? '';
  $('in-usuario-comision-'    + id).value = prefill?.usuarioComision  ?? '';
  $('in-usuario-citas-'       + id).value = prefill?.usuarioCitas     ?? '';
  $('in-usuario-comision-gn-' + id).value = prefill?.usuarioComisionGN ?? '';
  $('in-pass-comision-'       + id).value = prefill?.passComision     ?? '';
  $('in-pass-citas-'          + id).value = prefill?.passCitas        ?? '';
  $('in-pass-comision-gn-'    + id).value = prefill?.passGN           ?? '';
  $('in-contrasena-'          + id).value = prefill?.contrasena       ?? '';

  syncPage(id);
}

function syncPage(id) {
  const sistema = $('in-sistema-' + id)?.value || sistemasEnMemoria[0]?.nombre || 'E-TRANSPORTE';
  const mismaPass = $('check-misma-pass-' + id)?.checked;

  const nombre           = $('in-nombre-' + id)?.value ?? '';
  const usuarioNormal    = $('in-usuario-' + id)?.value ?? '';
  const plazas           = $('in-plazas-' + id)?.value ?? '';
  const usuarioComision  = $('in-usuario-comision-' + id)?.value ?? '';
  const usuarioCitas     = $('in-usuario-citas-' + id)?.value ?? '';
  const usuarioComisionGN = $('in-usuario-comision-gn-' + id)?.value ?? '';

  const passGeneral = $('in-contrasena-' + id)?.value ?? '';
  const passComision = mismaPass ? passGeneral : ($('in-pass-comision-' + id)?.value ?? '');
  const passCitas    = mismaPass ? passGeneral : ($('in-pass-citas-'    + id)?.value ?? '');
  const passGN       = mismaPass ? passGeneral : ($('in-pass-comision-gn-' + id)?.value ?? '');

  $('out-solicitante-' + id).textContent = $('in-solicitante-' + id)?.value ?? '';
  $('out-ticket-'      + id).textContent = $('in-ticket-' + id)?.value ?? '';
  $('out-sistema-'     + id).textContent = sistema;
  $('out-fecha-'       + id).innerHTML   = fechaActual();
  document.querySelectorAll(`#sheet-${id} .out-nombre`).forEach(el => el.textContent = nombre);

  // ── WANSOFT ──────────────────────────────────────────────
  if (esWansoft(sistema)) {
    // Mostrar/ocultar campos del formulario
    $('wansoft-fields-'      + id).style.display = 'block';
    $('usuario-normal-'      + id).style.display = 'block';
    $('usuarios-corporativos-' + id).style.display = 'none';
    $('wrapper-pass-general-'  + id).style.display = 'block';
    $('label-pass-type-'       + id).textContent   = '';

    // Mostrar hoja wansoft, ocultar hoja normal
    const sheetNormal  = $('sheet-'         + id);
    const sheetWansoft = $('sheet-wansoft-' + id);
    if (sheetNormal)  sheetNormal.style.display  = 'none';
    if (sheetWansoft) {
      sheetWansoft.style.display = 'block';
      sheetWansoft.classList.add('ws-activa');
    }

    // Fecha completa igual al PDF original
    const mesesWS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const f = new Date();
    const diaWS   = String(f.getDate()).padStart(2, '0');
    const fechaWS = `Ciudad de México a ${diaWS} de ${mesesWS[f.getMonth()]} del ${f.getFullYear()}`;

    // Poblar overlays
    const set = (key, val) => {
      const el = document.getElementById('ws-out-' + key + '-' + id);
      if (el) el.textContent = val;
    };

    set('fecha',       fechaWS);
    set('solicitante', $('in-solicitante-' + id)?.value ?? '');
    set('ticket',      $('in-ticket-'     + id)?.value ?? '');
    set('nombre',    nombre);
    set('plazas',    plazas);
    set('usuario',   usuarioNormal);
    set('contrasena', passGeneral);

    _actualizarBtnPlazas();
    return;
  }

  // ── FIN WANSOFT ───────────────────────────────────────────
  // Ocultar campos wansoft si el sistema cambió
  $('wansoft-fields-' + id).style.display = 'none';
  const sheetWansoft = $('sheet-wansoft-' + id);
  if (sheetWansoft) {
    sheetWansoft.style.display = 'none';
    sheetWansoft.classList.remove('ws-activa');   // ← evita que se imprima
  }
  const sheetNormal = $('sheet-' + id);
  if (sheetNormal) sheetNormal.style.display = 'block';

  if (esCorporativo(sistema)) {
    $('usuarios-corporativos-' + id).style.display = 'block';
    $('usuario-normal-'        + id).style.display = 'none';
    $('normal-table-'          + id).style.display = 'none';
    $('cuentas-table-'         + id).style.display = 'table';

    if (mismaPass) {
      $('wrapper-pass-com-'     + id).style.display = 'none';
      $('wrapper-pass-citas-'   + id).style.display = 'none';
      $('wrapper-pass-gn-'      + id).style.display = 'none';
      $('wrapper-pass-general-' + id).style.display = 'block';
      $('label-pass-type-'      + id).textContent   = '(Misma para las 3)';
    } else {
      $('wrapper-pass-com-'     + id).style.display = 'block';
      $('wrapper-pass-citas-'   + id).style.display = 'block';
      $('wrapper-pass-gn-'      + id).style.display = 'block';
      $('wrapper-pass-general-' + id).style.display = 'none';
    }

    document.querySelector(`#sheet-${id} .out-usuario-comision`).textContent     = usuarioComision;
    document.querySelector(`#sheet-${id} .out-usuario-citas`).textContent         = usuarioCitas;
    document.querySelector(`#sheet-${id} .out-usuario-comision-gn`).textContent   = usuarioComisionGN;

    const rows = document.querySelectorAll(`#cuentas-table-${id} tbody tr`);
    rows[0].querySelector('td:nth-child(4)').textContent = passComision;
    rows[1].querySelector('td:nth-child(4)').textContent = passCitas;
    rows[2].querySelector('td:nth-child(4)').textContent = passGN;

  } else {
    $('usuarios-corporativos-' + id).style.display = 'none';
    $('usuario-normal-'        + id).style.display = 'block';
    $('normal-table-'          + id).style.display = 'table';
    $('cuentas-table-'         + id).style.display = 'none';
    $('wrapper-pass-general-'  + id).style.display = 'block';
    $('label-pass-type-'       + id).textContent   = '';

    document.querySelectorAll(`#sheet-${id} .out-usuario`).forEach(el => el.textContent = usuarioNormal);
    document.querySelectorAll(`#sheet-${id} .out-contrasena`).forEach(el => el.textContent = passGeneral);
  }
  _actualizarBtnPlazas();
}

function _actualizarBtnPlazas() {
  const btn = document.getElementById("btnPlazasWansoft");
  if (!btn) return;
  // Mostrar si al menos un formato tiene WANSOFT seleccionado
  const hayWansoft = [...document.querySelectorAll("[id^='in-sistema-']")]
    .some(sel => esWansoft(sel.value));
  btn.style.display = hayWansoft ? "" : "none";
}

function removePage(id) {
  $('card-' + id)?.remove();
  $('sheet-' + id)?.remove();
  $('sheet-wansoft-' + id)?.remove();
}

function duplicatePage(id) {
  addPage({
    solicitante:       $('in-solicitante-' + id)?.value,
    ticket:            $('in-ticket-' + id)?.value,
    sistema:           $('in-sistema-' + id)?.value,
    nombre:            $('in-nombre-' + id)?.value,
    usuario:           $('in-usuario-' + id)?.value,
    plazas:            $('in-plazas-' + id)?.value,
    usuarioComision:   $('in-usuario-comision-' + id)?.value,
    usuarioCitas:      $('in-usuario-citas-' + id)?.value,
    usuarioComisionGN: $('in-usuario-comision-gn-' + id)?.value,
    passComision:      $('in-pass-comision-' + id)?.value,
    passCitas:         $('in-pass-citas-' + id)?.value,
    passGN:            $('in-pass-comision-gn-' + id)?.value,
    contrasena:        $('in-contrasena-' + id)?.value
  });
}

function clearAll() {
  const primerSistema = sistemasEnMemoria[0]?.nombre ?? 'E-TRANSPORTE';
  document.querySelectorAll('.forms input').forEach(i => i.value = '');
  document.querySelectorAll('.forms textarea').forEach(t => t.value = '');
  document.querySelectorAll('.forms select').forEach(s => s.value = primerSistema);
  for (let id = 1; id <= pageCount; id++) {
    if ($('sheet-' + id)) syncPage(id);
  }
}

function printDoc() {
  for (let id = 1; id <= pageCount; id++) {
    if ($('sheet-' + id)) syncPage(id);
  }
  let firstValidId = null;
  for (let id = 1; id <= pageCount; id++) {
    if ($('sheet-' + id)) { firstValidId = id; break; }
  }
  if (!firstValidId) { alert('No hay hojas para imprimir'); return; }

  const sistema = $('in-sistema-' + firstValidId)?.value || 'SISTEMA';
  const usuario = $('in-nombre-'  + firstValidId)?.value || 'NOMBRE';
  const ticket  = $('in-ticket-'  + firstValidId)?.value || 'TICKET';
  const safe = str => str.replace(/[\\/:*?"<>|]/g, '').trim();
  document.title = `${safe(sistema)} ${safe(usuario)} Ticket#${safe(ticket)}`;
  window.print();
}

/* Página inicial */
addPage();

/* =========================
   TEMA
   ========================= */

function toggleTheme() {
  const body = document.body;
  const btn  = document.getElementById('themeBtn');
  body.classList.toggle('dark-mode');
  if (body.classList.contains('dark-mode')) {
    btn.setAttribute('aria-label', 'Activar modo claro');
    localStorage.setItem('politicas-theme', 'dark');
  } else {
    btn.setAttribute('aria-label', 'Activar modo oscuro');
    localStorage.setItem('politicas-theme', 'light');
  }
}

window.addEventListener('load', () => {
  if (localStorage.getItem('politicas-theme') === 'dark') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.setAttribute('aria-label', 'Activar modo claro');
  }
});

/* =========================
   TOGGLE FILAS CORPORATIVAS
   ========================= */

function toggleCorpRow(id, type, show) {
  const rowInput = $(`row-input-${type}-${id}`);
  const btnAdd   = $(`btn-add-${type}-${id}`);
  const sheetRow = $(`sheet-row-${type}-${id}`);

  if (show) {
    rowInput.style.display = 'block';
    btnAdd.style.display   = 'none';
    if (sheetRow) sheetRow.style.display = 'table-row';
  } else {
    rowInput.style.display = 'none';
    btnAdd.style.display   = 'block';
    if (sheetRow) sheetRow.style.display = 'none';
    $(`in-usuario-${type === 'gn' ? 'comision-gn' : (type === 'comision' ? 'comision' : 'citas')}-${id}`).value = '';
  }
  syncPage(id);
}

/* =========================
   TRANSFERENCIA DESDE OTROS MÓDULOS
   ========================= */

window.addEventListener('load', () => {
  // ── Transferencia desde E-TRANSPORTE ──
  const claveRecibida = localStorage.getItem('transfer_clave');
  if (claveRecibida) {
    const id = 1;
    const inputUsuario    = document.getElementById(`in-usuario-${id}`);
    const inputContrasena = document.getElementById(`in-contrasena-${id}`);
    if (inputUsuario && inputContrasena) {
      inputUsuario.value    = claveRecibida;
      inputContrasena.value = claveRecibida;
      syncPage(id);
    } else {
      addPage({
        sistema:    sistemasEnMemoria[0]?.nombre ?? 'E-TRANSPORTE',
        usuario:    claveRecibida,
        contrasena: claveRecibida
      });
    }
    localStorage.removeItem('transfer_clave');
  }

  // ── Transferencia desde SEDENA (3 cuentas corporativas) ──
  const dataSedena = localStorage.getItem('transfer_sedena');
  if (dataSedena) {
    try {
      const data = JSON.parse(dataSedena);
      const id = 1;
      // Seleccionar sistema CUENTAS CORPORATIVAS
      const selectEl = document.getElementById(`in-sistema-${id}`);
      if (selectEl) selectEl.value = data.sistema;
      // Nombre del usuario
      if (data.nombre) document.getElementById(`in-nombre-${id}`).value = data.nombre;
      // Las 3 cuentas con sus usuarios y contraseñas individuales
      document.getElementById(`in-usuario-comision-${id}`).value    = data.usuarioComision   ?? '';
      document.getElementById(`in-pass-comision-${id}`).value       = data.passComision      ?? '';
      document.getElementById(`in-usuario-citas-${id}`).value       = data.usuarioCitas      ?? '';
      document.getElementById(`in-pass-citas-${id}`).value          = data.passCitas         ?? '';
      document.getElementById(`in-usuario-comision-gn-${id}`).value = data.usuarioComisionGN ?? '';
      document.getElementById(`in-pass-comision-gn-${id}`).value    = data.passGN            ?? '';
      // Desactivar "usar la misma contraseña para las 3"
      const checkMisma = document.getElementById(`check-misma-pass-${id}`);
      if (checkMisma) checkMisma.checked = false;
      syncPage(id);
    } catch(e) { console.error('Error leyendo transfer_sedena:', e); }
    localStorage.removeItem('transfer_sedena');
  }
});
