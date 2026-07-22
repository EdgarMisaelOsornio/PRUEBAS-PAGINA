// ============================================================
// dataStoreDirecciones.js
// Gestión CRUD de Direcciones/Regiones en GitHub
// Al EDITAR una dirección, actualiza también TODAS las oficinas
// que la tengan asignada en el Excel — en un solo commit.
// ============================================================

import { oficinas } from "./dataStore.js";

// ── Rutas de archivos en el repo ───────────────────────────────────────────────
const FILE_PATH_DIR   = "public/CLAVES_ETRANSPORTE/data/direccionesLista.js";
const FILE_PATH_EXCEL = "public/CLAVES_ETRANSPORTE/OFICINAS NOMENCLATURAS.xlsx";

// ── Obtener lista de direcciones desde el array de oficinas en memoria ─────────
export function getDireccionesActuales() {
  return [...new Set(oficinas.map(o => o.direccion).filter(Boolean))].sort();
}

// ── Helpers: leer/guardar direccionesLista.js ──────────────────────────────────
async function leerArchivoDirecciones() {
  const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH_DIR)}`);
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error || `Error metadata direcciones: ${metaRes.status}`);
  }
  const { sha, download_url } = await metaRes.json();
  if (!sha) throw new Error("No se pudo obtener el SHA del archivo de direcciones");

  const contentRes = await fetch(download_url);
  if (!contentRes.ok) throw new Error("No se pudo descargar direccionesLista.js");
  const texto = await contentRes.text();

  const match = texto.match(/\[[\s\S]*\]/);
  let lista = [];
  if (match) {
    try {
      lista = JSON.parse(match[0]);
    } catch {
      lista = [...match[0].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    }
  }
  return { sha, lista };
}

async function guardarListaDirecciones(sha, lista, mensaje) {
  const listaOrdenada = [...new Set(lista)].filter(Boolean).sort();
  const contenidoJS =
    `export const listaDirecciones = [\n` +
    listaOrdenada.map(d => `  ${JSON.stringify(d)}`).join(",\n") +
    `\n];\n`;

  const base64 = btoa(unescape(encodeURIComponent(contenidoJS)));

  const res = await fetch("/api/github", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: FILE_PATH_DIR, sha, content: base64, message: mensaje }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error guardando direcciones: ${res.status}`);
  }
  return listaOrdenada;
}

// ── Helpers: leer/guardar Excel de oficinas ────────────────────────────────────
async function leerExcelOficinas() {
  const metaRes = await fetch(`/api/github?file=${encodeURIComponent(FILE_PATH_EXCEL)}`);
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error || `Error metadata Excel: ${metaRes.status}`);
  }
  const { sha, download_url } = await metaRes.json();
  if (!sha) throw new Error("No se pudo obtener el SHA del Excel");

  const excelRes = await fetch(download_url);
  if (!excelRes.ok) throw new Error("No se pudo descargar el Excel de GitHub");
  const arrayBuffer = await excelRes.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const dataJSON = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  return { sha, workbook, sheetName, dataJSON };
}

