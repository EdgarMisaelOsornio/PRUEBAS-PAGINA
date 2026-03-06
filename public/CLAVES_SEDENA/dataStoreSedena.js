// ==========================================
// DATA STORE PARA SEDENA (CONEXIÓN GITHUB)
// ==========================================
export let officeData = [];

const GITHUB_TOKEN = "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";
const REPO_OWNER = "EdgarMisaelOsornio";
const REPO_NAME = "SERVICE-DESK-";
const FILE_PATH = "public/CLAVES_SEDENA/AGENCIAS.xlsx"; 

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
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const resMetadata = await fetch(url, { headers: { "Authorization": `token ${GITHUB_TOKEN}` } });
        const fileMetadata = await resMetadata.json();

        const excelRes = await fetch(fileMetadata.download_url);
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

        const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
        workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
        const outExcel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

        const commitRes = await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `⚙️ Gestión SEDENA: ${agencia.numero}`,
                content: outExcel,
                sha: fileMetadata.sha
            })
        });
        return commitRes.ok ? (index !== -1 ? "actualizado" : "creado") : "error";
    } catch (error) { return "error"; }
}