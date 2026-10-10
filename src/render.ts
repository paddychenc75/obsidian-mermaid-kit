import { loadMermaid } from "obsidian";

export interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
  mermaidAPI: { getSiteConfig(): Record<string, unknown> };
}

let renderCount = 0;

export async function mermaidApi(): Promise<MermaidApi> {
  return (await loadMermaid()) as MermaidApi;
}

/**
 * Draws `source` with the Mermaid build Obsidian ships. Null when that build cannot draw it.
 * The id is not a `mermaid-` one: the stage scan treats those as diagrams to wrap.
 */
export async function drawDiagram(doc: Document, source: string): Promise<SVGSVGElement | null> {
  const id = `mmk-draw-${++renderCount}`;
  let markup: string | null = null;
  try {
    markup = (await (await mermaidApi()).render(id, source)).svg;
  } catch {
    markup = null;
  }
  // Mermaid leaves its measuring nodes on <body> when a render fails.
  doc.querySelectorAll(`#${id}, #d${id}`).forEach((node) => node.remove());
  if (!markup) return null;
  const svg = new DOMParser().parseFromString(markup, "text/html").body.querySelector("svg");
  return svg ? doc.adoptNode(svg) : null;
}
