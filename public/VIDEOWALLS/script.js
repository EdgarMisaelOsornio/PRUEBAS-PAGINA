// ==========================================
// 1. CONEXIÓN A GITHUB Y BASE DE DATOS
// ==========================================
import { basePantallas as base, cargarPantallas, agregarPantallaAlStore } from "./dataStoreVideowalls.js";

window.onload = async () => {
    const cargado = await cargarPantallas();
    if (cargado) {
        console.log("✅ Base de Videowalls lista y conectada");
    } else {
        showToast("❌ Error al cargar la base de GitHub", true);
    }
};

// ==========================================
// 2. FUNCIONES DEL FORMULARIO DE GITHUB (MODIFICADO)
// ==========================================

// Función para abrir/cerrar y LLENAR EL SELECTOR
window.toggleFormularioPantalla = function() {
    const sec = document.getElementById("secAgregarPantalla");
    const selector = document.getElementById("selectorExistentes");
    
    if(!sec) return;

    if(sec.style.display === "none" || sec.style.display === "") {
        sec.style.display = "flex"; // Abrir modal
        
        // 1. Limpiar selector
        selector.innerHTML = '<option value="">-- Selecciona una oficina para editar --</option>';
        
        // 2. Ordenar oficinas por nombre (alfabético)
        const baseOrdenada = [...base].sort((a, b) => a[1].localeCompare(b[1]));
        
        // 3. Crear las opciones en el selector
        baseOrdenada.forEach(p => {
            const option = document.createElement("option");
            option.value = p[0]; // El valor es el Código
            option.textContent = `${p[1]} (${p[0]})`;
            selector.appendChild(option);
        });
    } else {
        sec.style.display = "none"; // Cerrar modal
    }
};

// Función para auto-rellenar los cuadros cuando eliges algo en la lista
window.cargarDatosEnFormulario = function(codigo) {
    if(!codigo) {
        window.limpiarFormulario();
        return;
    }
    
    const datos = base.find(p => p[0] === codigo);
    if(datos) {
        document.getElementById("newCodigo").value = datos[0];
        document.getElementById("newSala").value = datos[1];
        document.getElementById("newProveedor").value = datos[2];
        
        // Ponemos el código un poco gris para indicar que no se debe cambiar
        document.getElementById("newCodigo").style.opacity = "0.7";
        showToast("Datos cargados correctamente");
    }
};

// Función para vaciar los cuadros
window.limpiarFormulario = function() {
    document.getElementById("newCodigo").value = "";
    document.getElementById("newSala").value = "";
    document.getElementById("newProveedor").value = "";
    document.getElementById("selectorExistentes").value = "";
    document.getElementById("newCodigo").style.opacity = "1";
};

window.guardarPantalla = async function() {
    const codigo = document.getElementById("newCodigo").value.trim().toUpperCase();
    const sala = document.getElementById("newSala").value.trim().toUpperCase();
    const proveedor = document.getElementById("newProveedor").value.trim().toUpperCase();

    if (!codigo || !sala || !proveedor) {
        showToast("⚠️ Por favor llena todos los campos", true);
        return;
    }

    const btn = document.getElementById("btnGuardarPantalla");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ Guardando en GitHub...";
    btn.disabled = true;

    const resultado = await agregarPantallaAlStore({ codigo, sala, proveedor });

    if (resultado === "creado" || resultado === "actualizado") {
        showToast(`✅ Pantalla ${resultado} con éxito en GitHub`);
        
        window.limpiarFormulario();
        window.toggleFormularioPantalla();

        await cargarPantallas(); 
    } else {
        showToast("❌ Error al guardar en GitHub", true);
    }

    btn.innerHTML = textoOriginal;
    btn.disabled = false;
};

// ==========================================
// 3. EXPORTAR FUNCIONES AL HTML (Obligatorio)
// ==========================================
window.debounceBuscarProveedor = debounceBuscarProveedor;
window.limpiarBuscadorProveedor = limpiarBuscadorProveedor;
window.buscarProveedorPorOficina = buscarProveedorPorOficina;
window.buscarPorNombre = buscarPorNombre;
window.cancelarBusqueda = cancelarBusqueda;
window.buscarPorArchivos = buscarPorArchivos;
window.descargarZip = descargarZip;
window.copiarCorreos = copiarCorreos;
window.marcarFila = marcarFila; // La moví aquí para consistencia

