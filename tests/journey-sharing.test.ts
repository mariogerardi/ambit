import { expect, it } from "vitest";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { initialGame } from "../src/game/state";
import {
  sharedJourneyResult,
  resultText,
  resultCaption,
  resultDate,
  wrapCardText,
} from "../src/app/journeySharing";
import { accountIntent, comparisonLink } from "../src/app/accountNavigation";
import { modeForPath } from "../src/app/modes";
import { readFriendActivity } from "../src/app/useFriendActivity";
import type {
  CommunityClient,
  FriendActivityPage,
} from "../src/services/community";

it("shares outcomes and aggregate help without revealing answers, round names or unsubmitted help", () => {
  const first = CANADA_JOURNEY.rounds[0],
    second = CANADA_JOURNEY.rounds[1];
  const result = sharedJourneyResult(
    CANADA_JOURNEY,
    {
      ...initialGame,
      phase: "failed",
      answers: [
        {
          ...initialGame,
          roundId: first.id,
          correct: true,
          text: "private answer",
          receiptLabel: "private receipt",
          pin: { lat: 12, lng: 34 },
        },
        {
          ...initialGame,
          roundId: second.id,
          correct: false,
          text: "private guess",
        },
      ],
      help: { [first.id]: "assisted", [CANADA_JOURNEY.rounds[3].id]: "hinted" },
    },
    "2026-10-13",
    "https://playambit.com",
  );
  expect(result.outcomes).toEqual([
    "correct",
    "incorrect",
    "unreached",
    "unreached",
    "unreached",
  ]);
  const text = resultText(result);
  expect(text).toContain("✓ × — — — · 1/5");
  expect(text).toContain("Ended early");
  expect(text).toContain("October 13th, 2026");
  expect(text).toContain("Play today’s Journey: https://playambit.com/daily");
  expect(text).toContain("Assisted");
  expect(text).not.toContain("2 hints");
  for (const secret of [
    "private",
    first.id,
    first.title,
    second.prompt,
    "lat",
    "34",
  ])
    expect(text).not.toContain(secret);
});
it("wraps long words without dropping title characters", () => {
  const title = "Chasing the extraordinarilylongjourneyname across the world";
  const lines = wrapCardText(title, (value) => value.length * 10, 160);
  expect(lines.every((line) => line.length <= 16)).toBe(true);
  expect(lines.join("").replaceAll(" ", "")).toBe(title.replaceAll(" ", ""));
});
it("routes query links and rejects invalid comparison identities", () => {
  const target = {
    date: "2026-10-13",
    journeyId: "beyond-the-maple-leaf-v1",
    version: 2,
  };
  const link = comparisonLink(target);
  expect(modeForPath(link)).toBe("account");
  expect(accountIntent(link)).toEqual({ tab: "friends", comparison: target });
  expect(
    accountIntent(link.replace("2026-10-13", "2026-02-30")).comparison,
  ).toBeUndefined();
  expect(
    accountIntent(link.replace("version=2", "version=0")).comparison,
  ).toBeUndefined();
  expect(accountIntent("/account?friend=Mars").friend).toBe("mars");
});
it("reads all activity pages, deduplicates friends, and rejects repeating cursors", async () => {
  const calls: string[] = [];
  const page = {
    you: {},
    friends: [{ player: { id: "b" } }],
    cursor: "b",
  } as unknown as FriendActivityPage;
  const api = {
    request: async (path: string) => {
      calls.push(path);
      return path.includes("cursor=")
        ? {
            ...page,
            cursor: undefined,
            friends: [...page.friends, { player: { id: "c" } }],
          }
        : page;
    },
  } as CommunityClient;
  const value = await readFriendActivity(
    api,
    "2026-10-13",
    new AbortController().signal,
  );
  expect(value.friends.map((friend) => friend.player.id)).toEqual(["b", "c"]);
  expect(calls).toHaveLength(2);
  const looping = { request: async () => page } as CommunityClient;
  await expect(
    readFriendActivity(looping, "2026-10-13", new AbortController().signal),
  ).rejects.toThrow("retry");
});

it("accompanies the image with an invitation rather than repeating the receipt", () => {
  const result = sharedJourneyResult(
    CANADA_JOURNEY,
    { ...initialGame, phase: "finished" },
    "2026-10-13",
    "https://playambit.com",
  );
  const caption = resultCaption(result);
  expect(caption).toBe(
    `A world of wonders. Take today’s Journey with me → ${result.playUrl}`,
  );
  expect(caption).not.toContain("\n");
  expect(caption).toContain(result.playUrl);
  for (const detail of [result.title, "0/5", result.date, result.help])
    expect(caption).not.toContain(detail);
});

it.each([
  [1, "1st"],
  [2, "2nd"],
  [3, "3rd"],
  [11, "11th"],
  [12, "12th"],
  [13, "13th"],
  [21, "21st"],
  [22, "22nd"],
  [23, "23rd"],
  [31, "31st"],
])("formats the date with the correct ordinal for day %s", (day, ordinal) => {
  expect(resultDate(`2026-10-${String(day).padStart(2, "0")}`)).toBe(
    `October ${ordinal}, 2026`,
  );
});

it("always shares the public play URL when running on localhost or staging", () => {
  for (const origin of [
    "http://localhost:5173",
    "https://staging.example.com",
  ]) {
    const result = sharedJourneyResult(
      CANADA_JOURNEY,
      initialGame,
      "2026-10-14",
      origin,
    );
    expect(result.playUrl).toBe("https://playambit.com/daily");
    expect(resultCaption(result)).not.toContain(origin);
  }
});
