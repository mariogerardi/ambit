import { CatmullRomCurve3, Vector3 } from "three";
import type { MapOverlay } from "../geography/types";

/** Original schematic, reviewed against UNESCO's Silk Roads programme map (2025):
 * https://www.unesco.org/sites/default/files/2026-04/SILK%20ROADS%20MAP_Dec%202025_1.jpg
 * Tarim branches also checked against https://whc.unesco.org/en/tentativelists/5492/.
 * Rounded geographic anchors, not traced artwork, surveyed tracks or one dated itinerary.
 * Only selected overland connections are shown; maritime/steppe networks are omitted.
 * No source image or third-party vector geometry is redistributed.
 */
const nodes: Record<string, [number, number]> = {
  luoyang: [112.45, 34.62],
  xian: [108.93, 34.26],
  lanzhou: [103.84, 36.06],
  wuwei: [102.64, 37.93],
  zhangye: [100.45, 38.93],
  jiuquan: [98.49, 39.74],
  dunhuang: [94.68, 40.17],
  hami: [93.51, 42.83],
  turfan: [89.18, 42.95],
  kucha: [82.96, 41.72],
  aksu: [80.26, 41.17],
  kashgar: [75.99, 39.47],
  cherchen: [85.53, 38.14],
  niya: [82.69, 37.07],
  khotan: [79.93, 37.11],
  yarkand: [77.25, 38.42],
  osh: [72.8, 40.53],
  fergana: [71.79, 40.38],
  kokand: [70.94, 40.53],
  samarkand: [66.96, 39.65],
  bukhara: [64.42, 39.77],
  merv: [62.18, 37.66],
  balkh: [66.9, 36.76],
  nishapur: [58.8, 36.21],
  gorgan: [54.44, 36.84],
  rayy: [51.44, 35.59],
  ecbatana: [48.52, 34.8],
  ctesiphon: [44.58, 33.09],
  baghdad: [44.4, 33.34],
  palmyra: [38.27, 34.55],
  damascus: [36.29, 33.51],
  antioch: [36.16, 36.2],
  tabriz: [46.29, 38.08],
  erzurum: [41.27, 39.9],
  sivas: [37.02, 39.75],
  bursa: [29.06, 40.19],
  istanbul: [28.98, 41.01],
  baku: [49.87, 40.41],
  isfahan: [51.68, 32.65],
  shiraz: [52.58, 29.59],
  hormuz: [56.45, 27.06],
};
const branches = {
  hexi: [
    "luoyang",
    "xian",
    "lanzhou",
    "wuwei",
    "zhangye",
    "jiuquan",
    "dunhuang",
  ],
  "tarim-north": ["dunhuang", "hami", "turfan", "kucha", "aksu", "kashgar"],
  "tarim-south": [
    "dunhuang",
    "cherchen",
    "niya",
    "khotan",
    "yarkand",
    "kashgar",
  ],
  transoxiana: [
    "kashgar",
    "osh",
    "fergana",
    "kokand",
    "samarkand",
    "bukhara",
    "merv",
  ],
  bactria: ["kashgar", "balkh", "merv"],
  "iran-mesopotamia": [
    "merv",
    "nishapur",
    "gorgan",
    "rayy",
    "ecbatana",
    "ctesiphon",
    "baghdad",
  ],
  levant: ["baghdad", "palmyra", "damascus", "antioch"],
  anatolia: ["rayy", "tabriz", "erzurum", "sivas", "bursa", "istanbul"],
  caucasus: ["tabriz", "baku"],
  "persian-gulf": ["rayy", "isfahan", "shiraz", "hormuz"],
};

// Smooth the illustrative bends on the sphere while retaining every authored anchor.
function curved(stops: string[]) {
  const curve = new CatmullRomCurve3(
    stops.map((stop) => {
      const [lng, lat] = nodes[stop].map((deg) => (deg * Math.PI) / 180);
      return new Vector3(
        Math.cos(lat) * Math.sin(lng),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lng),
      );
    }),
  );
  return curve.getPoints((stops.length - 1) * 16).map((point) => {
    point.normalize();
    return [
      (Math.atan2(point.x, point.z) * 180) / Math.PI,
      (Math.asin(point.y) * 180) / Math.PI,
    ];
  });
}

export const SILK_ROAD_CORRIDORS: MapOverlay[] = Object.entries(branches).map(
  ([id, stops]) => ({
    id: `silk-corridor:${id}`,
    type: "path",
    visualState: "corridor",
    coordinates: curved(stops),
    opacity: 1,
  }),
);
