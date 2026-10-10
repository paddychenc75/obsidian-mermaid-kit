import assert from "node:assert/strict";
import { test } from "node:test";
import { containScale, panRange } from "../src/geometry";

test("a diagram that fits the padded frame is pinned to the centre", () => {
  assert.deepEqual(panRange(600, 200, 12), [200, 200]);
});

test("a diagram that overflows travels until an edge clears the pad", () => {
  assert.deepEqual(panRange(600, 1000, 12), [-412, 12]);
});

test("the two cases meet without a jump", () => {
  assert.deepEqual(panRange(600, 576, 12), [12, 12]);
  const [min, max] = panRange(600, 577, 12);
  assert.equal(max, 12);
  assert.equal(min, 11);
});

test("contain takes the tighter axis and leaves the pad free", () => {
  const limits = { min: 0.15, max: 8 };
  assert.equal(containScale({ w: 1024, h: 524 }, { w: 500, h: 500 }, 12, limits), 1);
  assert.equal(containScale({ w: 524, h: 1024 }, { w: 1000, h: 500 }, 12, limits), 0.5);
});

test("contain respects the cap and the zoom floor", () => {
  assert.equal(containScale({ w: 2000, h: 2000 }, { w: 100, h: 100 }, 0, { min: 0.15, max: 1.5 }), 1.5);
  assert.equal(containScale({ w: 100, h: 100 }, { w: 10000, h: 10000 }, 0, { min: 0.15, max: 8 }), 0.15);
});
