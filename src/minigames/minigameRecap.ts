import type { Journey } from "../game/questionContracts";
import type { NeighborRun } from "./sharedNeighbors";
/** Keep a modest set of distinct camera stops; the map retains the whole saved sample. */
export function minigameCompletion(
  run: NeighborRun,
): NonNullable<Journey["completion"]> {
  const visits = run.history ?? [];
  const answers = visits.filter(
    (v, i, all) =>
      all.findIndex(
        (a) =>
          Math.abs(a.point.lat - v.point.lat) < 2 &&
          Math.abs(a.point.lng - v.point.lng) < 2,
      ) === i,
  );
  const missed = visits
    .filter((v) => !v.correct && v.pin)
    .slice(-2)
    .map((v) => v.pin!);
  const limit = 6 - missed.length;
  const views = [
    ...answers
      .filter(
        (_, i, all) => i % Math.max(1, Math.ceil(all.length / limit)) === 0,
      )
      .slice(0, limit)
      .map((v) => v.point),
    ...missed,
  ].map((point) => ({ ...point, altitude: 1.7 }));
  const places = visits.flatMap((v, i) => [
    ...(v.points !== undefined
      ? [
          {
            id: `recap:target:${i}`,
            name: "Answer",
            kind: "pin" as const,
            ...v.point,
            sourceId: "minigame-history",
            visualState: "answer" as const,
            labelHidden: true,
          },
        ]
      : []),
    ...(v.pin
      ? [
          {
            id: `recap:guess:${i}`,
            name: v.correct ? "Your pin" : "Missed pin",
            kind: "pin" as const,
            ...v.pin,
            sourceId: "player",
            visualState: v.correct
              ? ("correct" as const)
              : ("incorrect" as const),
            labelHidden: true,
          },
        ]
      : []),
  ]);
  return {
    focus: views[0] ?? { lat: 20, lng: 0, altitude: 2.5 },
    views: views.length ? views : undefined,
    loopViews: true,
    mapMode: "authored",
    regionIds: [
      ...new Set(visits.filter((v) => v.correct).flatMap((v) => v.ids)),
    ],
    places,
    overlays:
      run.kind === "pinpoint"
        ? visits.flatMap((v, i) =>
            v.pin
              ? [
                  {
                    id: `recap:connector:${i}`,
                    type: "path" as const,
                    coordinates: [
                      [v.pin.lng, v.pin.lat],
                      [v.point.lng, v.point.lat],
                    ],
                    dashed: "dotted" as const,
                    surfaceAligned: true,
                    visualState: v.correct
                      ? ("correct" as const)
                      : ("incorrect" as const),
                  },
                ]
              : [],
          )
        : undefined,
    physicalFeatures: [],
    borders: true,
  };
}
