#!/usr/bin/env node
/**
 * Ensures every WORD_BANK tag appears in exactly one topic (topics-data.js).
 * Run: node verify-topic-tags.mjs
 */
import fs from "fs";
import vm from "vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("topics-data.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("wordbank.js", import.meta.url), "utf8"), ctx);

const bank = ctx.window.WORD_BANK;
const groups = ctx.window.TOPIC_GROUPS;

const allTopicTags = new Set();
const tagToTopic = new Map();
for (const g of groups) {
  for (const t of g.tags || []) {
    const k = String(t).trim().toLowerCase();
    if (!k) continue;
    allTopicTags.add(k);
    if (tagToTopic.has(k)) {
      console.error(`Tag "${k}" appears in more than one topic (${tagToTopic.get(k)}, ${g.id}).`);
      process.exit(1);
    }
    tagToTopic.set(k, g.id);
  }
}

const tagCounts = new Map();
for (const w of bank) {
  const tag = String(w.tag || "").trim().toLowerCase();
  tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
}

const orphans = [...tagCounts.keys()].filter((t) => !allTopicTags.has(t));
if (orphans.length) {
  console.error("Tags in wordbank.js with no topic in topics-data.js:", orphans.sort().join(", "));
  process.exit(1);
}

let sum = 0;
for (const g of groups) {
  const set = new Set((g.tags || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean));
  sum += bank.filter((w) => set.has(String(w.tag || "").trim().toLowerCase())).length;
}

if (sum !== bank.length) {
  console.error(`Topic membership sum ${sum} !== WORD_BANK length ${bank.length} (overlapping topic tag sets?).`);
  process.exit(1);
}

console.log(`OK: ${bank.length} words, ${tagCounts.size} distinct tags, each maps to one topic; no orphans.`);
