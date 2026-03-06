// ==========================================
// 1. CONEXIÓN A GITHUB Y BASE DE DATOS
// ==========================================
import { officeData, cargarAgencias, guardarAgenciaAlStore } from "./dataStoreSedena.js";

const OUTPUT_IDS = [
  'outUser', 'outPass', 'outConfirm', 'outDesc', 
  'outOffice', 'outNomen', 'outCitasUser', 'outGNUser'
];

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

// --- INICIO DE CARGA ---
window.onload = async () => {
    showSpinner(true);
    setStatus("Conectando con base de datos en GitHub...");
    
    try {
        const ok = await cargarAgencias();
        if(ok) {
            filteredOfficeData = officeData;
            populateOfficeSelect(officeData);
            setStatus(`¡Carga exitosa! ${officeData.length} agencias cargadas.`, "success");
            
            if(officeSelect) officeSelect.disabled = false;
            if(officeSearch) officeSearch.disabled = false;
            if(generateBtn) generateBtn.disabled = false;
        } else {
            setStatus("Error al cargar la base de datos de GitHub.", "error");
        }
    } catch (error) {
        setStatus("Error durante la carga: " + error.message, "error");
    } finally {
        showSpinner(false);
    }
};

/* ---------- FUNCIONES DE UTILIDAD ---------- */
function showSpinner(show) {
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

function setStatus(message, type = '') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.className = 'status';
            }, 3000);
        }
    }
}

/* ---------- SELECT POPULATE ---------- */
function populateOfficeSelect(data) {
    if (!officeSelect) return;
    
    officeSelect.innerHTML = '<option value="">-- Selecciona una agencia --</option>';

    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.numero || item.officeNumber;
        opt.textContent = `${item.numero || item.officeNumber} - ${item.nombre || item.officeName} (${item.estatus || item.status})`;
        opt.dataset.nomen = item.nomenclatura || item.nomen;
        opt.dataset.status = item.estatus || item.status;
        opt.dataset.name = (item.nombre || item.officeName || '').toUpperCase();
        officeSelect.appendChild(opt);
    });
}

/* ---------- FILTRAR OFICINAS ---------- */
window.filterOffices = function(searchTerm = '') {
    if (!officeSelect) return;
    
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        filteredOfficeData = [...officeData];
    } else {
        filteredOfficeData = officeData.filter(office => {
            const nombre = (office.nombre || office.officeName || '').toLowerCase();
            const numero = (office.numero || office.officeNumber || '').toString().toLowerCase();
            const nomenclatura = (office.nomenclatura || office.nomen || '').toLowerCase();
            
            return nombre.includes(term) || 
                   numero.includes(term) || 
                   nomenclatura.includes(term);
        });
    }
    
    populateOfficeSelect(filteredOfficeData);
};

// ==========================================
// 2. PANEL DE ADMINISTRACIÓN
// ==========================================
window.toggleFormularioAdmin = function() {
    const modal = document.getElementById("modalAdmin");
    const select = document.getElementById("selectorSedena");
    if(!modal) return;

    if(modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "flex";
        select.innerHTML = '<option value="">-- NUEVA OFICINA --</option>';
[...officeData].sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.numero;
    opt.textContent = `${o.nombre} (${o.numero})`;
    opt.style.color = "#000"; // <--- AGREGA ESTA LÍNEA para que las letras se vean negras
    select.appendChild(opt);
});
    } else { 
        modal.style.display = "none"; 
    }
};

window.cargarEnAdmin = function(num) {
    const o = officeData.find(x => x.numero === num);
    if(o) {
        document.getElementById("admNumero").value = o.numero;
        document.getElementById("admNomen").value = o.nomenclatura;
        document.getElementById("admNombre").value = o.nombre;
        document.getElementById("admEstatus").value = o.estatus;
    } else {
        document.getElementById("admNumero").value = "";
        document.getElementById("admNomen").value = "";
        document.getElementById("admNombre").value = "";
        document.getElementById("admEstatus").value = "ACTIVO";
    }
};

