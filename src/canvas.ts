import { Platform, setIcon } from "obsidian";
import {
  CLICK_SLOP,
  CLOSE_MS,
  FS_AUTO_MAX_SCALE,
  FS_FIT_PADDING,
  HINT_MS,
  ICON_SIZE,
  KEY_PAN_STEP,
  MARK,
  MAX_INLINE_VH,
  MAX_SCALE,
  MIN_SCALE,
  STAGE_PADDING,
  ZOOM_STEP,
} from "./constants";
import { clamp, el, isInteractiveTarget, measureSvg, prefersReducedMotion } from "./dom";
import { t } from "./i18n";

export interface CanvasOptions {
  fullscreen?: boolean;
  onClose?: (() => void) | null;
}

function resetSvgInlineLayout(svg: SVGSVGElement): void {
  svg.setCssStyles({
    width: "",
    height: "",
    minWidth: "",
    maxWidth: "",
    display: "",
    margin: "",
  });
}

function syncEmbedParent(host: HTMLElement, on: boolean): void {
  const embed = host.parentElement;
  if (!embed?.instanceOf(HTMLElement) || !embed.hasClass("cm-embed-block")) return;
  embed.toggleClass("lmm-embed", on);
}

export function unwrapHost(host: HTMLElement): void {
  syncEmbedParent(host, false);
  const viewport = host.querySelector(":scope > .lmm-viewport");
  const svg = host.querySelector(".lmm-stage svg") || host.querySelector(":scope > svg");
  host.querySelector(":scope > .lmm-bar")?.remove();
  if (svg?.instanceOf(SVGSVGElement)) {
    resetSvgInlineLayout(svg);
    svg.removeAttribute(MARK);
    if (svg.parentElement !== host) host.insertBefore(svg, viewport);
  }
  viewport?.remove();
  host.classList.remove("lmm-host");
}

interface DragState {
  id: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

interface PinchState {
  dist: number;
  scale: number;
  cx: number;
  cy: number;
}

interface Point {
  x: number;
  y: number;
}

interface PanBounds {
  txMin: number;
  txMax: number;
  tyMin: number;
  tyMax: number;
}

/** What the view last settled on, so a resize can restore it instead of guessing. */
type Pose = "fit" | "reset" | "free";

export class MermaidCanvas {
  /** Open overlays. They outlive the inline canvas that opened them, so the plugin closes them on unload. */
  static overlays = new Set<MermaidCanvas>();

  svg: SVGSVGElement;
  doc: Document;
  win: Window;
  fullscreen: boolean;
  onClose: (() => void) | null;
  scale = 1;
  tx = 0;
  ty = 0;
  nat = { w: 320, h: 180 };
  drag: DragState | null = null;
  pinch: PinchState | null = null;
  pointers = new Map<number, Point>();
  moved = false;
  touched = false;
  destroyed = false;
  pose: Pose = "reset";
  fitCap = MAX_SCALE;
  overlay: HTMLDivElement | null = null;
  host: HTMLElement | null = null;
  child: HTMLDivElement | null = null;
  lastWidth = 0;
  inlineHeight = 0;
  stage: HTMLDivElement;
  viewport: HTMLDivElement;
  toolbar: HTMLDivElement | null = null;
  btnOut!: HTMLButtonElement;
  gauge!: HTMLButtonElement;
  btnIn!: HTMLButtonElement;
  btnFit!: HTMLButtonElement;
  btnReset!: HTMLButtonElement;
  btnFull!: HTMLButtonElement;
  childFs: MermaidCanvas | null = null;
  ro: ResizeObserver | null = null;

  private animTimer = 0;
  private hintTimer = 0;
  private onWheel!: (event: WheelEvent) => void;
  private onPointerDown!: (event: PointerEvent) => void;
  private onPointerMove!: (event: PointerEvent) => void;
  private onPointerUp!: (event: PointerEvent) => void;
  private onDblClick!: (event: MouseEvent) => void;
  private onKeyDown!: (event: KeyboardEvent) => void;
  private onResize!: () => void;
  private onSettle!: () => void;

