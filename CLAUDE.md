# Mermaid Kit

Obsidian plugin that wraps rendered Mermaid diagrams in a pan/zoom stage with a fullscreen overlay. It continues Lumen Stage (`lumen-stage`), which is frozen.

## Commits

- Commit messages must be written in English: subject, body, and trailers. This also applies to tags, release notes, and `CHANGELOG.md`.
- Follow the existing subject style, for example `Release 1.0.1: fix the overlay hint on narrow windows.`

## Workflow

- Edit TypeScript under `src/`. Never hand-edit `main.js`; it is built output that stays tracked for local installs.
- `npm run build` typechecks and bundles. `npm run check` typechecks and validates manifest, versions, and CSS token rules. `npm test` runs the unit tests in `tests/` through `scripts/test.mjs`, which stubs the `obsidian` module. Run all three before committing; CI also fails when the committed `main.js` differs from a fresh build.
- To release: set the version in `package.json`, run `npm run version` to sync `manifest.json` and `versions.json`, add a `CHANGELOG.md` entry, then push a tag named after the version. The tag triggers `.github/workflows/release.yml`.

## Constraints

- `src/theme.ts` builds a Mermaid `base` theme from Obsidian's CSS variables and `main.ts` applies it with `mermaid.initialize`, layered over the configuration Obsidian set (`stockConfig`), which is restored on unload and when the setting is off. Theme colours must pass through `painter()`: themes return `color-mix()` and translucent values that Mermaid cannot parse. Obsidian does not redraw diagrams when the config changes, so `redraw()` re-renders staged ones from their source.
- Every entry in `src/templates.ts` must render with the Mermaid build Obsidian ships; check a new one in the app before adding it. The picker hides templates that fail to render, so a typo there removes the card silently.
- Picker thumbnails must not use the `.mermaid` class or a `mermaid-` id, or the stage scan wraps them.
- Classes, CSS variables, and data attributes use the `mmk-` prefix. Toolbar buttons are `.mmk-flair` elements identified by `data-mmk-act` (`out`, `gauge`, `in`, `fit`, `reset`, `more`, `full`). `MermaidCanvas.adopt` finds them by that attribute and refuses a bar that lacks one, so adding a button means adding it in `buildBar`, `adopt`, and `rebindBar`.
- `styles.css` uses Obsidian native variables only, no `:has()`, no `!important`. No theme skins this plugin, and it must look right on any of them. The host is the `.mermaid` element, which themes style for the plain figure; theme CSS loads after plugin CSS, so structural host rules use `.markdown-rendered .mermaid.mmk-host` and the toolbar icon box uses three classes to outrank a theme's `.markdown-rendered .mermaid` and `.mermaid svg`.
- `LEGACY_CHROME` in `src/main.ts` keeps the scan off `lmm-*` chrome left by Lumen Stage or by a pre-rename build. Do not remove it.
- No `el.style.*` assignments; use classes, `setCssStyles`, or `setCssProps`. Use `instanceOf()` instead of `instanceof` for DOM checks so pop-out windows work.
- Obsidian renders a diagram in a scratch `.mermaid` on `<body>` and delays rendering while the window is hidden. Do not wrap the scratch copy, and do not treat a missing diagram in a background window as a bug.
