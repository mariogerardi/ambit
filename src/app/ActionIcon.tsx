const paths = {
  paint:
    "m14 4 6 6M4 20c0-4 1-6 4-6l2 2c0 3-2 4-6 4Zm4-6L18 3a2 2 0 0 1 3 3L10 16",
  erase:
    "m4 13 9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-9 9H8l-4-4a3 3 0 0 1 0-4Zm5-5 8 8M12 21h10",
  undo: "M4 8a8 8 0 1 1 0 8M4 3v5h5",

  assist:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 5l4 4m6 6 4 4M19 5l-4 4m-6 6-4 4",
  hint: "M9 18h6M10 21h4M9 15c0-2-3-3-3-7a6 6 0 1 1 12 0c0 4-3 5-3 7H9Z",
  home: "m3 10 9-7 9 7M5 9v11h5v-7h4v7h5V9",
  study: "M12 5v15M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Z",
  repeat: "M20 8a8 8 0 1 0 0 8M20 3v5h-5",
  custom: "M4 7h16M4 17h16M8 4v6M16 14v6",
  review: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm5 11 5 5",
  explore: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 5-3 7-7 3 3-7 7-3Z",
  journey:
    "M5 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10M3 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm14 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  archive:
    "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 3h3",
};

export function ActionIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
