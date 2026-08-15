# FEEL evaluation fix: `HvA_full_dmn_export.dmn`

**Changelog:** see [`CHANGELOG.md`](CHANGELOG.md) — consolidated across this doc, the
CPRMV spec-proposal doc, and the cell-level-linking prototype doc, so the full history
since the first commit of this DMN is in one place.

## Symptom

`HvA_full_dmn_export.dmn` deploys to Operaton cleanly (structurally valid DMN 1.3 XML,
confirmed by `fix: Operaton deploy blockers in Amsterdam HvA DMN export`, commit
`e7de109`) — but none of its 25 decisions can actually be **evaluated**. Every decision
throws at runtime, before any business logic runs.

This surfaced while adding `test-cases.json`-style test cases for this DMN (see
`examples/organizations/toeslagen/test-cases.json` and
`examples/organizations/flevoland/thuisbatterij/testCases/` for the format this project
uses). Attempting to evaluate the simplest possible case — a single boolean leaf decision,
no dependencies — failed immediately.

## Root cause 1: multi-word FEEL names aren't supported by Operaton's engine

iKnow's export convention declares every `<dmn:inputData>` with a **name containing
spaces**, following a `<subject>.<long descriptive property>` pattern, e.g.:

```xml
<dmn:inputData id="_ad4e19ea-89c4-11f1-9823-4bb64cf76dfb" name="natuurlijke persoon.geboortedatum">
```

Every decision table's `<dmn:inputExpression><dmn:text>` then references that name
**verbatim, unquoted**, as a bare FEEL expression:

```xml
<dmn:text>natuurlijke persoon.een schuldregeling van een door de gemeente aangewezen of gemandateerde</dmn:text>
```

The DMN 1.3 spec's FEEL grammar technically permits names with embedded spaces. This
project's own DMN validator (`linked-data-explorer/packages/backend/src/services/dmn-validation.service.ts`)
already special-cases this exact convention — see
`individuele-inkomenstoeslag-iknow-deploy-fix.md`'s "INT-007" fix, which treats a
whole-string match against a declared name as valid so it doesn't get flagged as an
unresolved variable. That fix is correct as far as it goes, but it is a **design-time**
check. It doesn't verify the expression actually evaluates.

Operaton's real FEEL engine (`feel-scala`) does not implement the spec's
name-with-embedded-spaces grammar for these bare-expression positions. Empirically
confirmed against the local Operaton instance (`http://localhost:8081/engine-rest`,
container `ronl-operaton`) on three independent, already-deployed decisions —
`Beslistabel bepalen aanspraak op bijzondere bijstand`,
`Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen`, and
`Beslistabel bepalen schuldregeling` — all three throw the identical error shape:

```
FeelException: FEEL/SCALA-01008 Error while evaluating expression: failed to parse
expression 'natuurlijke persoon.een schuldregeling van een door de gemeente aangewezen
of gemandateerde': Expected (binaryComparison | between | instanceOf | in | "and" | "or"
| end-of-input):1:13, found "persoon.ee"
```

The parser consumes exactly the first word (`natuurlijke`), then expects the expression
to end or continue with an operator — and errors on the next word. This is not about the
`.` (context-navigation) character; the parser stops at the **first space**, regardless
of whether a dot follows. 44 of this DMN's input expressions use this convention; all of
them are affected.

**A related sub-defect, same root cause:** two of the DMN 1.3 built-in date/time
functions used here are themselves multi-word names — `years and months duration(...)` —
and this file additionally wraps that call incorrectly:

```
years(years and months duration(natuurlijke persoon.geboortedatum, peildatum))
```

`years and months duration(...)` (the built-in itself) is fine — feel-scala does
recognise known multi-word _built-in function names_ even though it can't parse
arbitrary multi-word _declared names_. The problem is the outer `years(...)` — that's
not how you extract the years component of a computed duration in FEEL; the correct form
is property access, `(...).years`. `years(` gets parsed as a call to an unknown
single-word name `years`, which fails identically to the multi-word-name case:

```
failed to parse expression 'years(years and months duration(...))': Expected (...):1:6,
found "(years and"
```

Same pattern for `year(peildatum)` (5 further decisions): `year` isn't a callable
built-in either — `peildatum.year` is the correct FEEL.

## Root cause 2: rule cells embed cross-decision references as literal label text

This is a second, independent defect discovered while scoping the fix for root cause 1
— renaming declared names alone is not sufficient.

