import { cargarOficinas, agregarOficinaAlStore, oficinas } from "./dataStore.js"; 
import { iniciarBuscador } from "./buscador.js";
import { cargarSelectDirecciones, agregarOficinasPorDireccion } from "./filtros.js";
import { generar, prepararPoliticas } from "./generador.js";

import { descargarExcel, descargarWord, descargarArchivoOriginal } from "./exportaciones.js";
import { getDireccionesActuales, agregarDireccion, editarDireccion, eliminarDireccion, reasignarOficinas } from "./dataStoreDirecciones.js";

// ==========================================
// 1. FUNCIONES INTERNAS DE LA TABLA
// ==========================================
function actualizarTablaManuales() {
  const tbody = document.getElementById("tablaManualesBody");
  if (!tbody) return;
  tbody.innerHTML = ""; 
  const ultimasOficinas = oficinas.slice(-15).reverse();
  ultimasOficinas.forEach(oficina => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><strong>${oficina.clave}</strong></td>
      <td>${oficina.nombre}</td>
      <td>${oficina.nomenclatura}</td>
      <td>${oficina.direccion}</td>
      <td>
        <button class="btn-edit" onclick="window.cargarOficinaAlFormulario('${oficina.clave}')">📝 Corregir</button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function actualizarTablaModal(filtro = "") {
    const tbody = document.getElementById("tablaModalBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const busqueda = filtro.toLowerCase();

    const lista = oficinas.filter(o => 
        o.nombre.toLowerCase().includes(busqueda) || 
        o.clave.includes(busqueda)
    ).slice(0, 30); 

    lista.forEach(oficina => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><b>${oficina.clave}</b></td>
            <td>${oficina.nombre}</td>
            <td>${oficina.nomenclatura}</td>
            <td>
                <button class="btn-edit" onclick="window.cargarOficinaAlFormulario('${oficina.clave}')">📝 Corregir</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// ==========================================
// 2. MODAL DE CONFIRMACIÓN (SI / NO)
// ==========================================
window.mostrarConfirmacionCustom = function(mensajeHTML) {
    return new Promise((resolve) => {
        const modal = document.getElementById("modalConfirmacion");
        const mensajeDiv = document.getElementById("confirmMensaje");
        const btnSi = document.getElementById("btnConfirmarSi");
        const btnNo = document.getElementById("btnConfirmarNo");

        mensajeDiv.innerHTML = mensajeHTML;
        modal.style.display = "flex";

        btnSi.onclick = () => { modal.style.display = "none"; resolve(true); };
        btnNo.onclick = () => { modal.style.display = "none"; resolve(false); };
    });
};


// ==========================================
// 3. GUARDAR / ACTUALIZAR (CON DOBLE VALIDACIÓN)
// ==========================================
async function guardarOficinaManual() {
  const clave = document.getElementById("newClave").value.trim();
  const nombre = document.getElementById("newNombre").value.trim();
  const nom = document.getElementById("newNomenclatura").value.trim();
  const dir = document.getElementById("newDireccion").value.trim();

  // --- 1. VALIDACIÓN INICIAL DE CAMPOS VACÍOS ---
  if (!clave || !nombre || !nom || !dir) {
    window.mostrarAviso("Datos Incompletos", "Por favor llena todos los campos antes de continuar.", "advertencia");
    return;
  }

  // --- 2. VALIDACIÓN DE FORMATO DE CLAVE ---
  let claveNorm = clave;
  if (/^\d+$/.test(clave)) claveNorm = clave.padStart(4, "0");

  const oficinaExistente = oficinas.find(o => o.clave === claveNorm);

  // --- 3. MENSAJE DE CONFIRMACIÓN ANTES DE PROCESAR ---
  let mensajeConfirmacion = "";
  
  if (oficinaExistente) {
    // Si ya existe, mostramos el comparativo que ya tenías
    mensajeConfirmacion = `
      <p style="color: var(--accent); font-weight: bold;">⚠️ LA CLAVE "${claveNorm}" YA EXISTE.</p>
      <div style="background: rgba(255,255,255,0.07); padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid var(--glass-border);">
        <small>Dato Actual:</small><br><strong>${oficinaExistente.nombre}</strong>
      </div>
      <div style="background: rgba(255,255,255,0.07); padding: 10px; border-radius: 8px; border: 1px solid var(--glass-border);">
        <small>Nuevo Dato:</small><br><strong>${nombre}</strong>
      </div>
      <p style="margin-top:15px;">¿Deseas SOBRESCRIBIR los datos de esta oficina?</p>
    `;
  } else {
    // Si es nueva, pedimos confirmación simple
    mensajeConfirmacion = `
      <p style="font-size: 1.1rem;">¿Confirmas que deseas guardar esta nueva oficina?</p>
      <div style="background: rgba(255,255,255,0.07); padding: 15px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #28c76f;">
        <strong>Clave:</strong> ${claveNorm}<br>
        <strong>Nombre:</strong> ${nombre}<br>
        <strong>Nomenclatura:</strong> ${nom}<br>
        <strong>Dirección:</strong> ${dir}
      </div>
    `;
    
  }

  // Esperamos a que el usuario presione "SÍ" en el modal de confirmación
  const usuarioConfirma = await window.mostrarConfirmacionCustom(mensajeConfirmacion);
  if (!usuarioConfirma) return; // Si cancela, nos detenemos aquí.

  // --- 4. PROCESO DE GUARDADO EN GITHUB ---
  const btnGuardar = document.querySelector("button.success");
  const textoOriginal = btnGuardar.innerHTML;
  btnGuardar.disabled = true;
  btnGuardar.innerHTML = "⏳ Guardando...";

  try {
    const resultado = await agregarOficinaAlStore({
      clave: clave, 
      nombre: nombre, 
      nomenclatura: nom, 
      direccion: dir
    });

    if (resultado === "creado" || resultado === "actualizado") {
      const titulo = resultado === "creado" ? "¡Oficina Añadida!" : "¡Oficina Actualizada!";
      window.mostrarAviso(titulo, `La oficina <b>${nombre}</b> ha sido sincronizada exitosamente.`, "exito");
      
      // Limpiar formulario
      document.getElementById("newClave").value = "";
      document.getElementById("newNombre").value = "";
      document.getElementById("newNomenclatura").value = "";
      document.getElementById("newDireccion").value = "";
      
      cargarSelectDirecciones();
      actualizarTablaManuales();
    } else {
      window.mostrarAviso("Error", "No se pudo guardar en GitHub. Verifica tu conexión.", "error");
    }
  } catch (err) {
    window.mostrarAviso("Error Crítico", err.message, "error");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
  }
}

// ==========================================
// 4. INICIALIZACIÓN
// ==========================================
window.onload = async () => {
  try {
    await cargarOficinas();
    cargarSelectDirecciones();
    iniciarBuscador();

    // ── Inicializar Custom Selects ───────────────────────────────
    const _dirSubtext = (val) => {
      if (!val) return null;
      const n = oficinas.filter(o => o.direccion === val).length;
      return n > 0 ? `${n} oficina${n !== 1 ? "s" : ""} asignadas` : "Sin oficinas asignadas";
    };

    window.initCustomSelect("filtroDireccion",   { subtext: _dirSubtext });
    window.initCustomSelect("newDireccion",       { searchable: true, placeholder: "Selecciona una dirección" });
    window.initCustomSelect("puesto",             { searchable: true, placeholder: "-- Selecciona un puesto --" });

    window.generar = generar;
    window.agregarOficinasPorDireccion = agregarOficinasPorDireccion;
    window.descargarExcel = descargarExcel;
    window.descargarWord = descargarWord;
    window.irAPoliticas = prepararPoliticas;
    window.guardarOficinaManual = guardarOficinaManual; 

    window.mostrarBuscadorCorreccion = function() {
        const modal = document.getElementById("modalCorreccion");
        if (modal) {
            modal.style.display = "flex";
            actualizarTablaModal(); 
        }
    };

    window.cerrarModal = function() {
        const modal = document.getElementById("modalCorreccion");
        if (modal) modal.style.display = "none";
    };

    window.filtrarTablaModal = function() {
        const texto = document.getElementById("buscadorModal").value;
        actualizarTablaModal(texto);
    };

window.cargarOficinaAlFormulario = function(clave) {
    const oficina = oficinas.find(o => o.clave === clave);
    
    if (oficina) {
        // 1. Llenamos los campos de "DATOS ACTUALES" (Solo lectura/Referencia)
        const oldClaveEl = document.getElementById("oldClave");
        const oldDireccionEl = document.getElementById("oldDireccion");
        const oldNombreEl = document.getElementById("oldNombre");
        const oldNomenclaturaEl = document.getElementById("oldNomenclatura");
        
        if (oldClaveEl) oldClaveEl.innerText = oficina.clave;
        if (oldDireccionEl) oldDireccionEl.innerText = oficina.direccion;
        if (oldNombreEl) oldNombreEl.innerText = oficina.nombre;
        if (oldNomenclaturaEl) oldNomenclaturaEl.innerText = oficina.nomenclatura;

        // 2. Llenamos los "NUEVOS DATOS" (Los inputs que se van a editar)
        document.getElementById("newClave").value = oficina.clave;
        document.getElementById("newNombre").value = oficina.nombre;
        document.getElementById("newNomenclatura").value = oficina.nomenclatura;
        document.getElementById("newDireccion").value = oficina.direccion;
        document.getElementById("newNombre").focus();
        
        // 3. MOSTRAR EL BLOQUE DE DATOS ACTUALES Y CAMBIAR TÍTULO (¡Nuevo!)
        const datosActualesDiv = document.getElementById("datosActualesDiv");
        if (datosActualesDiv) datosActualesDiv.style.display = "block";
        
        const tituloAccion = document.getElementById("tituloAccionFormulario");
        if (tituloAccion) tituloAccion.innerText = "Editar oficina";
        
        // ✅ Aviso de carga con la comparativa lista
        window.mostrarAviso("Modo Edición", `Editando: <b>${oficina.nombre}</b>. <hr> Edita con cuidado las oficinas existentes.`, "info");
    }
};

    console.log("✅ Sistema vinculado con Modales Custom");

    // ── Copiar PUESTO al hacer clic ──────────────────────────────────
    document.getElementById("resultado")?.addEventListener("click", (e) => {
      const span = e.target.closest(".puesto-copiable");
      if (!span) return;
      const texto = span.dataset.puesto;
      navigator.clipboard.writeText(texto).then(() => {
        const icon = span.querySelector(".puesto-copy-icon");
        const original = icon.textContent;
        icon.textContent = "✅";
        span.classList.add("puesto-copiado");
        setTimeout(() => {
          icon.textContent = original;
          span.classList.remove("puesto-copiado");
        }, 1800);
      });
    });
  } catch (error) {
    console.error("❌ Error inicial:", error);
    window.mostrarAviso("Error Crítico", "No se pudo cargar la base de oficinas.", "error");
  }
};

window.mostrarAviso = function(titulo, texto, tipo = 'info') {
    const modal = document.getElementById("modalMensaje");
    const icono = document.getElementById("mensajeIcono");
    const tituloDiv = document.getElementById("mensajeTitulo");
    const textoDiv = document.getElementById("mensajeTexto");

    const configuracion = {
        exito: { icono: '🚀', color: '#28c76f' },
        error: { icono: '❌', color: '#ea5455' },
        advertencia: { icono: '⚠️', color: '#ff9f43' },
        info: { icono: 'ℹ️', color: '#00cfe8' }
    };

    const config = configuracion[tipo] || configuracion.info;

    icono.innerHTML = config.icono;
    tituloDiv.innerText = titulo;
    tituloDiv.style.color = config.color;
    textoDiv.innerHTML = texto;

    modal.style.display = "flex";
};

window.cerrarMensaje = function() {
    document.getElementById("modalMensaje").style.display = "none";
};

// =========================================
// 6. CONTROL DEL FORMULARIO (MODAL ADMIN)
// =========================================
window.toggleFormulario = function() {
    const modal = document.getElementById("modalAdmin");
    
    if (modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "flex";
        
        // Inicializar el buscador flotante
        setTimeout(() => {
            window.setupBuscadorAdmin();
            const inputBusca = document.getElementById("buscadorRapidoAdmin");
            if (inputBusca) inputBusca.focus();
        }, 100);

    } else {
        // --- AL CERRAR: LIMPIEZA TOTAL ---
        modal.style.display = "none";

        // 1. Limpiar inputs
        const campos = ["newClave", "newNombre", "newNomenclatura", "buscadorRapidoAdmin"];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        // 2. Limpiar select de dirección
        const selectDir = document.getElementById("newDireccion");
        if (selectDir) selectDir.value = "";

        // 3. Limpiar comparativa (Antes vs Después)
        const oldClave = document.getElementById("oldClave");
        const oldDireccion = document.getElementById("oldDireccion");
        const oldNombre = document.getElementById("oldNombre");
        const oldNomenclatura = document.getElementById("oldNomenclatura");
        if (oldClave) oldClave.innerText = "-";
        if (oldDireccion) oldDireccion.innerText = "-";
        if (oldNombre) oldNombre.innerText = "-";
        if (oldNomenclatura) oldNomenclatura.innerText = "-";

        // 4. Ocultar resultados de búsqueda
        const resDiv = document.getElementById("resultadosAdmin");
        if (resDiv) resDiv.style.display = "none";

        // 5. OCULTAR DATOS ACTUALES Y RESTAURAR TÍTULO (¡Nuevo!)
        const datosActualesDiv = document.getElementById("datosActualesDiv");
        if (datosActualesDiv) datosActualesDiv.style.display = "none";
        
        const tituloAccion = document.getElementById("tituloAccionFormulario");
        if (tituloAccion) tituloAccion.innerText = "Nueva oficina";
    }
};

// =========================================
// 7. LÓGICA DEL BUSCADOR FLOTANTE (ADMIN)
// =========================================
window.setupBuscadorAdmin = function() {
    const input = document.getElementById("buscadorRapidoAdmin");
    const resDiv = document.getElementById("resultadosAdmin");
    if (!input || !resDiv) return;

    // Clonamos para limpiar eventos viejos
    const nuevoInput = input.cloneNode(true);
    input.parentNode.replaceChild(nuevoInput, input);

    nuevoInput.addEventListener("input", () => {
        const query = nuevoInput.value.toLowerCase().trim();
        if (!query) {
            resDiv.style.display = "none";
            return;
        }

        const coincidencias = oficinas.filter(of => 
            of.clave.includes(query) || 
            of.nombre.toLowerCase().includes(query)
        ).sort((a, b) => parseInt(a.clave) - parseInt(b.clave)).slice(0, 10);

        if (coincidencias.length > 0) {
            resDiv.style.display = "block";
            resDiv.innerHTML = coincidencias.map(of => `
                <div class="opcion-admin" 
                     onclick="window.seleccionarOficinaAdmin('${of.clave}')"
                     style="padding: 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); transition: 0.2s;">
                    <span style="color: var(--accent); font-weight: bold;">${of.clave}</span> - ${of.nombre}
                </div>
            `).join("");
        } else {
            resDiv.innerHTML = '<div style="padding:12px; opacity:0.6;">Sin resultados</div>';
            resDiv.style.display = "block";
        }
    });
};

window.seleccionarOficinaAdmin = function(clave) {
    window.cargarOficinaAlFormulario(clave);
    // Limpiamos el buscador tras elegir
    const resDiv = document.getElementById("resultadosAdmin");
    const input = document.getElementById("buscadorRapidoAdmin");
    if (input) input.value = "";
    if (resDiv) resDiv.style.display = "none";
};

window.xlsxOriginal = descargarArchivoOriginal;
// =====================================================================
// 8. MODAL DE ADMINISTRACIÓN DE DIRECCIONES — MEJORADO
// =====================================================================

// ── Renderizar lista de tags con conteo de oficinas ─────────────────
function renderizarListaDirecciones() {
  const dirs = getDireccionesActuales();
  const contenedor = document.getElementById("listaDireccionesAdmin");
  const count = document.getElementById("countDirecciones");
  if (!contenedor) return;
  count.textContent = dirs.length;

  // ── Un solo recorrido para contar todas las oficinas por dirección ──
  const conteo = {};
  oficinas.forEach(o => {
    if (o.direccion) conteo[o.direccion] = (conteo[o.direccion] || 0) + 1;
  });

  // ── Construir con fragment — sin tocar el DOM hasta el final ────────
  const fragment = document.createDocumentFragment();
  dirs.forEach(d => {
    const uso = conteo[d] || 0;
    const span = document.createElement("span");
    span.className = "dir-tag";
    span.title = `${uso} oficina(s) — clic para seleccionar`;
    span.addEventListener("click", () => seleccionarDireccionDesdeTag(d));
    span.textContent = d;
    if (uso > 0) {
      const badge = document.createElement("span");
      badge.className = "dir-tag-count";
      badge.textContent = uso;
      span.appendChild(badge);
    }
    fragment.appendChild(span);
  });

  contenedor.innerHTML = "";
  contenedor.appendChild(fragment);

  const buscador = document.getElementById("buscadorListaDir");
  if (buscador && buscador.value.trim()) filtrarListaDirecciones(buscador.value);
}

// ── Clic en un tag → autoselecciona en el select activo ─────────────
window.seleccionarDireccionDesdeTag = function(dir) {
  const panelEditar   = document.getElementById("panelEditarDir");
  const panelEliminar = document.getElementById("panelEliminarDir");

  if (panelEditar && panelEditar.style.display !== "none") {
    const sel = document.getElementById("selectEditarDir");
    if (sel) { sel.value = dir; sel.dispatchEvent(new Event("change")); }
  } else if (panelEliminar && panelEliminar.style.display !== "none") {
    const sel = document.getElementById("selectEliminarDir");
    if (sel) { sel.value = dir; sel.dispatchEvent(new Event("change")); }
  } else {
    const inp = document.getElementById("inputNuevaDireccion");
    if (inp && !inp.value) { inp.value = dir; inp.focus(); inp.select(); }
  }
};

// ── Filtrar la lista inferior ────────────────────────────────────────
window.filtrarListaDirecciones = function(texto) {
  const tags = document.querySelectorAll("#listaDireccionesAdmin .dir-tag");
  const noResult = document.getElementById("noResultsDir");
  const busq = texto.trim().toLowerCase();
  let visibles = 0;
  tags.forEach(tag => {
    const match = !busq || tag.textContent.trim().toLowerCase().includes(busq);
    tag.classList.toggle("dir-tag-hidden", !match);
    if (match) visibles++;
  });
  if (noResult) noResult.style.display = visibles === 0 ? "block" : "none";
};

function llenarSelectDirecciones(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const dirs = getDireccionesActuales();
  const valorPrevio = sel.value;

  // ── Construir con fragment — una sola escritura al DOM ──────────────
  const fragment = document.createDocumentFragment();
  const def = document.createElement("option");
  def.value = ""; def.textContent = "-- Selecciona una dirección --";
  fragment.appendChild(def);

  dirs.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    fragment.appendChild(opt);
  });

  sel.innerHTML = "";
  sel.appendChild(fragment);
  if (valorPrevio && dirs.includes(valorPrevio)) sel.value = valorPrevio;
}

function refrescarModalDirecciones() {
  renderizarListaDirecciones();
  llenarSelectDirecciones("selectEditarDir");
  llenarSelectDirecciones("selectEliminarDir");
}

// ── Reset completo al cerrar ─────────────────────────────────────────
function _resetearModalDirecciones() {
  ["inputNuevaDireccion", "inputEditarDireccion"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ""; el.classList.remove("input-ok", "input-error"); }
  });
  ["selectEditarDir", "selectEliminarDir"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
    window.refreshCustomSelect?.(id);
  });
  const vA = document.getElementById("validacionAgregar");
  if (vA) { vA.textContent = "Se guardará en mayúsculas automáticamente."; vA.className = "modal-dir-validation v-hint"; }
  const vE = document.getElementById("validacionEditar");
  if (vE) { vE.textContent = ""; vE.className = "modal-dir-validation"; }
  const infoEdit = document.getElementById("infoOficinasDireccion");
  if (infoEdit) { infoEdit.style.display = "none"; infoEdit.innerHTML = ""; }
  const warn = document.getElementById("warningEliminar");
  if (warn) { warn.style.display = "none"; warn.innerHTML = ""; }
  const infoElim = document.getElementById("infoOficinasDireccionEliminar");
  if (infoElim) { infoElim.style.display = "none"; infoElim.innerHTML = ""; }
  const btnElim = document.getElementById("btnEliminarDir");
  if (btnElim) { btnElim.innerHTML = "🗑️ Eliminar Dirección"; btnElim.disabled = false; }
  const buscador = document.getElementById("buscadorListaDir");
  if (buscador) buscador.value = "";
  filtrarListaDirecciones("");
}

