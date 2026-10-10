import { type App, Modal, getLanguage, loadMermaid } from "obsidian";
import { t } from "./i18n";
import { TEMPLATES, type Template } from "./templates";

interface MermaidApi {
  render(id: string, source: string): Promise<{ svg: string }>;
}

let renderCount = 0;

function templateName(template: Template): string {
  const language = getLanguage();
  return language === "zh" || language === "zh-TW" ? template.name[language] : template.name.en;
}

/** A grid of diagram types, each drawn from its own template. One click inserts it. */
export class TemplatePicker extends Modal {
  private cards = new Map<Template, HTMLElement>();
  private search!: HTMLInputElement;
  private empty!: HTMLElement;
  private live = false;

  constructor(
    app: App,
    private onPick: (template: Template) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.live = true;
    this.modalEl.addClass("lmm-picker");
    this.setTitle(t("pickerTitle"));

    this.search = this.contentEl.createEl("input", {
      cls: "lmm-picker-search",
      type: "search",
      attr: { placeholder: t("pickerSearch"), "aria-label": t("pickerSearch") },
    });
    this.search.addEventListener("input", () => this.filter());
    this.search.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      const first = TEMPLATES.find((template) => this.cards.get(template)?.isShown());
      if (first) this.pick(first);
    });

    const grid = this.contentEl.createDiv({ cls: "lmm-picker-grid" });
    this.empty = this.contentEl.createDiv({ cls: "lmm-picker-empty", text: t("pickerEmpty") });
    this.empty.hide();

    for (const template of TEMPLATES) {
      // A div, not a <button>: themes paint every <button> with their own chrome.
      const card = grid.createDiv({ cls: "lmm-card", attr: { role: "button", tabindex: "0" } });
      card.createDiv({ cls: "lmm-thumb" });
      card.createSpan({ cls: "lmm-card-name", text: templateName(template) });
      card.addEventListener("click", () => this.pick(template));
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.pick(template);
      });
      this.cards.set(template, card);
    }

    this.search.focus();
    void this.drawThumbnails();
  }

  onClose(): void {
    this.live = false;
    this.cards.clear();
    this.contentEl.empty();
  }

  private pick(template: Template): void {
    this.close();
    this.onPick(template);
  }

  private filter(): void {
    const words = this.search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const [template, card] of this.cards) {
      const haystack = `${template.id} ${Object.values(template.name).join(" ")} ${template.keywords}`.toLowerCase();
      const match = words.every((word) => haystack.includes(word));
      card.toggle(match);
      if (match) shown++;
    }
    this.empty.toggle(shown === 0);
  }

  /**
   * Draws every card with the Mermaid build Obsidian ships. A type that build cannot draw
   * loses its card, so the picker never offers a template that would insert a broken diagram.
   */
  private async drawThumbnails(): Promise<void> {
    let mermaid: MermaidApi;
    try {
      mermaid = (await loadMermaid()) as MermaidApi;
    } catch {
      return;
    }
    const doc = this.modalEl.ownerDocument;
    for (const [template, card] of [...this.cards]) {
      if (!this.live) return;
      // Not a `mermaid-` id: the stage scan treats those as diagrams to wrap.
      const id = `lmm-tpl-${++renderCount}`;
      let svg: string | null = null;
      try {
        svg = (await mermaid.render(id, template.body)).svg;
      } catch {
        svg = null;
      }
      // Mermaid leaves its measuring nodes on <body> when a render fails.
      doc.querySelectorAll(`#${id}, #d${id}`).forEach((node) => node.remove());
      if (!this.live) return;

      const figure = svg
        ? new DOMParser().parseFromString(svg, "text/html").body.querySelector("svg")
        : null;
      if (!figure) {
        card.remove();
        this.cards.delete(template);
        continue;
      }
      figure.removeAttribute("style");
      figure.setAttribute("width", "100%");
      figure.setAttribute("height", "100%");
      card.querySelector(".lmm-thumb")?.appendChild(figure);
    }
  }
}
