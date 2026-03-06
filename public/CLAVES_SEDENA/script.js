/* ---------- CONFIG ---------- */
const CSV_FILE = 'AGENCIAS.csv';

const OUTPUT_HEADERS = [
  'Usuario',
  'Contraseña',
  'Confirmación',
  'Descripción',
  'Oficina',
  'Nomenclatura',
  'Usuario Citas',
  'Usuario GN'
];

const OUTPUT_IDS = [
  'outUser',
  'outPass',
  'outConfirm',
  'outDesc',
  'outOffice',
  'outNomen',
  'outCitasUser',
  'outGNUser'
];

let officeData = [];
let filteredOfficeData = [];

/* ---------- UTIL ---------- */
const $ = id => document.getElementById(id);

const statusDiv = $('loadStatus');
const spinner = $('spinner');

const officeSelect = $('officeSelect');
const officeSearch = $('officeSearch');

const generateBtn = $('generate');
const copyAllBtn = $('copyAll');
const downloadBtn = $('downloadCsv');
const clearBtn = $('clearBtn');
const outputArea = $('outputArea');

const curpInput = $('curpInput');
const nameInput = $('nameInput');

const fileInput = $('fileInput');
const dropZone = $('dropZone');

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;

/* ------------------------------------------------------------
   PARSER PARA CSV CON COMAS INTERNAS
-------------------------------------------------------------*/
function smartSplitCSVLine(line, separator) {
  let result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === separator && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length <= 1) return [];

  let separator = lines[0].includes(';') ? ';' : ',';

  const headers = smartSplitCSVLine(lines[0], separator).map(h =>
    h.replace(/^"|"$/g, '').toUpperCase()
  );

  const idx = {
    number: headers.indexOf('NUMERO DE OFICINA'),
    nomen: headers.indexOf('NOMENCLATURA'),
    name: headers.indexOf('NOMBRE DE AGENCIA'),
    status: headers.indexOf('ESTATUS')
  };

  if (Object.values(idx).some(v => v === -1)) {
    throw new Error("Encabezados CSV incorrectos. Revisa: NUMERO DE OFICINA, NOMENCLATURA, NOMBRE DE AGENCIA, ESTATUS.");
  }

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = smartSplitCSVLine(lines[i], separator);

    if (row.length > 4) {
      const fixed = [
        row[idx.number],
        row[idx.nomen],
        row.slice(2, row.length - 1).join(" "),
        row[row.length - 1]
      ];
      row.length = 0;
      row.push(...fixed);
    }

    const estatus = (row[idx.status] || '').toUpperCase();

    // Acepta ACTIVA o INACTIVA (tú decides si solo quieres activas)
    if (estatus === "ACTIVA" || estatus === "INACTIVA") {
      data.push({
        officeNumber: (row[idx.number] || '').trim(),
        nomen: (row[idx.nomen] || '').trim(),
        officeName: (row[idx.name] || '').trim(),
        status: estatus
      });
    }
  }

  data.sort((a, b) => Number(a.officeNumber) - Number(b.officeNumber));
  return data;
}

/* ---------- UI HELPERS ---------- */
function setStatus(message, type = "normal") {
  statusDiv.textContent = message;
  statusDiv.className = 'status-message' + (type === 'success' ? ' success' : '');
}

function showSpinner(show) {
  if (show) spinner.classList.add('show');
  else spinner.classList.remove('show');
}

/* ---------- LOAD CSV ---------- */
async function tryFetchCsv() {
  setStatus("Intentando cargar AGENCIAS.csv...");
  showSpinner(true);

  try {
    const resp = await fetch(CSV_FILE, { cache: "no-store" });
    if (!resp.ok) throw new Error(resp.statusText);

    const text = await resp.text();
    const parsed = parseCsv(text);

    officeData = parsed;
    filteredOfficeData = officeData;

    officeSelect.disabled = false;
    officeSearch.disabled = false;
    generateBtn.disabled = false;

    filterOffices(''); // llena el select
    setStatus(`¡Carga exitosa! ${parsed.length} agencias cargadas.`, "success");
  } catch {
    setStatus("No se pudo cargar AGENCIAS.csv. Súbelo manualmente.");
  } finally {
    showSpinner(false);
  }
}