// ── Validación en tiempo real — Agregar ─────────────────────────────
function configurarValidacionAgregar() {
  const inp = document.getElementById("inputNuevaDireccion");
  const msg = document.getElementById("validacionAgregar");
  if (!inp || !msg) return;
  inp.oninput = () => {
    const val = inp.value.trim().toUpperCase();
    inp.classList.remove("input-error", "input-ok");
    msg.className = "modal-dir-validation";
    if (!val) {
      msg.textContent = "Se guardará en mayúsculas automáticamente.";
      msg.classList.add("v-hint"); return;
    }
    const yaExiste = getDireccionesActuales().some(d => d.toUpperCase() === val);
    if (yaExiste) {
      inp.classList.add("input-error");
      msg.textContent = "⚠️ Esta dirección ya existe en el catálogo.";
      msg.classList.add("v-error");
    } else {
      inp.classList.add("input-ok");
      msg.textContent = "✅ Nombre disponible";
      msg.classList.add("v-ok");
    }
  };
  inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); accionAgregarDireccion(); } };
}

// ── Validación en tiempo real — Editar ──────────────────────────────
function configurarValidacionEditar() {
  const inp = document.getElementById("inputEditarDireccion");
  const msg = document.getElementById("validacionEditar");
  const sel = document.getElementById("selectEditarDir");
  if (!inp || !msg) return;
  inp.oninput = () => {
    const val = inp.value.trim().toUpperCase();
    const original = sel ? sel.value.toUpperCase() : "";
    inp.classList.remove("input-error", "input-ok");
    msg.className = "modal-dir-validation";
    if (!val) { msg.textContent = ""; return; }
    if (val === original) {
      inp.classList.add("input-error");
      msg.textContent = "⚠️ Es el mismo nombre actual.";
      msg.classList.add("v-error"); return;
    }
    const yaExiste = getDireccionesActuales().some(d => d.toUpperCase() === val);
    if (yaExiste) {
      inp.classList.add("input-error");
      msg.textContent = "⚠️ Ya existe una dirección con ese nombre.";
      msg.classList.add("v-error");
    } else {
      inp.classList.add("input-ok");
      msg.textContent = "✅ Nuevo nombre disponible";
      msg.classList.add("v-ok");
    }
  };
  inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); accionEditarDireccion(); } };
}

