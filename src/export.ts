import { type Size, el } from "./dom";

/**
 * A diagram takes most of its look from stylesheets outside the SVG: the app's, the theme's.
 * These are the properties a copy has to carry inline to look the same on its own.
 */
const CARRIED = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "rx",
  "ry",
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "white-space",
];

const MAX_PIXELS = 8192;
const MARGIN = 16;

/** Serializes the diagram at its natural size with its rendered look baked in. */
export function standaloneSvg(svg: SVGSVGElement, size: Size): string {
  const win = svg.ownerDocument.defaultView ?? window;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = svg.querySelectorAll("*");
  const copies = copy.querySelectorAll("*");

  originals.forEach((original, index) => {
    const target = copies[index];
    if (!target || original.localName === "style") return;
    const computed = win.getComputedStyle(original);
    const carried = CARRIED.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(";");
    target.setAttribute("style", `${target.getAttribute("style") ?? ""};${carried}`);
  });

  const filter = win.getComputedStyle(svg).filter;
  copy.setAttribute("style", filter && filter !== "none" ? `filter:${filter}` : "");
  copy.removeAttribute("data-mmk");
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(size.w));
  copy.setAttribute("height", String(size.h));
  return new XMLSerializer().serializeToString(copy);
}

/** Rasterizes SVG markup on `background`, at the screen's density, with a margin around it. */
export async function svgToPng(
  win: Window,
  markup: string,
  size: Size,
  background: string,
): Promise<Blob> {
  const image = el("img");
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();

  const width = size.w + MARGIN * 2;
  const height = size.h + MARGIN * 2;
  const density = Math.min(Math.max(2, win.devicePixelRatio || 1), MAX_PIXELS / Math.max(width, height));
  const canvas = el("canvas");
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Mermaid Kit: no 2d canvas");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, MARGIN * density, MARGIN * density, size.w * density, size.h * density);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Mermaid Kit: empty image"))), "image/png");
  });
}

/** The colour actually painted behind `el`: the first ancestor that is not transparent. */
export function backdropOf(el: HTMLElement): string {
  const win = el.ownerDocument.defaultView ?? window;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const color = win.getComputedStyle(node).backgroundColor;
    if (color && color !== "transparent" && !/,\s*0\)$/.test(color)) return color;
  }
  return "#ffffff";
}