/* ---------- SELECT POPULATE ---------- */
function populateOfficeSelect(data) {
  officeSelect.innerHTML = '<option value="">-- Selecciona una agencia --</option>';

  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.officeNumber;
    opt.textContent = `${item.officeNumber} - ${item.officeName} (${item.status})`;
    opt.dataset.nomen = item.nomen;
    opt.dataset.status = item.status;
    opt.dataset.name = (item.officeName || '').toUpperCase();
    officeSelect.appendChild(opt);
  });
}

/* ---------- BUSCADOR ---------- */
function filterOffices(query) {
  const q = (query || '').trim().toUpperCase();

  if (!q) {
    filteredOfficeData = officeData;
    populateOfficeSelect(filteredOfficeData);
    return;
  }

  filteredOfficeData = officeData.filter(item => {
    const number = String(item.officeNumber || '').toUpperCase();
    const name   = String(item.officeName || '').toUpperCase();
    const nomen  = String(item.nomen || '').toUpperCase();
    const status = String(item.status || '').toUpperCase();

    return (
      number.includes(q) ||
      name.includes(q) ||
      nomen.includes(q) ||
      status.includes(q)
    );
  });

  populateOfficeSelect(filteredOfficeData);

  if (filteredOfficeData.length === 1) {
    officeSelect.value = filteredOfficeData[0].officeNumber;
  } else {
    officeSelect.value = "";
  }
}

/* ---------- GENERATION LOGIC ---------- */
function generateCorporateUser(curp, nomen, office) {
  return nomen + office + curp.substring(0, 3);
}

function generateCitasUser(curp, nomen) {
  return nomen + curp.substring(0, 4) + "ISF";
}

function generateGNUser(curp, nomen, office) {
  const letraCurp = curp.substring(0, 1);
  return nomen + office + letraCurp + "GN";
}

function validateInputs(curp, name, officeValue, selectedOption) {
  if (!curp || curp.length !== 18 || !CURP_REGEX.test(curp)) {
    setStatus("ERROR: CURP inválida.");
    return false;
  }
  if (!name || name.length < 5) {
    setStatus("ERROR: Ingresa el nombre completo.");
    return false;
  }
  if (!officeValue) {
    setStatus("ERROR: Debes seleccionar una oficina.");
    return false;
  }
  if (!selectedOption || !selectedOption.dataset || !selectedOption.dataset.nomen) {
    setStatus("ERROR: La oficina no tiene nomenclatura.");
    return false;
  }
  return true;
}


function formatInteractivo(texto) {
  if (texto.length < 7) return texto;
  const base = texto.slice(0, -7);
  const ultimosSeis = texto.slice(-7);
  return `${base}<span class="copiable-seis" title="Click para copiar últimos 7">${ultimosSeis}</span>`;
}
function formatTodoInteractivo(texto) {
  return `<span class="copiable-seis" title="Click para copiar todo">${texto}</span>`;
}

function generateKeys() {
  const curp = curpInput.value.trim().toUpperCase();
  const name = nameInput.value.trim().toUpperCase();
  const selectedOffice = officeSelect.value;
  const option = officeSelect.options[officeSelect.selectedIndex];

  if (!validateInputs(curp, name, selectedOffice, option)) {
    outputArea.hidden = true;
    return;
  }

  const nomen = (option.dataset.nomen || '').toUpperCase();
  const office = selectedOffice;

  const userCorp  = generateCorporateUser(curp, nomen, office);
  const userCitas = generateCitasUser(curp, nomen);
  const userGN    = generateGNUser(curp, nomen, office);

  // ✅ Usuarios
  $('outUser').innerHTML = formatInteractivo(userCorp);
  $('outCitasUser').innerHTML = formatInteractivo(userCitas);
  $('outGNUser').innerHTML = formatInteractivo(userGN);

  // ✅ Contraseñas (cada una corresponde a su usuario)
  $('outPassDuplicate1').innerHTML = formatTodoInteractivo(userCorp);
  $('outPassDuplicate2').innerHTML = formatTodoInteractivo(userCitas);
  $('outPassDuplicate3').innerHTML = formatTodoInteractivo(userGN);

  // ✅ Info de abajo
  $('outOffice').innerHTML = formatTodoInteractivo(office);
  $('outNomen').innerHTML = formatTodoInteractivo(nomen);
  $('outDesc').innerHTML = formatTodoInteractivo(name);
  $('outPass').textContent = userCorp;
  $('outConfirm').textContent = userCorp;

  outputArea.hidden = false;
  setStatus("¡Claves generadas!", "success");
}

