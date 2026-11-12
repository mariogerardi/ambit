import type { Question } from "./questionContracts";

/** Shared native-script presentation; no translation or language-name DOM before reveal. */
export function TextClue({
  clue,
  revealed,
  translationFirst = false,
}: {
  clue: NonNullable<Question["textClue"]>;
  revealed: boolean;
  translationFirst?: boolean;
}) {
  return (
    <figure
      className={`journey-text-clue${translationFirst ? " journey-text-clue-translation-first" : ""}`}
    >
      {revealed && translationFirst && (
        <figcaption lang="en" dir="ltr">
          <em>{clue.reveal.translation}</em>
        </figcaption>
      )}
      <blockquote lang={clue.lang} dir={clue.dir ?? "auto"}>
        {clue.text}
      </blockquote>
      {revealed &&
        (translationFirst ? (
          <p className="journey-text-clue-language" lang="en" dir="ltr">
            {clue.reveal.language}
          </p>
        ) : (
          <figcaption lang="en" dir="ltr">
            <strong>{clue.reveal.language}</strong>
            <em>{clue.reveal.translation}</em>
          </figcaption>
        ))}
    </figure>
  );
}
