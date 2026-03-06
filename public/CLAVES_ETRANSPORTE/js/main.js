import { cargarOficinas, agregarOficinaAlStore, oficinas } from "./dataStore.js"; 
import { iniciarBuscador } from "./buscador.js";
import { cargarSelectDirecciones, agregarOficinasPorDireccion } from "./filtros.js";
import { generar, prepararPoliticas } from "./generador.js";

import { descargarExcel, descargarWord, descargarArchivoOriginal } from "./exportaciones.js";

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
        modal.style.display = "block";

        btnSi.onclick = () => { modal.style.display = "none"; resolve(true); };
        btnNo.onclick = () => { modal.style.display = "none"; resolve(false); };
    });
};

// ==========================================
// 3. GUARDAR / ACTUALIZAR (REEMPLAZANDO ALERTS)
// ==========================================
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

    window.generar = generar;
    window.agregarOficinasPorDireccion = agregarOficinasPorDireccion;
    window.descargarExcel = descargarExcel;
    window.descargarWord = descargarWord;
    window.irAPoliticas = prepararPoliticas;
    window.guardarOficinaManual = guardarOficinaManual; 

    window.mostrarBuscadorCorreccion = function() {
        const modal = document.getElementById("modalCorreccion");
        if (modal) {
            modal.style.display = "block";
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
            document.getElementById("newClave").value = oficina.clave;
            document.getElementById("newNombre").value = oficina.nombre;
            document.getElementById("newNomenclatura").value = oficina.nomenclatura;
            document.getElementById("newDireccion").value = oficina.direccion;
            
            window.cerrarModal();
            document.getElementById("newNombre").focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // ✅ CAMBIO: Aviso de carga exitosa
            window.mostrarAviso("Modo Edición", `Datos de <b>${oficina.nombre}</b> cargados.`, "info");
        }
    };

    console.log("✅ Sistema vinculado con Modales Custom");
  } catch (error) {
    console.error("❌ Error inicial:", error);
    window.mostrarAviso("Error Crítico", "No se pudo cargar la base de oficinas.", "error");
  }
};

// ==========================================
// 5. SISTEMA DE AVISOS (TOAST MODAL)
// ==========================================
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

    modal.style.display = "block";
};

window.cerrarMensaje = function() {
    document.getElementById("modalMensaje").style.display = "none";
};


window.toggleFormulario = function() {
    const seccion = document.getElementById("secAgregarOficina");
    const btn = document.querySelector(".header-action-btn");    
    if (seccion.style.display === "none") {
        seccion.style.display = "block";
        seccion.style.animation = "fadeIn 0.5s ease";
        btn.innerHTML = "➖ Cerrar Formulario";
        btn.style.backgroundColor = "rgba(234, 84, 85, 0.8)"; 
        btn.style.borderColor = "rgba(234, 84, 85, 1)";
    } else {
        seccion.style.display = "none";
        btn.innerHTML = "➕ Agregar Oficina";
        btn.style.backgroundColor = ""; 
        btn.style.borderColor = "";
    }
};

// AÑADE ESTA LÍNEA AQUÍ:
window.xlsxOriginal = descargarArchivoOriginal;