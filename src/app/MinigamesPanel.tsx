import { useContext, useEffect, useRef, useState } from "react";
import { MinigameMotif } from "../minigames/MinigameMotif";
import type { BorderMinigame } from "../minigames/sharedNeighbors";
import { ActivityPreviewDialog } from "./ActivityPreviewDialog";
import { PanelActive } from "./ModePanels";
import { MinigameSettingsEditor } from "../minigames/MinigameSettingsEditor";
import type { useBorderMinigame } from "../minigames/useBorderMinigame";

export const games = [
  {
    slug: "shared-neighbors",
    quickStart: "Pin the country that borders both clues.",
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
    quickStart: "Find the two countries hiding in one shape.",
    title: "Missing Borders",
    description:
      "A border has vanished. Spot the countries hiding in one shape.",
    image: "/previews/missing-borders.svg",
    imageAlt: "Spain and Portugal shown as one continuous highlighted shape.",
    controls: "Tap a territory",
    instruction:
      "One border has disappeared. Search the region and tap the territory hiding two countries to reveal their boundary. Three wrong answers end the game; you can also finish whenever you like.",
  },
  {
    slug: "border-run",
    quickStart: "Count the fewest land borders between the flags.",
    title: "Border Run",
    description: "Two countries. How many borders stand between them?",
    image: "/previews/border-run.svg",
    imageAlt:
      "A map of Europe with highlighted route countries and four numbered border crossings.",
    controls: "Enter a number",
    instruction:
      "Find the fewest shared land-border crossings between two countries. Enter your number, then see one shortest route. Routes follow connected land between countries; sea crossings and corner contacts don’t count. Borders are hidden unless you enable them. Three wrong answers end the game.",
  },
  {
    slug: "pinpoint",
    quickStart: "Place your pin. Get closer, score higher. Ten rounds.",
    title: "Pinpoint",
    description: "Familiar places. One globe. How close can you get?",
    image: "/previews/pinpoint.svg",
    imageAlt: "A location pin and distance rings on a map of South America.",
    controls: "Place a pin",
    instruction:
      "Play ten rounds with your chosen categories. Cities and landmarks earn up to 1,000 points by distance: within 1 km earns full points, and the score halves about every 1,040 km. Countries and US states earn 1,000 points for a pin anywhere inside. Each run brings a fresh mix of places.",
  },
];

export function MinigamesPanel({
  path,
  onNavigate,
  shared,
  missing,
  borderRun,
  pinpoint,
  webgl,
}: {
  path: string;
  onNavigate(path: string): void;
  shared: ReturnType<typeof useBorderMinigame>;
  missing: ReturnType<typeof useBorderMinigame>;
  borderRun: ReturnType<typeof useBorderMinigame>;
  pinpoint: ReturnType<typeof useBorderMinigame>;
  webgl: boolean;
}) {
  const [customizing, setCustomizing] = useState(false);
  const [selected, setSelected] = useState(() =>
    games.find((item) => path === `/minigames/${item.slug}`),
  );
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panelActive = useContext(PanelActive);
  useEffect(() => {
    setSelected(games.find((item) => path === `/minigames/${item.slug}`));
    setCustomizing(false);
  }, [path]);
  useEffect(() => {
    if (!panelActive) {
      setSelected(undefined);
      setCustomizing(false);
    }
  }, [panelActive]);
  const closePreview = () => {
    setSelected(undefined);
    setCustomizing(false);
    if (path !== "/minigames") onNavigate("/minigames");
  };
  const game =
    selected?.slug === "missing-borders"
      ? missing
      : selected?.slug === "border-run"
        ? borderRun
        : selected?.slug === "pinpoint"
          ? pinpoint
          : shared;
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
            howToPlay: selected.quickStart,
            rules: selected.instruction,
          }}
          onClose={closePreview}
          returnFocus={trigger.current}
          customize={{
            label: customizing ? "Back to preview" : "Customize",
            onClick: () => setCustomizing(!customizing),
          }}
          content={
            customizing ? (
              <MinigameSettingsEditor
                kind={game.kind}
                settings={game.settings}
                onChange={game.onSettings}
              />
            ) : undefined
          }
          notice={
            !game.settingsSaved
              ? "Settings couldn’t be saved on this device."
              : game.ready && !game.count
                ? "No puzzles match these settings. Choose a broader region or exclude fewer countries."
                : game.hasUnfinished && !game.canResume
                  ? "Starting a new game replaces your current game."
                  : undefined
          }
          primary={{
            label: !webgl
              ? "Globe unavailable"
              : !game.ready
                ? "Loading…"
                : game.canResume
                  ? "Resume game"
                  : game.hasUnfinished
                    ? "Start new game"
                    : "Play",
            disabled: !webgl || !game.ready || !game.count,
            onClick: () => {
              setSelected(undefined);
              setCustomizing(false);
              game.start();
              onNavigate(`/minigames/${selected.slug}/play`);
            },
          }}
        />
      )}
      <h1 className="editorial-heading">
        A world to <em>play with.</em>
      </h1>
      <p className="muted study-introduction">
        Find a shared neighbor, uncover a border, or chase your next high score.
      </p>
      <div className="study-paths">
        {games.map((item) => (
          <article className="study-path minigame-card" key={item.slug}>
            <button
              className="study-path-start"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(item);
              }}
              aria-label={`Preview ${item.title}`}
              aria-haspopup="dialog"
              data-dd-action-name={`Minigames Preview ${item.title}`}
            />
            <MinigameMotif kind={item.slug as BorderMinigame} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
