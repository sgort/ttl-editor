# Test cases — `PW-normbedragen.dmn`

The reasoning behind each of the 121 cases in
[`pw-normbedragen-test-cases.json`](pw-normbedragen-test-cases.json), what they
proved, and how to run them yourself. Companion to
[`test-cases-pw.sh`](test-cases-pw.sh) (the runner) and
[`../CHANGELOG.md`](../CHANGELOG.md) (the history).

Every result quoted here was produced live against
`https://operaton.open-regels.nl/engine-rest`, not reasoned about on paper.

---

## 1. The model

`PW-normbedragen.dmn` is a two-decision DRD:

```
        norm ──────────┐
                       ▼
              pw-normbedragen  (UNIQUE, 20 rules, output: bedrag)
                       │ requiredDecision
                       ▼
           PW_BijstandsnormBedragen  (FIRST, 5 rules, 20 outputs)
                       ▲
   peildatum ──────────┘
```

`PW_BijstandsnormBedragen` picks a **termijn** — a validity window over
`peildatum` — and emits all 20 bijstandsnorm amounts for that window at once,
one per output column. `pw-normbedragen` then picks the one column the caller's
`norm` name asks for and returns it as `bedrag`.

Both inputs are declared as `<inputData>` with a `<variable>`, and each decision
carries the matching `<informationRequirement>` — which is what makes the DRD
wiring explicit rather than implied by variable names.

### The known request body

```json
{
  "variables": {
    "peildatum": { "value": "2026-09-15", "type": "String" },
    "norm": { "value": "Alleenstaande norm", "type": "String" }
  }
}
```

`POST /decision-definition/key/pw-normbedragen/evaluate` →

```json
[{ "bedrag": { "type": "Double", "value": 1419.46, "valueInfo": {} } }]
```

`peildatum` is a **String**, not a Date. The rule cells call `date(peildatum)`
themselves, so the engine is handed an ISO-8601 string and does the conversion
inside FEEL. Sending `type: "Date"` is not what this model expects.

---

## 2. The 20 norms

`norm` is an enumerated string. The 20 accepted values, the output column each
selects, and the article behind that column:

| `norm`                                                            | column | situation                                        | article         |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------ | --------------- |
| `Alleenstaande jongere zonder kinderen norm`                      | `J`    | alleenstaande 18/19/20, geen kind                | Art. 20 lid 1 a |
| `Alleenstaande ouder jongere norm`                                | `JK`   | alleenstaande ouder 18/19/20                     | Art. 20 lid 2 a |
| `Samenwonende jongere zonder kinderen norm`                       | `JJ`   | gehuwden, beide 18/19/20, geen kind              | Art. 20 lid 1 b |
| `Samenwonende jongere met kinderen norm`                          | `JJK`  | gehuwden, beide 18/19/20, met kind               | Art. 20 lid 2 b |
| `Samenwonende waarvan 1 jongere en 1 oudere zonder kinderen norm` | `JO`   | 18/19/20 + partner boven AOW-leeftijd, geen kind | Art. 20 lid 2 c |
| `Samenwonende waarvan 1 jongere en 1 oudere met kinderen norm`    | `JOK`  | 18/19/20 + partner boven AOW-leeftijd, met kind  | Art. 20 lid 2 c |
| `Alleenstaande norm`                                              | `M`    | alleenstaande 21 tot AOW-leeftijd, geen kind     | Art. 21 a       |
| `Alleenstaande ouder norm`                                        | `MK`   | alleenstaande ouder 21 tot AOW-leeftijd          | Art. 21 a       |
| `Samenwonende norm`                                               | `MM`   | gehuwden, beide 21 tot AOW, geen kind            | Art. 21 b       |
| `Samenwonende met kinderen norm`                                  | `MMK`  | gehuwden, beide 21 tot AOW, met kind             | Art. 21 b       |
| `Samenwonende waarvan 1 jongere zonder kinderen norm`             | `MJ`   | 21-plusser + partner 18/19/20, geen kind         | Art. 20 lid 1 c |
| `Samenwonende waarvan 1 jongere met kinderen norm`                | `MJK`  | 21-plusser + partner 18/19/20, met kind          | Art. 20 lid 2 c |
| `Samen wonende 1 oudere norm`                                     | `MO`   | 21-plusser + partner boven AOW, geen kind        | Art. 22 b       |
| `Samen wonende 1 oudere met kinderen norm`                        | `MOK`  | 21-plusser + partner boven AOW, met kind         | Art. 22 b       |
| `Alleenstaande oudere norm`                                       | `O`    | alleenstaande boven AOW, geen kind               | Art. 22 a       |
| `Alleenstaande ouder oudere norm`                                 | `OK`   | alleenstaande ouder boven AOW                    | Art. 22 a       |
| `Samenwonende oudere norm`                                        | `OO`   | gehuwden, beide boven AOW, geen kind             | Art. 22 b       |
| `Samenwonende oudere met kinderen norm`                           | `OOK`  | gehuwden, beide boven AOW, met kind              | Art. 22 b       |
| `Alleenstaande in inrichting norm`                                | `I`    | alleenstaande in een inrichting                  | Art. 23 lid 1 a |
| `Samenwonend in inrichting norm`                                  | `II`   | gehuwden, beiden in een inrichting               | Art. 23 lid 1 b |

