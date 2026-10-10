import assert from "node:assert/strict";
import { test } from "node:test";
import { fenceBody } from "../src/source";

test("the body is what sits between the fences", () => {
  assert.equal(fenceBody(["```mermaid", "flowchart TD", "  A --> B", "```"]), "flowchart TD\n  A --> B");
});

test("tilde fences and longer fences work", () => {
  assert.equal(fenceBody(["~~~~mermaid", "pie", "~~~~"]), "pie");
});

test("a list indent or a quote prefix is taken off every line", () => {
  assert.equal(fenceBody(["  ```mermaid", "  pie", '    "a": 1', "  ```"]), 'pie\n  "a": 1');
  assert.equal(fenceBody(["> ```mermaid", "> pie", "> ```"]), "pie");
});

test("anything that is not one closed mermaid fence is refused", () => {
  assert.equal(fenceBody(["```js", "x", "```"]), null);
  assert.equal(fenceBody(["```mermaid", "pie"]), null);
  assert.equal(fenceBody(["![[note]]"]), null);
  assert.equal(fenceBody([]), null);
});
