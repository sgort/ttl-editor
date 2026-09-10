# From legal model to published decision service

**A design brief.** This describes the workflow we ran three times — for
Amsterdam, SZW and Den Haag — to take a decision model produced by legal
analysis and turn it into a deployed, tested, published linked-data service.

It is written for a **UX designer** who will turn it into a visual workflow for
two audiences at once:

- **C-level** — what the pipeline guarantees, what it costs, where the risk sits.
- **Information Architects** — what happens at each stage, which artefact comes
  out, and where a human has to decide.

§10 says what the visual needs to carry, and §13 lists what is still open and
who owns it. Everything else is the material.

Every number here was measured from the repository, not estimated. Sources are
the three folder changelogs
([Amsterdam](../examples/organizations/amsterdam/CHANGELOG.md),
[SZW](../examples/organizations/szw/CHANGELOG.md),
[Den Haag](../examples/organizations/den%20haag/CHANGELOG.md)) and their
validation documents.

---

## 1. The problem in one paragraph

Dutch government bodies model their regulations in legal-analysis tools — iKnow,
Camunda Modeler, Blueriq-style object models. Those tools export DMN, the open
standard for decision models. But **an export that opens in a modeller does not
mean a model a computer can execute**, and in all three cases the delivered
export could not run. The workflow below closes that gap and, at the end,
publishes the executable model as linked data so the decision, its rules and its
legal basis are all machine-readable.

---

## 2. The three passes, side by side

|                                | **Amsterdam**                                            | **SZW**                                       | **Den Haag**                                  |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| Decision modelled              | Income schemes (inkomenstoeslag, Stadspas, kindtegoed …) | Bijstandsnorm amounts per reference date      | Entitlement to algemene levensonderhoud (ALO) |
| Source                         | iKnow export                                             | Camunda Modeler                               | Camunda Modeler, over an object model         |
| Decisions                      | 25                                                       | 2                                             | 9 → **7**                                     |
| Rules                          | 99                                                       | 25                                            | 44 → **55**                                   |
| Declared inputs                | 52                                                       | 2                                             | 2 → **26**                                    |
| Test cases                     | **100**                                                  | **121**                                       | **65**                                        |
| Decisions covered by the suite | 25                                                       | 2                                             | 7                                             |
| Legal links in the source      | 48 sources / 99 links                                    | none                                          | 11 sources / 12 links                         |
| Cell-level legal grounding     | 1 rule, 6 cells (proof of concept)                       | **80 cells**                                  | none available                                |
| Published as                   | `Digital-Twin-Inkomensregelingen.ttl`                    | `Normenbrief---Informatie-voor-gemeenten.ttl` | `Aanvraag-LevensOnderhoud-ALO.ttl`            |

Read the arrows as "before → after". Den Haag's rule count _went up_ because
rules the source could not reach were restored, not because scope grew.

The three are deliberately different in shape, and a good visual should let a
viewer see that the same workflow absorbed all three:

- **Amsterdam** is wide — 25 shallow decisions. The problem was volume and
  repetition.
- **SZW** is deep — 2 decisions, but one emits 20 amounts and the other picks
  one of them. The problem was a chained lookup over time periods.
- **Den Haag** is structural — the model was written against an object model no
  decision engine can navigate. The problem was translation.

---

## 3. The workflow

Nine stages. Stages 3, 4 and 8 are where humans decide; the rest is execution.

```
  1 RECEIVE ──▶ 2 SURVEY ──▶ 3 DECIDE ──▶ 4 DERIVE ──▶ 5 DEPLOY
                                                            │
                    ┌───────────────────────────────────────┘
                    ▼
              6 TEST ──▶ 7 PUBLISH ──▶ 8 INSPECT ──▶ 9 RECORD
                    ▲                       │
                    └───────────────────────┘
                     what publishing reveals
```

### 1 · Receive

A DMN export arrives from the body that did the legal analysis. Nothing is
assumed about it.

### 2 · Survey

Answer four questions, in this order, because each can mask the next:

1. Does it **deploy** to the decision engine?
2. Does it **evaluate** — does asking it a question return an answer?
3. What does the **validator** say? (five layers: base, business, execution,
   interaction, content)
4. Does the answer look **right**?

