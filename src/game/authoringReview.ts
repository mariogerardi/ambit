import type { Question, QuestionContext } from "./questionContracts";
import { correctAnswerCopy, correctAnswerSummary } from "./copy";
import { explanation, questionPrompt } from "./questionText";
import { solutionIds } from "./questionPreparation";
import { answerPlace } from "./answerTargets";
import { initialGame } from "./state";

const normalize = (text: string) =>
  text
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Editorial suggestions, never grading failures or factual certification. */
export function reviewQuestionCopy(
  question: Question,
  context: QuestionContext,
) {
  const answer = correctAnswerSummary(question, context, initialGame).value;
  const heading = correctAnswerCopy(question);
  const reveal = explanation(question, context, [], true);
  const prompt = questionPrompt(question, context);
  const names = solutionIds(question, context)
    .flatMap((id) => [
      context.names.get(id),
      answerPlace(question, id)?.name,
      question.choices?.find((choice) => choice.id === id)?.label,
    ])
    .filter((name): name is string => !!name);
  const answers = new Set([answer, ...names].map(normalize));
  const warnings: string[] = [];
  if (answers.has(normalize(heading)))
    warnings.push(
      "[answer-heading] Feedback repeats the answer. Use a brief reaction to the player's result.",
    );
  if (!reveal.trim())
    warnings.push(
      "[missing-reveal] Add the geographic or historical insight learned after answering.",
    );
  else if (
    answers.has(normalize(reveal).replace(/^(it was|the answer is) /, ""))
  )
    warnings.push(
      "[answer-only-reveal] The reveal only identifies the answer. Explain why it matters.",
    );
  const words = (text: string) =>
    new Set(
      normalize(text)
        .split(" ")
        .filter((word) => word.length > 3),
    );
  const before = words(`${question.leadIn ?? ""} ${prompt}`);
  const after = words(reveal);
  const fresh = [...after].filter((word) => !before.has(word));
  if (after.size >= 8 && fresh.length < 3)
    warnings.push(
      "[repeated-clue] The reveal adds little wording beyond the clue. Check that it teaches something new.",
    );
  if (heading.split(/\s+/).length > 4)
    warnings.push(
      "[long-feedback] Keep the result heading to one to four words; put the explanation below it.",
    );
  if (question.rule.type === "pin-distance") {
    const target = answerPlace(question, question.rule.targetId);
    if (
      target?.kind === "capital" &&
      !/capital/i.test(prompt) &&
      !normalize(prompt).includes(normalize(target.name))
    )
      warnings.push(
        `[capital-target] Distance is scored from ${target.name}. Confirm that the prompt asks for this capital.`,
      );
  }
  return {
    before: {
      expression: question.textClue?.text,
      leadIn: question.leadIn ?? "",
      prompt,
      instruction: question.instruction,
    },
    after: {
      heading,
      answer,
      explanation: reveal,
      language: question.textClue?.reveal.language,
      translation: question.textClue?.reveal.translation,
    },
    warnings,
  };
}

export function supportsPartialPreview(question: Question) {
  return (
    question.partialCredit === "one-of-two" ||
    (question.rule.type === "pin-distance" &&
      (question.rule.tiers?.length ?? 0) > 1)
  );
}
