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

// Configuración de GitHub (Usando tus credenciales actuales)
// ⚠️ NOTA DE SEGURIDAD: Te recomiendo en el futuro generar un token nuevo, ya que este quedó expuesto en el chat.
const GITHUB_TOKEN = "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";
const REPO_OWNER = "EdgarMisaelOsornio";
const REPO_NAME = "SERVICE-DESK-";

// ⚠️ IMPORTANTE: Ajusta esta ruta a la ubicación exacta de VIDEOWALLS.xlsx en tu repositorio
const FILE_PATH = "public/VIDEOWALLS/VIDEOWALLS.xlsx";

// Función para guardar/actualizar en GitHub
export async function agregarPantallaAlStore(nuevaPantalla) {
  try {
    let codigoNorm = nuevaPantalla.codigo.trim().toUpperCase();

    // 1. Obtener metadatos de GitHub (SHA)
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const resMetadata = await fetch(url, {
      headers: { "Authorization": `token ${GITHUB_TOKEN}` }
    });
    
    const fileMetadata = await resMetadata.json();
    if (!fileMetadata.sha) throw new Error("No se pudo obtener el SHA del archivo de Videowalls");

    // 2. Descargar contenido actual del Excel
    const excelRes = await fetch(fileMetadata.download_url);
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 3. Convertir a JSON para manipular los datos
    let dataJSON = XLSX.utils.sheet_to_json(worksheet);

    // 🔍 BUSCAR SI EL CÓDIGO YA EXISTE EN EL EXCEL
    const index = dataJSON.findIndex(p => {
        let c = String(p.CODIGO || "").trim().toUpperCase();
        return c === codigoNorm;
    });

    let mensajeCommit = "";

    if (index !== -1) {
      // 📝 SI EXISTE: Actualizamos esa fila (CORRECCIÓN / CAMBIO DE PROVEEDOR)
      dataJSON[index] = {
        CODIGO: codigoNorm,
        SALA: nuevaPantalla.sala.trim().toUpperCase(),
        PROVEEDOR: nuevaPantalla.proveedor.trim().toUpperCase()
      };
      mensajeCommit = `🔧 Corrección de pantalla/proveedor: ${codigoNorm}`;
    } else {
      // ✨ SI NO EXISTE: La agregamos al final (NUEVA PANTALLA)
      dataJSON.push({
        CODIGO: codigoNorm,
        SALA: nuevaPantalla.sala.trim().toUpperCase(),
        PROVEEDOR: nuevaPantalla.proveedor.trim().toUpperCase()
      });
      mensajeCommit = `✅ Añadida nueva pantalla: ${codigoNorm}`;
    }

    // 4. Convertir de vuelta a Excel
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 5. Enviar el Commit a GitHub
    const commitRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: mensajeCommit,
        content: outExcel,
        sha: fileMetadata.sha
      })
    });

    // Retornamos si fue creación o actualización para el mensajito verde
    if (commitRes.ok) {
        return (index !== -1) ? "actualizado" : "creado";
    } else {
        return "error";
    }

  } catch (error) {
    console.error("Error en sincronización con GitHub:", error);
    return "error";
  }
}