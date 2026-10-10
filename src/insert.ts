import type { Editor } from "obsidian";

const FENCE = /^\s*(`{3,}|~{3,})\s*(\S*)/;

/** Whether `line` sits in a ```mermaid block that is still open there, opening fence included. */
function insideMermaidFence(editor: Editor, line: number): boolean {
  let open: { mark: string; lang: string } | null = null;
  for (let index = 0; index <= line; index++) {
    const match = FENCE.exec(editor.getLine(index));
    if (!match) continue;
    const mark = match[1] ?? "";
    const lang = match[2] ?? "";
    if (!open) open = { mark, lang: lang.toLowerCase() };
    else if (!lang && mark[0] === open.mark[0] && mark.length >= open.mark.length) open = null;
  }
  return open?.lang === "mermaid";
}

/**
 * Drops a diagram on its own lines at the cursor. In an open ```mermaid block it fills in the
 * body only, so typing the fence first and picking a template afterwards does not nest fences.
 * The cursor ends below a new block, which lets Live Preview draw it straight away.
 */
export function insertDiagram(editor: Editor, body: string): void {
  const at = editor.getCursor().line;
  const current = editor.getLine(at);
  const inside = insideMermaidFence(editor, at);
  const text = inside ? body : `\`\`\`mermaid\n${body}\n\`\`\``;

  let first = at;
  if (current.trim() === "") {
    editor.replaceRange(text, { line: at, ch: 0 }, { line: at, ch: current.length });
  } else {
    const gap = inside ? "\n" : "\n\n";
    editor.replaceRange(gap + text, { line: at, ch: current.length });
    first = at + gap.length;
  }

  const last = first + text.split("\n").length - 1;
  const end = { line: last, ch: editor.getLine(last).length };
  if (inside) {
    editor.setCursor(end);
  } else {
    if (last === editor.lastLine()) editor.replaceRange("\n", end);
    editor.setCursor({ line: last + 1, ch: 0 });
  }
  editor.focus();
}
