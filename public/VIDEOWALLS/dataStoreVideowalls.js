// ==========================================
// DATA STORE PARA VIDEOWALLS (CONEXIÓN GITHUB)
// ==========================================

export let basePantallas = [];

export async function cargarPantallas() {
  console.log("🔄 Intentando cargar Excel de Videowalls...");

  // Esta ruta es correcta si el archivo está en public/VIDEOWALLS/VIDEOWALLS.xlsx
  const excelURL = `${window.location.origin}/VIDEOWALLS/VIDEOWALLS.xlsx`;

  try {
    // QUITAMOS el .href aquí:
    const response = await fetch(excelURL + `?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo Excel de Videowalls");
    }

    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet);

    basePantallas = raw.map(row => [
      String(row.CODIGO || "").trim().toUpperCase(),
      String(row.SALA || "").trim().toUpperCase(),
      String(row.PROVEEDOR || "").trim().toUpperCase()
    ]);

    console.log(`📊 Pantallas cargadas desde Excel: ${basePantallas.length}`);
    return true;
  } catch (error) {
    console.error("Error cargando pantallas:", error);
    return false;
  }
}

// ─── Función para guardar/actualizar (usando proxy seguro /api/github) ───
export async function agregarPantallaAlStore(nuevaPantalla) {
  try {
    const codigoNorm = nuevaPantalla.codigo.trim().toUpperCase();
    const FILE_PATH  = "public/VIDEOWALLS/VIDEOWALLS.xlsx";

    // 1. Obtener SHA y download_url via proxy (token seguro en el servidor)
    const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
    if (!metaRes.ok) throw new Error("No se pudo obtener metadatos del archivo de Videowalls");
    const { sha, download_url } = await metaRes.json();

    // 2. Descargar el Excel actual
    const excelRes    = await fetch(download_url);
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook    = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName   = workbook.SheetNames[0];
    let dataJSON      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 3. Buscar si el código ya existe
    const index = dataJSON.findIndex(p =>
      String(p.CODIGO || "").trim().toUpperCase() === codigoNorm
    );

    const nuevaFila = {
      CODIGO:    codigoNorm,
      SALA:      nuevaPantalla.sala.trim().toUpperCase(),
      PROVEEDOR: nuevaPantalla.proveedor.trim().toUpperCase()
    };

    const mensajeCommit = index !== -1
      ? `🔧 Corrección de pantalla/proveedor: ${codigoNorm}`
      : `✅ Añadida nueva pantalla: ${codigoNorm}`;

    if (index !== -1) dataJSON[index] = nuevaFila;
    else dataJSON.push(nuevaFila);

    // 4. Convertir de vuelta a Excel (base64)
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 5. Commit via proxy
    const commitRes = await fetch('/api/github', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: FILE_PATH, sha, content: outExcel, message: mensajeCommit })
    });

    if (commitRes.ok) return index !== -1 ? "actualizado" : "creado";
    return "error";

  } catch (error) {
    console.error("Error en sincronización de Videowalls:", error);
    return "error";
  }
}