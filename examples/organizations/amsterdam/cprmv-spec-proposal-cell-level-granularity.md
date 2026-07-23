# Proposal for the CPRMV spec owner: legislative linking below the rule level

**Context:** Municipality of Amsterdam DMN exports from iKnow (`individuele
inkomenstoeslag-iknow.dmn`, cross-referenced against the accompanying annotation export
`HvA_annotaties.xml`) surfaced a real, current need: Amsterdam already links legislation
to individual decision-table _cells_, not just to decisions or rules. This doc proposes
how to extend `cprmv:*` to support that, and flags a vocabulary inconsistency found while
working out how, that needs a decision from whoever owns the spec.

A companion doc, `cprmv-cell-level-linking-prototype.md`, works the proposal below
against one real rule of a real DMN, with every value pulled from the actual annotation
export (nothing invented). This doc is the spec-facing summary and the open questions.

## 1. The granularity gap

DMN's native authority-linking mechanism (`<authorityRequirement>` /
`<requiredAuthority>` / `<knowledgeSource>`) attaches only at `<decision>` level.
The CPRMV attributes already in production use — confirmed in
`examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn` — go one level deeper,
attaching to `<decisionTable>` (`cprmv:rulesetType`, `cprmv:ruleMethod`) and `<rule>`
(`cprmv:extends`, `cprmv:ruleType`, `cprmv:confidence`, `cprmv:validFrom`,
`cprmv:validUntil`, `cprmv:note`). Nothing currently reaches the individual
`<inputEntry>` / `<outputEntry>` — the actual cell of a decision table row.

Amsterdam's iKnow export data already models exactly this granularity independently of
DMN: a `<textannotation>` in `HvA_annotaties.xml` anchors a literal quoted span of a
source document to one abstract `<concept>`, and DMN's own `<knowledgeSource>` element
already distinguishes referencing a `<concept>` (its `<dmn:type>CPT</dmn:type>`) from
referencing a `<textannotation>` (`<dmn:type>APT</dmn:type>`) — that distinction is
already load-bearing in shipping DMN files, just never connected down to cell level.

## 2. What the abstract spec already offers — and where it doesn't line up with practice

Fetching `https://cprmv.open-regels.nl/respec/` directly turned up three properties that
look like they already anticipate this:

> **`cprmv:hasPart`** (domain: `cprmv:RuleSet`, `cprmv:Rule`) — "denotes the ordered list
> of Rule's as the parts a Rule(Set) can have and together with the cprmv:definition and
> cprmv:postDefinition properties (in case of Rule's') define the Rule(Set) by
> concatenating the definition, the definitions of the cprmv:Rule's that are part of it
> (recursively in order) and their postDefinition's"

> **`cprmv:sourceQuote`** (domain: `cprmv:Rule`, cardinality 0..1) — "replicates (a part
> of) the definition of the cprmv:Rule that is being extended"

> **`cprmv:isBasedOn`** (domain: `cprmv:RuleSet`, `cprmv:Rule`, cardinality 0..\*) — for
> Rules, "refers to the matching cprmv:Rule contained in a cprmv:RuleSet that is derived
> from"

`hasPart`'s recursive Rule-of-Rules composition is, in the abstract, exactly the
mechanism needed: treat each decision-table cell as an implicit sub-`cprmv:Rule` — a
"part" of the `<rule>` row it belongs to — each carrying its own `sourceQuote` and
`isBasedOn`.

**The problem:** none of `extends`, `implements`, `ruleType`, `confidence`,
`rulesetType`, `ruleMethod`, `note`, `title`, `description` — the attribute names
actually shipping in `RONL_BerekenLeeftijden_CPRMV.dmn` and validated by
`linked-data-explorer`'s `dmn-validation.service.ts` (`EXEC-001` through `EXEC-010`) —
appear anywhere in the fetched ReSpec document. It's not obvious from either document
whether the DMN-attribute convention is a deliberate, already-agreed serialization layer
over the abstract RDF vocabulary (in which case `extends` ≈ `isBasedOn`,
`ruleMethod` ≈ `method`, etc. and this is just undocumented) or whether the two drifted
apart independently and someone needs to reconcile them. **This needs your call before a
new cell-level attribute set gets added on top of one or the other and makes the
mismatch worse.**

## 3. Amsterdam's citation format problem, and why JuriConnect solves it