All three exports failed at 1 or 2. Question 4 is the one that needs the
domain expert.

### 3 · Decide _(human)_

The derivation strategy. §5 lists the actual choices made and why. This is
where the work is either honest or not: the temptation is to make the model run
by quietly changing what it decides.

### 4 · Derive

Produce a second file — `<original>-patched.dmn` — and leave the original
untouched. The original is the auditable record of what the legal analysis
delivered; the patched file is what runs. Every difference between them is
listed in the changelog.

### 5 · Deploy

Push to the decision engine (Operaton). It versions rather than replaces, so a
deployment is additive and reversible.

### 6 · Test

Build a suite with **one case per rule**, each case routed to the decision whose
rule it exercises. Run it live against the engine. §7 covers what makes a suite
trustworthy rather than merely green.

### 7 · Publish

Import the model into the CPSV Editor, attach it to a public service, evaluate
it, and export Turtle (`.ttl`) — the linked-data form. Validate that against the
SHACL shapes (CPRMV 0.4.1, CPSV-AP 3.2.0, RONL).

### 8 · Inspect _(human)_

**Read the published file.** This is not a formality, and it is the stage most
likely to be skipped. §9 lists four findings that only appeared here — three of
them in tooling we had already been using for weeks.

### 9 · Record

Three documents per pass, always:

| artefact                               | answers                                            |
| -------------------------------------- | -------------------------------------------------- |
| `CHANGELOG.md`                         | what changed, when, and why                        |
| `testCases/test-cases-validation-*.md` | why each case exists; every finding; how to re-run |
| `testCases/test-cases-*.sh`            | a self-contained runner anyone can execute         |

Plus the machine-readable suite (`*.json`) and, where the model is
regression-critical, an end-to-end browser test and a pinned copy of the model.

---

## 4. What kept going wrong

The same defect families recurred. This catalogue is the workflow's real asset:
by the third pass most were checked for rather than discovered.

| Defect                                         | Effect                                                                                                                             | Found in                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Output column with no `name`, only a label     | Engine throws a **blank, unlogged** error — but only once every input resolves, so it hides behind any other defect                | Amsterdam, Den Haag (6 of 9 outputs) |
| Multi-word bare names (`Om niet`)              | The expression parser cannot read them                                                                                             | Amsterdam, Den Haag                  |
| Empty input expression                         | **Invalid model that works** — the engine guesses from a variable name; fails later when something unrelated changes               | SZW, Den Haag                        |
| Missing history setting                        | Refuses to deploy                                                                                                                  | Amsterdam                            |
| Unescaped `&` in a URL                         | Invalid XML                                                                                                                        | Amsterdam (48)                       |
| Malformed conditions (`not -`, `>= X and < Y`) | Silently resolve to the wrong thing                                                                                                | Amsterdam (56)                       |
| A wildcard default under the wrong hit policy  | Two rules match where one must                                                                                                     | Amsterdam                            |
| Value type contradicting its own cells         | Right answer, wrong type, **no warning**                                                                                           | SZW                                  |
| `n/a` used as a condition                      | Not a valid value in the language                                                                                                  | Den Haag (10)                        |
| Object-model navigation                        | No decision engine can follow it                                                                                                   | Den Haag (3 decisions)               |
| Empty placeholder rules                        | Match everything not caught earlier, return nothing                                                                                | Den Haag (3)                         |
| Unreachable rules                              | **Den Haag's model could not grant entitlement at all** — both approval rules required a condition an earlier rule already refuses | Den Haag                             |
| Amounts copied into the wrong cell             | Wrong benefit paid                                                                                                                 | SZW (2 half-years)                   |
| Two different inputs mapped to one output      | Two situations answered identically                                                                                                | SZW                                  |
| Outputs no input could reach                   | 7 of 20 amounts unobtainable                                                                                                       | SZW                                  |

For C-level, the summary is: **every one of these is invisible until the model is
executed, and several are invisible even then.** That is what the test suite is
for.

---

## 5. Where humans decide

A workflow diagram that shows only boxes and arrows will imply this is
automatable. It is not. These are the decisions actually taken:

