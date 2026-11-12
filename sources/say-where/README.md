# Say Where? — research handoff (2026-11-11)

Two **linked research datasets** for the proposed **Say Where?** Ambit minigame. This is **research input, not a game-ready answer key**. Codex should preserve the source fields and unresolved decisions, not silently treat flagged claims as resolved.

- `say-where-languages.json`: **17 languages**, their standard codes and sample varieties, plus **42 country-by-country status claims** with legal/official sources and notes.
- `say-where-expressions.json`: **51 expressions**, three per language, linked by `language_id`. Each has the exact source-attested native text, English gloss, language tag, direction, source, type, ambiguity notes and review status.

## Proposed gameplay

The player sees **only the native-language expression** and selects **any one country** where that language qualifies under the game's official-language rule. Don't show language names, the translations, country lists, country names or source labels until after submission. A correct response is **any one qualifying country**, not only a designated example. The reveal can show all other qualifying countries, expression meaning, and why specific legal statuses count.

## Suggested status rule — requires editorial sign-off

Working list uses sovereign ISO 3166-1 alpha-3 states (including Vatican City State) where the language has **nationwide official, state, federal/union-official, or constitutionally designated official administrative status**. Country-level co-officiality with territorially regulated use (Belgium), officially permitted institutional use (Kazakhstan), and constitutionally declared national language without explicit official-language wording (Vietnam) are included as **candidates requiring an explicit ruling**. The phrase “qualifying_country_codes” currently means *research candidates under this working rule*, **not** a locked production answer key.

Regional-only official languages in otherwise nonqualifying countries do not count. Widespread spoken use alone does not count. Constituent territories like Aruba, Curaçao, Sint Maarten and Macau require a separate country-model policy; they are excluded from this sovereign-state pilot.

**Important modern change:** Kazakhstan adopted a **new constitution effective July 1, 2026**. The relevant Russian-language provision is **Article 9(2)**, not Article 7(2) of the superseded constitution. That 2026 source is used in the Russian record. Source: https://www.gov.kz/article/232335?lang=en

## Specific decisions before implementation

1. **Country membership:** Does Kazakhstan’s nationwide official administrative use of Russian count? Does Dutch in Belgian language regions qualify as national co-officiality? Does Vietnamese constitutionally specified *national language* qualify? Does Vatican City State usefully map to an in-game selectable country? These are flagged at record level.
2. **Varieties:** Iranian Farsi versus Afghan Dari/Tajik; Hindi versus Fiji Hindi; Malay versus standardized Indonesian; European Portuguese versus other national varieties. Do not automatically merge distinct varieties or expand country codes.
3. **Shared expressions:** Especially Malay/Indonesian, also related Slavic/Romance and other language pairs. If a displayed expression is authentic in more than one sampled language, **either** explicitly allow the union of independently supported valid countries **or** replace the expression. Don't make linguistically valid guesses wrong just because of internal `language_id`.
4. **Expression quality:** Expressions come from Omniglot's curated, contributed **phrase collections**. These are evidence of attested usage, **not independent folkloric/proverb authentication**, and the data deliberately marks no item as a proverb. The starter set uses greetings, wishes, idioms and ordinary sentences. Before shipping, have a native/fluent reader check text, punctuation, register, variety and naturalness; replace generic or ambiguous items with source-attested, more distinctive expressions where practical.
5. **Fairness:** No expression contains an explicit country name/demonym. Yet some terms, scripts and formulaic phrases are instantly identifiable or ambiguous; calibrate difficulty and don't assume script alone establishes one country's language.
6. **Globe UX:** Verify the game's selectable country IDs match these ISO 3166-1 alpha-3 codes. Microstates and very small countries may require special selection/accessibility handling. Treat feedback/reveal as content separate from grading.

## Technical structure

Language record: `id`, `language_name`, `iso_639_1`, `iso_639_3`, `sample_language_tag`, `sample_variety_or_standard`, `script`, `direction`, `qualifying_country_codes`, `status_checked_on`, `country_evidence[]`, `notes[]`, `pending_decisions[]`, `review_status`.

Each `country_evidence` contains `country_code`, `legal_category`, `evidence`, `source{title,url}`, and `needs_editorial_decision`.

Expression record: `id`, `language_id`, `native_text`, `english_translation`, `language_tag`, `direction`, `expression_type` (`common_saying` or `ordinary_sentence`; none are asserted as traditional proverbs), `authenticity_source{title,url}`, `source_checked_on`, `source_type`, `notes_or_ambiguity`, `contains_explicit_country_or_demonym`, `native_speaker_reviewed`, `publication_status`.

All native strings are UTF-8 and NFC-normalized. Preserve Unicode characters, including right-to-left presentation for Persian, Georgian/Tamil scripts, and Māori macrons.

## Handing off to Codex

**Suggested request:**

> These are research datasets for the *Say Where?* minigame. Read the README and both JSON files. Treat them as candidates, not production approval. First identify the minimal integration path with Ambit's existing globe selection and scoring; report decision points involving official-status boundaries, language varieties, shared expressions, country IDs and UX. Do not invent additional expressions, treat phrases as proverbs, silently change source text, or resolve flagged status questions without asking. Use the title **Say Where?**.

Research URLs and classification details are embedded **in each record**, so Codex need not infer evidence from this README. Source checks occurred on November 11, 2026. This is a sourced starter, not legal advice or a linguistic certification.
