export let oficinas = [];

export async function cargarOficinas() {
  console.log("🔄 Intentando cargar Excel...");

  // Mantenemos la forma que SÍ te funciona para la ruta
  const excelURL = new URL(
    "../OFICINAS NOMENCLATURAS.xlsx",
    import.meta.url
  );

  try {
    // Agregamos el timestamp de forma que no rompa la URL original
    const response = await fetch(excelURL.href + `?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo Excel (fetch falló)");
    }

    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet);

    oficinas = raw.map(row => {
      const claveOriginal = String(row.CLAVE || "").trim().toUpperCase();
      return {
        clave: /^\d+$/.test(claveOriginal) ? claveOriginal.padStart(4, "0") : claveOriginal,
        nombre: row.NOMBRE?.toString().trim() ?? "",
        nomenclatura: row.NOMENCLATURA?.toString().trim() ?? "",
        direccion: row.DIRECCION?.toString().trim() ?? ""
      };
    });

    console.log(`📊 Oficinas cargadas: ${oficinas.length}`);
    return true;
  } catch (error) {
    console.error("Error cargando oficinas:", error);
    return false;
  }
}

// ─── Función para guardar (usando el proxy seguro /api/github) ───
export async function agregarOficinaAlStore(nuevaOficina) {
  try {
    let claveNorm = nuevaOficina.clave.trim().toUpperCase();
    if (/^\d+$/.test(claveNorm)) claveNorm = claveNorm.padStart(4, "0");

    const FILE_PATH = "public/CLAVES_ETRANSPORTE/OFICINAS NOMENCLATURAS.xlsx";

    // 1. Obtener SHA y download_url desde el proxy (el token vive en el servidor)
    const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
    if (!metaRes.ok) throw new Error("No se pudo obtener metadatos del archivo");
    const { sha, download_url } = await metaRes.json();

    // 2. Descargar el Excel actual
    const excelRes = await fetch(download_url);
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    let dataJSON = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 3. Buscar si la clave ya existe
    const index = dataJSON.findIndex(o => {
      let c = String(o.CLAVE || "").trim().toUpperCase();
      if (/^\d+$/.test(c)) c = c.padStart(4, "0");
      return c === claveNorm;
    });

    const nuevaFila = {
      CLAVE: claveNorm,
      NOMBRE: nuevaOficina.nombre.trim().toUpperCase(),
      NOMENCLATURA: nuevaOficina.nomenclatura.trim().toUpperCase(),
      DIRECCION: nuevaOficina.direccion.trim().toUpperCase()
    };

    const mensajeCommit = index !== -1
      ? `🔧 Corrección de oficina: ${nuevaOficina.nombre}`
      : `✅ Añadida oficina: ${nuevaOficina.nombre}`;

    if (index !== -1) dataJSON[index] = nuevaFila;
    else dataJSON.push(nuevaFila);

    // 4. Convertir de vuelta a Excel (base64)
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 5. Commit via proxy (el token nunca sale al navegador)
    const commitRes = await fetch('/api/github', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: FILE_PATH, sha, content: outExcel, message: mensajeCommit })
    });

    if (commitRes.ok) return index !== -1 ? "actualizado" : "creado";
    return "error";

  } catch (error) {
    console.error("Error en sincronización:", error);
    return "error";
  }
}