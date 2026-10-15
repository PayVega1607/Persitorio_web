/* GameVault · JavaScript sin librerías.
   La navegación (:target), los modales y los menús ya funcionan con HTML y CSS;
   este archivo añade el manejo de eventos y la validación con addEventListener. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const num = (t) => Number(String(t).replace(/\D/g, ""));
  const dateKey = (s) => { const [d, m, y] = s.split("/"); return +y * 10000 + +m * 100 + +d; };

  /* Los datos de cada juego se leen de su página de detalle (#d1 ... #d8) */
  function info(n) {
    const s = $("#d" + n);
    const dd = $$("dl dd", s);
    const [genre, category] = $(".eyebrow", s).textContent.split(" · ");
    return {
      name: $("h1", s).textContent, price: num($(".detail-purchase strong", s).textContent),
      genre, category, developer: dd[0].textContent, date: dd[1].textContent,
      platform: dd[2].textContent, size: dd[3].textContent,
      description: $(".detail-description", s).textContent, image: $(".detail-cover", s).src,
    };
  }
  const gameId = (card) => card.id ? card.id.replace("c-", "") : $(".cover-button", card).getAttribute("href").replace("#d", "");

  /* ---------- Aviso (toast) ---------- */
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.hidden = true;
  toast.innerHTML = '<span><svg class="ic"><use href="#i-check"/></svg></span><b></b>';
  $(".app-shell").appendChild(toast);
  let toastTimer;
  function notify(msg) {
    $("b", toast).textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  /* ---------- Página anterior (para "Volver" y "Cancelar") ---------- */
  const PAGES = ["home", "store", "library", "add", "edit", "saved", "profile"];
  let lastPage = "#home";
  const trackPage = () => { if (PAGES.includes(location.hash.slice(1))) lastPage = location.hash; };
  window.addEventListener("hashchange", trackPage);
  trackPage();

  function closeModal() {
    const h = location.hash;
    if (h.startsWith("#buy-")) location.hash = lastPage;
    else if (h.startsWith("#del-")) location.hash = "#library";
  }
  const closeMenus = () => $$("details.menu-wrap[open]").forEach((d) => { d.open = false; });

  /* ---------- Biblioteca ---------- */
  function updateCount() {
    const n = $$("#library .library-card").length;
    $("#library .page-heading p").textContent = `${n} juegos listos para ti.`;
    $("#profile .stats strong").textContent = n;
  }

  function deleteGame(modal) {
    const n = modal.id.replace("del-", "");
    notify("Videojuego eliminado correctamente");
    const card = $("#c-" + n);
    if (card) card.remove();
    modal.remove();
    updateCount();
    refresh($("#library"));
    location.hash = "#library";
  }

  function playGame(card) {
    const btn = $("button.btn", card);
    notify("Iniciando juego...");
    setTimeout(() => {
      card.dataset.status = "Jugando";
      const pill = $(".status", card);
      pill.className = "status status-jugando";
      pill.innerHTML = "<i></i>Jugando";
      btn.lastChild.textContent = "Jugando";
      notify("Jugando");
    }, 1200);
  }

  /* ---------- Búsqueda y orden ---------- */
  function refresh(sec) {
    const isLib = sec.id === "library";
    const q = $(".search input", sec).value.trim().toLowerCase();
    const grid = $(isLib ? ".library-grid" : ".store-grid", sec);
    const cards = $$(isLib ? ".library-card" : ".game-card", grid);
    cards.forEach((c) => { c.hidden = !info(gameId(c)).name.toLowerCase().includes(q); });

    const mode = $$("select", $(".filter-selects", sec)).pop().selectedIndex; // 0 nombre, 1 precio, 2 fecha, 3 última vez
    const val = (c) => {
      const d = info(gameId(c));
      return mode === 1 ? d.price : mode === 2 ? dateKey(d.date) : mode === 3 ? -gameId(c) : d.name.toLowerCase();
    };
    cards.sort((a, b) => (mode === 0 ? val(a).localeCompare(val(b)) : val(a) - val(b))).forEach((c) => grid.appendChild(c));

    $(".empty", sec).hidden = cards.some((c) => getComputedStyle(c).display !== "none");
    if (!isLib) $(".result-count", sec).textContent = `${cards.filter((c) => getComputedStyle(c).display !== "none").length} juegos`;
  }

  $$("#store, #library").forEach((sec) => {
    sec.addEventListener("input", (e) => { if (e.target.matches(".search input")) refresh(sec); });
    sec.addEventListener("change", (e) => { if (e.target.matches(".filters select")) refresh(sec); });
    refresh(sec);
  });

  /* ---------- Formularios: validación con mensajes en la página ---------- */
  const validDate = (v) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
    if (!m) return false;
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && y >= 1970 && dt <= new Date(Date.now() + 365 * 864e5);
  };
  const rules = {
    nombre: (v) => v.trim().length >= 2,
    precio: (v) => Number(v) >= 1,
    genero: (v) => v !== "",
    fecha: validDate,
    tamano: (v) => !v.trim() || /^\d+([.,]\d+)?\s?(MB|GB|TB)$/i.test(v.trim()),
    portada: (v) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim()),
  };

  function clearErrors(form) {
    $$(".has-error", form).forEach((f) => f.classList.remove("has-error"));
    $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
    form.classList.remove("has-errors");
  }

  $$(".game-form").forEach((form) => {
    form.noValidate = true; // los errores se muestran en la página, no en globos del navegador
    const isEdit = form.closest("#edit") !== null;

    const check = (name) => {
      const el = form.elements[name];
      const ok = rules[name](el.value);
      el.closest(".field").classList.toggle("has-error", !ok);
      el.setAttribute("aria-invalid", String(!ok));
      return ok;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bad = Object.keys(rules).filter((n) => !check(n));
      form.classList.toggle("has-errors", bad.length > 0);
      if (bad.length) { form.elements[bad[0]].focus(); return; }
      notify(isEdit ? "Cambios válidos. El guardado llegará en la siguiente entrega." : "Datos válidos. El guardado llegará en la siguiente entrega.");
      location.hash = "#saved";
    });
    form.addEventListener("focusout", (e) => { if (rules[e.target.name]) check(e.target.name); });
    form.addEventListener("input", (e) => {
      if (e.target.closest(".field.has-error")) check(e.target.name);
      form.classList.toggle("has-errors", !!$(".has-error", form));
    });
  });

  function fillEdit(card) {
    const d = info(gameId(card));
    const form = $("#edit form");
    form.reset();
    clearErrors(form);
    Object.entries({
      nombre: d.name, precio: d.price, genero: d.genre, categoria: d.category, plataforma: d.platform,
      desarrollador: d.developer, fecha: d.date, tamano: d.size, descripcion: d.description,
      portada: d.image, estado: $(".status", card).textContent.trim(),
    }).forEach(([k, v]) => { form.elements[k].value = v; });
  }

  /* ---------- Eventos globales ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest(".menu-wrap")) closeMenus();
    if (t.classList.contains("modal-backdrop")) return closeModal();

    const edit = t.closest('a[href="#edit"]');
    if (edit) { const card = edit.closest(".library-card"); if (card) fillEdit(card); closeMenus(); return; }

    if (t.closest('a[href="#add"]')) { const f = $("#add form"); f.reset(); clearErrors(f); return; }

    if (t.closest(".detail-back")) { e.preventDefault(); location.hash = lastPage; return; }

    const cancel = t.closest(".modal-close, .modal-actions .btn-ghost");
    if (cancel && cancel.closest('[id^="buy-"]')) { e.preventDefault(); location.hash = lastPage; return; }

    const del = t.closest(".modal-actions .btn-danger");
    if (del) { e.preventDefault(); deleteGame(del.closest(".modal-backdrop")); return; }

    if (t.closest('[id^="buy-"] .modal-actions .btn-primary')) { notify("Juego comprado correctamente"); return; }

    const play = t.closest(".library-card button.btn");
    if (play) playGame(play.closest(".library-card"));
  });

  document.addEventListener("change", (e) => {
    if (e.target.id && e.target.id.startsWith("fav-")) notify(e.target.checked ? "Agregado a favoritos" : "Eliminado de favoritos");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeMenus(); closeModal(); }
  });
})();
