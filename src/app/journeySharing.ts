import { helpCountCopy, helpSummary } from "../game/guidance";
import type { Journey } from "../game/questionContracts";
import type { GameState } from "../game/state";
import {
  journeyPoints,
  legacyPointCredit,
  QUESTION_POINTS,
} from "../game/points";
export const DAILY_SHARE_URL = "https://playambit.com/daily";

export interface SharedJourneyResult {
  title: string;
  date: string;
  correct: number;
  points: number;
  maxPoints: number;
  legacyPoints: boolean;
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
    points: journeyPoints(game),
    maxPoints: journey.rounds.length * QUESTION_POINTS,
    legacyPoints: legacyPointCredit(game),
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
    `${result.outcomes.map((value) => (value === "correct" ? "✓" : value === "incorrect" ? "×" : "—")).join(" ")} · ${result.points}/${result.maxPoints} points`,
    ...(result.legacyPoints
      ? ["Earlier answers retain their original credit."]
      : []),
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
  const scoreBaseline = Math.max(520, titleBottom + 164);
  const score = `${result.points}/${result.maxPoints}`;
  const scoreWidth = ctx.measureText(score).width;
  ctx.font = '500 30px "Manrope"';
  const scoreX = (1200 - scoreWidth - 12 - ctx.measureText("points").width) / 2;
  ctx.font = '800 160px "Manrope"';
  ctx.fillText(score, scoreX, scoreBaseline);
  ctx.font = '500 30px "Manrope"';
  ctx.fillStyle = "#b2c9d7";
  ctx.fillText("points", scoreX + scoreWidth + 12, scoreBaseline);
  for (let slot = 0; slot < result.maxPoints; slot++) {
    const x = 600 - ((result.maxPoints - 1) * 30) / 2 + slot * 30,
      y = scoreBaseline + 44,
      filled = slot < result.points;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = filled ? "#a7d9cc" : "#7291a7";
    ctx.lineWidth = 1.5;
    if (filled) {
      ctx.fillStyle = "#a7d9cc";
      ctx.fill();
    }
    ctx.stroke();
    if (filled) {
      ctx.beginPath();
      for (let vertex = 0; vertex < 10; vertex++) {
        const angle = -Math.PI / 2 + (vertex * Math.PI) / 5;
        const radius = vertex % 2 ? 3.2 : 7;
        const px = x + Math.cos(angle) * radius,
          py = y + Math.sin(angle) * radius;
        if (vertex) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#071321";
      ctx.fill();
    }
  }
  ctx.fillStyle = "#edf4f7";
  ctx.font = '500 28px "Manrope"';
  const summary = wrapCardText(
    `${result.correct}/${result.outcomes.length} correct answers · ${result.legacyPoints ? "Earlier scoring · " : ""}${result.help}`,
    (text) => ctx.measureText(text).width,
    960,
  );
  ctx.textAlign = "center";
  summary.forEach((line, i) =>
    ctx.fillText(line, 600, scoreBaseline + 90 + i * 35),
  );
  if (result.endedEarly) {
    ctx.fillStyle = "#b2c9d7";
    ctx.fillText(
      "Ended early · — not reached",
      600,
      scoreBaseline + 90 + summary.length * 35 + 12,
    );
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#9fdde4";
  ctx.font = '600 27px "Manrope"';
  ctx.fillText("Play today’s Journey", 80, 851);
  ctx.fillStyle = "#b2c9d7";
  ctx.font = '500 24px "Manrope"';
  const playUrl = new URL(result.playUrl);
  ctx.fillText(playUrl.host + playUrl.pathname, 80, 891, 1040);
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
