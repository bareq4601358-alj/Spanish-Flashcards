/* global SENTENCE_BANK */
(() => {
  "use strict";

  const STORAGE = {
    removed: "flash.phrases.removed.v1",
    customSentences: "flash.phrases.customSentences.v1",
  };

  const els = {
    statProgress: document.getElementById("statProgress"),
    statCorrect: document.getElementById("statCorrect"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    progressBar: document.getElementById("progressBar"),
    progressFill: document.getElementById("progressFill"),
    attemptPills: document.getElementById("attemptPills"),
    stepLabel: document.getElementById("stepLabel"),
    sentenceTag: document.getElementById("sentenceTag"),
    promptEn: document.getElementById("promptEn"),
    writeForm: document.getElementById("writeForm"),
    answerInput: document.getElementById("answerInput"),
    submitBtn: document.getElementById("submitBtn"),
    continueBtn: document.getElementById("continueBtn"),
    feedbackBlock: document.getElementById("feedbackBlock"),
    feedbackIcon: document.getElementById("feedbackIcon"),
    feedbackBadge: document.getElementById("feedbackBadge"),
    feedbackTitle: document.getElementById("feedbackTitle"),
    feedbackBody: document.getElementById("feedbackBody"),
    hintList: document.getElementById("hintList"),
    answerBox: document.getElementById("answerBox"),
    answerBoxText: document.getElementById("answerBoxText"),
    revealBtn: document.getElementById("revealBtn"),
  };

  const norm = (s) => String(s ?? "").trim();
  const keyOf = (row) => norm(row.es).toLowerCase();

  let deck = [];
  let index = 0;
  let wrongAttempts = 0;
  let sessionCorrect = 0;
  let locked = false;

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

  function makeBank() {
    const base = Array.isArray(window.SENTENCE_BANK) ? window.SENTENCE_BANK : [];
    const custom = loadCustomSentences();
    const seen = new Set();
    const out = [];
    for (const r of [...base, ...custom]) {
      const row = {
        es: norm(r.es),
        en: norm(r.en),
        tag: norm(r.tag || "") || "grammar",
      };
      const k = keyOf(row);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
    const removed = loadRemoved();
    return out.filter((r) => !removed.has(keyOf(r)));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Normalize for grading: ignore case, accents, spacing, and Spanish/western punctuation
   * (¿ ¡ ? ! periods, quotes, etc.).
   */
  function normalizeAnswer(text) {
    return norm(text)
      .toLowerCase()
      .normalize("NFKC")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\u00A0/g, " ")
      .replace(
        /[\u00BF\u00A1?!.,;:'"()[\]{}\u2010-\u2015\u2026\uFF01\uFF1F\u2047\u2048\u00AB\u00BB\u201C\u201D\u2018\u2019]/g,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();
  }

  function answersMatch(userText, correctEs) {
    const u = normalizeAnswer(userText);
    const c = normalizeAnswer(correctEs);
    return Boolean(u && c && u === c);
  }

  function tokenize(text) {
    return norm(text)
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
  }

  function wordKey(w) {
    return normalizeAnswer(w);
  }

  function wordsMatch(a, b) {
    return wordKey(a) === wordKey(b);
  }

  /** Spelling matches except accents (or ¿ on the same word). */
  function needsAccentHint(userW, correctW) {
    if (wordKey(userW) !== wordKey(correctW)) return false;
    return norm(userW) !== norm(correctW);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const curr = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = curr;
    }
    return prev[n];
  }

  function answerSimilarity(userText, correctEs) {
    const u = normalizeAnswer(userText);
    const c = normalizeAnswer(correctEs);
    if (!u || !c) return 0;
    const d = levenshtein(u, c);
    return 1 - d / Math.max(u.length, c.length);
  }

  function countWordsFoundAnywhere(userWords, correctWords) {
    const keys = new Set(correctWords.map(wordKey));
    let n = 0;
    for (const w of userWords) {
      if (keys.has(wordKey(w))) n += 1;
    }
    return n;
  }

  function prefixMatchLen(userWords, correctWords) {
    let n = 0;
    for (let i = 0; i < Math.min(userWords.length, correctWords.length); i++) {
      if (wordsMatch(userWords[i], correctWords[i])) n += 1;
      else break;
    }
    return n;
  }

  /** Sentence skeleton: correct words shown, rest as blanks. */
  function buildScaffold(correctWords, solidThrough, revealCount) {
    const solidEnd = Math.min(solidThrough + revealCount, correctWords.length);
    return correctWords
      .map((w, i) => {
        if (i < solidThrough) return w;
        if (i < solidEnd) return w;
        return "___";
      })
      .join(" ");
  }

  function wordsStillNeeded(userWords, correctWords) {
    if (userWords.length >= correctWords.length) return "";
    const chunk = correctWords.slice(userWords.length, userWords.length + 3);
    const more = correctWords.length - userWords.length - chunk.length;
    const tail = chunk.join(" ");
    return more > 0 ? `${tail} …` : tail;
  }

  /**
   * Strong hints for the second try — scaffold, correct words, missing tail.
   * @returns {{ lead: string, items: string[] }}
   */
  function buildHint(userText, correctEs) {
    const userWords = tokenize(userText);
    const correctWords = tokenize(correctEs);
    const sim = answerSimilarity(userText, correctEs);
    const prefixLen = prefixMatchLen(userWords, correctWords);
    const items = [];

    let lead = "Second try — use this help";
    if (sim >= 0.82) lead = "Almost there — one more pass";
    else if (sim >= 0.5) lead = "Close — fill in the gaps below";

    const revealCount = sim >= 0.75 ? 2 : sim >= 0.4 ? 3 : Math.min(4, correctWords.length - prefixLen);
    if (correctWords.length) {
      items.push(`Build it like this: ${buildScaffold(correctWords, prefixLen, Math.max(1, revealCount))}`);
    }

    const limit = Math.min(userWords.length, correctWords.length);
    for (let i = prefixLen; i < limit; i++) {
      const uw = userWords[i];
      const cw = correctWords[i];
      if (needsAccentHint(uw, cw)) {
        items.push(`Word ${i + 1} — use exactly: ${cw}`);
        break;
      }
      if (!wordsMatch(uw, cw)) {
        items.push(`Word ${i + 1} should be: ${cw} (not “${uw}”)`);
        break;
      }
    }

    const tail = wordsStillNeeded(userWords, correctWords);
    if (tail && items.length < 4) {
      items.push(`Then add: ${tail}`);
    }

    if (items.length < 4 && userWords.length > correctWords.length) {
      items.push(`Full answer is only ${correctWords.length} words — drop the extra`);
    }

    if (items.length < 4) {
      const foundAnywhere = countWordsFoundAnywhere(userWords, correctWords);
      if (foundAnywhere >= 2 && foundAnywhere > prefixLen) {
        items.push(`Right words, wrong order — start with: ${correctWords.slice(0, Math.min(4, correctWords.length)).join(" ")}`);
      }
    }

    if (items.length < 4 && /^¿/.test(correctEs) && !norm(userText).startsWith("¿")) {
      items.push(`Question — start with: ${correctWords.slice(0, Math.min(3, correctWords.length)).join(" ")}`);
    } else if (items.length < 4 && /^¡/.test(correctEs) && !norm(userText).startsWith("¡")) {
      items.push(`Exclamation — start with: ${correctWords.slice(0, Math.min(3, correctWords.length)).join(" ")}`);
    }

    if (items.length < 4 && sim < 0.35 && correctWords.length >= 2) {
      items.push(`Opening: ${correctWords.slice(0, Math.min(5, correctWords.length)).join(" ")}`);
    }

    const deduped = [];
    const seen = new Set();
    for (const line of items) {
      if (seen.has(line)) continue;
      seen.add(line);
      deduped.push(line);
    }

    return { lead, items: deduped.slice(0, 3) };
  }

  const COACH_LABEL = { hint: "Hint", success: "Correct", answer: "Answer" };

  function updateProgressBar() {
    const total = deck.length;
    const pct = total ? Math.round((index / total) * 100) : 0;
    if (els.progressFill) els.progressFill.style.width = `${pct}%`;
    if (els.progressBar) {
      els.progressBar.setAttribute("aria-valuenow", String(pct));
      els.progressBar.setAttribute("aria-valuetext", total ? `Sentence ${index + 1} of ${total}` : "");
    }
  }

  function updateAttemptPills() {
    if (!els.attemptPills) return;
    const pills = els.attemptPills.querySelectorAll(".writeAttempt");
    pills.forEach((pill, i) => {
      const left = 2 - wrongAttempts;
      pill.classList.toggle("isActive", i < left);
      pill.classList.toggle("isSpent", i >= left && wrongAttempts > 0);
    });
  }

  function setRevealVisible(on) {
    if (!els.revealBtn) return;
    els.revealBtn.hidden = !on;
    els.revealBtn.disabled = !on;
  }

  function setFeedback(kind, title, body, answerText, hintItems, opts = {}) {
    const { answerOnly = false, showReveal = false } = opts;

    els.feedbackBlock.hidden = false;
    els.feedbackBlock.className = "writeCoach";
    if (kind) els.feedbackBlock.classList.add(`writeCoach--${kind}`);
    els.feedbackBlock.classList.toggle("writeCoach--answerOnly", answerOnly);

    const showChrome = !answerOnly;
    if (els.feedbackIcon) {
      els.feedbackIcon.hidden = !showChrome;
      if (showChrome) {
        els.feedbackIcon.className = "writeCoachIcon";
        if (kind) els.feedbackIcon.classList.add(`writeCoachIcon--${kind}`);
      }
    }
    if (els.feedbackBadge) {
      els.feedbackBadge.hidden = !showChrome;
      if (showChrome) els.feedbackBadge.textContent = COACH_LABEL[kind] || "Note";
    }
    if (answerOnly) {
      els.feedbackTitle.textContent = "";
      els.feedbackTitle.hidden = true;
      if (els.answerBox) els.answerBox.hidden = false;
      if (els.answerBoxText) els.answerBoxText.textContent = title;
    } else {
      els.feedbackTitle.hidden = false;
      els.feedbackTitle.textContent = title;
      if (els.answerBox) els.answerBox.hidden = true;
      if (els.answerBoxText) els.answerBoxText.textContent = "";
    }

    const list = !answerOnly && hintItems && hintItems.length ? hintItems : null;
    if (els.hintList) {
      els.hintList.innerHTML = "";
      if (list) {
        for (const text of list) {
          const li = document.createElement("li");
          li.textContent = text;
          els.hintList.appendChild(li);
        }
        els.hintList.hidden = false;
      } else {
        els.hintList.hidden = true;
      }
    }

    const useBody = Boolean(body) && (!list || answerOnly);
    els.feedbackBody.textContent = useBody ? body : "";
    els.feedbackBody.hidden = !useBody;

    setRevealVisible(showReveal);
  }

  function clearFeedback() {
    els.feedbackBlock.hidden = true;
    els.feedbackBlock.className = "writeCoach";
    if (els.feedbackIcon) els.feedbackIcon.className = "writeCoachIcon";
    if (els.feedbackBadge) {
      els.feedbackBadge.textContent = "Hint";
      els.feedbackBadge.hidden = false;
    }
    if (els.feedbackIcon) els.feedbackIcon.hidden = false;
    els.feedbackBlock.classList.remove("writeCoach--answerOnly");
    els.feedbackTitle.textContent = "";
    els.feedbackTitle.hidden = false;
    els.feedbackBody.textContent = "";
    if (els.hintList) {
      els.hintList.innerHTML = "";
      els.hintList.hidden = true;
    }
    if (els.answerBox) els.answerBox.hidden = true;
    if (els.answerBoxText) els.answerBoxText.textContent = "";
    els.answerInput?.classList.remove("writeInput--nudge");
    setRevealVisible(false);
  }

  function renderStats() {
    const total = deck.length;
    const pos = total ? Math.min(index + 1, total) : 0;
    els.statProgress.textContent = total ? `${pos} / ${total}` : "—";
    els.statCorrect.textContent = String(sessionCorrect);
    updateProgressBar();
    updateAttemptPills();
  }

  function currentRow() {
    return deck[index] || null;
  }

  function setInputEnabled(on) {
    els.answerInput.disabled = !on;
    els.submitBtn.disabled = !on;
    if (on) {
      els.submitBtn.textContent = wrongAttempts === 0 ? "Check" : "Try again";
    }
  }

  function nudgeInput() {
    els.answerInput?.classList.remove("writeInput--nudge");
    void els.answerInput?.offsetWidth;
    els.answerInput?.classList.add("writeInput--nudge");
  }

  function showSentence() {
    const row = currentRow();
    wrongAttempts = 0;
    locked = false;
    clearFeedback();
    els.continueBtn.hidden = true;
    setInputEnabled(true);

    if (!row) {
      els.stepLabel.textContent = "Done";
      els.sentenceTag.textContent = "—";
      els.promptEn.textContent = "No sentences in your deck. Add sentences on the Sentences page or restore hidden ones.";
      els.answerInput.value = "";
      els.answerInput.disabled = true;
      els.submitBtn.disabled = true;
      renderStats();
      return;
    }

    els.stepLabel.textContent = `Sentence ${index + 1}`;
    els.sentenceTag.textContent = row.tag;
    els.promptEn.textContent = row.en;
    els.answerInput.value = "";
    renderStats();
    window.requestAnimationFrame(() => {
      try {
        els.answerInput.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    });
  }

  function advanceSentence() {
    if (!deck.length) return;
    index = (index + 1) % deck.length;
    showSentence();
  }

  function handleCorrect() {
    sessionCorrect += 1;
    locked = true;
    setInputEnabled(false);
    setFeedback("success", "Well done", "Next sentence in a moment.", "", null);
    renderStats();
    window.setTimeout(() => advanceSentence(), 1400);
  }

  function handleFirstWrong(row, userText) {
    wrongAttempts = 1;
    updateAttemptPills();
    nudgeInput();
    const hint = buildHint(userText, row.es);
    setFeedback("hint", hint.lead, "", "", hint.items, { showReveal: true });
    renderStats();
    els.answerInput.focus();
  }

  function revealAnswer() {
    const row = currentRow();
    if (!row || locked || wrongAttempts !== 1) return;
    handleSecondWrong(row);
  }

  function handleSecondWrong(row) {
    wrongAttempts = 2;
    updateAttemptPills();
    nudgeInput();
    locked = true;
    setInputEnabled(false);
    setFeedback("answer", row.es, "Press Continue for the next sentence.", "", null, { answerOnly: true });
    els.continueBtn.hidden = false;
    renderStats();
  }

  function checkAnswer() {
    const row = currentRow();
    if (!row || locked) return;

    const user = els.answerInput.value;
    if (!norm(user)) {
      setFeedback("hint", "Enter your translation", "Type the Spanish sentence, then press Check.", "", null);
      els.answerInput.focus();
      return;
    }

    if (answersMatch(user, row.es)) {
      handleCorrect();
      return;
    }

    if (wrongAttempts === 0) {
      handleFirstWrong(row, user);
      return;
    }

    handleSecondWrong(row);
  }

  function reshuffleDeck() {
    deck = shuffle(makeBank());
    index = 0;
    sessionCorrect = 0;
    showSentence();
  }

  function setupEvents() {
    els.writeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      checkAnswer();
    });

    els.continueBtn.addEventListener("click", () => {
      advanceSentence();
    });

    els.revealBtn?.addEventListener("click", revealAnswer);

    els.shuffleBtn.addEventListener("click", reshuffleDeck);

    els.answerInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!locked) checkAnswer();
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE.removed && e.key !== STORAGE.customSentences) return;
      deck = shuffle(makeBank());
      if (index >= deck.length) index = 0;
      showSentence();
    });
  }

  function start() {
    setupEvents();
    deck = shuffle(makeBank());
    index = 0;
    showSentence();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