// ── Abrir / Cerrar ───────────────────────────────────────────────────
window.toggleModalDirecciones = function() {
  const modal = document.getElementById("modalDirecciones");
  if (modal.style.display === "none" || modal.style.display === "") {
    modal.style.display = "flex";
    refrescarModalDirecciones();
    cambiarTabDir("agregar");
    document.addEventListener("keydown", _escapeModalDir);

    // Inicializar custom selects del modal (si no existen aún)
    if (!window._customSelects?.["selectEditarDir"]) {
      const _dirSub = (val) => {
        if (!val) return null;
        const n = oficinas.filter(o => o.direccion === val).length;
        return n > 0 ? `${n} oficina${n !== 1 ? "s" : ""} asignadas` : "Sin oficinas asignadas";
      };
      window.initCustomSelect("selectEditarDir",   { subtext: _dirSub });
      window.initCustomSelect("selectEliminarDir", { subtext: _dirSub });
    }

    const selEdit = document.getElementById("selectEditarDir");
    if (selEdit) {
      selEdit.onchange = () => {
        const inp  = document.getElementById("inputEditarDireccion");
        const info = document.getElementById("infoOficinasDireccion");
        const msg  = document.getElementById("validacionEditar");
        if (inp)  { inp.value = selEdit.value; inp.classList.remove("input-error","input-ok"); }
        if (msg)    msg.textContent = "";
        if (!selEdit.value) { if (info) info.style.display = "none"; return; }
        const enUso = oficinas.filter(o => o.direccion === selEdit.value);
        if (info) {
          info.style.display = "block";
          info.style.borderColor = enUso.length > 0 ? "#f39c12" : "#28c76f";
          info.innerHTML = enUso.length > 0
            ? `🏢 <strong>${enUso.length} oficina(s)</strong> serán renombradas automáticamente.`
            : `✅ Sin oficinas asignadas — solo se actualizará el catálogo.`;
        }
      };
    }
    configurarValidacionAgregar();
    configurarValidacionEditar();
  } else {
    _cerrarModalDir();
  }
};