  constructor(svg: SVGSVGElement, options: CanvasOptions = {}) {
    this.svg = svg;
    this.doc = svg.ownerDocument;
    this.win = this.doc.defaultView ?? window;
    this.fullscreen = !!options.fullscreen;
    this.onClose = options.onClose ?? null;
    this.stage = el("div", "lmm-stage");
    this.viewport = el("div", this.fullscreen ? "lmm-viewport lmm-viewport--fs" : "lmm-viewport");
    this.build();
  }

  static adopt(host: HTMLElement): MermaidCanvas | null {
    const viewport = host.querySelector(":scope > .lmm-viewport");
    const stage = viewport?.querySelector(":scope > .lmm-stage");
    const svg = stage?.querySelector(":scope > svg");
    const toolbar = host.querySelector(":scope > .lmm-bar");
    const buttons = toolbar
      ? Array.from(toolbar.querySelectorAll(":scope .lmm-flair")).flatMap((node) =>
          node.instanceOf(HTMLButtonElement) ? [node] : [],
        )
      : [];
    if (
      !viewport?.instanceOf(HTMLDivElement) ||
      !stage?.instanceOf(HTMLDivElement) ||
      !svg?.instanceOf(SVGSVGElement) ||
      !toolbar?.instanceOf(HTMLDivElement) ||
      buttons.length < 6
    ) {
      return null;
    }

    const canvas = Object.create(MermaidCanvas.prototype) as MermaidCanvas;
    canvas.svg = svg;
    canvas.doc = svg.ownerDocument;
    canvas.win = canvas.doc.defaultView ?? window;
    canvas.fullscreen = !!host.closest(".lmm-fs");
    canvas.onClose = null;
    canvas.scale = 1;
    canvas.tx = 0;
    canvas.ty = 0;
    canvas.nat = { w: 320, h: 180 };
    canvas.drag = null;
    canvas.pinch = null;
    canvas.pointers = new Map();
    canvas.moved = false;
    canvas.touched = false;
    canvas.destroyed = false;
    canvas.pose = "reset";
    canvas.fitCap = MAX_SCALE;
    const overlay = host.closest(".lmm-fs");
    const child = host.closest(".lmm-fs-doc");
    canvas.overlay = overlay?.instanceOf(HTMLDivElement) ? overlay : null;
    canvas.host = host;
    canvas.child = child?.instanceOf(HTMLDivElement) ? child : null;
    canvas.lastWidth = 0;
    canvas.inlineHeight = 0;
    canvas.stage = stage;
    canvas.viewport = viewport;
    canvas.toolbar = toolbar;
    const [btnOut, gauge, btnIn, btnFit, btnReset, btnFull] = buttons;
    if (!btnOut || !gauge || !btnIn || !btnFit || !btnReset || !btnFull) return null;
    canvas.btnOut = btnOut;
    canvas.gauge = gauge;
    canvas.btnIn = btnIn;
    canvas.btnFit = btnFit;
    canvas.btnReset = btnReset;
    canvas.btnFull = btnFull;
    canvas.childFs = null;
    canvas.ro = null;
    canvas.animTimer = 0;
    canvas.hintTimer = 0;
    canvas.rebindBar();
    canvas.attach();
    canvas.scheduleInit();
    syncEmbedParent(host, true);
    svg.setAttribute(MARK, "1");
    return canvas;
  }

  rebindBar(): void {
    const replace = (old: HTMLButtonElement, action: () => void) => {
      const next = old.cloneNode(true);
      if (!next.instanceOf(HTMLButtonElement)) return old;
      old.replaceWith(next);
      next.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      });
      return next;
    };