All articles are Participatiewet (`BWBR0015703`).

The seven names in this table that end in a child-bearing or oudere variant —
`MK`, `MMK`, `MOK`, `JO`, `JOK`, `OK`, `OOK` — **did not exist** before this
round. Their columns were populated in `PW_BijstandsnormBedragen` but no `norm`
value selected them, so no request body could reach them. See §5.

`Samen wonende 1 oudere norm` keeps its original spacing (`Samen wonende`, not
`Samenwonende`). It is a live enumerated value that callers already send;
`MOK`'s new name deliberately matches it rather than silently correcting it.

---

## 3. The five termijnen

| termijn     | unary test                                                                       | source               |
| ----------- | -------------------------------------------------------------------------------- | -------------------- |
| 2024-H2     | `date("2024-07-01") <= date(peildatum) and date(peildatum) < date("2025-01-01")` | export               |
| 2025-H1     | `date("2025-01-01") <= … < date("2025-07-01")`                                   | export               |
| 2025-H2     | `date("2025-07-01") <= … < date("2026-01-01")`                                   | export               |
| 2026-H1     | `date("2026-01-01") <= … < date("2026-07-01")`                                   | export               |
| **2026-H2** | `date("2026-07-01") <= … < date("2027-01-01")`                                   | **added this round** |

The 2026-H2 amounts are not transcribed from a normenbrief PDF. Every one comes
from the CPRMV norms API:

```
https://acc.backend.linkeddata.open-regels.nl/v1/norms?cprmv_version=0.4.1
```

filtered to `rulesetid: BWBR0015703`, `applicable_date: 2026-07-01` (34 norms).

| column                   | €       | article                   |
| ------------------------ | ------- | ------------------------- |
| `M`, `MK`                | 1419.46 | Art. 21 a                 |
| `MM`, `MMK`              | 2027.79 | Art. 21 b                 |
| `MJ`                     | 1364.32 | Art. 20 lid 1 c           |
| `MJK`, `JO`, `JOK`       | 1769.88 | Art. 20 lid 2 c           |
| `J`, `JK`                | 350.42  | Art. 20 lid 1 a / lid 2 a |
| `JJ`                     | 700.84  | Art. 20 lid 1 b           |
| `JJK`                    | 1106.40 | Art. 20 lid 2 b           |
| `O`, `OK`                | 1587.34 | Art. 22 a                 |
| `OO`, `OOK`, `MO`, `MOK` | 2176.10 | Art. 22 b                 |
| `I`                      | 449.44  | Art. 23 lid 1 a           |
| `II`                     | 699.11  | Art. 23 lid 1 b           |

The equalities in that table (`MO` = `OO`, `JO` = `MJK`, and so on) are the
model's own, carried forward from the four earlier termijnen rather than
invented here.

---

## 4. What the 121 cases cover

