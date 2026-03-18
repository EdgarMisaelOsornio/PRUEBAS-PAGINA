// ==========================================
// 1. CONEXIÓN A GITHUB Y BASE DE DATOS
// ==========================================
import { officeData, cargarAgencias, guardarAgenciaAlStore } from "./dataStoreSedena.js";

const OUTPUT_IDS = [
  'outUser', 'outPass', 'outConfirm', 'outDesc',
  'outOffice', 'outNomen', 'outCitasUser', 'outGNUser'
];

/* ---------- UTIL ---------- */
const $ = id => document.getElementById(id);
const statusDiv    = $('loadStatus');
const spinner      = $('spinner');
const officeSearch = $('officeSearch');
const generateBtn  = $('generate');
const copyAllBtn   = $('copyAll');
const downloadBtn  = $('downloadCsv');
const clearBtn     = $('clearBtn');
const outputArea   = $('outputArea');
const curpInput    = $('curpInput');
const nameInput    = $('nameInput');
// CÓDIGO MUERTO ELIMINADO: officeSelect, fileInput, dropZone, filteredOfficeData
// (ninguno de estos IDs existe en el HTML actual)

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;

// --- INICIO DE CARGA ---
window.onload = async () => {
    showSpinner(true);
    setStatus("Conectando con base de datos en GitHub...");

    try {
        const ok = await cargarAgencias();
        if (ok) {
            setStatus(`¡Carga exitosa! ${officeData.length} agencias cargadas.`, "success");
            if (officeSearch) officeSearch.disabled = false;
            if (generateBtn)  generateBtn.disabled  = false;
            // CÓDIGO MUERTO ELIMINADO: officeSelect.disabled y populateOfficeSelect()
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
    if (spinner) spinner.style.display = show ? 'block' : 'none';
}

// BUG CORREGIDO: la clase era "status" pero el CSS define ".status-message"
function setStatus(message, type = '') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className   = `status-message ${type}`.trim();

        if (type === 'success') {
            setTimeout(() => { statusDiv.className = 'status-message'; }, 3000);
        }
    }
}

// ==========================================
// 2. BUSCADOR INTELIGENTE
// ==========================================
window.filterOffices = function(term) {
    const sugerenciasBox = document.getElementById("sugerenciasPrincipal");
    if (!sugerenciasBox) return;

    sugerenciasBox.innerHTML = "";
    term = term.toLowerCase().trim();

    if (!term) {
        sugerenciasBox.style.display = "none";
        return;
    }

    const filtradas = officeData.filter(o =>
        o.nombre.toLowerCase().includes(term) ||
        o.numero.includes(term) ||
        o.nomenclatura.toLowerCase().includes(term)
    );

    if (filtradas.length === 0) {
        sugerenciasBox.innerHTML = '<div style="padding:10px; color:gray;">No se encontraron resultados</div>';
        sugerenciasBox.style.display = "block";
        return;
    }

    filtradas.slice(0, 10).forEach(o => {
        const div = document.createElement("div");
        div.className = "sugerencia-item";
        div.innerHTML = `<strong>${o.numero}</strong> - ${o.nombre} <small>(${o.nomenclatura})</small>`;

        div.onclick = function() {
            document.getElementById("officeSearch").value = o.nombre;
            sugerenciasBox.style.display = "none";
            window.selectedOffice = o;
            if (window.generateKeys) window.generateKeys();
        };
        sugerenciasBox.appendChild(div);
    });

    sugerenciasBox.style.display = "block";
};

// Cerrar la lista si se hace clic fuera del buscador
document.addEventListener('click', (e) => {
    if (e.target.id !== 'officeSearch') {
        document.getElementById("sugerenciasPrincipal").style.display = "none";
    }
});

// ==========================================
// 3. PANEL DE ADMINISTRACIÓN
// ==========================================
window.toggleFormularioAdmin = function() {
    const modal = document.getElementById("modalAdmin");
    if (!modal) return;

    if (modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "flex";
        window.limpiarAdminForm();
    } else {
        modal.style.display = "none";
    }
};

window.limpiarAdminForm = function() {
    document.getElementById("buscadorSedena").value = "";
    document.getElementById("sugerenciasSedena").style.display = "none";
    window.cargarEnAdmin("");
};

