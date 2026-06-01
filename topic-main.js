/* global WORD_BANK, TOPIC_GROUPS */
(() => {
  "use strict";

  const norm = (s) => String(s ?? "").trim();
  const params = new URLSearchParams(window.location.search);
  const topicId = norm(params.get("id"));
  const groups = Array.isArray(window.TOPIC_GROUPS) ? window.TOPIC_GROUPS : [];
  const topicDef = groups.find((g) => g.id === topicId);

  if (!topicDef || !Array.isArray(topicDef.tags) || !topicDef.tags.length) {
    window.location.replace("./topics.html");
    return;
  }

  const topicTagSet = new Set(topicDef.tags.map((t) => norm(t).toLowerCase()).filter(Boolean));
  const topicLabel = topicDef.label || "Topic";

  const heading = document.getElementById("topicStudyHeading");
  const sub = document.getElementById("topicStudySubtitle");
  if (heading) heading.textContent = topicLabel;
  document.title = `${topicLabel} · English · Spanish`;
  if (sub) {
    sub.innerHTML = `Studying <strong>${escapeAttr(topicLabel)}</strong> only. Your full vocabulary list is unchanged on <a class="muted inlineLink" href="./index.html">Main deck</a>.`;
  }

  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  const els = {
    statDeck: document.getElementById("statDeck"),
    statSaved: document.getElementById("statSaved"),
    statRemoved: document.getElementById("statRemoved"),
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
    customWords: "flash.es-en.customWords.v1",
    removed: "flash.es-en.removed.v1",
    saved: "flash.es-en.saved.v1",
  };

  /** @type {number} */
  let saveToastClear = 0;

  const keyOf = (w) => norm(w.es).toLowerCase();
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

  function loadCustomWords() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.customWords) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((w) => ({ es: norm(w.es), en: norm(w.en), tag: norm(w.tag || "") || "custom" }))
      .filter((w) => w.es && w.en);
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

  function normalizeMemoryWord(w) {
    return {
      es: norm(w.es),
      en: norm(w.en),
      tag: norm(w.tag || "") || "saved",
    };
  }

  function loadSavedCards() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.saved) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeMemoryWord).filter((w) => w.es && w.en);
  }

  function persistSavedCards(list) {
    const dedup = uniqBy(list.map(normalizeMemoryWord), keyOf);
    try {
      localStorage.setItem(STORAGE.saved, JSON.stringify(dedup));
    } catch {
      // ignore
    }
  }

  function wordMatchesTopic(w) {
    const tag = norm(w.tag || "").toLowerCase() || "general";
    return topicTagSet.has(tag);
  }

  function makeBank() {
    const base = Array.isArray(WORD_BANK) ? WORD_BANK : [];
    const custom = loadCustomWords();
    const cleaned = [...base, ...custom]
      .map((w) => ({
        es: norm(w.es),
        en: norm(w.en),
        tag: norm(w.tag || "") || "general",
      }))
      .filter((w) => w.es && w.en && wordMatchesTopic(w));
    return uniqBy(cleaned, keyOf);
  }

  let bank = makeBank();
  let removed = loadRemoved();
  let current = null;

  function activeDeck() {
    return bank.filter((w) => !removed.has(keyOf(w)));
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
    const incoming = normalizeMemoryWord({
      es: current.es,
      en: current.en,
      tag: current.tag || "general",
    });
    const list = loadSavedCards();
    const id = keyOf(incoming);
    if (list.some((w) => keyOf(w) === id)) {
      showSaveToast("Already in saved deck.");
      return;
    }
    list.push(incoming);
    persistSavedCards(list);
    renderStats();
    showSaveToast("Saved to memory bank.");
  }

  function showingSpanish() {
    return els.flashcardInner.classList.contains("isFlipped");
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

  function pickWord({ shuffle = false, excludeId = "" } = {}) {
    const words = activeDeck();
    if (!words.length) return null;
    let pool = words;
    if (excludeId && pool.length > 1) pool = pool.filter((w) => keyOf(w) !== excludeId);
    if (!pool.length) return words[Math.floor(Math.random() * words.length)];
    if (shuffle) return pool[Math.floor(Math.random() * pool.length)];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  function showCard(word) {
    current = word;
    els.flashcardInner.classList.remove("isFlipped");
    updateStepUi();

    if (!word) {
      els.textEn.textContent = "No cards in this topic (or all hidden).";
      els.textEs.textContent = "—";
      els.deckTag.textContent = "—";
      els.flashcardHit.disabled = true;
      return;
    }
    els.flashcardHit.disabled = false;
    els.textEn.textContent =
      typeof window.primaryEnglish === "function" ? window.primaryEnglish(word.en) : word.en;
    els.textEs.textContent = word.es;
    els.deckTag.textContent = word.tag;
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
    showCard(pickWord({ shuffle: false, excludeId: keyOf(current) }) || pickWord({ shuffle: true }));
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
    showCard(pickWord({ shuffle: true, excludeId: id }) || pickWord({ shuffle: true }) || null);
  }

  function setupEvents() {
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
      if (e.key === STORAGE.removed || e.key === STORAGE.customWords) reloadRemovedFromStorage();
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
    showCard(pickWord({ shuffle: true }) || activeDeck()[0] || null);
    updateStepUi();
  }

  start();
})();
