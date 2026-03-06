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

// Configuración de GitHub
const GITHUB_TOKEN = "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";
const REPO_OWNER = "EdgarMisaelOsornio";
const REPO_NAME = "SERVICE-DESK-";
const FILE_PATH = "public/CLAVES_ETRANSPORTE/OFICINAS NOMENCLATURAS.xlsx";

// Función para guardar (con la lógica de GitHub)
export async function agregarOficinaAlStore(nuevaOficina) {
  try {
    let claveNorm = nuevaOficina.clave.trim().toUpperCase();
    if (/^\d+$/.test(claveNorm)) claveNorm = claveNorm.padStart(4, "0");

    // 1. Obtener metadatos de GitHub (SHA)
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const resMetadata = await fetch(url, {
      headers: { "Authorization": `token ${GITHUB_TOKEN}` }
    });
    const fileMetadata = await resMetadata.json();
    if (!fileMetadata.sha) throw new Error("No se pudo obtener el SHA del archivo");

    // 2. Descargar contenido actual del Excel
    const excelRes = await fetch(fileMetadata.download_url);
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 3. Convertir a JSON para manipular los datos
    let dataJSON = XLSX.utils.sheet_to_json(worksheet);

    // 🔍 BUSCAR SI LA CLAVE YA EXISTE
    // Normalizamos la búsqueda para que coincida con el formato del Excel
    const index = dataJSON.findIndex(o => {
        let c = String(o.CLAVE || "").trim().toUpperCase();
        if (/^\d+$/.test(c)) c = c.padStart(4, "0");
        return c === claveNorm;
    });

    let mensajeCommit = "";

    if (index !== -1) {
      // 📝 SI EXISTE: Actualizamos esa fila (CORRECCIÓN)
      dataJSON[index] = {
        CLAVE: claveNorm,
        NOMBRE: nuevaOficina.nombre.trim().toUpperCase(),
        NOMENCLATURA: nuevaOficina.nomenclatura.trim().toUpperCase(),
        DIRECCION: nuevaOficina.direccion.trim().toUpperCase()
      };
      mensajeCommit = `🔧 Corrección de oficina: ${nuevaOficina.nombre}`;
    } else {
      // ✨ SI NO EXISTE: La agregamos al final (NUEVA)
      dataJSON.push({
        CLAVE: claveNorm,
        NOMBRE: nuevaOficina.nombre.trim().toUpperCase(),
        NOMENCLATURA: nuevaOficina.nomenclatura.trim().toUpperCase(),
        DIRECCION: nuevaOficina.direccion.trim().toUpperCase()
      });
      mensajeCommit = `✅ Añadida oficina: ${nuevaOficina.nombre}`;
    }

    // 4. Convertir de vuelta a Excel
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 5. Commit a GitHub
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

    // Retornamos si fue una actualización o una creación para avisar en el alert de main.js
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