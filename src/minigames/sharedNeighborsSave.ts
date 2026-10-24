import { RecordSave } from "../app/recordSave";
import type { SaveCodec } from "../app/recordSave";
import { isRecord } from "../app/storage";
import { progressKey } from "../app/progressSaves";
import { validPin } from "../game/answerTargets";
import type { NeighborRun, BorderMinigame } from "./sharedNeighbors";

interface Save {
  version: 1;
  run?: NeighborRun;
}
const integer = (value: unknown) =>
  Number.isSafeInteger(value) && Number(value) >= 0;
export function validNeighborRun(value: unknown): value is NeighborRun {
  return (
    isRecord(value) &&
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
    (value.ended === undefined ||
      value.ended === "finished" ||
      (value.ended === "strikes" &&
        Number(value.answered) - Number(value.correct) >= 3)) &&
    (value.pin === undefined || validPin(value.pin)) &&
    (value.selectedId === undefined ||
      (typeof value.selectedId === "string" && value.selectedId.length > 0)) &&
    (value.result === undefined ||
      (typeof value.result === "boolean" &&
        (validPin(value.pin) || typeof value.selectedId === "string")))
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
