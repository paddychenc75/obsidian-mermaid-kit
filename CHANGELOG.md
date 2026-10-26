# Changelog

## 1.1.2

Fixed

- On Obsidian 1.15, the built-in zoom buttons (plus, minus, reset) appeared over the toolbar of a staged diagram and covered its "more" button. The stage now hides them

## 1.1.1

Community review fixes. No change in behavior.

- The setting is declared through `getSettingDefinitions()`, so it appears in Obsidian's settings search
- Use Obsidian's `createEl` helper instead of `document.createElement`
- Remove an unnecessary type assertion and an unused variable

## 1.1.0

Theme-matched diagrams, copy and edit actions, and a chrome that no longer depends on a theme.

Added

- Diagrams are drawn in the colors and font of the active theme instead of Mermaid's stock palette, in light and dark mode and for every diagram type. A new setting turns this off
- More actions menu on every stage: copy the diagram as a PNG image or as standalone SVG, copy its Mermaid source, and jump to the source for editing
- Unit tests and a CI workflow that builds, checks, and tests every push and pull request

Changed

- The plugin no longer has a theme-specific skin. It draws one look everywhere from Obsidian's own variables, and its layout rules now hold against themes that style `.mermaid`
- Internal classes, CSS variables, and data attributes moved from the `lmm-` prefix to `mmk-`. A snippet or theme that targeted `.lmm-*` needs the new prefix

Fixed

- On a dark theme that does not style Mermaid itself, a staged diagram lost Obsidian's dark-mode inversion and showed the light palette on a dark stage
- In Live Preview, hovering a staged diagram drew the core embed outline around the stage and its margins
- A toolbar left behind by an older build is rebuilt instead of being adopted with a missing button

## 1.0.0

First release of Mermaid Kit. It continues Lumen Stage 1.1.0, which is no longer developed, under a new plugin id.

Carried over

- Pan, `Ctrl` / `Cmd` + wheel and pinch zoom, fit, reset, and a fullscreen overlay for rendered Mermaid diagrams, in Reading view, Live Preview, and pop-out windows
- Works with any theme; Lumen Glass skins the same `lmm-*` classes

New since Lumen Stage 1.1.0

- Template picker: a ribbon icon, a command, and an editor menu item open a grid of 22 diagram types, each drawn from its own template; one click inserts it at the cursor
- Its own icon
- The diagram keeps a 12px margin from the frame instead of sitting flush under the header band
- The overlay opens on an overview that enlarges a small diagram to 150% at most; Fit fills the frame
- Inline Fit shows the whole diagram as large as the column and 72% of the window height allow, so it differs from Reset
- The cursor is a pointing hand while the whole diagram is in view and a grab hand only when there is something to drag
- Soft shades on the edges that crop the diagram
- Zooming out inline hands the extra stage height back once the pointer or the focus leaves
- Toolbar controls recede until the stage is hovered or focused; Fit and Reset dim when their view is already showing
- Double-click in the overlay toggles between the overview and a close-up under the pointer
- `1` shows 100%; `F` fits in the overlay
- The overlay hint fades after a few seconds or on the first gesture, and the overlay fades out on close
- Simplified and Traditional Chinese labels, tooltips, and hint

Fixed since Lumen Stage 1.1.0

- Toolbar icons rendered at 24px instead of 15px under themes that size `.mermaid svg`, which also pushed the header band past 36px
- A theme `min-width` on `.mermaid svg` stretched the staged diagram past its measured size
- An open overlay was closed whenever Obsidian re-rendered the diagram behind it
- A window resize in the overlay discarded the view you had zoomed or panned to
