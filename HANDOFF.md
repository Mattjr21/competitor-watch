# Competitor Watch — Handoff Document

> **Updated:** 2026-06-13  
> **Repo:** [github.com/Mattjr21/competitor-watch](https://github.com/Mattjr21/competitor-watch)  
> **Production:** [https://competitor-watch-1.onrender.com](https://competitor-watch-1.onrender.com)  
> **Store:** La Bodega Supermercado y Restaurante · Calhoun, GA

---

## 1. App summary (one paragraph)

**Competitor Watch** is a weekend merchandising dashboard for La Bodega. It pulls **live competitor weekly ads** from Flipp/Wishabi by ZIP code, compares them to **your own POS data** (optional CSV upload), and turns that into plain-language guidance: what meat to match, what not to discount, which combos to copy, and how weather should shape the category mix. The current build is a **React + Vite** single-page app served by a **Python** backend on Render — no database required; cache and uploaded facts live on disk.

---

## 2. Why we moved away from Amazon Cloudscape

The app went through three UI phases:

| Phase | UI | Problem |
|-------|-----|---------|
| **1. Vanilla** | `public/index.html` + `app.js` | Worked, but hard to maintain as features grew |
| **2. Cloudscape** | `@cloudscape-design/components` (AWS console design system) | Felt like an **AWS admin console**, not a grocery ops tool |
| **3. Current** | React + Tailwind + custom `sectionUi` tokens | Brand-owned dark UI tuned for store staff |

### Specific reasons Cloudscape was replaced

1. **Wrong visual language** — Cloudscape is built for dense enterprise consoles (flat grays, AppLayout chrome). La Bodega needed a **retail / editorial** feel: bold type, brand orange (`#ff6a3d`), green prices, dark ink background.

2. **Hard to customize** — Cloudscape components ship opinionated CSS. Custom glass, gradients, card depth, and hero imagery fought the design system instead of supporting it.

3. **Product identity** — References (Flora, StackAI, TwelveLabs-style editorial SaaS) pointed to **display typography + dark canvas + motion**, not AWS console patterns.

4. **Feature gaps after migration** — Early Cloudscape/React builds dropped legacy features (recommendation cards, product search, combos polish). The current build **restores** those on the new stack.

5. **Bundle & complexity** — Cloudscape added weight for components we mostly replaced with Tailwind utilities and a small shared library (`sectionUi.jsx`, `layout.js`).

6. **Mobile & hero** — Store photo hero, sticky header, and touch-friendly 44px targets are easier with Tailwind than overriding Cloudscape `AppLayout` / `ContentLayout`.

**What we kept from the Cloudscape era:** structured tabs, panel/card metaphors, table patterns for pricing — reimplemented as `PANEL`, `TABLE_HEAD`, `PageHeader`, `SectionHeader`.

---

## 3. Current stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Motion, Lucide icons, Leaflet (trade area map) |
| **Backend** | Python 3.12 stdlib — `server.py`, `sales.py`, `weather.py`, `forecast.py`, `events.py`, `outreach.py` |
| **Data** | Flipp/Wishabi API (`backflipp.wishabi.com`), file cache (`cache/`), uploaded facts (`data/sales_facts.json`) |
| **Deploy** | Render.com — Docker multi-stage build (`Dockerfile`: `npm run build` → Python serves `frontend/dist`) |
| **Auth (optional)** | `APP_PASSWORD` env → HTTP Basic Auth on all `/api/*` |
| **Design tokens** | `design-system/tokens/` (Tokens Studio / Figma sync) + `frontend/src/index.css` `@theme` |

### Run locally

```bash
# Frontend only (proxies /api to Render)
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Full stack (build + Python)
python server.py
# → http://localhost:8000
```

### Deploy

Push to `main` → Render auto-builds from `Dockerfile`. First deals load can take **30–60 seconds** (Flipp scrape). Cache TTL ~6 hours unless **Refresh deals** / `?refresh=1`.

---

## 4. Features — current build (by tab)

### 🏠 Dashboard

- Landing page with **store hero**, welcome header, sync metadata
- **Stat row:** competitor ads, category winners, markets, data status (Live vs Sample)
- **Week signal** callout when backend provides it
- **Weekend recommendation cards** (BRING PEOPLE IN, PROTECT MARGIN, GROW THE BASKET, etc.)
- **Weekend weather strip** (Sat/Sun temps + rain)
- **Explore sections** — navigation cards to all tabs with live metrics
- **Fresh meat leaders** (chicken / pork / beef) with link to Best near you
- **Upload CSV CTA** when on sample data

### ☀️ Daily Ops

- 3-day **weather playbook** (push/skip categories per day)
- **Sales targets by day** — tabbed view across forecast days
- Category targets table (typical vs today’s target + rationale)
- Refresh forecast

### 🏪 Deals

- **Market areas** — presets from `config.json` `area_presets` (Calhoun, Houston, Dallas, San Antonio, RGV, Miami, Orlando) + custom ZIPs
- **Best near you** — default sub-tab; category winners; meat split chicken/pork/beef; fresh-cut filter; spread badges
- **Deals by store** — filter by category, retailer, Latino-only; search within loaded deals; sort; CSV export
- **Combo packs** — Latino-first bundle / weekend pack deals
- **Search weekly ads** — Flipp `/api/search` + hint chips
- Deal cards with images, Latino badge, valid-through dates, **strike-through original price**

### 📊 Your Store

- **Upload POS CSV** → pricing, basket, retention, top customers, trade area
- **Market pricing table** — your avg vs market low/median (when uploaded)
- **Basket analysis** — meat anchor, attach rates, segments (demo preview when no upload)
- **Retention & loyalty** — tiers, gauge (demo preview when no upload)
- **Top customers** — masked IDs (demo preview when no upload)
- **Trade area** — ZIP reach map (Leaflet) + top ZIPs (live when CSV has ZIPs)
- **Outreach** — WhatsApp campaign demo (`/api/outreach`, demo mode by default)
- **Promo ideas** — segment suggestions when uploaded; **weekend plan cards** from live ads when not
- Export pricing CSV, print report
- Sticky sub-nav: Upload · Pricing · Outreach · Basket · Retention · Top customers · Trade area · Ideas

### 📈 Trending

- Top 10 advertised products — **Latino supermarkets** vs **mainstream**
- Product **thumbnails** when Flipp provides images
- National scan across configured metros (`config.json` `trending_zips`)

---

## 5. Backend API reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/meta` | Demo mode flag, app metadata |
| GET | `/api/data?zips=&refresh=` | Deals, combos, recommendations, pricing comparison, facts |
| GET | `/api/forecast?refresh=` | Weather days, sales targets, events (if enabled) |
| GET | `/api/trending?refresh=` | National trending (Latino + mainstream) |
| GET | `/api/search?q=&zips=&latino=` | Search any product term in weekly ads |
| GET | `/api/outreach` | WhatsApp outreach demo metrics |
| POST | `/api/upload` | Upload sales CSV (`X-Filename` header) |
| POST | `/api/events` | Add manual local event (when events enabled) |

**Key payload fields (`/api/data`):**

- `deals_by_category`, `combos`, `merchants`, `week_signal`
- `recommendations[]` — weekend plan cards (tag, title, body, benchmark deal)
- `price_comparison[]`, `segment_suggestions`, `facts`, `search_hints`
- `area_presets`, `categories`, `generated_at`

---

## 6. Configuration (`config.json`)

| Key | Purpose |
|-----|---------|
| `categories` (8) | Meat, tortillas, charcoal, soda, queso, crema, salsa, produce — Flipp search terms |
| `area_presets` (7) | Market ZIP bundles for TX/FL/GA |
| `latino_merchants` | Auto-tag Latino grocers (El Rancho, Fiesta, etc.) |
| `combo_search_terms` / `combo_keywords` | Combo discovery |
| `trending_zips` / `trending_terms` | National trending scan |
| `facts` | Default sample sales numbers until CSV upload |
| `show_local_events` | **`false`** — event pipeline exists but UI/API disabled |
| `outreach` | Demo WhatsApp campaign config |

**Recent backend change (pushed):** Expanded meat Flipp terms + filter for breaded/prepared items in `server.py`.

---

## 7. Frontend file map

```
frontend/src/
├── App.jsx                 # Tabs, data fetching, header, load progress
├── index.css               # @theme tokens (ink, brand, leaf, sky)
├── lib/
│   ├── sectionUi.jsx       # PageHeader, SectionHeader, StatCard, buttons, LockedFooter
│   ├── layout.js         # PANEL, PANEL_MUTED, filter grids
│   ├── dealWinners.js    # Best near you logic + category validation
│   ├── marketAreas.js    # area_presets → market chips
│   ├── demoAnalytics.js  # Sample data for locked previews
│   └── export.js         # CSV export, print
└── components/
    ├── DashboardSection.jsx      # Home landing
    ├── RecommendationCards.jsx   # Weekend plan cards
    ├── DealSearchPanel.jsx       # Flipp search UI
    ├── DealsSection.jsx + BestDealsPanel.jsx
    ├── InsightsSection.jsx       # Your Store (largest file)
    ├── WeatherSection.jsx, TrendingSection.jsx
    ├── AreaSelector.jsx, HeroBanner.jsx, AppFooter.jsx
    └── TradeAreaMap*.jsx, Demo*Previews, InsightCharts.jsx

design-system/              # Figma / Tokens Studio sync
public/app.js               # Legacy vanilla UI (reference only — not served in prod)
```

Production serves **`frontend/dist`** only. Legacy `public/` remains in repo for reference.

---

## 8. Known gaps & backlog

| Priority | Item | Notes |
|----------|------|-------|
| High | UI consistency pass | Deals `PageHeader`, unified tabs/buttons, PANEL padding — see design-system audit |
| Medium | Enable local events | Set `show_local_events: true` + Weather UI |
| Medium | Spanish / bilingual labels | UI still English-only |
| Medium | Live WhatsApp (Supabase) | `DEMO_MODE=0` + env vars |
| Low | Figma component library | Tokens in repo; Figma file manual setup (`design-system/figma/SETUP.md`) |
| Low | Copy price to clipboard, pin deals | Old backlog |

---

## 9. Key gotchas

- **First load is slow** — Flipp scrape across ZIPs × categories. Header shows load progress; Daily Ops/Trending may appear before Deals finishes.
- **Dev proxy** — `npm run dev` proxies `/api` to Render; no local Python required for frontend work.
- **Cache** — Delete `cache/` if stale ads persist after refresh.
- **Upload persists** — CSV analysis saved to `data/sales_facts.json` on the server (not in git).
- **Trade area map** — Needs explicit height; Leaflet bundled (not CDN). Blank map was a CSS height bug (fixed).
- **Best near you meat** — Fresh cuts only; breaded/prepared excluded by design.

---

## 10. Contacts & ownership

- **Product owner:** La Bodega / Danny  
- **Repo:** Mattjr21/competitor-watch  
- **Hosting:** Render (auto-deploy from `main`)

For questions about recommendation logic, start with `server.py` → `build_recommendations()` and `build_week_signal()`. For UI patterns, start with `sectionUi.jsx` and `design-system/components/catalog.json`.
