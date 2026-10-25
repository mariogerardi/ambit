import { RecordSave } from "../app/recordSave";
import { progressKey } from "../app/progressSaves";
import { isRecord } from "../app/storage";
import type { SaveCodec } from "../app/recordSave";
import type { BorderMinigame } from "./sharedNeighbors";
const score = (v: unknown): v is number =>
  Number.isSafeInteger(v) && Number(v) >= 0;
const codec: SaveCodec<Record<string, number>> = {
  empty: {},
  valid: (v): v is Record<string, number> =>
    isRecord(v) && Object.values(v).every(score),
  recover: () => undefined,
  encode: (v) => v,
  decode: (fields) =>
    Object.fromEntries(
      Object.entries(fields).filter(([, v]) => score(v)),
    ) as Record<string, number>,
  accepts: (field, v) => field.startsWith("best:") && score(v),
  resolve: (_field, a, b) => Math.max(score(a) ? a : 0, score(b) ? b : 0),
};
export const createMinigameScores = (
  subject: string | undefined,
  kind: BorderMinigame,
) =>
  new RecordSave(
    progressKey(`wurl.minigames.${kind}.scores.v1`, subject),
    codec,
  );
