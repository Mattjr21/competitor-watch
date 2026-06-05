let STATE = { data: null, catMap: {}, zips: null };

const $ = (sel) => document.querySelector(sel);

async function load(refresh = false) {
  const btn = $("#refresh");
  btn.disabled = true;
  $("#status").hidden = false;
  $("#status").textContent = refresh
    ? "Refreshing live competitor ads (this can take ~20-40s)..."
    : "Loading competitor ads...";
  try {
    const params = [];
    if (refresh) params.push("refresh=1");
    if (STATE.zips) params.push("zips=" + encodeURIComponent(STATE.zips));
    const res = await fetch("/api/data" + (params.length ? "?" + params.join("&") : ""));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    STATE.data = data;
    STATE.zips = data.zips.join(",");
    render(data);
  } catch (e) {
    $("#status").hidden = false;
    $("#status").textContent = "Could not load deals: " + e.message;
  } finally {
    btn.disabled = false;
  }
}

function render(data) {
  $("#status").hidden = true;
  $("#store-name").textContent = data.store_name + " - Competitor Watch";
  $("#meta").textContent =
    `Area: ${data.zips.join(", ")} · ${data.merchants.length} retailers (${data.latino_merchants.length} Latino) · updated ${data.generated_at}`;
  $("#foot-meta").textContent = `${data.zips.length} ZIPs · ${data.merchants.length} retailers found`;
  $("#rec-source").textContent = `Based on: ${data.data_source} + live competitor ads.`;
  $("#week-signal").textContent = data.week_signal || "";

  renderPresets(data);
  renderSearchHints(data.search_hints || []);
  renderComboFilters(data);
  renderCombos();
  renderRecs(data.recommendations);
  buildCatMap(data);
  renderFilters(data);
  renderDeals();

  $("#rec-block").hidden = false;
  $("#deals-block").hidden = false;
}

function renderSearchHints(hints) {
  const wrap = $("#search-chips");
  wrap.innerHTML = "";
  hints.forEach((term) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = term;
    chip.onclick = () => {
      $("#search-input").value = term;
      runSearch();
    };
    wrap.appendChild(chip);
  });
}

async function runSearch() {
  const q = $("#search-input").value.trim();
  if (q.length < 2) {
    $("#search-meta").hidden = false;
    $("#search-meta").textContent = "Type at least 2 characters to search.";
    $("#search-results").innerHTML = "";
    return;
  }
  const btn = $("#search-btn");
  const meta = $("#search-meta");
  const wrap = $("#search-results");
  btn.disabled = true;
  meta.hidden = false;
  meta.textContent = `Searching "${q}" across competitor ads...`;
  wrap.innerHTML = "";
  try {
    const params = ["q=" + encodeURIComponent(q)];
    if (STATE.zips) params.push("zips=" + encodeURIComponent(STATE.zips));
    if ($("#search-latino-only").checked) params.push("latino=1");
    const res = await fetch("/api/search?" + params.join("&"));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    meta.textContent = `${data.count} result${data.count !== 1 ? "s" : ""} for "${data.query}" near ${data.zips.length} ZIP${data.zips.length !== 1 ? "s" : ""}`;
    if (data.count === 0) {
      wrap.innerHTML = '<div class="empty">No ads found. Try another spelling, uncheck Latino only, or switch to a Texas/Florida area preset.</div>';
      return;
    }
    data.results.forEach((d) => wrap.appendChild(dealCard(d)));
    $("#search-block").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    meta.textContent = "Search failed: " + e.message;
  } finally {
    btn.disabled = false;
  }
}

function renderPresets(data) {
  const wrap = $("#area-presets");
  wrap.innerHTML = "";
  (data.area_presets || []).forEach((p) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (p.zips === STATE.zips ? " active" : "");
    chip.textContent = p.label;
    chip.onclick = () => {
      STATE.zips = p.zips;
      load(false);
    };
    wrap.appendChild(chip);
  });
  $("#zip-input").value = data.zips.join(",");
}