    this.btnOut = replace(this.btnOut, () => this.zoomBy(1 / ZOOM_STEP));
    this.gauge = replace(this.gauge, () => this.actualSize());
    this.btnIn = replace(this.btnIn, () => this.zoomBy(ZOOM_STEP));
    this.btnFit = replace(this.btnFit, () => this.fit(true));
    this.btnReset = replace(this.btnReset, () => this.reset(true));
    this.btnFull = this.fullscreen
      ? replace(this.btnFull, () => this.close())
      : replace(this.btnFull, () => this.openFullscreen());
  }

  applyNaturalSize(): void {
    this.nat = measureSvg(this.svg) || this.nat;
    // `minWidth` answers themes that keep a raw diagram readable on phones with a min-width.
    this.svg.setCssStyles({
      width: `${this.nat.w}px`,
      height: `${this.nat.h}px`,
      minWidth: "0",
      maxWidth: "none",
    });
  }

  build(): void {
    this.applyNaturalSize();

    const parent = this.svg.parentElement;
    const mod = Platform.isMacOS ? "Cmd" : "Ctrl";
    this.viewport.tabIndex = 0;
    this.viewport.setAttribute("role", "group");
    this.viewport.setAttribute("aria-label", t(this.fullscreen ? "stageFs" : "stage", { mod }));
    this.stage.appendChild(this.svg);
    this.viewport.appendChild(this.stage);

    if (this.fullscreen) {
      this.overlay = el("div", "lmm-fs");
      this.overlay.setAttribute("role", "dialog");
      this.overlay.setAttribute("aria-modal", "true");
      this.overlay.setAttribute("aria-label", t("dialog"));
      this.child = el("div", "markdown-rendered lmm-fs-doc");
      this.host = el("div", "mermaid lmm-host");
      this.host.appendChild(this.viewport);
      this.child.appendChild(this.host);
      this.overlay.appendChild(this.child);
      this.overlay.addEventListener("pointerdown", (event) => {
        if (event.target === this.overlay) this.close();
      });
      this.doc.body.appendChild(this.overlay);
      MermaidCanvas.overlays.add(this);
    } else {
      const host = this.svg.closest(".mermaid") || parent;
      if (!host?.instanceOf(HTMLElement)) throw new Error("Mermaid Kit: mermaid host not found");
      this.host = host;
      this.host.classList.add("lmm-host");
      this.host.appendChild(this.viewport);
      syncEmbedParent(host, true);
    }

    this.buildBar();
    this.attach();
    this.scheduleInit();
    // Take focus off the editor so typing cannot edit the note behind the overlay.
    if (this.fullscreen) this.viewport.focus({ preventScroll: true });
  }

  buildBar(): void {
    const host = this.host;
    if (!host) throw new Error("Mermaid Kit: mermaid host not found");

    const bar = el("div", "lmm-bar");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", t("controls"));

    const kind = el("span", "lmm-kind");
    kind.textContent = t("kind");

    // `clickable-icon` opts the buttons out of the generic bordered <button> chrome
    // that Obsidian and most themes apply, so they read as toolbar icons everywhere.
    const flair = (icon: string | null, label: string, title: string, action: () => void) => {
      const node = el("button", "clickable-icon lmm-flair");
      node.type = "button";
      if (icon) setIcon(node, icon);
      if (!node.firstChild) node.textContent = label;
      // The bar sits inside `.mermaid`, so a theme's `.mermaid svg { width: auto }` reaches the
      // icons and falls back to these attributes. Keep them at the size the CSS asks for.
      const glyph = node.querySelector("svg");
      glyph?.setAttribute("width", String(ICON_SIZE));
      glyph?.setAttribute("height", String(ICON_SIZE));
      node.setAttribute("aria-label", title);
      node.setAttribute("data-tooltip-position", this.fullscreen ? "bottom" : "top");
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      });
      return node;
    };

    const group = (...nodes: HTMLElement[]) => {
      const node = el("div", "lmm-group");
      for (const child of nodes) node.appendChild(child);
      return node;
    };

    this.btnOut = flair("minus", "−", t("zoomOut"), () => this.zoomBy(1 / ZOOM_STEP));
    this.gauge = flair(null, "100%", t("actualSize"), () => this.actualSize());
    this.gauge.addClass("lmm-gauge");
    this.btnIn = flair("plus", "+", t("zoomIn"), () => this.zoomBy(ZOOM_STEP));
    this.btnFit = flair("scan", "Fit", t("fit"), () => this.fit(true));
    this.btnReset = flair("rotate-ccw", "Reset", t("reset"), () => this.reset(true));
    this.btnFull = this.fullscreen
      ? flair("x", "Close", t("close"), () => this.close())
      : flair("maximize-2", "Full", t("fullscreen"), () => this.openFullscreen());

    const actions = el("div", "lmm-actions");
    actions.appendChild(group(this.btnOut, this.gauge, this.btnIn));
    actions.appendChild(group(this.btnFit, this.btnReset));
    actions.appendChild(group(this.btnFull));

    bar.appendChild(kind);
    if (this.fullscreen) {
      const hint = el("span", "lmm-hint");
      hint.textContent = t("hint", { mod: Platform.isMacOS ? "⌘" : "Ctrl" });
      bar.appendChild(hint);
      // The hint is a greeting, not furniture: it steps aside once it has been read or acted on.
      this.hintTimer = this.win.setTimeout(() => this.dismissHint(), HINT_MS);
    }
    bar.appendChild(actions);
    this.toolbar = bar;
    host.insertBefore(bar, this.viewport);
  }

  dismissHint(): void {
    if (!this.hintTimer) return;
    this.win.clearTimeout(this.hintTimer);
    this.hintTimer = 0;
    this.toolbar?.querySelector(".lmm-hint")?.classList.add("is-spent");
  }

  startDrag(id: number, x: number, y: number): void {
    this.drag = { id, sx: x, sy: y, tx: this.tx, ty: this.ty };
    this.viewport.classList.add("is-dragging");
  }

  startPinch(): void {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    this.drag = null;
    this.moved = true;
    this.pinch = {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      scale: this.scale,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  }

  attach(): void {
    this.onWheel = (event) => {
      const zoom = event.ctrlKey || event.metaKey;
      // Inline, an ordinary wheel belongs to the note. Fullscreen has nothing to scroll, so it pans.
      if (!zoom && !this.fullscreen) return;
      event.preventDefault();
      this.dismissHint();
      const unit = event.deltaMode === 1 ? 16 : 1;
      if (!zoom) {
        this.touched = true;
        this.panBy(-event.deltaX * unit, -event.deltaY * unit);
        return;
      }
      const rect = this.viewport.getBoundingClientRect();
      // Trackpad pinch arrives as ctrl+wheel with small deltas and needs a steeper curve than a wheel notch.
      const pinch = event.ctrlKey && event.deltaMode === 0 && Math.abs(event.deltaY) < 40;
      const factor = Math.exp(-event.deltaY * unit * (pinch ? 0.01 : 0.0017));
      this.zoomTo(this.scale * factor, event.clientX - rect.left, event.clientY - rect.top, false);
    };

    this.onPointerDown = (event) => {
      if (event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;
      this.touched = true;
      this.dismissHint();
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        this.viewport.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort */
      }
      if (this.pointers.size === 2) {
        this.startPinch();
        return;
      }
      if (this.pointers.size > 2) return;
      this.moved = false;
      this.startDrag(event.pointerId, event.clientX, event.clientY);
    };

    this.onPointerMove = (event) => {
      const point = this.pointers.get(event.pointerId);
      if (!point) return;
      point.x = event.clientX;
      point.y = event.clientY;

      if (this.pinch) {
        const [a, b] = [...this.pointers.values()];
        if (!a || !b) return;
        const rect = this.viewport.getBoundingClientRect();
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        this.tx += cx - this.pinch.cx;
        this.ty += cy - this.pinch.cy;
        this.pinch.cx = cx;
        this.pinch.cy = cy;
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        this.zoomTo(
          (this.pinch.scale * dist) / this.pinch.dist,
          cx - rect.left,
          cy - rect.top,
          false,
        );
        return;
      }

      if (!this.drag || event.pointerId !== this.drag.id) return;
      const dx = event.clientX - this.drag.sx;
      const dy = event.clientY - this.drag.sy;
      if (Math.hypot(dx, dy) > CLICK_SLOP) this.moved = true;
      const tx = this.tx;
      const ty = this.ty;
      this.tx = this.drag.tx + dx;
      this.ty = this.drag.ty + dy;
      this.clampPan();
      if (this.tx !== tx || this.ty !== ty) this.pose = "free";
      this.render(false);
    };

    this.onPointerUp = (event) => {
      if (!this.pointers.delete(event.pointerId)) return;
      try {
        this.viewport.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      if (this.pinch) {
        if (this.pointers.size < 2) {
          this.pinch = null;
          const rest = [...this.pointers.entries()][0];
          if (rest) this.startDrag(rest[0], rest[1].x, rest[1].y);
        }
        if (this.pointers.size === 0) this.viewport.classList.remove("is-dragging");
        return;
      }

      if (!this.drag || event.pointerId !== this.drag.id) return;
      // A cancelled gesture (the page took over the scroll) is never a click.
      const wasClick = !this.moved && event.type === "pointerup";
      this.viewport.classList.remove("is-dragging");
      this.drag = null;
      if (wasClick && !this.fullscreen && !isInteractiveTarget(event.target)) {
        if (String(this.win.getSelection() ?? "")) return;
        this.openFullscreen();
      }
    };

    // Inline, the first click already opens the overlay, so the double-click lives there only:
    // it toggles between the opening overview and a close-up under the pointer.
    this.onDblClick = (event) => {
      if (!this.fullscreen || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      if (!this.isAt(this.fitScale(FS_AUTO_MAX_SCALE))) {
        this.fit(true, FS_AUTO_MAX_SCALE);
        return;
      }
      const rect = this.viewport.getBoundingClientRect();
      const next = this.scale < 1 ? 1 : this.scale * 2;
      this.zoomTo(next, event.clientX - rect.left, event.clientY - rect.top, true);
    };

    this.onKeyDown = (event) => {
      const handled = () => {
        event.preventDefault();
        if (this.fullscreen) event.stopPropagation();
      };
      if (this.fullscreen && event.key === "Escape") {
        handled();
        this.close();
        return;
      }
      if (!this.fullscreen && this.doc.activeElement !== this.viewport) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      switch (event.key) {
        case "+":
        case "=":
          handled();
          this.zoomBy(ZOOM_STEP);
          break;
        case "-":
        case "_":
          handled();
          this.zoomBy(1 / ZOOM_STEP);
          break;
        case "0":
          handled();
          this.reset(true);
          break;
        case "1":
          handled();
          this.actualSize();
          break;
        case "f":
        case "F":
          handled();
          if (this.fullscreen) this.fit(true);
          else this.openFullscreen();
          break;
        case "ArrowLeft":
          if (this.panBy(KEY_PAN_STEP, 0) || this.fullscreen) handled();
          break;
        case "ArrowRight":
          if (this.panBy(-KEY_PAN_STEP, 0) || this.fullscreen) handled();
          break;
        case "ArrowUp":
          if (this.panBy(0, KEY_PAN_STEP) || this.fullscreen) handled();
          break;
        case "ArrowDown":
          if (this.panBy(0, -KEY_PAN_STEP) || this.fullscreen) handled();
          break;
        default:
          return;
      }
      this.dismissHint();
    };

    this.onResize = () => {
      if (this.destroyed) return;
      this.applyNaturalSize();
      const width = this.viewport.clientWidth;
      if (!width || width === this.lastWidth) return;
      this.lastWidth = width;
      if (this.pose === "fit") {
        this.fit(false, this.fitCap);
      } else if (this.fullscreen && this.pose === "free") {
        // The reader placed this view; a window resize only has to keep it in bounds.
        this.clampPan();
        this.render(false);
      } else {
        this.reset(false);
      }
    };

    // Zooming out inline leaves the stage tall so the note does not jump under the pointer.
    // Hand the space back once the pointer or the focus has left.
    this.onSettle = () => {
      if (this.fullscreen || this.destroyed || this.pointers.size) return;
      const height = this.inlineHeight;
      this.setInlineHeight(this.scale);
      if (height === this.inlineHeight) return;
      this.clampPan();
      this.render(false);
    };

    this.viewport.addEventListener("wheel", this.onWheel, { passive: false });
    this.viewport.addEventListener("pointerdown", this.onPointerDown);
    this.viewport.addEventListener("pointermove", this.onPointerMove);
    this.viewport.addEventListener("pointerup", this.onPointerUp);
    this.viewport.addEventListener("pointercancel", this.onPointerUp);
    this.viewport.addEventListener("dblclick", this.onDblClick);
    this.viewport.addEventListener("blur", this.onSettle);
    this.host?.addEventListener("pointerleave", this.onSettle);
    // Fullscreen listens on the document only, so a focused viewport does not handle a key twice.
    if (this.fullscreen) this.doc.addEventListener("keydown", this.onKeyDown, true);
    else this.viewport.addEventListener("keydown", this.onKeyDown);
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(this.viewport);
    }
  }

  /** The view a diagram opens on: natural size inline, a capped overview in the overlay. */
  home(): void {
    if (this.fullscreen) this.fit(false, FS_AUTO_MAX_SCALE);
    else this.reset(false);
  }

  scheduleInit(attempt = 0): void {
    this.win.requestAnimationFrame(() => {
      // Once the reader has moved the diagram, settling must not snap it back.
      if (this.destroyed || this.touched) return;
      this.applyNaturalSize();
      if (this.viewport.clientWidth > 0 && this.nat.w > 40) this.home();
      if (attempt < 30) this.scheduleInit(attempt + 1);
    });
    if (attempt === 0) {
      this.win.setTimeout(() => {
        if (this.destroyed || this.touched) return;
        this.applyNaturalSize();
        this.home();
      }, 320);
    }
  }

  maxInlineHeight(): number {
    return Math.round(this.win.innerHeight * MAX_INLINE_VH);
  }

  /** Breathing room between the diagram and the frame; it gives way in a very narrow stage. */
  pad(): number {
    const width = this.viewport.clientWidth;
    if (!this.fullscreen) return Math.min(STAGE_PADDING, width / 8);
    return Math.min(FS_FIT_PADDING, width / 8, this.viewport.clientHeight / 8);
  }

  widthScale(): number {
    const width = this.viewport.clientWidth;
    if (!width || !this.nat.w) return 1;
    // Shrink to the column, never blow a small diagram up past its natural size.
    return clamp(Math.min(1, (width - this.pad() * 2) / this.nat.w), MIN_SCALE, MAX_SCALE);
  }

  /** The largest scale that shows the whole diagram: in the overlay frame, or in the tallest inline stage. */
  fitScale(max = MAX_SCALE): number {
    const width = this.viewport.clientWidth;
    const height = this.fullscreen ? this.viewport.clientHeight : this.maxInlineHeight();
    const pad = this.pad() * 2;
    return clamp(
      Math.min((width - pad) / this.nat.w, (height - pad) / this.nat.h, max),
      MIN_SCALE,
      MAX_SCALE,
    );
  }

  /** `growOnly` keeps the note from jumping under the pointer while zooming out. */
  setInlineHeight(scale: number, growOnly = false): void {
    if (this.fullscreen) return;
    const content = Math.ceil(this.nat.h * scale + this.pad() * 2);
    const wanted = Math.max(48, Math.min(content, this.maxInlineHeight()));
    const height = growOnly ? Math.max(wanted, this.inlineHeight) : wanted;
    if (height === this.inlineHeight) return;
    this.inlineHeight = height;
    this.viewport.setCssStyles({ height: "" });
    this.viewport.setCssProps({ "--lmm-vh": `${height}px` });
  }

  /** Scale to `scale` and rest the diagram where the frame wants it: centred, or padded at the top left. */
  private settle(scale: number, pose: Pose, animate: boolean): void {
    if (animate) this.touched = true;
    this.pose = pose;
    this.scale = scale;
    this.setInlineHeight(scale);
    this.lastWidth = this.viewport.clientWidth;
    this.tx = this.pad();
    this.ty = this.pad();
    this.clampPan();
    this.render(animate);
  }

  reset(animate: boolean): void {
    this.settle(this.widthScale(), "reset", animate);
  }

  fit(animate: boolean, max = MAX_SCALE): void {
    if (!this.viewport.clientWidth || !this.nat.w) return;
    this.fitCap = max;
    this.settle(this.fitScale(max), "fit", animate);
  }

  panBounds(): PanBounds {
    const pad = this.pad();
    // A diagram that fits is centred; one that overflows can be dragged until its edge clears the pad.
    const axis = (view: number, used: number): [number, number] =>
      used <= view - pad * 2 ? [(view - used) / 2, (view - used) / 2] : [view - used - pad, pad];
    const [txMin, txMax] = axis(this.viewport.clientWidth, this.nat.w * this.scale);
    const [tyMin, tyMax] = axis(this.viewport.clientHeight, this.nat.h * this.scale);
    return { txMin, txMax, tyMin, tyMax };
  }

  clampPan(): void {
    const bounds = this.panBounds();
    this.tx = clamp(this.tx, bounds.txMin, bounds.txMax);
    this.ty = clamp(this.ty, bounds.tyMin, bounds.tyMax);
  }

  /** Whether the view already rests where `settle(scale)` would put it. */
  isAt(scale: number, bounds = this.panBounds()): boolean {
    if (Math.abs(this.scale - scale) > 1e-3) return false;
    const pad = this.pad();
    return (
      Math.abs(this.tx - clamp(pad, bounds.txMin, bounds.txMax)) < 0.5 &&
      Math.abs(this.ty - clamp(pad, bounds.tyMin, bounds.tyMax)) < 0.5
    );
  }

  /** Returns whether the diagram actually moved, so callers can let an unused key through. */
  panBy(dx: number, dy: number): boolean {
    const tx = this.tx;
    const ty = this.ty;
    this.tx += dx;
    this.ty += dy;
    this.clampPan();
    if (this.tx === tx && this.ty === ty) return false;
    this.touched = true;
    this.pose = "free";
    this.render(false);
    return true;
  }

  zoomTo(next: number, originX: number, originY: number, animate: boolean): void {
    this.touched = true;
    this.pose = "free";
    const scale = clamp(next, MIN_SCALE, MAX_SCALE);
    const ratio = scale / this.scale;
    this.tx = originX - (originX - this.tx) * ratio;
    this.ty = originY - (originY - this.ty) * ratio;
    this.scale = scale;
    if (!this.fullscreen) this.setInlineHeight(scale, true);
    this.clampPan();
    this.render(animate);
  }

  actualSize(): void {
    this.zoomTo(1, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2, true);
  }

  zoomBy(factor: number): void {
    this.zoomTo(this.scale * factor, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2, true);
  }

  render(animate: boolean): void {
    if (animate && !prefersReducedMotion()) {
      this.stage.classList.add("is-animating");
      this.win.clearTimeout(this.animTimer);
      this.animTimer = this.win.setTimeout(() => {
        this.stage.classList.remove("is-animating");
      }, 200);
    }
    const viewW = this.viewport.clientWidth;
    const viewH = this.viewport.clientHeight;
    const bounds = this.panBounds();
    const pannableX = bounds.txMax - bounds.txMin > 0.5;
    const pannableY = bounds.tyMax - bounds.tyMin > 0.5;

    this.stage.setCssProps({
      "--tx": `${this.tx}px`,
      "--ty": `${this.ty}px`,
      "--scale": String(this.scale),
    });
    // Drives the cursor: a stage with nothing to drag should not offer a grab hand.
    this.viewport.toggleClass("is-pannable", pannableX || pannableY);
    // Touch: a diagram that fits vertically lets the page scroll through it.
    this.viewport.toggleClass("is-pannable-y", pannableY);
    // An edge that hides part of the diagram gets a shade, so a cropped figure never looks complete.
    this.viewport.toggleClass("is-clip-left", this.tx < -0.5);
    this.viewport.toggleClass("is-clip-top", this.ty < -0.5);
    this.viewport.toggleClass("is-clip-right", this.tx + this.nat.w * this.scale > viewW + 0.5);
    this.viewport.toggleClass("is-clip-bottom", this.ty + this.nat.h * this.scale > viewH + 0.5);

    this.gauge.textContent = `${Math.round(this.scale * 100)}%`;
    this.btnOut.disabled = this.scale <= MIN_SCALE + 1e-4;
    this.btnIn.disabled = this.scale >= MAX_SCALE - 1e-4;
    this.markCurrent(this.btnFit, this.isAt(this.fitScale(), bounds));
    this.markCurrent(this.btnReset, this.isAt(this.widthScale(), bounds));
  }

  /** Dims a button whose view is already showing. It stays focusable, so the keyboard keeps its place. */
  private markCurrent(button: HTMLButtonElement, on: boolean): void {
    button.toggleClass("is-current", on);
    if (on) button.setAttribute("aria-disabled", "true");
    else button.removeAttribute("aria-disabled");
  }

  openFullscreen(): void {
    if (this.childFs) return;
    for (const open of MermaidCanvas.overlays) {
      if (open.doc === this.doc) return;
    }
    const clone = this.svg.cloneNode(true);
    if (!clone.instanceOf(SVGSVGElement)) return;
    resetSvgInlineLayout(clone);
    this.childFs = new MermaidCanvas(clone, {
      fullscreen: true,
      onClose: () => {
        this.childFs = null;
        if (this.viewport.isConnected) this.viewport.focus({ preventScroll: true });
      },
    });
  }

  close(): void {
    if (!this.fullscreen || this.destroyed) return;
    const overlay = this.overlay;
    this.detach();
    MermaidCanvas.overlays.delete(this);
    if (overlay) {
      if (prefersReducedMotion()) {
        overlay.remove();
      } else {
        overlay.addClass("is-closing");
        this.win.setTimeout(() => overlay.remove(), CLOSE_MS);
      }
    }
    if (this.onClose) this.onClose();
  }

  detach(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.win.clearTimeout(this.animTimer);
    this.win.clearTimeout(this.hintTimer);
    if (this.ro) this.ro.disconnect();
    this.pointers.clear();
    this.drag = null;
    this.pinch = null;
    this.viewport.removeEventListener("wheel", this.onWheel);
    this.viewport.removeEventListener("pointerdown", this.onPointerDown);
    this.viewport.removeEventListener("pointermove", this.onPointerMove);
    this.viewport.removeEventListener("pointerup", this.onPointerUp);
    this.viewport.removeEventListener("pointercancel", this.onPointerUp);
    this.viewport.removeEventListener("dblclick", this.onDblClick);
    this.viewport.removeEventListener("blur", this.onSettle);
    this.host?.removeEventListener("pointerleave", this.onSettle);
    if (this.fullscreen) this.doc.removeEventListener("keydown", this.onKeyDown, true);
    else this.viewport.removeEventListener("keydown", this.onKeyDown);
    if (this.childFs) {
      // Obsidian re-renders the note behind an open overlay (sync, theme change, Live Preview
      // rebuild). The overlay holds its own copy of the diagram, so it stays up without its opener.
      this.childFs.onClose = null;
      this.childFs = null;
    }
  }

  destroy(): void {
    this.detach();
    if (this.fullscreen) {
      MermaidCanvas.overlays.delete(this);
      if (this.overlay) this.overlay.remove();
      return;
    }
    if (this.host) unwrapHost(this.host);
  }
}
