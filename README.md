<img src="assets/icon.svg" width="72" height="72" alt="">

# Mermaid Kit

An Obsidian plugin for working with Mermaid diagrams. Reading: every rendered diagram becomes a small stage with pan, zoom, fit, reset, and a lightweight fullscreen overlay. Writing: a picker inserts a ready-made template for any diagram type in one click.

It works with **any theme**. [Lumen Glass](https://github.com/paddychenc75/obsidian-lumen) is an optional skin, not a dependency. The theme only styles the `.lmm-*` classes this plugin creates. The plugin only uses Obsidian CSS tokens, so other themes keep a quiet header band over a flush figure.

The theme works without this plugin. This plugin works without the theme.

Mermaid Kit continues [Lumen Stage](https://github.com/paddychenc75/obsidian-lumen-stage), which is no longer developed. The two wrap the same diagrams, so disable Lumen Stage before enabling Mermaid Kit.

## Templates

**Insert Mermaid diagram** opens a picker with one card per diagram type: flowchart, sequence, class, state, entity relationship, Gantt, pie, mindmap, timeline, Git graph, user journey, quadrant, XY chart, Sankey, block, architecture, kanban, requirement, C4, packet, radar, and treemap.

- Open it from the ribbon icon, the command palette, or the editor's right-click menu
- Each card is drawn from its own template by the Mermaid build your Obsidian ships; a type that build cannot draw is left out
- Type to filter, `Enter` takes the first match, a click inserts
- The template lands on its own lines at the cursor as a ` ```mermaid ` block. With the cursor inside an open ` ```mermaid ` block, only the diagram body is filled in
- Diagram type names follow Obsidian's language; template text is English

## Interaction

Inline, in the note:

- Drag the canvas to pan
- `Ctrl` / `Cmd` + wheel, or a trackpad pinch, zooms toward the pointer
- Ordinary wheel movement scrolls the note
- Click the diagram, or the fullscreen button, for a lightweight overlay
- Header buttons: zoom out, zoom readout (click for 100%), zoom in, fit, reset, fullscreen
- With the stage focused: `+` / `-` zoom, `0` resets, `1` shows 100%, arrow keys pan, `F` opens fullscreen
- The cursor is a pointing hand while the whole diagram is in view and a grab hand once there is something to drag
- An edge that crops the diagram carries a soft shade
- Zooming grows the stage; it hands the space back when the pointer or the focus leaves

In the overlay:

- Drag, wheel, or two-finger scroll pans; `Ctrl` / `Cmd` + wheel or pinch zooms
- Double-click zooms in under the pointer; double-click again returns to the overview
- `F` fits, `0` resets, `1` shows 100%
- `Esc`, the close button, or the dimmed backdrop closes it
- It opens on an overview that enlarges a small diagram to 150% at most; Fit fills the frame
- It stays open when Obsidian re-renders the note behind it

On touch screens, two fingers pinch-zoom and pan. A diagram that fits its stage vertically lets the page scroll through it.

Reset shows the diagram at its natural size, shrunk to the column when it is wider. Fit shows the whole diagram as large as the canvas allows: the overlay frame, or inline the column and 72% of the window height. The button for the view already on screen is dimmed.

Labels, tooltips, and the overlay hint follow Obsidian's language: English, Simplified Chinese, and Traditional Chinese.

Commands: **Open first Mermaid diagram fullscreen** opens the diagram on screen in the active note. **Insert Mermaid diagram** opens the template picker.

The chrome is a silent 36px header band with icon buttons that recede until the pointer or the keyboard reaches the stage. The diagram keeps a 12px margin from the frame. There is no drafting grid and no floating instrument toolbar.

Internal class names stay on the `lmm-*` prefix so existing Lumen Glass scoped styles keep matching. Chrome rules use two classes at most, so a theme can restyle them with `.lmm-host .lmm-*`.

## Install

This plugin is not on the community list yet. Install it locally:

1. Copy this folder into `<vault>/.obsidian/plugins/mermaid-kit/`, or symlink it there while developing.
2. Run `npm install` and `npm run build` if `main.js` is missing.
3. Enable **Mermaid Kit** under **Settings → Community plugins**.

Reload the plugin after a rebuild. Obsidian reads `manifest.json`, `main.js`, and `styles.css` from that folder.

## Independent use

No Lumen Glass, Style Settings, or other companion plugin is required. On a stock theme you still get pan, zoom, fit, reset, and fullscreen. Live Preview also drops the extra embed pad around an enhanced diagram so the stage is not wrapped in a second shell.

If you do use Lumen Glass, the theme replaces the fallback chrome with its code-block header band and diagram surface. That skin is opt-in by installing the theme; it is not compiled into this plugin.

## Development

Requires Node.js 20 or later.

```bash
npm install
npm run build
npm run check
```

- `npm run build` typechecks, then bundles `src/` into `main.js` with esbuild
- `npm run check` typechecks and validates manifest, versions, and CSS token rules
- `npm run dev` watches `src/` and rebuilds with an inline sourcemap

Edit TypeScript under `src/`. Do not hand-edit `main.js`. After a build, reload the plugin in Obsidian.

## License

Mermaid Kit is available under the [MIT License](LICENSE).
