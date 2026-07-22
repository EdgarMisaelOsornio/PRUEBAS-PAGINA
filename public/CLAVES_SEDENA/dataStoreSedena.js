// ==========================================
// DATA STORE PARA SEDENA (USA RUTA /api/github)
// ==========================================
// NOTA: El token de GitHub NUNCA debe ir en código cliente.
// Se usa la ruta interna /api/github que lo maneja con variables de entorno.
// ==========================================
export let officeData = [];

const FILE_PATH = "public/CLAVES_SEDENA/AGENCIAS.xlsx";

export async function cargarAgencias() {
    try {
        // Carga el Excel directamente desde el public folder (igual que E-Transporte)
        const excelRes = await fetch(`/CLAVES_SEDENA/AGENCIAS.xlsx?t=${Date.now()}`);
        if (!excelRes.ok) throw new Error(`Error cargando Excel: ${excelRes.status}`);
        const data = await excelRes.arrayBuffer();

        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet);

        officeData = raw.map(row => ({
            numero: String(row["NUMERO DE OFICINA"] || "").trim(),
            nomenclatura: String(row.NOMENCLATURA || "").trim().toUpperCase(),
            nombre: String(row["NOMBRE DE AGENCIA"] || "").trim().toUpperCase(),
            estatus: String(row.ESTATUS || "").trim().toUpperCase()
        }));
        return true;
    } catch (error) {
        console.error("Error cargando agencias:", error);
        return false;
    }
}

export async function guardarAgenciaAlStore(agencia) {
    try {
        // 1. Obtener SHA y download_url a través del API interno
        const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
        if (!metaRes.ok) {
            const err = await metaRes.json().catch(() => ({}));
            throw new Error(`Error obteniendo metadata: ${metaRes.status} - ${err.error || ''}`);
        }
        const { sha, download_url } = await metaRes.json();
        if (!sha || !download_url) throw new Error("Respuesta incompleta del API (sha o download_url ausentes).");

        // 2. Descargar el Excel actual desde GitHub
        const excelRes = await fetch(download_url);
        if (!excelRes.ok) throw new Error(`Error descargando Excel: ${excelRes.status}`);
        const arrayBuffer = await excelRes.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let dataJSON = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        // 3. Agregar o actualizar la fila
        const index = dataJSON.findIndex(o => String(o["NUMERO DE OFICINA"]) === String(agencia.numero));
        const nuevaFila = {
            "NUMERO DE OFICINA": agencia.numero,
            "NOMENCLATURA": agencia.nomenclatura,
            "NOMBRE DE AGENCIA": agencia.nombre,
            "ESTATUS": agencia.estatus
        };
        if (index !== -1) dataJSON[index] = nuevaFila;
        else dataJSON.push(nuevaFila);

        // 4. Serializar el Excel a base64
        const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
        workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
        const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

        // 5. Hacer commit a través del API interno (nunca expone el token al navegador)
        const commitRes = await fetch('/api/github', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: FILE_PATH,
                sha,
                content: outExcel,
                message: `⚙️ Gestión SEDENA: ${agencia.numero}`
            })
        });

        if (!commitRes.ok) {
            const err = await commitRes.json().catch(() => ({}));
            console.error("Error en commit:", err);
            return "error";
        }
        const result = await commitRes.json();
        return result.ok ? (index !== -1 ? "actualizado" : "creado") : "error";
    } catch (error) {
        console.error("Error guardando agencia:", error);
        return "error";
    }
}