function renderRecs(recs) {
  const wrap = $("#recs");
  wrap.innerHTML = "";
  recs.forEach((r) => {
    const card = document.createElement("div");
    card.className = "rec-card " + r.tone;
    let bench = "";
    if (r.benchmark) {
      const b = r.benchmark;
      const price = b.price != null ? `$${b.price}${b.unit ? "/" + b.unit : ""}` : (b.sale_story || "");
      const tag = b.is_latino ? ' <span class="badge-latino">LATINO</span>' : "";
      bench = `<div class="rec-bench"><span>${b.merchant}${tag}: <b>${price}</b></span><span>thru ${b.valid_to || "-"}</span></div>`;
    }
    card.innerHTML = `
      <span class="rec-tag">${r.tag}</span>
      <h3>${r.title}</h3>
      <div class="rec-plain">${r.plain || ""}${r.goal ? " · Goal: " + r.goal : ""}</div>
      <p>${r.body}</p>
      ${bench}
    `;
    wrap.appendChild(card);
  });
}

function buildCatMap(data) {
  STATE.catMap = {};
  data.categories.forEach((c) => (STATE.catMap[c.key] = c.label));
}

function renderFilters(data) {
  const catSel = $("#cat-filter");
  const merchSel = $("#merch-filter");
  catSel.innerHTML = '<option value="">All categories</option>';
  data.categories.forEach((c) => {
    const n = (data.deals_by_category[c.key] || []).length;
    catSel.innerHTML += `<option value="${c.key}">${c.label} (${n})</option>`;
  });
  merchSel.innerHTML = '<option value="">All retailers</option>';
  data.merchants.forEach((m) => {
    merchSel.innerHTML += `<option value="${m}">${m}</option>`;
  });
  catSel.onchange = renderDeals;
  merchSel.onchange = renderDeals;
  $("#latino-only").onchange = renderDeals;
}

function dealCard(d) {
  const el = document.createElement("div");
  el.className = "deal" + (d.is_latino ? " latino" : "");
  const priceHtml =
    d.price != null
      ? `<div class="price-row"><span class="price">$${d.price}</span><span class="unit">${d.unit || ""}</span></div>`
      : "";
  const storyHtml = d.sale_story ? `<div class="story">${d.sale_story}</div>` : "";
  const badge = d.is_latino ? '<span class="badge-latino">LATINO</span>' : "";
  const catLabel = d.catKey ? `<span class="cat-pill">${STATE.catMap[d.catKey] || d.catKey}</span>` : "";
  const zipList = d.zips || (d.zip ? [d.zip] : []);
  const zipHtml = zipList.length
    ? `<span class="zip-pill">near ${zipList.slice(0, 4).join(", ")}${zipList.length > 4 ? " +" + (zipList.length - 4) : ""}</span>`
    : "";
  el.innerHTML = `
    <span class="merch">${d.merchant} ${badge}</span>
    <span class="name">${d.name}</span>
    ${priceHtml}
    ${storyHtml}
    ${catLabel}
    ${zipHtml}
    <span class="valid">${d.valid_to ? "thru " + d.valid_to : ""}</span>
  `;
  return el;
}

function renderDeals() {
  const data = STATE.data;
  const cat = $("#cat-filter").value;
  const merch = $("#merch-filter").value;
  const latinoOnly = $("#latino-only").checked;
  const wrap = $("#deals");
  wrap.innerHTML = "";

  let rows = [];
  Object.entries(data.deals_by_category).forEach(([key, deals]) => {
    if (cat && key !== cat) return;
    deals.forEach((d) => rows.push({ ...d, catKey: key }));
  });
  if (merch) rows = rows.filter((d) => d.merchant === merch);
  if (latinoOnly) rows = rows.filter((d) => d.is_latino);

  rows.sort((a, b) => (a.price == null ? 9e9 : a.price) - (b.price == null ? 9e9 : b.price));

  if (rows.length === 0) {
    wrap.innerHTML = '<div class="empty">No deals match this filter right now.</div>';
    return;
  }
  rows.forEach((d) => wrap.appendChild(dealCard(d)));
}

