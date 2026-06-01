(() => {
  "use strict";

  const SAVED_KEY = "flash.phrases.saved.v1";

  const els = {
    statTotal: document.getElementById("statTotal"),
    statPosition: document.getElementById("statPosition"),
    stepBtn: document.getElementById("stepBtn"),
    removeSavedBtn: document.getElementById("removeSavedBtn"),

    flashcardHit: document.getElementById("flashcardHit"),
    flashcardInner: document.getElementById("flashcardInner"),
    textEn: document.getElementById("textEn"),
    textEs: document.getElementById("textEs"),
    cornerTag: document.getElementById("cornerTag"),
  };

  const norm = (s) => String(s ?? "").trim();

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeRow(r) {
    return {
      es: norm(r.es),
      en: norm(r.en),
      tag: norm(r.tag || "") || "saved",
    };
  }

  function loadSaved() {
    const raw = safeJsonParse(localStorage.getItem(SAVED_KEY) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeRow).filter((r) => r.es && r.en);
  }

  function persistSaved(list) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  let cursor = 0;
  let current = null;

  function showingSpanish() {
    return els.flashcardInner.classList.contains("isFlipped");
  }

  function updateStepUi() {
    const list = loadSaved();
    const tot = list.length;
    const esp = showingSpanish();

    if (els.stepBtn) els.stepBtn.textContent = esp ? "Next ▸" : "Flip ▸";

    els.statTotal.textContent = String(tot);
    els.statPosition.textContent = tot === 0 ? "—" : `${Math.min(cursor + 1, tot)} / ${tot}`;
  }

  /** @param {number} index */
  function showAt(index, { preserveFlip = false } = {}) {
    const saved = loadSaved();
    if (!saved.length) {
      cursor = 0;
      current = null;
      if (!preserveFlip) els.flashcardInner.classList.remove("isFlipped");
      els.textEn.textContent = "Nothing saved yet.";
      els.textEs.textContent = "—";
      els.cornerTag.textContent = "—";
      els.flashcardHit.disabled = true;
      els.flashcardHit.setAttribute("aria-expanded", String(showingSpanish()));
      updateStepUi();
      return;
    }

    const max = saved.length - 1;
    const i = Math.min(Math.max(0, Number.isFinite(index) ? Math.floor(index) : 0), max);
    cursor = i;

    current = saved[cursor];
    if (!preserveFlip) els.flashcardInner.classList.remove("isFlipped");
    els.flashcardHit.disabled = false;
    els.textEn.textContent =
      typeof window.primaryEnglish === "function" ? window.primaryEnglish(current.en) : current.en;
    els.textEs.textContent = current.es;
    els.cornerTag.textContent = `${current.tag || "saved"} · ${cursor + 1}/${saved.length}`;
    updateStepUi();
    els.flashcardHit.setAttribute("aria-expanded", String(showingSpanish()));
    try {
      els.flashcardHit.focus({ preventScroll: true });
    } catch {
      // ignore
    }
  }

  function flipFacesOnly() {
    if (!current) return;
    els.flashcardInner.classList.toggle("isFlipped");
    updateStepUi();
    els.flashcardHit.setAttribute("aria-expanded", String(showingSpanish()));
  }

  function stepForward() {
    const list = loadSaved();
    if (!list.length || !current) return;
    if (!showingSpanish()) {
      els.flashcardInner.classList.add("isFlipped");
    } else {
      const nextIdx = (cursor + 1) % list.length;
      showAt(nextIdx);
    }
    updateStepUi();
  }

  function removeCurrentFromSaved() {
    const saved = loadSaved();
    if (!saved.length) {
      showAt(0);
      return;
    }
    const idx = Math.min(Math.max(0, cursor), saved.length - 1);
    const nextList = saved.filter((_, i) => i !== idx);
    persistSaved(nextList);

    if (!nextList.length) {
      showAt(0);
      return;
    }
    let nextIdx = idx;
    if (nextIdx >= nextList.length) nextIdx = nextList.length - 1;
    showAt(nextIdx);
  }

  function setupEvents() {
    els.flashcardHit.addEventListener("click", (e) => {
      e.preventDefault();
      flipFacesOnly();
    });
    if (els.stepBtn) els.stepBtn.addEventListener("click", stepForward);
    const flipSideBtn = document.getElementById("flipSideBtn");
    const nextCardBtn = document.getElementById("nextCardBtn");
    if (flipSideBtn) {
      flipSideBtn.addEventListener("click", (e) => {
        e.preventDefault();
        flipFacesOnly();
      });
    }
    if (nextCardBtn) {
      nextCardBtn.addEventListener("click", (e) => {
        e.preventDefault();
        stepForward();
      });
    }
    if (els.removeSavedBtn) els.removeSavedBtn.addEventListener("click", removeCurrentFromSaved);

    window.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipFacesOnly();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeCurrentFromSaved();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key !== SAVED_KEY) return;
      const list = loadSaved();
      if (!list.length) showAt(0);
      else if (cursor >= list.length) showAt(Math.max(0, list.length - 1));
      else showAt(cursor);
    });

    window.addEventListener("focus", () => {
      const list = loadSaved();
      if (!list.length) showAt(0);
      else showAt(Math.min(cursor, list.length - 1), { preserveFlip: showingSpanish() });
    });
  }

  function start() {
    setupEvents();
    showAt(0);
  }

  start();
})();
