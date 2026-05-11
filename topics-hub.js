/* global WORD_BANK, TOPIC_SECTIONS */
(() => {
  "use strict";

  const root = document.getElementById("topicHubSections");
  const intro = document.getElementById("topicHubIntro");
  if (!root) return;

  function norm(s) {
    return String(s == null ? "" : s).trim();
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

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttrId(s) {
    return String(s == null ? "" : s)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 48);
  }

  function bankReady() {
    return Array.isArray(window.WORD_BANK) && window.WORD_BANK.length > 0;
  }

  function render() {
    const sections = Array.isArray(window.TOPIC_SECTIONS) ? window.TOPIC_SECTIONS : [];
    root.innerHTML = "";

    if (!sections.length) {
      if (intro) {
        intro.textContent =
          "Topic list failed to load (missing or blocked topics-data.js). Try a hard refresh, or open Main deck from the header.";
      }
      return;
    }

    const ready = bankReady();

    for (const sec of sections) {
      const topics = Array.isArray(sec.topics) ? sec.topics : [];
      if (!topics.length) continue;

      const sectionEl = document.createElement("section");
      sectionEl.className = "topicSection";
      sectionEl.setAttribute("aria-labelledby", `topicSec-${escapeAttrId(sec.id || "sec")}`);

      const head = document.createElement("header");
      head.className = "topicSectionHead";

      const h2 = document.createElement("h2");
      h2.className = "topicSectionTitle";
      h2.id = `topicSec-${escapeAttrId(sec.id || "sec")}`;
      h2.textContent = sec.title || "Topics";

      head.appendChild(h2);
      if (norm(sec.subtitle)) {
        const p = document.createElement("p");
        p.className = "topicSectionSubtitle muted";
        p.textContent = sec.subtitle;
        head.appendChild(p);
      }

      const grid = document.createElement("div");
      grid.className = "topicSectionGrid";

      for (const t of topics) {
        const n = ready ? countForTopic(t.tags || []) : null;
        const countLabel = n === null ? "…" : `${n} cards`;
        const a = document.createElement("a");
        a.className = "topicPickCard btn ghost";
        a.href = `./topic.html?id=${encodeURIComponent(t.id)}`;
        a.innerHTML = `<span class="topicPickTitle">${escapeHtml(t.label)}</span><span class="topicPickMeta muted">${countLabel}</span><span class="topicPickBlurb">${escapeHtml(t.blurb || "")}</span>`;
        grid.appendChild(a);
      }

      sectionEl.appendChild(head);
      sectionEl.appendChild(grid);
      root.appendChild(sectionEl);
    }

    if (intro) {
      if (ready) {
        intro.textContent =
          "Topics are grouped below. Each opens a filtered deck — your full main deck is unchanged.";
      } else {
        intro.textContent =
          "Loading word bank… Topics appear below; card counts fill in as soon as the deck is ready.";
      }
    }
  }

  window.addEventListener("wordbankready", render);

  window.addEventListener("load", () => {
    if (bankReady()) return;
    if (intro && Array.isArray(window.TOPIC_SECTIONS) && window.TOPIC_SECTIONS.length) {
      intro.textContent =
        "The word list did not finish loading (wordbank.js). Try a hard refresh or check your connection.";
    }
  });

  render();
})();