function _escapeModalDir(e) { if (e.key === "Escape") _cerrarModalDir(); }

function _cerrarModalDir() {
  const modal = document.getElementById("modalDirecciones");
  if (modal) modal.style.display = "none";
  document.removeEventListener("keydown", _escapeModalDir);
  _resetearModalDirecciones();
}

// ── Tabs ─────────────────────────────────────────────────────────────
window.cambiarTabDir = function(tab) {
  ["agregar", "editar", "eliminar"].forEach(t => {
    const panel = document.getElementById(`panel${t.charAt(0).toUpperCase()+t.slice(1)}Dir`);
    const btn   = document.getElementById(`tab${t.charAt(0).toUpperCase()+t.slice(1)}Dir`);
    if (panel) panel.style.display = t === tab ? "block" : "none";
    if (btn)   btn.classList.toggle("active", t === tab);
  });
  requestAnimationFrame(() => {
    if (tab === "agregar") {
      const inp = document.getElementById("inputNuevaDireccion");
      if (inp) { inp.focus(); configurarValidacionAgregar(); }
    } else if (tab === "editar") {
      document.getElementById("selectEditarDir")?.focus();
      configurarValidacionEditar();
    } else {
      document.getElementById("selectEliminarDir")?.focus();
    }
  });
};

// ── Acción Agregar ───────────────────────────────────────────────────
window.accionAgregarDireccion = async function() {
  const inp = document.getElementById("inputNuevaDireccion");
  const nombre = inp?.value?.trim();
  if (!nombre) {
    window.mostrarAviso("Campo vacío", "Escribe el nombre de la nueva dirección.", "advertencia");
    return;
  }
  const confirma = await window.mostrarConfirmacionCustom(`
    <p>¿Confirmas agregar la nueva dirección?</p>
    <div style="background:rgba(255,255,255,0.07); padding:12px; border-radius:8px; margin-top:12px; border-left:4px solid #28c76f;">
      <strong>${nombre.toUpperCase()}</strong>
    </div>
  `);
  if (!confirma) return;

  const btn = document.querySelector("#panelAgregarDir .modal-dir-action-btn");
  btn.disabled = true; btn.innerHTML = "⏳ Guardando...";
  try {
    await agregarDireccion(nombre);
    inp.value = ""; inp.classList.remove("input-ok","input-error");
    const msg = document.getElementById("validacionAgregar");
    if (msg) { msg.textContent = "Se guardará en mayúsculas automáticamente."; msg.className = "modal-dir-validation v-hint"; }
    refrescarModalDirecciones();
    cargarSelectDirecciones();
    window.mostrarAviso("¡Dirección Agregada!", `La dirección <b>${nombre.toUpperCase()}</b> fue guardada exitosamente.`, "exito");
  } catch (e) {
    window.mostrarAviso("Error", e.message, "error");
  } finally {
    btn.disabled = false; btn.innerHTML = "💾 Guardar Nueva Dirección";
  }
};