The current `cprmv:extends` value format, as shipped
(`BWBR0002221/Artikel_7a`, or with a version stamp,
`BWBR0002221_2020-01-01_0/Artikel_7a/Lid_1`), only expresses national wetgeving citations
(a BWB number). Most of Amsterdam's own sources in `HvA_annotaties.xml`'s `<documents>`
section are _not_ national wetgeving — they're gemeentelijke verordeningen,
beleidsregels, and un-typed internal `.docx` drafts with no BWB number at all (e.g.
_"Verordening Individuele Inkomenstoeslag Participatiewet Amsterdam 2021"_,
_"Beleidsregels bijzondere bijstand gemeente Amsterdam.docx"_).

iKnow already solves this on its own annotations via **JuriConnect (JCI)**, the Dutch
national standard also used by wetten.overheid.nl and lokaleregelgeving.overheid.nl —
confirmed directly in the file, e.g.:

```
juriconnect = "jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4"
```

on a `<textannotation>` whose `document` points at the Verordening above. JCI has a
defined convention (`NoBWBnumber`) for citing decentralized regulation that has no BWB
identifier — meaning it already uniformly covers both of Amsterdam's cases (national law
and local regulation) with one grammar, and iKnow is already emitting it natively: adopting
it costs nothing beyond a validator regex, versus inventing or maintaining a second citation
scheme (e.g. CVDR-specific) for the non-BWB case.

**Proposal:** adopt JCI as the value grammar for the citation property (whichever name is
decided per §2) across the board — not just for a new cell-level attribute, but as a
replacement for the current `BWBR.../Artikel_N` string at `<rule>`/`<decision>` level too,
since that string can't express Amsterdam's local sources at all today.

## 4. Concrete proposal

Attach three attributes directly to `<inputEntry>` / `<outputEntry>` (the same
foreign-namespace-attribute mechanism `cprmv:extends` etc. already use one level up —
no DMN schema change, no impact on engines that ignore unknown namespaces):

| Attribute           | Value                 | Maps to                                                         |
| ------------------- | --------------------- | --------------------------------------------------------------- |
| `cprmv:concept`     | iKnow CPT or APT UUID | `<concept id>` / `<textannotation id>` in the annotation export |
| `cprmv:sourceQuote` | verbatim quoted text  | `<textannotation><text>`                                        |
| `cprmv:isBasedOn`   | JCI citation string   | `<textannotation juriconnect="...">`                            |

Full worked example against one real rule (8 cells, showing the full range from
"complete citation" down to "rightfully ungrounded wildcard") is in
`cprmv-cell-level-linking-prototype.md`.

`cprmv:concept` has no counterpart in the abstract ReSpec vocabulary at all — it's a
practical addition for round-tripping back to a specific tool's (iKnow's) own registry,
not a redefinition of any existing property. Whether that belongs inside the shared
`cprmv:` namespace, or should be a separate tool-specific namespace instead, is one of
the open questions below.

## 5. Open questions for the spec owner

1. **Is `cprmv:isBasedOn` the same thing as the already-shipping `cprmv:extends`, or
   deliberately different?** If they're meant to be the same citation concept, one
   should be deprecated in favor of the other rather than both existing at different
   DMN-element levels.
2. **Is `cprmv:hasPart`'s Rule-of-Rules composition the intended mechanism for
   sub-rule/cell granularity**, or was it designed for a different kind of composition
   (e.g. combining several `<rule>` rows, or several `<decisionTable>`s, rather than
   cells within one row)? If it's not the right fit, does cell-level linking need a new,
   distinct property instead of reusing `hasPart`/`isBasedOn`/`sourceQuote`?
3. **Should JuriConnect (JCI) become the mandated citation format** across
   `cprmv:extends` / `cprmv:isBasedOn` / `cprmv:implements`, replacing the current ad hoc
   `BWBR0002221/Artikel_7a` string? This affects existing shipping files, not just the
   new cell-level attributes.
4. **Does `cprmv:concept` (a tool-specific traceability id) belong in the `cprmv:`
   namespace at all**, or should tool-provenance metadata like this live in a separate,
   explicitly non-normative namespace so the core CPRMV vocabulary stays tool-agnostic?
5. Once 1–4 are settled: the DMN-attribute names actually used in shipping files
   (`extends`, `implements`, `ruleType`, `confidence`, `rulesetType`, `ruleMethod`,
   `note`, `title`, `description`) should either be added to the ReSpec document as the
   documented DMN-serialization layer of the abstract vocabulary, or the ReSpec should
   clarify that the DMN attribute convention is intentionally a separate, informally
   agreed layer — right now a reader has no way to tell which is true.
