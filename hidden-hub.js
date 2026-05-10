(() => {
  "use strict";

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function countKeys(storageKey) {
    const raw = safeJsonParse(localStorage.getItem(storageKey) ?? "", []);
    if (!Array.isArray(raw)) return 0;
    return new Set(raw.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean)).size;
  }

  const elW = document.getElementById("countWords");
  const elS = document.getElementById("countSentences");
  if (elW) elW.textContent = String(countKeys("flash.es-en.removed.v1"));
  if (elS) elS.textContent = String(countKeys("flash.phrases.removed.v1"));
})();