function mostrarToast(mensaje) {
  let toast = $('toast-notificacion');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notificacion';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.className = 'toast show';
  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 2000);
}
document.addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('copiable-seis')) {
    const textoACopiar = e.target.innerText;
    const parentId = e.target.parentElement.id; 
    
    navigator.clipboard.writeText(textoACopiar).then(() => {
      e.target.classList.add('copiado');
      
      let mensaje = "";
      if (parentId === 'outDesc') {
        mensaje = `👤 Nombre copiado: ${textoACopiar}`;
      } 
      else if (parentId === 'outOffice') {
        mensaje = `🏢 Oficina copiada: ${textoACopiar}`;
      } 
      else if (textoACopiar.length === 7) {
        mensaje = `✅ Copiados los 7 dígitos: ${textoACopiar}`;
      } 
      else {
        mensaje = `📋 Copiado: ${textoACopiar}`;
      }
      mostrarToast(mensaje);
      setTimeout(() => {
        e.target.classList.remove('copiado');
      }, 600);
    });
  }
});

/* ---------- COPIAR COMPLETO ---------- */
function copyAll() {
  // Definimos los bloques para que sea fácil de leer
  const usuarioCorp = document.getElementById("outUser")?.innerText.trim() || "";
  const usuarioCitas = document.getElementById("outCitasUser")?.innerText.trim() || "";
  const usuarioGN = document.getElementById("outGNUser")?.innerText.trim() || "";
  const oficina = document.getElementById("outOffice")?.innerText.trim() || "";
  const nomen = document.getElementById("outNomen")?.innerText.trim() || "";
  const desc = document.getElementById("outDesc")?.innerText.trim() || "";

  if (!usuarioCorp) {
    setStatus('No hay datos para copiar.', 'error');
    return;
  }

  // Construimos el texto con separadores claros
  let textoFinal = "====================================\n";
  textoFinal += "   DATOS DE ACCESO GENERADOS\n";
  textoFinal += "====================================\n\n";

  textoFinal += "─── ACCESO CORPORATIVO ───\n";
  textoFinal += `Usuario (Corporativo):\n${usuarioCorp}\n\n`;
  textoFinal += `Contraseña (Corporativa):\n${usuarioCorp}\n\n`;

  textoFinal += "─── ACCESO CITAS MÉDICAS ───\n";
  textoFinal += `Usuario (Citas Médicas):\n${usuarioCitas}\n\n`;
  textoFinal += `Contraseña (Citas Médicas):\n${usuarioCitas}\n\n`;

  textoFinal += "─── ACCESO GN ───\n";
  textoFinal += `Usuario GN:\n${usuarioGN}\n\n`;
  textoFinal += `Contraseña (GN):\n${usuarioGN}\n\n`;

  textoFinal += "─── INFORMACIÓN GENERAL ───\n";
  textoFinal += `Oficina (Número): ${oficina}\n`;
  textoFinal += `Nomenclatura (3 letras): ${nomen}\n`;
  textoFinal += `Descripción: ${desc}\n\n`;
  
  textoFinal += "====================================";

  // Copiar al portapapeles
  navigator.clipboard.writeText(textoFinal)
    .then(() => {
      setStatus('¡Copiado con formato legible!', 'success');
    })
    .catch(err => {
      setStatus('Error al copiar: ' + err, 'error');
    });
}

