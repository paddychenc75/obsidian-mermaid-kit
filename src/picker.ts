import { type App, Modal, getLanguage } from "obsidian";
import { t } from "./i18n";
import { drawDiagram } from "./render";
import { TEMPLATES, type Template } from "./templates";

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
    this.modalEl.addClass("mmk-picker");
    this.setTitle(t("pickerTitle"));

    this.search = this.contentEl.createEl("input", {
      cls: "mmk-picker-search",
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

    const grid = this.contentEl.createDiv({ cls: "mmk-picker-grid" });
    this.empty = this.contentEl.createDiv({ cls: "mmk-picker-empty", text: t("pickerEmpty") });
    this.empty.hide();

    for (const template of TEMPLATES) {
      // A div, not a <button>: themes paint every <button> with their own chrome.
      const card = grid.createDiv({ cls: "mmk-card", attr: { role: "button", tabindex: "0" } });
      card.createDiv({ cls: "mmk-thumb" });
      card.createSpan({ cls: "mmk-card-name", text: templateName(template) });
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
    const doc = this.modalEl.ownerDocument;
    for (const [template, card] of [...this.cards]) {
      if (!this.live) return;
      const figure = await drawDiagram(doc, template.body);
      if (!this.live) return;
      if (!figure) {
        card.remove();
        this.cards.delete(template);
        continue;
      }
      figure.removeAttribute("style");
      figure.setAttribute("width", "100%");
      figure.setAttribute("height", "100%");
      card.querySelector(".mmk-thumb")?.appendChild(figure);
    }
  }
}
