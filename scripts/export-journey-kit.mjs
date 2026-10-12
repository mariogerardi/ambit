import { createServer } from "vite";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdir,
  lstat,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FORMAT = "ambit-journey-authoring-kit";
const CONFIG = "scripts/journey-export.config.json";
const DOCS = [
  "docs/JOURNEY_CRAFTING.md",
  "docs/QUESTION_CATALOG.md",
  "docs/JOURNEY_ENGINE.md",
  "docs/ARCHITECTURE.md",
  "docs/CATALOG_POLICY.md",
  "docs/journey-authoring/PROJECT_INSTRUCTIONS.md",
  "docs/journey-authoring/JOURNEY_SPEC_TEMPLATE.md",
];
const MODE_NOTES = {
  pin: "Place a point near a reviewed target or inside canonical territory. Distance bands are inclusive and all currently earn one correct answer. Help cannot change tolerance; target rings belong to reveal.",
  "city-single":
    "Pick one place marker. Named or anonymous candidates are controlled separately; use equal city-reference styling when capital status must not reveal the answer.",
  "city-multiple":
    "Pick the required number of place markers, then submit. Author explicit place IDs and deliberate label disclosure.",
  "map-single":
    "Pick one eligible country or region. Immediate or explicit submission is supported. Eligibility, visible context and names are independent; named alternatives are limited to six.",
  "map-multiple":
    "Pick the required number of countries/regions, then submit. A stronger assist can lock fewer than all correct selections while preserving the remaining task.",
  number:
    "Enter a nonnegative integer. The rule can use an authored value, feature membership count, shortest border path or capital-circle count.",
  text: "Type one answer in an immediately visible field. Use reviewed aliases or the supported capital/fact rules; do not hide a required input behind a fallback.",
  "typed-regions":
    "Enter the required list of region names. Canonical IDs and reviewed aliases determine correctness; this is not the draggable-card control.",
  "ordered-countries":
    "Type country names in the required order; supported rules include an authored country sequence or a great-circle traversal.",
  "ordered-capitals":
    "Type capital names in the order of an authored country route. Use the capital-order rule and reviewed capital records.",
  "choice-single":
    "Choose one of two to six distinct choices, then submit. Candidate positions may shuffle; IDs grade the answer.",
  "choice-multiple":
    "Choose the required count from two to six distinct choices, then submit. Plausible alternatives must preserve the deciding distinction.",
  "choice-order":
    "Arrange country cards in an authored geographic order. Two to six cards; the prefilled impostor variant has exactly one extra card. Assists can lock fewer than all slots. No partial credit.",
  "choice-match":
    "Place two to six distinct cards into named role slots, with optional spare cards. Each role has one unique card; no many-to-one matching or partial credit. Assists can lock fewer than all slots.",
  "land-path":
    "Internal/test-supported land-path control, not exposed in the author-facing answer-type catalog. Do not propose it as a published format without an explicit product decision.",
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
const tableText = (value) =>
  String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const inlineJson = (value) => `\`${JSON.stringify(value)}\``;
const pick = (value, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  );

function editorialScene(view) {
  return {
    camera: view.focus,
    borders: view.borders,
    names: view.regionNames,
    regions: Object.groupBy(view.emphasis, ({ state }) => state),
    markers: view.places.map((place) =>
      pick(place, [
        "id",
        "name",
        "kind",
        "lat",
        "lng",
        "labelHidden",
        "markerHidden",
        "visualState",
        "answerTarget",
      ]),
    ),
    features: view.physicalFeatures.map((feature) =>
      pick(feature, ["name", "kind", "lat", "lng"]),
    ),
    overlays: view.overlays,
    routes: view.routes,
  };
}

function editorialSceneText(view) {
  const scene = editorialScene(view);
  scene.regions = Object.fromEntries(
    Object.entries(scene.regions).map(([state, regions]) => [
      state,
      regions.map(({ name }) => name),
    ]),
  );
  return Object.fromEntries(
    Object.entries(scene).filter(
      ([, value]) => !Array.isArray(value) || value.length,
    ),
  );
}

export function parseArgs(args) {
  const options = {
    out: "artifacts/journey-authoring-kit",
    highlights: [],
    includeCode: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--include-code") options.includeCode = true;
    else if (arg === "--help") options.help = true;
    else if (arg === "--out" || arg === "--highlight") {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw Error(`Missing value for ${arg}`);
      if (arg === "--out") options.out = value;
      else options.highlights.push(value);
    } else throw Error(`Unknown option: ${arg}`);
  }
  return options;
}

function relativeFile(value) {
  if (
    typeof value !== "string" ||
    path.isAbsolute(value) ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw Error(`Invalid relative file: ${value}`);
  return value;
}

export async function exportDirectory(root, output) {
  const resolved = path.resolve(root, output);
  const relative = path.relative(root, resolved);
  if (
    !relative.startsWith(`artifacts${path.sep}`) ||
    relative === `artifacts${path.sep}`
  )
    throw Error(
      "Export into a subdirectory of artifacts/; source directories are never export targets.",
    );
  // Do not follow an output symlink outside the workspace or into source files.
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    const info = await lstat(current).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (info?.isSymbolicLink() || (info && !info.isDirectory()))
      throw Error(
        `Export directory must contain only real directories: ${current}`,
      );
  }
  return resolved;
}

/** Preserve IDs, coordinates, names, styling and sources; never duplicate mesh payloads. */
export function summarizeGeometry(value) {
  if (Array.isArray(value)) return value.map(summarizeGeometry);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["geometry", "displayGeometry"].includes(key) && child) {
      result[key] = {
        type: child.type,
        omitted:
          "Coordinate payload; consult the source asset for actual geometry.",
      };
    } else if (["paths", "relief", "labelAnchors"].includes(key)) {
      result[key] = {
        omitted: "Render geometry",
        groups: Array.isArray(child) ? child.length : Object.keys(child ?? {}),
      };
    } else result[key] = summarizeGeometry(child);
  }
  return result;
}

