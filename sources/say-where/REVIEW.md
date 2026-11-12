# Say Where? research integration review

Reviewed November 11, 2026 on `feat/say-where`, following `58e8107`. The user
requested all **27 languages and 108 expressions**, with supplied country lists
as starting answer sets and targeted verification of genuine status uncertainty.
Attached authoring instructions are reference material; the user's requests govern.

The four expanded ZIP files are preserved byte-for-byte. `metadata.json` records
hashes and the earlier archive/repository revision. All expressions retain their
original research and native-review flags. The import confirms unique IDs, valid
language links, NFC-native text and canonical globe IDs. All 108 are included;
this does not certify native review or independently verify every attribution.
Literal gloss and intended meaning remain distinct in the UI.

## Settled eligibility decisions

National official/co-official status or explicitly authorized national government
use qualifies. National recognition alone needs legislation establishing government
use; widespread speech alone does not count. Preserve Vietnamese through Vietnam's
legal-document mandate, Russian in Kazakhstan under its 2026 Constitution,
territorially regulated Belgian national co-officiality, Hindi in India and Fiji,
and the disclosed broad Persian/Farsi/Dari/Tajik set of Iran, Afghanistan and
Tajikistan. Vatican City remains eligible for Italian working use. Sources for
these settled cases remain attached in `src/minigames/sayWhere.ts`.

V1 holds concerned different phrasebook text under reused IDs and do not block
new sayings. Old “Lama tidak bertemu” and “Selamat makan” source links are not
reused as evidence of different v2 wording.

## Expanded status resolutions

[eligibility-review.json](eligibility-review.json) records exact additions,
player-facing qualifications and authoritative sources, separately from raw data.

- **French:** retain the 26 supplied countries. Add Mali (Constitution Article 31),
  Burkina Faso (revised Constitution Article 35) and Niger (2025 Charter Article 12)
  through legally designated working-language use. This satisfies the existing
  government-use rule without relabelling French as officially national there.
  Add Mauritius through [Constitution Section 49](https://mauritiusassembly.govmu.org/mauritiusassembly/wp-content/uploads/2024/11/The-Constitution-Long-Upload-on-website-modify-on-28.01.22-06.04.22-.pdf),
  expressly authorizing French in the National Assembly. Result: 30 countries.
  Luxembourg's statutory administrative/judicial use also qualifies. Neither OIF
  membership nor widespread use automatically adds a country.
- **Spanish:** retain Argentina, Chile, Mexico and Uruguay. Argentina's procedure
  code Article 115 prescribes the national language; read together with the
  Presidency's identification of Spanish, it supports government use. This does
  not claim Article 115 explicitly names Spanish. Chile's official ORD. 881 (2024)
  explains Spanish requirements for public documents. Mexico's Linguistic Rights
  Act Articles 4 and 7 combine national recognition with public-procedure validity.
  Uruguay's General Procedure Code Article 65 prescribes Castilian in proceedings.
  Flagged Paraguay and Equatorial Guinea explicitly recognize Spanish in their
  constitutional Articles 140 and 4. No de-facto-only exception is introduced.
- **German:** Luxembourg's government confirms statutory administrative and court
  use. Belgium's government confirms three official languages; territorial
  regulation is consistent with the settled Dutch decision. Regional-only German
  in Italy is not included.
- **Swedish:** Section 10 of the Language Act prescribes Swedish for courts,
  administrative authorities and other public bodies, beyond Section 4's
  principal-language designation. Sweden qualifies; Finland remains included.
- **Czech:** the Czech Financial Analytical Office quotes Administrative Procedure
  Code Section 16, prescribing Czech communication/documents. Explicit
  constitutional official-language wording is unnecessary under our policy.

The French overview was inspected as the starting roster, not used as a
constitution. Cervantes redirected to maintenance; the national authorities in
the JSON resolve the flagged Spanish cases instead. Direct retrieval of Burkina
Faso's consolidated government PDF timed out; its indexed official text and the
[Presidency's constitutional-revision account](https://www.presidencedufaso.bf/wp-content/uploads/2024/01/CONSEIL-DES-MINISTRES-N%C2%B0038-DU-06-DECEMBRE-2023.pdf)
support working-language status. No independent audit of every unchanged supplied
country source is claimed. No checked national-status case remains on hold.

## Shared sayings and remaining uncertainty

Five new expressions accept Malaysia, Brunei, Singapore and Indonesia, based on
new evidence of related forms, not old phrasebook-ID exceptions:

- `sw-id-01`: [DBP pungguk entry](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=pungguk+I).
- `sw-id-02`: [DBP kuman/gajah entry](https://prpm.dbp.gov.my/Cari1?d=82736&keyword=seberang).
- `sw-id-03`: [DBP rotan/akar explanation](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=berguna).
- `sw-id-04`: [National Library of Malaysia's Malay usage](https://www.pnm.gov.my/pnm/resources/pdf%20file/SP32021.pdf).
- `sw-ms-02`: [Indonesian linguistic research on gajah/pelanduk](https://download.garuda.kemdikbud.go.id/article.php?article=2578000&title=Leksikon+Nama+Binatang+Dalam+Peribahasa+Indonesia+dan+Relevansinya+Bagi+Pengetahuan+Kosakata+Pemelajar+BIPA+A1&val=24174).

Unresolved: Indonesian applicability of the exact Malay forms in `sw-ms-01`,
`sw-ms-03` and `sw-ms-04`. They retain the supplied Malay answer set rather than
an unsupported expansion. Georgian figurative glosses and other supplied native,
variety and orthographic caveats remain unverified. All entries are included as
requested; attribution or related-language intelligibility does not resolve those
linguistic questions. Source audio, imagery and page layouts are not copied.
