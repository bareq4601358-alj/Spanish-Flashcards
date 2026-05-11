/* global WORD_BANK, TOPIC_GROUPS */
(() => {
  "use strict";

  const groups = Array.isArray(window.TOPIC_GROUPS) ? window.TOPIC_GROUPS : [];
  const root = document.getElementById("topicButtons");
  const intro = document.getElementById("topicHubIntro");
  if (!root || !groups.length) return;

  function norm(s) {
    return String(s ?? "").trim();
  }

  function countForTopic(tags) {
    const set = new Set(tags.map((t) => norm(t).toLowerCase()).filter(Boolean));
    const bank = Array.isArray(window.WORD_BANK) ? window.WORD_BANK : [];
    let n = 0;
    for (const w of bank) {
      const tag = norm(w.tag || "").toLowerCase() || "general";
      if (set.has(tag)) n += 1;
    }
    return n;
  }

  function render() {
    root.innerHTML = "";
    for (const t of groups) {
      const n = countForTopic(t.tags || []);
      const a = document.createElement("a");
      a.className = "topicPickCard btn ghost";
      a.href = `./topic.html?id=${encodeURIComponent(t.id)}`;
      a.innerHTML = `<span class="topicPickTitle">${escapeHtml(t.label)}</span><span class="topicPickMeta muted">${n} cards</span><span class="topicPickBlurb">${escapeHtml(t.blurb || "")}</span>`;
      root.appendChild(a);
    }
    if (intro) intro.textContent = "Choose a topic — same save/hide behavior as the main deck.";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
