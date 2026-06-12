# Competitor Watch – UI Rebuild Handoff
> Generated: 2026-06-12 | Branch: main | Stack: Vanilla JS + Python

---

## 1. What This App Is

**Competitor Watch for La Bodega** — a daily ops dashboard for a Latino grocery store.
It scrapes competitor weekly ads via Flipp/Wishabi and gives the store owner:
- Live competitor deal prices across 9 categories
- AI-generated pricing recommendations
- Weather-based sales targets
- National trending products (Latino metros vs mainstream)
- Product search across all competitor ads

**Stack:**
- `server.py` — Python HTTP server (port 8000), all API logic
- `public/index.html` — the UI shell
- `public/app.js` — all frontend logic (vanilla JS, no framework)
- `public/styles.css` — all styles

**Start:** `python server.py` → http://localhost:8000

---

## 2. API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/data?zips=&refresh=` | Main payload: deals, recs, combos |
| `GET /api/forecast?refresh=` | Weather + events + sales targets |
| `GET /api/trending?refresh=` | National trending products |
| `GET /api/search?q=&zips=&latino=` | Search competitor ads |
| `POST /api/events` | Add manual local event |
| `POST /api/upload` | Upload sales CSV |

---

## 3. UI Changes To Rebuild (from June 11 session)

### styles.css
- Top-border accent on weather cards (not left border) — orange=hot, blue=rain, indigo=cold
- Deal cards: hover lift `transform: translateY(-1px)`, `--shadow-hover`
- Latino deal cards: `background: #faf5ff` subtle purple tint
- `badge-latino` pill: purple `#7c3aed`
- Section headers: flex row, title left + button right
- Filter labels: uppercase, letter-spaced, small
- `deals-count` pill (e.g. "186 deals")
- Week signal: amber callout with `📣` prefix, hidden when empty
- Buttons: `transform: scale(.97)` on `:active`
- Empty state: centered with emoji via CSS `::before`

### index.html
- Upload CSV as ghost label button
- Emoji section prefixes: 📅 Ops, 🔥 Trending, 🔎 Search, 💡 Recs, 🎁 Combos, 🏷️ Deals
- `deals-count` span in filter bar
- `week-signal` div starts `hidden`, JS shows it only when data exists
- Bump cache bust to `?v=7`

### app.js (2 patches only)
```js
// 1. After renderDeals loop — show count
const countEl = document.getElementById("deals-count");
if (countEl) countEl.textContent = rows.length + " deals";

// 2. Week signal — don't show empty div
const ws = $("#week-signal");
ws.textContent = data.week_signal || "";
ws.hidden = !data.week_signal;
```

---

## 4. Commit Command
```bash
git add public/index.html public/styles.css public/app.js
git commit -m "Redesign UI: cards, weather styling, badges, layout polish"
git push
```

---

## 5. Key Gotchas

- **No React, no Node, no npm** — pure vanilla JS served by Python
- **No localStorage** — Codespace iframe blocks it. State lives in `STATE = {}` in app.js
- **No frontend/ folder** — never existed, was a confusion last night
- **Cache** in `/cache/` — delete if stale data appears
- **Flipp 429s** — server has stale fallback, safe to ignore

---

## 6. Backlog (next features)
- [ ] Dark mode toggle
- [ ] Copy price to clipboard on deal cards
- [ ] Pin/star deals
- [ ] Color-coded price delta vs our prices
- [ ] Print/PDF export view
- [ ] Mobile filter drawer
