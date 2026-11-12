import type { Journey, QuestionContext } from "../game/questionContracts";
import { ANSWER_PLACES } from "../game/answerTargets";
import { interiorAnchor } from "../geography/interiorAnchor";
import type { PlaceFeature } from "../geography/types";
import type { NeighborRun } from "./sharedNeighbors";
/** Keep a modest set of distinct camera stops; the map retains the whole saved sample. */
export function minigameCompletion(
  run: NeighborRun,
  context?: QuestionContext,
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
  if (run.kind === "out-of-place") {
    const items = new Map<string, PlaceFeature>();
    const rank = { answer: 0, incorrect: 1, correct: 2 };
    const add = (
      id: string,
      point: { lat: number; lng: number },
      name: string | undefined,
      state: keyof typeof rank,
    ) => {
      const previous = items.get(id);
      if (
        previous &&
        rank[previous.visualState as keyof typeof rank] > rank[state]
      )
        return;
      const country = id.startsWith("wurl:");
      const region = country ? context?.targets.get(id) : undefined;
      const city = country ? undefined : ANSWER_PLACES.get(id);
      items.set(id, {
        id,
        name: context?.names.get(id) ?? city?.name ?? name ?? "Corrected place",
        ...(region ? interiorAnchor(region) : point),
        kind: country ? "other" : "city",
        markerHidden: country,
        markerSize: 24,
        labelFlexible: true,
        visualState: state,
        sourceId: "minigame-history",
      });
    };
    for (const visit of visits) {
      const answerId = visit.target?.id ?? visit.ids[0];
      if (answerId)
        add(
          answerId,
          visit.point,
          visit.target?.name,
          visit.correct ? "correct" : "answer",
        );
      if (!visit.correct && visit.selectedId && visit.pin)
        add(visit.selectedId, visit.pin, undefined, "incorrect");
    }
    return {
      focus: views[0] ?? { lat: 20, lng: 0, altitude: 2.5 },
      views: views.length ? views : undefined,
      mapMode: "authored",
      regionIds: [...items.keys()].filter((id) => id.startsWith("wurl:")),
      places: [...items.values()],
      overlays: [],
      physicalFeatures: [],
      borders: true,
    };
  }
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
