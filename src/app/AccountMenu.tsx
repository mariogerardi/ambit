import { useEffect, useRef, useState } from "react";
import type { PlayerProfile } from "../services/community";
import { ProfileAvatar } from "./ProfileAvatar";
import { ActionIcon } from "./ActionIcon";
import { ACCOUNT_SECTIONS } from "./AccountTabs";
import { accountIntent, accountTabLink } from "./accountNavigation";
import type { AccountSection } from "./accountNavigation";

export function AccountMenu({
  signedIn,
  player,
  admin,
  path,
  onNavigate,
  journey,
}: {
  signedIn: boolean;
  player?: PlayerProfile | null;
  admin: boolean;
  path: string;
  onNavigate(path: string): void;
  journey: {
    title: string;
    action: string;
    progress: string;
    ready: boolean;
    open(): void;
  };
}) {
  const [open, setOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [path, signedIn]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!shell.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    addEventListener("pointerdown", outside);
    addEventListener("focusin", outside);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("focusin", outside);
      removeEventListener("keydown", escape);
    };
  }, [open]);
  const active =
    path.split("?")[0] === "/account" || path.startsWith("/admin")
      ? (accountIntent(path).tab ?? "dashboard")
      : undefined;
  function go(section: AccountSection) {
    setOpen(false);
    trigger.current?.focus();
    onNavigate(accountTabLink(section));
  }
  return (
    <div className="account-menu" ref={shell}>
      <button
        ref={trigger}
        className="profile-toggle"
        data-dd-action-name="Menu Account"
        aria-label="Account"
        aria-current={active ? "page" : undefined}
        aria-expanded={signedIn ? open : undefined}
        aria-controls={signedIn ? "account-navigation" : undefined}
        onClick={() =>
          signedIn ? setOpen((value) => !value) : onNavigate("/account")
        }
        data-dd-privacy="mask"
      >
        {signedIn && (
          <ProfileAvatar
            avatar={player?.avatar ?? "globe"}
            label="Your profile picture"
          />
        )}
        {!signedIn && (
          <svg
            className="account-menu-guest-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </svg>
        )}
        <span className="account-menu-handle">
          {player ? `@${player.handle}` : signedIn ? "Your account" : "Sign in"}
        </span>
        {signedIn && (
          <svg
            className="account-menu-chevron"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m3 4.5 3 3 3-3" />
          </svg>
        )}
      </button>
      {open && signedIn && (
        <nav
          id="account-navigation"
          className="app-menu-content account-menu-content"
          aria-label="Your account"
        >
          <span className="app-menu-heading">Your space</span>
          {(["dashboard", "friends", "profile", "appearance"] as const).map(
            (section) => (
              <button
                key={section}
                data-dd-action-name={`Account Menu ${ACCOUNT_SECTIONS[section].label}`}
                aria-current={section === active ? "page" : undefined}
                onClick={() => go(section)}
              >
                <ActionIcon name={ACCOUNT_SECTIONS[section].icon} />
                <span>{ACCOUNT_SECTIONS[section].label}</span>
              </button>
            ),
          )}
          <button
            className="account-menu-today"
            disabled={!journey.ready}
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
              journey.open();
            }}
          >
            <span>
              <small>Today’s Journey · {journey.progress}</small>
              <strong>{journey.title}</strong>
              <span>{journey.action} →</span>
            </span>
          </button>
          {admin && (
            <div className="account-menu-admin">
              <button onClick={() => go("admin")}>
                <ActionIcon name="admin" />
                <span>Admin</span>
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