window.filtrarAdminOficinas = function(term) {
    const sugerenciasBox = document.getElementById("sugerenciasSedena");
    sugerenciasBox.innerHTML = "";
    term = term.toLowerCase().trim();

    if (!term) {
        sugerenciasBox.style.display = "none";
        return;
    }

    const filtradas = officeData.filter(o =>
        (o.nombre       || "").toLowerCase().includes(term) ||
        (o.numero       || "").toString().toLowerCase().includes(term) ||
        (o.nomenclatura || "").toLowerCase().includes(term)
    );

    if (filtradas.length === 0) {
        sugerenciasBox.innerHTML = '<div style="padding:10px; color:var(--error); text-align:center; font-size:0.9rem;">No se encontraron oficinas</div>';
        sugerenciasBox.style.display = "block";
        return;
    }

    filtradas.slice(0, 15).forEach(o => {
        const div = document.createElement("div");
        div.textContent = `${o.numero} - ${o.nombre} (${o.nomenclatura})`;
        div.className   = "sugerencia-item";

        div.onclick = function() {
            document.getElementById("buscadorSedena").value = `${o.numero} - ${o.nombre}`;
            sugerenciasBox.style.display = "none";
            window.cargarEnAdmin(o.numero);
        };
        sugerenciasBox.appendChild(div);
    });

    sugerenciasBox.style.display = "block";
};

window.cargarEnAdmin = function(num) {
    const o = officeData.find(x => x.numero === num);
    if (o) {
        document.getElementById("admNumero").value  = o.numero;
        document.getElementById("admNomen").value   = o.nomenclatura;
        document.getElementById("admNombre").value  = o.nombre;
        document.getElementById("admEstatus").value = o.estatus;
    } else {
        document.getElementById("admNumero").value  = "";
        document.getElementById("admNomen").value   = "";
        document.getElementById("admNombre").value  = "";
        document.getElementById("admEstatus").value = "ACTIVA"; // BUG CORREGIDO: era "ACTIVO"
    }
};

window.guardarCambiosSedena = async function() {
    const datos = {
        numero:       document.getElementById("admNumero").value.trim(),
        nomenclatura: document.getElementById("admNomen").value.trim().toUpperCase(),
        nombre:       document.getElementById("admNombre").value.trim().toUpperCase(),
        estatus:      document.getElementById("admEstatus").value
    };

    if (!datos.numero || !datos.nomenclatura || !datos.nombre) {
        // ESTILO CORREGIDO: reemplazado alert() nativo por toast propio de la app
        mostrarToast("⚠️ Por favor llena todos los campos");
        return;
    }

    const btn     = document.getElementById("btnGuardarSedena");
    btn.disabled  = true;
    btn.innerText = "⏳ Guardando...";

    try {
        const res = await guardarAgenciaAlStore(datos);
        if (res !== "error") {
            // ESTILO CORREGIDO: reemplazado alert() por toast
            mostrarToast(`✅ Oficina ${res} con éxito.`);
            location.reload();
        } else {
            setStatus("Error al guardar en GitHub.", "error");
            btn.disabled  = false;
            btn.innerText = "💾 Guardar en GitHub";
        }
    } catch (error) {
        setStatus("Error al guardar: " + error.message, "error");
        btn.disabled  = false;
        btn.innerText = "💾 Guardar en GitHub";
    }
};

// ==========================================
// 4. LÓGICA DE GENERACIÓN
// ==========================================

// Estructura CURP: [4 letras apellidos][6 fecha nacimiento][sexo][2 estado][3 consonantes][verificador]
function generateCorporateUser(curp, nomen, office) {
    const iniciales = curp.substring(0, 3); // primeras 3 letras del apellido paterno
    return nomen + office + iniciales;
}

function generateCitasUser(curp, nomen) {
    const claveCurp = curp.substring(0, 4); // 4 letras iniciales de la CURP (apellidos)
    return nomen + claveCurp + "ISF";
}

function generateGNUser(curp, nomen, office) {
    const inicial = curp.substring(0, 1); // inicial del apellido paterno
    return nomen + office + inicial + "GN";
}

function validateInputs(curp, name, oficina) {
    if (!curp || curp.length !== 18 || !CURP_REGEX.test(curp)) {
        setStatus("ERROR: CURP inválida.", "error");
        return false;
    }
    if (!name || name.length < 5) {
        setStatus("ERROR: Ingresa el nombre completo.", "error");
        return false;
    }
    if (!oficina || !oficina.nomenclatura) {
        setStatus("ERROR: Debes seleccionar una oficina de la lista.", "error");
        return false;
    }
    return true;
}

