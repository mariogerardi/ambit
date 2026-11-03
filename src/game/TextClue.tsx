import type { Question } from "./questionContracts";

/** Shared native-script presentation; no translation or language-name DOM before reveal. */
export function TextClue({
  clue,
  revealed,
}: {
  clue: NonNullable<Question["textClue"]>;
  revealed: boolean;
}) {
  return (
    <figure className="journey-text-clue">
      <blockquote lang={clue.lang} dir={clue.dir ?? "auto"}>
        {clue.text}
      </blockquote>
      {revealed && (
        <figcaption lang="en" dir="ltr">
          <strong>{clue.reveal.language}</strong>
          <em>{clue.reveal.translation}</em>
        </figcaption>
      )}
    </figure>
  );
}
