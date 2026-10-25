import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  ARTWORK_PATHS,
  ARTWORK_THEMES,
  artworkUrl,
  recolorArtwork,
} from "../src/theme/artwork.ts";

// Run with the pinned Node version after changing a palette or source illustration.
for (const path of ARTWORK_PATHS) {
  const source = await readFile(
    new URL(`../public${path}`, import.meta.url),
    "utf8",
  );
  for (const theme of ARTWORK_THEMES) {
    const target = new URL(
      `../public${artworkUrl(path, theme)}`,
      import.meta.url,
    );
    await mkdir(dirname(target.pathname), { recursive: true });
    await writeFile(target, recolorArtwork(source, path, theme));
  }
}
console.log(
  `Prepared ${ARTWORK_PATHS.length} illustrations for ${ARTWORK_THEMES.length} themes.`,
);
