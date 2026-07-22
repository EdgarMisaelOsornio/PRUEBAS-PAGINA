import { obtenerResultados } from "./generador.js";
import { oficinas } from "./dataStore.js"; // IMPORTANTE: Traemos la base actualizada

// ============================
// DESCARGAR EXCEL (Resultados generados)
// ============================
export function descargarExcel() {
  const resultados = obtenerResultados();
  if (!resultados.length) {
    alert("Genera primero los datos");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(resultados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Oficinas");
  XLSX.writeFile(wb, "Oficinas.xlsx");
}

// ============================
// DESCARGAR WORD (Resultados generados)
// ============================
export function descargarWord() {
  const resultados = obtenerResultados();
  if (!resultados.length) {
    alert("Genera primero los datos");
    return;
  }

  let html = `
    <html>
    <body>
      <h2>Resultado de Oficinas</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>Puesto</th>
          <th>Oficina</th>
          <th>Nombre</th>
          <th>Nomenclatura</th>
          <th>Dirección</th>
          <th>Clave</th>
        </tr>
  `;

  resultados.forEach(r => {
    html += `
      <tr>
        <td>${r.Puesto}</td>
        <td>${r.Oficina}</td>
        <td>${r.Nombre}</td>
        <td>${r.Nomenclatura}</td>
        <td>${r.Dirección}</td>
        <td>${r.Clave}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/msword;charset=utf-8;" });
  saveAs(blob, "Oficinas.doc");
}

// ==========================================
// DESCARGAR BASE ORIGINAL ACTUALIZADA (NUEVO)
// ==========================================
export function descargarArchivoOriginal() {
  // 1. Verificamos que haya datos cargados
  if (!oficinas || oficinas.length === 0) {
    alert("No hay base de datos cargada en este momento.");
    return;
  }

  // 2. Damos formato a las columnas para que sean idénticas al archivo original
  const datosParaExcel = oficinas.map(oficina => ({
    "CLAVE": oficina.clave,
    "NOMBRE": oficina.nombre,
    "NOMENCLATURA": oficina.nomenclatura,
    "DIRECCION": oficina.direccion
  }));

  // 3. Convertimos los datos a una hoja de Excel
  const ws = XLSX.utils.json_to_sheet(datosParaExcel);
  const wb = XLSX.utils.book_new();
  
  // 4. Añadimos la hoja al archivo y le damos nombre
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  
  // 5. Descargamos el archivo construido al vuelo
  XLSX.writeFile(wb, "OFICINAS NOMENCLATURAS.xlsx");
}