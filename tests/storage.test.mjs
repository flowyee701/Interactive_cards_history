import assert from "node:assert/strict";

const store = new Map();

globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  }
};

const { getBestScore, saveBestScore } = await import("../src/services/storage.js");

assert.equal(getBestScore(), 0);

store.set("interactive-history.best-score", "7");
assert.equal(getBestScore("all"), 7);
assert.equal(getBestScore("1950-е"), 0);

assert.equal(saveBestScore(4, "1950-е"), 4);
assert.equal(getBestScore("1950-е"), 4);

assert.equal(saveBestScore(3, "1950-е"), 4);
assert.equal(getBestScore("1950-е"), 4);

assert.equal(saveBestScore(8, "all"), 8);
assert.equal(getBestScore("all"), 8);

store.set("interactive-history.best-score.1960-е", "not-a-number");
assert.equal(getBestScore("1960-е"), 0);

console.log("storage tests passed");
