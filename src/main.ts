import { type Editor, MarkdownView, Notice, Plugin, addIcon } from "obsidian";
import { MermaidCanvas, unwrapHost } from "./canvas";
import { MARK, RETRY_DELAYS } from "./constants";
import { measureSvg } from "./dom";
import { t } from "./i18n";
import { ICON_ID, ICON_SVG } from "./icon";
import { insertDiagram } from "./insert";
import { drawDiagram, mermaidApi } from "./render";
import { DEFAULT_SETTINGS, type Settings, SettingsTab } from "./settings";
import { type DiagramTheme, diagramTheme, drawnWith } from "./theme";
import { locateSource, rememberSection } from "./source";
import { TemplatePicker } from "./picker";

const TEARDOWN_KEY = "__mmkTeardown";
const DIAGRAMS = '.mermaid svg, svg[id^="mermaid-"]';
const OWN_CHROME = ".mmk-viewport, .mmk-fs, .mmk-bar, .mmk-picker";
// Chrome from Lumen Stage, or from a build of this plugin before the class prefix changed.
// It is about to be torn down by its owner, or is still owned by it; either way, not ours to wrap.
const LEGACY_CHROME = ".lmm-viewport, .lmm-fs, .lmm-bar";

type TeardownWindow = Window & { [TEARDOWN_KEY]?: number };

/** `pending` means the diagram is not ready to wrap yet and the scan should come back. */
type Outcome = "done" | "skip" | "pending";

export default class MermaidKitPlugin extends Plugin {
  views = new Set<MermaidCanvas>();
  observers = new Map<Document, MutationObserver>();
  private scanQueued = false;
  private retry = 0;
  private retryTimer = 0;
  private picker: TemplatePicker | null = null;
  settings: Settings = DEFAULT_SETTINGS;
  /** The theme diagrams are being drawn with, or null while Mermaid keeps its stock palette. */
  private theme: DiagramTheme | null = null;
  /** Mermaid's configuration as Obsidian set it, kept to hand back. */
  private stockConfig: Record<string, unknown> | null = null;
  private styleTimer = 0;

  private onPointerOver = (event: PointerEvent): void => {
    // Safety net: a diagram the scan missed is wrapped as soon as the pointer reaches it.
    const target = event.target as Node | null;
    if (!target?.instanceOf(Element)) return;
    const host = target.closest(".mermaid");
    if (!host || host.hasClass("mmk-host") || host.closest(OWN_CHROME) || host.hasClass("lmm-host")) return;
    const svg = host.querySelector("svg");
    if (svg) this.process(svg);
  };

