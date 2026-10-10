export function StudyBack({
  label,
  onClick,
}: {
  label: string;
  onClick(): void;
}) {
  return (
    <button
      className="quiet-button tertiary-action study-back"
      aria-label={label}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m14 6-6 6 6 6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