async function guardarExcelOficinas(sha, workbook, sheetName, dataJSON, mensaje) {
  const newWorksheet = XLSX.utils.json_to_sheet(dataJSON);
  workbook.Sheets[sheetName] = newWorksheet;
  const outExcel = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  const res = await fetch("/api/github", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: FILE_PATH_EXCEL, sha, content: outExcel, message: mensaje }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error guardando Excel: ${res.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AGREGAR nueva dirección (solo en direccionesLista.js)
// ══════════════════════════════════════════════════════════════════════════════
export async function agregarDireccion(nuevaDireccion) {
  const nombre = nuevaDireccion.trim().toUpperCase();
  if (!nombre) throw new Error("El nombre no puede estar vacío");

  const { sha, lista } = await leerArchivoDirecciones();

  if (lista.some(d => d.toUpperCase() === nombre)) {
    throw new Error(`La dirección "${nombre}" ya existe`);
  }

  lista.push(nombre);
  return await guardarListaDirecciones(sha, lista, `➕ Nueva dirección: ${nombre}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITAR dirección — actualiza direccionesLista.js + todas las oficinas en Excel
// ══════════════════════════════════════════════════════════════════════════════
export async function editarDireccion(nombreAntiguo, nombreNuevo) {
  const antiguo = nombreAntiguo.trim().toUpperCase();
  const nuevo   = nombreNuevo.trim().toUpperCase();

  if (!antiguo || !nuevo) throw new Error("Los nombres no pueden estar vacíos");
  if (antiguo === nuevo)   throw new Error("El nombre nuevo es igual al actual");

  // ── Paso 1: Contar oficinas afectadas (desde memoria) ───────────────────────
  const oficinasAfectadas = oficinas.filter(
    o => o.direccion?.trim().toUpperCase() === antiguo
  );

  // ── Paso 2: Actualizar direccionesLista.js ──────────────────────────────────
  const { sha: shaDir, lista } = await leerArchivoDirecciones();

  const idx = lista.findIndex(d => d.toUpperCase() === antiguo);
  if (idx !== -1) {
    if (lista.some((d, i) => i !== idx && d.toUpperCase() === nuevo)) {
      throw new Error(`Ya existe una dirección llamada "${nuevo}"`);
    }
    lista[idx] = nuevo;
  } else {
    lista.push(nuevo);
  }

  await guardarListaDirecciones(
    shaDir, lista,
    `✏️ Dirección renombrada: ${antiguo} → ${nuevo}`
  );

  // ── Paso 3: Si hay oficinas afectadas, actualizar Excel en un solo commit ────
  if (oficinasAfectadas.length > 0) {
    const { sha: shaXlsx, workbook, sheetName, dataJSON } = await leerExcelOficinas();

    let actualizadas = 0;
    for (const fila of dataJSON) {
      const dirFila = String(fila.DIRECCION || "").trim().toUpperCase();
      if (dirFila === antiguo) {
        fila.DIRECCION = nuevo;
        actualizadas++;
      }
    }

    if (actualizadas > 0) {
      // Actualizar también el array en memoria para que la UI refleje el cambio inmediatamente
      for (const of_ of oficinas) {
        if (of_.direccion?.trim().toUpperCase() === antiguo) {
          of_.direccion = nuevo;
        }
      }

      await guardarExcelOficinas(
        shaXlsx, workbook, sheetName, dataJSON,
        `✏️ Reasignadas ${actualizadas} oficinas: ${antiguo} → ${nuevo}`
      );
    }

    return { lista, oficinasActualizadas: actualizadas };
  }

  return { lista, oficinasActualizadas: 0 };
}

// ══════════════════════════════════════════════════════════════════════════════
// REASIGNAR oficinas de una dirección a otra (sin tocar la lista de direcciones)
// Usado en el flujo "Reasignar y Eliminar" cuando el destino ya existe
// ══════════════════════════════════════════════════════════════════════════════
export async function reasignarOficinas(origen, destino) {
  const origenNorm  = origen.trim().toUpperCase();
  const destinoNorm = destino.trim().toUpperCase();

  if (!origenNorm || !destinoNorm) throw new Error("Los nombres no pueden estar vacíos");
  if (origenNorm === destinoNorm)  throw new Error("El origen y destino son iguales");

  const oficinasAfectadas = oficinas.filter(
    o => o.direccion?.trim().toUpperCase() === origenNorm
  );
  if (oficinasAfectadas.length === 0) return { oficinasActualizadas: 0 };

  const { sha, workbook, sheetName, dataJSON } = await leerExcelOficinas();

  let actualizadas = 0;
  for (const fila of dataJSON) {
    const dirFila = String(fila.DIRECCION || "").trim().toUpperCase();
    if (dirFila === origenNorm) {
      fila.DIRECCION = destinoNorm;
      actualizadas++;
    }
  }

  if (actualizadas > 0) {
    // Actualizar también el array en memoria para reflejar el cambio en la UI
    for (const of_ of oficinas) {
      if (of_.direccion?.trim().toUpperCase() === origenNorm) {
        of_.direccion = destinoNorm;
      }
    }
    await guardarExcelOficinas(
      sha, workbook, sheetName, dataJSON,
      `🔀 Reasignadas ${actualizadas} oficinas: ${origenNorm} → ${destinoNorm}`
    );
  }

  return { oficinasActualizadas: actualizadas };
}

// ══════════════════════════════════════════════════════════════════════════════
// ELIMINAR dirección (solo si no tiene oficinas asignadas)
// ══════════════════════════════════════════════════════════════════════════════
export async function eliminarDireccion(nombre) {
  const nombreNorm = nombre.trim().toUpperCase();

  const enUso = oficinas.filter(o => o.direccion?.toUpperCase() === nombreNorm);
  if (enUso.length > 0) {
    throw new Error(
      `No se puede eliminar: ${enUso.length} oficina(s) usan esta dirección.\n` +
      `Ejemplo: ${enUso.slice(0, 3).map(o => o.clave).join(", ")}`
    );
  }

  const { sha, lista } = await leerArchivoDirecciones();
  const nuevaLista = lista.filter(d => d.toUpperCase() !== nombreNorm);

  if (nuevaLista.length === lista.length) {
    throw new Error(`No se encontró la dirección "${nombreNorm}"`);
  }

  return await guardarListaDirecciones(sha, nuevaLista, `🗑️ Dirección eliminada: ${nombreNorm}`);
}