  async onload(): Promise<void> {
    this.cancelDeferredTeardown();
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<Settings> | null) };
    this.addSettingTab(new SettingsTab(this.app, this, this));
    this.app.workspace.onLayoutReady(() => void this.applyStyle());
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        // Theme and snippet reloads arrive in bursts; one pass after they settle is enough.
        window.clearTimeout(this.styleTimer);
        this.styleTimer = window.setTimeout(() => void this.applyStyle(), 250);
      }),
    );

    this.app.workspace.onLayoutReady(() => this.scan());
    const queue = () => this.queueScan();
    this.registerEvent(this.app.workspace.on("layout-change", queue));
    this.registerEvent(this.app.workspace.on("active-leaf-change", queue));
    this.registerEvent(this.app.workspace.on("window-open", queue));
    this.registerEvent(this.app.workspace.on("window-close", queue));
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        window.setTimeout(() => this.scan(), 200);
      }),
    );

    this.syncDocuments();

    this.registerMarkdownPostProcessor((el, ctx) => {
      rememberSection(el, ctx);
      window.setTimeout(() => {
        if (this.scanWithin(el)) this.scheduleRetry(true);
      }, 220);
    });

    this.addCommand({
      id: "fullscreen-first-diagram",
      name: t("cmdFullscreen"),
      callback: () => this.fullscreenFirst(),
    });

    addIcon(ICON_ID, ICON_SVG);
    this.addRibbonIcon(ICON_ID, t("insert"), () => this.pickTemplate());
    this.addCommand({
      id: "insert-diagram",
      name: t("insert"),
      icon: ICON_ID,
      editorCallback: (editor) => this.pickTemplate(editor),
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        menu.addItem((item) =>
          item
            .setTitle(t("insert"))
            .setIcon(ICON_ID)
            .onClick(() => this.pickTemplate(editor)),
        );
      }),
    );
  }

  onunload(): void {
    this.picker?.close();
    window.clearTimeout(this.styleTimer);
    void this.restoreStock();
    window.clearTimeout(this.retryTimer);
    const docs = [...this.observers.keys()];
    for (const doc of docs) this.unobserve(doc);
    for (const view of this.views) view.detach();
    this.views.clear();
    for (const overlay of [...MermaidCanvas.overlays]) overlay.destroy();
    this.scheduleDeferredTeardown(docs);
  }

  cancelDeferredTeardown(): void {
    const win = window as TeardownWindow;
    if (win[TEARDOWN_KEY]) {
      win.clearTimeout(win[TEARDOWN_KEY]);
      delete win[TEARDOWN_KEY];
    }
  }

  scheduleDeferredTeardown(docs: Document[]): void {
    const win = window as TeardownWindow;
    win.clearTimeout(win[TEARDOWN_KEY]);
    win[TEARDOWN_KEY] = win.setTimeout(() => {
      delete win[TEARDOWN_KEY];
      for (const doc of docs) {
        doc.querySelectorAll(".mmk-fs").forEach((node) => node.remove());
        doc.querySelectorAll(".mermaid.mmk-host").forEach((node) => {
          if (node.instanceOf(HTMLElement)) unwrapHost(node);
        });
      }
    }, 80);
  }

  /** The main window plus every pop-out window that holds a workspace leaf. */
  documents(): Set<Document> {
    const docs = new Set<Document>([document]);
    this.app.workspace.iterateAllLeaves((leaf) => {
      docs.add(leaf.view.containerEl.ownerDocument);
    });
    return docs;
  }

  syncDocuments(): void {
    const docs = this.documents();
    for (const doc of [...this.observers.keys()]) {
      if (!docs.has(doc)) this.unobserve(doc);
    }
    for (const doc of docs) {
      if (!this.observers.has(doc)) this.observe(doc);
    }
  }

  observe(doc: Document): void {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!node.instanceOf(HTMLElement) && !node.instanceOf(SVGElement)) continue;
          if (node.closest(OWN_CHROME)) continue;
          this.retry = 0;
          this.queueScan();
          return;
        }
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    doc.addEventListener("pointerover", this.onPointerOver);
    this.observers.set(doc, observer);
  }

  unobserve(doc: Document): void {
    this.observers.get(doc)?.disconnect();
    doc.removeEventListener("pointerover", this.onPointerOver);
    this.observers.delete(doc);
  }

  adoptExisting(doc: Document): void {
    doc.querySelectorAll(".mermaid.mmk-host").forEach((node) => {
      if (!node.instanceOf(HTMLElement)) return;
      // The overlay is owned by the canvas that opened it; adopting it would add a second
      // controller and strand the opener with a fullscreen it can never close.
      if (node.closest(".mmk-fs")) return;
      if ([...this.views].some((view) => view.host === node)) return;
      const adopted = MermaidCanvas.adopt(node, { source: () => locateSource(this.app, node) });
      if (adopted) this.views.add(adopted);
    });
  }

  /** Obsidian re-renders diagrams wholesale; drop the canvases it left behind. */
  prune(): void {
    for (const view of this.views) {
      if (view.fullscreen || view.viewport.isConnected) continue;
      view.detach();
      this.views.delete(view);
    }
  }

  queueScan(): void {
    if (this.scanQueued) return;
    this.scanQueued = true;
    window.setTimeout(() => {
      this.scanQueued = false;
      this.scan();
    }, 80);
  }

  scheduleRetry(pending: boolean): void {
    if (!pending) {
      this.retry = 0;
      return;
    }
    if (this.retryTimer || this.retry >= RETRY_DELAYS.length) return;
    const delay = RETRY_DELAYS[this.retry++] ?? 1000;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = 0;
      this.scan();
    }, delay);
  }

  scan(): void {
    this.syncDocuments();
    this.prune();
    let pending = false;
    for (const doc of this.observers.keys()) {
      this.adoptExisting(doc);
      if (this.scanWithin(doc.body)) pending = true;
    }
    this.scheduleRetry(pending);
  }

  /** Returns true when a diagram was found that is not ready to wrap yet. */
  scanWithin(root: ParentNode | null): boolean {
    if (!root || !("querySelectorAll" in root)) return false;
    let pending = false;
    root.querySelectorAll(DIAGRAMS).forEach((svg) => {
      if (this.process(svg) === "pending") pending = true;
    });
    return pending;
  }

  process(node: Element): Outcome {
    if (!node.instanceOf(SVGSVGElement)) return "skip";
    // Covers the wrapped diagram, the overlay, and the toolbar's own icon SVGs.
    if (node.closest(OWN_CHROME)) return "skip";
    if (node.closest(LEGACY_CHROME)) return "pending";
    const host = node.closest(".mermaid");
    if (!host?.instanceOf(HTMLElement)) return "skip";
    // Obsidian measures a diagram in a scratch .mermaid on <body>, then moves the result into
    // the note. Wrapping the scratch copy would be thrown away, or worse, copied as dead markup.
    if (!host.isConnected || host.parentElement === host.ownerDocument.body) return "pending";
    if (!node.viewBox?.baseVal?.width) return "pending";
    const size = measureSvg(node);
    if (!size || size.w < 40 || size.h < 20) return "pending";

    if (host.hasClass("mmk-host")) {
      // The host was re-rendered in place: clear the chrome that belonged to the old diagram.
      for (const view of this.views) {
        if (view.host !== host) continue;
        view.detach();
        this.views.delete(view);
      }
      host.querySelectorAll(":scope > .mmk-bar, :scope > .mmk-viewport").forEach((el) => el.remove());
    }

    node.setAttribute(MARK, "1");
    try {
      const view = new MermaidCanvas(node, { source: () => locateSource(this.app, host) });
      this.views.add(view);
      // Obsidian may have drawn this one before the theme was in place.
      if (this.theme && !drawnWith(node, this.theme)) void this.redraw(view);
    } catch (error) {
      node.removeAttribute(MARK);
      console.error("Mermaid Kit: could not enhance a Mermaid diagram", error);
      return "skip";
    }
    return "done";
  }

  async updateSettings(change: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...change };
    await this.saveData(this.settings);
    await this.applyStyle();
  }

  /**
   * Points Mermaid at the current theme's colours, or back at its stock palette, and redraws
   * the staged diagrams when that changed anything.
   */
  async applyStyle(): Promise<void> {
    const mermaid = await mermaidApi();
    const next = this.settings.matchTheme ? diagramTheme(document) : null;
    for (const doc of this.documents()) doc.body.toggleClass("mmk-themed", !!next);
    if (JSON.stringify(next) === JSON.stringify(this.theme)) return;

    if (!this.stockConfig) {
      const { themeVariables: _variables, themeCSS: _css, ...stock } = mermaid.mermaidAPI.getSiteConfig();
      // Kept by reference: the configuration holds functions, so it cannot be cloned.
      this.stockConfig = stock;
    }
    mermaid.initialize(next ? { ...this.stockConfig, ...next } : this.stockConfig);
    this.theme = next;
    for (const view of [...this.views, ...MermaidCanvas.overlays]) void this.redraw(view);
  }

  async restoreStock(): Promise<void> {
    for (const doc of this.documents()) doc.body.removeClass("mmk-themed");
    if (!this.theme || !this.stockConfig) return;
    this.theme = null;
    (await mermaidApi()).initialize(this.stockConfig);
  }

  /** Redraws one staged diagram from its source with the current Mermaid configuration. */
  async redraw(view: MermaidCanvas): Promise<void> {
    const source = view.source?.();
    if (!source) return;
    const svg = await drawDiagram(view.doc, source.text);
    if (svg) view.replaceSvg(svg);
  }

  /** Opens the template picker for `editor`, or for the note being edited when called from the ribbon. */
  pickTemplate(editor?: Editor): void {
    const reading = this.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() === "preview";
    const target = editor ?? (reading ? undefined : this.app.workspace.activeEditor?.editor);
    if (!target) {
      new Notice(t("needEditor"));
      return;
    }
    this.picker?.close();
    this.picker = new TemplatePicker(this.app, (template) => insertDiagram(target, template.body));
    this.picker.open();
  }

  fullscreenFirst(): void {
    const live = [...this.views].filter((view) => !view.fullscreen && view.viewport.isConnected);
    const scope = this.app.workspace.getActiveViewOfType(MarkdownView)?.containerEl;
    const inNote = scope ? live.filter((view) => scope.contains(view.viewport)) : [];
    const pool = (inNote.length ? inNote : live).sort((a, b) =>
      a.viewport.compareDocumentPosition(b.viewport) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    // Prefer the diagram the reader is looking at over one scrolled out of sight.
    const onScreen = pool.find((view) => {
      const rect = view.viewport.getBoundingClientRect();
      return rect.height > 0 && rect.bottom > 0 && rect.top < view.win.innerHeight;
    });
    const view = onScreen ?? pool[0];
    if (view) view.openFullscreen();
    else new Notice(t("notFound"));
  }
}