function formatInteractivo(texto) {
    if (!texto || texto.length < 7) return texto;
    const base        = texto.slice(0, -7);
    const ultimosSiete = texto.slice(-7);
    return `${base}<span class="copiable-seis" title="Click para copiar últimos 7">${ultimosSiete}</span>`;
}

function formatTodoInteractivo(texto) {
    if (!texto) return "";
    return `<span class="copiable-seis" title="Click para copiar todo">${texto}</span>`;
}

function generateKeys() {
    const curp                = curpInput.value.trim().toUpperCase();
    const name                = nameInput.value.trim().toUpperCase();
    const oficinaSeleccionada = window.selectedOffice;

    if (!validateInputs(curp, name, oficinaSeleccionada)) {
        if (outputArea) outputArea.hidden = true;
        return;
    }

    const office = oficinaSeleccionada.numero;
    const nomen  = oficinaSeleccionada.nomenclatura;
    const desc   = oficinaSeleccionada.nombre;

    const userCorp  = generateCorporateUser(curp, nomen, office);
    const userCitas = generateCitasUser(curp, nomen);
    const userGN    = generateGNUser(curp, nomen, office);

    $('outUser').innerHTML      = formatInteractivo(userCorp);
    $('outCitasUser').innerHTML = formatInteractivo(userCitas);
    $('outGNUser').innerHTML    = formatInteractivo(userGN);

    $('outPassDuplicate1').innerHTML = formatTodoInteractivo(userCorp);
    $('outPassDuplicate2').innerHTML = formatTodoInteractivo(userCitas);
    $('outPassDuplicate3').innerHTML = formatTodoInteractivo(userGN);

    $('outOffice').innerHTML = formatTodoInteractivo(office);
    $('outNomen').innerHTML  = formatTodoInteractivo(nomen);
    $('outDesc').innerHTML   = formatTodoInteractivo(desc);

    $('outPass').textContent    = userCorp;
    $('outConfirm').textContent = userCorp;

    if (outputArea) outputArea.hidden = false;
    setStatus("¡Claves generadas!", "success");
}

// ==========================================
// 5. TOAST NOTIFICATIONS
// ==========================================
function mostrarToast(mensaje) {
    let toast = $('toast-notificacion');
    if (!toast) {
        toast    = document.createElement('div');
        toast.id = 'toast-notificacion';
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.className   = 'show'; // BUG CORREGIDO: era 'toast show' (clase "toast" innecesaria e incorrecta)
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 2000);
}

/* ---------- EVENTO DE CLICK PARA COPIAR ---------- */
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('copiable-seis')) {
        const textoACopiar = e.target.innerText;
        const parentId     = e.target.parentElement.id;

        navigator.clipboard.writeText(textoACopiar).then(() => {
            e.target.classList.add('copiado');

            let mensaje = "";
            if      (parentId === 'outDesc')   mensaje = `👤 Nombre copiado: ${textoACopiar}`;
            else if (parentId === 'outOffice') mensaje = `🏢 Oficina copiada: ${textoACopiar}`;
            else if (textoACopiar.length === 7) mensaje = `✅ Copiados los 7 dígitos: ${textoACopiar}`;
            else                               mensaje = `📋 Copiado: ${textoACopiar}`;

            mostrarToast(mensaje);
            setTimeout(() => { e.target.classList.remove('copiado'); }, 600);
        }).catch(err => {
            console.error('Error al copiar:', err);
            mostrarToast('❌ Error al copiar al portapapeles');
        });
    }
});

/* ---------- COPIAR COMPLETO ---------- */
function copyAll() {
    const usuarioCorp  = $('outUser')?.innerText.trim()      || "";
    const usuarioCitas = $('outCitasUser')?.innerText.trim() || "";
    const usuarioGN    = $('outGNUser')?.innerText.trim()    || "";
    const oficina      = $('outOffice')?.innerText.trim()    || "";
    const nomen        = $('outNomen')?.innerText.trim()     || "";
    const desc         = $('outDesc')?.innerText.trim()      || "";

    if (!usuarioCorp) {
        setStatus('No hay datos para copiar.', 'error');
        return;
    }

    let textoFinal  = "====================================\n";
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

    navigator.clipboard.writeText(textoFinal)
        .then(()   => { setStatus('¡Copiado con éxito!', 'success'); })
        .catch(err => { setStatus('Error al copiar: ' + err, 'error'); });
}

