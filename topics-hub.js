/* global WORD_BANK, TOPIC_SECTIONS */
(() => {
  "use strict";

  const sections = Array.isArray(window.TOPIC_SECTIONS) ? window.TOPIC_SECTIONS : [];
  const root = document.getElementById("topicHubSections");
  const intro = document.getElementById("topicHubIntro");
  if (!root) return;

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

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    root.innerHTML = "";
    if (!sections.length) return;

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
        const n = countForTopic(t.tags || []);
        const a = document.createElement("a");
        a.className = "topicPickCard btn ghost";
        a.href = `./topic.html?id=${encodeURIComponent(t.id)}`;
        a.innerHTML = `<span class="topicPickTitle">${escapeHtml(t.label)}</span><span class="topicPickMeta muted">${n} cards</span><span class="topicPickBlurb">${escapeHtml(t.blurb || "")}</span>`;
        grid.appendChild(a);
      }

      sectionEl.appendChild(head);
      sectionEl.appendChild(grid);
      root.appendChild(sectionEl);
    }

    if (intro) {
      intro.textContent =
        "Topics are grouped below. Each opens a filtered deck — your full main deck is unchanged.";
    }
  }

  function escapeAttrId(s) {
    return String(s ?? "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 48);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
