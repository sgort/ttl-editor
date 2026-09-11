# Test cases — `225_Beslissing_Levensonderhoud-patched.dmn`

The reasoning behind each of the 65 cases in
[`alo-test-cases.json`](alo-test-cases.json), what they proved, and how to run
them yourself. Companion to [`test-cases-alo.sh`](test-cases-alo.sh) (the
runner) and [`../CHANGELOG.md`](../CHANGELOG.md) (the history).

Every result quoted here was produced live against
`https://operaton.open-regels.nl/engine-rest`, not reasoned about on paper.

Third pass in the series, after
[`../../amsterdam/CHANGELOG.md`](../../amsterdam/CHANGELOG.md) and
[`../../szw/CHANGELOG.md`](../../szw/CHANGELOG.md). Everything those two learned
is applied here from the start rather than discovered again — see §7.

---

## 1. The model

`225 Beslissing Levensonderhoud v3.dmn` decides entitlement to _algemene
levensonderhoud_ (ALO) bijstand. It cannot be deployed, for reasons in §5. The
derived model is:

```
   14 scalar inputData ──┐        12 person inputData ──┐
                         ▼                              ▼
              dt225_RechtOpALO  (FIRST, 16 rules)  ◄── dt225_RechthebbendeAanvrager (FIRST, 13)
                         │                         ◄── dt225_RechthebbendePartner   (FIRST, 13)
                         │ requiredDecision
                         ▼
              dt225_BeslissingALO  (FIRST, 7 rules)  ◄── bijstandsVorm
```

plus three standalone judgement decisions, each 1 input / 1 output / 2 rules:
`dt225_TekortSchieten`, `dt225_DringendeReden`,
`dt225_HardheidsclausuleToepassen`.

**Four root decisions, not one.** Nothing in the DRD requires those three, and
they are unreachable from `Beslissing ALO`. That is true of the source model as
well, so it is not an artefact of this pass — see §5.11. `dt225_BeslissingALO`
is first in document order, so the editor's decision picker still defaults to
it.

`Beslissing ALO` passes `redenAfwijzing` and `informatiebehoefte` straight
through from `RechtOpALO`. That is what makes the inner decision's rules
observable from the root, and it is why most cases below route to
`dt225_BeslissingALO` rather than to the decision whose rule they exercise.

### The known request body

```json
{
  "variables": {
    "aanvraagtypeALO": { "value": true, "type": "Boolean" },
    "lopendeAanvraagOfUitkering": { "value": false, "type": "Boolean" },
    "eersteAanvragerVastgesteld": { "value": true, "type": "Boolean" },
    "tweedeAanvragerVastgesteld": { "value": true, "type": "Boolean" },
    "ongeoorloofdOnbetaaldVerlof": { "value": "nee", "type": "String" },
    "maandelijksInkomen": { "value": 800.0, "type": "Double" },
    "bijstandsNorm": { "value": 1320.0, "type": "Double" },
    "inkomenVastgesteld": { "value": true, "type": "Boolean" },
    "geenInAanmerkingTeNemenVermogen": { "value": "ja", "type": "String" },
    "voorliggendeVoorzieningenUitsluiting": { "value": "nee", "type": "String" },
    "bijstandsVorm": { "value": "Om niet", "type": "String" },
    "aanvragerWoonachtigInGemeente": { "value": "ja", "type": "String" },
    "aanvragerLeeftijdOK": { "value": "ja", "type": "String" },
    "aanvragerVerblijfstitelOK": { "value": "ja", "type": "String" },
    "aanvragerDetentie": { "value": "nee", "type": "String" },
    "aanvragerMaatregel100": { "value": "nee", "type": "String" },
    "aanvragerRechtOpStufi": { "value": "nee", "type": "String" },
    "partnerWoonachtigInGemeente": { "value": "ja", "type": "String" },
    "partnerLeeftijdOK": { "value": "ja", "type": "String" },
    "partnerVerblijfstitelOK": { "value": "ja", "type": "String" },
    "partnerDetentie": { "value": "nee", "type": "String" },
    "partnerMaatregel100": { "value": "nee", "type": "String" },
    "partnerRechtOpStufi": { "value": "nee", "type": "String" },
    "oordeelTekortSchieten": { "value": "nee", "type": "String" },
    "oordeelDringendeReden": { "value": "nee", "type": "String" },
    "oordeelHardheidsclausule": { "value": "nee", "type": "String" }
  }
}
```

`POST /decision-definition/key/dt225_BeslissingALO/evaluate` →

