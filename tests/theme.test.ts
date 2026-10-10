import assert from "node:assert/strict";
import { test } from "node:test";
import { luminance, mix } from "../src/theme";

test("mix lays an amount of one colour over another", () => {
  assert.deepEqual(mix([255, 0, 0], [0, 0, 255], 1), [255, 0, 0]);
  assert.deepEqual(mix([255, 0, 0], [0, 0, 255], 0), [0, 0, 255]);
  assert.deepEqual(mix([200, 100, 0], [0, 100, 200], 0.5), [100, 100, 100]);
});

test("luminance tells a light colour from a dark one", () => {
  assert.equal(luminance([0, 0, 0]), 0);
  assert.ok(Math.abs(luminance([255, 255, 255]) - 1) < 1e-9);
  assert.ok(luminance([250, 220, 60]) > 0.55);
  assert.ok(luminance([40, 60, 200]) < 0.55);
});