window.guardarCambiosSedena = async function() {
    const datos = {
        numero: document.getElementById("admNumero").value.trim(),
        nomenclatura: document.getElementById("admNomen").value.trim().toUpperCase(),
        nombre: document.getElementById("admNombre").value.trim().toUpperCase(),
        estatus: document.getElementById("admEstatus").value
    };

    if(!datos.numero || !datos.nomenclatura || !datos.nombre) {
        alert("⚠️ Por favor llena todos los campos"); 
        return;
    }

    const btn = document.getElementById("btnGuardarSedena");
    btn.disabled = true; 
    btn.innerText = "⏳ Guardando...";

    try {
        const res = await guardarAgenciaAlStore(datos);
        if(res !== "error") {
            alert(`✅ Oficina ${res} con éxito.`);
            location.reload();
        } else {
            alert("❌ Error al guardar.");
            btn.disabled = false; 
            btn.innerText = "💾 Guardar en GitHub";
        }
    } catch (error) {
        alert("❌ Error al guardar: " + error.message);
        btn.disabled = false; 
        btn.innerText = "💾 Guardar en GitHub";
    }
};

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
        setStatus("ERROR: CURP inválida.", "error");
        return false;
    }
    if (!name || name.length < 5) {
        setStatus("ERROR: Ingresa el nombre completo.", "error");
        return false;
    }
    if (!officeValue) {
        setStatus("ERROR: Debes seleccionar una oficina.", "error");
        return false;
    }
    if (!selectedOption || !selectedOption.dataset || !selectedOption.dataset.nomen) {
        setStatus("ERROR: La oficina no tiene nomenclatura.", "error");
        return false;
    }
    return true;
}

function formatInteractivo(texto) {
    if (!texto || texto.length < 7) return texto;
    const base = texto.slice(0, -7);
    const ultimosSeis = texto.slice(-7);
    return `${base}<span class="copiable-seis" title="Click para copiar últimos 7">${ultimosSeis}</span>`;
}

function formatTodoInteractivo(texto) {
    if (!texto) return "";
    return `<span class="copiable-seis" title="Click para copiar todo">${texto}</span>`;
}

function generateKeys() {
    const curp = curpInput.value.trim().toUpperCase();
    const name = nameInput.value.trim().toUpperCase();
    const selectedOffice = officeSelect.value;
    const option = officeSelect.options[officeSelect.selectedIndex];

    if (!validateInputs(curp, name, selectedOffice, option)) {
        if (outputArea) outputArea.hidden = true;
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

    if (outputArea) outputArea.hidden = false;
    setStatus("¡Claves generadas!", "success");
}

/* ---------- TOAST NOTIFICATIONS ---------- */
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

/* ---------- EVENTO DE CLICK PARA COPIAR ---------- */
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
        }).catch(err => {
            console.error('Error al copiar: ', err);
            mostrarToast('❌ Error al copiar al portapapeles');
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

    // 3. Crear el archivo
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');

    // Nombre del archivo
    const curpPrefix = (document.getElementById('curpInput').value.trim().substring(0, 4).toUpperCase()) || 'XXXX';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomenValue = document.getElementById('outNomen')?.innerText.trim() || 'NNN';
    
    link.download = `CLAVES_${curpPrefix}_${nomenValue}_${date}.csv`;
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

    OUTPUT_IDS.forEach(id => {
        const element = $(id);
        if (element) element.textContent = "";
    });
    
    const outPassDuplicate1 = $('outPassDuplicate1');
    const outPassDuplicate2 = $('outPassDuplicate2');
    const outPassDuplicate3 = $('outPassDuplicate3');
    
    if (outPassDuplicate1) outPassDuplicate1.textContent = "";
    if (outPassDuplicate2) outPassDuplicate2.textContent = "";
    if (outPassDuplicate3) outPassDuplicate3.textContent = "";

    if (outputArea) outputArea.hidden = true;

    // repoblar select completo
    filterOffices('');

    setStatus("Formulario limpiado.", "success");
}

/* ---------- CONFIGURACIÓN DE EVENTOS FINAL ---------- */
if (officeSearch) {
    officeSearch.addEventListener('input', e => window.filterOffices(e.target.value));
}

if (generateBtn) {
    generateBtn.addEventListener('click', generateKeys);
}

if (copyAllBtn) {
    copyAllBtn.addEventListener('click', copyAll);
}

if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCsv);
}

if (clearBtn) {
    clearBtn.addEventListener('click', limpiar);
}

window.generateKeys = generateKeys;
window.copyAll = copyAll;
window.downloadCsv = downloadCsv;
window.limpiar = limpiar;
window.filterOffices = filterOffices;

// Manejo de archivos locales (deshabilitado)
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) {
            alert("Función de archivo local desactivada. Usa la administración de GitHub.");
        }
    });
}

// Manejo de tecla Enter en los inputs
if (curpInput && nameInput) {
    curpInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generateKeys();
    });
    
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generateKeys();
    });
}
