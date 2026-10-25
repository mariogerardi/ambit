import type { BorderMinigame } from "./sharedNeighbors";

// Pointy-topped hexagons share vertical sides exactly.
const hex = (x: number) =>
  [
    [0, -30],
    [26, -15],
    [26, 15],
    [0, 30],
    [-26, 15],
    [-26, -15],
  ]
    .map(([dx, dy]) => `${x + dx},${44 + dy}`)
    .join(" ");
function Flag({ x, finish = false }: { x: number; finish?: boolean }) {
  return (
    <g
      className="motif-flag"
      transform={`translate(${x} 51) scale(0.85) translate(0 -23)`}
    >
      <path d="M0 23V0L17 3 14 13 0 10" />
      {finish &&
        Array.from({ length: 12 }, (_, i) => {
          const x = i % 4,
            y = Math.floor(i / 4);
          const point = (u: number, v: number) =>
            `${(1 - v) * 17 * u + v * 14 * u},${(1 - v) * 3 * u + v * (10 + 3 * u)}`;
          return (
            <polygon
              key={i}
              className={`motif-checker ${(x + y) % 2 ? "is-light" : "is-dark"}`}
              points={[
                [x / 4, y / 3],
                [(x + 1) / 4, y / 3],
                [(x + 1) / 4, (y + 1) / 3],
                [x / 4, (y + 1) / 3],
              ]
                .map(([u, v]) => point(u, v))
                .join(" ")}
            />
          );
        })}
      {finish && <path d="M0 23V0L17 3 14 13 0 10" fill="none" />}
    </g>
  );
}
export function MinigameMotif({ kind }: { kind: BorderMinigame }) {
  return (
    <span className="minigame-motif-frame" aria-hidden="true">
      <svg
        className={`minigame-motif motif-${kind}`}
        viewBox="0 0 240 88"
        fill="none"
        aria-hidden="true"
      >
        {kind === "shared-neighbors" ? (
          <>
            {[68, 172].map((x) => (
              <polygon key={x} className="motif-country" points={hex(x)} />
            ))}
            <polygon className="motif-land" points={hex(120)} />
          </>
        ) : kind === "missing-borders" ? (
          <>
            <path
              className="motif-land"
              d="M94 14 120 29 146 14 172 29 172 59 146 74 120 59 94 74 68 59 68 29Z"
            />
            <path className="motif-boundary" d="M120 29V59" pathLength="1" />
          </>
        ) : kind === "border-run" ? (
          <>
            {[68, 120, 172].map((x) => (
              <polygon key={x} className="motif-land" points={hex(x)} />
            ))}
            <Flag x={68} />
            <Flag x={172} finish />
            <path
              className="motif-route"
              d="M68 51L94 44H146L172 51"
              pathLength="1"
            />
            <g
              className="motif-completion completion-pulse-group"
              transform="translate(146 44)"
            >
              <circle
                className="completion-pulse completion-pulse-casing"
                r="11"
              />
              <circle className="completion-pulse" r="11" />
            </g>
            {[94, 146].map((x, i) => (
              <g className={`motif-step motif-step-${i + 1}`} key={x}>
                <circle cx={x} cy="44" r="9" />
                <text x={x} y="48">
                  {i + 1}
                </text>
              </g>
            ))}
          </>
        ) : (
          <>
            {[68, 172].map((x) => (
              <polygon key={x} className="motif-land" points={hex(x)} />
            ))}
            <circle
              className="motif-ring motif-ring-outer"
              cx="141"
              cy="43"
              r="32"
            />
            <circle
              className="motif-ring motif-ring-inner"
              cx="141"
              cy="43"
              r="18"
            />
            <path
              className="motif-connection"
              d="m94 58 47-15"
              strokeDasharray="3 4"
            />
            <circle className="motif-target" cx="141" cy="43" r="5" />
            <path
              className="motif-pin"
              d="M94 58s-10-11-10-18a10 10 0 0 1 20 0c0 7-10 18-10 18Z"
            />
          </>
        )}
      </svg>
      {kind === "shared-neighbors" && <span className="motif-question">?</span>}
    </span>
  );
}