// ── Acción Editar ────────────────────────────────────────────────────
window.accionEditarDireccion = async function() {
  const selVal     = document.getElementById("selectEditarDir")?.value;
  const nuevoNombre = document.getElementById("inputEditarDireccion")?.value?.trim();
  if (!selVal)     { window.mostrarAviso("Sin selección", "Elige la dirección a editar.", "advertencia"); return; }
  if (!nuevoNombre){ window.mostrarAviso("Campo vacío",   "Escribe el nuevo nombre.", "advertencia"); return; }

  const enUso = oficinas.filter(o => o.direccion === selVal);
  const filaOficinas = enUso.length > 0
    ? `<div style="background:rgba(255,165,0,0.1); border:1px solid rgba(255,165,0,0.4); border-radius:8px; padding:10px 12px; margin-top:10px; font-size:0.85rem;">
        <strong>⚡ ${enUso.length} oficina(s) serán actualizadas automáticamente</strong><br>
        <span style="opacity:0.7;">${enUso.slice(0,6).map(o=>o.clave).join(", ")}${enUso.length > 6 ? ` y ${enUso.length-6} más...` : ""}</span>
       </div>`
    : `<p style="margin-top:10px; font-size:0.83rem; opacity:0.6;">✅ Sin oficinas asignadas a esta dirección.</p>`;

  const confirma = await window.mostrarConfirmacionCustom(`
    <p style="color:var(--accent); font-weight:bold;">✏️ Renombrar Dirección</p>
    <div style="background:rgba(255,255,255,0.07); padding:10px; border-radius:8px; margin:10px 0;">
      <small>Nombre actual:</small><br><strong>${selVal}</strong>
    </div>
    <div style="background:rgba(255,255,255,0.07); padding:10px; border-radius:8px;">
      <small>Nuevo nombre:</small><br><strong>${nuevoNombre.toUpperCase()}</strong>
    </div>
    ${filaOficinas}
  `);
  if (!confirma) return;

  const btn = document.querySelector("#panelEditarDir .modal-dir-action-btn");
  btn.disabled = true;
  btn.innerHTML = enUso.length > 0 ? `⏳ Actualizando ${enUso.length} oficinas...` : "⏳ Guardando...";

  try {
    const resultado = await editarDireccion(selVal, nuevoNombre);
    refrescarModalDirecciones();
    cargarSelectDirecciones();
    const msg = document.getElementById("validacionEditar");
    if (msg) { msg.textContent = ""; msg.className = "modal-dir-validation"; }
    document.getElementById("inputEditarDireccion")?.classList.remove("input-ok","input-error");
    const infoBox = document.getElementById("infoOficinasDireccion");
    if (infoBox) infoBox.style.display = "none";
    const msgExtra = resultado.oficinasActualizadas > 0
      ? `<br><span style="font-size:0.85rem; opacity:0.8;">✅ ${resultado.oficinasActualizadas} oficina(s) actualizadas en el Excel.</span>` : "";
    window.mostrarAviso("¡Dirección Actualizada!", `Renombrada a <b>${nuevoNombre.toUpperCase()}</b>.${msgExtra}`, "exito");
  } catch (e) {
    window.mostrarAviso("Error", e.message, "error");
  } finally {
    btn.disabled = false; btn.innerHTML = "✏️ Guardar Cambio de Nombre";
  }
};

