import { type App, type MarkdownPostProcessorContext, MarkdownView } from "obsidian";

export interface SourceRef {
  /** The diagram definition, without its fence. */
  text: string;
  /** Puts the cursor in the block. Null where the block cannot be edited in place. */
  edit: (() => void) | null;
}

const FENCE_OPEN = /^([\s>]*)(`{3,}|~{3,})\s*mermaid\b/i;
const FENCE_CLOSE = /^[\s>]*(`{3,}|~{3,})\s*$/;

const sections = new WeakMap<HTMLElement, MarkdownPostProcessorContext>();

/** Called from the post processor: the context is the only way back to a section's lines. */
export function rememberSection(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
  sections.set(el, ctx);
}

/** Cuts the definition out of the lines of a fenced block. Null unless they are one Mermaid fence. */
export function fenceBody(lines: string[]): string | null {
  const open = FENCE_OPEN.exec(lines[0] ?? "");
  if (!open || lines.length < 2 || !FENCE_CLOSE.test(lines[lines.length - 1] ?? "")) return null;
  // A block inside a list or a quote carries that prefix on every line.
  const prefix = open[1] ?? "";
  return lines
    .slice(1, -1)
    .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : line.trimStart()))
    .join("\n");
}

function viewOf(app: App, host: HTMLElement): MarkdownView | null {
  let found: MarkdownView | null = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (!found && leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(host)) {
      found = leaf.view;
    }
  });
  return found;
}

interface Located {
  lines: string[];
  start: number;
  /** Whether `start` is a line of the note shown in the view, not of an embedded one. */
  own: boolean;
}

function fromSection(host: HTMLElement, view: MarkdownView | null): Located | null {
  for (let el: HTMLElement | null = host; el; el = el.parentElement) {
    const ctx = sections.get(el);
    const info = ctx?.getSectionInfo(el);
    if (!ctx || !info) continue;
    return {
      lines: info.text.split("\n").slice(info.lineStart, info.lineEnd + 1),
      start: info.lineStart,
      own: ctx.sourcePath === view?.file?.path,
    };
  }
  return null;
}

/** Live Preview fallback: the widget sits at its block's opening fence in the editor document. */
function fromEditor(host: HTMLElement, view: MarkdownView | null): Located | null {
  if (!view || view.getMode() !== "source") return null;
  const editor = view.editor;
  const cm = (editor as { cm?: { posAtDOM(node: Node): number } }).cm;
  if (!cm) return null;
  let start: number;
  try {
    start = editor.offsetToPos(cm.posAtDOM(host)).line;
  } catch {
    return null;
  }
  // An embedded note sits at its `![[link]]` line, which is not a fence: no guessing from there.
  if (!FENCE_OPEN.test(editor.getLine(start))) return null;
  for (let end = start + 1; end <= editor.lastLine(); end++) {
    if (!FENCE_CLOSE.test(editor.getLine(end))) continue;
    const lines: string[] = [];
    for (let line = start; line <= end; line++) lines.push(editor.getLine(line));
    return { lines, start, own: true };
  }
  return null;
}

/** Finds the definition behind a rendered diagram. Null when it cannot be traced with certainty. */
export function locateSource(app: App, host: HTMLElement): SourceRef | null {
  const view = viewOf(app, host);
  const located = fromSection(host, view) ?? fromEditor(host, view);
  if (!located) return null;
  const text = fenceBody(located.lines);
  if (text === null) return null;

  const editable = !!view && located.own && view.getMode() === "source";
  const indent = FENCE_OPEN.exec(located.lines[0] ?? "")?.[1]?.length ?? 0;
  return {
    text,
    edit: editable
      ? () => {
          view.editor.setCursor({ line: located.start + 1, ch: indent });
          view.editor.focus();
        }
      : null,
  };
}
