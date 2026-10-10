import { getLanguage } from "obsidian";

const en = {
  kind: "Mermaid",
  controls: "Diagram controls",
  zoomOut: "Zoom out",
  actualSize: "Actual size",
  zoomIn: "Zoom in",
  fit: "Fit to canvas",
  reset: "Reset view",
  fullscreen: "Open fullscreen",
  close: "Close (Esc)",
  stage: "Mermaid diagram — drag to pan, {mod} and wheel to zoom",
  stageFs: "Mermaid diagram — drag or scroll to pan, {mod} and wheel to zoom",
  dialog: "Mermaid diagram fullscreen",
  hint: "Drag or scroll to pan · {mod} + scroll to zoom · Double-click to zoom · Esc to close",
  notFound: "No Mermaid diagram found in this note.",
  cmdFullscreen: "Open first Mermaid diagram fullscreen",
  insert: "Insert Mermaid diagram",
  pickerTitle: "Insert a diagram",
  pickerSearch: "Filter diagram types",
  pickerEmpty: "No diagram type matches.",
  needEditor: "Open a note in editing view to insert a diagram.",
};

type Strings = typeof en;

const locales: Record<string, Partial<Strings>> = {
  zh: {
    controls: "图表控制",
    zoomOut: "缩小",
    actualSize: "实际大小",
    zoomIn: "放大",
    fit: "适应画布",
    reset: "重置视图",
    fullscreen: "全屏查看",
    close: "关闭 (Esc)",
    stage: "Mermaid 图表 — 拖动平移,{mod} 加滚轮缩放",
    stageFs: "Mermaid 图表 — 拖动或滚动平移,{mod} 加滚轮缩放",
    dialog: "Mermaid 图表全屏",
    hint: "拖动或滚动平移 · {mod} + 滚轮缩放 · 双击缩放 · Esc 关闭",
    notFound: "当前笔记中没有 Mermaid 图表。",
    cmdFullscreen: "全屏打开第一个 Mermaid 图表",
    insert: "插入 Mermaid 图表",
    pickerTitle: "插入图表",
    pickerSearch: "筛选图表类型",
    pickerEmpty: "没有匹配的图表类型。",
    needEditor: "请先在编辑视图中打开笔记,再插入图表。",
  },
  "zh-TW": {
    controls: "圖表控制",
    zoomOut: "縮小",
    actualSize: "實際大小",
    zoomIn: "放大",
    fit: "符合畫布",
    reset: "重設檢視",
    fullscreen: "全螢幕檢視",
    close: "關閉 (Esc)",
    stage: "Mermaid 圖表 — 拖曳平移,{mod} 加滾輪縮放",
    stageFs: "Mermaid 圖表 — 拖曳或捲動平移,{mod} 加滾輪縮放",
    dialog: "Mermaid 圖表全螢幕",
    hint: "拖曳或捲動平移 · {mod} + 滾輪縮放 · 點兩下縮放 · Esc 關閉",
    notFound: "目前筆記中沒有 Mermaid 圖表。",
    cmdFullscreen: "全螢幕開啟第一個 Mermaid 圖表",
    insert: "插入 Mermaid 圖表",
    pickerTitle: "插入圖表",
    pickerSearch: "篩選圖表類型",
    pickerEmpty: "沒有符合的圖表類型。",
    needEditor: "請先在編輯檢視中開啟筆記,再插入圖表。",
  },
};

export function t(key: keyof Strings, vars: Record<string, string> = {}): string {
  const text = locales[getLanguage()]?.[key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}