Composite decisions reference _other decisions'_ computed results directly inside rule
**cells**, not just in input headers. Example, from `Beslistabel bepalen aanspraak op
een stadspas`:

```xml
<dmn:inputEntry><dmn:text>&lt;= van toepassing zijnde loongrens vorig jaar voor volwassenen</dmn:text></dmn:inputEntry>
<dmn:inputEntry><dmn:text>&lt;= van toepassing zijnde vermogensgrens</dmn:text></dmn:inputEntry>
```

Both are literal, bare references to the _output label_ of another decision
(`Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen` and `Bepalen van
toepassing zijnde vermogensgrens` respectively). For this to resolve at evaluation time,
the producing decision needs its result bound to that exact name — but **none of the 25
decisions declare an explicit `<dmn:variable>`** on themselves. Per the DMN 1.3 spec, a
decision without one has no defined external binding name other implementation-specific
defaults can be relied on; two known-good, already-Operaton-verified multi-decision DRD
files in this repo (`examples/organizations/toeslagen/resultaat_zorgtoeslag_operaton_compat.dmn`
and `examples/organizations/flevoland/thuisbatterij/RechtEnHoogteSubsidieThuisbatterij.dmn`)
both consistently give every decision that's referenced elsewhere an explicit
`<dmn:variable name="..." typeRef="..."/>` as its first child, immediately after the
opening `<dmn:decision>` tag and before `<dmn:informationRequirement>`. This DMN has
none.

**A genuine naming collision, found while resolving this:** three output labels are each
produced by _two different_ decisions:

