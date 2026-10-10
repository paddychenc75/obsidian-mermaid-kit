# Changelog

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
