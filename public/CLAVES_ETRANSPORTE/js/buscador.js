import { oficinas } from "./dataStore.js";

export function iniciarBuscador() {
  const inputBuscador = document.getElementById("buscar");
  const boxResultados = document.getElementById("resultadosBusqueda");

  if (!inputBuscador || !boxResultados) return;

  inputBuscador.addEventListener("input", () => {
    const raw = inputBuscador.value.trim();
    const q = raw.toLowerCase();

    if (!q) {
      boxResultados.style.display = "none";
      boxResultados.innerHTML = "";
      return;
    }

    let qPad = null;
    if (/^\d+$/.test(raw)) qPad = raw.padStart(4, "0");

    const coincidencias = oficinas.filter(item => {
      const clave = item.clave.toLowerCase();
      const nombre = item.nombre.toLowerCase();
      const nom = item.nomenclatura.toLowerCase();
      const dir = item.direccion.toLowerCase();

      if (clave.includes(q) || (qPad && clave.includes(qPad))) return true;

      if (/^\d+$/.test(raw)) {
        const claveSinCeros = clave.replace(/^0+/, "");
        if (claveSinCeros.includes(raw.replace(/^0+/, ""))) return true;
      }

      return (
        nombre.includes(q) ||
        nom.includes(q) ||
        dir.includes(q)
      );
    });

    if (coincidencias.length === 0) {
      boxResultados.style.display = "block";
      boxResultados.innerHTML =
        `<p style="padding:10px;margin:0;">No se encontraron resultados...</p>`;
      return;
    }

    boxResultados.style.display = "block";
    boxResultados.innerHTML = coincidencias.map(r => `
      <div class="search-item" data-clave="${r.clave}">
        <b>${r.clave}</b> — ${r.nombre}
        <br>
        <small>${r.nomenclatura} | ${r.direccion}</small>
      </div>
    `).join("");
  });

  boxResultados.addEventListener("click", ev => {
    const item = ev.target.closest(".search-item");
    if (!item) return;

    const claveSel = item.dataset.clave.padStart(4, "0");
    const textarea = document.getElementById("oficinas");
    const erroresEl = document.getElementById("errores");
    const inputBuscadorEl = document.getElementById("buscar");

    const lines = textarea.value.split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const linesNorm = lines.map(l => l.padStart(4, "0"));

    if (linesNorm.includes(claveSel)) {
      erroresEl.textContent = `⚠️ La clave ${claveSel} ya existe en la lista.`;
      setTimeout(() => erroresEl.textContent = "", 3000);
      inputBuscadorEl.value = "";
      boxResultados.style.display = "none";
      return;
    }

    lines.push(claveSel);
    textarea.value = lines.join("\n");
    textarea.scrollTop = textarea.scrollHeight;
    textarea.focus();

    inputBuscadorEl.value = "";
    boxResultados.style.display = "none";
  });
}
