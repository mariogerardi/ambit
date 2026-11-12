# Out of Place

Local first draft on the existing unmerged minigame branch. Route:
`/minigames/out-of-place`, with play at `/minigames/out-of-place/play`.

## Approved experience

Six items share a regional view: two or three filled countries with names, plus
three or four city dots with names. Exactly one name or city position is wrong.
Tap a city dot, visible label or filled country to commit immediately. Background
land does not accept answers. One correct answer earns one point; three misses
end the run. Finish, reload/resume, replay, high scores and sharing reuse the
existing account-scoped local minigame saves.

Countries use real geometry and can have an incorrect name. City mistakes can
use an incorrect name or displaced dot. Reveal restores the real name/coordinate;
a dotted path connects a noninteractive “Shown here” annotation to a displaced
city's corrected marker, with the displacement distance in feedback. Corrected cities do not highlight their
home country: only the original country choices retain country fills. Supporting
countries retain their candidate color. No Study exercise is inferred from a
failure to identify an intentionally misleading map.

## Dynamic content and fairness

Cities come from the bundled primary capitals and GeoNames places with at least
one million recorded residents. The cutoff uses source place estimates, not metro
rankings. Country names use the canonical roster, independent of display-name
normalization. No geographic data or catalogs are regenerated.

Broad geographic search windows supply candidate pools, not preselected city
lists. The run seed and cycle rebuild six-item scenes and their single error.
Saved pool signatures include source identities, names and coordinates. A verified
base scene is the fallback if a seeded search finds no valid alternative.

A country and one of its cities never appear together, including under a borrowed
incorrect name. Distinct city countries are preferred. Repeated cities require a
country of at least two million square kilometres and adequate spacing. Filled
country options use manageable regional footprints (25,000–2,000,000 square
kilometres); their main outlines participate in framing. City dots cannot sit in
any displayed country fill, before or after introducing the mistake.

The generator requires 44-pixel separation in a conservative 320×200 projection,
and room for all six names using the renderer's shared placement algorithm with
multiple font-width estimates. Region candidates that fail these checks are
skipped. The true and altered scenes must both fit. These synthetic checks do not
certify actual GPU/mobile rendering or picking after arbitrary manual zooming.

## Integration

`src/minigames/outOfPlace.ts` owns the candidate pool, seeded scene generation and
one-question Journey provider. Existing `city-single`/`place-ids` contracts grade
stable item IDs. The shared controller accepts immediate point selection. The
game adapter exposes only the selected country geometries as region targets;
city labels and country labels use the point picker. Reveal coordinates now honor
authored feedback-place positions, alongside existing name corrections.

Menu examples use the existing continuous regional tour and skip a pending-answer
phase. The preview/share SVG has all four theme variants. Focused tests cover
eligibility, one-error scenes, spacing/ownership, fills and background rejection,
first-tap grading, correction, saves, reload/replay, strikes, scores and sharing.