| #   | group                                                                                      | cases       | what a failure would mean                                                                   |
| --- | ------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------- |
| 1   | **Full matrix** — every `norm` × every termijn                                             | TC001–TC100 | a norm name selecting the wrong column, or a column holding the wrong amount in one termijn |
| 2   | **Leaf decision** — `PW_BijstandsnormBedragen` direct, all 20 columns asserted per termijn | TC101–TC105 | a column defect that the outer table happens to mask                                        |
| 3   | **Lower bounds inclusive** — `peildatum` exactly on each termijn's opening date            | TC106–TC110 | `<=` silently becoming `<`, shifting a whole half-year into the previous bracket            |
| 4   | **Upper bounds exclusive** — the day before each termijn opens                             | TC111–TC114 | `<` becoming `<=`, making two rules match and `FIRST` pick the earlier one                  |
| 5   | **Outside every termijn** — 2024-06-30, 2027-01-01, 2030-01-01                             | TC115–TC117 | a stray default rule, or an error where a null is correct                                   |
| 6   | **Unknown norm**                                                                           | TC118       | a default rule appearing in the outer table                                                 |
| 7   | **Regression guards** for the three defects fixed this round                               | TC119–TC121 | the defect coming back on a re-export                                                       |

Group 1 is the "all options" requirement taken literally: 20 × 5 = 100 cases.
Full _rule_ coverage would need only 20, but a chained DRD can be rule-complete
and still mis-wired — a column swapped between two termijnen shows up only in
the specific pairing that reads it. The cross product costs nothing to run and
removes that class of defect entirely.

Group 5 is worth separating from group 6. Both are "nothing matched", but the
engine reports them differently:

```
peildatum outside every termijn  → [{"bedrag":{"type":"Null","value":null}}]
norm outside the enumeration     → []
```

The outer table matched a rule in the first case (the `norm` was valid) and the
inner decision supplied nothing, so a row exists with a null value. In the
second, nothing matched at all and there is no row. A suite that treated these
as the same thing would pass while the DRD lost the ability to distinguish
"unknown date" from "unknown norm".

### Independence of the expected values

The generator holds its own transcription of all 100 (termijn × column)
amounts and the full norm→column mapping, and **cross-checks both against the
DMN before writing a single case** — aborting if they disagree. This matters
because a suite generated _from_ the file under test proves nothing. What it
buys, precisely:

- The **norm→column mapping** and the **2026-H2 amounts** are independently
  sourced (output labels and the norms API respectively), so they are genuine
  verification.
- **60 of the 100 (termijn × column) amounts** are independently confirmed
  against a second source in this folder: the normenbrief TTLs publish each
  norm as a `cprmv:Rule` carrying a `cprmv:norm`, for `applicable_date`
  2025-07-01, 2026-01-01 and 2026-07-01. Every one of those 60 matches, which
  also confirms the column→article mapping three times over. See §5.7.
- The **2024-H2 and 2025-H1 amounts** are the remaining 40, and those have no
  second source here — no normenbrief rule set for 2024-07-01 or 2025-01-01 is
  published in this repository. Their cases pin current behaviour against
  regression rather than confirming the amounts are legally right. A real but
  bounded limitation, stated rather than papered over.

---

## 5. Findings

Four defects were found and fixed, one cross-check came back clean, and two
observations are recorded without change.

### 5.1 `MJK` overwritten with `MJ`'s value in two termijnen — **fixed**

| termijn | `MJK` was | `MJK` is    |
| ------- | --------- | ----------- |
| 2025-H2 | 1315.88   | **1707.04** |
| 2026-H1 | 1347.06   | **1747.49** |

`MJK` (Art. 20 lid 2 c, gehuwden with one 18/19/20 partner, _with_ children) is
a distinct and higher norm than `MJ` (lid 1 c, the same couple _without_
children). In the 2024-H2 and 2025-H1 rules `MJK` equals `JO` and `JOK`; in the
last two it had been overwritten with `MJ`'s value.

Three independent confirmations:

1. **The model's own equality.** `MJK = JO = JOK` holds in 2024-H2 (1631.48)
   and 2025-H1 (1677.62). Both later rules already carried `JO = JOK` =
   1707.04 / 1747.49 — the values `MJK` should have had, sitting right beside
   the wrong ones.
