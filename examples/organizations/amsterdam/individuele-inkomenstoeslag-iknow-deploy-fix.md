# Deploy failure: `individuele inkomenstoeslag-iknow.dmn`

## Symptom

Deploying `individuele inkomenstoeslag-iknow.dmn` to Operaton fails with:

```
ProcessEngineException: ENGINE-22004 Unable to transform DMN resource
'individuele inkomenstoeslag-iknow.dmn'.
```

The full server-side stack trace (from the Operaton container logs) shows the actual cause:

```
Caused by: DmnTransformException: DMN-02016 Error while transforming decision requirements graph:
DMN-02011 The decision table input 'DmnDecisionTableInputImpl{id='null', name='null',
expression=null, inputVariable='null'}' of decision 'DecisionDefinitionEntity{...
name='Beslistabel bepalen aanspraak op individuele inkomenstoeslag', ...}'
must have a 'id' attribute set.
```

## Root cause

The file was exported from iKnow via Camunda Modeler 5.45.0. That export omits the `id`
attribute on decision-table clause elements. Per the DMN 1.3 XSD this is legal — `id` is
optional on these elements — but **Operaton's DMN transformer requires it**, so the file
parses as valid DMN XML yet still fails at deploy time.

Element counts missing `id` in the original file:

| Element           | Missing `id` count |
| ----------------- | ------------------ |
| `dmn:input`       | 23                 |
| `dmn:output`      | 8                  |
| `dmn:rule`        | 25                 |
| `dmn:inputEntry`  | 84                 |
| `dmn:outputEntry` | 25                 |

Deployment fails on the very first offending element, so this error message only ever
reports one instance — the rest are latent until the first one is fixed.

## Why the CPSV Editor's own validator didn't catch it

`linked-data-explorer/packages/backend/src/services/dmn-validation.service.ts` runs a
5-layer syntactic validation pass and reported this file as "Syntax valid" (83 warnings,
1 info, 0 errors). Its Business Rules layer (`BIZ-001`–`BIZ-009`) checks hit policy values,
`typeRef` presence/validity, and rule/entry-count consistency — but it never checks that
`input` / `output` / `rule` / `inputEntry` / `outputEntry` elements carry an `id` attribute.
That's a real gap in the validator (tracked separately — see the corresponding change in
the `linked-data-explorer` repo), not a false negative caused by user error.

## Fix

`individuele inkomenstoeslag-iknow-patched.dmn` is a copy of the original with a generated
`id` attribute (`_input_N`, `_output_N`, `_rule_N`, `_inputEntry_N`, `_outputEntry_N`) added
to every element listed above that was missing one. No other content changed — same
decisions, same rules, same expressions, same DRD wiring.

Verified against the local Operaton instance (`http://localhost:8081/engine-rest`):
the patched file deploys cleanly, producing all 8 decision definitions plus the decision
requirements definition, and was subsequently removed again (test deployment only).

The original `individuele inkomenstoeslag-iknow.dmn` is left untouched.

---

## LDE DMN Validator patches

Debugging this file surfaced three defects in the validator itself
(`linked-data-explorer/packages/backend/src/services/dmn-validation.service.ts`), on top
of the missing-`id` gap noted above. All three were fixed on branch
`fix/dmn-validation-missing-element-ids` (off `acc`, not yet merged/committed at time of
writing). See `dmn-validation-reference.md` for the full code reference this validator
implements — the additions below follow the same `BIZ-*` / `INT-*` numbering and severity
conventions.

### New codes: BIZ-010–BIZ-014 — missing `id` on decision table clause elements

|               |                                                                                                                                                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**  | 🔴 error                                                                                                                                                                                                                                                                                                         |
| **Trigger**   | A `<input>` (BIZ-010), `<output>` (BIZ-011), `<rule>` (BIZ-012), `<inputEntry>` (BIZ-013), or `<outputEntry>` (BIZ-014) element is missing the `id` attribute                                                                                                                                                    |
| **Rationale** | This is the root cause documented above: the DMN 1.3 XSD marks `id` optional here, but Operaton's transformer requires it and throws `DMN-02011` at deploy time otherwise. Before this patch the validator reported files with this defect as fully valid — a deploy-time failure with zero design-time warning. |
| **Fix**       | Add a unique `id` attribute to every flagged element.                                                                                                                                                                                                                                                            |

### Updated: INT-007 — whole-string match before word-tokenizing

**Problem:** FEEL names are legally allowed to contain spaces, and this file's RONL/Dutch
authoring convention leans on that heavily — e.g. `"natuurlijke persoon.woonachtig in de
gemeente waar wordt aangevraagd"` is _one_ declared `<inputData name="...">`, referenced
verbatim as a bare `<inputExpression>` text. The old `extractFeelIdentifiers()` tokenizer
had no way to recognise a multi-word string as a single name, so it shredded every bare
multi-word reference into individual words (`"natuurlijke"`, `"persoon"`, `"de"`,
`"gemeente"`, `"waar"`, `"wordt"`, ...) and flagged each one as an unresolved variable —
83 warnings from this cause alone on this file.

**Fix:** before tokenizing, the exact trimmed `<inputExpression>` text is now checked
against the declared/produced name set (`inputData` names ∪ resolved `requiredDecision`
output names) as one literal name. Only when that whole-string match fails does the code
fall back to word-level tokenization — which is then the correct signal that the
expression is actually compound (an operator expression or function call), not a bare
name reference.

### Updated: `FEEL_RESERVED` — added date/time component functions

