import { RecordSave } from "../app/recordSave";
import type { SaveCodec } from "../app/recordSave";
import { isRecord } from "../app/storage";
import { progressKey } from "../app/progressSaves";
import { validPin } from "../game/answerTargets";
import type { NeighborRun, BorderMinigame } from "./sharedNeighbors";
import { validMinigameSettings } from "./minigameSettings";

interface Save {
  version: 1;
  run?: NeighborRun;
}
const integer = (value: unknown) =>
  Number.isSafeInteger(value) && Number(value) >= 0;
export function validNeighborRun(value: unknown): value is NeighborRun {
  return (
    isRecord(value) &&
    (value.kind === undefined ||
      [
        "shared-neighbors",
        "missing-borders",
        "border-run",
        "pinpoint",
      ].includes(String(value.kind))) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    integer(value.startedAt) &&
    typeof value.signature === "string" &&
    integer(value.seed) &&
    Number(value.seed) <= 0xffffffff &&
    integer(value.cycle) &&
    integer(value.index) &&
    integer(value.answered) &&
    integer(value.correct) &&
    Number(value.correct) <= Number(value.answered) &&
    (value.text === undefined ||
      (typeof value.text === "string" && /^\d{0,3}$/.test(value.text))) &&
    (value.points === undefined || integer(value.points)) &&
    (value.overview === undefined || typeof value.overview === "boolean") &&
    (value.history === undefined ||
      (Array.isArray(value.history) &&
        value.history.length <= 64 &&
        value.history.every(
          (v) =>
            isRecord(v) &&
            Array.isArray(v.ids) &&
            v.ids.every((id) => typeof id === "string") &&
            typeof v.correct === "boolean" &&
            validPin(v.point) &&
            (v.pin === undefined || validPin(v.pin)) &&
            (v.points === undefined || integer(v.points)) &&
            (v.distanceKm === undefined ||
              (typeof v.distanceKm === "number" &&
                Number.isFinite(v.distanceKm) &&
                v.distanceKm >= 0)),
        ))) &&
    (value.settings === undefined || validMinigameSettings(value.settings)) &&
    (value.ended === undefined ||
      value.ended === "finished" ||
      (value.ended === "strikes" &&
        Number(value.answered) - Number(value.correct) >= 3)) &&
    (value.pin === undefined || validPin(value.pin)) &&
    (value.selectedId === undefined ||
      (typeof value.selectedId === "string" && value.selectedId.length > 0)) &&
    (value.result === undefined ||
      (typeof value.result === "boolean" &&
        (validPin(value.pin) ||
          typeof value.selectedId === "string" ||
          (typeof value.text === "string" && /^\d+$/.test(value.text)))))
  );
}
const codec: SaveCodec<Save> = {
  empty: { version: 1 },
  valid: (value): value is Save =>
    isRecord(value) &&
    value.version === 1 &&
    (value.run === undefined || validNeighborRun(value.run)),
  recover: () => undefined,
  encode: (value) => ({ run: value.run ?? null }),
  decode: (fields) => ({
    version: 1,
    run: validNeighborRun(fields.run) ? fields.run : undefined,
  }),
  accepts: (field, value) =>
    field === "run" && (value === null || validNeighborRun(value)),
  resolve: (_field, previous, next) => {
    if (!validNeighborRun(previous) || !validNeighborRun(next)) return next;
    if (previous.id !== next.id)
      return previous.startedAt > next.startedAt ? previous : next;
    // Finishing is final even if a stale tab submits its pending answer later.
    if (!!previous.ended !== !!next.ended)
      return previous.ended ? previous : next;
    const rank = (run: NeighborRun) => [
      Number(!!run.overview),
      run.answered,
      run.cycle,
      run.index,
      Number(run.result !== undefined),
    ];
    const a = rank(previous),
      b = rank(next);
    for (let i = 0; i < a.length; i++)
      if (a[i] !== b[i]) return a[i] > b[i] ? previous : next;
    return next;
  },
};

/** Device-local, account-scoped registers. Minigames do not enter Study or Daily sync. */
export const createNeighborSave = (
  subject?: string,
  kind: BorderMinigame = "shared-neighbors",
) => new RecordSave(progressKey(`wurl.minigames.${kind}.v1`, subject), codec);
