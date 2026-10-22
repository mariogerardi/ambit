import { createServer } from "vite";
import { readdir, writeFile } from "node:fs/promises";

// Home copy, routing and progress metadata; clue geometry stays deferred.
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { JOURNEYS, journeyPath } = await server.ssrLoadModule(
    "/src/game/journeys.ts",
  );
  const { validateJourneyContracts } = await server.ssrLoadModule(
    "/src/game/questionBuilder.ts",
  );
  const editions = JOURNEYS;
  const files = (await readdir("src/game")).filter(
    (name) => name === "journey.ts" || name.endsWith("Journey.ts"),
  );
  const modules = new Map();
  for (const file of files) {
    const module = await server.ssrLoadModule(`/src/game/${file}`);
    for (const value of Object.values(module)) {
      if (editions.includes(value)) modules.set(value.id, `./${file}`);
    }
  }
  const index = editions
    .map((journey) => {
      validateJourneyContracts(journey);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(journey.addedAt ?? ""))
        throw Error(`Missing addedAt date: ${journey.id}`);
      if (!modules.has(journey.id))
        throw Error(`Missing module: ${journey.id}`);
      return {
        id: journey.id,
        addedAt: journey.addedAt,
        title: journey.title,
        ...(journey.supersedes ? { supersedes: journey.supersedes } : {}),
        ...(journey.saveRevision
          ? {
              saveRevision: journey.saveRevision,
              legacyRoundLabels: journey.legacyRoundLabels,
            }
          : {}),
        description: journey.description,
        path: journeyPath(journey.id),
        module: modules.get(journey.id),
        rounds: journey.rounds.map(
          ({ id, label, progressLabel, resolvedLabel }) => ({
            id,
            label,
            ...(progressLabel ? { progressLabel } : {}),
            ...(journey.saveRevision && resolvedLabel ? { resolvedLabel } : {}),
          }),
        ),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(
    "src/game/journeyIndex.json",
    `${JSON.stringify(index, null, 2)}\n`,
  );
} finally {
  await server.close();
}
