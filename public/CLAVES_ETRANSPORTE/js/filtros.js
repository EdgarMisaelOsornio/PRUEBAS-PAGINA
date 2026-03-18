import { oficinas } from "./dataStore.js"; 

// ============================
// CARGAR SELECT DE DIRECCIONES (EN AMBOS MENÚS)
// ============================
export function cargarSelectDirecciones() {
  // 1. Validamos que haya datos
  if (!oficinas || oficinas.length === 0) {
    console.warn("⚠️ Aún no hay oficinas cargadas o el array está vacío.");
    return;
  }

  // 2. Obtenemos las direcciones únicas
  const direccionesUnicas = [
    ...new Set(oficinas.map(o => o.direccion).filter(Boolean))
  ].sort();

  // 3. IDs de los select que queremos llenar
  const idsALlenar = ["filtroDireccion", "newDireccion"];

  idsALlenar.forEach(id => {
    const select = document.getElementById(id);
    
    if (select) {
      // Guardar valor actual (si ya seleccionaste algo)
      const valorPrevio = select.value;

      // Limpiar y poner opción base
      select.innerHTML = `<option value="">-- Selecciona una Dirección --</option>`;

      // Llenar opciones
      direccionesUnicas.forEach(dir => {
        const opt = document.createElement("option");
        opt.value = dir;
        opt.textContent = dir;
        select.appendChild(opt);
      });

      // Restaurar valor previo si existe
      if (valorPrevio && direccionesUnicas.includes(valorPrevio)) {
        select.value = valorPrevio;
      }
    }
  });
}

// =======================================
// AGREGAR OFICINAS SEGÚN LA DIRECCIÓN
// =======================================
export function agregarOficinasPorDireccion() {
  const direccion = document.getElementById("filtroDireccion").value;
  const textarea = document.getElementById("oficinas");
  const error = document.getElementById("errores");

  if (!direccion) {
    error.textContent = "⚠️ Selecciona una dirección primero.";
    setTimeout(() => (error.textContent = ""), 3000);
    return;
  }

  let lines = textarea.value
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const oficinasPorDireccion = oficinas
    .filter(o => o.direccion === direccion)
    .map(o => o.clave);

  let agregadas = 0;

  oficinasPorDireccion.forEach(clave => {
    if (!lines.includes(clave)) {
      lines.push(clave);
      agregadas++;
    }
  });

  textarea.value = lines.join("\n");

  if (agregadas > 0) {
      error.textContent = `🟢 Se agregaron ${agregadas} oficinas de "${direccion}".`;
  } else {
      error.textContent = `⚠️ Las oficinas ya estaban agregadas.`;
  }
  
  setTimeout(() => (error.textContent = ""), 4000);
}