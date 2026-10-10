import { createRoot } from "react-dom/client";
import { AccountDashboard } from "../src/app/AccountDashboard";
import { defaultSettings } from "../src/study/engine";
import type {
  AccountProfile,
  CommunityClient,
  Friendship,
} from "../src/services/community";
import { emptyDaily } from "../src/app/dailyProgress";
import { applyTheme } from "../src/theme/themes";
import "../src/fonts.css";
import "../src/style.css";
import "../src/game/game.css";
import "../src/app/app.css";
import "../src/app/mobile.css";
import "../src/theme/themes.css";
import "./review.css";

applyTheme("ocean");
const settings = {
  ...defaultSettings,
  topics: ["capitals"] as const,
  styles: { ...defaultSettings.styles, capitals: "choices" as const },
  length: 10 as const,
  revisitMissed: false,
  perTopicMethods: false,
};
const setup = { ...settings, topics: [...settings.topics] };
let profile: AccountProfile = {
  id: "review-player",
  displayName: "Mario",
  handle: "mario",
  avatar: "globe",
  favoriteRegion: "The Mediterranean",
  bio: "Always curious about what’s around the next corner.",
  shareJourneyScores: true,
  revision: 1,
  presets: [
    {
      id: "b87e39c5-6415-49f6-94a7-86967b282894",
      name: "Capital curiosity",
      settings: setup,
    },
  ],
};
let friends: Friendship[] = [
  {
    id: "alex",
    status: "accepted",
    player: {
      id: "alex",
      displayName: "Alex",
      handle: "alex_explores",
      avatar: "compass",
      favoriteRegion: "Oceania",
      bio: "One island at a time.",
    },
  },
  {
    id: "sam",
    status: "incoming",
    player: {
      id: "sam",
      displayName: "Sam",
      handle: "sam",
      avatar: "mountain",
      favoriteRegion: "The Andes",
      bio: "",
    },
  },
];
const client: CommunityClient = {
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const data = body as Record<string, unknown> | undefined;
    let result: unknown;
    if (path === "profile") {
      if (method === "PATCH")
        profile = {
          ...(body as AccountProfile),
          revision: profile.revision + 1,
        };
      result = profile;
    } else if (path === "friends") {
      if (method === "POST") {
        const handle = String(data?.handle);
        if (friends.some((f) => f.player?.handle === handle))
          throw new Error("A request or friendship already exists.");
        friends.push({
          id: handle,
          status: "outgoing",
          player: {
            id: handle,
            handle,
            displayName: handle,
            avatar: "wave",
            favoriteRegion: "",
            bio: "",
          },
        });
      }
      result = friends;
    } else if (path.startsWith("friends/")) {
      const id = path.split("/")[1];
      if (path.endsWith("/journeys"))
        result = [
          { date: "2026-10-10", journeyId: "journey-1", correct: 4, total: 5 },
        ];
      else {
        const friend = friends.find((f) => f.id === id)!;
        if (data?.action === "accept") friend.status = "accepted";
        else if (data?.action === "block") friend.status = "blocked";
        else friends = friends.filter((f) => f.id !== id);
        result = { saved: true };
      }
    } else throw new Error("Preview route unavailable.");
    return structuredClone(result) as T;
  },
};
function Review() {
  return (
    <>
      <aside className="review-banner">
        <strong>Local review · sample accounts</strong>
        <span>No requests leave this preview.</span>
        <a href="/">Review the app</a>
        <a href="/review/login.html">Login branding</a>
      </aside>
      <main className="review-main">
        <div className="account-earth" aria-hidden="true" />
        <AccountDashboard
          subject={profile.id}
          email="mario@example.com"
          daily={emptyDaily}
          study={{ version: 1, settings: setup }}
          client={client}
          sync={{
            status: "saved",
            message: "Preview progress stays in this page.",
            retry() {},
          }}
        />
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Review />);
