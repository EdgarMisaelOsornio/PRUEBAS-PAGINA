// ==========================================
// DATA STORE PARA VIDEOWALLS (CONEXIÓN GITHUB)
// ==========================================

export let basePantallas = [];
export let baseProveedores = [];

// ──────────────────────────────────────────
// CARGA DE PANTALLAS (Excel)
// ──────────────────────────────────────────
export async function cargarPantallas() {
  console.log("🔄 Intentando cargar Excel de Videowalls...");

  const excelURL = `${window.location.origin}/VIDEOWALLS/VIDEOWALLS.xlsx`;

  try {
    const response = await fetch(excelURL + `?t=${Date.now()}`);
    if (!response.ok) throw new Error("No se pudo cargar el archivo Excel de Videowalls");

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

// ──────────────────────────────────────────
// CARGA DE PROVEEDORES (JSON)
// ──────────────────────────────────────────
export async function cargarProveedores() {
  try {
    const url = `${window.location.origin}/VIDEOWALLS/proveedores.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar proveedores.json");
    baseProveedores = await res.json();
    console.log(`📧 Proveedores cargados: ${baseProveedores.length}`);
    return true;
  } catch (error) {
    console.error("Error cargando proveedores:", error);
    return false;
  }
}

// ──────────────────────────────────────────
// GUARDAR PROVEEDORES EN GITHUB (via API route de Next.js — token seguro)
// ──────────────────────────────────────────
export async function guardarProveedoresAlStore(proveedoresActualizados) {
  try {
    const FILE_PATH = "public/VIDEOWALLS/proveedores.json";

    // 1. Obtener SHA del archivo actual
    const resGET = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
    const metadata = await resGET.json();
    if (!metadata.sha) throw new Error("No se pudo obtener el SHA de proveedores.json");

    // 2. Convertir JSON a base64
    const jsonStr = JSON.stringify(proveedoresActualizados, null, 2);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));

    // 3. Commit via API route (el token está seguro en el servidor)
    const resPUT = await fetch("/api/github", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: FILE_PATH,
        sha: metadata.sha,
        content: base64,
        message: "📧 Actualización de correos de proveedores"
      })
    });

    if (!resPUT.ok) throw new Error("Error al guardar en GitHub");

    baseProveedores = proveedoresActualizados;
    return true;
  } catch (error) {
    console.error("Error guardando proveedores:", error);
    return false;
  }
}

// ──────────────────────────────────────────
// GUARDAR / ACTUALIZAR PANTALLA EN GITHUB (Excel)
// ──────────────────────────────────────────
const FILE_PATH_XLSX = "public/VIDEOWALLS/VIDEOWALLS.xlsx";

export async function agregarPantallaAlStore(nuevaPantalla) {
  try {
    let codigoNorm = nuevaPantalla.codigo.trim().toUpperCase();

    // 1. Obtener SHA via API route
    const resGET = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH_XLSX)}`);
    const fileMetadata = await resGET.json();
    if (!fileMetadata.sha) throw new Error("No se pudo obtener el SHA del archivo de Videowalls");

    // 2. Descargar contenido actual del Excel
    const excelRes = await fetch(fileMetadata.download_url);
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 3. Convertir a JSON
    let dataJSON = XLSX.utils.sheet_to_json(worksheet);

    const index = dataJSON.findIndex(p => {
      let c = String(p.CODIGO || "").trim().toUpperCase();
      return c === codigoNorm;
    });

    let mensajeCommit = "";

    if (index !== -1) {
      dataJSON[index] = {
        CODIGO: codigoNorm,
        SALA: nuevaPantalla.sala.trim().toUpperCase(),
        PROVEEDOR: nuevaPantalla.proveedor.trim().toUpperCase()
      };
      mensajeCommit = `🔧 Corrección de pantalla/proveedor: ${codigoNorm}`;
    } else {
      dataJSON.push({
        CODIGO: codigoNorm,
        SALA: nuevaPantalla.sala.trim().toUpperCase(),
        PROVEEDOR: nuevaPantalla.proveedor.trim().toUpperCase()
      });
      mensajeCommit = `✅ Añadida nueva pantalla: ${codigoNorm}`;
    }

    // 4. Convertir de vuelta a Excel (base64)
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

    // 5. Commit via API route
    const resPUT = await fetch("/api/github", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: FILE_PATH_XLSX,
        sha: fileMetadata.sha,
        content: outExcel,
        message: mensajeCommit
      })
    });

    if (resPUT.ok) {
      return (index !== -1) ? "actualizado" : "creado";
    } else {
      return "error";
    }

  } catch (error) {
    console.error("Error en sincronización con GitHub:", error);
    return "error";
  }
}
