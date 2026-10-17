import { createPortal } from "react-dom";

/** Keep this markup in sync with the pre-JavaScript shell in index.html. */
export function LoadingScreen() {
  return createPortal(
    <div className="ambit-loading-screen" role="status" aria-live="polite">
      <svg
        className="ambit-loading-globe"
        viewBox="0 0 220 220"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="ambit-loading-clip">
            <circle cx="110" cy="110" r="90" />
          </clipPath>
        </defs>
        <circle cx="110" cy="110" r="90" fill="#10333c" />
        <g clipPath="url(#ambit-loading-clip)">
          <g className="ambit-loading-turn">
            <g
              fill="none"
              stroke="#7ca99e"
              strokeOpacity=".4"
              strokeWidth="1.5"
            >
              <ellipse cx="110" cy="110" rx="39" ry="90" />
              <ellipse cx="110" cy="110" rx="73" ry="90" />
              <path d="M20 78q90 30 180 0M20 142q90-30 180 0M20 110h180" />
            </g>
            <g fill="#6c9b82" opacity=".86">
              <path d="M53 51l25-8 16 11 3 19-17 7-8 19-20 4-13-16 5-19zM84 115l18 4 8 21-12 33-16 18-9-22 5-20-11-15z" />
              <path d="M130 50l27-10 28 15-6 19-22 2-11 16-16-5-12-20zM133 107l21-12 27 8 8 20-16 17-8 30-21-6-4-23-17-15z" />
            </g>
          </g>
        </g>
        <circle
          cx="110"
          cy="110"
          r="90"
          fill="none"
          stroke="#aad3c2"
          strokeOpacity=".85"
          strokeWidth="2"
        />
      </svg>
      <strong className="ambit-loading-title">ambit</strong>
      <span className="ambit-loading-copy">
        Loading your world<span className="ambit-loading-dots">…</span>
      </span>
    </div>,
    document.body,
  );
}