| Decision                      | The real choice                                    | What was chosen, and why                                                                     |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Which file is the deliverable | Patch the original, or derive a new one            | Derive. The original stays as the auditable record of what legal analysis delivered.         |
| A wrong amount                | Correct it, or leave and report                    | **Report.** Corrected only once a second published source confirmed it.                      |
| A missing reason code         | Invent one, or leave the rule untestable           | Invent, and **flag it as the only value in the model with no source**.                       |
| An unreachable output         | Extend the model, or record the gap                | Extended where the vocabulary was mechanical (SZW); recorded where it was policy (Den Haag). |
| A rule that matches nothing   | Fix the logic, or record it                        | **Record.** What a mixed household is entitled to is policy, not transcription.              |
| Disconnected decisions        | Wire them in, or leave them                        | Leave. Wiring them in would decide when a hardship clause applies.                           |
| Unknown facts                 | A second boolean, or a third value                 | A **third value**. See §6.                                                                   |
| Legal grounding               | Ground against inferred citations, or don't ground | Ground only where published sources exist (SZW). Den Haag has none, so no grounding.         |

The governing principle, and the one C-level most needs to see:

> **We fix what is provably broken. We report what is arguably wrong.**
> A model that runs but decides something nobody authorised is worse than one
> that does not run.

---

## 6. Two ideas worth a panel of their own

Both are counter-intuitive, both changed the outcome, and both are easy for a
visual to lose.

### "Unknown" is a third value, not a second flag

Den Haag's source model tracked, for each of six facts per person, whether it was
true, false, **or not yet established** — and when a fact was missing it said
_which one_. An earlier attempt collapsed all six into a single "information
incomplete" flag.

Both versions run. Both are "correct". But one can tell a caseworker _"we need
the residence permit"_ and the other can only say _"something is missing"_. The
output existed precisely to carry that distinction, and collapsing it discarded
the model's most useful answer while appearing to simplify.

Restoring it turned 1 rule back into 6, per person.

### Publishing is a discovery step, not the last step

Stage 8 exists because inspecting the published file found things nothing
earlier had:

- An intermediate value — **the colour the entire Den Haag model turns on** —
  was missing from the published vocabulary, because every test case had been
  routed through the top-level decision and nothing ever asked the middle one
  directly.
- The legal-source layer never reached the published file at all, because the
  editor has no notion of it (§9).

Neither is visible from the model, or from a green test suite. Only from the
artefact.

---

## 7. What makes the testing trustworthy

C-level will ask whether "all tests pass" means anything. Four practices, in
increasing order of how much they surprise people:

1. **One case per rule.** Not per feature or per happy path. 100, 121 and 65
   cases for 99, 25 and 55 rules.
2. **The suite does not trust the model.** Each generator holds its own
   independent copy of the expected answers and refuses to emit a single case if
   that copy disagrees with the model — because a suite generated _from_ the
   thing under test proves nothing.
3. **The runner is tested too.** Deliberately broken expectations are fed in to
   confirm each is reported as a failure. This is not theatre: it found a real
   defect in our own comparison logic that had been silently treating "false" as
   "no answer" (§9).
4. **Both verdict paths are checked.** The command-line runner and the editor's
   own pass/fail logic read the expectations differently, so both are exercised
   against the live engine.

Together these mean a green run is evidence, not reassurance.

---

## 8. What comes out

Per pass, in the repository:

```
examples/organizations/<body>/
├── <original>.dmn                     the export, untouched
├── <original>-patched.dmn             what actually runs
├── CHANGELOG.md                       what changed and why
├── <published>.ttl                    the linked-data service
└── testCases/
    ├── <name>-test-cases.json         the suite, machine-readable
    ├── test-cases-validation-<x>.md   the reasoning and the findings
    └── test-cases-<x>.sh              a runner anyone can execute
```

And live: a deployed, versioned decision on the engine, callable over HTTP with
a documented request body.

---

## 9. Findings the workflow produced about our own tooling

Worth showing, because it demonstrates the pipeline inspects itself. Three
improvements to the editor came out of these passes, and two defects came out of
publishing:

