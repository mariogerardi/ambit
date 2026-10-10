# Ambit sharing artwork

`ambit-preview.svg` is the vector source for
[`public/social/ambit-preview-v1.png`](../../public/social/ambit-preview-v1.png),
a 1200 × 630 evergreen link preview. It uses the existing Ocean palette, local
world geometry (`public/geography/world.v1.json`), the logo globe
(`public/ambit-orb.svg`), and the bundled Manrope and Newsreader fonts. Lettering
is outlined so the export does not depend on installed fonts. The tagline uses
Newsreader with “wonders.” in italic, matching the Home heading. Source attribution
and font licenses remain in [NOTICE](../../NOTICE.md) and `public/fonts/`.

The copy is “A world of wonders.” and “Daily geography Journeys, exploration,
and study.” There is no date, selected Journey, or player progress. Export the SVG
as a 1200 × 630 PNG after editing; the current export was rendered with resvg-js.
Bump the image filename and its references in `index.html` when publishing a
replacement, to give cached link previews a new image URL.

The favicon SVG reuses `public/ambit-orb.svg` with a tightly cropped viewBox.
Transparent 16/32-pixel PNGs and a multi-size ICO cover browser tabs. The
180-pixel Apple touch icon places the same globe on a navy square for home screens.

`ambit-login-logo.svg` reuses the outlined wordmark and globe for the 350 × 120
transparent PNG in `deployment/cognito/`. The hosted-login CSS and offline-safe
publication tool are documented in [Services](../../docs/SERVICES.md).

`public/brand/account-globe.svg` reuses the globe paths and shading from
`ambit-preview.svg` for the decorative Account and Admin backgrounds. It contains no card
text and uses no interactive renderer.