window.renderPanelEliminar = function(dir) {
  const warn         = document.getElementById("warningEliminar");
  const info         = document.getElementById("infoOficinasDireccionEliminar");
  const btnEliminar  = document.getElementById("btnEliminarDir");

  if (!dir) {
    warn.style.display = "none";
    info.style.display = "none";
    if (btnEliminar) { btnEliminar.innerHTML = "🗑️ Eliminar Dirección"; btnEliminar.disabled = false; }
    return;
  }

  const enUso = oficinas.filter(o => o.direccion === dir);

  if (enUso.length === 0) {
    warn.style.display = "none";
    info.style.display = "block";
    info.innerHTML = `<span style="color:#28c76f; font-weight:600;">✅ Sin oficinas asignadas — se puede eliminar directamente.</span>`;
    if (btnEliminar) { btnEliminar.innerHTML = "🗑️ Eliminar Dirección"; btnEliminar.disabled = false; }
    return;
  }

  // Hay oficinas — mostrar tabla + selector de reasignación
  warn.style.display = "block";
  info.style.display = "block";

  const otrasDir = getDireccionesActuales().filter(d => d !== dir);
  const opcionesDir = otrasDir.map(d => `<option value="${d}">${d}</option>`).join("");

  const filasTabla = enUso.map(o => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
      <td style="padding:6px 10px; font-weight:700; color:var(--accent);">${o.clave}</td>
      <td style="padding:6px 10px;">${o.nombre}</td>
      <td style="padding:6px 10px; opacity:0.7; font-size:0.8rem;">${o.nomenclatura}</td>
    </tr>`).join("");

  info.innerHTML = `
    <div style="margin-bottom:14px;">
      <strong style="color:#ff9f43;">⚠️ ${enUso.length} oficina(s) tienen esta dirección asignada.</strong>
      <p style="font-size:0.82rem; opacity:0.7; margin-top:4px;">Selecciona la dirección a la que se reasignarán antes de eliminar.</p>
    </div>

    <div style="max-height:180px; overflow-y:auto; border:1px solid var(--glass-border); border-radius:10px; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead>
          <tr style="background:rgba(255,255,255,0.07); text-align:left;">
            <th style="padding:7px 10px;">Clave</th>
            <th style="padding:7px 10px;">Nombre</th>
            <th style="padding:7px 10px;">Nomenclatura</th>
          </tr>
        </thead>
        <tbody>${filasTabla}</tbody>
      </table>
    </div>

    <label style="display:block; font-weight:700; margin-bottom:7px; font-size:0.88rem;">
      🔀 Reasignar estas oficinas a:
    </label>
    <select id="selectReasignarDir"
      style="width:100%; padding:11px; background:rgba(0,0,0,0.25); color:inherit;
             border:1px solid var(--accent); border-radius:10px; outline:none;
             font-family:inherit; font-size:0.9rem;">
      <option value="">-- Selecciona la dirección destino --</option>
      ${opcionesDir}
    </select>
  `;

  if (btnEliminar) { btnEliminar.innerHTML = "🔀 Reasignar y Eliminar"; btnEliminar.disabled = false; }
};

window.accionEliminarDireccion = async function() {
  const selVal = document.getElementById("selectEliminarDir")?.value;
  if (!selVal) { window.mostrarAviso("Sin selección", "Elige la dirección a eliminar.", "advertencia"); return; }

  const enUso = oficinas.filter(o => o.direccion === selVal);
  const btn   = document.getElementById("btnEliminarDir");

  // ── Caso A: sin oficinas — eliminar directo ──────────────────────────────
  if (enUso.length === 0) {
    const confirma = await window.mostrarConfirmacionCustom(`
      <p style="color:#ea5455; font-weight:bold;">🗑️ Eliminar Dirección</p>
      <div style="background:rgba(234,84,85,0.1); padding:12px; border-radius:8px; margin:10px 0; border-left:4px solid #ea5455;">
        <strong>${selVal}</strong>
      </div>
      <p style="margin-top:10px; font-size:0.9rem;">Sin oficinas asignadas. ¿Confirmas la eliminación?</p>
    `);
    if (!confirma) return;

    btn.disabled = true; btn.innerHTML = "⏳ Eliminando...";
    try {
      await eliminarDireccion(selVal);
      refrescarModalDirecciones();
      cargarSelectDirecciones();
      window.mostrarAviso("¡Dirección Eliminada!", `La dirección fue removida del catálogo.`, "exito");
    } catch (e) {
      window.mostrarAviso("Error", e.message, "error");
    } finally {
      btn.disabled = false; btn.innerHTML = "🗑️ Eliminar Dirección";
    }
    return;
  }

  // ── Caso B: con oficinas — requiere reasignación ─────────────────────────
  const destino = document.getElementById("selectReasignarDir")?.value;
  if (!destino) {
    window.mostrarAviso("Selecciona destino", "Elige la dirección a la que reasignarás las oficinas.", "advertencia");
    return;
  }

  const confirma = await window.mostrarConfirmacionCustom(`
    <p style="color:#ea5455; font-weight:bold;">🔀 Reasignar y Eliminar</p>
    <div style="display:grid; gap:8px; margin:12px 0;">
      <div style="background:rgba(234,84,85,0.1); padding:10px 14px; border-radius:8px; border-left:4px solid #ea5455;">
        <small>Dirección eliminada:</small><br><strong>${selVal}</strong>
      </div>
      <div style="background:rgba(40,199,111,0.1); padding:10px 14px; border-radius:8px; border-left:4px solid #28c76f;">
        <small>Nueva dirección para ${enUso.length} oficina(s):</small><br><strong>${destino}</strong>
      </div>
    </div>
    <p style="font-size:0.85rem; opacity:0.7;">Esta acción no se puede deshacer. ¿Confirmas?</p>
  `);
  if (!confirma) return;

  btn.disabled = true; btn.innerHTML = `⏳ Reasignando ${enUso.length} oficinas...`;
  try {
    // 1. Reasignar en Excel: mover oficinas al destino sin renombrar la lista
    await reasignarOficinas(selVal, destino);

    // 2. Ahora sí eliminar del catálogo de direcciones
    await eliminarDireccion(selVal);

    refrescarModalDirecciones();
    cargarSelectDirecciones();
    renderPanelEliminar("");
    document.getElementById("selectEliminarDir").value = "";

    window.mostrarAviso(
      "¡Listo!",
      `<b>${enUso.length} oficina(s)</b> reasignadas a <b>${destino}</b> y la dirección <b>${selVal}</b> fue eliminada.`,
      "exito"
    );
  } catch (e) {
    window.mostrarAviso("Error", e.message, "error");
  } finally {
    btn.disabled = false; btn.innerHTML = "🔀 Reasignar y Eliminar";
  }
};
