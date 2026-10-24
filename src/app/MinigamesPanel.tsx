import { useContext, useEffect, useRef, useState } from "react";
import { ActivityPreviewDialog } from "./ActivityPreviewDialog";
import { PanelActive } from "./ModePanels";

const games = [
  {
    slug: "shared-neighbors",
    title: "Shared Neighbors",
    description: "Two countries. One shared neighbor. Can you find it?",
    image: "/previews/shared-neighbors.svg",
    imageAlt:
      "Two highlighted countries and a location pin on a map of Europe.",
    controls: "Place a pin",
    instruction:
      "Use two highlighted countries as clues, then place a pin inside the country that shares a land border with both. Borders stay hidden until the reveal. Keep going until three wrong answers, or finish whenever you like.",
  },
  {
    slug: "missing-borders",
    title: "Missing Borders",
    description:
      "A border has vanished. Spot the countries hiding in one shape.",
    image: "/previews/missing-borders.svg",
    imageAlt: "Spain and Portugal shown as one continuous highlighted shape.",
    controls: "Tap a territory",
    instruction:
      "One border has disappeared. Search the region and tap the territory hiding two countries to reveal their boundary. Three wrong answers end the game; you can also finish whenever you like.",
  },
];

export function MinigamesPanel({
  path,
  onNavigate,
  onPlaySharedNeighbors,
  resumeSharedNeighbors,
  sharedReady,
  onPlayMissingBorders,
  resumeMissingBorders,
  missingReady,
}: {
  path: string;
  onNavigate(path: string): void;
  onPlaySharedNeighbors(): void;
  resumeSharedNeighbors: boolean;
  sharedReady: boolean;
  onPlayMissingBorders(): void;
  resumeMissingBorders: boolean;
  missingReady: boolean;
}) {
  const [selected, setSelected] = useState(() =>
    games.find((item) => path === `/minigames/${item.slug}`),
  );
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panelActive = useContext(PanelActive);
  useEffect(() => {
    setSelected(games.find((item) => path === `/minigames/${item.slug}`));
  }, [path]);
  useEffect(() => {
    if (!panelActive) setSelected(undefined);
  }, [panelActive]);
  const closePreview = () => {
    setSelected(undefined);
    if (path !== "/minigames") onNavigate("/minigames");
  };
  return (
    <section className="info-view study-landing minigames-landing">
      {panelActive && selected && (
        <ActivityPreviewDialog
          preview={{
            title: selected.title,
            description: selected.description,
            image: selected.image,
            imageAlt: selected.imageAlt,
            facts: [{ label: "Controls", value: selected.controls }],
            howToPlay: selected.instruction,
          }}
          onClose={closePreview}
          returnFocus={trigger.current}
          primary={{
            label: (
              selected.slug === "shared-neighbors" ? sharedReady : missingReady
            )
              ? (
                  selected.slug === "shared-neighbors"
                    ? resumeSharedNeighbors
                    : resumeMissingBorders
                )
                ? "Resume game"
                : "Play"
              : "Loading…",
            disabled: !(selected.slug === "shared-neighbors"
              ? sharedReady
              : missingReady),
            onClick: () => {
              setSelected(undefined);
              if (selected.slug === "shared-neighbors") onPlaySharedNeighbors();
              else onPlayMissingBorders();
            },
          }}
        />
      )}
      <h1 className="editorial-heading">Minigames</h1>
      <p className="muted study-introduction">
        Choose a game to test your knowledge of countries and borders.
      </p>
      <div className="study-paths">
        {games.map((item) => (
          <article className="study-path" key={item.slug}>
            <button
              className="study-path-start"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(item);
              }}
              aria-label={`Preview ${item.title}`}
              aria-haspopup="dialog"
              data-dd-action-name={`Minigames Preview ${item.title}`}
            >
              <span aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12h16m-7-7 7 7-7 7" />
                </svg>
              </span>
            </button>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
