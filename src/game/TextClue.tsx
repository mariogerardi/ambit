import type { Question } from "./questionContracts";

/** Shared native-script presentation; no translation or language-name DOM before reveal. */
export function TextClue({
  clue,
  revealed,
  languageFirst = false,
  meaning,
}: {
  clue: NonNullable<Question["textClue"]>;
  revealed: boolean;
  languageFirst?: boolean;
  meaning?: string;
}) {
  return (
    <figure className="journey-text-clue">
      {revealed && languageFirst && (
        <figcaption lang="en" dir="ltr">
          <strong>{clue.reveal.language}</strong>
        </figcaption>
      )}
      <blockquote lang={clue.lang} dir={clue.dir ?? "auto"}>
        {clue.text}
      </blockquote>
      {revealed &&
        (languageFirst ? (
          <p className="journey-text-clue-translation" lang="en" dir="ltr">
            <em>{clue.reveal.translation}</em>
          </p>
        ) : (
          <figcaption lang="en" dir="ltr">
            <strong>{clue.reveal.language}</strong>
            {meaning ? (
              <dl className="journey-text-clue-translations">
                <div>
                  <dt>Literal translation</dt>
                  <dd>
                    <em>{clue.reveal.translation}</em>
                  </dd>
                </div>
                <div>
                  <dt>Meaning</dt>
                  <dd>{meaning}</dd>
                </div>
              </dl>
            ) : (
              <em>{clue.reveal.translation}</em>
            )}
          </figcaption>
        ))}
    </figure>
  );
}
