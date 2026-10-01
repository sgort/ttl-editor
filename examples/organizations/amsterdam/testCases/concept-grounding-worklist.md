# Concept-grounding work list — extending cell-level grounding across the DRD

Companion to [`concept-grounding-worklist.csv`](concept-grounding-worklist.csv).

The round logged in the [CHANGELOG](../CHANGELOG.md) as step 11 enriched the six
grounded cells on Rule 1 using the `@concept` link in
[`HvA_annotaties.xml`](../HvA_annotaties.xml). This document reports what happens
when the same approach is pointed at the **rest** of the DRD, and why the result
is a list to be confirmed rather than a patch to be applied.

## The short version

The link enriches a cell that is **already grounded**. It cannot decide **which**
concept grounds a cell that is not, because the DMN and the annotation export
name the same facts in two different languages and nothing records the
correspondence between them.

|                                             |         |
| ------------------------------------------- | ------- |
| Cells in the DRD                            | **762** |
| of which wildcards (`-`), nothing to ground | 377     |
| **groundable**                              | **385** |
| already grounded                            | 6       |

Those 385 cells sit under **80 distinct columns** — a column, not a cell, is the
unit that names a fact, so grounding is decided once per column and applies to
every cell beneath it.

## Why this cannot be automated

The DMN names facts as camelCase technical variables; the annotation export names
them as Dutch phrases:

```
npVermogen31DecemberVorigJaar      vs.   "Aanvrager heeft vermogen"
kindAanspraakStadspas              vs.   "kind beschikt over een geldige Stadspas"
                                         "aanspraak kindtegoed Stadspas"
                                         "Aanspraak stadspas"
```

Seven of the 80 columns are not facts at all but **computed FEEL expressions**
(`peildatum.year`, `(years and months duration(npGeboortedatum, peildatum)).years`).
These govern 32 cells and should not be grounded: they derive a value, they do not
assert a legally relevant fact. That leaves **73 columns over 353 cells**.

Matching those 73 against the 360 concepts — restricted by concept type, and
requiring the subject to agree, since the DMN encodes it in the `np`/`kind`/`partner`
prefix and the concept names it in words — gives:

| verdict                                      | columns | cells   |
| -------------------------------------------- | ------- | ------- |
| exact token match                            | **0**   | 0       |
| clear winner                                 | 10      | 38      |
| **ambiguous — several plausible candidates** | **51**  | **249** |
| no candidate of the right type               | 12      | 66      |

**Roughly 70% of the groundable cells sit under a column with no defensible
automatic answer.** And the "clear" column is not safe either: its largest member
was `peildatum.year → peildatum`, a computed expression, and
`pensioengerechtigdeLeeftijd` resolves to _"pensioengerechtigde leeftijd
**bereikt**"_ — a condition, where the column holds a value.

### What was checked before concluding this

- **`field-mapping.md`** maps the editor's UI fields to RDF properties. It says
  nothing about DMN variables.
- **The export's 586 `<property>` elements.** Two names looked exactly right —
  _"Heet als invoer"_ (37) and _"Heeft als uitvoer"_ (12). Both turn out to carry
  `type="reference"` pointing at another concept: they describe the knowledge
  model's **own** input/output dependency graph, not a binding to a DMN variable.
  32 of the 37 resolve to a concept, 5 dangle.
- **Every `<property>` value**, for anything shaped like a camelCase identifier.
  There are none.

So the correspondence is not recorded anywhere in the material we hold. It exists
only in the heads of the people who built both sides.

## One result that argues the method is sound

Where the matcher is confident it agrees with human judgement. Run against
`npGezinssituatie`, it returns concept `8bf152a7-22a1-4624-b43b-aa9c9ff68b30`
— **the identical concept a modeller chose by hand for cell `_inputentry_152`**,
derived independently from the column name alone.

That is the argument for the work list rather than against it: the proposals are
worth reviewing. It is not an argument for applying them unreviewed, because the
same matcher confidently proposes `Aanspraak stadspas` for `kindAanspraakStadspas`,
dropping the distinction between a child's entitlement and an adult's.

## How to use the CSV

One row per column, **ordered by how many cells it would ground**, so the work is
prioritised by payoff. Each row carries up to three candidate concepts with their
type, id, score and — where the concept's annotations supply one — a JuriConnect
citation.

| column                 | meaning                                                   |
| ---------------------- | --------------------------------------------------------- |
| `groundable_cells`     | how many non-wildcard cells this decision would ground    |
| `verdict`              | `clear`, `ambiguous`, or `no candidate`                   |
| `candidate_1..3`       | ranked proposals, with `concept_id_N` and `juriconnect_N` |
| `confirmed_concept_id` | **empty — to be filled in by a modeller**                 |

Filling in `confirmed_concept_id` is the whole task. Once a row carries one, the
rest is mechanical: the patch that produced step 11 applies unchanged, taking the
name and type from the concept and the citation from its annotations, and the
existing verification loop (deploy, 100 test cases, SHACL) proves the result
changes no answer.

A row left blank is a perfectly good outcome. A wrong `confirmed_concept_id` is
not — it attaches a legal citation to a condition it does not govern, which is
worse than leaving the cell ungrounded.

## What this is not

It is not a claim that the remaining 379 cells cannot be grounded. They can, and
the top of the list is where it pays: the 12 highest-value columns alone govern
**172 cells**, nearly half the groundable total. It is a claim that grounding them
is a modelling decision, and that the tooling's job is to put the decision in front
of someone who can make it rather than to guess.

This is the same line the three delivery passes held for the conflicting citations
on `_inputentry_152`: record the ambiguity, do not resolve it by inference.
