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
    title: "Shared Neighbors",
    description: "Two countries. One shared neighbor. Can you find it?",
    image: "/previews/shared-neighbors.svg",
    imageAlt:
      "Two highlighted countries and a location pin on a map of Europe.",
    controls: "Place a pin",
    instruction:
      "Two countries are highlighted. Place a pin inside a country that shares a land border with both. Borders appear after you answer. Three incorrect answers end the run, or you can finish early.",
    rules:
      "Use two highlighted countries as clues, then place a pin inside the country that shares a land border with both. Borders stay hidden until the reveal. Keep going until three wrong answers, or finish whenever you like.",
  },
  {
    slug: "missing-borders",
    title: "Missing Borders",
    description:
      "A border has vanished. Spot the countries hiding in one shape.",
    image: "/previews/missing-borders.svg",
    imageAlt: "Spain and Portugal shown as one continuous highlighted shape.",
    controls: "Select a territory",
    instruction:
      "One border has disappeared. Find the territory hiding two countries and select it to reveal their boundary. Three incorrect answers end the run, or you can finish early.",
    rules:
      "One border has disappeared. Search the region and select the territory hiding two countries to reveal their boundary. Three wrong answers end the game; you can also finish whenever you like.",
  },
  {
    slug: "border-run",
    title: "Border Run",
    description: "Two countries. How many borders must you cross?",
    image: "/previews/border-run.svg",
    imageAlt:
      "A map of Europe with highlighted route countries and four numbered border crossings.",
    controls: "Enter a number",
    instruction:
      "Two countries are marked with flags. Count the fewest land borders you would cross between them, then reveal one shortest route. Sea crossings and corner contacts don’t count. Three incorrect answers end the run.",
    rules:
      "Find the fewest shared land-border crossings between two countries. Enter your number, then see one shortest route. Routes follow connected land between countries; sea crossings and corner contacts don’t count. Borders are hidden unless you enable them. Three wrong answers end the game.",
  },
  {
    slug: "pinpoint",
    title: "Pinpoint",
    description: "Familiar places. One globe. How close can you get?",
    image: "/previews/pinpoint.svg",
    imageAlt: "A location pin and distance rings on a map of South America.",
    controls: "Place a pin",
    instruction:
      "Find cities, landmarks, countries, and U.S. states by placing pins on the globe. Cities and landmarks score by distance; countries and states score for a pin inside their boundaries. Play ten rounds, earning up to 1,000 points each.",
    rules:
      "Play ten rounds with your chosen categories. Cities and landmarks earn up to 1,000 points by distance: within 1 km earns full points, and the score halves about every 1,040 km. Countries and U.S. states earn 1,000 points for a pin anywhere inside. Each run brings a fresh mix of places.",
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
            howToPlay: selected.instruction,
            rules: selected.rules,
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
                ? game.kind === "pinpoint"
                  ? "No puzzles match your settings. Try more place categories, a broader area, or fewer exclusions."
                  : "No puzzles match your settings. Try a broader area or fewer exclusions."
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
        Find unlikely connections, uncover hidden borders, and follow your instincts across the globe.
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
