import "./account.css";
import { ActionIcon } from "./ActionIcon";

import type { AccountSection } from "./accountNavigation";
export type { AccountSection } from "./accountNavigation";

export const ACCOUNT_SECTIONS = {
  dashboard: { label: "Progress", icon: "progress" },
  friends: { label: "Friends", icon: "friends" },
  profile: { label: "Profile", icon: "profile" },
  appearance: { label: "Settings", icon: "settings" },
} as const;

export function AccountTabs({
  active,
  newFriends = false,
  guest = false,
  onSelect,
}: {
  active: AccountSection;
  newFriends?: boolean;
  guest?: boolean;
  onSelect(section: AccountSection): void;
}) {
  const sections: AccountSection[] = guest
    ? ["profile", "appearance"]
    : ["dashboard", "friends", "profile", "appearance"];
  return (
    <nav
      className="account-tabs section-navigation section-navigation--sidebar navigation-rows"
      aria-label="Account sections"
    >
      {sections.map((section) => (
        <button
          key={section}
          type="button"
          data-dd-action-name={`Account Open ${section[0].toUpperCase() + section.slice(1)}`}
          className={active === section ? "selected" : ""}
          aria-current={active === section ? "page" : undefined}
          onClick={() => onSelect(section)}
        >
          <ActionIcon name={ACCOUNT_SECTIONS[section].icon} />
          {ACCOUNT_SECTIONS[section].label}
          {section === "friends" && newFriends ? " · New" : ""}
        </button>
      ))}
    </nav>
  );
}
