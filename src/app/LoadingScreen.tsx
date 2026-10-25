import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Keep this markup in sync with the pre-JavaScript shell in index.html. */
export function LoadingScreen({ active = true }: { active?: boolean }) {
  const [visible, setVisible] = useState(active);
  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 500);
    return () => window.clearTimeout(timer);
  }, [active]);
  if (!visible) return null;
  return createPortal(
    <div
      className={`ambit-loading-screen${active ? "" : " is-leaving"}`}
      role="status"
      aria-live="polite"
      aria-hidden={!active || undefined}
    >
      <svg
        className="ambit-loading-globe"
        viewBox="0 0 220 220"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="ambit-loading-clip">
            <circle cx="110" cy="110" r="90" />
          </clipPath>
          <g
            id="ambit-loading-land"
            stroke="var(--map-border, rgba(25, 47, 57, 0.7))"
            strokeWidth=".55"
            strokeLinejoin="round"
          >
            <path
              fill="var(--map-land-0, #78cfa0)"
              d="M122,144v-4l5,3zM122,106l4,-2l-1,4zM171,67l12,1l-9,6zM0,41l10,3l-10,1zM207,52l5,-5l-2,-7l11,2l-9,1l5,3l7,-5l25,1l-2,-3l5,-2l2,4l-5,2l3,1l6,-2l-4,-1l1,-4l8,3l-2,-4l23,-4l10,2l-8,3l74,4v4h-4l3,3l-15,2l-7,9l-1,-6l9,-5l-23,3l-7,4l6,2l-1,4l-9,7l4,-6l-11,-6l-6,4l-19,-2l-12,3l-18,-6l-8,1v3l-14,1l1,9l-11,-4l3,-5zM241,80h5l6,-7l5,2l-6,11l-9,-1zM183,102l1,-6l11,2l-7,7zM353,145l6,3l-4,4zM192,127l13,1h-4l-1,10h-4zM268,61l11,-3l21,5l-15,5zM168,95h6l-1,-10l11,6l-10,9zM280,90l5,-1l3,6zM311,76l10,-7l-1,6zM200,70l7,-2l-5,5zM177,103l3,-4l1,5zM189,111l5,-2l-3,5zM171,103l1,-3l5,1v4zM192,116l8,-11l11,2l-1,16zM194,104l8,-5l5,6l-11,3zM189,105l6,-8l1,11zM0,200v-6l23,1l-17,-2h19l7,-3l-10,-3l23,-2l66,-2l2,-6l10,-4l-8,4l4,7l-23,4l24,5l36,-3l-12,-1l29,-8l46,-1l15,-4l15,2l-2,5l17,-6l49,-1l38,6l-9,3l4,3l-7,2l21,4v6h-180h-180zM105,182l5,-3l2,3z"
            />
            <path
              fill="var(--map-land-1, #efbc62)"
              d="M202,123h8l-1,-5l5,3l-7,7zM107,101l3,-3l10,4l-6,7zM12,44h8l-6,-2l9,-3l16,1v10l11,5l-21,-6l-12,6l6,-4l-8,-2l4,-4zM55,62h37l5,6l14,-5l2,2l-9,6l-6,8l2,6l-8,-6l-9,5l-24,-9zM210,111l4,-5v5zM206,71l17,-3l2,5l-15,1zM277,92l3,-2l6,4l-3,4l-3,-1l2,7l-4,-2zM209,115l5,-4l6,9l-5,2zM191,51l5,-8l8,-1l-8,12zM221,107l10,-9l-9,14zM215,82l5,-4l15,12l-12,4zM117,132l4,-3l4,8zM185,48l13,-7l13,-1l-14,2l-6,9h-5zM224,71l17,2l2,10l-11,-1zM119,104l2,-2l3,6zM201,41l8,-1l3,7l-11,2l4,-4zM99,112l2,-3l4,1l-4,5zM104,157l6,-29l3,5l-7,27l6,2l-6,1zM110,127v-6l5,-1l7,8l-10,5zM293,136l1,-4l18,-11l9,7l1,-7l12,18l-4,9l-6,1l-13,-8l-15,4zM192,127v-11l10,1l1,11z"
            />
            <path
              fill="var(--map-land-2, #70bfce)"
              d="M205,128l5,-2l3,4l-4,2zM232,86l4,-2l-1,3zM204,101l9,-3l2,7l-4,2zM200,64l7,-2l3,3zM171,71l3,-3l-1,5zM300,94l2,-2l2,5zM302,103l4,-2l-1,3zM232,91l4,-6l4,2l-5,6zM210,125l5,2v-5l5,-2l-7,17zM63,77l16,3l5,11l9,-3l-1,4l-4,3l-11,-3zM223,132l6,-10l-2,13zM214,111l1,-6l7,1l-3,9zM187,65l7,-2l4,7l-2,2zM165,99l6,-1l1,3zM186,59l3,-4l6,4l-5,4zM194,64h5l-3,1l2,2zM101,108l2,-7l6,-3l-2,3l5,3l1,5l-3,-1v6zM39,40l34,3h12v-5l8,5l4,-3l2,3l-9,1l3,1l-8,6l15,8l2,-11h4l6,4l4,-2l8,8l-26,10l-6,-6l-35,-1l-12,-11h-6zM61,38l13,-1l5,3l-12,2zM88,28h31l-20,6h-9l11,-5zM105,65l9,-4l5,4zM121,62l3,-4l3,4zM90,38l9,-2l20,7l-7,1l3,3l-3,1l-10,-3l6,-2l-3,-2z"
            />
            <path
              fill="var(--map-land-3, #e99579)"
              d="M223,94l10,-1l-9,4zM282,88h6l-2,3l3,7l-4,3l3,-6zM236,65l17,4l-6,4l-11,-4zM188,76l3,-3l-1,7zM202,97l3,-9h12l2,4l-5,9l-1,-3l-9,3zM194,57l9,-1l1,3zM321,117v-4l10,7zM180,96l15,-9l-1,9l-10,2zM175,61l8,-2l5,2v5l-9,1zM205,80l9,-1l3,9h-12zM107,32l30,-5l31,2l-8,1l1,6l-6,2l3,1l-18,5l-3,6l-8,-4l-3,-3l4,-3l-7,-5zM191,114l2,-6l5,-2l-2,8zM254,71l14,-10l17,7l15,-5l-4,-1l5,-5l14,5l-4,5l-13,4l5,2l-4,2l3,6l-12,9l-11,-2l-3,-7l-7,2l-10,-4zM268,85h4v4zM171,82l8,-4l-1,-3l11,-2l3,13l-9,5z"
            />
            <path
              fill="var(--map-land-4, #b59ae1)"
              d="M202,62l11,-4l7,3l-10,4zM232,68l7,-1l8,6h-13zM216,74l6,-1l-5,5zM163,95l3,-2l3,5zM92,97l5,-2l-1,4zM163,89l11,-15l4,1zM227,62l22,-7l18,6l-7,7l-11,1l-10,-5l-7,4l1,-5zM219,77l6,-4l4,7zM216,95l3,-3l4,5zM282,96l6,1l-4,2zM272,89l6,-7l3,6l-4,4l2,8zM200,132l5,-4l4,4l-8,5zM203,58l5,-4l5,3zM106,160l7,-27l4,-1l4,5l5,-1l-4,5l1,6l-8,4l-3,11zM240,76l15,-3l-10,7h-4z"
            />
            <path
              fill="var(--map-land-5, #bfd574)"
              d="M174,53l3,-2l4,8l-6,1l2,-2zM196,139l14,-7l3,5l-5,6l-8,2zM99,115l6,-5l5,3l-4,5l5,5l-1,5zM304,70l7,-2l-4,4zM163,89l8,-6l4,2l-1,10l-11,-1zM213,124l1,-5l1,8zM189,80l3,-3l13,1v12l-15,-5zM275,105l8,5l3,6zM299,113l6,-5l-5,2l3,4zM289,109l8,-3l2,3l-4,5zM311,111l10,2v6zM248,86l10,-11l5,7h14l-4,6l-5,-4l1,4l-9,6l-2,8l-5,-14zM213,102l5,-7l10,7l-9,5zM193,96l2,-9l9,4l-1,8l-5,3h-3zM174,100l5,-5l3,3zM106,118l4,-10l10,-3l1,4l8,-3l-1,6l12,1l5,4l-6,15l-7,3l-5,9l-5,-4l4,-4l-4,-10zM181,100l3,-2l-1,6z"
            />
          </g>
        </defs>
        <circle cx="110" cy="110" r="90" fill="var(--map-ocean, #234d69)" />
        <g clipPath="url(#ambit-loading-clip)">
          <g className="ambit-loading-map" transform="translate(-90)">
            <use href="#ambit-loading-land" />
          </g>
        </g>
      </svg>
      <img className="ambit-loading-title" src="/ambitlogo.png" alt="ambit" />
      <span className="ambit-loading-copy">
        Loading your world<span className="ambit-loading-dots">…</span>
      </span>
    </div>,
    document.body,
  );
}
