/* global SENTENCE_BANK */
(() => {
  "use strict";

  const REMOVED_KEY = "flash.phrases.removed.v1";
  const CUSTOM_KEY = "flash.phrases.customSentences.v1";

  const els = {
    statTotal: document.getElementById("statTotal"),
    statPosition: document.getElementById("statPosition"),
    studyHint: document.getElementById("studyHint"),
    stepBtn: document.getElementById("stepBtn"),
    retrieveBtn: document.getElementById("retrieveBtn"),
    flashcardHit: document.getElementById("flashcardHit"),
    flashcardInner: document.getElementById("flashcardInner"),
    textEn: document.getElementById("textEn"),
    textEs: document.getElementById("textEs"),
    cornerTag: document.getElementById("cornerTag"),
  };

  const norm = (s) => String(s ?? "").trim();
  const keyOf = (r) => norm(r.es).toLowerCase();

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
    const raw = safeJsonParse(localStorage.getItem(CUSTOM_KEY) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => ({ es: norm(r.es), en: norm(r.en), tag: norm(r.tag || "") || "custom" }))
      .filter((r) => r.es && r.en);
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

  function loadRemovedKeysOrdered() {
    const raw = safeJsonParse(localStorage.getItem(REMOVED_KEY) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean);
  }

  function saveRemovedKeysOrdered(keys) {
    const out = [];
    const seen = new Set();
    for (const k of keys) {
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    try {
      localStorage.setItem(REMOVED_KEY, JSON.stringify(out));
    } catch {
      // ignore
    }
  }

  function buildHiddenList() {
    const bank = makeBank();
    const keys = loadRemovedKeysOrdered();
    return keys.map((k) => {
      const w = bank.find((x) => keyOf(x) === k);
      if (w) return { ...w, _key: k };
      return { es: k, en: "— (sentence not in bank)", tag: "hidden", _key: k };
    });
  }

  let cursor = 0;
  let current = null;

  function deck() {
    return buildHiddenList();
  }

  function showingSpanish() {
    return els.flashcardInner.classList.contains("isFlipped");
  }

  function updateStepUi() {
    const list = deck();
    const tot = list.length;
    const esp = showingSpanish();

    if (els.stepBtn) els.stepBtn.textContent = esp ? "Next ▸" : "Flip ▸";
    els.statTotal.textContent = String(tot);
    els.statPosition.textContent = tot === 0 ? "—" : `${Math.min(cursor + 1, tot)} / ${tot}`;

    if (els.retrieveBtn) els.retrieveBtn.disabled = tot === 0;

    if (els.studyHint) {
      if (tot === 0) {
        els.studyHint.textContent = "No hidden sentences. Hide cards from the sentence deck to see them here.";
      } else if (esp) {
        els.studyHint.textContent = "Spanish side · ← flips · → next · Retrieve adds back to sentence deck";
      } else {
        els.studyHint.textContent = "English side · ← or Flip · → shows Spanish · Retrieve restores to sentence deck";
      }
    }
  }

  function showAt(index, { preserveFlip = false } = {}) {
    const list = deck();
    if (!list.length) {
      cursor = 0;
      current = null;
      if (!preserveFlip) els.flashcardInner.classList.remove("isFlipped");
      els.textEn.textContent = "Nothing hidden.";
      els.textEs.textContent = "—";
      els.cornerTag.textContent = "—";
      els.flashcardHit.disabled = true;
      els.flashcardHit.setAttribute("aria-expanded", "false");
      updateStepUi();
      return;
    }

    const max = list.length - 1;
    const i = Math.min(Math.max(0, Number.isFinite(index) ? Math.floor(index) : 0), max);
    cursor = i;
    current = list[cursor];

    if (!preserveFlip) els.flashcardInner.classList.remove("isFlipped");
    els.flashcardHit.disabled = false;
    els.textEn.textContent = current.en;
    els.textEs.textContent = current.es;
    els.cornerTag.textContent = `hidden · ${cursor + 1}/${list.length}`;
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
    const list = deck();
    if (!list.length || !current) return;
    if (!showingSpanish()) {
      els.flashcardInner.classList.add("isFlipped");
    } else {
      const nextIdx = (cursor + 1) % list.length;
      showAt(nextIdx);
    }
    updateStepUi();
  }

  function retrieveCurrent() {
    const list = deck();
    if (!current || !list.length) return;
    const k = current._key || keyOf(current);
    const keys = loadRemovedKeysOrdered();
    const nextKeys = keys.filter((x) => x !== k);
    saveRemovedKeysOrdered(nextKeys);

    const nextList = buildHiddenList();
    if (!nextList.length) {
      showAt(0);
      return;
    }
    let nextIdx = cursor;
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
    if (els.retrieveBtn) els.retrieveBtn.addEventListener("click", retrieveCurrent);

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
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
        return;
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key !== REMOVED_KEY && e.key !== CUSTOM_KEY) return;
      const list = deck();
      if (!list.length) showAt(0);
      else if (cursor >= list.length) showAt(Math.max(0, list.length - 1));
      else showAt(cursor, { preserveFlip: showingSpanish() });
    });

    window.addEventListener("focus", () => {
      const list = deck();
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
