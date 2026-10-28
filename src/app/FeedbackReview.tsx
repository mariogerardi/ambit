import { useEffect, useRef, useState } from "react";
import { useAccount } from "../services/accounts";
import { feedbackApi } from "../services/feedback";
import type { FeedbackItem } from "../services/feedback";
import { useToast } from "./Toast";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { journeyReviewLink } from "./accountNavigation";

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
      if (!request.signal.aborted) setBusy(false);
    }
  }
  if (!account.admin) return null;
  return (
    <section
      className="feedback-review"
      aria-label="Player feedback"
      data-dd-privacy="mask"
    >
      <header className="feedback-review-heading">
        <h2>Player feedback</h2>
        <button
          className="quiet-button tertiary-action"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh feedback
        </button>
      </header>
      {items.length > 0 && (
        <div className="admin-feedback-filters" aria-label="Filter feedback">
          {(["all", "new", "reviewed", "resolved"] as const).map((status) => (
            <button
              type="button"
              key={status}
              className="quiet-button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {status[0].toUpperCase() + status.slice(1)}{" "}
              <span>
                {status === "all"
                  ? items.length
                  : items.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </div>
      )}
      {cursor && items.length > 0 && (
        <p className="admin-feedback-count-note">
          Counts reflect loaded reports.
        </p>
      )}
      {busy && <p role="status">Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {loaded && !items.length && (
        <div className="admin-empty">
          <h3>All quiet here.</h3>
          <p>
            No player feedback yet. New reports will appear here with a link to
            the relevant Journey.
          </p>
        </div>
      )}
      <ul>
        {items
          .filter((item) => filter === "all" || item.status === filter)
          .sort(
            (a, b) => Number(b.status === "new") - Number(a.status === "new"),
          )
          .map((item) => {
            const journey = JOURNEY_INDEX.find(
              (journey) => journey.id === item.context.journeyId,
            );
            const review =
              journey &&
              journeyReviewLink(
                journey.path,
                undefined,
                item.context.questionId,
              );
            return (
              <li key={item.id}>
                <strong>
                  {item.kind === "question" ? "Question" : "Experience"} ·{" "}
                  {item.category}
                </strong>
                <small>
                  {new Date(
                    Number(item.createdAt.split("#")[0]) * 1000,
                  ).toLocaleString()}
                </small>
                {item.message && (
                  <p className="feedback-message">{item.message}</p>
                )}
                {journey && (
                  <div className="admin-feedback-journey">
                    <strong>{journey.title}</strong>
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
                <details className="admin-feedback-context">
                  <summary>Report context</summary>
                  <dl>
                    {Object.entries(item.context).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <label className="field">
                  Status
                  <select
                    value={item.status}
                    disabled={busy}
                    onChange={(event) =>
                      void update(
                        item.id,
                        event.target.value as FeedbackItem["status"],
                      )
                    }
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
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
