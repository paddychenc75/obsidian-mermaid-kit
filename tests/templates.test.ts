import assert from "node:assert/strict";
import { test } from "node:test";
import { TEMPLATES } from "../src/templates";

test("template ids are unique", () => {
  const ids = TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every template has a name in each language and a body that cannot break a fence", () => {
  for (const template of TEMPLATES) {
    for (const name of Object.values(template.name)) assert.ok(name.trim(), template.id);
    assert.ok(template.body.trim(), template.id);
    assert.equal(template.body, template.body.trim(), `${template.id}: stray outer whitespace`);
    assert.ok(!/^\s*(```|~~~)/m.test(template.body), `${template.id}: contains a fence`);
  }
});