| Shared label                                   | Producing decisions                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aanspraak op een Stadspas`                    | `Beslistabel bepalen aanspraak op een stadspas` (natuurlijke persoon) **and** `Beslistabel bepalen aanspraak Stadspas van kind van natuurlijke persoon` (kind) |
| `aanspraak op individuele inkomenstoeslag`     | `Beslistabel bepalen aanspraak op individuele inkomenstoeslag` (natuurlijke persoon) **and** `...partner` (partner)                                            |
| `aanspraak op tegemoetkoming identiteitskaart` | `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart` (natuurlijke persoon) **and** `...voor kind van natuurlijk persoon` (kind)                  |

`Bepalen aanspraken` (the DRD root) requires **both** decisions in the Stadspas pair
directly. If both were bound to the same flat name, one would silently shadow the other.
The disambiguation already exists in how callers reference them — the root's own inputs
use `natuurlijke persoon.aanspraak op een Stadspas` and `kind.aanspraak op een Stadspas`
as two distinct names — so each producing decision is bound to the subject-prefixed form
its callers actually use, resolved by decision-name semantics (the decision named
"...van kind van natuurlijke persoon" binds to the `kind.`-prefixed form; its unqualified
sibling binds to the `natuurlijke persoon.`-prefixed form).

## Root cause 3: a placeholder, not-actually-FEEL expression

Two decisions (`Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart`, and
its kind-equivalent) contain this literal input expression text:

```
not supported timespan in weeks(peildatum, natuurlijke persoon.einde geldigheid Nederlands paspoort of Nederlandse identiteitskaart )
```

This reads as iKnow's own converter giving up on translating a "weeks between two dates"
concept into FEEL, and emitting a descriptive placeholder string instead of real syntax.
It was never valid FEEL — this is not something Operaton ever could have parsed,
independent of the multi-word-name issue. The rule cells that consume it (`<= 8`) make
the intended semantics clear: weeks remaining between `peildatum` and the identity-card
expiry date. Standard FEEL date subtraction yields a days-and-time duration with a
`.days` property, so the fix is:

```
(<expiry date> - peildatum).days / 7
```

## Root cause 4: `berekeningsjaar-1` — unbound variable (previously documented)

`Bepalen van toepassing zijnde vermogensgrens` has an input column whose entire
expression is `berekeningsjaar-1`. `berekeningsjaar` is never declared as an `<inputData>`
and no decision exposes it as an output — this was already flagged as open issue #2 in
`individuele-inkomenstoeslag-iknow-deploy-fix.md`. Every sibling "loongrens"/"vermogensgrens"
decision derives the same value locally as `year(peildatum)` (now `peildatum.year`), so
the fix applied here is consistent with that pattern: `berekeningsjaar-1` →
`peildatum.year - 1`. This removes the dependency on an externally-supplied variable that
was never part of the DRD's actual input contract.

## The fix

`HvA_full_dmn_export-patched.dmn` is a copy of the original with:

1. **Every multi-word `<dmn:inputData name="...">` (and its nested `<dmn:variable
name="...">`) flattened to a single-token camelCase identifier**, generated
   deterministically from the declared name (subject prefix `np`/`kind`/`partner`/`am` +
   camelCased significant words, Dutch stopwords dropped). 52 inputData names renamed.
2. **Every bare-name reference inside every `<dmn:text>` block — input headers and rule
   cells alike — rewritten to the matching flat token**, using the same generator applied
   to how each decision's result is _actually referenced_ by its callers (resolving the
   3-way ambiguity above by subject prefix, not by the decision's own unprefixed output
   label). 25 decision-result tokens, all distinct from the 52 inputData tokens and from
   each other.
3. **An explicit `<dmn:variable name="<token>" typeRef="<output typeRef>"/>` added to all
   25 decisions**, positioned as the first child (before any `<dmn:informationRequirement>`),
   matching the structure of the two known-good reference files above.
4. **`years(years and months duration(A, B))` → `(years and months duration(A, B)).years`**
   — 6 occurrences.
5. **`year(peildatum)` → `peildatum.year`** — 5 occurrences.
6. **`not supported timespan in weeks(peildatum, X)` → `(X - peildatum).days / 7`** — 2
   occurrences.
7. **`berekeningsjaar-1` → `peildatum.year - 1`** — 1 occurrence.
8. **A `name="<token>"` attribute added to all 25 `<dmn:output>` elements**, alongside
   their existing `label`. See "Root cause 5" below — this was found while investigating
   why the patched file still couldn't be evaluated after everything above.
9. **`not -` → `false`** (44 occurrences, always on `boolean` columns) and
   **`not(null) -` → `not(null)`** (12 occurrences, always on `string` columns). See
   "Root cause 6" below.
10. **`>= 21 and < pensioengerechtigdeLeeftijd` → `[21..pensioengerechtigdeLeeftijd)`**
    (6 occurrences) and **`>= 10 and <= 12` → `[10..12]`** (1 occurrence) — bare
    `and`-joined comparisons aren't valid unary-test syntax; interval notation is.
11. **`not "met partner"` → `not("met partner")`** (2 occurrences) — the same missing-
    parentheses problem as item 9, on a string literal instead of `-`/`null`.
12. **`hitPolicy="FIRST"` added to 2 decisions** whose `<dmn:decisionTable>` had no
    `hitPolicy` attribute (defaulting to `UNIQUE`), despite having a wildcard default
    rule — invalid under `UNIQUE`, matches every sibling decision's convention. See
    "Root cause 8" below.

See "Root cause 7" below for 10–11.

No rule _content_, rule ordering, decision ids, or the DRD's
`informationRequirement`/`authorityRequirement` wiring were changed — item 12 is the one
structural exception, adding a missing `hitPolicy` attribute (not editing any rule). The
original `HvA_full_dmn_export.dmn` is left untouched — same precedent as
`individuele inkomenstoeslag-iknow-patched.dmn`.

## Root cause 5: `<dmn:output>` needs a `name`, not just a `label`

Found immediately after the fix above landed: every one of this DMN's 25 decision
tables declares its output with `label` only —

```xml
<dmn:output id="_output_16" label="een schuldregeling" typeRef="boolean" />
```

— and once root causes 1–4 were fixed, evaluating **any** decision whose input columns
all successfully resolve (i.e. no `FEEL/SCALA-01008` anywhere in that table) failed with
a second, independent, completely unlogged error:

```
HTTP 400 {"type":"InvalidRequestException","message":"","code":null}
```

No stack trace, no server-side log line at all — this is what made it hard to isolate.
Root-caused by bisection against the local Operaton instance: built minimal, fully
isolated single-decision reproductions (one had only `<dmn:output label="...">`, no
`name`), confirmed the failure on two independent decisions (`schuldregeling`,
`bijzondere bijstand`), then confirmed the known-good reference file
(`resultaat_zorgtoeslag_operaton_compat.dmn`) declares its outputs with `name` (e.g.
`<output id="o_eligible" name="eligible" typeRef="boolean" />`) — never `label` alone.
Adding `name="<token>"` to the failing decision's `<dmn:output>` (keeping the existing
`label` for readability) fixed it immediately, reproducibly, on both test decisions.

Operaton's result-serialization code needs `<dmn:output name="...">` to know what key to
publish the value under; without it, building the response throws — but only once a
decision table actually reaches a completed evaluation. Every decision in this file was
previously dying earlier, on `FEEL/SCALA-01008` (root cause 1), so this defect was never
triggered and never visible until that fix was in place.

## The correct REST variable typing for this DMN's date inputs

While confirming the fix, evaluate calls that passed dates as
`{"value": "2025-06-01", "type": "String"}` returned an empty result (no error, no
match) rather than a real value — the `.year`/`.years` property access silently resolves
to `null` against a string. The dates need to actually be passed as Operaton's `Date`
type, in its default format:

```json
{ "value": "2025-06-01T00:00:00.000+0200", "type": "Date" }
```

This matters for the test-cases work: `peildatum`, `geboortedatum`, and every other date
input in this DMN need `type: "Date"` in that exact format, not `type: "String"` as used
in `toeslagen`/`flevoland`'s test files (those DMNs never call `.year`/`.years` on their
date inputs directly, so the distinction never mattered there).

## Verification status

**Confirmed, live, against the local Operaton instance:**

- `HvA_full_dmn_export-patched.dmn` is well-formed XML, deploys cleanly (25 decision
  definitions), and every `<dmn:text>` block is free of the original multi-word-name
  pattern.
- Four independent leaf/near-leaf decisions evaluate to the **correct** value:
  `schuldregeling` (boolean, true-trigger rule), `Beslistabel bepalen natuurlijke persoon
