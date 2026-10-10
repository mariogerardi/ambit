import avatars from "../../shared/profile-avatars.json";
import flags from "../game/data/flags.v1.json";
import countries from "../game/data/un-members.v1.json";

export const AVATARS: Record<
  string,
  { label: string; symbol?: string; image?: string; hidden?: boolean }
> = avatars;
export type AvatarId = keyof typeof avatars | `flag:${string}`;
const flagSources = new Map(
  flags.flags.map((flag) => [flag.countryId, flag.src]),
);
export const FLAG_AVATARS = countries.members
  .filter((country) => flagSources.has(country.id))
  .sort((a, b) => a.name.localeCompare(b.name));

export function ProfileAvatar({
  avatar,
  label = "Your avatar",
  className = "",
}: {
  avatar: AvatarId;
  label?: string;
  className?: string;
}) {
  const countryId = avatar.startsWith("flag:") ? avatar.slice(5) : undefined;
  const preset = AVATARS[avatar] ?? AVATARS.globe;
  const image = countryId
    ? flagSources.get(countryId)
    : preset.image && __AVATAR_IMAGES__.includes(preset.image)
      ? preset.image
      : undefined;
  return (
    <span
      className={`profile-avatar ${className}`}
      role="img"
      aria-label={label}
    >
      {image ? (
        <img src={image} alt="" />
      ) : (
        (preset.symbol ?? <img src="/ambit-orb.svg" alt="" />)
      )}
    </span>
  );
}
