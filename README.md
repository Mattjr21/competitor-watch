# Competitor Watch - La Bodega

A small local app that pulls **live competitor weekly-ad deals** for your area
(by ZIP code) from the Flipp/Wishabi backend, compares them to La Bodega's own
sales patterns, and auto-generates a **"what to feature this weekend"** plan.

No installs needed - it runs on the Python standard library only.

## Run it

```bash
cd competitor-watch
python server.py
```

Then open **http://localhost:8000** in your browser.

- The first load fetches live ads and takes ~20-40 seconds.
- Results are cached for 6 hours. Click **Refresh deals** to force a fresh pull.

## What it shows

1. **What to feature this weekend** - plain-language recommendation cards, each
   colour-coded by goal:
   - **Bring people in** (door-driver meat deal, Sat & Sun only)
   - **Protect margin** (don't discount your sellout tortilla)
   - **Grow the basket** (add-ons stacked at the meat counter)
   - **Lift slow days** (2x points midweek)

   Each card shows the cheapest competitor price nearby and, once you've
   uploaded sales data, **your own average price** and how it compares.
2. **Combos & weekend packs spotted** - bundle / multi-buy / "fin de semana"
   deals nearby, **Latino groceries first**, for menu and promo inspiration.
3. **Live competitor deals** - every matching deal found across your ZIPs,
   filterable by category and retailer, sorted cheapest first.

## Change the area / ZIP codes

Use the **area chips** (Houston, Dallas, San Antonio, Rio Grande Valley,
Hialeah/Miami, Orlando, etc.) or type any ZIP codes (comma-separated) in the box
and click **Load area**. This is how you peek at the **Mexican / Latin American
supermarkets** that advertise heavily in Texas and Florida - El Rancho
Supermercado, La Michoacana, Fiesta Mart, Mi Tienda, Foodarama (TX) and
Fresco y Mas (FL) - to see the combos and weekend deals they run.

Latino-owned grocers are auto-tagged with a **LATINO** badge; tick
"Latino groceries only" to focus on them. Edit the `latino_merchants` and
`area_presets` lists in `config.json` to add more.

## Combos & weekend packs (by ZIP)

The top section, **Combos & weekend packs spotted**, is the quickest win: it
pulls bundle / multi-buy / "paquete" / weekend-pack deals running near the
selected ZIP codes so you can copy the ideas for your own Sat & Sun. Each card
shows which ZIP(s) the deal was seen in. Use the **Area / ZIP** dropdown to
narrow to one ZIP, and tick **Latino groceries only** to focus on the Mexican /
Latin American chains (El Rancho's "Taquiza COMBO", Fiesta's "Torta Combo",
etc.). Switch the area presets to Texas/Florida to mine those markets.

Combo search terms and what counts as a combo live in `config.json`
(`combo_search_terms` and `combo_keywords`).

## Upload your sales data (recommended)

Click **Upload sales data** (top right) and pick a CSV export of your weekly or
monthly sales. The app reads it and recomputes everything automatically:

- your average price per category (for the price comparison),
- how big a basket is *with* vs *without* meat (the anchor effect),
- how often each add-on rides with meat (attach rates),
- weekend vs weekday revenue.

The recommendations then update to your real numbers. Uploaded results are saved
to `data/sales_facts.json` and persist until you upload again.

**Expected columns** (a POS / "sale.report" style export): `Order`,
`Order Date`, `Product`, `Qty Ordered`, `Total`, `Unit Price`. Column names are
matched loosely, so small variations are fine.

## Customize

Everything is in **`config.json`** - no code changes needed:

- `zips` - the ZIP codes to monitor (primary + nearby towns).
- `categories` - the product categories tracked, the search `terms` used to find
  them, and each category's `role` (`anchor`, `protect`, `attach`, `support`)
  which drives the recommendation logic.
- `competitor_filter` - leave empty `[]` to see all retailers, or list specific
  retailer names (e.g. `["Walmart", "Kroger", "Food Lion"]`) to restrict.
- `facts` - your sales numbers (basket sizes, attach rates, targets) that the
  recommendation text references. Update these as your data changes.

## Host it on the cloud (so your team can access it)

The app binds to `0.0.0.0` and reads the `PORT` env var, so it runs on any
container host. A `Dockerfile`, `Procfile` and `requirements.txt` are included.

**Protect it with a shared password** (recommended for a public URL): set the
`APP_PASSWORD` environment variable. The browser will prompt for it; share that
one password with your team. Leave it unset for open/local use.

### Option A - Docker (works anywhere: Cloud Run, Fly.io, a VPS, etc.)

```bash
docker build -t competitor-watch .
docker run -p 8000:8000 -e APP_PASSWORD=yourteampassword competitor-watch
```

### Option B - Render.com (simplest, free tier)

1. Push this `competitor-watch` folder to a GitHub repo.
2. In Render: **New > Web Service**, point it at the repo.
3. Environment: **Docker** (it auto-detects the `Dockerfile`), or **Python** with
   start command `python server.py`.
4. Add an env var `APP_PASSWORD` = your chosen team password.
5. Deploy - Render gives you a shareable `https://...onrender.com` URL.

### Option C - Railway / Fly.io

Same idea: connect the repo, set `APP_PASSWORD`, deploy. The `Procfile`
(`web: python server.py`) is picked up automatically.

> Note: free tiers use ephemeral storage, so an uploaded `data/sales_facts.json`
> may reset when the instance restarts. Just re-upload, or attach a small
> persistent volume if your host supports it.

## Notes

- The Flipp/Wishabi backend is **unofficial** - great for periodic competitive
  checks, but it can rate-limit or change without notice. The 6-hour cache keeps
  requests light.
- Prices vary by store and the ad week; always verify before printing your own ads.
