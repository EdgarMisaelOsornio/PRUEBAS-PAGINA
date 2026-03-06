let pageCount = 0;

function fechaActual(){
  const meses = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
  ];
  const f = new Date();
  const diaFormateado = String(f.getDate()).padStart(2, '0');
  return `<b>Ciudad de México</b> a <b>${diaFormateado}</b> de <b>${meses[f.getMonth()]}</b> de <b>${f.getFullYear()}</b>`;
}

function $(id){
  return document.getElementById(id);
}

/* =========================
   FORMULARIO
   ========================= */

function renderTemplate(templateId, id) {
  let html = $(templateId).innerHTML;
  // Esto reemplaza todas las etiquetas {{id}} por el número de página real
  return html.replace(/{{id}}/g, id);
}
/* =========================
   FUNCIONES
   ========================= */
function addPage(prefill = null){
  pageCount++;
  const id = pageCount;

$("forms").insertAdjacentHTML("beforeend", renderTemplate('template-form-card', id));
  $("sheets").insertAdjacentHTML("beforeend", renderTemplate('template-sheet', id));

  $("in-sistema-"+id).value = prefill?.sistema ?? "E-TRANSPORTE";
  $("in-solicitante-"+id).value = prefill?.solicitante ?? "";
  $("in-ticket-"+id).value = prefill?.ticket ?? "";
  $("in-nombre-"+id).value = prefill?.nombre ?? "";
  $("in-usuario-"+id).value = prefill?.usuario ?? "";
  $("in-usuario-comision-"+id).value = prefill?.usuarioComision ?? "";
  $("in-usuario-citas-"+id).value = prefill?.usuarioCitas ?? "";
  $("in-usuario-comision-gn-"+id).value = prefill?.usuarioComisionGN ?? "";
  
  // Rellenar las nuevas contraseñas si existen (al duplicar)
  $("in-pass-comision-"+id).value = prefill?.passComision ?? "";
  $("in-pass-citas-"+id).value = prefill?.passCitas ?? "";
  $("in-pass-comision-gn-"+id).value = prefill?.passGN ?? "";
  
  $("in-contrasena-"+id).value = prefill?.contrasena ?? "";

  syncPage(id);
}

function syncPage(id){
  const sistema = $("in-sistema-"+id)?.value || "E-TRANSPORTE";
  const mismaPass = $("check-misma-pass-"+id)?.checked;

  const nombre = $("in-nombre-"+id)?.value ?? "";
  const usuarioNormal = $("in-usuario-"+id)?.value ?? "";
  const usuarioComision = $("in-usuario-comision-"+id)?.value ?? "";
  const usuarioCitas = $("in-usuario-citas-"+id)?.value ?? "";
  const usuarioComisionGN = $("in-usuario-comision-gn-"+id)?.value ?? "";
  
  const passGeneral = $("in-contrasena-"+id)?.value ?? "";
  const passComision = mismaPass ? passGeneral : ($("in-pass-comision-"+id)?.value ?? "");
  const passCitas = mismaPass ? passGeneral : ($("in-pass-citas-"+id)?.value ?? "");
  const passGN = mismaPass ? passGeneral : ($("in-pass-comision-gn-"+id)?.value ?? "");

  // Sincronización básica de la hoja
  $("out-solicitante-"+id).textContent = $("in-solicitante-"+id)?.value ?? "";
  $("out-ticket-"+id).textContent = $("in-ticket-"+id)?.value ?? "";
  $("out-sistema-"+id).textContent = sistema;
  $("out-fecha-"+id).innerHTML = fechaActual();
  document.querySelectorAll(`#sheet-${id} .out-nombre`).forEach(el => el.textContent = nombre);

  if(sistema === "CUENTAS CORPORATIVAS") {
    $("usuarios-corporativos-"+id).style.display = "block";
    $("usuario-normal-"+id).style.display = "none";
    $("normal-table-"+id).style.display = "none";
    $("cuentas-table-"+id).style.display = "table";
    
    if(mismaPass) {
      // Muestra el campo general, oculta los individuales
      $("wrapper-pass-com-"+id).style.display = "none";
      $("wrapper-pass-citas-"+id).style.display = "none";
      $("wrapper-pass-gn-"+id).style.display = "none";
      $("wrapper-pass-general-"+id).style.display = "block"; 
      $("label-pass-type-"+id).textContent = "(Misma para las 3)";
    } else {
      // Oculta el campo general, muestra los 3 individuales
      $("wrapper-pass-com-"+id).style.display = "block";
      $("wrapper-pass-citas-"+id).style.display = "block";
      $("wrapper-pass-gn-"+id).style.display = "block";
      $("wrapper-pass-general-"+id).style.display = "none"; // ESTO CORRIGE TU PROBLEMA
    }

    // Sincronizar tabla de la hoja
    document.querySelector(`#sheet-${id} .out-usuario-comision`).textContent = usuarioComision;
    document.querySelector(`#sheet-${id} .out-usuario-citas`).textContent = usuarioCitas;
    document.querySelector(`#sheet-${id} .out-usuario-comision-gn`).textContent = usuarioComisionGN;
    
    const tablaCorpRows = document.querySelectorAll(`#cuentas-table-${id} tbody tr`);
    tablaCorpRows[0].querySelector("td:nth-child(4)").textContent = passComision;
    tablaCorpRows[1].querySelector("td:nth-child(4)").textContent = passCitas;
    tablaCorpRows[2].querySelector("td:nth-child(4)").textContent = passGN;

  } else {
    // Modo para sistemas normales
    $("usuarios-corporativos-"+id).style.display = "none";
    $("usuario-normal-"+id).style.display = "block";
    $("normal-table-"+id).style.display = "table";
    $("cuentas-table-"+id).style.display = "none";
    $("wrapper-pass-general-"+id).style.display = "block"; // Siempre visible en sistemas normales
    $("label-pass-type-"+id).textContent = "";

    document.querySelectorAll(`#sheet-${id} .out-usuario`).forEach(el => el.textContent = usuarioNormal);
    document.querySelectorAll(`#sheet-${id} .out-contrasena`).forEach(el => el.textContent = passGeneral);
  }
}

