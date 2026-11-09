import { useEffect, useRef, useState } from "react";
import { useAccount } from "../services/accounts";
import { feedbackApi } from "../services/feedback";
import type { FeedbackItem } from "../services/feedback";
import { useToast } from "./Toast";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { journeyReviewLink } from "./accountNavigation";

const statusActions: Record<
  FeedbackItem["status"],
  { status: FeedbackItem["status"]; label: string }[]
> = {
  new: [
    { status: "reviewed", label: "Mark reviewed" },
    { status: "resolved", label: "Resolve" },
  ],
  reviewed: [
    { status: "resolved", label: "Resolve" },
    { status: "new", label: "Mark new" },
  ],
  resolved: [
    { status: "new", label: "Reopen as new" },
    { status: "reviewed", label: "Reopen as reviewed" },
  ],
};

export function FeedbackReview({
  onNavigate,
}: {
  onNavigate?(url: string): void;
}) {
  const account = useAccount();
  const { notify } = useToast();
  const [filter, setFilter] = useState<"all" | FeedbackItem["status"]>("all");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);
  const accountRef = useRef(account);
  accountRef.current = account;
  const controller = useRef<AbortController | undefined>(undefined);
  async function load(next?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const request = (controller.current = new AbortController());
    try {
      const token = await accountRef.current.accessToken();
      if (!token || !accountRef.current.admin)
        throw new Error("Admin sign-in required.");
      const page = await feedbackApi<{
        items: FeedbackItem[];
        cursor?: string;
      }>(
        `/admin/feedback${next ? `?cursor=${encodeURIComponent(next)}` : ""}`,
        token,
        undefined,
        "GET",
        request.signal,
      );
      if (request.signal.aborted) return;
      setItems((old) =>
        next
          ? [
              ...old,
              ...page.items.filter(
                (item) => !old.some((entry) => entry.id === item.id),
              ),
            ]
          : page.items,
      );
      setCursor(page.cursor);
      setLoaded(true);
    } catch (failure) {
      if (!request.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Couldn’t load feedback.",
        );
    } finally {
      inFlight.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    if (account.admin) void load();
    return () => controller.current?.abort();
  }, [account.admin]);
  async function update(id: string, status: FeedbackItem["status"]) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setUpdating(id);
    setError("");
    const request = (controller.current = new AbortController());
    try {
      const token = await accountRef.current.accessToken();
      if (!token || !accountRef.current.admin)
        throw new Error("Admin sign-in required.");
      await feedbackApi(
        `/admin/feedback/${id}`,
        token,
        { status },
        "PATCH",
        request.signal,
      );
      if (!request.signal.aborted) {
        setItems((old) =>
          old.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        notify(`Feedback marked ${status.toLowerCase()}.`);
      }
    } catch (failure) {
      if (!request.signal.aborted) {
        const message =
          failure instanceof Error
            ? failure.message
            : "Couldn’t update feedback.";
        setError(message);
        notify(message, { tone: "error" });
      }
    } finally {
      inFlight.current = false;
      setUpdating(undefined);
      if (!request.signal.aborted) setBusy(false);
    }
  }
  if (!account.admin) return null;
  return (
    <section
      className="feedback-review"
      aria-label="Feedback"
      data-dd-privacy="mask"
    >
      <h2 className="sr-only">Feedback</h2>
      <div className="admin-feedback-toolbar">
        <div
          className="admin-feedback-filters"
          role="group"
          aria-label="Filter feedback"
        >
          {(["all", "new", "reviewed", "resolved"] as const).map((status) => (
            <button
              type="button"
              key={status}
              className="quiet-button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {status === "all"
                ? "All"
                : status[0].toUpperCase() + status.slice(1)}
              <span>
                {status === "all"
                  ? items.length
                  : items.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="quiet-button tertiary-action"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      {cursor && items.length > 0 && (
        <p className="admin-feedback-count-note">
          Counts reflect loaded reports.
        </p>
      )}
      {busy && !updating && <p role="status">Loading reports…</p>}
      {error && <p role="alert">{error}</p>}
      {loaded && !items.length && (
        <div className="admin-empty">
          <h3>No reports yet.</h3>
          <p>Player reports and available Journey details will appear here.</p>
        </div>
      )}
      <ul>
        {items
          .filter((item) => filter === "all" || item.status === filter)
          .sort(
            (a, b) =>
              Number(b.status === "new") - Number(a.status === "new") ||
              Number(b.createdAt.split("#")[0]) -
                Number(a.createdAt.split("#")[0]),
          )
          .map((item) => {
            const journey = JOURNEY_INDEX.find(
              (journey) => journey.id === item.context.journeyId,
            );
            const question = journey?.rounds.find(
              (round) => round.id === item.context.questionId,
            );
            const review =
              journey &&
              journeyReviewLink(
                journey.path,
                undefined,
                item.context.questionId,
              );
            const createdAtSeconds = Number(item.createdAt.split("#")[0]);
            const timestamp = new Date(createdAtSeconds * 1000);
            const createdAt = Number.isFinite(timestamp.getTime())
              ? timestamp
              : undefined;
            return (
              <li
                key={item.id}
                className="admin-feedback-item"
                aria-busy={updating === item.id}
              >
                <header className="admin-feedback-item-heading">
                  <div className="admin-feedback-meta">
                    <span className="admin-feedback-kind">
                      {item.kind === "question" ? "Question" : "Experience"}
                    </span>
                    <strong>{item.category}</strong>
                    <span className={`admin-feedback-status is-${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                  {createdAt && (
                    <time dateTime={createdAt.toISOString()}>
                      {createdAt.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </header>
                <p className="feedback-message">
                  {item.message || "No written message was included."}
                </p>
                {(journey || item.context.questionId) && (
                  <div className="admin-feedback-journey">
                    <div>
                      {journey && <strong>{journey.title}</strong>}
                      {question && (
                        <span>{question.progressLabel ?? question.label}</span>
                      )}
                      {!question && item.context.questionId && (
                        <span>
                          Question reference: {item.context.questionId}
                        </span>
                      )}
                      {!journey && item.context.questionId && (
                        <span>Reported question is not in this catalog.</span>
                      )}
                    </div>
                    {review && (
                      <a
                        href={review}
                        className="tertiary-action"
                        onClick={(event) => {
                          if (onNavigate) {
                            event.preventDefault();
                            onNavigate(review);
                          }
                        }}
                      >
                        Review reported{" "}
                        {item.context.questionId ? "question" : "Journey"} →
                      </a>
                    )}
                  </div>
                )}
                <footer className="admin-feedback-footer">
                  <div
                    className="admin-feedback-actions"
                    role="group"
                    aria-label={`Update status for ${item.category} feedback`}
                  >
                    {statusActions[item.status].map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        className="quiet-button"
                        disabled={busy}
                        onClick={() => void update(item.id, action.status)}
                      >
                        {action.label}
                      </button>
                    ))}
                    {updating === item.id && (
                      <span role="status">Updating report…</span>
                    )}
                  </div>
                  <details className="admin-feedback-context">
                    <summary>Technical context</summary>
                    <dl>
                      {Object.entries(item.context).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </footer>
              </li>
            );
          })}
      </ul>
      {loaded &&
        items.length > 0 &&
        !items.some((item) => filter === "all" || item.status === filter) && (
          <p className="muted">
            No {filter} reports in the loaded results
            {cursor ? ". Load more to check earlier reports." : "."}
          </p>
        )}
      {cursor && (
        <button
          className="quiet-button tertiary-action"
          disabled={busy}
          onClick={() => void load(cursor)}
        >
          Load more
        </button>
      )}
    </section>
  );
}