| Finding                                                                                                                         | How it surfaced                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Published outputs were silently empty whenever a model's evaluation returned no rows                                            | Republishing Amsterdam                                                                                  |
| The linked-data generator overwrote a legal rule's real identifier with its own web address, in 12 places in one published file | Inspecting the SZW artefact ([#116](https://github.com/sgort/ttl-editor/issues/116), fixed)             |
| The test runner treated a "false" answer as "no answer"                                                                         | Mutation-testing the Den Haag runner — latent in the SZW runner, which had no boolean case to expose it |
| The editor reads no part of DMN's legal-source layer, so 23 provenance links never reach the published file                     | Inspecting the Den Haag artefact ([#121](https://github.com/sgort/ttl-editor/issues/121), open)         |
| An intermediate decision's output was absent from the published vocabulary                                                      | Inspecting the Den Haag artefact after a second publish                                                 |

---

## 10. What the visual needs to carry

### The two audiences want different things from the same diagram

|                       | **C-level**                                                       | **Information Architect**                                            |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| First question        | "Can we trust the output?"                                        | "What happens at each step?"                                         |
| Wants to see          | the gates, and who is accountable at each                         | the artefact that enters and leaves each stage                       |
| Cares about           | the risk of a model that runs but decides wrongly                 | the decision points and what was chosen                              |
| Numbers that land     | 3 bodies, 179 rules, 286 test cases, 0 failures                   | per-pass rule and case counts, defects per family                    |
| Should leave thinking | "this is repeatable and it is honest about what it does not know" | "I could run this on our model, and I know where I'd have to decide" |

### Five things that must survive the visual

1. **Stage 8 loops back to stage 6.** Publishing is a discovery step. If the
   diagram is a straight line, it teaches the wrong thing.
2. **The three human decision points are visibly different** from the execution
   stages. Different shape, not just a different colour.
3. **"Fix what is provably broken, report what is arguably wrong"** belongs on
   the page, not in a footnote. It is the trust claim.
4. **The original file is never modified.** Two files side by side, throughout.
5. **The defect catalogue grows across the passes.** Amsterdam discovered most
   of it; by Den Haag the same checks were run up front. That is the return on
   doing this three times, and it is the argument for a fourth.

### What the visual must not imply

- **Not fully automated.** Three stages need a human, and one needs a domain
  expert who can say whether an answer is _right_.
- **Not a validation tool.** The validator passed all three exports as "valid"
  while none of them could run correctly. Passing validation is a weak signal;
  the diagram should not put a tick next to it.
- **Not finished at publish.** See point 1.
- **Not a legal opinion.** The pipeline reports questions to the responsible
  body; it does not answer them.

### Practical notes

- **Terms to keep in Dutch** (they are the domain's own, and translating loses
  precision): _bijstandsnorm_, _peildatum_, _termijn_, _rechthebbende_,
  _informatiebehoefte_, _bijstandsvorm_, _hardheidsclausule_.
- **Terms to translate or gloss for C-level**: DMN (a decision model), Turtle /
  TTL (linked-data file), SHACL (a conformance check), hit policy (which rule
  wins), CPSV-AP (the EU standard for describing public services).
- **A useful visual metaphor for the traffic-light outputs**, which all three
  models share: **rood** = refused, **oranje** = information needed, **groen** =
  entitled. Den Haag's model turns entirely on this, and it is the most
  immediately legible idea in the whole pipeline.
- **Suggested single-sentence summary** for the top of a C-level view: _"Three
  regulations, modelled by lawyers, turned into decision services that can be
  executed, tested rule by rule, and published as machine-readable law."_

---

## 11. Where to look for detail

| For                                             | Read                                                                                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A worked example, largest                       | [`amsterdam/CHANGELOG.md`](../examples/organizations/amsterdam/CHANGELOG.md) and [`testCases/test-cases-validation-hva.md`](../examples/organizations/amsterdam/testCases/test-cases-validation-hva.md)                   |
| Cell-level legal grounding at scale             | [`szw/testCases/test-cases-validation-pw.md`](../examples/organizations/szw/testCases/test-cases-validation-pw.md) §6                                                                                                     |
| A model that had to be re-derived, not patched  | [`den haag/testCases/test-cases-validation-alo.md`](../examples/organizations/den%20haag/testCases/test-cases-validation-alo.md) §5                                                                                       |
| What each pass inherited from the previous ones | [`den haag/testCases/test-cases-validation-alo.md`](../examples/organizations/den%20haag/testCases/test-cases-validation-alo.md) §7                                                                                       |
| How the legal sources were traced               | [`amsterdam/testCases/extract-legal-sources.py`](../examples/organizations/amsterdam/testCases/extract-legal-sources.py) and [`legal-sources-hva.md`](../examples/organizations/amsterdam/testCases/legal-sources-hva.md) |