/* ---------- DESCARGAR CSV ---------- */
function downloadCsv() {
    const usuarioCorp  = $('outUser')?.innerText.trim()      || "";
    const usuarioCitas = $('outCitasUser')?.innerText.trim() || "";
    const usuarioGN    = $('outGNUser')?.innerText.trim()    || "";
    const oficina      = $('outOffice')?.innerText.trim()    || "";
    const nomen        = $('outNomen')?.innerText.trim()     || "";
    const desc         = $('outDesc')?.innerText.trim()      || "";

    if (!usuarioCorp) {
        setStatus('No hay datos para descargar.', 'error');
        return;
    }

    let csvText  = "sep=;\r\n";
        csvText += "SECCIÓN;DATOS DE ACCESO\r\n";
        csvText += "-----------------------;-----------------------\r\n";
        csvText += "ACCESO CORPORATIVO; \r\n";
        csvText += `Usuario (Corporativo);${usuarioCorp}\r\n`;
        csvText += `Contraseña (Corporativa);${usuarioCorp}\r\n`;
        csvText += "; \r\n";
        csvText += "ACCESO CITAS MÉDICAS; \r\n";
        csvText += `Usuario (Citas Médicas);${usuarioCitas}\r\n`;
        csvText += `Contraseña (Citas Médicas);${usuarioCitas}\r\n`;
        csvText += "; \r\n";
        csvText += "ACCESO GN; \r\n";
        csvText += `Usuario GN;${usuarioGN}\r\n`;
        csvText += `Contraseña (GN);${usuarioGN}\r\n`;
        csvText += "; \r\n";
        csvText += "INFORMACIÓN GENERAL; \r\n";
        csvText += `Oficina (Número);${oficina}\r\n`;
        csvText += `Nomenclatura (3 letras);${nomen}\r\n`;
        csvText += `Descripción;${desc}\r\n`;

    const blob       = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const link       = document.createElement('a');
    const curpPrefix = ($('curpInput').value.trim().substring(0, 4).toUpperCase()) || 'XXXX';
    const date       = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomenValue = $('outNomen')?.innerText.trim() || 'NNN';

    link.download = `CLAVES_${curpPrefix}_${nomenValue}_${date}.csv`;
    link.href     = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatus('Archivo descargado.', 'success');
}

/* ---------- LIMPIAR ---------- */
function limpiar() {
    if (curpInput)    curpInput.value    = "";
    if (nameInput)    nameInput.value    = "";
    if (officeSearch) officeSearch.value = "";

    window.selectedOffice = null;

    OUTPUT_IDS.forEach(id => {
        const el = $(id);
        if (el) el.textContent = "";
    });

    [$('outPassDuplicate1'), $('outPassDuplicate2'), $('outPassDuplicate3')]
        .forEach(el => { if (el) el.textContent = ""; });

    if (outputArea) outputArea.hidden = true;
    filterOffices('');
    setStatus("Formulario limpiado.", "success");
}

// ==========================================
// 6. CONFIGURACIÓN DE EVENTOS
// ==========================================
// BUG CORREGIDO: listener de officeSearch estaba duplicado (existía también arriba en el script).
// Se consolida aquí en un solo lugar junto al resto de eventos.
if (officeSearch) officeSearch.addEventListener('input', e => window.filterOffices(e.target.value));
if (generateBtn)  generateBtn.addEventListener('click', generateKeys);
if (copyAllBtn)   copyAllBtn.addEventListener('click', copyAll);
if (downloadBtn)  downloadBtn.addEventListener('click', downloadCsv);
if (clearBtn)     clearBtn.addEventListener('click', limpiar);

if (curpInput && nameInput) {
    curpInput.addEventListener('keypress', e => { if (e.key === 'Enter') generateKeys(); });
    nameInput.addEventListener('keypress', e => { if (e.key === 'Enter') generateKeys(); });
}

// Exportar al scope global para llamadas desde HTML (onclick="...")
window.generateKeys  = generateKeys;
window.copyAll       = copyAll;
window.downloadCsv   = downloadCsv;
window.limpiar       = limpiar;
window.filterOffices = filterOffices;
// CÓDIGO MUERTO ELIMINADO: bloque dropZone/fileInput (IDs inexistentes en el HTML)