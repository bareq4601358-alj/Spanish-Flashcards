#!/usr/bin/env node
/**
 * Validates WORD_BANK and SENTENCE_BANK integrity.
 * Run: node verify-wordbank.mjs
 */
import fs from "fs";
import vm from "vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("english-display.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("wordbank.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("sentence-bank.js", import.meta.url), "utf8"), ctx);

const bank = ctx.window.WORD_BANK || [];
const sentences = ctx.window.SENTENCE_BANK || [];
const primaryEnglish = ctx.window.primaryEnglish;

let failed = false;
const fail = (msg) => {
  console.error(msg);
  failed = true;
};

for (let i = 0; i < bank.length; i++) {
  const w = bank[i];
  const es = String(w?.es ?? "").trim();
  const en = String(w?.en ?? "").trim();
  const tag = String(w?.tag ?? "").trim();
  if (!es || !en) fail(`Word #${i}: missing es/en (${JSON.stringify(w)})`);
  if (!tag) fail(`Word #${i}: missing tag for "${es}"`);
  if (!primaryEnglish(en)) fail(`Word #${i}: blank display English for "${es}"`);
}

const esSeen = new Set();
for (const w of bank) {
  const k = String(w.es).trim().toLowerCase();
  if (esSeen.has(k)) fail(`Duplicate Spanish after bank dedup: "${w.es}"`);
  esSeen.add(k);
}

const enToEs = new Map();
for (const w of bank) {
  const enk = String(w.en).trim().toLowerCase();
  const esk = String(w.es).trim().toLowerCase();
  if (enToEs.has(enk) && enToEs.get(enk) !== esk) {
    const plain = String(w.en).trim();
    if (!plain.includes("(") && !plain.includes("/")) {
      fail(`Ambiguous English "${w.en}" maps to "${enToEs.get(enk)}" and "${esk}" — add (hint) in wordbank.js`);
    }
  } else {
    enToEs.set(enk, esk);
  }
}

for (let i = 0; i < sentences.length; i++) {
  const s = sentences[i];
  if (!String(s?.es ?? "").trim() || !String(s?.en ?? "").trim()) {
    fail(`Sentence #${i}: missing es/en`);
  }
}

if (failed) process.exit(1);
console.log(`OK: ${bank.length} words, ${sentences.length} sentences — structure and disambiguation checks passed.`);