2. **Indexation.** Every working-age norm moves ×1.0128 from 2026-H1 to
   2026-H2. The API's 2026-H2 `MJK` is 1769.88, and 1769.88 / 1.0128 = 1747.49
   exactly. (The AOW-linked columns `O`, `OO`, `MO` move ×1.0145–1.0149
   instead, which is expected: they follow net AOW, not the minimum wage.)
3. **The published norms.** `Normenbrief-jul-25.ttl` and
   `Normenbrief incl PW normen DMN.ttl` publish Art. 20 lid 2 onderdeel c as
   `cprmv:norm "1.707,04"` and `"1.747,49"` for 2025-07-01 and 2026-01-01
   respectively — the corrected values exactly, from a source that is not this
   DMN and not an inference. This one arrived after the fix, during the
   grounding work (§5.7), and is the reason the correction no longer rests on
   reasoning at all.

Guarded by TC120 and TC121.

### 5.2 Two norms collided on `MO` — **fixed**

`Samenwonende waarvan 1 jongere zonder kinderen norm` mapped to `MO`, the same
column as `Samen wonende 1 oudere norm`. Both answered 2094.98 for a 2025-H2
peildatum. The first describes a couple with a _jongere_ partner (Art. 20
lid 1 c → `MJ`), the second one with an _oudere_ partner (Art. 22 b → `MO`).
Now `MJ` and `MO` respectively.

Guarded by TC119, paired with TC063.

### 5.3 Seven columns were unreachable — **fixed**

`MK`, `MMK`, `MOK`, `JO`, `JOK`, `OK` and `OOK` had amounts in every termijn but
no `norm` value selecting them: 13 rules for 20 columns. Seven rules added, and
`<inputValues>` extended from 13 to 20 entries so the enumeration and the rules
agree. Every column is now reachable by exactly one norm, verified
programmatically as well as by TC001–TC100.

### 5.4 The DMNDI diagram was broken — **fixed**

`DMNShape_0j50vkp` carried `dmnElementRef="ab-normbedragen"`, an id that does
not exist in this file (its decision is `pw-normbedragen`) — a dangling
reference. A later edit dropped the attribute altogether, leaving an orphan
shape, and moved `PW_BijstandsnormBedragen` to the same coordinates as the
decision above it, so the two overlapped and the edge waypoints pointed at
nothing. Reference restored to `pw-normbedragen`, bounds restored to `y=250`.

### 5.5 `JO` / `JOK` may both be Art. 20 lid 2 c — **not changed**

`JO` (18/19/20 + partner above AOW-leeftijd, _no_ child) carries the same amount
as `JOK` (the same couple _with_ a child) in all five termijnen, and that amount
is lid 2 c — the _with children_ norm. By the reading applied to `MJ`/`MJK`,
`JO` would be lid 1 c and equal `MJ`.

This is not a transcription slip like §5.1: the equality is deliberate and
consistent across every termijn, including the two the original modeller got
right. The §5.7 cross-check settles the _amount_ — `JO` and `JOK` match the
published Art. 20 lid 2 c norm exactly at all three dates — so what remains
open is only whether the _situation_ `JO` describes belongs under lid 1 c. It
may encode a policy reading this analysis does not have access to. Flagged for
SZW; no amount changed on inference.

### 5.6 Grounding is complete for three of five termijnen — **by design**

80 cells carry `cprmv:sourceQuote` + `cprmv:isBasedOn`; the 40 amount cells of
the 2024-H2 and 2025-H1 termijnen do not, and carry a `cprmv:note` saying why.
No normenbrief rule set for 2024-07-01 or 2025-01-01 is published in this
repository, and their URIs follow a pattern regular enough that they could be
constructed — which is exactly the reason not to. A grounding that points at a
URI nobody has published is worse than an absent one: it looks authoritative
and resolves to nothing. Ground them the day those norm sets are published.

### 5.7 The published norms confirm 60 of 100 amounts — **clean**

The normenbrief TTLs in this folder publish every PW norm as a `cprmv:Rule`
with a `cprmv:norm` and a `cprmv:situatie`, for three of the five termijnen:

