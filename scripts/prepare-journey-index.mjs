import { createServer } from "vite";
import { readdir, writeFile } from "node:fs/promises";

// Home copy, routing and progress metadata; clue geometry stays deferred.
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { JOURNEYS, COMPATIBILITY_JOURNEYS, journeyPath } =
    await server.ssrLoadModule("/src/game/journeys.ts");
  const editions = [...JOURNEYS, ...COMPATIBILITY_JOURNEYS];
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
  const index = editions.map((journey) => {
    if (!modules.has(journey.id)) throw Error(`Missing module: ${journey.id}`);
    return {
      id: journey.id,
      title: journey.title,
      ...(journey.supersedes ? { supersedes: journey.supersedes } : {}),
      ...(journey.compatibilityOnly ? { compatibilityOnly: true } : {}),
      description: journey.description,
      path: journeyPath(journey.id),
      module: modules.get(journey.id),
      rounds: journey.rounds.map(({ id, label, progressLabel }) => ({
        id,
        label,
        ...(progressLabel ? { progressLabel } : {}),
      })),
    };
  });
  await writeFile(
    "src/game/journeyIndex.json",
    `${JSON.stringify(index, null, 2)}\n`,
  );
} finally {
  await server.close();
}
