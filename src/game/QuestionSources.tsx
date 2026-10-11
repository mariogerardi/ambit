import type { Question } from "./questions";

export function QuestionSources({ question }: { question: Question }) {
  return (
    <>
      {question.qualification && <p>{question.qualification}</p>}
      {[
        ...new Map(
          [question.source, ...(question.sources ?? [])]
            .filter((s) => s.name.trim() || s.url)
            .map((s) => [`${s.url}:${s.name}`, s]),
        ).values(),
      ].map((source) =>
        /^https?:\/\//i.test(source.url) ? (
          <a
            key={`${source.url}:${source.name}`}
            className="fact-source"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.name.replace(/ · pinned /, " · ")} ↗
          </a>
        ) : (
          <span key={`${source.url}:${source.name}`} className="fact-source">
            {source.name}
          </span>
        ),
      )}
      {(question.importedRegions ?? [])
        .filter((r) => r.attribution)
        .map((r) => (
          <p className="fact-source" key={r.id}>
            {r.name} · {r.attribution}
            {r.sourceUrl && /^https?:\/\//i.test(r.sourceUrl) && (
              <>
                {" "}
                ·{" "}
                <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                  Source ↗
                </a>
              </>
            )}
          </p>
        ))}
    </>
  );
}
