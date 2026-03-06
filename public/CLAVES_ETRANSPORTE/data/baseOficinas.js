export let baseOficinas = [];

// === CARGAR EXCEL AUTOMÁTICAMENTE Y NORMALIZAR CLAVE A 4 DÍGITOS ===
export async function cargarExcelBuscador() {
    try {
        const response = await fetch("OFICINAS NOMENCLATURAS.xlsx");
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        baseOficinas = XLSX.utils.sheet_to_json(sheet).map(row => {
            let clave = (row.CLAVE ?? "").toString().trim();

            if (/^\d+$/.test(clave)) {
                clave = clave.padStart(4, "0");
            } else if (clave.length > 0 && clave.length < 4) {
                clave = clave.padStart(4, "0");
            }

            return {
                ...row,
                CLAVE: clave
            };
        });

        console.log("🟢 Base de oficinas cargada:", baseOficinas.length, "registros");
    } catch (e) {
        console.error("❌ Error cargando Excel:", e);
    }
}
