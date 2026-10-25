import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  access,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { playColors } from "../src/theme/playColors.ts";
import { THEME_IDS } from "../src/theme/themes.ts";
import {
  ROOT,
  parseArgs,
  summarizeGeometry,
  featuredEntries,
  exportDirectory,
  exportJourneyKit,
} from "./export-journey-kit.mjs";

test("options and highlighted IDs fail closed on mistakes", () => {
  assert.throws(() => parseArgs(["--highlight"]), /Missing value/);
  assert.throws(() => parseArgs(["--include-cdoe"]), /Unknown option/);
  const entries = [{ id: "test-v1", path: "/journey/test", title: "Test" }];
  const config = { featured: [{ id: "test-v1", reason: "Good example" }] };
  assert.equal(
    featuredEntries(entries, config, ["test"])[0].reason,
    "Good example",
  );
  assert.throws(
    () => featuredEntries(entries, config, ["missing"]),
    /Unknown highlighted/,
  );
});

test("geometry summaries retain answer points, identity and source without bulky mesh data", () => {
  const original = {
    id: "feature:test",
    name: "Test",
    lat: -30,
    lng: 70,
    sourceId: "reviewed",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [1, 2],
          [3, 4],
          [1, 2],
        ],
      ],
    },
    relief: {
      hachures: [
        [
          [1, 2],
          [3, 4],
        ],
      ],
    },
    paths: [
      [
        [1, 2],
        [3, 4],
      ],
    ],
    rule: {
      type: "pin-distance",
      radiusKm: 450,
      tiers: [{ radiusKm: 150, feedback: "Close" }],
    },
  };
  const before = JSON.stringify(original);
  const result = summarizeGeometry(original);
  assert.equal(result.lat, -30);
  assert.equal(result.sourceId, "reviewed");
  assert.equal(result.geometry.type, "Polygon");
  assert.equal(result.geometry.coordinates, undefined);
  assert.equal(result.paths.groups, 1);
  assert.deepEqual(result.rule, original.rule);
  const scoring = summarizeGeometry({
    grid: {
      revision: "frozen-v1",
      cells: [
        [1, 2, 3],
        [2, 4, 5],
      ],
    },
    indices: [1, 2],
  });
  assert.equal(scoring.grid.revision, "frozen-v1");
  assert.equal(scoring.grid.cells.count, 2);
  assert.equal(scoring.indices.count, 2);
  assert.equal(JSON.stringify(original), before);
});

