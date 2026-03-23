import { cargarOficinas, agregarOficinaAlStore, oficinas } from "./dataStore.js"; 
import { iniciarBuscador } from "./buscador.js";
import { cargarSelectDirecciones, agregarOficinasPorDireccion } from "./filtros.js";
import { generar, prepararPoliticas } from "./generador.js";

import { descargarExcel, descargarWord, descargarArchivoOriginal } from "./exportaciones.js";

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

    window.generar = generar;
    window.agregarOficinasPorDireccion = agregarOficinasPorDireccion;
    window.descargarExcel = descargarExcel;
    window.descargarWord = descargarWord;
    window.irAPoliticas = prepararPoliticas;
    window.guardarOficinaManual = guardarOficinaManual; 

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
        if (tituloAccion) tituloAccion.innerText = "✍️ Editando Oficina";
        
        // ✅ Aviso de carga con la comparativa lista
        window.mostrarAviso("Modo Edición", `Editando: <b>${oficina.nombre}</b>. <hr> Edita con cuidado las oficinas existentes.`, "info");
    }
};

    console.log("✅ Sistema listo");
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
        if (tituloAccion) tituloAccion.innerText = "✨ Alta de Nueva Oficina";
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
                     onclick="window.seleccionarOficinaAdmin('${escapeHtml(of.clave)}')"
                     style="padding: 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); transition: 0.2s;">
                    <span style="color: var(--accent); font-weight: bold;">${escapeHtml(of.clave)}</span> - ${escapeHtml(of.nombre)}
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