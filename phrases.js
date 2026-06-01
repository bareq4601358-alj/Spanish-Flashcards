/* global SENTENCE_BANK */
(() => {
  "use strict";

  const els = {
    statDeck: document.getElementById("statDeck"),
    statSaved: document.getElementById("statSaved"),
    statRemoved: document.getElementById("statRemoved"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    hideCardBtn: document.getElementById("hideCardBtn"),
    saveBtn: document.getElementById("saveBtn"),
    saveToast: document.getElementById("saveToast"),

    stepBtn: document.getElementById("stepBtn"),

    flashcardHit: document.getElementById("flashcardHit"),
    flashcardInner: document.getElementById("flashcardInner"),
    textEn: document.getElementById("textEn"),
    textEs: document.getElementById("textEs"),
    deckTag: document.getElementById("deckTag"),
  };

  const STORAGE = {
    customSentences: "flash.phrases.customSentences.v1",
    removed: "flash.phrases.removed.v1",
    saved: "flash.phrases.saved.v1",
  };

  /** @type {number} */
  let saveToastClear = 0;

  const norm = (s) => String(s ?? "").trim();
  const keyOf = (row) => norm(row.es).toLowerCase();

  const uniqBy = (arr, getKey) => {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const k = getKey(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadCustomSentences() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.customSentences) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => ({ es: norm(r.es), en: norm(r.en), tag: norm(r.tag || "") || "custom" }))
      .filter((r) => r.es && r.en);
  }

  function loadRemoved() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.removed) ?? "", []);
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean));
  }

  function saveRemoved(removedSet) {
    try {
      localStorage.setItem(STORAGE.removed, JSON.stringify(Array.from(removedSet)));
    } catch {
      // ignore
    }
  }

  function normalizeSavedRow(r) {
    return {
      es: norm(r.es),
      en: norm(r.en),
      tag: norm(r.tag || "") || "saved",
    };
  }

  function loadSavedCards() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.saved) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeSavedRow).filter((r) => r.es && r.en);
  }

  function persistSavedCards(list) {
    const dedup = uniqBy(list.map(normalizeSavedRow), keyOf);
    try {
      localStorage.setItem(STORAGE.saved, JSON.stringify(dedup));
    } catch {
      // ignore
    }
  }

  function makeBank() {
    const base = Array.isArray(SENTENCE_BANK) ? SENTENCE_BANK : [];
    const custom = loadCustomSentences();
    const cleaned = [...base, ...custom]
      .map((r) => ({
        es: norm(r.es),
        en: norm(r.en),
        tag: norm(r.tag || "") || "grammar",
      }))
      .filter((r) => r.es && r.en);
    return uniqBy(cleaned, keyOf);
  }

  let bank = makeBank();
  let removed = loadRemoved();
  let current = null;

  function activeDeck() {
    return bank.filter((r) => !removed.has(keyOf(r)));
  }

  function renderStats() {
    const deck = activeDeck();
    els.statDeck.textContent = String(deck.length);
    els.statSaved.textContent = String(loadSavedCards().length);
    els.statRemoved.textContent = String(removed.size);
  }

  function showSaveToast(message) {
    if (!els.saveToast) return;
    if (saveToastClear) window.clearTimeout(saveToastClear);
    els.saveToast.textContent = message;
    saveToastClear = window.setTimeout(() => {
      els.saveToast.textContent = "";
      saveToastClear = 0;
    }, 2000);
  }

  function saveCurrentToMemoryBank() {
    if (!current) return;
    const incoming = normalizeSavedRow({
      es: current.es,
      en: current.en,
      tag: current.tag || "grammar",
    });
    const list = loadSavedCards();
    const id = keyOf(incoming);
    if (list.some((r) => keyOf(r) === id)) {
      showSaveToast("Already in saved sentences.");
      return;
    }
    list.push(incoming);
    persistSavedCards(list);
    renderStats();
    showSaveToast("Saved to sentence bank.");
  }

  function showingSpanish() {
    return els.flashcardInner.classList.contains("isFlipped");
  }

  function setFlipped(flipped) {
    els.flashcardInner.classList.toggle("isFlipped", flipped);
    updateStepUi();
    els.flashcardHit.setAttribute("aria-expanded", String(flipped));
  }

  function flipFacesOnly() {
    if (!current) return;
    els.flashcardInner.classList.toggle("isFlipped");
    updateStepUi();
    els.flashcardHit.setAttribute("aria-expanded", String(showingSpanish()));
  }

  function updateStepUi() {
    const esp = showingSpanish();
    if (els.stepBtn) els.stepBtn.textContent = esp ? "Next ▸" : "Flip ▸";
  }

  function pickRow({ shuffle = false, excludeId = "" } = {}) {
    const rows = activeDeck();
    if (!rows.length) return null;
    let pool = rows;
    if (excludeId && pool.length > 1) pool = pool.filter((r) => keyOf(r) !== excludeId);
    if (!pool.length) return rows[Math.floor(Math.random() * rows.length)];
    if (shuffle) return pool[Math.floor(Math.random() * pool.length)];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showCard(row) {
    current = row;
    els.flashcardInner.classList.remove("isFlipped");
    updateStepUi();

    if (!row) {
      els.textEn.textContent = "No sentences left in this deck.";
      els.textEs.textContent = "Restore some from Hidden, or clear your browser data to reset.";
      els.deckTag.textContent = "—";
      els.flashcardHit.disabled = true;
      renderStats();
      return;
    }
    els.flashcardHit.disabled = false;
    els.textEn.textContent =
      typeof window.primaryEnglish === "function" ? window.primaryEnglish(row.en) : row.en;
    els.textEs.textContent = row.es;
    els.deckTag.textContent = row.tag;
    renderStats();
    try {
      els.flashcardHit.focus({ preventScroll: true });
    } catch {
      // ignore
    }
  }

  function stepForwardFromRightArrow() {
    if (!current) return;
    if (!els.flashcardInner.classList.contains("isFlipped")) {
      els.flashcardInner.classList.add("isFlipped");
      updateStepUi();
      els.flashcardHit.setAttribute("aria-expanded", "true");
      return;
    }
    showCard(pickRow({ shuffle: false, excludeId: keyOf(current) }) || pickRow({ shuffle: true }));
  }

  function shuffleCard() {
    showCard(pickRow({ shuffle: true }) || current);
  }

  function refreshAll() {
    bank = makeBank();
    renderStats();
  }

  function reloadRemovedFromStorage() {
    removed = loadRemoved();
    renderStats();
  }

  function removeCurrentPermanently() {
    if (!current) return;
    const id = keyOf(current);
    if (!id) return;
    removed.add(id);
    saveRemoved(removed);
    renderStats();
    showCard(pickRow({ shuffle: true, excludeId: id }) || pickRow({ shuffle: true }) || null);
  }

  function setupEvents() {
    els.shuffleBtn.addEventListener("click", shuffleCard);
    if (els.stepBtn) els.stepBtn.addEventListener("click", stepForwardFromRightArrow);
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
        stepForwardFromRightArrow();
      });
    }
    if (els.saveBtn) els.saveBtn.addEventListener("click", saveCurrentToMemoryBank);
    if (els.hideCardBtn) els.hideCardBtn.addEventListener("click", removeCurrentPermanently);

    els.flashcardHit.addEventListener("click", (e) => {
      e.preventDefault();
      flipFacesOnly();
    });

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE.removed || e.key === STORAGE.customSentences) reloadRemovedFromStorage();
    });

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
        removeCurrentPermanently();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForwardFromRightArrow();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        saveCurrentToMemoryBank();
      }
    });
  }

  function start() {
    setupEvents();
    refreshAll();
    showCard(pickRow({ shuffle: true }) || activeDeck()[0] || null);
    updateStepUi();
  }

  start();
})();
