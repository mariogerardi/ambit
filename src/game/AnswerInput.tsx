import type { InputHTMLAttributes } from "react";

/** Quiz responses are search-like text, never contact or address fields. */
export function AnswerInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="search"
      role="textbox"
      name="quiz-response"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
    />
  );
}