test(
  "complete export reflects real content, selective source review and safe refresh",
  { timeout: 60000 },
  async () => {
    await mkdir(path.join(ROOT, "artifacts"), { recursive: true });
    const directory = await mkdtemp(
      path.join(ROOT, "artifacts", "journey-export-test-"),
    );
    const options = {
      out: path.relative(ROOT, directory),
      highlights: [],
      includeCode: true,
    };
    try {
      await assert.rejects(
        exportDirectory(ROOT, "src/game"),
        /subdirectory of artifacts/,
      );
      await assert.rejects(
        exportDirectory(ROOT, "artifacts/../docs"),
        /subdirectory of artifacts/,
      );
      await symlink(path.join(ROOT, "src"), path.join(directory, "unsafe"));
      await assert.rejects(
        exportDirectory(ROOT, `${options.out}/unsafe/kit`),
        /real directories/,
      );
      const report = await exportJourneyKit(options);
      const manifest = JSON.parse(
        await readFile(path.join(directory, "manifest.json"), "utf8"),
      );
      const index = JSON.parse(
        await readFile(path.join(ROOT, "src/game/journeyIndex.json"), "utf8"),
      );
      assert.equal(report.journeys, index.length);
      assert.equal(manifest.journeys.length, index.length);
      assert.deepEqual(manifest.highlightedJourneyIds, [
        "along-the-andes-v1",
        "chasing-the-sun-v2",
        "mediterranean-v1",
        "not-the-obvious-city-v1",
      ]);
      assert.ok(
        manifest.inputs.some(
          ({ path: file }) => file === "src/game/data/andes-relief.v1.json",
        ),
      );
      for (const file of manifest.files) {
        const content = await readFile(path.join(directory, file.path));
        assert.equal(content.length, file.bytes);
        assert.equal(
          createHash("sha256").update(content).digest("hex"),
          file.sha256,
        );
        assert.ok(!file.path.includes(".env"));
      }
      for (const input of manifest.inputs) {
        const content = await readFile(path.join(ROOT, input.path));
        assert.equal(content.length, input.bytes);
        assert.equal(
          createHash("sha256").update(content).digest("hex"),
          input.sha256,
        );
      }
      const kit = await readFile(
        path.join(directory, "AUTHORING_KIT.md"),
        "utf8",
      );
      assert.match(kit, /Do not force increasing difficulty/);
      assert.match(
        kit,
        /Daily and Archive results have no replay action, including for admins/,
      );
      assert.match(
        kit,
        /closing heading follows earned points and is shared UI/,
      );
      const palette = JSON.parse(
        kit.match(/## Semantic map colors[^]*?```json\n([^]*?)\n```/)[1],
      );
      assert.deepEqual(Object.keys(palette.themes), THEME_IDS);
      for (const theme of THEME_IDS)
        assert.deepEqual(palette.themes[theme], playColors(theme));
      assert.notEqual(
        palette.themes.paper.correct,
        palette.themes.ocean.correct,
      );
      assert.ok(palette.themes.ocean.surface);
      assert.ok(palette.themes.ocean["context-land"]);
      assert.match(
        kit,
        /One tap commits an anonymous composite territory immediately/,
      );
      assert.match(kit, /does not grant globe input/);
      assert.doesNotMatch(
        kit,
        /Selectable means eligible|Tap one anonymous composite territory, then submit/,
      );
      assert.match(kit, /### choice-match/);
      assert.match(kit, /### choice-order/);
      assert.match(kit, /city-multiple/);
      assert.match(kit, /not the only models/);
      const workflow = await readFile(
        path.join(ROOT, "docs/journey-authoring/IMPLEMENTING_A_SPEC.md"),
        "utf8",
      );
      assert.equal(
        await readFile(path.join(directory, "IMPLEMENTING_A_SPEC.md"), "utf8"),
        workflow,
      );
      assert.ok(kit.includes(workflow));
      const gptGuide = await readFile(
        path.join(directory, "GPT_GUIDE.md"),
        "utf8",
      );
      for (const file of [
        "PROJECT_INSTRUCTIONS.md",
        "AUTHORING_KIT.md",
        "JOURNEY_SPEC_TEMPLATE.md",
      ])
        assert.ok(
          gptGuide.includes(await readFile(path.join(directory, file), "utf8")),
        );
      assert.equal(
        (gptGuide.match(/^### \d\./gm) ?? []).length,
        index.reduce((sum, journey) => sum + journey.rounds.length, 0),
      );
      for (const journey of index)
        assert.ok(gptGuide.includes(`## ${journey.title}\n`));
      const sliderNotes = kit.match(/### slider[^]*?(?=\n###|\n##)/)[0];
      assert.match(sliderNotes, /free Accuracy information/);
      const featured = await readFile(
        path.join(directory, "FEATURED_EXAMPLES.md"),
        "utf8",
      );
      assert.equal((featured.match(/^### \d\./gm) ?? []).length, 20);
      assert.match(featured, /"radiusKm":450/);
      assert.match(featured, /"matchSlots"/);
      assert.match(featured, /reviewed \d{4}-\d{2}-\d{2}/);
      assert.ok(!featured.includes('"coordinates":'));
      const review = await readFile(
        path.join(directory, "SOURCE_REVIEW.md"),
        "utf8",
      );
      const app = await readFile(path.join(ROOT, "src/App.tsx"), "utf8");
      assert.ok(review.includes(app));
      for (const file of [
        "src/game/mechanics.ts",
        "src/game/answerPresentation.ts",
        "src/game/AnswerReview.tsx",
        "src/game/pinPresentation.ts",
        "src/theme/playColors.ts",
        "src/geography/interiorAnchor.ts",
        "src/globe/areaSymbols.ts",
        "src/globe/interaction.ts",
      ]) {
        assert.equal(
          await readFile(path.join(directory, "code", file), "utf8"),
          await readFile(path.join(ROOT, file), "utf8"),
        );
        assert.ok(manifest.inputs.some((input) => input.path === file));
      }
      const northAmerica = await readFile(
        path.join(directory, "examples/north-america.md"),
        "utf8",
      );
      assert.match(northAmerica, /"acceptedAnswers": \[\s*4\s*\]/);
      assert.match(northAmerica, /"eligibleRegions": \[\]/);
      const mediterranean = await readFile(
        path.join(directory, "examples/mediterranean.md"),
        "utf8",
      );
      assert.match(mediterranean, /"markerRole": "annotation"/);
      assert.match(featured, /"markerRole":"annotation"/);
      const template = await readFile(
        path.join(directory, "JOURNEY_SPEC_TEMPLATE.md"),
        "utf8",
      );
      assert.match(template, /Visual contract/);
      assert.match(template, /actual wrong/);
      assert.match(template, /mistake\s+precedence/);
      await writeFile(path.join(directory, "my-notes.md"), "Keep my notes");
      await exportJourneyKit({
        ...options,
        includeCode: false,
        highlights: ["down-the-danube"],
      });
      const refreshed = JSON.parse(
        await readFile(path.join(directory, "manifest.json"), "utf8"),
      );
      assert.deepEqual(refreshed.highlightedJourneyIds, ["down-the-danube-v1"]);
      await assert.rejects(access(path.join(directory, "SOURCE_REVIEW.md")));
      await assert.rejects(access(path.join(directory, "code/src/App.tsx")));
      assert.equal(
        await readFile(path.join(directory, "my-notes.md"), "utf8"),
        "Keep my notes",
      );
      await writeFile(
        path.join(directory, "SOURCE_REVIEW.md"),
        "Unrelated user file",
      );
      await assert.rejects(exportJourneyKit(options), /unrelated file/);
      assert.equal(
        await readFile(path.join(directory, "SOURCE_REVIEW.md"), "utf8"),
        "Unrelated user file",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
