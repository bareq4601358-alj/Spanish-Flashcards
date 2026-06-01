/* global window, document, TOPIC_SECTIONS, TOPIC_GROUPS */
(() => {
  "use strict";

  const ROUND_SIZE = 5;
  const REPLACE_DELAY_MS = 260;
  const STORAGE_TOPIC = "flash.es-en.matchingTopic.v1";
  const STORAGE_CUSTOM = "flash.es-en.customWords.v1";

  const leftRoot = document.getElementById("matchLeft");
  const rightRoot = document.getElementById("matchRight");
  const toastEl = document.getElementById("matchToast");
  const correctEl = document.getElementById("matchCorrect");
  const mistakesEl = document.getElementById("matchMistakes");
  const resetBtn = document.getElementById("matchResetBtn");
  const topicSelect = document.getElementById("matchTopicSelect");
  const topicBlurb = document.getElementById("matchTopicBlurb");
  const topicPool = document.getElementById("matchTopicPool");
  const matchEmpty = document.getElementById("matchEmpty");
  const matchPlayArea = document.getElementById("matchPlayArea");

  if (
    !leftRoot ||
    !rightRoot ||
    !toastEl ||
    !correctEl ||
    !mistakesEl ||
    !resetBtn ||
    !topicSelect ||
    !topicBlurb ||
    !topicPool ||
    !matchEmpty ||
    !matchPlayArea
  ) {
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const norm = (s) => String(s ?? "").trim();
  const params = new URLSearchParams(window.location.search);

  /** @type {{ es: string, en: string, tag?: string }[]} */
  let fullBank = [];
  /** @type {Map<string, { es: string, en: string, tag?: string }>} */
  const bankById = new Map();
  /** @type {string[]} */
  let deckIds = [];
  /** @type {Set<string>} */
  let usedIds = new Set();

  let activeTopicId = "all";

  /** @type {{ leftOrder: string[], rightOrder: string[] }} */
  let round = { leftOrder: [], rightOrder: [] };

  /** @type {{ side: "left" | "right", idx: number, id: string } | null} */
  let selectedLeft = null;
  /** @type {{ side: "left" | "right", idx: number, id: string } | null} */
  let selectedRight = null;

  let locked = false;
  let correct = 0;
  let mistakes = 0;

  function setToast(msg) {
    toastEl.textContent = msg || "";
  }

  function primaryEn(text) {
    return typeof window.primaryEnglish === "function" ? window.primaryEnglish(text) : text;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function normalizeId(w) {
    const en = String(w.en || "").trim().toLowerCase();
    const es = String(w.es || "").trim().toLowerCase();
    return `${en}__${es}`;
  }

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadCustomWords() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE_CUSTOM) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((w) => ({
        es: norm(w.es),
        en: norm(w.en),
        tag: norm(w.tag || "") || "custom",
      }))
      .filter((w) => w.es && w.en);
  }

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
    for (const w of fullBank) {
      if (topicId === "all" || wordMatchesTopic(w, topicDef)) n += 1;
    }
    return n;
  }

  function buildFullBank() {
    const raw = Array.isArray(window.WORD_BANK) ? window.WORD_BANK : [];
    const custom = loadCustomWords();
    const merged = [...raw, ...custom]
      .filter((w) => w && typeof w.en === "string" && typeof w.es === "string")
      .map((w) => ({
        en: norm(w.en),
        es: norm(w.es),
        tag: norm(w.tag || "") || "general",
      }))
      .filter((w) => w.en && w.es);

    const seen = new Set();
    fullBank = [];
    for (const w of merged) {
      const id = normalizeId(w);
      if (seen.has(id)) continue;
      seen.add(id);
      fullBank.push(w);
    }
  }

  function rebuildBankMap() {
    bankById.clear();
    const topicDef = getTopicDef(activeTopicId);
    for (const w of fullBank) {
      if (activeTopicId !== "all" && !wordMatchesTopic(w, topicDef)) continue;
      const id = normalizeId(w);
      if (!bankById.has(id)) bankById.set(id, w);
    }
    deckIds = shuffle(Array.from(bankById.keys()));
    usedIds = new Set();
  }

  function updateTopicMeta() {
    const topicDef = getTopicDef(activeTopicId);
    const n = deckIds.length;

    if (activeTopicId === "all") {
      topicBlurb.textContent = "Every word in the bank — great for mixed practice.";
      topicPool.textContent = n ? `${n} words in pool` : "Loading…";
      return;
    }

    if (topicDef) {
      topicBlurb.textContent = topicDef.blurb || `Words tagged for ${topicDef.label || activeTopicId}.`;
      topicPool.textContent = n ? `${n} words in pool` : "No words in this topic";
      return;
    }

    topicBlurb.textContent = "Choose a topic to match words from that slice of the bank.";
    topicPool.textContent = "";
  }

  function setPlayEnabled(enabled) {
    matchEmpty.hidden = enabled;
    matchPlayArea.hidden = !enabled;
    resetBtn.disabled = !enabled;
    leftRoot.setAttribute("aria-disabled", enabled ? "false" : "true");
    rightRoot.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function populateTopicSelect() {
    const sections = Array.isArray(window.TOPIC_SECTIONS) ? window.TOPIC_SECTIONS : [];
    topicSelect.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = `All vocabulary (${countForTopic("all")})`;
    topicSelect.appendChild(allOpt);

    for (const sec of sections) {
      const topics = Array.isArray(sec.topics) ? sec.topics : [];
      if (!topics.length) continue;

      const og = document.createElement("optgroup");
      og.label = sec.title || "Topics";

      for (const t of topics) {
        const n = countForTopic(t.id);
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.label || t.id} (${n})`;
        if (n < ROUND_SIZE) opt.disabled = true;
        og.appendChild(opt);
      }

      topicSelect.appendChild(og);
    }

    topicSelect.value = activeTopicId;
    if (topicSelect.selectedIndex < 0) {
      activeTopicId = "all";
      topicSelect.value = "all";
    }
  }

  function persistTopic(id) {
    try {
      localStorage.setItem(STORAGE_TOPIC, id);
    } catch {
      // ignore
    }
  }

  function readInitialTopicId() {
    const fromUrl = norm(params.get("topic"));
    if (fromUrl) {
      if (fromUrl === "all") return "all";
      if (getTopicDef(fromUrl) && countForTopic(fromUrl) >= ROUND_SIZE) return fromUrl;
    }
    try {
      const saved = norm(localStorage.getItem(STORAGE_TOPIC));
      if (saved === "all") return "all";
      if (saved && getTopicDef(saved) && countForTopic(saved) >= ROUND_SIZE) return saved;
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

  function applyTopic(topicId, { resetScores = true } = {}) {
    activeTopicId = topicId;
    persistTopic(topicId);
    syncUrlTopic();

    rebuildBankMap();
    updateTopicMeta();

    const canPlay = deckIds.length >= ROUND_SIZE;
    setPlayEnabled(canPlay);

    if (!canPlay) {
      locked = true;
      clearSelections();
      setToast("");
      leftRoot.innerHTML = "";
      rightRoot.innerHTML = "";
      return;
    }

    locked = false;
    if (resetScores) {
      correct = 0;
      mistakes = 0;
      updateStats();
    }
    resetRound();
  }

  function onTopicSelectChange() {
    const id = topicSelect.value || "all";
    applyTopic(id, { resetScores: true });
  }

  function getNextId(excludeIds) {
    if (!deckIds.length) return null;

    if (usedIds.size > Math.max(ROUND_SIZE * 6, deckIds.length - 20)) usedIds = new Set();

    let tries = 0;
    while (tries < 1200) {
      const id = deckIds[Math.floor(Math.random() * deckIds.length)];
      tries++;
      if (excludeIds.has(id)) continue;
      if (usedIds.has(id)) continue;
      usedIds.add(id);
      return id;
    }
    return null;
  }

  function buildInitialRound() {
    const chosen = new Set();
    const ids = [];
    for (let i = 0; i < ROUND_SIZE; i++) {
      const next = getNextId(chosen);
      if (!next) break;
      chosen.add(next);
      ids.push(next);
    }

    while (ids.length < ROUND_SIZE && deckIds.length) {
      const id = deckIds[Math.floor(Math.random() * deckIds.length)];
      if (!chosen.has(id)) {
        chosen.add(id);
        ids.push(id);
      }
    }

    round.leftOrder = ids.slice(0, ROUND_SIZE);
    round.rightOrder = shuffle(ids.slice(0, ROUND_SIZE));
  }

  function clearSelections() {
    selectedLeft = null;
    selectedRight = null;
  }

  function updateStats() {
    correctEl.textContent = String(correct);
    mistakesEl.textContent = String(mistakes);
  }

  function render() {
    leftRoot.innerHTML = "";
    rightRoot.innerHTML = "";

    const leftFrag = document.createDocumentFragment();
    const rightFrag = document.createDocumentFragment();

    for (let i = 0; i < ROUND_SIZE; i++) {
      const leftId = round.leftOrder[i];
      const rightId = round.rightOrder[i];
      const leftWord = bankById.get(leftId);
      const rightWord = bankById.get(rightId);
      if (!leftWord || !rightWord) continue;

      leftFrag.appendChild(makeChoiceBtn("left", i, leftId, primaryEn(leftWord.en)));
      rightFrag.appendChild(makeChoiceBtn("right", i, rightId, rightWord.es));
    }

    leftRoot.appendChild(leftFrag);
    rightRoot.appendChild(rightFrag);

    syncSelectionClasses();
  }

  function makeChoiceBtn(side, idx, id, text) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "matchChoice";
    btn.dataset.side = side;
    btn.dataset.idx = String(idx);
    btn.dataset.id = id;

    const number = document.createElement("span");
    number.className = "matchNum";
    number.textContent = String(idx + 1);

    const label = document.createElement("span");
    label.className = "matchText";
    label.textContent = text;

    btn.appendChild(number);
    btn.appendChild(label);

    btn.addEventListener("click", () => onPick(side, idx));
    return btn;
  }

  function syncSelectionClasses() {
    const all = document.querySelectorAll(".matchChoice");
    for (const el of all) el.classList.remove("isSelected", "isCorrect", "isWrong", "isFading");

    if (selectedLeft) {
      const sel = leftRoot.querySelector(
        `.matchChoice[data-side="left"][data-idx="${selectedLeft.idx}"]`
      );
      if (sel) sel.classList.add("isSelected");
    }
    if (selectedRight) {
      const sel = rightRoot.querySelector(
        `.matchChoice[data-side="right"][data-idx="${selectedRight.idx}"]`
      );
      if (sel) sel.classList.add("isSelected");
    }
  }

  function markPairFeedback(isMatch) {
    const leftEl = selectedLeft
      ? leftRoot.querySelector(`.matchChoice[data-side="left"][data-idx="${selectedLeft.idx}"]`)
      : null;
    const rightEl = selectedRight
      ? rightRoot.querySelector(`.matchChoice[data-side="right"][data-idx="${selectedRight.idx}"]`)
      : null;

    if (!leftEl || !rightEl) return;

    if (isMatch) {
      leftEl.classList.add("isCorrect");
      rightEl.classList.add("isCorrect");
    } else {
      leftEl.classList.add("isWrong");
      rightEl.classList.add("isWrong");
      if (!prefersReducedMotion) {
        leftEl.classList.add("isShake");
        rightEl.classList.add("isShake");
        window.setTimeout(() => {
          leftEl.classList.remove("isShake");
          rightEl.classList.remove("isShake");
        }, 260);
      }
    }
  }

  function replaceMatchedPair(pairId) {
    const current = new Set([...round.leftOrder, ...round.rightOrder]);
    const next = getNextId(current);
    if (!next) return;

    const li = round.leftOrder.indexOf(pairId);
    if (li >= 0) round.leftOrder[li] = next;
    const ri = round.rightOrder.indexOf(pairId);
    if (ri >= 0) round.rightOrder[ri] = next;

    round.rightOrder = shuffle(round.rightOrder.slice(0, ROUND_SIZE));
  }

  function fadeOutSelected() {
    const leftEl = selectedLeft
      ? leftRoot.querySelector(`.matchChoice[data-side="left"][data-idx="${selectedLeft.idx}"]`)
      : null;
    const rightEl = selectedRight
      ? rightRoot.querySelector(`.matchChoice[data-side="right"][data-idx="${selectedRight.idx}"]`)
      : null;
    if (leftEl) leftEl.classList.add("isFading");
    if (rightEl) rightEl.classList.add("isFading");
  }

  function onPick(side, idx) {
    if (locked || matchPlayArea.hidden) return;
    if (idx < 0 || idx >= ROUND_SIZE) return;

    const id =
      side === "left" ? round.leftOrder[idx] : side === "right" ? round.rightOrder[idx] : null;
    if (!id) return;

    if (side === "left") selectedLeft = { side, idx, id };
    if (side === "right") selectedRight = { side, idx, id };

    syncSelectionClasses();

    if (!selectedLeft || !selectedRight) return;
    locked = true;

    const isMatch = selectedLeft.id === selectedRight.id;
    markPairFeedback(isMatch);

    if (isMatch) {
      correct++;
      updateStats();
      setToast("Correct!");
      fadeOutSelected();

      const matchedId = selectedLeft.id;
      window.setTimeout(
        () => {
          replaceMatchedPair(matchedId);
          clearSelections();
          render();
          locked = false;
          setToast("");
        },
        prefersReducedMotion ? 0 : REPLACE_DELAY_MS
      );
      return;
    }

    mistakes++;
    updateStats();
    setToast("Try again");
    window.setTimeout(
      () => {
        clearSelections();
        syncSelectionClasses();
        locked = false;
        setToast("");
      },
      prefersReducedMotion ? 0 : 420
    );
  }

  function onKeyDown(e) {
    if (e.defaultPrevented) return;
    if (locked || matchPlayArea.hidden) return;

    const k = e.key;
    if (!/^[1-5]$/.test(k)) return;
    const idx = Number(k) - 1;

    if (!selectedLeft) onPick("left", idx);
    else onPick("right", idx);

    e.preventDefault();
  }

  function resetRound() {
    if (deckIds.length < ROUND_SIZE) return;
    locked = false;
    clearSelections();
    setToast("");
    buildInitialRound();
    render();
  }

  function initFromBank() {
    buildFullBank();
    activeTopicId = readInitialTopicId();
    populateTopicSelect();
    topicSelect.value = activeTopicId;
    topicSelect.addEventListener("change", onTopicSelectChange);
    applyTopic(activeTopicId, { resetScores: true });
  }

  resetBtn.addEventListener("click", () => resetRound());
  document.addEventListener("keydown", onKeyDown);

  if (Array.isArray(window.WORD_BANK) && window.WORD_BANK.length) initFromBank();
  else window.addEventListener("wordbankready", initFromBank, { once: true });
})();
