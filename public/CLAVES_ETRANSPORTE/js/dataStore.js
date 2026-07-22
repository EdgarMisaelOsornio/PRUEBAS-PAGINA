export let oficinas = [];

export async function cargarOficinas() {
  console.log("🔄 Intentando cargar Excel...");

  const excelURL = new URL(
    "../OFICINAS NOMENCLATURAS.xlsx",
    import.meta.url
  );

  try {
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

// ─── Ruta del archivo en el repositorio ───────────────────────────────────────
// El token de GitHub vive SOLO en el servidor (/.env.local → GITHUB_TOKEN).
// El frontend llama a /api/github, nunca a api.github.com directamente.
const FILE_PATH = "public/CLAVES_ETRANSPORTE/OFICINAS NOMENCLATURAS.xlsx";

// Función para guardar (a través del backend seguro /api/github)
export async function agregarOficinaAlStore(nuevaOficina) {
  try {
    let claveNorm = nuevaOficina.clave.trim().toUpperCase();
    if (/^\d+$/.test(claveNorm)) claveNorm = claveNorm.padStart(4, "0");

    // 1. Obtener SHA del archivo a través del backend (el token lo pone el servidor)
    const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      throw new Error(err.error || `Error al obtener metadata: ${metaRes.status}`);
    }
    const { sha, download_url } = await metaRes.json();
    if (!sha) throw new Error("No se pudo obtener el SHA del archivo");

    // 2. Descargar el contenido actual del Excel (download_url es público)
    const excelRes = await fetch(download_url);
    if (!excelRes.ok) throw new Error("No se pudo descargar el Excel de GitHub");
    const arrayBuffer = await excelRes.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 3. Convertir a JSON para manipular los datos
    let dataJSON = XLSX.utils.sheet_to_json(worksheet);

    // Buscar si la clave ya existe
    const index = dataJSON.findIndex(o => {
      let c = String(o.CLAVE || "").trim().toUpperCase();
      if (/^\d+$/.test(c)) c = c.padStart(4, "0");
      return c === claveNorm;
    });

    let mensajeCommit = "";

    if (index !== -1) {
      // Actualizar fila existente
      dataJSON[index] = {
        CLAVE: claveNorm,
        NOMBRE: nuevaOficina.nombre.trim().toUpperCase(),
        NOMENCLATURA: nuevaOficina.nomenclatura.trim().toUpperCase(),
        DIRECCION: nuevaOficina.direccion.trim().toUpperCase()
      };
      mensajeCommit = `🔧 Corrección de oficina: ${nuevaOficina.nombre}`;
    } else {
      // Agregar nueva fila
      dataJSON.push({
        CLAVE: claveNorm,
        NOMBRE: nuevaOficina.nombre.trim().toUpperCase(),
        NOMENCLATURA: nuevaOficina.nomenclatura.trim().toUpperCase(),
        DIRECCION: nuevaOficina.direccion.trim().toUpperCase()
      });
      mensajeCommit = `✅ Añadida oficina: ${nuevaOficina.nombre}`;
    }

    // 4. Convertir de vuelta a Excel en base64
    const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
    workbook.Sheets[sheetName] = newWorksheet;
    const outExcel = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

    // 5. Enviar el commit a través del backend seguro (nunca exponemos el token)
    const commitRes = await fetch("/api/github", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: FILE_PATH,
        sha,
        content: outExcel,
        message: mensajeCommit
      })
    });

    if (commitRes.ok) {
      return index !== -1 ? "actualizado" : "creado";
    } else {
      const err = await commitRes.json().catch(() => ({}));
      console.error("Error del backend al hacer commit:", err);
      return "error";
    }

  } catch (error) {
    console.error("Error en sincronización con GitHub:", error);
    return "error";
  }
}
