# Say Where? — expanded idioms/proverbs research handoff

**Edition:** 2026-11-11, v2. **Title:** Say Where?

This replaces the previous 51 phrasebook-like expressions with **108 attested idioms, sayings, proverbs and whakataukī across 27 languages (four per language)**. Ten language records have been added, bringing the language coverage from 17 to 27. The 17 preexisting language/legal-status records are retained, not silently rewritten. **All items are editorial research candidates; none is approved for unattended production.**

## Files

- `say-where-languages.json` — 27 language records with codes, selected variety, candidate ISO alpha-3 answer countries, per-country legal evidence and issues needing review. Ten records are newly researched.
- `say-where-expressions.json` — 108 new researched expression records; every record has native-script text, precise source, a literal English gloss **and** natural meaning, type, language link, direction, varieties, caveats and publication status.
- `EDITORIAL_PREVIEW.md` — 16 colorful examples to help choose an editorial tone.

## Intended gameplay

Player sees **only the native expression**; not the language, literal meaning, English sense, author/source label or country list. Player selects *any* country in which the language qualifies under a previously approved national official-status policy. Reveal can show the language, literal image, actual meaning, and all valid countries. The player's task is to identify the language's geography, not translate the saying.

## Changes in selection policy

1. **No generic greetings or ordinary sentences.** All 108 candidates have a named expression type (idiom, saying, proverb, historical saying or Māori whakataukī). Do not call newly written text a traditional proverb.
2. **Memorable, authentic expressions.** Favorite material uses vivid imagery (an owl and the moon, moon in a lap, elephants, monkeys, mouse-deer and shrimp sandwiches, etc.). Each item links to a source documenting its wording. Expression source is separate from language official-status evidence.
3. **Two reveal fields.** `literal_english` = word/image gloss; `english_translation` = communicative meaning. Both are reveal-only. Translations here are research glosses, not certified translations.
4. **Variety and fairness.** Source attestation does *not* prove exclusivity to a single national standard. Malay/Indonesian, Russian/related Slavic languages, Farsi/Dari/Tajik, cognate Germanic and cross-cultural common proverbs require review. Favor specific but not stereotyped material. Do not infer a country just from a motif; many proverbs travel.
5. **Legal status.** The original 17 legal datasets carry forward. New multi-state records (particularly French, Spanish and German) are **candidate pools**, not adjudicated full answer keys. French changes in Mali, Burkina Faso and Niger are reflected (working rather than official language). Spanish is especially sensitive: Argentina, Chile, Mexico and Uruguay lack explicit official-language statements in their constitutions in the cited overview. Swedish is a public *principal language* under its 2009 law. Distinguish co-official, administrative, national/principal, de facto and regional-only status. Verify each country independently with current primary law **before** production. Never silently penalize a valid alternative.
6. **Editorial checks.** Native/fluent review is still needed for wording, region, register, diacritics, and meanings. The older Romanian typo was replaced with an attested proverb. The Czech country-name leak was removed. Any record with `publication_status` starting `blocked_` is prohibited from use until revised and re-sourced. Other `research_candidate`s are also **not** production-authorized.
7. **Review artwork/cultural context.** Māori whakataukī deserve contextual presentation; do not imply they're casual jokes merely to satisfy 'quirky.' Some snippets have gendered or old-fashioned grammar and sources are not always governmental.

## Known structural decisions for Codex

- Match `language_id` to language `id` and ISO `qualifying_country_codes` to Ambit's real country IDs. Do not infer `wurl:` prefix without inspection.
- Preserve one-source-per-expression links and separate country-specific legal sources. Some languages have source collections with multiple examples; always verify the exact native wording against the linked page before shipping.
- The current country arrays are **candidate lists**. Do not ship automatic grading for a newly added language until official-status coverage is exhaustive under the selected policy, including alternative correct answers.
- When an expression is also natural in another language (especially Malay/Indonesian), either independently document the additional valid countries and accept them, or replace that expression. `language_id` on its own is insufficient to rule out alternatives.
- Do not add extra UI controls: one globe selection per prompt, immediate reveal after commitment; no in-play translation or language-name label.
- The Malay bamboo saying already used in the prior five-stop Journey is intentionally not repeated here.

## Hand-off request

> Here is an expanded research collection for **Say Where?**. Read this README and the two linked JSON files. Reuse the existing country-selection engine. The new expression set **replaces** the former 51 phrasebook-style entries; it has 108 source-linked sayings across 27 languages. Use the literal gloss and natural meaning only in answer feedback. Before changing gameplay, identify country-status decisions, cross-language ambiguity, source typos and language-variety pitfalls; don't invent expressions or assume country pools are approved. Do focused checks only, and ask for decisions you cannot justify from primary evidence.

Sources are recorded inline in each dataset record. The editorial preview is for review and should not be bundled into the production app. 
