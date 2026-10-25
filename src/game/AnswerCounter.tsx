export function AnswerCounter({
  value,
  onChange,
  id = "written-answer",
}: {
  id?: string;
  value: string;
  onChange(value: string): void;
}) {
  const number = Number(value);
  const hasNumber = value.trim() !== "" && Number.isFinite(number);
  const change = (direction: number) => {
    const current = hasNumber ? Math.max(0, Math.trunc(number)) : 0;
    onChange(String(Math.max(0, current + direction)));
  };
  return (
    <div className="answer-counter">
      <button
        type="button"
        aria-label="Decrease answer"
        disabled={!hasNumber || number <= 0}
        onClick={() => change(-1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        placeholder="—"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label="Increase answer"
        onClick={() => change(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