export function featuredEntries(entries, config, requested) {
  if (!requested.length) requested = config.featured.map(({ id }) => id);
  return [...new Set(requested)].map((target) => {
    const entry = entries.find(
      (entry) =>
        entry.id === target ||
        entry.path === target ||
        entry.path.split("/").at(-1) === target,
    );
    if (!entry) throw Error(`Unknown highlighted Journey: ${target}`);
    const reason =
      config.featured.find(({ id }) => id === entry.id)?.reason ??
      "Selected for this export. Read it alongside other Journeys; it is not a compulsory template.";
    return { ...entry, reason };
  });
}

async function writeExport(directory, files, manifest) {
  const old = await readFile(
    path.join(directory, "manifest.json"),
    "utf8",
  ).catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  const previous = old ? JSON.parse(old) : undefined;
  if (previous && (previous.format !== FORMAT || previous.version !== 1))
    throw Error(
      "Existing manifest is not a supported Journey export; choose a different --out directory.",
    );
  const owned = new Set(
    (previous?.files ?? []).map(({ path: file }) => relativeFile(file)),
  );
  // Preflight every destination before writing. Never overwrite unrelated user files.
  for (const file of [...files.keys(), "manifest.json", ...owned]) {
    relativeFile(file);
    let current = directory;
    const parts = file.split("/");
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const info = await lstat(current).catch((error) => {
        if (error.code === "ENOENT") return undefined;
        throw error;
      });
      if (
        info?.isSymbolicLink() ||
        (info && index < parts.length - 1 && !info.isDirectory())
      )
        throw Error(`Unsafe export path: ${current}`);
      if (
        info &&
        index === parts.length - 1 &&
        (!info.isFile() ||
          (!owned.has(file) && !(file === "manifest.json" && previous)))
      )
        throw Error(`Refusing to replace an unrelated file: ${current}`);
    }
  }
  await mkdir(directory, { recursive: true });
  for (const [file, content] of files) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), content);
  }
  for (const file of owned) {
    if (!files.has(file))
      await unlink(path.join(directory, file)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
  }
  manifest.files = [...files].map(([file, content]) => ({
    path: file,
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
  }));
  await writeFile(
    path.join(directory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

export async function exportJourneyKit(options) {
  const directory = await exportDirectory(ROOT, options.out);
  const inputs = new Map();
  async function source(file) {
    relativeFile(file);
    if (
      !/^(src\/|docs\/|scripts\/|public\/geography\/world\.v1\.json$|AGENTS\.md$)/.test(
        file,
      )
    )
      throw Error(`Not an authoring source: ${file}`);
    const resolved = await realpath(path.join(ROOT, file));
    if (!resolved.startsWith(ROOT))
      throw Error(`Source outside repository: ${file}`);
    const content = await readFile(resolved, "utf8");
    inputs.set(file, {
      path: file,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    });
    return content;
  }
  const config = JSON.parse(await source(CONFIG));
  await source("scripts/export-journey-kit.mjs");
  const index = JSON.parse(await source("src/game/journeyIndex.json"));
  const featured = featuredEntries(index, config, options.highlights);
  const featuredIds = new Set(featured.map(({ id }) => id));
  const files = new Map();
  const docs = new Map();
  for (const file of DOCS) {
    const content = await source(file);
    docs.set(file, content);
    const destination = file.includes("/journey-authoring/")
      ? path.basename(file)
      : `references/${path.basename(file)}`;
    files.set(destination, content);
  }
  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    logLevel: "error",
  });
  try {
    const { JOURNEYS, journeyPath } = await server.ssrLoadModule(
      "/src/game/journeys.ts",
    );
    const { MECHANICS } = await server.ssrLoadModule("/src/game/mechanics.ts");
    const preparation = await server.ssrLoadModule(
      "/src/game/questionPreparation.ts",
    );
    const questionText = await server.ssrLoadModule(
      "/src/game/questionText.ts",
    );
    const { COUNTRY_FACTS } = await server.ssrLoadModule(
      "/src/game/countryFacts.ts",
    );
    const { answerPlace } = await server.ssrLoadModule(
      "/src/game/answerTargets.ts",
    );
    const { journeyWorld } = await server.ssrLoadModule(
      "/src/app/journeyWorld.ts",
    );
    const { initialGame } = await server.ssrLoadModule("/src/game/state.ts");
    const { withAssistanceLocks } = await server.ssrLoadModule(
      "/src/game/guidance.ts",
    );
    const { correctAnswerSummary } =
      await server.ssrLoadModule("/src/game/copy.ts");
    const { PLAY_HIGHLIGHTS, PLAY_FEEDBACK } = await server.ssrLoadModule(
      "/src/globe/themes.ts",
    );
    const { MECHANIC_RECIPES } = await server.ssrLoadModule(
      "/src/game/recipes.ts",
    );
    if (
      JOURNEYS.length !== index.length ||
      JOURNEYS.some((journey) => {
        const entry = index.find(({ id }) => id === journey.id);
        return (
          !entry ||
          entry.title !== journey.title ||
          entry.description !== journey.description ||
          entry.path !== journeyPath(journey.id) ||
          entry.rounds.map(({ id }) => id).join() !==
            journey.rounds.map(({ id }) => id).join()
        );
      })
    )
      throw Error(
        "Journey index is stale. Run npm run prepare:journeys, then export again.",
      );
    for (const mode of Object.keys(MECHANICS)) {
      if (!MODE_NOTES[mode])
        throw Error(
          `Add an author-facing description for new mechanic: ${mode}`,
        );
      if (!MECHANIC_RECIPES.some((question) => question.mode === mode))
        throw Error(`Missing mechanic recipe: ${mode}`);
    }
    const regions = JSON.parse(await source("public/geography/world.v1.json"));
    const generatedAt = new Date().toISOString();
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const workingTree = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      { cwd: ROOT, encoding: "utf8" },
    ).trimEnd();
    const snapshot = `Repository revision: ${revision}${workingTree ? " (working tree has changes; this export reflects local files)" : ""}. Exported: ${generatedAt}.`;
    const counts = Object.fromEntries(
      Object.keys(MECHANICS).map((mode) => [
        mode,
        JOURNEYS.flatMap(({ rounds }) => rounds).filter(
          (question) => question.mode === mode,
        ).length,
      ]),
    );
    const catalogRows = [];
    const exampleTexts = new Map();
    let base;
    for (const journey of JOURNEYS) {
      const entry = index.find(({ id }) => id === journey.id);
      const modulePath = `src/game/${entry.module.replace(/^\.\//, "")}`;
      const module = await server.ssrLoadModule(`/${modulePath}`);
      if (!Object.values(module).includes(journey))
        throw Error(`Incorrect Journey module in index: ${journey.id}`);
      await source(modulePath);
      const slug = entry.path.split("/").at(-1);
      const context = preparation.createQuestionContext(
        regions,
        COUNTRY_FACTS,
        journey,
        base,
      );
      base = context;
      const referenceName = (id, question) =>
        question.choices?.find((choice) => choice.id === id)?.label ??
        answerPlace(question, id)?.name ??
        context.names.get(id) ??
        context.choiceNames.get(id) ??
        id;
      const identify = (id, question) => ({
        id,
        name: referenceName(id, question),
      });
      const example = [
        `# ${journey.title}`,
        snapshot,
        `Source: \`${modulePath}\`. ID: \`${journey.id}\`. Admin preview route: \`${entry.path}\`.`,
        journey.description,
        "These are current authored examples, not instructions. Scenes below are effective structural snapshots, not browser renders. Geometry payloads are intentionally omitted.",
      ];
      const editorial = [
        `## ${journey.title}`,
        journey.description,
        `Detailed reference: [${slug}](examples/${slug}.md). Source: \`${modulePath}\`.`,
      ];
      const featuredReason = featured.find(
        ({ id }) => id === journey.id,
      )?.reason;
      if (featuredReason)
        example.push(`**Why highlighted:** ${featuredReason}`);
      if (featuredReason)
        editorial.push(`**Why highlighted:** ${featuredReason}`);
      for (const [roundIndex, question] of journey.rounds.entries()) {
        const mechanic = MECHANICS[question.mode];
        const expected = preparation.solutionIds(question, context);
        const eligible = preparation.selectableIds(question, context);
        const count = preparation.responseCount(question, context);
        let acceptedAnswers = expected.map((id) => identify(id, question));
        if (question.rule.type === "manual-text")
          acceptedAnswers = question.rule.answers;
        if (question.rule.type === "manual-number")
          acceptedAnswers = [question.rule.value];
        if (
          [
            "capital-name",
            "capital-order",
            "capital-coordinate",
            "capital-circle",
          ].includes(question.rule.type) &&
          question.mode !== "number"
        )
          acceptedAnswers = expected.map((id) => ({
            countryId: id,
            name:
              context.capitals.find((city) => city.countryId === id)?.name ??
              id,
          }));
        if (question.rule.type === "text-fact")
          acceptedAnswers = context.facts
            .filter(
              (fact) =>
                fact.countryId === question.rule.countryId &&
                fact.field === question.rule.field,
            )
            .map((fact) => ({ value: fact.value, aliases: fact.aliases }));
        const contract = {
          progressLabel: question.progressLabel,
          resolvedLabel: question.resolvedLabel,
          rule: question.rule,
          acceptedAnswers,
          count,
          commitment: question.commitment,
          failure: question.failure,
          selection: question.selection,
          eligible:
            eligible.length > 12
              ? {
                  count: eligible.length,
                  determinedBy: question.selection,
                  note: "Large candidate set omitted; the selection contract is authoritative.",
                }
              : eligible.map((id) => identify(id, question)),
          choices: question.choices,
          shuffleChoices: question.shuffleChoices,
          matchSlots: question.matchSlots,
          orderLabels: question.orderLabels,
          orderInitial: question.orderInitial,
          orderGroupLabel: question.orderGroupLabel,
          orderAsideLabel: question.orderAsideLabel,
          inputLabel: question.inputLabel,
        };
        if (
          question.mode === "number" ||
          ["capital-circle", "country-circle"].includes(question.rule.type)
        )
          contract.acceptedAnswers = [
            Number(correctAnswerSummary(question, context, initialGame).value),
          ];
        editorial.push(
          `### ${roundIndex + 1}. ${question.label} — ${question.mode}`,
          `${question.leadIn ? `${question.leadIn} ` : ""}${questionText.questionPrompt(question, context)}`,
          ...(question.instruction
            ? [`**Instruction:** ${question.instruction}`]
            : []),
          `**Answer:** ${inlineJson({ rule: question.rule, accepted: contract.acceptedAnswers, count, commitment: question.commitment, ...(question.matchSlots ? { matchSlots: question.matchSlots } : {}) })}`,
          `**Candidates:** ${inlineJson(contract.eligible)}`,
          ...(question.guidance
            ? [`**Hint:** ${question.guidance.hint}`]
            : ["**Hint:** none authored."]),
          ...(question.guidance?.assist
            ? [
                `**Assist:** ${question.guidance.assist.text}`,
                `**Assist effects:** ${inlineJson(summarizeGeometry({ survivors: question.guidance.assist.candidateIds?.map((id) => referenceName(id, question)), fixedSlots: question.guidance.assist.fixedSlots, fixedSelections: question.guidance.assist.fixedSelections, referencePlaces: question.guidance.assist.places?.map((place) => place.name), overlays: question.guidance.assist.overlays }))}`,
              ]
            : []),
        );
        example.push(
          `## ${roundIndex + 1}. ${question.label} — ${question.mode}`,
          `ID: \`${question.id}\`. Control: ${mechanic.control}.`,
          ...(question.leadIn ? [`**Lead-in:** ${question.leadIn}`] : []),
          `**Prompt:** ${questionText.questionPrompt(question, context)}`,
          ...(question.instruction
            ? [`**Instruction:** ${question.instruction}`]
            : []),
          "### Answer contract",
          json(contract),
          "### Help",
          question.guidance
            ? json(summarizeGeometry(question.guidance))
            : "No authored help.",
        );
        const states = [
          ["play", { ...initialGame, phase: "playing", roundIndex }],
          ...(question.guidance
            ? [
                [
                  "hint",
                  {
                    ...initialGame,
                    phase: "playing",
                    roundIndex,
                    help: { [question.id]: "hinted" },
                  },
                ],
              ]
            : []),
          ...(question.guidance?.assist
            ? [
                [
                  "assist",
                  withAssistanceLocks(question, {
                    ...initialGame,
                    phase: "playing",
                    roundIndex,
                    help: { [question.id]: "assisted" },
                  }),
                ],
              ]
            : []),
          ...[true, false].map((correct) => [
            `reveal:${correct ? "correct" : "miss"}`,
            {
              ...initialGame,
              phase: "feedback",
              roundIndex,
              selectedIds:
                correct && mechanic.response === "selected"
                  ? expected.slice(0, count)
                  : [],
              ordered: correct && mechanic.control === "cards" ? expected : [],
              answers: [{ ...initialGame, roundId: question.id, correct }],
            },
          ]),
        ];
        // Store complete play state once, then only changed fields for each stage.
        let baseline;
        let editorialBaseline;
        let lastEditorialStage;
        example.push(
          "### Effective map stages",
          "Play is shown in full. Later stages list only changes from play; omitted fields retain play values. Reveal samples use canonical selections for correct answers and an empty response for misses; typed/pin guesses and actual input are not simulated.",
        );
        for (const [stage, game] of states) {
          const world = journeyWorld(regions, journey, game, context);
          const view = summarizeGeometry({
            focus: world.focus,
            borders: world.showBorders,
            borderRegionIds: world.borderRegionIds ?? null,
            regionNames: world.regionNames,
            regionInteraction: world.regionInteraction,
            emphasis: Object.entries(world.states)
              .filter(([, state]) => !["disabled", "default"].includes(state))
              .map(([id, state]) => ({ ...identify(id, question), state })),
            places: world.places,
            physicalFeatures: world.physicalFeatures,
            overlays: world.overlays ?? [],
            routes: world.routes,
            ...(stage === "play"
              ? { disclosure: question.disclosure, map: question.map }
              : {}),
            ...(stage === "assist"
              ? {
                  lockedSelections: game.selectedIds,
                  lockedSlots: game.ordered,
                }
              : {}),
          });
          const concise = editorialSceneText(view);
          const differences = editorialBaseline
            ? Object.fromEntries(
                Object.entries(concise).filter(
                  ([key, value]) =>
                    JSON.stringify(value) !==
                    JSON.stringify(editorialBaseline[key]),
                ),
              )
            : concise;
          // Clearing a layer must survive the compact summary's omission of empty arrays.
          if (editorialBaseline)
            for (const key of Object.keys(editorialBaseline))
              if (!(key in concise)) differences[key] = [];
          const serialized = JSON.stringify(differences);
          editorial.push(
            `**Map ${stage}:** ${lastEditorialStage?.serialized === serialized ? `same changes from play as ${lastEditorialStage.stage}.` : Object.keys(differences).length ? inlineJson(differences) : "unchanged from play."}`,
          );
          lastEditorialStage = { stage, serialized };
          editorialBaseline ??= concise;
          if (!baseline) {
            baseline = view;
            example.push(`**${stage}**`, json(view));
          } else {
            const changed = Object.fromEntries(
              Object.entries(view).filter(
                ([key, value]) =>
                  JSON.stringify(value) !== JSON.stringify(baseline[key]),
              ),
            );
            example.push(
              `**${stage}**`,
              Object.keys(changed).length
                ? json(changed)
                : "Map unchanged from play.",
            );
          }
        }
        example.push(
          "### Reveal copy and media",
          json(
            summarizeGeometry({
              explanation: question.explanation,
              correctFeedback: question.correctFeedback,
              qualification: question.qualification,
              highlightParts: question.highlightParts,
              importedRegions: question.importedRegions,
              clueImage: question.image,
              feedbackFlags: question.feedbackFlags,
              feedbackImage: question.feedbackImage,
              feedbackDiagram: question.feedbackDiagram,
              mapCaption: question.mapCaption,
              feedbackMapCaption: question.feedbackMapCaption,
              source: question.source,
              sources: question.sources,
            }),
          ),
        );
        editorial.push(
          `**Reveal:** ${question.explanation}`,
          ...(question.qualification
            ? [`**Qualification:** ${question.qualification}`]
            : []),
          ...(question.image ||
          question.feedbackFlags ||
          question.feedbackImage ||
          question.feedbackDiagram
            ? [
                `**Media:** ${inlineJson({ clue: question.image, revealFlags: question.feedbackFlags, revealImage: question.feedbackImage, revealDiagram: question.feedbackDiagram })}`,
              ]
            : []),
          `**Source:** [${question.source.name}](${question.source.url}) · reviewed ${question.source.reviewedOn}. Additional map/media sources remain in the detailed reference.`,
        );
      }
      example.push(
        "## Completion",
        journey.completion
          ? json(summarizeGeometry(journey.completion))
          : "Generic results recap; no authored completion.",
        ...(journey.mapAttribution
          ? [json({ mapAttribution: journey.mapAttribution })]
          : []),
      );
      const text = `${example.join("\n\n")}\n`;
      files.set(`examples/${slug}.md`, text);
      editorial.push(
        "### Completion",
        journey.completion
          ? inlineJson({
              ...journey.completion,
              physicalFeatures: journey.completion.physicalFeatures.map(
                (feature) => pick(feature, ["name", "kind", "lat", "lng"]),
              ),
              places: journey.completion.places.map((place) =>
                pick(place, ["name", "kind", "lat", "lng", "visualState"]),
              ),
            })
          : "Generic results recap; no authored completion.",
      );
      exampleTexts.set(journey.id, editorial.join("\n\n"));
      catalogRows.push(
        `| ${tableText(journey.title)}${featuredIds.has(journey.id) ? " ★" : ""} | ${journey.rounds.map((question) => `\`${question.mode}\``).join(" → ")} | [Read example](examples/${slug}.md) · \`${modulePath}\` |`,
      );
    }
    const mechanics = Object.entries(MECHANICS)
      .map(
        ([mode, mechanic]) =>
          `### ${mode} — ${mechanic.label}\n\n${MODE_NOTES[mode]}\n\nControl: \`${mechanic.control}\`; response: \`${mechanic.response}\`; map selection: \`${mechanic.mapSelection}\`; availability: ${mechanic.visible ? "author-facing" : "internal"}; current questions: ${counts[mode]}.\n\nAllowed grading rules: ${mechanic.rules.map((rule) => `\`${rule}\``).join(", ")}.\n\nImplementation recipe: \`npm run check:journey -- --recipe ${mode}\`.`,
      )
      .join("\n\n");
    const fullCrafting = docs.get("docs/JOURNEY_CRAFTING.md");
    const crafting = fullCrafting.split(/^## Appendix:/m)[0].trim();
    files.set(
      "AUTHORING_KIT.md",
      `# Ambit Journey authoring kit\n\n${snapshot}\n\n## How to use this kit\n\nRead this file first. It contains the editorial guide, current mechanics and a catalog of all ${JOURNEYS.length} Journeys (${JOURNEYS.reduce((sum, journey) => sum + journey.rounds.length, 0)} questions). Load only relevant examples and references afterward. Start one conversation per Journey and keep settled decisions in JOURNEY_SPEC_TEMPLATE.md. PROJECT_INSTRUCTIONS.md can be pasted into project instructions.\n\n## Game and architecture in plain language\n\nAmbit is a geography game with one shared globe. A Journey develops one premise over five rounds. Each round defines a player task, canonical grading, eligible inputs and stage-specific presentation. The panel displays a joined lead-in/prompt, answer controls, optional hint followed by assist, then graded feedback. Completion resolves the premise with authored geography, media and optional flyover views. Admin's “Preview five questions” is the testing entry point; there is no playground or in-app AI authoring service.\n\nJourney modules author content with defineQuestion and presentation-only presets with definePresentation. Group map geography into scenes.play, scenes.assist and scenes.reveal; the compiler converts these into the engine's read model. Omitted fields retain defaults; explicit empty arrays clear layers. Hints normally retain the play map; assists can add references, narrow candidates or lock partial answers. Grading never comes from visual geometry, camera position or colors.\n\nCurrent implementation owners: App.tsx orchestrates sessions and the globe; GameShell.tsx renders the panel, help, feedback and results; AnswerForm.tsx and OrderAnswer.tsx provide controls. mechanics.ts owns capabilities; questionContracts.ts defines type-only schemas; questionBuilder.ts is the authoring and validation entry point. questionPreparation.ts resolves canonical data, candidates and expected answers; questionEvaluation.ts handles submission readiness and grading. answerNames.ts supplies shared name/alias matching without loading the engine; questionText.ts owns prompt/disclosure/feedback text. Current Journeys and controls import their owner modules directly; questions.ts remains a compatibility facade. state.ts owns transitions; presentation.ts and app/journeyWorld.ts resolve effective scenes; GlobeView.tsx renders them. questionSeeds.ts is no longer present: use presentation presets and explicit contracts. See references/JOURNEY_ENGINE.md and references/ARCHITECTURE.md for the current boundaries.\n\n## Semantic map colors (generated from the current code)\n\n${json({ highlights: PLAY_HIGHLIGHTS, feedback: PLAY_FEEDBACK })}\n\nSelectable means eligible; selected means the player's pending pick. Context is known setting geography (hinted/clue), not an answer. Correct is successful feedback; answer is the revealed solution; incorrect is a wrong response; visited is recap. Countries surrounding a city or symbol can stay contextual/neutral. Use semantic roles, not ad hoc hex values. Themes determine neutral land and other UI roles.\n\n## Most complete examples\n\n${featured.map((entry) => `- **${entry.title}:** ${entry.reason} [Example](examples/${entry.path.split("/").at(-1)}.md).`).join("\n")}\n\nThese examples are preferred starting points, not the only models. Explore the broader catalog for repeated mechanics, unusual geography and other pacing. Choose the format to fit the reasoning task; do not imitate Andes' rhythm mechanically. FEATURED_EXAMPLES.md collects the highlighted examples for convenient uploading. Individual files avoid loading unrelated examples.\n\n## Current crafting guide\n\nSource: docs/JOURNEY_CRAFTING.md. The technical terrain appendix is available in references/JOURNEY_CRAFTING.md; the editorial sections below are copied verbatim, not AI-summarized.\n\n${crafting}\n\n## Supported mechanics\n\nRegistry metadata and usage counts below are generated. Descriptions explain current behavior; code/contracts remain authoritative. Complete executable recipes are implementation examples, not editorial gold standards. Any unlisted mechanic requires explicit engineering work.\n\n${mechanics}\n\n## All current Journey examples\n\n★ = highlighted. Every current Journey has a detailed example export, including help, answer rules, effective stages, sources and completion.\n\n| Journey | Five-round mechanics | Reference |\n| --- | --- | --- |\n${catalogRows.join("\n")}\n\n## Accuracy and scope\n\nThis is a local snapshot, not a live repository connection. manifest.json records the revision, local changes and input/output hashes. Scene exports simulate engine state without browser rendering, full response entry, prior-round player choices or GPU label placement. They do not establish visual quality or independently verify facts. Geometry payloads are replaced with summaries; never reconstruct grading from them. Source links and media descriptions remain available; binary media and screenshots are not embedded. Re-export when code or guides change.\n`,
    );
    files.set(
      "FEATURED_EXAMPLES.md",
      `# Highlighted Journey examples\n\n${snapshot}\n\nRead AUTHORING_KIT.md first. These compact walkthroughs preserve current prompts, answers, help, map-stage changes, media, sources and completion. They are not mandatory templates; consult other Journeys when they fit the task better. All stage changes are relative to play, not the preceding stage. Structural snapshots are not browser renders; typed/pin guesses and prior-round player choices are not simulated. Detailed examples/ files retain full contracts and references.\n\n${featured.map(({ id }) => exampleTexts.get(id)).join("\n\n---\n\n")}`,
    );
    for (const file of [
      ...config.sourceReview,
      ...config.implementationReferences,
    ])
      await source(file);
    if (options.includeCode) {
      const codeFiles = [
        ...new Set([
          ...config.sourceReview,
          ...config.implementationReferences,
          ...index.map(
            ({ module }) => `src/game/${module.replace(/^\.\//, "")}`,
          ),
        ]),
      ];
      for (const file of codeFiles)
        files.set(`code/${file}`, await source(file));
      files.set(
        "SOURCE_REVIEW.md",
        `# Optional architecture source review\n\n${snapshot}\n\nLoad this only for a fresh architecture review. These are verbatim local files, not a complete runnable repository. Other engine sources, contracts, recipes and all Journey definitions are in code/; large datasets, assets, dependencies and secrets are excluded. No questionSeeds.ts exists in this revision.\n\n${config.sourceReview.map((file) => `## ${file}\n\n\`\`\`tsx\n${files.get(`code/${file}`)}\n\`\`\``).join("\n\n")}`,
      );
    }
    // Hash local data dependencies too, without exporting their large payloads.
    const dataInputs = execFileSync(
      "git",
      ["ls-files", "src/game/data", "src/geography/data"],
      { cwd: ROOT, encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const file of dataInputs) await source(file);
    files.set(
      "README.md",
      `# Using the Ambit Journey kit\n\n${snapshot}\n\n1. Upload AUTHORING_KIT.md to a ChatGPT Project or another AI workspace. Paste PROJECT_INSTRUCTIONS.md into its instructions.\n2. Add FEATURED_EXAMPLES.md for the four preferred examples, or individual examples/ files relevant to your task. The kit catalogs every current Journey; encourage looking beyond the highlights.\n3. Add JOURNEY_SPEC_TEMPLATE.md. Use one chat per Journey and save the approved specification for the coding agent.\n4. Load references/JOURNEY_ENGINE.md for implementation boundaries; architecture/catalog/policy references and the full crafting guide are included. Relative source links inside copied docs refer to repository paths, not necessarily files in this export.\n5. ${options.includeCode ? "SOURCE_REVIEW.md contains fresh App, GameShell, AnswerForm, schemas/contracts and GlobeView for a deeper review. Load it only when reviewing architecture. code/ contains the other engine references and all current Journey sources." : "Run npm run export:journeys -- --include-code when a fresh architecture review needs actual source. That adds SOURCE_REVIEW.md and selected code/ files; avoid loading them for ordinary editorial work."}\n\nNo AI calls, downloads, browser tests, app-content changes or deployment are performed by the exporter. Large geography/render payloads and binary media are omitted. This kit contains private application content/code; upload it only to a workspace you choose. Re-export after relevant changes.\n\nThe default destination is artifacts/journey-authoring-kit (git-ignored). --out must name a subdirectory of artifacts/. --highlight <id-or-slug> may be repeated to replace the default highlights. scripts/journey-export.config.json maintains the preferred examples and source-review file list. Existing exporter-owned files are refreshed; unrelated files are never replaced.\n`,
    );
    const manifest = {
      format: FORMAT,
      version: 1,
      generatedAt,
      revision,
      workingTree: workingTree || null,
      includeCode: options.includeCode,
      highlightedJourneyIds: featured.map(({ id }) => id),
      journeys: index.map(({ id, title, path: route, module }) => ({
        id,
        title,
        route,
        source: `src/game/${module.replace(/^\.\//, "")}`,
      })),
      omitted: [
        "full geographic/render geometry",
        "binary media",
        "screenshots",
        "dependencies",
        "secrets",
      ],
      inputs: [...inputs.values()],
    };
    await writeExport(directory, files, manifest);
    return {
      directory,
      files: manifest.files.length + 1,
      journeys: JOURNEYS.length,
      featured: featured.map(({ title }) => title),
      starterBytes: Buffer.byteLength(files.get("AUTHORING_KIT.md")),
      featuredBytes: Buffer.byteLength(files.get("FEATURED_EXAMPLES.md")),
    };
  } finally {
    await server.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        "Usage: npm run export:journeys -- [--include-code] [--highlight <id-or-slug>] [--out artifacts/<directory>]\nExports a portable authoring brief, highlighted/all Journey examples, project instructions, specification template and references. No AI calls or deployment.",
      );
    else {
      const report = await exportJourneyKit(options);
      console.log(
        `Exported ${report.journeys} Journeys (${report.files} files) to ${path.relative(ROOT, report.directory)}/\nHighlighted: ${report.featured.join(", ")}\nStarter brief: ${(report.starterBytes / 1024).toFixed(1)} KiB; highlighted examples: ${(report.featuredBytes / 1024).toFixed(1)} KiB. Load examples selectively to limit context.`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