| `applicable_date` | published in                         |
| ----------------- | ------------------------------------ |
| 2025-07-01        | `Normenbrief-jul-25.ttl`             |
| 2026-01-01        | `Normenbrief incl PW normen DMN.ttl` |
| 2026-07-01        | `Normenbrief-jul-26-0.4.1.ttl`       |

Mapping each of the 20 output columns to its article (the table in §2) and
comparing the DMN's amount to that rule's `cprmv:norm` gives **60 comparisons,
60 matches, 0 mismatches**. Three things fall out of it:

- The **column→article mapping** — derived independently, from the output
  labels — is confirmed, three times over.
- The **`MJK` correction** is confirmed by a source that is neither this DMN
  nor an inference (§5.1, confirmation 3).
- The 40 remaining cells are precisely the two termijnen with no published
  norm set, which is the same boundary the grounding respects (§5.6).

---

## 6. Cell-level legislative grounding

Layer 1 of
[`../../amsterdam/cprmv-cell-level-linking-prototype.md`](../../amsterdam/cprmv-cell-level-linking-prototype.md),
applied to this model. `xmlns:cprmv` is declared and **80 cells** carry a
grounding:

| where                              | cells  | grounded in                                    |
| ---------------------------------- | ------ | ---------------------------------------------- |
| `PW_BijstandsnormBedragen` amounts | **60** | the published norm for that (termijn, column)  |
| `pw-normbedragen` norm names       | **20** | the published norm for that column, 2026-07-01 |

Every `cprmv:isBasedOn` is the subject URI of a norm the normenbrief TTLs in
this folder already publish as a `cprmv:Rule`, and every `cprmv:sourceQuote` is
that rule's own `cprmv:situatie`. Nothing is minted:

```xml
<outputEntry id="LiteralExpression_2026H2_M"
             cprmv:sourceQuote="een alleenstaande of een alleenstaande ouder zonder kostendelende medebewoners"
             cprmv:isBasedOn="https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_Artikel-21_onderdeel-a">
  <text>1419.46</text>
</outputEntry>
```

Grounding the outer table's **norm-name** cells is the part with no equivalent
in the Amsterdam work, and arguably the most useful: it is what makes
"`Alleenstaande norm` means Art. 21 onderdeel a's situation" machine-readable,
rather than a convention living in a column label. They are grounded against
the 2026-07-01 norm set, because a norm _name_ is version-independent while the
`situatie` text is not, and the current set is the defensible choice.

The five termijn rules also carry `cprmv:validFrom` / `cprmv:validUntil`.
`validUntil` is the **inclusive last day** — this repo's own convention in
`examples/full-test-import-export.ttl`, where `2024-12-31` pairs with a next
rule opening `2025-01-01` — so it lines up exactly with the day-before cases
TC111–TC114.

### Why no `dct:source`

The Amsterdam design offers two shapes: APT-style (a `cprmv:sourceQuote` plus a
citation, emitted directly on the cell) and CPT-style (a bare `dct:source` id,
routed through a deduplicated concept resource). This model uses APT-style
throughout, and that is deliberate — `ttlGenerator`'s CPT path builds
`<serviceUri>/concepts/<sourceId>`, which mangles a full URI into a nested one,
and its `pnaWebUri` fallback sends a bare id to the HvA-specific
`hva.pna-web.com` domain. Neither is right for SZW. The quote-plus-citation
shape handles a full URI correctly and needs no domain of its own.

### What comes out the other end

`dmnHelpers.extractRulesFromDMN` reads all 80 groundings; `ttlGenerator` emits
each as its own `cprmv:Rule` inside its rule's `cprmv:hasPart`, plus 36
deduplicated citation stubs (12 articles × 3 dates):

```turtle
<…/rules/DecisionRule_2026H2/cell/LiteralExpression_2026H2_M> a cprmv:Rule ;
    cprmv:id "DecisionRule_2026H2-cell-LiteralExpression_2026H2_M" ;
    cprmv:sourceQuote "een alleenstaande of een alleenstaande ouder zonder kostendelende medebewoners" ;
    cprmv:isBasedOn <https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_Artikel-21_onderdeel-a> .
```