window.marcarFila = function(checkbox) {
    const fila = checkbox.closest("tr");
    if (checkbox.checked) {
        fila.style.opacity = "0.4"; 
        fila.style.textDecoration = "line-through"; 
        fila.style.background = "rgba(0, 184, 148, 0.05)"; 
    } else {
        fila.style.opacity = "1"; 
        fila.style.textDecoration = "none";
        fila.style.background = "";
    }
};

// ==========================================
// 4. VARIABLES GLOBALES Y UTILIDADES
// ==========================================
let BUSQUEDA_ACTIVA = false; 
let archivosSubidos = []; // Agregado para que no marque error estricto
let _proveedorTimer = null;

function normalizar(texto){
  if(!texto || typeof texto !== "string") return "";
  return texto
    .replace(/^\s*/,"")
    .replace(/^\[[^\]]+\]/,"")       
    .replace(/^\d+\s*/,"")          
    .replace(/,/g," ")              
    .replace(/\./g,"")              
    .replace(/\s+/g," ")            
    .replace(/\bCD\b/gi,"CIUDAD")  
    .trim()
    .toUpperCase();
}

function cancelarBusqueda(){
  if(!BUSQUEDA_ACTIVA) return;
  BUSQUEDA_ACTIVA = false;
  document.getElementById("btnBuscar").disabled = false;
  document.getElementById("btnCancelar").disabled = true;
  document.getElementById("progresoBusqueda").innerText = "Búsqueda cancelada por el usuario.";
  document.getElementById("barraProgreso").style.display = "none";
  console.log("Procesamiento abortado por cancelación.");
}