```json
[
  {
    "beslissingALO": { "type": "String", "value": "Om niet", "valueInfo": {} },
    "redenAfwijzing": { "type": "String", "value": "", "valueInfo": {} },
    "informatiebehoefte": { "type": "String", "value": "", "valueInfo": {} }
  }
]
```

This is the entitled single-applicant case. **A single applicant still supplies
partner facts**, set to the same entitled values — the model has no "no partner"
concept; `tweedeAanvragerVastgesteld` covers whether the partner situation is
resolved. That convention comes from the source model and is preserved.

---

## 2. The three-valued facts

Every fact the source model could mark unknown is a **string with three allowed
values**, `"ja"` / `"nee"` / `"onbekend"`, enumerated in `<inputValues>`:

| group                             | inputs                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| per person (× aanvrager, partner) | `WoonachtigInGemeente`, `LeeftijdOK`, `VerblijfstitelOK`, `Detentie`, `Maatregel100`, `RechtOpStufi`     |
| household                         | `ongeoorloofdOnbetaaldVerlof`, `geenInAanmerkingTeNemenVermogen`, `voorliggendeVoorzieningenUitsluiting` |

`"onbekend"` is what makes the **oranje** outcome reachable, and it is why
`informatiebehoefte` can name the missing fact rather than saying only that
something is missing. §5.4 explains why this replaced the source's `n/a`.

Income is the exception: it stays a numeric comparison
(`maandelijksInkomen < bijstandsNorm`) with a separate `inkomenVastgesteld`
boolean, because collapsing it into a three-valued string would move the
comparison out of the model. The asymmetry is deliberate.

The enumerations are not decoration: the editor's request-body generator reads
`<inputValues>` to pick an example value per input, so a model that enumerates
its inputs produces a body that is evaluable without editing. That was the
lesson from SZW.

---

## 3. What the 65 cases cover

One dedicated case per rule, 55 of them, plus three cases evaluating
`RechtOpALO` directly and 7 edge and gap cases.

| group                               | cases | routed to     | what a failure would mean                                          |
| ----------------------------------- | ----- | ------------- | ------------------------------------------------------------------ |
| `BeslissingALO` rules 1–7           | 7     | root          | the final decision mapping a colour or bijstandsvorm wrongly       |
| `RechtOpALO` rules 1–16             | 16    | root          | an entitlement ground misfiring, or a passthrough breaking         |
| `RechthebbendeAanvrager` rules 1–13 | 13    | that decision | a person's facts scored wrongly                                    |
| `RechthebbendePartner` rules 1–13   | 13    | that decision | the partner table drifting from the aanvrager table                |
| the three judgement decisions       | 6     | each decision | a standalone rule regressing unnoticed                             |
| `RechtOpALO` evaluated directly     | 3     | that decision | the intermediate colour itself changing, and the concept vanishing |
| boundary, precedence, recorded gap  | 7     | mixed         | a comparison operator or rule order changing                       |

The `RechtOpALO` rules are driven through `dt225_BeslissingALO` deliberately.
Routing them to `dt225_RechtOpALO` would assert the same values one hop earlier;
routing them through the root asserts the _chain_ as well, and the objective for
this pass is coverage towards `Beslissing ALO`.

Driving all 16 through the root has one cost, found by inspecting a published
export rather than by reasoning: nothing then names `dt225_RechtOpALO` as a
case's own decision, so its output variable `rechtOpALO` never appears in an
evaluate response — and it is not an `inputData` either, so the editor's
Concepts tab omitted the model's central intermediate concept entirely. Three
cases evaluate `dt225_RechtOpALO` directly, one per colour, which restores the
concept and asserts the intermediate value itself rather than inferring it from
what `Beslissing ALO` did with it.

The person decisions' **rood** rules cannot be observed from the root, because
one person rood and the other groen matches no `RechtOpALO` rule at all
(§5.10). Those 12 cases therefore route to the person decision directly. Their
**oranje** rules are observable from the root, and TC040/TC041 prove the
passthrough works; the other ten still route to the person decision so a
failure names the rule rather than the chain.

### Edge cases worth naming

