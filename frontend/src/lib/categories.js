import {
  Beef,
  Carrot,
  Milk,
  Wheat,
  CupSoda,
  Flame,
  SprayCan,
  Apple,
  Fish,
  Tag,
} from "lucide-react";

// Maps a free-text category label (English or Spanish) to a color + icon.
const RULES = [
  { kw: ["meat", "carne", "beef", "pork", "poultry", "chicken", "pollo", "seafood", "fish", "pescado"], color: "#b91c1c", icon: Beef },
  { kw: ["produce", "verdura", "vegetable", "fruit", "fruta", "tomato"], color: "#34c759", icon: Carrot },
  { kw: ["dairy", "lacteo", "cheese", "queso", "milk", "leche", "cream", "crema", "butter", "yogurt"], color: "#4aa3ff", icon: Milk },
  { kw: ["tortilla", "bread", "bakery", "pan", "masa", "chips", "snack"], color: "#f0b429", icon: Wheat },
  { kw: ["salsa", "spice", "especia", "chile"], color: "#ff5d5d", icon: Flame },
  { kw: ["drink", "beverage", "bebida", "soda", "juice", "agua", "beer", "cerveza"], color: "#2dd4bf", icon: CupSoda },
  { kw: ["household", "cleaning", "limpieza", "personal"], color: "#9b8cff", icon: SprayCan },
  { kw: ["apple", "snack"], color: "#34c759", icon: Apple },
];

const DEFAULT = { color: "#8b95a3", icon: Tag };

export function getCategoryMeta(label) {
  if (!label) return DEFAULT;
  const text = String(label).toLowerCase();
  for (const rule of RULES) {
    if (rule.kw.some((k) => text.includes(k))) {
      return { color: rule.color, icon: rule.icon };
    }
  }
  return DEFAULT;
}

export { Fish };
