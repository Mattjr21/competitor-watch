# Competitor Watch · Design system

Single source of truth for **La Bodega — Competitor Watch** UI tokens and component specs.

## Structure

```
design-system/
├── tokens/           # Tokens Studio / W3C JSON (Figma import)
│   ├── core.tokens.json
│   ├── semantic.tokens.json
│   ├── component.tokens.json
│   ├── $metadata.json
│   └── $themes.json
├── components/
│   └── catalog.json  # Component ↔ code ↔ Figma map
├── scripts/
│   ├── export-tokens.mjs   # index.css → JSON
│   ├── import-tokens.mjs   # JSON → index.css
│   └── check-sync.mjs
└── figma/
    └── SETUP.md      # Figma file + Tokens Studio guide
```

## Commands (from `frontend/`)

| Script | Direction |
|--------|-----------|
| `npm run tokens:export` | Code → JSON (for Figma) |
| `npm run tokens:import` | JSON → Code (from Figma export) |
| `npm run tokens:check` | Verify no drift |

## Code entry points

| Layer | File |
|-------|------|
| CSS variables | `frontend/src/index.css` `@theme` |
| Layout | `frontend/src/lib/layout.js` |
| Components | `frontend/src/lib/sectionUi.jsx` |
| Primitives | `frontend/src/lib/ui.jsx` |

## Consistency roadmap

See audit in project docs — top fixes: unify Deals `PageHeader`, one tab style, consolidate buttons to `BTN_*`, fix PANEL double-padding.