async function loadForecast(refresh = false) {
  const block = $("#ops-block");
  block.hidden = false;
  $("#weather-days").innerHTML = '<div class="trend-loading">Loading weather & events...</div>';
  try {
    const res = await fetch("/api/forecast" + (refresh ? "?refresh=1" : ""));
    const f = await res.json();
    if (f.error) throw new Error(f.error);
    const loc = f.location || {};
    let meta = `${loc.city || "Calhoun"}, ${loc.state || "GA"} ${loc.zip || "30701"} · updated ${f.generated_at}`;
    if (f.weather_stale) meta += " · cached forecast";
    if (f.warnings && f.warnings.length) meta += ` · ${f.warnings[0]}`;
    $("#ops-meta").textContent = meta;
    renderWeatherDays(f.weather_days || []);
    renderEventsList(f.events || {});
    renderTargets(f.targets || {}, f.weather_categories || []);
  } catch (e) {
    $("#weather-days").innerHTML = `<div class="empty">Could not load forecast: ${e.message}</div>`;
  }
}

function renderWeatherDays(days) {
  const wrap = $("#weather-days");
  wrap.innerHTML = "";
  if (!days.length) {
    wrap.innerHTML = '<div class="empty">No weather data.</div>';
    return;
  }
  days.forEach((d) => {
    const card = document.createElement("div");
    const cls = d.profile === "hot_grill" ? "hot" : d.profile === "rain_comfort" ? "rain" : d.profile === "cold_comfort" ? "cold" : "";
    card.className = "weather-card " + cls;
    const push = (d.push_categories || []).join(", ");
    const skip = (d.skip_categories || []).length ? ` · ease off: ${d.skip_categories.join(", ")}` : "";
    card.innerHTML = `
      <h4>${d.label} · ${d.date}</h4>
      <div class="weather-stats">${d.weather} · ${d.temp_high_f}°F high · ${d.rain_prob_pct}% rain</div>
      <div class="weather-playbook">${d.playbook_note || ""}</div>
      <div class="weather-push"><b>Push:</b> ${push}${skip}</div>
    `;
    wrap.appendChild(card);
  });
}

function renderEventsList(evPayload) {
  const list = $("#events-list");
  const note = $("#events-note");
  list.innerHTML = "";
  const events = evPayload.events || [];
  const errs = evPayload.facebook_errors || [];
  let noteTxt = evPayload.facebook_note || "";
  if (events.length) {
    noteTxt = `${events.length} event(s) — ${evPayload.manual_count || 0} manual, ${evPayload.facebook_count || 0} from Facebook.`;
  }
  if (errs.length) {
    noteTxt += " Some Facebook pages could not be scraped (login required). Add events manually below.";
  }
  note.textContent = noteTxt;
  if (!events.length) {
    list.innerHTML = '<li class="trend-loading">No events yet — add one below or edit facebook_pages in config.</li>';
    return;
  }
  events.forEach((e) => {
    const li = document.createElement("li");
    const src = e.source === "facebook" ? `Facebook · ${e.page}` : "Manual";
    const date = e.date ? ` · ${e.date}` : "";
    li.innerHTML = `<b>${e.name}</b>${date} <span class="ev-src">(${src} · ${e.type || "community"})</span>`;
    list.appendChild(li);
  });
}

function renderTargets(targets, wcats) {
  const tbl = $("#targets-table");
  const note = $("#targets-note");
  tbl.innerHTML = "";
  const days = targets.days || [];
  if (targets.note) {
    note.textContent = targets.note;
    return;
  }
  const today = days[0];
  if (!today) {
    note.textContent = "Upload sales CSV for category baselines.";
    return;
  }
  note.textContent =
    `${today.dow} ${today.date} · ${today.weather_summary} · target $${today.total_target.toLocaleString()} vs baseline $${today.total_baseline.toLocaleString()}`;
  if (today.events && today.events.length) {
    note.textContent += ` · Events: ${today.events.map((e) => e.name).join(", ")}`;
  }
  const labels = {};
  wcats.forEach((c) => (labels[c.key] = c.label));
  tbl.innerHTML =
    "<tr><th>Category</th><th>Typical day</th><th>Today's target</th><th>Why</th></tr>";
  (today.categories || []).forEach((c) => {
    const tr = document.createElement("tr");
    const diff = c.target - c.baseline;
    const cls = diff > 0 ? "tgt-up" : diff < 0 ? "tgt-down" : "";
    tr.innerHTML = `
      <td><b>${c.label}</b></td>
      <td>$${c.baseline.toLocaleString()}</td>
      <td class="${cls}">$${c.target.toLocaleString()}</td>
      <td>${c.why}</td>
    `;
    tbl.appendChild(tr);
  });
}

