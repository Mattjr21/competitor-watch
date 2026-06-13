function parsePrice(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const PREPARED_PATTERNS = [
  "breaded",
  "battered",
  " fried ",
  "nugget",
  "popcorn chicken",
  "chicken patty",
  "chicken burger",
  "chicken sausage",
  "baked chicken",
  "piece baked",
  "rotisserie",
  "fully cooked",
  "precooked",
  "pre-cooked",
  "tv dinner",
  "salisbury",
  "meatball",
  " hot dog",
  "corn dog",
  "breakfast sausage",
  "smoked sausage",
  "italian sausage",
  " bacon",
  " lunch meat",
  "pot pie",
  "buffalo wing",
  "wing sauce",
  "tyson trimmed",
  " chicken tender",
  " tenders",
  " strips",
  "frozen patty",
  "frozen patties",
  " beef patty",
  " beef burger",
  " beef slider",
  " beef sliders",
  "marinated pork",
  "marinated filet",
  "hungry-man",
  "banquet ",
  "marie callender",
  "hot pocket",
];

/** Breaded, frozen entrees, sausages, etc. — not fresh counter cuts. */
export function isPreparedMeat(name, type = null) {
  const n = ` ${(name || "").toLowerCase()} `;

  if (PREPARED_PATTERNS.some((p) => n.includes(p))) return true;

  if (type === "chicken" || type === null) {
    if (/chicken|pollo/.test(n)) {
      if (/\bburger\b|\bsausage\b|\bpatty\b|\bbaked\b|\brotisserie\b/.test(n)) return true;
    }
  }

  if (type === "pork" || type === null) {
    if (/\bbacon\b|\bham\b|\bsausage\b|\bhot link\b/.test(n)) return true;
  }

  if (type === "beef" || type === null) {
    if (/\bpatty\b|\bpatties\b|\bburger\b|\bslider\b|\bsliders\b/.test(n)) return true;
  }

  return false;
}

/** Reject obvious category mismatches (e.g. frozen corn in Tortillas). */
export function matchesCategoryProduct(catKey, name) {
  const n = (name || "").toLowerCase();

  switch (catKey) {
    case "tortilla":
      if (/sweet corn|frozen corn|steamed corn|steam corn|corn on the cob|kernel corn|cut corn/.test(n)) {
        return false;
      }
      return /tortilla|tostada|masa harina|corn tortilla|flour tortilla/.test(n);
    case "salsa":
      return /salsa|valentina|picante|hot sauce|salsa verde|salsa roja|tamazula|cholula|picamas/.test(n);
    case "soda":
      if (/charcoal|detergent|paper plate|lighter fluid/.test(n)) return false;
      return /soda|cola|coke|pepsi|sprite|fanta|jarrito|drink|juice|refresco|tea|water|agua|beer|cerveza|squirt|sidral/.test(
        n
      );
    case "queso":
      return /queso|cheese|cotija|oaxaca|panela|fresco|cheddar|mozzarella|jack cheese/.test(n);
    case "crema":
      return /crema|sour cream/.test(n);
    case "charcoal":
      return /charcoal|carbon|carb[oó]n|mesquite|briquet|kingsford/.test(n);
    case "produce":
      if (/frozen|nugget|chicken|beef|pork|soda|tortilla/.test(n)) return false;
      return /avocado|tomato|tomate|lime|lim[oó]n|cilantro|onion|cebolla|chile|pepper|mango|banana|produce|verdura|lettuce|potato|squash|cucumber|melon|grape|apple|orange|pl[aá]tano|broccoli|carrot/.test(
        n
      );
    default:
      return true;
  }
}

export const MEAT_TYPES = [
  {
    key: "chicken",
    label: "Chicken / Pollo",
    search: "chicken",
    match(name) {
      const n = (name || "").toLowerCase();
      if (/pork|puerco|beef|steak|chuck|brisket|angus/.test(n) && !/pollo|chicken/.test(n)) {
        return false;
      }
      return /chicken|pollo|pechuga|drumstick|thigh|breast|wing|muslo|ala\b/.test(n);
    },
  },
  {
    key: "pork",
    label: "Pork / Cerdo",
    search: "pork",
    match(name) {
      const n = (name || "").toLowerCase();
      if (/chicken|pollo|beef|steak|ground beef|angus chuck/.test(n)) return false;
      return /pork|puerco|cerdo|sparerib|loin chop|pork chop|pork loin|shoulder/.test(n);
    },
  },
  {
    key: "beef",
    label: "Beef / Res",
    search: "beef",
    match(name) {
      const n = (name || "").toLowerCase();
      if (/chicken|pollo|pork|puerco/.test(n)) return false;
      return /beef|steak|chuck|brisket|ground beef|angus|sirloin|ribeye|bistec|carne asada|fresh beef|carne molida/.test(
        n
      );
    },
  },
];

export function formatDealPrice(value, unit) {
  const n = parsePrice(value);
  if (n == null) return value ?? "—";
  const dollars = "$" + n.toFixed(2).replace(/\.00$/, "");
  return unit ? `${dollars}/${unit}` : dollars;
}

function buildWinnerRow({ catKey, rowKey, meatType, meatLabel, priced, freshOnly = false }) {
  const winner = priced[0];
  const prices = priced.map((d) => d.numericPrice);
  const low = prices[0];
  const high = prices[prices.length - 1];
  const med = median(prices);
  const storeCount = new Set(priced.map((d) => d.merchant)).size;
  const runnerUp = priced.find((d) => d.merchant !== winner.merchant) || null;

  return {
    catKey,
    rowKey,
    catLabel: meatLabel,
    meatType: meatType || null,
    meatSearch: meatType ? MEAT_TYPES.find((t) => t.key === meatType)?.search || "" : "",
    freshOnly,
    winner,
    low,
    median: med != null ? Math.round(med * 100) / 100 : null,
    high: Math.round(high * 100) / 100,
    spread: Math.round((high - low) * 100) / 100,
    adCount: priced.length,
    storeCount,
    runnerUp,
    comparable: storeCount >= 2,
  };
}

function freshMeatPool(priced, typeDef) {
  return priced.filter(
    (d) => typeDef.match(d.name) && !isPreparedMeat(d.name, typeDef.key)
  );
}

function validatedCategoryPool(catKey, priced) {
  return priced.filter((d) => matchesCategoryProduct(catKey, d.name));
}

function sortNonMeatWinners(winners) {
  winners.sort((a, b) => {
    if (a.comparable !== b.comparable) return a.comparable ? -1 : 1;
    if (b.spread !== a.spread) return b.spread - a.spread;
    return a.catLabel.localeCompare(b.catLabel);
  });
  return winners;
}

/** Lowest fresh-cut ad per category; meat split into chicken, pork, and beef. */
export function computeCategoryWinners(dealsByCategory, categories = []) {
  const meatWinners = [];
  const otherWinners = [];

  for (const cat of categories) {
    const deals = dealsByCategory?.[cat.key] || [];
    const priced = deals
      .map((d) => ({ ...d, numericPrice: parsePrice(d.price) }))
      .filter((d) => d.numericPrice != null)
      .sort((a, b) => a.numericPrice - b.numericPrice);

    if (!priced.length) continue;

    if (cat.key === "meat") {
      for (const type of MEAT_TYPES) {
        const fresh = freshMeatPool(priced, type);
        if (!fresh.length) continue;
        meatWinners.push(
          buildWinnerRow({
            catKey: cat.key,
            rowKey: `${cat.key}-${type.key}`,
            meatType: type.key,
            meatLabel: type.label,
            priced: fresh,
            freshOnly: true,
          })
        );
      }
      continue;
    }

    const validated = validatedCategoryPool(cat.key, priced);
    if (!validated.length) continue;

    otherWinners.push(
      buildWinnerRow({
        catKey: cat.key,
        rowKey: cat.key,
        meatLabel: cat.label,
        priced: validated,
      })
    );
  }

  return [...meatWinners, ...sortNonMeatWinners(otherWinners)];
}