is meerderjarig` (age 26 → `true`, exercising the `.years` fix), `Bepaal
pensioengerechtigde leeftijd` (2025 → `67`, exercising the `.year` fix), and `Bepalen
van toepassing zijnde vermogensgrens` (alleenstaand, 2025 → `7575`, exercising the
  `berekeningsjaar-1` fix).
- A composite decision three levels deep, `Beslistabel bepalen aanspraak op een
stadspas`, evaluates without error through its full `requiredDecision` chain
  (`vanToepassingZijndeLoongrensVorigJaarVolwassenen`,
  `vanToepassingZijndeVermogensgrens`) — confirming the `<dmn:variable>` bindings added
  for root cause 2 actually resolve cross-decision references correctly, not just
  structurally.
- **Full test suite**: 69 cases across all 25 decisions in the DRD — the 11 leaf
  decisions with MC/DC-style one-case-per-rule coverage, plus representative true/false
  integration coverage for the 13 composite decisions and the DRD root — every case run
  live against the deployed patched DMN with **zero errors**. See
  `testCases/test-cases-hva-full-dmn-export.json`, `testCases/test-cases-validation-hva.md`,
  and `testCases/test-cases-hva.sh` (a self-contained runner: deploys the patched DMN and
  evaluates every case). Building this suite is what surfaced root causes 7 and 8 below —
  writing real test data for `individuele inkomenstoeslag`, `PC-voorziening`, `regeling