---

## 12. A note on the totals

**3 bodies · 34 decisions · 179 rules · 286 test cases · 0 failures.**

Two caveats worth keeping attached to that headline, because a designer will
reasonably want to use it:

- The 179 rules are the **published** models. Two of the three grew during
  derivation (Den Haag 44 → 55, SZW 17 → 25), so it is not a count of what legal
  analysis delivered.
- "0 failures" means every case passes against the live engine **today**. It
  does not mean the models are legally correct. Four decisions are awaiting the
  responsible body, plus one flagged assumption, and one value in the Den Haag
  model has no source at all. They are listed in §13 — use that list rather
  than the bare number.

Being precise about that distinction is the difference between a diagram that
earns trust and one that overclaims.

---

## 13. What is still open, and who owns it

§12 counts four decisions awaiting the responsible body. Here they are,
because a number without a list is not usable in a diagram.

### Four decisions awaiting the responsible body

| #   | Pass         | Question                                                                                                                                | Consequence if answered differently                                                                                                                                                                                             |
| --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **SZW**      | Do `JO` / `JOK` belong to Art. 20 **lid 1 c** rather than lid 2 c? Both carry the lid 2 c amount in all five termijnen.                 | The _amount_ is confirmed by a second published source; what would change is the article cited as its basis, and whether an 18/19/20-year-old with an AOW-age partner and **no** child should receive the _with children_ norm. |
| 2   | **Den Haag** | What is the correct **reden code** for the ongeoorloofd-onbetaald-verlof rule? The source has a literal `???`.                          | `"04"` was adopted so the rule could be tested. It is the only value in any of the three models with no source.                                                                                                                 |
| 3   | **Den Haag** | What is a **mixed household** entitled to — one person refused, the other entitled?                                                     | Today the model matches no rule and returns nothing. Any answer adds a rule; which answer is policy, not transcription.                                                                                                         |
| 4   | **Den Haag** | Should `TekortSchieten`, `DringendeReden` and `HardheidsclausuleToepassen` be **wired into** the decision? Nothing requires them today. | Connecting them decides _when a hardship clause applies_, which is why they were left standalone and reported.                                                                                                                  |

### Plus one flagged assumption

Recorded inside a finding marked _fixed_, so it is not blocking, but it is
still awaiting an answer:

> **Den Haag** — the unknown-voorliggende-voorzieningen rule reported an
> `informatiebehoefte` of `"datum vorige aanvraag"`, which names a different
> fact than its own column. Changed to `"voorliggende voorzieningen"` — flagged
> in case the text was right and the column is wrong.

So the defensible phrasing is **"four decisions awaiting the responsible body,
plus one flagged assumption"**, not a bare four.

### Three lanes, not one list

Everything above is a question for a **government body about its own
regulation**. Two other kinds of open item exist and should not be folded into
that count, because the addressee differs and so does what "resolved" means:

| Lane               | Addressee                        | Open now                                                                                                             |
| ------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **The regulation** | the government body that owns it | the four above, plus one flagged assumption                                                                          |
| **The standard**   | the CPRMV specification owner    | 2 — identifier stability across re-exports, and `ruleType` / `rulesetType`                                           |
| **The tooling**    | us                               | 1 — [#121](https://github.com/sgort/ttl-editor/issues/121), the legal-source layer never reaching the published file |

Amsterdam also has a data-quality observation rather than a question: 2 of its
99 legal links do not resolve against the annotations file they point into.

### One thing the visual should not imply

**All four belong to two of the three passes. Amsterdam contributes none.**

Three are Den Haag's and one is SZW's. A diagram suggesting that every pass
leaves questions behind would get this backwards, and the truth is more
interesting: Amsterdam's 99 rules were legally coherent once the technical
defects were fixed, whereas Den Haag's model had genuine policy holes — a
household it could not decide, and three decisions connected to nothing.

That difference is worth showing. It is the distinction between _"this export
was broken"_ and _"this regulation was not finished"_, and only executing the
model reveals which one you have.
