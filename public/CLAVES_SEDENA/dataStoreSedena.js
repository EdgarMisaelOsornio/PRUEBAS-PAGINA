// ==========================================
// DATA STORE PARA SEDENA (CONEXIÓN GITHUB)
// ==========================================
export let officeData = [];

export async function cargarAgencias() {
    const excelURL = `${window.location.origin}/CLAVES_SEDENA/AGENCIAS.xlsx`;
    try {
        const response = await fetch(excelURL + `?t=${Date.now()}`);
        const data = await response.arrayBuffer();
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
        const FILE_PATH = "public/CLAVES_SEDENA/AGENCIAS.xlsx";

        // 1. Obtener SHA via proxy (token seguro en servidor)
        const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH)}`);
        if (!metaRes.ok) throw new Error("No se pudo obtener metadatos");
        const { sha, download_url } = await metaRes.json();

        // 2. Descargar Excel actual
        const excelRes = await fetch(download_url);
        const arrayBuffer = await excelRes.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let dataJSON = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const index = dataJSON.findIndex(o => String(o["NUMERO DE OFICINA"]) === String(agencia.numero));

        const nuevaFila = {
            "NUMERO DE OFICINA": agencia.numero,
            "NOMENCLATURA": agencia.nomenclatura,
            "NOMBRE DE AGENCIA": agencia.nombre,
            "ESTATUS": agencia.estatus
        };

        if (index !== -1) dataJSON[index] = nuevaFila;
        else dataJSON.push(nuevaFila);

        // 3. Convertir de vuelta a Excel
        const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
        workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
        const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

        // 4. Commit via proxy
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

        return commitRes.ok ? (index !== -1 ? "actualizado" : "creado") : "error";
    } catch (error) {
        console.error("Error al guardar agencia:", error);
        return "error";
    }
}