function escapeHtml(str){
  if(str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function escapeJs(str){
  if(str === null || str === undefined) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

// ==========================================
// 5. LÓGICA DE BÚSQUEDAS
// ==========================================
function debounceBuscarProveedor(){
  clearTimeout(_proveedorTimer);
  _proveedorTimer = setTimeout(() => {
    const el = document.getElementById('buscadorProveedor');
    if(!el) return;
    if(el.value.trim().length === 0){
      const out = document.getElementById('resultadoProveedor');
      if(out) out.innerHTML = "";
      return;
    }
    buscarProveedorPorOficina(true);
  }, 250);
}

function limpiarBuscadorProveedor(){
  const el = document.getElementById('buscadorProveedor');
  const out = document.getElementById('resultadoProveedor');
  if(el) el.value = "";
  if(out) out.innerHTML = "";
}

function buscarProveedorPorOficina(auto = false){
  const rawEl = document.getElementById('buscadorProveedor');
  const out = document.getElementById('resultadoProveedor');
  if(!rawEl || !out) return;

  const raw = rawEl.value || "";
  const lineas = raw.replace(/\r/g, "").split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  if(lineas.length === 0){
    if(!auto) out.innerHTML = "<p class='no-match'>❌ Escribe al menos una oficina.</p>";
    return;
  }

  const unicos = new Map();
  lineas.forEach(l => {
    const n = normalizar(l);
    if(!n) return;
    if(!unicos.has(n)) unicos.set(n, l);
  });

  let todasCoincidencias = [];
  let noEncontradas = [];

  unicos.forEach((original, normalizada) => {
    const palabras = normalizada.split(" ").filter(Boolean);
    const coincidencias = base.filter(b => {
      const nombreBase = normalizar(b[1]);
      return palabras.every(p => {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${esc}\\b`, "i");
        return re.test(nombreBase);
      });
    });

    if(coincidencias.length > 0){
      coincidencias.forEach(c => {
        if(!todasCoincidencias.some(existente => existente[0] === c[0])) {
          todasCoincidencias.push(c);
        }
      });
    } else {
      noEncontradas.push(original);
    }
  });

  let html = "";

  if(todasCoincidencias.length === 0){
    html = "<p class='no-match'>❌ No se encontró ninguna coincidencia en la base de datos.</p>";
  } else {
    const grupos = {};
    todasCoincidencias.forEach(c => {
      const proveedor = c[2] || "SIN_PROVEEDOR";
      if(!grupos[proveedor]) grupos[proveedor] = [];
      grupos[proveedor].push({ codigo: c[0], nombre: c[1] });
    });

    html += `<div class="fade-in" style="margin-top:10px;">`;
    html += `<h3 style="margin-bottom: 20px; color: var(--primary-text); text-align: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px;">✅ Resultados Encontrados</h3>`;

    Object.keys(grupos).sort().forEach(proveedor => {
      const colorClass = `group-${proveedor.toLowerCase().replace(/\s/g,'')}`;
      grupos[proveedor].sort((a,b) => a.codigo.localeCompare(b.codigo));

      html += `
        <div class="provider-group-container ${colorClass}">
          <div class="provider-group-header">
            <span>🏢 Proveedor: ${escapeHtml(proveedor)}</span>
            <span class="count-badge">${grupos[proveedor].length} pantalla(s)</span>
          </div>
          <div class="table-responsive">
            <table class="corporate-table activity-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Ubicación / Sala</th>
                  <th style="width: 60px; text-align: center;">Listo</th> </tr>
              </thead>
              <tbody>
                ${grupos[proveedor].map(it => `
                  <tr style="transition: all 0.3s ease;">
                    <td><span class="badge-code">${escapeHtml(it.codigo)}</span></td>
                    <td>${escapeHtml(it.nombre)}</td>
                    <td style="text-align: center;">
                      <input type="checkbox" style="transform: scale(1.4); cursor: pointer;" onclick="marcarFila(this)">
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if(noEncontradas.length > 0){
    html += `
    <div style="margin-top: 25px; padding: 15px; background: rgba(234, 84, 85, 0.1); border: 1px solid rgba(234, 84, 85, 0.4); border-radius: 12px;">
        <h4 style="color: #ea5455; margin-bottom: 10px; font-weight: 800;">❌ Sin coincidencias para:</h4>
        <ul style="list-style-type: none; padding: 0; margin: 0; color: #ea5455; font-size: 0.9rem;">
            ${noEncontradas.map(q => `<li style="margin-bottom: 6px; border-bottom: 1px dashed rgba(234, 84, 85, 0.2); padding-bottom: 4px;">• ${escapeHtml(q)}</li>`).join('')}
        </ul>
    </div>`;
  }

  out.innerHTML = html;
}

function buscarPorNombre(){
  if(BUSQUEDA_ACTIVA){
    console.log("Ya hay una búsqueda en curso.");
    return;
  }

  const raw = document.getElementById("solicitudes").value;
  const resultado = document.getElementById("resultadoNombres");
  const progresoEl = document.getElementById("progresoBusqueda");
  const barra = document.getElementById("barraProgreso");
  const barraFill = document.getElementById("barraProgresoFill");
  resultado.innerHTML = "";
  progresoEl.innerHTML = "";
  barra.style.display = "none";
  barraFill.style.width = "0%";

  if(!raw || raw.trim() === ""){
    resultado.innerHTML = "<p class='no-match'>❌ Ingrese al menos una oficina.</p>";
    return;
  }

  const LIMITE_MODO_REDUCIDO = 100; 
  const BATCH_SIZE = 250; 
  const RENDER_BATCH = 300; 

  const LINE_SPLIT = raw.replace(/\r/g,"").split("\n");
  const mapaUnicos = new Map();

  LINE_SPLIT.forEach(l => {
    const original = l.trim();
    const normalizada = normalizar(l);
    if (!normalizada) return;
    if (!mapaUnicos.has(normalizada)) {
      mapaUnicos.set(normalizada, { original, normalizada });
    }
  });

  const entradas = Array.from(mapaUnicos.values());
  const totalEntradas = entradas.length;
  
  if(totalEntradas === 0){
    resultado.innerHTML = "<p class='no-match'>No se encontraron líneas válidas.</p>";
    return;
  }

  const modoReducido = totalEntradas > LIMITE_MODO_REDUCIDO;
  BUSQUEDA_ACTIVA = true;
  document.getElementById("btnBuscar").disabled = true;
  document.getElementById("btnCancelar").disabled = false;
  progresoEl.innerText = `Iniciando procesamiento de ${totalEntradas} oficinas...`;
  barra.style.display = "block";

  let index = 0;
  let encontradas = []; 
  let noEncontradas = []; 

  function procesarBatch(){
    if(!BUSQUEDA_ACTIVA) return;

    const end = Math.min(index + BATCH_SIZE, totalEntradas);
    for(let i = index; i < end; i++){
      const e = entradas[i];
      const palabras = e.normalizada.split(" ").filter(Boolean);
      const coincidencias = base.filter(b => {
        const nombreBase = normalizar(b[1]);
        return palabras.every(p => {
          const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(`\\b${esc}\\b`, "i");
          return re.test(nombreBase);
        });
      });

      if(coincidencias.length === 0){
        if(!modoReducido) noEncontradas.push({ buscada: e.original });
      } else {
        coincidencias.forEach(c => {
          const key = e.normalizada + "||" + c[1];
          if (!encontradas.some(x => x.key === key)) {
            encontradas.push({ key, buscada: e.original, nombre: c[1], proveedor: c[2] });
          }
        });
      }
    }

    index = end;
    const pct = Math.round((index / totalEntradas) * 100);
    progresoEl.innerText = `Procesando ${totalEntradas} oficinas... ${pct}% (${index}/${totalEntradas})`;
    barraFill.style.width = pct + "%";

    if(index < totalEntradas){
      setTimeout(procesarBatch, 0);
    } else {
      setTimeout(() => renderizarResultados(), 0);
    }
  }

  function renderizarResultados(){
    if(!BUSQUEDA_ACTIVA) return;

    const resumen = document.createElement("div");
    resumen.innerHTML = `<p>Encontradas: <strong>${encontradas.length}</strong>${!modoReducido ? ` — No encontradas: <strong>${noEncontradas.length}</strong>` : ""}</p>`;
    resultado.appendChild(resumen);

    if(modoReducido){
      const titulo = document.createElement("h4");
      titulo.innerText = `⚠ Modo reducido (se ingresaron ${totalEntradas} oficinas). Solo se muestran coincidencias encontradas.`;
      resultado.appendChild(titulo);

      if(encontradas.length === 0){
        const p = document.createElement("p");
        p.className = "no-match";
        p.innerText = "❌ Ninguna coincidencia encontrada";
        resultado.appendChild(p);
        finalizar();
        return;
      }

      const tabla = document.createElement("table");
      tabla.innerHTML = `<thead><tr><th>Buscada</th><th>Coincidencia</th><th>Proveedor</th></tr></thead><tbody></tbody>`;
      resultado.appendChild(tabla);
      const tbody = tabla.querySelector("tbody");

      let ri = 0;
      function renderRowsReducidas(){
        if(!BUSQUEDA_ACTIVA) return;
        const end = Math.min(ri + RENDER_BATCH, encontradas.length);
        const frag = document.createDocumentFragment();
        for(let j = ri; j < end; j++){
          const r = encontradas[j];
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${escapeHtml(r.buscada)}</td><td class="match">${escapeHtml(r.nombre)}</td><td>${escapeHtml(r.proveedor)}</td>`;
          frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        ri = end;
        const pctRender = Math.round((ri / encontradas.length) * 100);
        progresoEl.innerText = `Renderizando coincidencias: ${pctRender}% (${ri}/${encontradas.length})`;
        barraFill.style.width = pctRender + "%";
        if(ri < encontradas.length){
          setTimeout(renderRowsReducidas, 0);
        } else {
          finalizar();
        }
      }
      renderRowsReducidas();

    } else {
      const tabla = document.createElement("table");
      tabla.innerHTML = `<thead><tr><th>Oficina buscada</th><th>Coincidencias en Base de Datos</th></tr></thead><tbody></tbody>`;
      resultado.appendChild(tabla);
      const tbody = tabla.querySelector("tbody");

      const map = new Map();
      encontradas.forEach(r => {
        const k = r.buscada;
        if(!map.has(k)) map.set(k, []);
        map.get(k).push(`${escapeHtml(r.nombre)} — <strong>${escapeHtml(r.proveedor)}</strong>`);
      });

      let ri = 0;
      function renderRowsNormal(){
        if(!BUSQUEDA_ACTIVA) return;
        const end = Math.min(ri + RENDER_BATCH, entradas.length);
        const frag = document.createDocumentFragment();
        for(let j = ri; j < end; j++){
          const e = entradas[j];
          const lista = map.get(e.original);
          const tr = document.createElement("tr");
          if(!lista || lista.length === 0){
            tr.innerHTML = `<td>${escapeHtml(e.original)}</td><td class="no-match">❌ No encontrada</td>`;
          } else {
            tr.innerHTML = `<td>${escapeHtml(e.original)}</td><td class="match">✅<br>${lista.join("<br>")}</td>`;
          }
          frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        ri = end;
        const pctRender = Math.round((ri / entradas.length) * 100);
        progresoEl.innerText = `Renderizando resultados: ${pctRender}% (${ri}/${entradas.length})`;
        barraFill.style.width = pctRender + "%";
        if(ri < entradas.length){
          setTimeout(renderRowsNormal, 0);
        } else {
          finalizar();
        }
      }
      renderRowsNormal();
    }
  }

  function finalizar(){
    BUSQUEDA_ACTIVA = false;
    document.getElementById("btnBuscar").disabled = false;
    document.getElementById("btnCancelar").disabled = true;
    document.getElementById("barraProgreso").style.display = "none";
    document.getElementById("progresoBusqueda").innerText += " — Listo.";
  }

  setTimeout(procesarBatch, 0);
}

// ==========================================
// 6. BÚSQUEDA POR ARCHIVOS Y DESCARGAS
// ==========================================
function buscarPorArchivos() {
  const archivos = document.getElementById("archivos").files;
  const resultado = document.getElementById("resultadoArchivos");
  resultado.innerHTML = "";
  if (!archivos.length) return;

  archivosSubidos = Array.from(archivos);
  const grupos = {};

  archivosSubidos.forEach(archivo => {
    const codigo = archivo.name.replace(/\s*\(.*\)/, "").split('.')[0].toUpperCase();
    const match = base.find(b => b[0] === codigo);
    const proveedor = match ? match[2] : "SIN_PROVEEDOR";

    if (!grupos[proveedor]) grupos[proveedor] = [];
    grupos[proveedor].push({ archivo, codigo, match });
  });

  let html = `<div class="fade-in" style="margin-top: 25px;">`;

  for (const proveedor in grupos) {
    const colorClass = `group-${proveedor.toLowerCase().replace(/\s/g, '')}`;
    html += `
      <div class="provider-group-container ${colorClass}">
        <div class="provider-group-header">
          <span>🏢 Proveedor: ${proveedor}</span>
          <span class="count-badge">${grupos[proveedor].length} archivos</span>
        </div>
        <div class="table-responsive">
          <table class="corporate-table activity-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Código</th>
                <th>Nombre Completo</th>
                <th style="text-align:center;">Estado</th>
              </tr>
            </thead>
            <tbody>`;

    grupos[proveedor].forEach(item => {
      const nombre = item.match ? item.match[1] : "—";
      const estadoIcono = item.match ? "✅" : "❌";
      const estadoClase = item.match ? "match" : "no-match";

      html += `
        <tr>
          <td class="file-name">📄 ${item.archivo.name}</td>
          <td><span class="badge-code">${item.codigo}</span></td>
          <td>${nombre}</td>
          <td style="text-align:center;"><span class="${estadoClase}">${estadoIcono}</span></td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
  }

  html += `</div>`;
  resultado.innerHTML = html;
}

function descargarZip(){
  if(!archivosSubidos.length) return alert("No hay archivos procesados.");
  const zip = new JSZip();
  archivosSubidos.forEach(archivo=>{
    const codigo = archivo.name.replace(/\s*\(.*\)/,"").split('.')[0].toUpperCase();
    const match = base.find(b => b[0] === codigo);
    const proveedor = match ? match[2] : "SIN_PROVEEDOR";
    zip.folder(proveedor).file(archivo.name, archivo);
  });
  zip.generateAsync({type:"blob"}).then(c=>saveAs(c,"Archivos_Videowalls.zip"));
}

function copiarCorreos(correos) {
    navigator.clipboard.writeText(correos).then(() => {
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = "✅ ¡Copiado!";
        btn.style.color = "#28a745";
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}

function showToast(message, isError = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.style.borderLeftColor = '#dc3545';

    toast.innerHTML = `<span>${isError ? '❌' : '✅'} ${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 7. LÓGICA DE DRAG & DROP
// ==========================================
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('archivos');
const fileCounter = document.getElementById('file-counter');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    if (dropArea) dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    if (dropArea) dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    if (dropArea) dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

if (dropArea) dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (fileInput) fileInput.files = files; 
    handleFiles(files);
}

function handleFiles(files) {
    const count = files.length;
    if (fileCounter) {
        if (count > 0) {
            fileCounter.innerText = `${count} archivo(s) seleccionado(s)`;
            fileCounter.style.background = "#00b894"; 
        } else {
            fileCounter.innerText = "Ningún archivo seleccionado";
            fileCounter.style.background = ""; 
        }
    }
}