| case                                              | why it exists                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edge_inkomen_gelijk_aan_norm`                    | income exactly at the norm. The test is a strict `<`, so equality is **not** a low income and the claim is refused. A `<=` here would silently entitle everyone at the norm. |
| `edge_inkomen_net_onder_norm`                     | one cent below, entitled. Pins the boundary from the other side, so the pair fails if the operator moves either way.                                                         |
| `edge_FIRST_geen_aanvraag_dominates`              | four refusal grounds true at once; FIRST must report `00`, the earliest.                                                                                                     |
| `edge_rood_outranks_onbekend`                     | a disqualifying fact and an unknown fact together: the person is rood, so the applicant is refused rather than asked for information that cannot change the outcome.         |
| `edge_aanvrager_oranje_outranks_partner_oranje`   | both people have an unknown fact; R10 precedes R11, so the aanvrager's behoefte is reported.                                                                                 |
| `gap_aanvrager_rood_partner_groen` and its mirror | the recorded model gap, §5.10.                                                                                                                                               |

---

## 4. Independence of the expected values

The generator holds its own rule inventory and **cross-checks it against the
DMN before writing a single case**, aborting if the counts disagree — a suite
generated _from_ the file under test proves nothing.

Each expectation is derived from the rule the case targets, not read back from
the engine. Where the source model is the only record of intent — the reden
codes `00`/`01`/`02`/`03`/`04`/`06`, the behoefte strings — the cases pin
current behaviour against regression rather than confirming the codes are
what Den Haag's policy says they should be. That distinction is real and is
stated rather than papered over; §5.7 is the one place a code was adopted
without a source.

---

## 5. Findings

Eleven findings. Nine are defects in the source model, fixed here; two are
recorded without change.

### 5.1 Three decisions cannot be evaluated by any DMN engine — **fixed**

`dt225_RechthebbendeOudsteBelanghebbende`,
`dt225_RechthebbendeJongesteBelanghebbende` and `Decision_1rzh55n` are
`literalExpression`s holding object-model expressions:

```
dt225_RechthebbendePersoon(Zaak.Aanvraag.Huishouden.Personen(Burgerservicenummer = min(...))
any(Zaak.Huishouden.Personen.Huishoudens.Aanvragen(any(...); contains(...)).Zaak(Einddatum=""; Nummer <> Zaak.Nummer))
```

Four separate reasons these do not run: invoking a decision as a function over
a filtered collection, `;` as an argument separator, `<>` for inequality, and —
in two of the three — **unbalanced parentheses**. The validator reports 28
`INT-007` warnings for the undeclared object-graph roots this pulls in (`Zaak`,
`Aanvraagtype`, `any`, …).

The object model is flattened to scalar `inputData`, and the reusable person
decision is applied twice as `dt225_RechthebbendeAanvrager` and
`dt225_RechthebbendePartner`. `Decision_1rzh55n` becomes the
`lopendeAanvraagOfUitkering` input, since what it computes is a yes/no the
caller can establish.

### 5.2 Six of nine outputs have no `name` — **fixed**

The Amsterdam defect exactly: `<output>` needs a `name`, not just a `label`.
Operaton's result serialisation throws an unlogged, blank exception without one,
but only once a decision table's inputs all resolve — so it hides behind any
other defect. A seventh output had `name="Reden afwijzing"`, **with a space**,
which is not a usable FEEL identifier.

All 13 outputs in the derived model carry a name, and no name contains a space.

### 5.3 Four input expressions are empty — **fixed**

`BijstandsVorm` on `Beslissing ALO` and the single input of each of the three
judgement decisions have `<text></text>`. SZW showed this is invalid DMN that
_works_ when `camunda:inputVariable` happens to name the variable — the worst
kind, because it survives deployment and fails only when something else
changes. Here there is no `inputVariable` either, so the columns are simply
inert.

### 5.4 `n/a` is not a FEEL unary test — **fixed**

Ten cells test `n/a`, meaning "this fact is not established yet". FEEL has no
such literal. Replaced by the three-valued `"onbekend"` of §2, which maps the
ten cells one-for-one onto real rules and keeps `informatiebehoefte`
discriminating.

### 5.5 Bare multi-word FEEL names — **fixed**

`Om niet`, `Krediethypotheek`, `Verhaalbare bijstand` and `Leenbijstand` appear
unquoted as both unary tests and output values. Amsterdam found Operaton's FEEL
parser cannot read multi-word bare names; all are quoted string literals now.

Worse, `dt225_TekortSchieten`'s first rule tests
`Belanghebbende schiet tekort` — the **column label**, not a value.

### 5.6 `True` / `False` instead of `true` / `false` — **fixed**

Three cells. FEEL booleans are lower-case; capitalised, they parse as undefined
variable references.

### 5.7 A `???` placeholder as a rejection reason — **adopted, flagged**

`RechtOpALO`'s ongeoorloofd-onbetaald-verlof rule has `???` where every sibling
rule has a two-digit reden code. `"04"` is used here, carried over from the
earlier deployable, because the rule needs _a_ code to be testable.

**This is the one value in the model with no source.** It is an inference, not a
derivation, and it is flagged for Den Haag.

### 5.8 Three empty rules, and two unreachable ones — **fixed**

`RechtOpALO` rules 18–20 have every input `-` and every output empty. Under
FIRST, rule 18 matches everything not caught earlier and returns nothing —
modelling debris that silently swallows cases. Dropped.

Rules 16 and 17, the two groen rules, both require a **running** application
(`Lopende aanvraag of uitkering = true`) — which rule 2 already refuses with
reden `99`. Both were therefore unreachable, and the model had no way to reach
groen at all. One reachable groen rule replaces them, requiring `false`.

That is worth dwelling on: the source model could not grant entitlement.

### 5.9 `informatiebehoefte` naming the wrong fact — **fixed**

The source's unknown-voorliggende-voorzieningen rule reports
`"datum vorige aanvraag"`, which is not what that column is about. Changed to
`"voorliggende voorzieningen"`. Flagged in case the text was right and the
column is wrong.

### 5.10 One person rood and the other groen matches nothing — **recorded**

`RechtOpALO` R5 needs **both** people rood; the groen rule needs **both**
groen. An applicant who is rood with an entitled partner matches no rule:
`RechtOpALO` returns no row, so `Beslissing ALO` returns an **empty result
set**.

Not closed here. Deciding what a mixed household is entitled to is policy, not
transcription. Pinned from both sides by `gap_aanvrager_rood_partner_groen` and
`gap_partner_rood_aanvrager_groen`, so whichever way Den Haag resolves it, the
change is visible.

The earlier deployable's own test suite had already found this and marked it
"Surface for design review" — recorded here so it is not rediscovered a third
time.

### 5.11 Three decisions are disconnected from the DRD — **recorded**

`TekortSchieten`, `DringendeReden` and `HardheidsclausuleToepassen` are
required by nothing. In the source model too, so it is not a flattening
artefact. Wiring them in would be a decision about when a hardship clause
applies; instead they are kept, covered as their own roots, and reported.

---

## 6. A finding about our own tooling

The runner compares `expectedOutputs` with `jq`. The first version — inherited
from the SZW runner — did this:

```jq
select((($act[.key]) // null) != .value)
```

`//` is jq's **alternative** operator: it yields the right-hand side when the
left is null **or false**. So an actual `false` became `null`, and every case
expecting a boolean `false` failed against a value the raw response plainly
contained:

```
❌ TC051_tekortSchieten_nee — tekortSchieten(expected=false,actual=null)
   Raw: [{"tekortSchieten":{"type":"Boolean","value":false,"valueInfo":{}}}]
```

Three of this suite's cases hit it — the `false` rule of each judgement
decision. It was **latent in the SZW runner**, where no case expects a boolean,
and would have stayed hidden until one did.

Fixed in both runners with an explicit `has()`, which also distinguishes an
absent key (`<missing>`) from a key that is present and null:

```jq
| ($act | has($e.key)) as $present
| select(($present | not) or $act[$e.key] != $e.value)
```

The general lesson, worth carrying to the next pass: **a comparison that cannot
distinguish `false` from absent is not a comparison.** Mutation-checking the
runner is what surfaced it, and is why the suite is mutation-checked at all.

---

## 7. What this pass inherited from Amsterdam and SZW

Applied from the start rather than rediscovered:

| from      | applied here                                                                               |
| --------- | ------------------------------------------------------------------------------------------ |
| Amsterdam | `<output name>` is required, not optional (§5.2)                                           |
| Amsterdam | no bare multi-word FEEL names (§5.5)                                                       |
| Amsterdam | a wildcard default rule needs `hitPolicy="FIRST"`                                          |
| Amsterdam | per-case `decision` routing, a self-contained runner, a validation doc, a folder CHANGELOG |
| SZW       | declare every input as `<inputData>` with a `<variable typeRef>`, so `INT-007` stays clear |
| SZW       | enumerate inputs with `<inputValues>` so the editor generates an evaluable body (§2)       |
| SZW       | carry both `expected` and `expectedOutputs`, for the DMN tab and the runner respectively   |
| SZW       | never leave an `<inputExpression>` empty (§5.3)                                            |
| SZW       | mutation-check the runner before trusting a green run (§6)                                 |
| SZW       | cross-check the generator's inventory against the DMN before emitting cases (§4)           |

New this pass, and worth carrying forward:

- An object model must be flattened to scalars before a DMN engine can evaluate
  it (§5.1).
- A fact that can be _unknown_ needs a third value, not a second boolean
  (§5.4). Collapsing six unknown-fact rules into one "information incomplete"
  boolean costs exactly the discriminating power the output existed for.
- **Routing every case through the root hides the intermediate outputs.**
  Concepts are derived from evaluate responses, so a decision that is only ever
  a `requiredDecision` never contributes its own output variable to the
  published vocabulary. Found by inspecting a published `.ttl`, not by reasoning
  about the model — see §3.
- **A comparison that cannot distinguish `false` from absent is not a
  comparison** (§6).

The last two surfaced only because the suite was run through the editor and the
result inspected, rather than checked against the engine alone. Publishing early
is part of the method, not the last step.

---

## 8. Validation status

Against `POST /v1/dmns/validate` on `acc.backend.linkeddata.open-regels.nl`:

|                           | source              | derived             |
| ------------------------- | ------------------- | ------------------- |
| `valid`                   | true                | true                |
| base / business / content | 0 / 0 / **2 info**  | 0 / 0 / 0           |
| interaction               | **28 warnings**     | **0**               |
| execution                 | 1 info (`EXEC-001`) | 1 info (`EXEC-001`) |

The 28 `INT-007` warnings were the object-graph roots of §5.1. The two
`CON-004` infos were `<variable>` elements without a `typeRef`.

`EXEC-001` remains: no `cprmv:` namespace, so no cell-level grounding. That is
deliberate for this pass. Unlike SZW, where the normenbrief TTLs publish every
norm as a `cprmv:Rule` to point at, Den Haag's 11 `knowledgeSource` elements
carry **no `locationURI` and no `type`** — they name data provenance
("Vastgesteld Inkomen", "Vastgestelde Bijstandsnorm"), not statute. Grounding
would mean inventing citations. What it would need: a resolvable URI per source,
either CVDR for Den Haag's own beleidsregels or `wetten.overheid.nl` for the
Participatiewet articles behind each one.

The legal layer is nonetheless **preserved**: all 11 `knowledgeSource` elements
are carried across with ids and names unchanged, and every one of the source's
12 `authorityRequirement` links is represented. The derived file holds **18**
rather than 12, because the source attached six of them to the single reusable
person decision, and that decision is applied twice — to the aanvrager and to
the partner — so those six appear on each. The earlier deployable dropped all 23.

They do **not** currently reach the published TTL. Verified against
[`../Aanvraag-LevensOnderhoud-ALO.ttl`](../Aanvraag-LevensOnderhoud-ALO.ttl):
zero occurrences, and `grep -rn "knowledgeSource|authorityRequirement" src/`
matches nothing — the application has no notion of DMN's legal-source layer.
A missing capability rather than a defect, tracked as
[ttl-editor#121](https://github.com/sgort/ttl-editor/issues/121) with a
suggested `prov:wasDerivedFrom` mapping. Preserving them in the DMN is still
right: they are what any future support would read, and they are visible to
anyone opening the model in a modeller.

---

## 9. Running the cases

### The runner

```bash
cd "examples/organizations/den haag/testCases"
./test-cases-alo.sh                                  # deploys, then runs all 65
SKIP_DEPLOY=1 ./test-cases-alo.sh                    # reuse what's already live
VERBOSE=1 ./test-cases-alo.sh                        # print passes too
OPERATON_URL=http://localhost:8081/engine-rest ./test-cases-alo.sh
```

Defaults to `https://operaton.open-regels.nl/engine-rest`. Requires `curl` and
`jq`. Exits non-zero if anything fails.

Current result:

```
Results: 65 passed, 0 failed (of 65)
```

Mutation-checked in every branch — a wrong string, an empty string against a
value, a **boolean false against true**, a row where an empty result set was
expected, and an empty result set where a value was expected. All five were
reported as failures, so a green run means the comparisons actually ran.

### In the CPSV Editor

The same file drives the DMN tab's **Run All Test Cases**. Each case carries a
`decision`, so the root-routed cases, the 26 person-decision cases, the three
`RechtOpALO` cases and the 6 judgement cases all route correctly from one file.

**Run the suite before publishing.** Concepts are derived from evaluate
responses, so a single evaluation of the root yields only its own three
outputs. Running all 65 unions inputs and outputs across every case, taking
the published vocabulary from 29 concepts to 37 — the same 26 inputs plus all
11 outputs across the seven decisions.

The tab reads the human-readable `expected` string rather than
`expectedOutputs`, which is why every case carries both. All 65 were verified
through that path as well, against the live engine, so none degrades to an
amber "unverified" verdict.

---

## 10. Changelog

See [`../CHANGELOG.md`](../CHANGELOG.md).
