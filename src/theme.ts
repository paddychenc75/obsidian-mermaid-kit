/**
 * Builds a Mermaid theme out of the colours Obsidian is showing right now, so a diagram
 * belongs to the note around it in any theme, light or dark, without the app's dark-mode
 * trick of inverting a light drawing.
 */

type Rgb = [number, number, number];

const hex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

/** `amount` of `a` laid over `b`. */
export function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => (a[i] ?? 0) * amount + (b[i] ?? 0) * (1 - amount)) as Rgb;
}

export function luminance([r, g, b]: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Resolves any CSS colour to plain RGB by painting it. Themes hand out `color-mix()`,
 * `color(srgb …)`, and translucent values that Mermaid's colour maths cannot read;
 * a translucent colour is flattened onto `under`.
 */
function painter(doc: Document): (css: string, under: Rgb) => Rgb | null {
  const canvas = doc.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return (css, under) => {
    if (!context || !css.trim()) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    // Canvas stores premultiplied alpha; undo it before compositing.
    const alpha = a / 255;
    return mix([r, g, b], under, alpha);
  };
}

export interface DiagramTheme {
  theme: "base";
  darkMode: boolean;
  fontFamily: string;
  themeVariables: Record<string, unknown>;
}

/**
 * Whether a drawing was made with `theme`. Mermaid opens every diagram's stylesheet with one
 * root rule that sets the text colour, so that colour marks which theme drew it.
 */
export function drawnWith(svg: SVGSVGElement, theme: DiagramTheme): boolean {
  const css = svg.querySelector("style")?.textContent ?? "";
  return css.includes(`fill:${String(theme.themeVariables.textColor)}`);
}

const HUES = ["blue", "green", "orange", "purple", "cyan", "red", "yellow", "pink"];

export function diagramTheme(doc: Document): DiagramTheme {
  const win = doc.defaultView ?? window;
  const style = win.getComputedStyle(doc.body);
  const paint = painter(doc);
  const dark = doc.body.classList.contains("theme-dark");
  const read = (name: string, under: Rgb, fallback: Rgb): Rgb =>
    paint(style.getPropertyValue(name), under) ?? fallback;

  const bg = read("--background-primary", [255, 255, 255], dark ? [30, 30, 30] : [255, 255, 255]);
  const text = read("--text-normal", bg, dark ? [220, 221, 222] : [34, 34, 34]);
  const muted = read("--text-muted", bg, mix(text, bg, 0.7));
  const surface = read("--background-secondary", bg, mix(text, bg, 0.04));
  const border = read("--background-modifier-border", bg, mix(text, bg, 0.16));
  const accent = read("--interactive-accent", bg, [72, 104, 224]);
  const hues = HUES.map((name) => read(`--color-${name}`, bg, accent));
  const red = hues[5] ?? accent;
  const green = hues[1] ?? accent;

  // One recipe for every shape: a faint accent wash, a firm accent edge, quiet grey lines.
  const node = mix(accent, bg, dark ? 0.2 : 0.1);
  const nodeEdge = mix(accent, bg, dark ? 0.7 : 0.6);
  const line = mix(text, bg, 0.5);
  const soft = (color: Rgb, amount = dark ? 0.3 : 0.2) => mix(color, bg, amount);
  const fontFamily = style.getPropertyValue("--font-interface").trim() || style.fontFamily;

  const variables: Record<string, unknown> = {
    darkMode: dark,
    background: hex(bg),
    fontFamily,
    fontSize: "15px",

    primaryColor: hex(node),
    primaryTextColor: hex(text),
    primaryBorderColor: hex(nodeEdge),
    secondaryColor: hex(soft(hues[3] ?? accent)),
    secondaryTextColor: hex(text),
    secondaryBorderColor: hex(mix(hues[3] ?? accent, bg, 0.6)),
    tertiaryColor: hex(surface),
    tertiaryTextColor: hex(text),
    tertiaryBorderColor: hex(border),
    lineColor: hex(line),
    textColor: hex(text),
    mainBkg: hex(node),
    nodeBorder: hex(nodeEdge),
    nodeTextColor: hex(text),
    titleColor: hex(text),
    edgeLabelBackground: hex(bg),
    clusterBkg: hex(mix(text, bg, 0.04)),
    clusterBorder: hex(border),
    defaultLinkColor: hex(line),

    // Sequence
    actorBkg: hex(node),
    actorBorder: hex(nodeEdge),
    actorTextColor: hex(text),
    actorLineColor: hex(mix(text, bg, 0.3)),
    signalColor: hex(line),
    signalTextColor: hex(text),
    labelBoxBkgColor: hex(surface),
    labelBoxBorderColor: hex(border),
    labelTextColor: hex(text),
    loopTextColor: hex(muted),
    noteBkgColor: hex(soft(hues[6] ?? accent)),
    noteBorderColor: hex(mix(hues[6] ?? accent, bg, 0.6)),
    noteTextColor: hex(text),
    activationBkgColor: hex(soft(accent, 0.35)),
    activationBorderColor: hex(nodeEdge),
    sequenceNumberColor: hex(bg),

    // Class, state, entity relationship, requirement
    classText: hex(text),
    labelColor: hex(text),
    altBackground: hex(surface),
    compositeBackground: hex(bg),
    compositeTitleBackground: hex(surface),
    stateLabelColor: hex(text),
    transitionColor: hex(line),
    transitionLabelColor: hex(muted),
    specialStateColor: hex(line),
    attributeBackgroundColorOdd: hex(bg),
    attributeBackgroundColorEven: hex(surface),
    requirementBackground: hex(node),
    requirementBorderColor: hex(nodeEdge),
    requirementTextColor: hex(text),
    relationColor: hex(line),
    relationLabelBackground: hex(bg),
    relationLabelColor: hex(muted),

    // Gantt
    sectionBkgColor: hex(mix(text, bg, 0.05)),
    altSectionBkgColor: hex(bg),
    sectionBkgColor2: hex(mix(text, bg, 0.05)),
    gridColor: hex(border),
    taskBkgColor: hex(soft(accent, dark ? 0.45 : 0.3)),
    taskBorderColor: hex(nodeEdge),
    taskTextColor: hex(text),
    taskTextLightColor: hex(text),
    taskTextDarkColor: hex(text),
    taskTextOutsideColor: hex(text),
    taskTextClickableColor: hex(accent),
    activeTaskBkgColor: hex(mix(accent, bg, 0.75)),
    activeTaskBorderColor: hex(accent),
    doneTaskBkgColor: hex(mix(text, bg, 0.14)),
    doneTaskBorderColor: hex(mix(text, bg, 0.3)),
    critBkgColor: hex(soft(red, 0.45)),
    critBorderColor: hex(red),
    todayLineColor: hex(red),

    // Pie
    pieTitleTextColor: hex(text),
    pieSectionTextColor: hex(text),
    pieLegendTextColor: hex(text),
    pieStrokeColor: hex(bg),
    pieStrokeWidth: "2px",
    pieOuterStrokeColor: hex(border),
    pieOuterStrokeWidth: "1px",
    pieOpacity: "1",

    // Quadrant
    quadrant1Fill: hex(soft(accent, 0.22)),
    quadrant2Fill: hex(soft(accent, 0.14)),
    quadrant3Fill: hex(soft(accent, 0.06)),
    quadrant4Fill: hex(soft(accent, 0.14)),
    quadrant1TextFill: hex(muted),
    quadrant2TextFill: hex(muted),
    quadrant3TextFill: hex(muted),
    quadrant4TextFill: hex(muted),
    quadrantPointFill: hex(accent),
    quadrantPointTextFill: hex(text),
    quadrantXAxisTextFill: hex(muted),
    quadrantYAxisTextFill: hex(muted),
    quadrantInternalBorderStrokeFill: hex(border),
    quadrantExternalBorderStrokeFill: hex(border),
    quadrantTitleFill: hex(text),

    // Git graph
    gitInv0: hex(bg),
    commitLabelColor: hex(text),
    commitLabelBackground: hex(surface),
    tagLabelColor: hex(text),
    tagLabelBackground: hex(surface),
    tagLabelBorder: hex(border),

    // Architecture
    archEdgeColor: hex(line),
    archEdgeArrowColor: hex(line),
    archGroupBorderColor: hex(border),

    errorBkgColor: hex(soft(red)),
    errorTextColor: hex(text),

    xyChart: {
      backgroundColor: hex(bg),
      titleColor: hex(text),
      xAxisTitleColor: hex(muted),
      xAxisLabelColor: hex(muted),
      xAxisTickColor: hex(border),
      xAxisLineColor: hex(border),
      yAxisTitleColor: hex(muted),
      yAxisLabelColor: hex(muted),
      yAxisTickColor: hex(border),
      yAxisLineColor: hex(border),
      plotColorPalette: [soft(accent, 0.45), accent, ...hues].map(hex).join(","),
    },
    radar: {
      axisColor: hex(mix(text, bg, 0.3)),
      graticuleColor: hex(mix(text, bg, 0.14)),
      graticuleOpacity: 0.25,
      curveOpacity: 0.35,
    },
    packet: {
      startByteColor: hex(muted),
      endByteColor: hex(muted),
      labelColor: hex(text),
      titleColor: hex(text),
      blockStrokeColor: hex(nodeEdge),
      blockFillColor: hex(node),
    },
  };

  // Categorical series. Filled areas carry text, so they are washes of the hue; pie slices,
  // branch lines, and commits are read by colour alone, so they keep the hue at strength.
  hues.forEach((hue, index) => {
    variables[`pie${index + 1}`] = hex(mix(hue, bg, 0.8));
    variables[`git${index}`] = hex(hue);
    variables[`gitBranchLabel${index}`] = hex(luminance(hue) > 0.55 ? [20, 20, 20] : [255, 255, 255]);
    variables[`cScale${index}`] = hex(soft(hue, dark ? 0.38 : 0.26));
    variables[`cScaleLabel${index}`] = hex(text);
    variables[`cScalePeer${index}`] = hex(mix(hue, bg, 0.6));
    variables[`cScaleInv${index}`] = hex(text);
    variables[`fillType${index}`] = hex(soft(hue));
  });
  for (let index = hues.length; index < 12; index++) {
    const hue = hues[index % hues.length] ?? accent;
    variables[`pie${index + 1}`] = hex(mix(hue, bg, 0.5));
    variables[`cScale${index}`] = hex(soft(hue, dark ? 0.24 : 0.14));
    variables[`cScaleLabel${index}`] = hex(text);
    variables[`cScalePeer${index}`] = hex(mix(hue, bg, 0.45));
    variables[`cScaleInv${index}`] = hex(text);
  }

  return { theme: "base", darkMode: dark, fontFamily, themeVariables: variables };
}
