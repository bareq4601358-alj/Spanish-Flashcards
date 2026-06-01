/* global window */
(() => {
  "use strict";

  /**
   * English for the card face — show what is stored in the bank.
   * Use parentheses and " / " in wordbank.js only when they clarify meaning
   * (e.g. "they (feminine)", "to do / to make"); omit them when the word is obvious.
   */
  window.primaryEnglish = function primaryEnglish(text) {
    return String(text ?? "").trim().replace(/\s{2,}/g, " ");
  };
})();
