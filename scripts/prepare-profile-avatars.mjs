import { mkdir, readFile, writeFile } from "node:fs/promises";
import { THEMES, THEME_IDS } from "../src/theme/themes.ts";
import { playColors } from "../src/theme/playColors.ts";

// Fixed palette variants: a saved avatar looks the same to every player.
const motifs = [
  "Pinpoint",
  "Finish flag",
  "Star",
  "Mountain",
  "Explore compass",
  "Journey",
];
const root = new URL("../", import.meta.url);
const iconSource = await readFile(
  new URL("src/app/ActionIcon.tsx", root),
  "utf8",
);
const actionPath = (name) => {
  const path = iconSource.match(new RegExp(`${name}:\\s*"([^"]+)"`))?.[1];
  if (!path) throw Error(`Missing ${name} action icon`);
  return path;
};

function motif(index, theme) {
  const { ui, globe } = THEMES[theme],
    p = playColors(theme);
  const stroke = `stroke="${p.outline}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  if (index === 0) {
    // The pin silhouette comes from the real globe marker in placeLabels.ts.
    return `<g fill="none" stroke="${ui.accent}" stroke-width="3" opacity=".32"><ellipse cx="256" cy="385" rx="78" ry="22"/><ellipse cx="256" cy="385" rx="46" ry="12"/></g>
<g transform="translate(96 101) scale(5)"><path d="M32 58C26 43 13 33 13 23A19 19 0 0 1 51 23C51 33 38 43 32 58Z" fill="${p.selected}" ${stroke}/><circle cx="32" cy="23" r="6.5" fill="${ui.bg}" stroke="${ui.accent}" stroke-width="1.4"/></g>`;
  }
  if (index === 1) {
    // The same silhouette and skewed 4×3 checkerboard as the Border Run finish marker.
    const point = (u, v) =>
      `${(1 - v) * (16 + 37 * u) + v * (16 + 29 * u)},${(1 - v) * (8 + 6 * u) + v * (29 + 6 * u)}`;
    const checkers = Array.from({ length: 12 }, (_, i) => {
      const x = i % 4,
        y = Math.floor(i / 4);
      return `<polygon fill="${(x + y) % 2 ? ui.accent : p.outline}" points="${[
        [x / 4, y / 3],
        [(x + 1) / 4, y / 3],
        [(x + 1) / 4, (y + 1) / 3],
        [x / 4, (y + 1) / 3],
      ]
        .map(([u, v]) => point(u, v))
        .join(" ")}"/>`;
    }).join("");
    return `<ellipse cx="156" cy="397" rx="40" ry="13" fill="none" stroke="${ui.accent}" stroke-width="3" opacity=".3"/>
<g transform="translate(70 78) scale(5.4)"><path d="M16 58V8L53 14 45 35 16 29" fill="none" stroke="${ui.editorial}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${checkers}<path d="M16 8 53 14 45 35 16 29Z" fill="none" stroke="${ui.editorial}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
  }
  if (index === 2) {
    // The five-point reward star from PointOrbs.tsx, enlarged as a small enamel emblem.
    return `<g transform="translate(96 108) scale(16)"><path d="m10 2 2.3 4.8 5.3.8-3.8 3.7.9 5.3-4.7-2.5-4.7 2.5.9-5.3L2.4 7.6l5.3-.8Z" fill="${ui.editorial}" stroke="${p.outline}" stroke-width=".6" stroke-linejoin="round"/><path d="M10 2 10 10 2.4 7.6 7.7 6.8Z" fill="${ui.accent}"/><path d="M10 10 14.7 16.6 10 14.1Z" fill="${p.outline}" opacity=".25"/></g>`;
  }
  if (index === 3) {
    // A geographic mountain emblem, using the globe's land inks and a snowy summit.
    return `<path d="M86 370 188 208 292 370Z" fill="${globe.land[2]}" stroke="${p.outline}" stroke-width="7" stroke-linejoin="round"/>
<path d="M147 370 276 132 420 370Z" fill="${globe.land[0]}" stroke="${p.outline}" stroke-width="7" stroke-linejoin="round"/>
<path d="M276 132 276 370H420Z" fill="${globe.land[1]}"/>
<path d="m230 218 46-86 52 86-29-14-23 27-22-27Z" fill="${ui.text}"/>
<path d="M147 370 276 132 420 370Z" fill="none" stroke="${p.outline}" stroke-width="7" stroke-linejoin="round"/>`;
  }
  if (index === 4) {
    return `<g transform="translate(106 106) scale(12.5)" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="${ui.input}"/><path d="${actionPath("explore")}" fill="none" stroke="${ui.accent}" stroke-width="1.1"/><path d="m17 7-3 7-7 3 3-7Z" fill="${ui.editorial}" stroke="${p.outline}" stroke-width=".45"/><path d="m7 17 3-7 2 2Z" fill="${ui.accent}"/><circle cx="12" cy="12" r=".65" fill="${p.outline}"/></g>`;
  }
  return `<g transform="translate(124 100) scale(12)" stroke-linecap="round" stroke-linejoin="round"><path d="${actionPath("journey")}" fill="none" stroke="${ui.editorial}" stroke-width="1.8"/><circle cx="5" cy="5" r="2" fill="${ui.accent}" stroke="${p.outline}" stroke-width=".65"/><circle cx="19" cy="21" r="2" fill="${ui.accent}" stroke="${p.outline}" stroke-width=".65"/></g>`;
}

await mkdir(new URL("public/avatars/", root), { recursive: true });
const catalogPath = new URL("shared/profile-avatars.json", root);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
for (const [motifIndex, name] of motifs.entries()) {
  for (const [themeIndex, theme] of THEME_IDS.entries()) {
    const id = `avatar-${String(motifIndex * 4 + themeIndex + 1).padStart(2, "0")}`;
    const { ui } = THEMES[theme];
    const label = `${name} · ${THEMES[theme].name}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-labelledby="title"><title id="title">${label}</title>
<circle cx="256" cy="256" r="256" fill="${ui.bg}"/>
<circle cx="256" cy="256" r="234" fill="${ui.input}" stroke="${ui.accent}" stroke-opacity=".22" stroke-width="2"/>
${motif(motifIndex, theme)}
</svg>\n`;
    await writeFile(new URL(`public/avatars/${id}.svg`, root), svg);
    catalog[id] = { label, image: `/avatars/${id}.svg` };
  }
}
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  "Prepared 24 profile avatars in Discovery, Odyssey, Expedition, and Safari palettes.",
);