**Problem:** `year(peildatum)` appears in two decision tables (`Bepalen van toepassing
zijnde loongrens ...` and `Bepaal pensioengerechtigde leeftijd`). `FEEL_RESERVED` already
excluded the built-in wrappers `date`, `time`, `duration`, `number`, `string` from being
treated as variable references, but not the single-word FEEL date/time component
functions — so `"year"` itself was flagged as an unresolved variable, 4 times.

**Fix:** added `year`, `month`, `day`, `hour`, `minute`, `second` to `FEEL_RESERVED` —
same category as the built-ins already excluded.

### Validation result, before and after

| Stage                                  | Business Rules                     | Interaction Rules | File valid?                                      |
| -------------------------------------- | ---------------------------------- | ----------------- | ------------------------------------------------ |
| Original validator (before this patch) | 0E                                 | 83W               | ✅ "Valid" — false negative on the original file |
| After BIZ-010–014 added                | **165E** (original) / 0E (patched) | 83W               | ❌ original / ✅ patched                         |
| After INT-007 whole-string fix         | 165E / 0E                          | 16W               | ❌ original / ✅ patched                         |
| After `FEEL_RESERVED` fix (final)      | 165E / 0E                          | **12W**           | ❌ original / ✅ patched                         |

Final state, confirmed against the live backend (`POST /v1/dmns/validate`):

- `individuele inkomenstoeslag-iknow.dmn` (original): `valid: false`, 165 errors, 12 warnings, 1 info.
- `individuele inkomenstoeslag-iknow-patched.dmn`: `valid: true`, 0 errors, 12 warnings, 1 info.

---

## Open issues

Two items surfaced during this work that are **not fixed** — either because the correct
fix is a meaningfully larger change than what was scoped, or because it isn't a validator
problem at all. Both are left for a deliberate follow-up decision.

### 1. Multi-word FEEL names embedded inside compound expressions (residual INT-007, 12 warnings)

The whole-string fix above only catches **bare** references — an `<inputExpression>` whose
entire text is exactly one declared name. It does not help when a multi-word name is
embedded as an _argument inside_ a larger expression, e.g.:

```
years(years and months duration(natuurlijke persoon.geboortedatum, peildatum))
```

Here `"natuurlijke persoon.geboortedatum"` is a declared `inputData` name, but because
it's nested inside a function call rather than being the entire expression text, the
tokenizer still splits it into `"natuurlijke"` and `"persoon"` and flags both. This
accounts for 9 of the 12 remaining warnings (words from `"natuurlijke
persoon.geboortedatum"`, `"natuurlijke persoon.langdurig laag inkomen"`, and
`"natuurlijke persoon.een schuldregeling"`, each referenced inside a larger expression in
one of the decision tables).

The other 2 of the 12 (`"years"`, `"months"`) are the same underlying problem one level
up: `years and months duration(...)` is itself a multi-word FEEL _built-in function name_
(per the DMN 1.3 spec), not a user-declared name. `FEEL_RESERVED` only excludes reserved
words as single tokens (`"and"`, `"duration"` are both already in the set), so `"years"`
and `"months"` — the two words that aren't otherwise reserved — leak through. Fixing this
narrowly (special-casing one multi-word built-in) felt like the wrong shape of fix given
the general problem below is still open; a longest-match tokenizer that also recognised
known multi-word FEEL built-in function names would close both at once.

**Proper fix would require a greedy longest-match tokenizer:** at each token position, try
progressively longer runs of consecutive words against the declared-name set and consume
the longest match as a single identifier; only fall back to single-word tokenization when
no run matches at that position. This is a materially bigger change to
`extractFeelIdentifiers()` than the whole-string pre-check (which only had to compare one
candidate — the full trimmed text — against the name set once per expression); the
longest-match version has to do that comparison at every token position with every
possible run length, against every decision's specific candidate-name set. Not
implemented — flagging here so it's a deliberate decision, not a silent gap.

### 2. `berekeningsjaar` — possible real DRD wiring gap in the DMN content itself

This one is **not a validator bug** — it may be a genuine authoring issue in the DMN.

The decision _"Bepalen van toepassing zijnde vermogensgrens"_
(`_912d27e0-1b8f-47bd-98cf-1863354ef321`) has an input labelled `"vorig jaar"` whose
`<inputExpression>` text is simply `berekeningsjaar-1` — it assumes `berekeningsjaar` is
already bound as a variable in scope. But `berekeningsjaar` is never declared as an
`<inputData>`, and no decision exposes it as an output (`<decision><variable>` or
`<output name="berekeningsjaar">`) anywhere in the file.

Every _other_ place `berekeningsjaar` shows up (e.g. in _"Bepalen van toepassing zijnde
loongrens vorig jaar voor volwassenen"_ and \*"Bepaal pensioengerechtigde leeftijd"`) it is
a **local, per-table input column** computing `year(peildatum)` — a value private to that
one decision table's own evaluation, never exposed for other decisions to consume by
name. In DMN's evaluation model, one decision table's input-column expression is not a
named variable other decisions can reference.

If `berekeningsjaar` isn't supplied directly as an external evaluation variable at
runtime, `berekeningsjaar-1` will evaluate against `null`, and the vermogensgrens lookup
in that decision table will fail to match any rule (all three rules gate on
`berekeningsjaar-1 = 2024`). This is worth confirming with whoever owns the iKnow source
before publishing — either `berekeningsjaar` needs to become a proper shared `<inputData>`
or its own small decision, or this is intentionally supplied externally and the DMN is
fine as-is.
