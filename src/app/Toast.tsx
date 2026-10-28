import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import "./styles/toasts.css";

type Tone = "success" | "error" | "info";
interface Notification {
  id: number;
  message: string;
  tone: Tone;
}
const ToastContext = createContext({
  enabled: false,
  notify: (_message: string, _options?: { tone?: Tone }) => {},
});
export const useToast = () => useContext(ToastContext);

function Toast({
  item,
  dismiss,
}: {
  item: Notification;
  dismiss(id: number): void;
}) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    if (item.tone === "error" || paused || hidden) return;
    const timer = window.setTimeout(() => dismiss(item.id), 6000);
    return () => clearTimeout(timer);
  }, [item, paused, hidden, dismiss]);
  return (
    <li
      className={`toast toast-${item.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setPaused(false);
      }}
    >
      <p role={item.tone === "error" ? "alert" : "status"} aria-atomic="true">
        {item.message}
      </p>
      <button
        type="button"
        aria-label={`Dismiss notification: ${item.message}`}
        onClick={() => dismiss(item.id)}
      >
        ×
      </button>
    </li>
  );
}

/** Lives above account-specific workspaces so confirmations survive navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const nextId = useRef(0);
  const notify = useCallback((message: string, options?: { tone?: Tone }) => {
    const item = {
      id: ++nextId.current,
      message,
      tone: options?.tone ?? ("success" as Tone),
    };
    setItems((old) =>
      [...old.filter((existing) => existing.message !== message), item].slice(
        -3,
      ),
    );
  }, []);
  const dismiss = useCallback(
    (id: number) => setItems((old) => old.filter((item) => item.id !== id)),
    [],
  );
  return (
    <ToastContext.Provider value={{ enabled: true, notify }}>
      {children}
      <section
        className="toast-region"
        aria-label="Notifications"
        data-dd-privacy="mask"
      >
        <ul>
          {items.map((item) => (
            <Toast key={item.id} item={item} dismiss={dismiss} />
          ))}
        </ul>
      </section>
    </ToastContext.Provider>
  );
}
