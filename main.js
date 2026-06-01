/* global WORD_BANK, TOPIC_SECTIONS, TOPIC_GROUPS */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  const els = {
    statDeck: document.getElementById("statDeck"),
    statSaved: document.getElementById("statSaved"),
    statRemoved: document.getElementById("statRemoved"),
    hideCardBtn: document.getElementById("hideCardBtn"),
    saveBtn: document.getElementById("saveBtn"),
    saveToast: document.getElementById("saveToast"),
    topicDrop: document.getElementById("topicDrop"),
    topicDropBtn: document.getElementById("topicDropBtn"),
    topicDropMenu: document.getElementById("topicDropMenu"),
    topicDropLabel: document.getElementById("topicDropLabel"),

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
    mainTopic: "flash.es-en.mainTopic.v1",
  };

  let activeTopicId = "all";

  /** @type {number} */
  let saveToastClear = 0;

  const norm = (s) => String(s ?? "").trim();
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

  /** Preserves insertion order while de-duplicating on Spanish spelling. */
  function persistSavedCards(list) {
    const dedup = uniqBy(list.map(normalizeMemoryWord), keyOf);
    try {
      localStorage.setItem(STORAGE.saved, JSON.stringify(dedup));
    } catch {
      // ignore quota / blocked storage
    }
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
      .filter((w) => w.es && w.en);
    return uniqBy(cleaned, keyOf);
  }

  let bank = makeBank();
  let removed = loadRemoved();
  let current = null;

  function getAllTopics() {
    const sections = Array.isArray(window.TOPIC_SECTIONS) ? window.TOPIC_SECTIONS : [];
    return sections.flatMap((sec) => (Array.isArray(sec.topics) ? sec.topics : []));
  }

  function getTopicDef(id) {
    if (!id || id === "all") return null;
    const groups = Array.isArray(window.TOPIC_GROUPS) ? window.TOPIC_GROUPS : getAllTopics();
    return groups.find((t) => t.id === id) || null;
  }

  function wordMatchesTopic(w, topicDef) {
    if (!topicDef || !Array.isArray(topicDef.tags) || !topicDef.tags.length) return true;
    const tagSet = new Set(topicDef.tags.map((t) => norm(t).toLowerCase()).filter(Boolean));
    const tag = norm(w.tag || "").toLowerCase() || "general";
    return tagSet.has(tag);
  }

  function countForTopic(topicId) {
    const topicDef = getTopicDef(topicId);
    let n = 0;
    for (const w of bank) {
      if (removed.has(keyOf(w))) continue;
      if (topicId === "all" || wordMatchesTopic(w, topicDef)) n += 1;
    }
    return n;
  }

  /** Words available to study right now (topic + not hidden). */
  function activeDeck() {
    const topicDef = getTopicDef(activeTopicId);
    return bank.filter((w) => {
      if (removed.has(keyOf(w))) return false;
      if (activeTopicId === "all") return true;
      return wordMatchesTopic(w, topicDef);
    });
  }

  function topicDisplayLabel(topicId) {
    if (topicId === "all") return "All cards";
    const def = getTopicDef(topicId);
    return def?.label || topicId;
  }

  function updateTopicButtonLabel() {
    if (els.topicDropLabel) els.topicDropLabel.textContent = topicDisplayLabel(activeTopicId);
  }

  function closeTopicMenu() {
    if (!els.topicDrop || !els.topicDropMenu || !els.topicDropBtn) return;
    els.topicDropMenu.hidden = true;
    els.topicDrop.classList.remove("isOpen");
    els.topicDropBtn.setAttribute("aria-expanded", "false");
  }

  function openTopicMenu() {
    if (!els.topicDrop || !els.topicDropMenu || !els.topicDropBtn) return;
    els.topicDropMenu.hidden = false;
    els.topicDrop.classList.add("isOpen");
    els.topicDropBtn.setAttribute("aria-expanded", "true");
    const selected = els.topicDropMenu.querySelector(".topicDropItem.isSelected");
    if (selected) selected.focus({ preventScroll: true });
  }

  function toggleTopicMenu() {
    if (!els.topicDropMenu) return;
    if (els.topicDropMenu.hidden) openTopicMenu();
    else closeTopicMenu();
  }

  function appendTopicMenuItem(parent, topicId, label, count) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "topicDropItem";
    btn.dataset.topicId = topicId;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", topicId === activeTopicId ? "true" : "false");
    if (topicId === activeTopicId) btn.classList.add("isSelected");
    if (count === 0) btn.disabled = true;

    const labelSpan = document.createElement("span");
    labelSpan.className = "topicDropItemLabel";
    labelSpan.textContent = label;

    const countSpan = document.createElement("span");
    countSpan.className = "topicDropItemCount";
    countSpan.textContent = String(count);

    btn.append(labelSpan, countSpan);
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      closeTopicMenu();
      applyTopic(topicId);
    });
    parent.appendChild(btn);
  }

  function populateTopicMenu() {
    if (!els.topicDropMenu) return;

    const sections = Array.isArray(window.TOPIC_SECTIONS) ? window.TOPIC_SECTIONS : [];
    els.topicDropMenu.innerHTML = "";

    appendTopicMenuItem(els.topicDropMenu, "all", "All cards", countForTopic("all"));

    for (const sec of sections) {
      const topics = Array.isArray(sec.topics) ? sec.topics : [];
      if (!topics.length) continue;

      const heading = document.createElement("p");
      heading.className = "topicDropGroupLabel";
      heading.textContent = sec.title || "Topics";
      els.topicDropMenu.appendChild(heading);

      for (const t of topics) {
        appendTopicMenuItem(els.topicDropMenu, t.id, t.label || t.id, countForTopic(t.id));
      }
    }

    if (!getTopicDef(activeTopicId) && activeTopicId !== "all") {
      activeTopicId = "all";
    }
    updateTopicButtonLabel();
  }

  function persistTopic(id) {
    try {
      localStorage.setItem(STORAGE.mainTopic, id);
    } catch {
      // ignore
    }
  }

  function readInitialTopicId() {
    const fromUrl = norm(params.get("topic"));
    if (fromUrl) {
      if (fromUrl === "all") return "all";
      if (getTopicDef(fromUrl) && countForTopic(fromUrl) > 0) return fromUrl;
    }
    try {
      const saved = norm(localStorage.getItem(STORAGE.mainTopic));
      if (saved === "all") return "all";
      if (saved && getTopicDef(saved) && countForTopic(saved) > 0) return saved;
    } catch {
      // ignore
    }
    return "all";
  }

  function syncUrlTopic() {
    const url = new URL(window.location.href);
    if (activeTopicId === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", activeTopicId);
    window.history.replaceState({}, "", url);
  }

  function applyTopic(topicId) {
    activeTopicId = topicId === "all" || getTopicDef(topicId) ? topicId : "all";
    if (activeTopicId !== "all" && countForTopic(activeTopicId) === 0) {
      activeTopicId = "all";
    }
    persistTopic(activeTopicId);
    syncUrlTopic();
    populateTopicMenu();
    renderStats();
    showCard(pickWord({ shuffle: true }) || null);
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

  /** Add the visible card into the saved-memory list (Spanish key stays unique). */
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

  function setFlipped(flipped) {
    els.flashcardInner.classList.toggle("isFlipped", flipped);
    updateStepUi();
    els.flashcardHit.setAttribute("aria-expanded", String(flipped));
  }

  /** Flip English ↔ Spanish. Never advances the card. */
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
      els.textEn.textContent = "No cards in this deck.";
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

  /** → / mobile Next: first press shows Spanish; second press loads next card (English up). */
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
    populateTopicMenu();
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
    populateTopicMenu();
    showCard(pickWord({ shuffle: true, excludeId: id }) || pickWord({ shuffle: true }) || null);
  }

  function setupEvents() {
    if (els.topicDropBtn) {
      els.topicDropBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTopicMenu();
      });
    }
    document.addEventListener("click", (e) => {
      if (!els.topicDrop?.contains(e.target)) closeTopicMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTopicMenu();
    });

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
    bank = makeBank();
    removed = loadRemoved();
    activeTopicId = readInitialTopicId();
    populateTopicMenu();
    syncUrlTopic();
    renderStats();
    showCard(pickWord({ shuffle: true }) || activeDeck()[0] || null);
    updateStepUi();
  }

  start();
})();
