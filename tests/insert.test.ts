import assert from "node:assert/strict";
import { test } from "node:test";
import { insertDiagram } from "../src/insert";
import { fakeEditor } from "./editor";

const BODY = "flowchart TD\n  A --> B";

test("a blank line becomes the block and the cursor lands below it", () => {
  const editor = fakeEditor("para\n\nnext", 1);
  insertDiagram(editor, BODY);
  assert.equal(editor.text(), "para\n```mermaid\nflowchart TD\n  A --> B\n```\nnext");
  assert.deepEqual(editor.getCursor(), { line: 5, ch: 0 });
});

test("a line with text keeps it and gets the block after a blank line", () => {
  const editor = fakeEditor("para", 0);
  insertDiagram(editor, BODY);
  assert.equal(editor.text(), "para\n\n```mermaid\nflowchart TD\n  A --> B\n```\n");
  assert.deepEqual(editor.getCursor(), { line: 6, ch: 0 });
});

test("an open mermaid fence is filled in, not nested", () => {
  const editor = fakeEditor("```mermaid\n\n```\nafter", 1);
  insertDiagram(editor, BODY);
  assert.equal(editor.text(), "```mermaid\nflowchart TD\n  A --> B\n```\nafter");
  assert.deepEqual(editor.getCursor(), { line: 2, ch: 9 });
});

test("the opening fence line counts as inside the block", () => {
  const editor = fakeEditor("```mermaid\n```", 0);
  insertDiagram(editor, "gantt");
  assert.equal(editor.text(), "```mermaid\ngantt\n```");
});

test("a closed fence of another language does not swallow the block", () => {
  const editor = fakeEditor("```js\nx\n```\n", 3);
  insertDiagram(editor, "gantt");
  assert.equal(editor.text(), "```js\nx\n```\n```mermaid\ngantt\n```\n");
});

test("a closed mermaid fence above is not treated as open", () => {
  const editor = fakeEditor("```mermaid\npie\n```\n", 3);
  insertDiagram(editor, "gantt");
  assert.equal(editor.text(), "```mermaid\npie\n```\n```mermaid\ngantt\n```\n");
});
