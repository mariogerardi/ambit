// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AVATARS, ProfileAvatar } from "../src/app/ProfileAvatar";

it("ships all 24 selectable profile artworks in the requested motif and palette order", () => {
  const choices = Object.entries(AVATARS).filter(
    ([, avatar]) => !avatar.hidden,
  );
  expect(choices).toHaveLength(24);
  const motifs = [
    "Pinpoint",
    "Finish flag",
    "Star",
    "Mountain",
    "Explore compass",
    "Journey",
  ];
  const palettes = ["Discovery", "Odyssey", "Expedition", "Safari"];
  for (const [index, [id, avatar]] of choices.entries()) {
    expect(avatar.label).toBe(
      `${motifs[Math.floor(index / 4)]} · ${palettes[index % 4]}`,
    );
    expect(__AVATAR_IMAGES__).toContain(avatar.image);
    const svg = new DOMParser().parseFromString(
      readFileSync(`public${avatar.image}`, "utf8"),
      "image/svg+xml",
    );
    expect(svg.querySelector("parsererror")).toBeNull();
    expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 512 512");
    expect(svg.querySelector("script, image, foreignObject")).toBeNull();
    // Profile rendering uses the saved palette variant directly, including in friend views.
    expect(
      renderToStaticMarkup(
        <ProfileAvatar
          avatar={id as Parameters<typeof ProfileAvatar>[0]["avatar"]}
        />,
      ),
    ).toContain(`src="${avatar.image}"`);
  }
});
