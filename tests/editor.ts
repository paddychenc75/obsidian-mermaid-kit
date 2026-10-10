import type { Editor, EditorPosition } from "obsidian";

/** The slice of `Editor` that inserting a diagram uses, over a plain array of lines. */
export function fakeEditor(text: string, line: number): Editor & { text(): string } {
  let lines = text.split("\n");
  let cursor: EditorPosition = { line, ch: 0 };
  const offset = (pos: EditorPosition) =>
    lines.slice(0, pos.line).reduce((sum, value) => sum + value.length + 1, 0) + pos.ch;
  const editor = {
    getCursor: () => cursor,
    setCursor: (pos: EditorPosition) => {
      cursor = pos;
    },
    getLine: (index: number) => lines[index] ?? "",
    lastLine: () => lines.length - 1,
    focus: () => {},
    replaceRange: (insert: string, from: EditorPosition, to: EditorPosition = from) => {
      const all = lines.join("\n");
      lines = (all.slice(0, offset(from)) + insert + all.slice(offset(to))).split("\n");
    },
    text: () => lines.join("\n"),
  };
  return editor as unknown as Editor & { text(): string };
}
