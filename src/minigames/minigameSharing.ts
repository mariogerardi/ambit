import { isTheme, DEFAULT_THEME, THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
import { artworkUrl } from "../theme/artwork";
import { MINIGAME_TITLES } from "./sharedNeighbors";
import type { BorderMinigame, NeighborRun } from "./sharedNeighbors";
import type { ResultShareCard } from "../app/JourneyShareDialog";

const labels: Record<BorderMinigame, string> = {
  "shared-neighbors": "neighbors found",
  "missing-borders": "borders found",
  "border-run": "routes solved",
  pinpoint: "points / 10,000",
};
export interface MinigameResult {
  kind: BorderMinigame;
  score: number;
  answered: number;
  correct: number;
  ranked: boolean;
}
export function minigameResult(
  kind: BorderMinigame,
  run: NeighborRun,
  ranked: boolean,
): MinigameResult {
  return {
    kind,
    score: kind === "pinpoint" ? (run.points ?? 0) : run.correct,
    answered: run.answered,
    correct: run.correct,
    ranked,
  };
}
export function minigameResultText(result: MinigameResult) {
  return `Ambit · ${MINIGAME_TITLES[result.kind]}\n${result.score.toLocaleString("en-US")} ${labels[result.kind]} · ${result.answered} round${result.answered === 1 ? "" : "s"}${result.ranked ? "" : " · Custom rules"}\nPlay: https://playambit.com/minigames/${result.kind}`;
}
export function paintMinigameResult(
  ctx: CanvasRenderingContext2D,
  result: MinigameResult,
  palette: ThemeId,
  preview: CanvasImageSource,
) {
  const { ui } = THEMES[palette];
  ctx.fillStyle = ui.bg;
  ctx.fillRect(0, 0, 1200, 940);
  ctx.fillStyle = ui.text;
  ctx.font = '800 42px "Manrope"';
  ctx.fillText("ambit", 80, 90);
  ctx.fillStyle = ui.editorial;
  ctx.font = '400 64px "Newsreader"';
  ctx.fillText(MINIGAME_TITLES[result.kind], 80, 170);
  // The exact illustration from the preview modal, with the same theme palette.
  ctx.drawImage(preview, 80, 205, 1040, 520);
  ctx.fillStyle = ui.text;
  ctx.font = '800 80px "Manrope"';
  ctx.fillText(result.score.toLocaleString("en-US"), 80, 825, 310);
  ctx.fillStyle = ui.muted;
  ctx.font = '500 28px "Manrope"';
  ctx.fillText(labels[result.kind], 420, 780);
  ctx.font = '500 25px "Manrope"';
  ctx.fillText(
    `${result.answered} round${result.answered === 1 ? "" : "s"} played${result.ranked ? "" : " · Custom rules"}`,
    420,
    825,
  );
  ctx.fillStyle = ui.accent;
  ctx.font = '500 24px "Manrope"';
  ctx.fillText(`playambit.com/minigames/${result.kind}`, 80, 895);
}
async function minigameImage(result: MinigameResult): Promise<Blob> {
  const applied = document.documentElement.dataset.theme;
  const palette = isTheme(applied) ? applied : DEFAULT_THEME;
  const preview = new Image();
  preview.src = artworkUrl(`/previews/${result.kind}.svg`, palette);
  await Promise.all([
    document.fonts.load('800 80px "Manrope"'),
    document.fonts.load('400 64px "Newsreader"'),
    preview.decode(),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 940;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Image export is unavailable.");
  paintMinigameResult(ctx, result, palette, preview);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("Couldn’t create the image.")),
      "image/png",
    ),
  );
}
export function minigameShareCard(
  kind: BorderMinigame,
  run: NeighborRun,
  ranked: boolean,
): ResultShareCard {
  const result = minigameResult(kind, run, ranked),
    url = `https://playambit.com/minigames/${kind}`;
  return {
    heading: `Share ${MINIGAME_TITLES[kind]}`,
    filename: `ambit-${kind}.png`,
    caption: `Play ${MINIGAME_TITLES[kind]} with me → ${url}`,
    description: minigameResultText(result),
    image: () => minigameImage(result),
  };
}