tegemoetkoming meerkosten`, and `tegemoetkoming identiteitskaart voor kind` was what
  first exercised their broken cells.

## Root cause 6: `not -` / `not(null) -` — two more malformed rule-cell patterns

Surfaced immediately after root cause 5's fix, on `Beslistabel bepalen aanspraak op
bijzondere bijstand` — the first decision whose evaluation ever got far enough to reach
one of these cells:

```
FeelException: FEEL/SCALA-01008 ... failed to parse expression 'not -': Expected ("("
| binaryComparison | ... ): found "-"
```

`not` requires a parenthesized argument (`not(-)`/`not(null)`) — a bare `not -` doesn't
parse, full stop. It was masked by every earlier root cause for as long as they were
unfixed (the same way root cause 5 was masked by root cause 1), and didn't reproduce on
the `stadspas` composite-decision test above only because that particular input
combination's matching rule happened to fail (or match) before evaluation reached one of
these columns — `hitPolicy="FIRST"` evaluation appears to short-circuit per rule.

There are two distinct malformed patterns, and they turn out to be fully
**type-consistent** across all 56 occurrences file-wide, which resolves the ambiguity
flagged when this was first found:

| Pattern       | Occurrences | Column `typeRef` | Fix         |
| ------------- | ----------- | ---------------- | ----------- |
| `not -`       | 44          | always `boolean` | `false`     |
| `not(null) -` | 12          | always `string`  | `not(null)` |

- **`not(null) -`** (string columns, e.g. `burgerservicenummer`) reads as `not(null)`
  ("must have a value") with a stray trailing `-` — an export artifact, not intended
  content. Fix: drop the trailing `-`.
- **`not -`** (boolean columns only) reads as the negation of `true` — i.e. the column
  must be `false` — with the argument and trailing dash both mangled into a bare `-`.
  Confirmed against business logic, not just syntax: e.g. `bijzondere bijstand`'s
  `financiele draagkracht` ("financial capacity") column carries this pattern in every
  qualifying rule, and being _without_ financial capacity is the actual eligibility
  condition for that benefit — a real constraint, not a don't-care wildcard. Fix:
  `false`.

Both are now applied in `HvA_full_dmn_export-patched.dmn` (mechanical text replacement,
no other change). **Confirmed live**, with a clean true/false discrimination on
`bijzondere bijstand`: `financiele draagkracht=false` (alongside the rest of rule 1's
conditions) → `true`; the identical inputs with `financiele draagkracht=true` → `false`
— proving the column is now a real, enforced constraint rather than a parse failure or
an unconditional wildcard. The `not(null)` rewrite was confirmed to parse and evaluate
without error on both a `null` and a real string value.

## Root cause 7: `>= X and < Y` isn't a valid unary-test range, and neither is a bare `not "string"`

Found while writing the test suite: both `Beslistabel bepalen aanspraak op individuele
inkomenstoeslag` (natuurlijke persoon and partner variants) and `Beslistabel bepalen
aanspraak op PC-voorziening` have an age-range rule cell written as two comparisons
joined by `and`:

```
>= 21 and < pensioengerechtigdeLeeftijd
>= 10 and <= 12
```

Same failure shape as root cause 6 — this parses as a **unary test**, not a general FEEL
expression, and the unary-tests grammar doesn't support combining two comparisons with a
bare `and`:

```
failed to parse expression '>= 21 and < pensioengerechtigdeLeeftijd': Expected (path |
filter | ... | ","): found "and < pens"
```

The correct FEEL unary test for a range is **interval notation**: `[21..pensioengerechtigdeLeeftijd)`
(closed lower bound, open upper bound — exactly what `>= 21 and <
pensioengerechtigdeLeeftijd` meant) and `[10..12]` (closed both ends, for `>= 10 and <=
12`). 6 occurrences of the first pattern, 1 of the second — all rewritten to interval
notation.

The same investigation also turned up one more `not X` case root cause 6's fix missed —
`individuele inkomenstoeslag`'s gezinssituatie column reads `not "met partner"` (a bare
string literal after `not`, same problem as `not -`: `not` needs a parenthesized
argument). Rewritten to `not("met partner")`. Confirmed there are no other `not X`
variants left anywhere in the file (checked programmatically, not just by pattern-matching
the two already found).

Both fixes confirmed live: `individuele inkomenstoeslag` (both variants) and `PC-voorziening`
now evaluate correctly instead of throwing `FEEL/SCALA-01008`.

## Root cause 8: two decisions have a default rule but `hitPolicy` defaults to `UNIQUE`

Found while extending the test suite to cover the remaining 11 composite decisions.
`Beslistabel bepalen aanspraak op regeling tegemoetkoming meerkosten` and `Beslistabel
bepalen aanspraak op tegemoetkoming identiteitskaart voor kind van natuurlijk persoon`
both have no `hitPolicy` attribute on their `<dmn:decisionTable>` — which per the DMN
spec defaults to `UNIQUE` (at most one rule may match; more than one is an error). Both
tables have the same shape as their siblings that **do** have `hitPolicy="FIRST"`: two
specific "qualifying route" rules followed by an all-wildcard `-,-,-,...` default rule
that returns `false`.

A wildcard default rule is fundamentally incompatible with `UNIQUE` — it matches
_everything_, so it always fires alongside whichever specific rule also matches,
violating "at most one." Operaton reports this clearly once it's reached:

```
DmnHitPolicyException: DMN-03001 Hit policy 'UNIQUE' only allows a single rule to
match. Actually match rules: [... value='true' ..., ... value='false' ...]
```

This never surfaced earlier because reaching it requires input that actually satisfies
one of the specific rules — every previous root cause was blocking evaluation before
getting this far. This is very likely an iKnow export inconsistency rather than intended
design: every other decision in this file with a default catch-all rule has explicit
`hitPolicy="FIRST"` (e.g. the natuurlijke-persoon `tegemoetkoming identiteitskaart`
sibling, structurally identical to the kind variant, already has `FIRST`). Fixed by
adding `hitPolicy="FIRST"` to both `<dmn:decisionTable>` elements — no rule content
changed. The remaining `hitPolicy`-less decisions in the file (all six loongrens/
vermogensgrens/pensioengerechtigde-leeftijd lookup tables) have no default rule and are
correctly mutually exclusive on their lookup key, so `UNIQUE` is the right policy for
them and they were left untouched.

Confirmed live: both decisions now return the correct `true`/`false` for inputs that
satisfy a specific rule.

## Appendix: full name mapping

### Decision-input variables (`inputData`, 52)

| Original name                                                                                                                                                 | Flat token                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `aanvrager meerkosten.minimuminkomen meerkosten`                                                                                                              | `amMinimuminkomenMeerkosten`                                                                       |
| `kind.Nederlandse nationaliteit`                                                                                                                              | `kindNederlandseNationaliteit`                                                                     |
| `kind.aanspraak op andere voorliggende voorziening`                                                                                                           | `kindAanspraakAndereVoorliggendeVoorziening`                                                       |
| `kind.afstand tot school is groter dan 9 kilometer`                                                                                                           | `kindAfstandSchoolGroter9Kilometer`                                                                |
| `kind.een broer of zus die in de afgelopen 4 jaar een pc-voorziening in het basisonderwijs heeft gekregen`                                                    | `kindEenBroerZusAfgelopen4JaarPcVoorzieningBasisonderwijsGekregen`                                 |
| `kind.einde geldigheid Nederlands paspoort of Nederlandse identiteitskaart`                                                                                   | `kindEindeGeldigheidNederlandsPaspoortNederlandseIdentiteitskaart`                                 |
| `kind.geboortedatum`                                                                                                                                          | `kindGeboortedatum`                                                                                |
| `kind.in de voorafgaande 4 jaren in het voortgezetonderwijs een pc-voorziening gekregen`                                                                      | `kindInVoorafgaande4JarenVoortgezetonderwijsPcVoorzieningGekregen`                                 |
| `kind.in voorafgaand jaar in het basisonderwijs een pc-voorziening gekregen`                                                                                  | `kindInVoorafgaandJaarBasisonderwijsPcVoorzieningGekregen`                                         |
| `kind.ingeschreven in instelling voor Jeugdhulp met verblijf`                                                                                                 | `kindIngeschrevenInstellingJeugdhulpVerblijf`                                                      |
| `kind.ingeschreven op BBL _met onbetaalde stage_`                                                                                                             | `kindIngeschrevenBBLOnbetaaldeStage`                                                               |
| `kind.ingeschreven op basisschool`                                                                                                                            | `kindIngeschrevenBasisschool`                                                                      |
| `kind.ingeschreven op voorgezet onderwijs`                                                                                                                    | `kindIngeschrevenVoorgezetOnderwijs`                                                               |
| `kind.ingeschreven op voorschool`                                                                                                                             | `kindIngeschrevenVoorschool`                                                                       |
| `kind.ingeschreven op woonadres van ouder die aanvraagt`                                                                                                      | `kindIngeschrevenWoonadresOuderAanvraagt`                                                          |
| `kind.niet meer beschikking over eerder verstrekte identiteitskaart door diefstal_ vermissing of beschadiging`                                                | `kindNietMeerBeschikkingOverEerderVerstrekteIdentiteitskaartDoorDiefstalVermissingBeschadiging`    |
| `kind.nieuwe identiteitskaart gekregen na diefstal_ vermissing of beschadiging`                                                                               | `kindNieuweIdentiteitskaartGekregenNaDiefstalVermissingBeschadiging`                               |
| `natuurlijke persoon.Nederlandse Nationaliteit`                                                                                                               | `npNederlandseNationaliteit`                                                                       |
| `natuurlijke persoon.aannemelijke meerkosten`                                                                                                                 | `npAannemelijkeMeerkosten`                                                                         |
| `natuurlijke persoon.bewijs inschrijving betreffende voorschool`                                                                                              | `npBewijsInschrijvingBetreffendeVoorschool`                                                        |
| `natuurlijke persoon.bijzondere omstandigheden die leiden tot noodzakelijke kosten van bestaan die in Nederland zijn gemaakt en aan Nederland zijn verbonden` | `npBijzondereOmstandighedenLeidenNoodzakelijkeKostenBestaanNederlandGemaaktNederlandVerbonden`     |
| `natuurlijke persoon.burgerservicenummer`                                                                                                                     | `npBurgerservicenummer`                                                                            |
| `natuurlijke persoon.een schuldregeling van een door de gemeente aangewezen of gemandateerde`                                                                 | `npEenSchuldregelingDoorGemeenteAangewezenGemandateerde`                                           |
| `natuurlijke persoon.einde geldigheid Nederlands paspoort of Nederlandse identiteitskaart`                                                                    | `npEindeGeldigheidNederlandsPaspoortNederlandseIdentiteitskaart`                                   |
| `natuurlijke persoon.financiele draagkracht`                                                                                                                  | `npFinancieleDraagkracht`                                                                          |
| `natuurlijke persoon.fiscaal gezinsinkomen drie jaar geleden`                                                                                                 | `npFiscaalGezinsinkomenDrieJaarGeleden`                                                            |
| `natuurlijke persoon.fiscaal gezinsinkomen twee jaar geleden`                                                                                                 | `npFiscaalGezinsinkomenTweeJaarGeleden`                                                            |
| `natuurlijke persoon.fiscaal gezinsinkomen vorig jaar`                                                                                                        | `npFiscaalGezinsinkomenVorigJaar`                                                                  |
| `natuurlijke persoon.geboortedatum`                                                                                                                           | `npGeboortedatum`                                                                                  |
| `natuurlijke persoon.gezinssituatie`                                                                                                                          | `npGezinssituatie`                                                                                 |
| `natuurlijke persoon.kan beroep doen op een voorliggende voorziening _bijz. bijstand_`                                                                        | `npKanBeroepDoenVoorliggendeVoorzieningBijzBijstand`                                               |
| `natuurlijke persoon.kosten voor een buitengesloten kostenpost`                                                                                               | `npKostenBuitengeslotenKostenpost`                                                                 |
| `natuurlijke persoon.kosten worden als niet noodzakelijk beschouwd door voorliggende voorziening`                                                             | `npKostenNoodzakelijkBeschouwdDoorVoorliggendeVoorziening`                                         |
| `natuurlijke persoon.medische verklaring dat aangeeft minstens 12 maanden chronisch ziek is of fysieke of psychische beperkingen ondervindt`                  | `npMedischeVerklaringAangeeftMinstens12MaandenChronischZiekFysiekePsychischeBeperkingenOndervindt` |
| `natuurlijke persoon.minnelijke schuldregeling`                                                                                                               | `npMinnelijkeSchuldregeling`                                                                       |
| `natuurlijke persoon.niet meer beschikking over eerder verstrekte identiteitskaart door diefstal_ vermissing of beschadiging`                                 | `npNietMeerBeschikkingOverEerderVerstrekteIdentiteitskaartDoorDiefstalVermissingBeschadiging`      |
| `natuurlijke persoon.nieuwe identiteitskaart gekregen na diefstal_ vermissing of beschadiging`                                                                | `npNieuweIdentiteitskaartGekregenNaDiefstalVermissingBeschadiging`                                 |
| `natuurlijke persoon.ontvangt kinderbijslag voor kind`                                                                                                        | `npOntvangtKinderbijslagKind`                                                                      |
| `natuurlijke persoon.ontvangt pleegkindvergoeding voor kind`                                                                                                  | `npOntvangtPleegkindvergoedingKind`                                                                |
| `natuurlijke persoon.ontvangt voedselpakketten van Voedselbank Amsterdam of Voedselbank Gooi en Omstreken`                                                    | `npOntvangtVoedselpakkettenVoedselbankAmsterdamVoedselbankGooiOmstreken`                           |
| `natuurlijke persoon.opgelegde schuldregeling op grond van WSNP`                                                                                              | `npOpgelegdeSchuldregelingGrondWSNP`                                                               |
| `natuurlijke persoon.uitzicht op inkomensverbetering`                                                                                                         | `npUitzichtInkomensverbetering`                                                                    |
| `natuurlijke persoon.vermogen op 31 december vorig jaar`                                                                                                      | `npVermogen31DecemberVorigJaar`                                                                    |
| `natuurlijke persoon.verwacht dat die een lening aangaat`                                                                                                     | `npVerwachtLeningAangaat`                                                                          |
| `natuurlijke persoon.verwacht dat er voor deze noodzakelijke kosten had gereserveerd`                                                                         | `npVerwachtNoodzakelijkeKostenHadGereserveerd`                                                     |
| `natuurlijke persoon.volgt onderwijs in de zin van hoofdstuk 4 van de Wet tegemoetkoming onderwijsbijdrage en schoolkosten`                                   | `npVolgtOnderwijsZinHoofdstuk4WetTegemoetkomingOnderwijsbijdrageSchoolkosten`                      |
| `natuurlijke persoon.volgt onderwijs in de zin van hoofdstuk II van de Wet op de studiefinanciering`                                                          | `npVolgtOnderwijsZinHoofdstukIIWetStudiefinanciering`                                              |
| `natuurlijke persoon.woonachtig in de gemeente waar wordt aangevraagd`                                                                                        | `npWoonachtigGemeenteAangevraagd`                                                                  |
| `partner.geboortedatum`                                                                                                                                       | `partnerGeboortedatum`                                                                             |
| `partner.uitzicht op inkomensverbetering`                                                                                                                     | `partnerUitzichtInkomensverbetering`                                                               |
| `partner.woonachtig in gemeente waar wordt aangevraagd`                                                                                                       | `partnerWoonachtigGemeenteAangevraagd`                                                             |
| `peildatum`                                                                                                                                                   | `peildatum`                                                                                        |

### Decision-result variables (25, one per decision)

Resolved from how each decision's result is actually referenced by its callers (see
"Root cause 2" above) — not simply from the decision's own `<output label>`, which is
ambiguous for 3 of the 25.

| Referenced as                                                         | Flat token                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `aanspraken`                                                          | `aanspraken`                                             |
| `kind.aanspraak op een Stadspas`                                      | `kindAanspraakStadspas`                                  |
| `kind.aanspraak op tegemoetkoming identiteitskaart`                   | `kindAanspraakTegemoetkomingIdentiteitskaart`            |
| `kind.een beleidsregel minimakind scholier`                           | `kindEenBeleidsregelMinimakindScholier`                  |
| `kind.een beleidsregels minimakind`                                   | `kindEenBeleidsregelsMinimakind`                         |
| `kind.minderjarig`                                                    | `kindMinderjarig`                                        |
| `natuurlijke persoon.aanspraak op aanvullend kindtegoed`              | `npAanspraakAanvullendKindtegoed`                        |
| `natuurlijke persoon.aanspraak op bijzondere bijstand`                | `npAanspraakBijzondereBijstand`                          |
| `natuurlijke persoon.aanspraak op een Stadspas`                       | `npAanspraakStadspas`                                    |
| `natuurlijke persoon.aanspraak op individuele inkomenstoeslag`        | `npAanspraakIndividueleInkomenstoeslag`                  |
| `natuurlijke persoon.aanspraak op kindtegoed`                         | `npAanspraakKindtegoed`                                  |
| `natuurlijke persoon.aanspraak op pc-voorziening`                     | `npAanspraakPcVoorziening`                               |
| `natuurlijke persoon.aanspraak op regeling tegemoetkoming meerkosten` | `npAanspraakRegelingTegemoetkomingMeerkosten`            |
| `natuurlijke persoon.aanspraak op reiskostenvergoeding kind`          | `npAanspraakReiskostenvergoedingKind`                    |
| `natuurlijke persoon.aanspraak op tegemoetkoming identiteitskaart`    | `npAanspraakTegemoetkomingIdentiteitskaart`              |
| `natuurlijke persoon.een schuldregeling`                              | `npEenSchuldregeling`                                    |
| `natuurlijke persoon.langdurig laag inkomen`                          | `npLangdurigLaagInkomen`                                 |
| `natuurlijke persoon.meerderjarig`                                    | `npMeerderjarig`                                         |
| `partner.aanspraak op individuele inkomenstoeslag`                    | `partnerAanspraakIndividueleInkomenstoeslag`             |
| `pensioengerechtigde leeftijd`                                        | `pensioengerechtigdeLeeftijd`                            |
| `van toepassing zijnde loongrens drie jaar geleden voor volwassenen`  | `vanToepassingZijndeLoongrensDrieJaarGeledenVolwassenen` |
| `van toepassing zijnde loongrens twee jaar geleden voor volwassenen`  | `vanToepassingZijndeLoongrensTweeJaarGeledenVolwassenen` |
| `van toepassing zijnde loongrens vorig jaar voor kinderen`            | `vanToepassingZijndeLoongrensVorigJaarKinderen`          |
| `van toepassing zijnde loongrens vorig jaar voor volwassenen`         | `vanToepassingZijndeLoongrensVorigJaarVolwassenen`       |
| `van toepassing zijnde vermogensgrens`                                | `vanToepassingZijndeVermogensgrens`                      |