async function loadTrending(refresh = false) {
  const block = $("#trending-block");
  block.hidden = false;
  $("#trend-latino").innerHTML = '<li class="trend-loading">Scanning US Latino metros...</li>';
  $("#trend-main").innerHTML = "";
  try {
    const res = await fetch("/api/trending" + (refresh ? "?refresh=1" : ""));
    const t = await res.json();
    if (t.error) throw new Error(t.error);
    $("#trending-meta").textContent = t.scanned_zips
      ? `${t.scanned_zips.length} metros · updated ${t.generated_at}`
      : "";
    renderTrendList($("#trend-latino"), t.latino);
    renderTrendList($("#trend-main"), t.mainstream);
  } catch (e) {
    $("#trend-latino").innerHTML = `<li class="trend-loading">Could not load trends: ${e.message}</li>`;
  }
}

function renderTrendList(ol, rows) {
  ol.innerHTML = "";
  if (!rows || rows.length === 0) {
    ol.innerHTML = '<li class="trend-loading">No data this week.</li>';
    return;
  }
  rows.forEach((r) => {
    let price = "";
    if (r.min != null) price = r.min === r.max ? `$${r.min}` : `$${r.min}-$${r.max}`;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="trend-name">${r.name}</div>
      <div class="trend-stat">${r.stores} store${r.stores !== 1 ? "s" : ""} · ${r.areas} metro${r.areas !== 1 ? "s" : ""}${price ? " · " + price : ""}</div>
      <div class="trend-merch">${(r.merchants || []).join(", ")}</div>
    `;
    ol.appendChild(li);
  });
}

function renderComboFilters(data) {
  const zipSel = $("#combo-zip-filter");
  zipSel.innerHTML = '<option value="">All areas</option>';
  (data.zips || []).forEach((z) => {
    const n = (data.combos || []).filter((c) => (c.zips || []).includes(z)).length;
    zipSel.innerHTML += `<option value="${z}">${z} (${n})</option>`;
  });
  zipSel.onchange = renderCombos;
  $("#combo-latino-only").onchange = renderCombos;
}

function renderCombos() {
  const data = STATE.data;
  const block = $("#combos-block");
  const wrap = $("#combos");
  wrap.innerHTML = "";
  let combos = data.combos || [];
  const zip = $("#combo-zip-filter").value;
  const latinoOnly = $("#combo-latino-only").checked;
  if (zip) combos = combos.filter((c) => (c.zips || []).includes(zip));
  if (latinoOnly) combos = combos.filter((c) => c.is_latino);

  block.hidden = false;
  if (combos.length === 0) {
    wrap.innerHTML =
      '<div class="empty">No combo/pack deals match this filter right now. Try unchecking "Latino groceries only" or hit Refresh deals.</div>';
    return;
  }
  combos.forEach((d) => wrap.appendChild(dealCard(d)));
}

$("#refresh").addEventListener("click", () => {
  load(true);
  loadTrending(true);
  loadForecast(true);
});
$("#ops-refresh").addEventListener("click", () => loadForecast(true));

$("#event-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    name: $("#ev-name").value.trim(),
    date: $("#ev-date").value,
    type: $("#ev-type").value,
  };
  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json();
    if (out.error) throw new Error(out.error);
    $("#ev-name").value = "";
    await loadForecast(false);
  } catch (err) {
    alert("Could not save event: " + err.message);
  }
});

$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch();
});

$("#zip-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#zip-input").value.trim();
  if (v) {
    STATE.zips = v.replace(/\s+/g, "");
    load(false);
  }
});

$("#file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("#status").hidden = false;
  $("#status").textContent = `Analyzing ${file.name}...`;
  const text = await file.text();
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "text/csv", "X-Filename": file.name },
      body: text,
    });
    const out = await res.json();
    if (out.error) throw new Error(out.error);
    $("#status").textContent = `Loaded ${out.source_label}. Rebuilding recommendations...`;
    await load(false);
  } catch (err) {
    $("#status").hidden = false;
    $("#status").textContent = "Upload failed: " + err.message;
  } finally {
    e.target.value = "";
  }
});

load(false);
loadTrending(false);
loadForecast(false);
