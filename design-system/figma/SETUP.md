# Figma setup · Competitor Watch design system

This repo keeps **design tokens in JSON** that sync with `frontend/src/index.css` and map to React components in `frontend/src/lib/sectionUi.jsx`.

## 1. Create the Figma file

1. New file: **Competitor Watch · Design System**
2. Pages (in order):
   - **Foundations** — color, type, spacing, radius swatches
   - **Components** — buttons, panels, tabs, tables, cards, badges
   - **Screens** — Daily Ops, Deals, Your Store, Trending
   - **Specs** — annotations, a11y notes

## 2. Install Tokens Studio (recommended)

1. Figma → Plugins → **Tokens Studio for Figma**
2. **Import** → folder: `design-system/tokens/` (from this repo)
3. Enable theme: **Competitor Watch · Dark**
4. **Create variables** from tokens (Colors, Typography, Spacing)

Fonts to install in Figma: **Inter** (400–700), **Space Grotesk** (500–700)

## 3. Build component library (match code)

Use `design-system/components/catalog.json` as the checklist. Priority frames:

| Figma component | Code reference | Size |
|-----------------|----------------|------|
| Button / Primary | `BTN_PRIMARY` | H 44, pill radius |
| Button / Ghost | `BTN_GHOST` | H 44, border white/15 |
| Toolbar / Control | `.toolbar-control` | H 44, ink bg |
| Panel / Default | `PANEL` | radius 24, border white/10, bg ink-2/60 |
| Panel / Muted | `PANEL_MUTED` | bg ink-2/40 |
| Tab / Underline | App.jsx main nav | 2px brand underline |
| Tab / Pill | Insights sub-nav | full radius, brand active |
| Table / Head | `TABLE_HEAD` | 11px caps, bg white/5 |
| Badge / Spread | BestDealsPanel | amber border/bg |
| Badge / Fresh cut | BestDealsPanel | leaf border/bg |
| PageHeader | sectionUi.jsx | eyebrow + display title |
| LockedFooter | sectionUi.jsx | lock icon + upload CTA |

Publish as a **team library** when stable.

## 4. Sync workflows

### Code → Figma (after you change CSS or tokens in repo)

```bash
cd frontend
npm run tokens:export
```

Then in Figma: Tokens Studio → **Pull from JSON** or re-import `design-system/tokens/`.

### Figma → Code (after you change tokens in Figma)

1. Tokens Studio → **Export to JSON** → overwrite `design-system/tokens/*.tokens.json`
2. Commit the JSON changes
3. Run:

```bash
cd frontend
npm run tokens:import
npm run tokens:check
```

4. Rebuild: `npm run build`

### Verify sync

```bash
cd frontend
npm run tokens:check
```

## 5. New components (bidirectional)

When you add a React component:

1. Add entry to `design-system/components/catalog.json` (`id`, `figmaName`, `codePath`, `tokens`)
2. Build matching Figma component on **Components** page
3. If new tokens needed, add to `component.tokens.json` → export → import in Figma

When you design in Figma first:

1. Export tokens from Tokens Studio
2. `npm run tokens:import`
3. Implement component in `sectionUi.jsx` using existing `PANEL` / `BTN_*` patterns
4. Register in `catalog.json`

## 6. Figma Variables naming (suggested)

Mirror token paths for clarity:

- `color/ink/default`, `color/brand`, `color/leaf`
- `surface/panel`, `surface/panel-muted`
- `text/body`, `text/price`
- `radius/xl`, `spacing/gutter`

## 7. Limitations

- **Tailwind class strings** (`PANEL`, `BTN_GHOST`) are not auto-synced — only `@theme` CSS variables via `tokens:import`
- **Component layout** sync is manual via `catalog.json` + Figma library (no .fig file in git)
- For full **Code Connect**, add Figma Code Connect mappings later (optional)