**One finding, recorded not fixed.** The citation stub the generator mints to
satisfy `sh:class cprmv:Rule` reads:

```turtle
<https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_Artikel-21_onderdeel-a> a cprmv:Rule ;
    cprmv:id "https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_Artikel-21_onderdeel-a" .
```

`cprmv:id` is the whole URI because the generator has no other identifier for
an external target — a reasonable default for a `wetten.overheid.nl` citation.
But these URIs are _ours_, and the normenbrief graph already gives each one a
real `cprmv:id` (`"onderdeel a."`). Harmless, since the stub only asserts a
true type, but lossy. `ttlGenerator` could skip the stub entirely for an
already-typed `cprmv.open-regels.nl` rule URI, or derive the id from the last
segment of the `ruleIdPath`. Not changed here: it is a fix to the generator,
not to this model. Tracked as
[ttl-editor#116](https://github.com/sgort/ttl-editor/issues/116).

---

## 7. Validation status

Against `POST /v1/dmns/validate` on `acc.backend.linkeddata.open-regels.nl`:

| layer       | issues |
| ----------- | ------ |
| base        | 0      |
| business    | 0      |
| execution   | 0      |
| interaction | 0      |
| content     | 0      |

`valid: true`, **zero issues across all five layers**. Two cleared during this
work:

- `INT-007` (warning) — an `<inputExpression>` referencing a variable neither
  declared as `<inputData>` nor produced by a `requiredDecision`. Gone because
  this file declares both inputs properly.
- `EXEC-001` (info) — no `cprmv:` namespace declared. Gone with the grounding
  in §5.6.

And the generated Turtle passes SHACL (`POST /v1/shacl/validate`, the vendored
CPRMV 0.4.1 / CPSV-AP 3.2.0 / RONL shapes) with **0 errors**.

**Two defects no validator here catches**, both worth knowing about because
both were live in this model at some point and neither raised a single issue:

- An **empty `<inputExpression><text></text>`** on the `termijn` input.
  It evaluates correctly regardless — Operaton falls back to resolving
  `peildatum` from the variable context because `camunda:inputVariable` names
  it. Invalid DMN that works is the worst kind: it survives deployment and
  fails only once something else changes.
- A **`typeRef` that contradicts its own cells**: `II` declared
  `typeRef="string"` while every cell holds a decimal literal. Operaton returns
  `{"type":"String","value":"674.29"}` and then coerces it into the `double`
  `bedrag` output without complaint. Correct answer, wrong type, no warning.

---

## 8. Running the cases

### The runner

```bash
cd examples/organizations/szw/testCases
./test-cases-pw.sh                                  # deploys, then runs all 121
SKIP_DEPLOY=1 ./test-cases-pw.sh                    # reuse what's already live
VERBOSE=1 ./test-cases-pw.sh                        # print passes too
OPERATON_URL=http://localhost:8081/engine-rest ./test-cases-pw.sh
```

Defaults to `https://operaton.open-regels.nl/engine-rest`. Requires `curl` and
`jq`. Exits non-zero if anything fails.

Current result:

```
Results: 121 passed, 0 failed (of 121)
```

The runner compares against each case's `expectedOutputs` — real JSON, so
numbers compare as numbers and `1106.40` matches `1106.4`. It was
mutation-checked in all three branches (wrong amount, null-vs-value,
empty-set-vs-row, in both directions) and reports each as a failure, so a green
run means the comparisons actually ran.

### In the CPSV Editor

The same file drives the DMN tab's **Run All Test Cases**. Each case carries a
`decision` field, so the 116 `pw-normbedragen` cases and the 5
`PW_BijstandsnormBedragen` cases route to their own decision from one file.

The tab reads the human-readable `expected` string rather than
`expectedOutputs`, which is why every case carries both. The strings are kept in
strict `key=value` form (`bedrag=1419.46`, or all 20 columns comma-separated for
the leaf cases) so `parseExpectedString` in `src/utils/dmnHelpers.js` reads them
without ambiguity. Teaching the tab to prefer `expectedOutputs` when present is
the open improvement noted in that helper's own TODO.

---

## 9. Changelog

See [`../CHANGELOG.md`](../CHANGELOG.md).