function removePage(id){
  $("card-"+id)?.remove();
  $("sheet-"+id)?.remove();
}

function duplicatePage(id){
  addPage({
    solicitante: $("in-solicitante-"+id)?.value,
    ticket: $("in-ticket-"+id)?.value,
    sistema: $("in-sistema-"+id)?.value,
    nombre: $("in-nombre-"+id)?.value,
    usuario: $("in-usuario-"+id)?.value,
    usuarioComision: $("in-usuario-comision-"+id)?.value,
    usuarioCitas: $("in-usuario-citas-"+id)?.value,
    usuarioComisionGN: $("in-usuario-comision-gn-"+id)?.value,
    // Nuevos campos de contraseña individual
    passComision: $("in-pass-comision-"+id)?.value,
    passCitas: $("in-pass-citas-"+id)?.value,
    passGN: $("in-pass-comision-gn-"+id)?.value,
    contrasena: $("in-contrasena-"+id)?.value
  });
}

function clearAll(){
  document.querySelectorAll(".forms input").forEach(i => i.value = "");
  document.querySelectorAll(".forms select").forEach(s => s.value = "E-TRANSPORTE");
  for(let id=1; id<=pageCount; id++){
    if($("sheet-"+id)) syncPage(id);
  }
}

function printDoc(){
  // Sincroniza todas las hojas existentes
  for(let id=1; id<=pageCount; id++){
    if($("sheet-"+id)) syncPage(id);
  }

  // 🔑 buscar la PRIMER hoja que exista
  let firstValidId = null;
  for(let id=1; id<=pageCount; id++){
    if($("sheet-"+id)){
      firstValidId = id;
      break;
    }
  }

  if(!firstValidId){
    alert("No hay hojas para imprimir");
    return;
  }

  const sistema = $("in-sistema-"+firstValidId)?.value || "SISTEMA";
  const usuario = $("in-nombre-"+firstValidId)?.value || "NOMBRE";
  const ticket = $("in-ticket-"+firstValidId)?.value || "TICKET";

  const safe = str => str.replace(/[\\/:*?"<>|]/g, "").trim();
  document.title = `${safe(sistema)} ${safe(usuario)} Ticket#${safe(ticket)}`;

  window.print();
}

/* Inicial */
addPage();

function toggleTheme() {
  const body = document.body;
  // Usamos 'themeBtn' que es el ID que tienes en el HTML
  const btn = document.getElementById('themeBtn'); 
  
  body.classList.toggle('dark-mode');
  
  if (body.classList.contains('dark-mode')) {
    btn.innerText = "☀️"; // Cambiado a emoji para seguir tu estilo
    localStorage.setItem('politicas-theme', 'dark'); // Llave única
  } else {
    btn.innerText = "🌙"; // Cambiado a emoji
    localStorage.setItem('politicas-theme', 'light'); // Llave única
  }
}

// Cargar el tema al abrir la página
window.addEventListener('load', () => {
  if (localStorage.getItem('politicas-theme') === 'dark') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('themeBtn');
    if(btn) btn.innerText = "☀️";
  }
});

function toggleCorpRow(id, type, show) {
  const rowInput = $(`row-input-${type}-${id}`);
  const btnAdd = $(`btn-add-${type}-${id}`);
  const sheetRow = $(`sheet-row-${type}-${id}`);

  if (show) {
    rowInput.style.display = "block";
    btnAdd.style.display = "none";
    if (sheetRow) sheetRow.style.display = "table-row";
  } else {
    rowInput.style.display = "none";
    btnAdd.style.display = "block";
    if (sheetRow) sheetRow.style.display = "none";
    
    // Limpiamos los inputs al quitar la fila para que no se filtren datos
    $(`in-usuario-${type === 'gn' ? 'comision-gn' : (type === 'comision' ? 'comision' : 'citas')}-${id}`).value = "";
  }
  syncPage(id);
}

window.addEventListener('load', () => {
    const claveRecibida = localStorage.getItem('transfer_clave');

    if (claveRecibida) {
        const id = 1;
        const inputUsuario = document.getElementById(`in-usuario-${id}`);
        const inputContrasena = document.getElementById(`in-contrasena-${id}`);

        if (inputUsuario && inputContrasena) {
            inputUsuario.value = claveRecibida;
            inputContrasena.value = claveRecibida;
            syncPage(id);

            console.log("✅ Datos pegados en el formato existente correctamente.");
        } else {
            addPage({
                sistema: "E-TRANSPORTE",
                usuario: claveRecibida,
                contrasena: claveRecibida
            });
        }
        localStorage.removeItem('transfer_clave');
    }
});
