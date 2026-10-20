import "./account.css";

import type { AccountSection } from "./accountNavigation";
export type { AccountSection } from "./accountNavigation";

export function AccountTabs({
  active,
  admin = false,
  newFriends = false,
  guest = false,
  onSelect,
}: {
  active: AccountSection;
  admin?: boolean;
  newFriends?: boolean;
  guest?: boolean;
  onSelect(section: AccountSection): void;
}) {
  const sections: AccountSection[] = guest
    ? ["profile", "appearance"]
    : ["dashboard", "profile", "friends", "appearance"];
  if (admin && !guest) sections.push("admin");
  return (
    <nav className="account-tabs" aria-label="Account sections">
      {sections.map((section) => (
        <button
          key={section}
          type="button"
          data-dd-action-name={`Account Open ${section[0].toUpperCase() + section.slice(1)}`}
          className={active === section ? "selected" : ""}
          aria-current={active === section ? "page" : undefined}
          onClick={() => onSelect(section)}
        >
          {section[0].toUpperCase() + section.slice(1)}
          {section === "friends" && newFriends ? " · New" : ""}
        </button>
      ))}
    </nav>
  );
}
