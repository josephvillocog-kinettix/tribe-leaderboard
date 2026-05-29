/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TribeConfig, Tribe } from './types';

// A helper list of known elements, mottos, descriptions, icons, and logo assets for key Hawaiian tribes
// to keep the frontend rich, while leaving the data entirely dynamic and driven by the API.
const DYNAMIC_TRIBES_INFO: Record<string, Partial<TribeConfig>> = {
  voyagers: {
    name: "Canoe Voyagers",
    avatar: "⛵",
    color: "from-blue-700 via-blue-500 to-cyan-400",
    accentColor: "text-cyan-400",
    bgGradient: "from-blue-950 to-slate-900",
    textColor: "text-blue-100",
    borderColor: "border-blue-500/30",
    shadowColor: "shadow-blue-500/20",
    description: "Master star navigators and deep-ocean outrigger canoe sailors tracking the high-seas horizons.",
    element: "Ocean Waves",
    motto: "“He waʻa he moku, he moku he waʻa” — The canoe is our island.",
    icon: "Ship",
    logoUrl: "/assets/voyagers.png"
  },
  stormbreakers: {
    name: "Storm Surfbreakers",
    avatar: "⚡",
    color: "from-indigo-800 via-purple-600 to-pink-500",
    accentColor: "text-pink-400",
    bgGradient: "from-indigo-950 to-slate-900",
    textColor: "text-indigo-100",
    borderColor: "border-purple-500/30",
    shadowColor: "shadow-purple-500/20",
    description: "Typhoon surfers who draw unyielding mana (spiritual power) from high-voltage tropical thunderstorms.",
    element: "Ocean Gale & Lightning",
    motto: "“Aʻohe lani keʻea” — The skies are full of high-spirited power.",
    icon: "CloudLightning",
    logoUrl: "/assets/stormbreakers.png"
  },
  keepers: {
    name: "Forest Keepers",
    avatar: "🌴",
    color: "from-emerald-800 via-green-600 to-teal-400",
    accentColor: "text-emerald-400",
    bgGradient: "from-emerald-950 to-slate-900",
    textColor: "text-emerald-100",
    borderColor: "border-emerald-500/30",
    shadowColor: "shadow-emerald-500/20",
    description: "Guardians of sacred sandalwood forests, sweet taro valleys, and volcanic fertile valleys.",
    element: "Sacred Earth",
    motto: "“Ua mau ke ea o ka ʻāina” — The sovereignty of the land is everlasting.",
    icon: "Trees",
    logoUrl: "/assets/keepers.png"
  },
  guardians: {
    name: "Reef Guardians",
    avatar: "🐢",
    color: "from-teal-700 via-teal-500 to-emerald-400",
    accentColor: "text-teal-300",
    bgGradient: "from-teal-950 to-slate-900",
    textColor: "text-teal-100",
    borderColor: "border-teal-500/30",
    shadowColor: "shadow-teal-500/20",
    description: "Ancient coral-dwelling tortoise protectors shielding vibrant deep reefs and turquoise lagoons.",
    element: "Teal Lagoons",
    motto: "“Pūpūkahi holomua” — Unite together to safely defend.",
    icon: "Shield",
    logoUrl: "/assets/guardians.png"
  },
  raiders: {
    name: "Volcano Raiders",
    avatar: "🌋",
    color: "from-red-700 via-orange-600 to-yellow-400",
    accentColor: "text-orange-400",
    bgGradient: "from-red-950 to-slate-900",
    textColor: "text-red-100",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
    description: "Fierce volcanic warriors harnessing the liquid molten core of Madame Pele's island-forging fire.",
    element: "Molten Lava",
    motto: "“Kūlia i ka nuʻu” — Strive to conquer the highest active peak.",
    icon: "Flame",
    logoUrl: "/assets/raiders.png"
  },
  pathfinders: {
    name: "Sun Pathfinders",
    avatar: "☀️",
    color: "from-orange-600 via-amber-500 to-yellow-300",
    accentColor: "text-yellow-400",
    bgGradient: "from-orange-950 to-slate-900",
    textColor: "text-orange-100",
    borderColor: "border-amber-500/30",
    shadowColor: "shadow-amber-500/20",
    description: "Celestial navigators tracing paths using sunrise cues, trades winds, and birds' migrations.",
    element: "Celestial Wayfinding",
    motto: "“Imua!” — Steady forward with unwavering conviction.",
    icon: "Compass",
    logoUrl: "/assets/pathfinders.png"
  }
};

/**
 * Dynamically computes a valid TribeConfig block for any tribe key.
 * This ensures customizable/new tribes dynamically loaded from Google Sheet API will automatically
 * be fully configured with responsive styling presets!
 */
export function getTribeConfig(tribe: Tribe | string): TribeConfig {
  const tribeKey = typeof tribe === 'string' ? tribe.toLowerCase().trim() : tribe.tribe.toLowerCase().trim();
  const fetched = typeof tribe === 'string' ? null : tribe;

  const info = DYNAMIC_TRIBES_INFO[tribeKey] || {};

  const id = fetched?.id || 99;
  const displayName = info.name || (tribeKey.charAt(0).toUpperCase() + tribeKey.slice(1).replace(/[-_]/g, ' ') + ' Tribe');
  const avatar = info.avatar || "🌺";
  const color = fetched?.color || info.color || "from-amber-500 via-orange-500 to-yellow-400";
  const accentColor = info.accentColor || "text-amber-500";
  const bgGradient = info.bgGradient || "from-slate-950 to-slate-900";
  const textColor = info.textColor || "text-amber-100";
  const borderColor = info.borderColor || "border-amber-500/20";
  const shadowColor = info.shadowColor || "shadow-amber-500/10";
  const description = info.description || `Representing the proud ${displayName} of our legendary Hawaiian island chain.`;
  const element = info.element || "Island Spirit";
  const motto = info.motto || "“Imua!” — Steady forward with unwavering conviction.";
  const icon = info.icon || "Trophy";
  const logoUrl = info.logoUrl || `/assets/${tribeKey}.png`;

  return {
    id,
    key: tribeKey,
    name: displayName,
    avatar,
    color,
    accentColor,
    bgGradient,
    textColor,
    borderColor,
    shadowColor,
    description,
    element,
    motto,
    icon,
    logoUrl
  };
}

// Proxied backward-compatible object that intercepts access dynamically
// and completely eliminates static records!
export const HAWAIIAN_TRIBES_MAP = new Proxy<Record<string, TribeConfig>>({}, {
  get: (target, prop) => {
    if (typeof prop !== "string") return undefined;
    return getTribeConfig(prop);
  },
  ownKeys: () => {
    return Object.keys(DYNAMIC_TRIBES_INFO);
  },
  getOwnPropertyDescriptor: (target, prop) => {
    return {
      enumerable: true,
      configurable: true,
      writable: false,
      value: getTribeConfig(prop as string)
    };
  }
});

export const FALLBACK_TRIBES = [
  { id: 1, tribe: "voyagers", points: 120 },
  { id: 2, tribe: "stormbreakers", points: 110 },
  { id: 3, tribe: "keepers", points: 130 },
  { id: 4, tribe: "guardians", points: 100 },
  { id: 5, tribe: "raiders", points: 95 },
  { id: 6, tribe: "pathfinders", points: 105 }
];
