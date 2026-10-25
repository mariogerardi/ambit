import { RecordSave } from "../app/recordSave";
import type { SaveCodec } from "../app/recordSave";
import { progressKey } from "../app/progressSaves";
import {
  defaultMinigameSettings,
  validMinigameSettings,
} from "./minigameSettings";
import type { MinigameSettings } from "./minigameSettings";
import type { BorderMinigame } from "./sharedNeighbors";

const codec: SaveCodec<MinigameSettings> = {
  empty: defaultMinigameSettings,
  valid: validMinigameSettings,
  recover: () => undefined,
  encode: (settings) => ({ ...settings }),
  decode: (fields) =>
    ({ ...defaultMinigameSettings, ...fields }) as MinigameSettings,
  accepts: (field, value) =>
    Object.hasOwn(defaultMinigameSettings, field) &&
    validMinigameSettings({ ...defaultMinigameSettings, [field]: value }),
};
export const createMinigameSettingsSave = (
  subject: string | undefined,
  kind: BorderMinigame,
) =>
  new RecordSave(
    progressKey(`wurl.minigames.${kind}.settings.v1`, subject),
    codec,
  );
