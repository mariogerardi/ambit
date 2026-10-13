import { helpCountCopy, helpSummary } from "../game/guidance";
import type { Journey } from "../game/questionContracts";
import type { GameState } from "../game/state";
export const DAILY_SHARE_URL = "https://playambit.com/daily";

export interface SharedJourneyResult {
  title: string;
  date: string;
  correct: number;
  outcomes: ("correct" | "incorrect" | "unreached")[];
  help: string;
  endedEarly: boolean;
  playUrl: string;
}
export function sharedJourneyResult(
  journey: Journey,
  game: GameState,
  date: string,
  _origin?: string,
): SharedJourneyResult {
  const help = helpSummary(game);
  return {
    title: journey.title,
    date,
    correct: game.answers.filter((answer) => answer.correct).length,
    outcomes: journey.rounds.map((round) => {
      const answer = game.answers.find((answer) => answer.roundId === round.id);
      return !answer ? "unreached" : answer.correct ? "correct" : "incorrect";
    }),
    help:
      help.status === "unassisted"
        ? "Unassisted"
        : `${help.status === "assisted" ? "Assisted" : "Hinted"} · ${helpCountCopy(help)}`,
    endedEarly: game.phase === "failed",
    playUrl: DAILY_SHARE_URL,
  };
}
export function resultDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ??
        "th");
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(value);
  return `${month} ${day}${suffix}, ${value.getUTCFullYear()}`;
}
export function resultText(result: SharedJourneyResult) {
  return [
    `Ambit · ${resultDate(result.date)}`,
    result.title,
    `${result.outcomes.map((value) => (value === "correct" ? "✓" : value === "incorrect" ? "×" : "—")).join(" ")} · ${result.correct}/${result.outcomes.length}`,
    ...(result.endedEarly ? ["Ended early · — not reached"] : []),
    result.help,
    `Play today’s Journey: ${result.playUrl}`,
  ].join("\n");
}
export function resultCaption(result: SharedJourneyResult) {
  return `A world of wonders. Take today’s Journey with me → ${result.playUrl}`;
}

/** Wrap even a single long word; title fitting must never silently clip content. */
export function wrapCardText(
  text: string,
  measure: (value: string) => number,
  width: number,
) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (measure(line ? `${line} ${word}` : word) <= width) {
      line = line ? `${line} ${word}` : word;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    for (const char of Array.from(word)) {
      if (line && measure(line + char) > width) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function paintResultCard(
  ctx: CanvasRenderingContext2D,
  globe: CanvasImageSource,
  result: SharedJourneyResult,
) {
  ctx.fillStyle = "#071321";
  ctx.fillRect(0, 0, 1200, 940);
  ctx.save();
  ctx.globalAlpha = 0.36;
  ctx.drawImage(globe, 540, -120, 900, 900);
  ctx.restore();
  ctx.fillStyle = "#edf4f7";
  ctx.font = '800 52px "Manrope"';
  ctx.fillText("ambit", 80, 115);
  ctx.fillStyle = "#b2c9d7";
  ctx.font = '500 28px "Manrope"';
  ctx.fillText(resultDate(result.date), 80, 175);
  let size = 64,
    lines: string[];
  do {
    ctx.font = `400 ${size}px "Newsreader"`;
    lines = wrapCardText(
      result.title,
      (text) => ctx.measureText(text).width,
      1030,
    );
    if (lines.length * size * 1.15 <= 190) break;
    size -= 2;
  } while (size > 16);
  ctx.fillStyle = "#efbb91";
  lines.forEach((line, index) =>
    ctx.fillText(line, 85, 275 + index * size * 1.15),
  );
  ctx.fillStyle = "#edf4f7";
  ctx.font = '800 160px "Manrope"';
  const titleBottom = 275 + (lines.length - 1) * size * 1.15;
  const previousBaseline = titleBottom + 125;
  const transferredSpace = Math.max(0, 615 - (previousBaseline + 45)) / 2;
  const scoreBaseline = previousBaseline + transferredSpace;
  ctx.fillText(
    `${result.correct}/${result.outcomes.length}`,
    80,
    scoreBaseline,
  );
  ctx.font = '500 30px "Manrope"';
  ctx.fillStyle = "#b2c9d7";
  ctx.fillText("correct answers", 85, scoreBaseline + 45);
  result.outcomes.forEach((outcome, index) => {
    const x = 80 + index * 116;
    ctx.fillStyle =
      outcome === "correct"
        ? "#9de0b7"
        : outcome === "incorrect"
          ? "#ffa19a"
          : "#7291a7";
    ctx.beginPath();
    ctx.roundRect(x, 615, 92, 92, 18);
    ctx.fill();
    ctx.strokeStyle = "#071321";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (outcome === "correct") {
      ctx.moveTo(x + 23, 661);
      ctx.lineTo(x + 40, 678);
      ctx.lineTo(x + 70, 643);
    } else if (outcome === "incorrect") {
      ctx.moveTo(x + 29, 644);
      ctx.lineTo(x + 63, 678);
      ctx.moveTo(x + 63, 644);
      ctx.lineTo(x + 29, 678);
    } else {
      ctx.moveTo(x + 28, 661);
      ctx.lineTo(x + 64, 661);
    }
    ctx.stroke();
  });
  ctx.fillStyle = "#edf4f7";
  ctx.font = '500 28px "Manrope"';
  wrapCardText(
    result.help,
    (text) => ctx.measureText(text).width,
    1040,
  ).forEach((line, i) => ctx.fillText(line, 80, 752 + i * 35));
  if (result.endedEarly) {
    ctx.fillStyle = "#b2c9d7";
    ctx.fillText("Ended early · — not reached", 80, 812);
  }
  ctx.fillStyle = "#9fdde4";
  ctx.font = '600 27px "Manrope"';
  ctx.fillText("Play today’s Journey", 80, 851);
  ctx.fillStyle = "#b2c9d7";
  ctx.font = '500 24px "Manrope"';
  const playUrl = new URL(result.playUrl);
  ctx.fillText(playUrl.host + playUrl.pathname, 80, 882, 1040);
}
export async function resultImage(result: SharedJourneyResult): Promise<Blob> {
  await Promise.all([
    document.fonts.load('800 52px "Manrope"', result.title),
    document.fonts.load('400 64px "Newsreader"', result.title),
  ]);
  const globe = new Image();
  globe.src = "/brand/account-globe.svg";
  await globe.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 940;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable. Please retry.");
  paintResultCard(ctx, globe, result);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Couldn’t create the image. Please retry.")),
      "image/png",
    ),
  );
}
export function shareCancelled(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  );
}
export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
