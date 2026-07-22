// ============================================================
// customSelect.js — Dropdown con buscador estilo Image1
// Envuelve cualquier <select> nativo manteniéndolo funcional
// ============================================================

class CustomSelect {
  /**
   * @param {HTMLSelectElement} selectEl  — el <select> original
   * @param {object} opts
   *   opts.placeholder  — texto cuando no hay selección
   *   opts.searchable   — mostrar buscador (default true)
   *   opts.subtext      — fn(value) → string extra bajo el label (opcional)
   */
  constructor(selectEl, opts = {}) {
    this.select      = selectEl;
    this.id          = selectEl.id;
    this.placeholder = opts.placeholder || selectEl.querySelector("option")?.textContent || "Selecciona…";
    this.searchable  = opts.searchable !== false;
    this.subtext     = opts.subtext || null;
    this.open        = false;

    this._build();
    this._interceptValue();
    this._observeOptions();
    this._bindEvents();
    this.refresh();
  }

  // ── Construcción del DOM ──────────────────────────────────────────
  _build() {
    // Ocultar select original
    this.select.style.display = "none";

    // Wrapper
    this.wrapper = document.createElement("div");
    this.wrapper.className = "cs-wrapper";
    this.wrapper.setAttribute("data-cs-id", this.id);

    // Trigger (caja visible)
    this.trigger = document.createElement("div");
    this.trigger.className = "cs-trigger";
    this.trigger.setAttribute("tabindex", "0");
    this.trigger.setAttribute("role", "combobox");
    this.trigger.setAttribute("aria-expanded", "false");

    this.display = document.createElement("span");
    this.display.className = "cs-display";
    this.display.textContent = this.placeholder;

    this.arrow = document.createElement("span");
    this.arrow.className = "cs-arrow";
    this.arrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    this.trigger.appendChild(this.display);
    this.trigger.appendChild(this.arrow);

    // Panel desplegable
    this.panel = document.createElement("div");
    this.panel.className = "cs-panel";

    if (this.searchable) {
      const searchWrap = document.createElement("div");
      searchWrap.className = "cs-search-wrap";
      searchWrap.innerHTML = `<svg class="cs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

      this.searchInput = document.createElement("input");
      this.searchInput.className = "cs-search-input";
      this.searchInput.placeholder = "Buscar…";
      this.searchInput.autocomplete = "off";
      this.searchInput.spellcheck = false;

      searchWrap.appendChild(this.searchInput);
      this.panel.appendChild(searchWrap);
    }

    this.list = document.createElement("div");
    this.list.className = "cs-options-list";
    this.panel.appendChild(this.list);

    this.noResults = document.createElement("div");
    this.noResults.className = "cs-no-results";
    this.noResults.textContent = "Sin resultados";
    this.panel.appendChild(this.noResults);

    this.wrapper.appendChild(this.trigger);
    this.wrapper.appendChild(this.panel);

    this.select.parentNode.insertBefore(this.wrapper, this.select);
    this.wrapper.appendChild(this.select);
  }

  // ── Renderizar opciones desde el <select> ────────────────────────
  refresh(filterText = "") {
    this.list.innerHTML = "";
    const query = filterText.toLowerCase().trim();
    const options = Array.from(this.select.options);
    let visible = 0;

    options.forEach(opt => {
      if (!opt.value && !filterText) {
        // Opción vacía — renderizar como "limpiar selección"
        if (!filterText) {
          const item = this._makeItem("", this.placeholder, null, true);
          this.list.appendChild(item);
          visible++;
        }
        return;
      }
      if (!opt.value) return;

      const label = opt.textContent.trim();
      if (query && !label.toLowerCase().includes(query)) return;

      const sub = this.subtext ? this.subtext(opt.value) : null;
      const item = this._makeItem(opt.value, label, sub, false);
      if (opt.value === this.select.value) item.classList.add("cs-selected");
      this.list.appendChild(item);
      visible++;
    });

    this.noResults.style.display = visible === 0 ? "block" : "none";

    // Actualizar display con valor actual
    this._updateDisplay();
  }

  _makeItem(value, label, sub, isEmpty) {
    const item = document.createElement("div");
    item.className = "cs-option" + (isEmpty ? " cs-option-empty" : "");
    item.dataset.value = value;

    if (isEmpty) {
      item.textContent = label;
    } else {
      const main = document.createElement("span");
      main.className = "cs-option-label";
      main.textContent = label;
      item.appendChild(main);
      if (sub) {
        const s = document.createElement("span");
        s.className = "cs-option-sub";
        s.textContent = sub;
        item.appendChild(s);
      }
    }

    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this._selectValue(value, label);
    });
    return item;
  }

  _selectValue(value, label) {
    // Actualizar el select nativo SIN disparar el setter interceptado
    HTMLSelectElement.prototype.__defineGetter__ && null;
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    desc.set.call(this.select, value);

    this._updateDisplay();
    this.closePanel();
    if (this.searchInput) this.searchInput.value = "";
    this.refresh();

    // Disparar change en el select nativo para que el código existente lo detecte
    this.select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  _updateDisplay() {
    const val = this.select.value;
    if (!val) {
      this.display.textContent = this.placeholder;
      this.display.classList.remove("cs-has-value");
    } else {
      const opt = this.select.querySelector(`option[value="${CSS.escape(val)}"]`);
      this.display.textContent = opt ? opt.textContent.trim() : val;
      this.display.classList.add("cs-has-value");
    }
    // Marcar opción seleccionada en la lista
    this.list.querySelectorAll(".cs-option").forEach(el => {
      el.classList.toggle("cs-selected", el.dataset.value === val);
    });
  }

  // ── Interceptar setter de .value para actualizar la UI ───────────
  _interceptValue() {
    const self = this;
    const proto = HTMLSelectElement.prototype;
    const orig = Object.getOwnPropertyDescriptor(proto, "value");

    Object.defineProperty(this.select, "value", {
      get() { return orig.get.call(this); },
      set(v) {
        orig.set.call(this, v);
        self._updateDisplay();
      },
      configurable: true
    });
  }

  // ── MutationObserver: refrescar cuando cambien las <option> ──────
  _observeOptions() {
    const self = this;
    this._observer = new MutationObserver(() => {
      self.refresh(self.searchInput?.value || "");
    });
    this._observer.observe(this.select, { childList: true, subtree: true });
  }

  // ── Eventos del componente ────────────────────────────────────────
  _bindEvents() {
    // Abrir/cerrar al clicar el trigger
    this.trigger.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.open ? this.closePanel() : this.openPanel();
    });

    // Teclado en el trigger
    this.trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.open ? this.closePanel() : this.openPanel(); }
      if (e.key === "Escape") this.closePanel();
    });

    // Buscar
    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => {
        this.refresh(this.searchInput.value);
      });
      this.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { this.closePanel(); }
      });
    }

    // Cerrar al clicar fuera
    document.addEventListener("mousedown", (e) => {
      if (!this.wrapper.contains(e.target)) this.closePanel();
    });
  }

  openPanel() {
    this.open = true;
    this.wrapper.classList.add("cs-open");
    const triggerRect = this.trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom - 16;
    const spaceAbove = triggerRect.top - 16;
    this.wrapper.classList.toggle("cs-open-up", spaceBelow < 280 && spaceAbove > spaceBelow);
    this.trigger.setAttribute("aria-expanded", "true");
    this.refresh(this.searchInput?.value || "");
    if (this.searchInput) {
      requestAnimationFrame(() => this.searchInput.focus());
    }
  }

  closePanel() {
    this.open = false;
    this.wrapper.classList.remove("cs-open");
    this.wrapper.classList.remove("cs-open-up");
    this.trigger.setAttribute("aria-expanded", "false");
    if (this.searchInput) this.searchInput.value = "";
  }

  destroy() {
    this._observer.disconnect();
    this.wrapper.replaceWith(this.select);
    this.select.style.display = "";
  }
}

// ── Registro global de instancias ─────────────────────────────────
window._customSelects = {};

/**
 * Inicializar un select como CustomSelect
 * @param {string} id        — ID del <select>
 * @param {object} opts      — opciones del constructor
 */
window.initCustomSelect = function(id, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window._customSelects[id]) window._customSelects[id].destroy();
  window._customSelects[id] = new CustomSelect(el, opts);
};

/**
 * Refrescar manualmente la UI de un CustomSelect
 */
window.refreshCustomSelect = function(id) {
  window._customSelects[id]?.refresh();
};