/* ---------- DESCARGAR CSV CON SECCIONES CLARAS ---------- */
function downloadCsv() {
  // 1. Obtenemos los valores de la página
  const usuarioCorp = document.getElementById("outUser")?.innerText.trim() || "";
  const usuarioCitas = document.getElementById("outCitasUser")?.innerText.trim() || "";
  const usuarioGN = document.getElementById("outGNUser")?.innerText.trim() || "";
  const oficina = document.getElementById("outOffice")?.innerText.trim() || "";
  const nomen = document.getElementById("outNomen")?.innerText.trim() || "";
  const desc = document.getElementById("outDesc")?.innerText.trim() || "";

  if (!usuarioCorp) {
    setStatus('No hay datos para descargar.', 'error');
    return;
  }

  // 2. Construimos el contenido del CSV con SEPARADORES
  // Usamos "sep=;" para que Excel identifique el separador automáticamente
  let csvText = "sep=;\r\n";
  csvText += "SECCIÓN;DATOS DE ACCESO\r\n";
  csvText += "-----------------------;-----------------------\r\n";

  // Bloque Corporativo
  csvText += "ACCESO CORPORATIVO; \r\n";
  csvText += `Usuario (Corporativo);${usuarioCorp}\r\n`;
  csvText += `Contraseña (Corporativa);${usuarioCorp}\r\n`;
  csvText += "; \r\n"; // Fila vacía para separar

  // Bloque Citas
  csvText += "ACCESO CITAS MÉDICAS; \r\n";
  csvText += `Usuario (Citas Médicas);${usuarioCitas}\r\n`;
  csvText += `Contraseña (Citas Médicas);${usuarioCitas}\r\n`;
  csvText += "; \r\n"; // Fila vacía para separar

  // Bloque GN
  csvText += "ACCESO GN; \r\n";
  csvText += `Usuario GN;${usuarioGN}\r\n`;
  csvText += `Contraseña (GN);${usuarioGN}\r\n`;
  csvText += "; \r\n"; // Fila vacía para separar

  // Bloque General
  csvText += "INFORMACIÓN GENERAL; \r\n";
  csvText += `Oficina (Número);${oficina}\r\n`;
  csvText += `Nomenclatura (3 letras);${nomen}\r\n`;
  csvText += `Descripción;${desc}\r\n`;

  // 3. Crear el archivo con formato compatible (UTF-16 LE)
  const buffer = new ArrayBuffer((csvText.length + 1) * 2);
  const view = new Uint16Array(buffer);
  view[0] = 0xFEFF; // BOM
  for (let i = 0; i < csvText.length; i++) view[i + 1] = csvText.charCodeAt(i);

  const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');

  // Nombre del archivo
  const curpPrefix = (document.getElementById('curpInput').value.trim().substring(0, 4).toUpperCase()) || 'XXXX';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  link.download = `CLAVES_${curpPrefix}_${nomen}_${date}.csv`;
  link.href = URL.createObjectURL(blob);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setStatus(`Archivo descargado con formato dividido.`, 'success');
}

/* ---------- LIMPIAR ---------- */
function limpiar() {
  curpInput.value = "";
  nameInput.value = "";
  officeSelect.value = "";
  officeSearch.value = "";

  OUTPUT_IDS.forEach(id => $(id).textContent = "");
  $('outPassDuplicate1').textContent = "";
  $('outPassDuplicate2').textContent = "";
  $('outPassDuplicate3').textContent = "";

  outputArea.hidden = true;

  // repoblar select completo
  filterOffices('');

  setStatus("Formulario limpiado.", "success");
}

/* ---------- SUBIR CSV ---------- */
function handleFileContent(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = parseCsv(e.target.result);
      officeData = parsed;
      filteredOfficeData = officeData;

      officeSelect.disabled = false;
      officeSearch.disabled = false;
      generateBtn.disabled = false;

      filterOffices(officeSearch.value);
      setStatus(`CSV cargado manualmente: ${parsed.length} agencias.`, 'success');
    } catch (err) {
      setStatus('Error procesando CSV: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  tryFetchCsv();

  curpInput.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());
  nameInput.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());

  officeSearch.addEventListener('input', e => filterOffices(e.target.value));

  generateBtn.addEventListener('click', generateKeys);
  copyAllBtn.addEventListener('click', copyAll);
  downloadBtn.addEventListener('click', downloadCsv);
  clearBtn.addEventListener('click', limpiar);

  // Click en dropzone abre file picker
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFileContent(e.target.files[0]);
    fileInput.value = "";
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFileContent(e.dataTransfer.files[0]);
  });
});
