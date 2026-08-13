# Proposal for the CPRMV spec owner: legislative linking below the rule level

## Changelog

| Date       | Change                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-13 | §6 open questions 1–6 marked resolved with the spec owner's actual answers; fixed the `cprmv:implements` factual error; new open question 8 on `ruleType`/`rulesetType`                                            |
| 2026-08-13 | §3 revised per spec owner's answer: dropped the JCI-mandate proposal, replaced with `ReferenceMethod`/"rule id path" framing (JCI/ELI for external citations, an internal method for our own minted `cprmv:Rule`s) |
| 2026-08-13 | §5 revised per spec owner's answers to Q4/Q5: concepts minted once as their own `cprmv:Rule`, shared via `isBasedOn`, reversing the old "don't mint concept-only cells" rule                                       |
| 2026-08-13 | §4 revised per spec owner's answer: dropped `cprmv:concept`, folded concept references into `cprmv:isBasedOn`                                                                                                      |
| 2026-08-13 | §5 cell URIs reworked to key off `<inputEntry>`/`<outputEntry>` `id` instead of column position, following a re-export of the source DMN that added these ids; new open question 7 on cross-export id stability    |
| 2026-07-23 | Added multiple-groundings-per-cell case, tested against Operaton, §4/§5/open questions updated                                                                                                                     |
| 2026-07-23 | Initial proposal: granularity gap, confirmed SHACL properties, JCI argument, TTL sketch                                                                                                                            |

**Context:** Municipality of Amsterdam DMN exports from iKnow (`individuele
inkomenstoeslag-iknow.dmn`, cross-referenced against the accompanying annotation export
`HvA_annotaties.xml`) surfaced a real, current need: Amsterdam already links legislation
to individual decision-table _cells_, not just to decisions or rules. This doc proposes
how to extend `cprmv:*` to support that, sketches a concrete design for how it would flow
through to a published `.ttl`, and flags a vocabulary question that needs a decision from
whoever owns the spec.

A companion doc, `cprmv-cell-level-linking-prototype.md`, works the full DMN-to-TTL
pipeline against one real rule of a real DMN, with every value pulled from the actual
annotation export (nothing invented). This doc is the spec-facing summary, the sketch,
and the open questions.

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

But a DMN in this project is never published on its own — it's imported by our CPSV
Editor and becomes part of a `.ttl` file (a `cprmv:DecisionModel`), which is what
actually gets validated and published. So this proposal is scoped across both layers:
the DMN attribute, and how it becomes a real triple.

## 2. What's already confirmed, not just abstract

An earlier draft of this doc treated `cprmv:hasPart`, `cprmv:sourceQuote`, and
`cprmv:isBasedOn` as abstract RDF/OWL properties described only in the ReSpec document
at `https://cprmv.open-regels.nl/respec/`. They're more than that — they're **already
shipping, SHACL-validated properties**, confirmed directly in
`linked-data-explorer/packages/backend/shapes/cprmv/0.4.1/cprmv.shacl.ttl`:

```turtle
cprmv:RuleShape
    a sh:NodeShape ;
    sh:targetClass cprmv:Rule ;
    sh:property [ sh:path cprmv:id ; sh:minCount 1 ] ;
    sh:property [ sh:path cprmv:definition ; sh:maxCount 1 ] ;
    sh:property [ sh:path cprmv:postDefinition ; sh:maxCount 1 ] ;
    sh:property [ sh:path cprmv:sourceQuote ; sh:maxCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path cprmv:comment ; sh:maxCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path cprmv:isBasedOn ; sh:class cprmv:Rule ; sh:minCount 0 ] ;
    sh:property [ sh:path cprmv:hasPart ; sh:node cprmv:hasPartListShape ; sh:maxCount 1 ] .

cprmv:hasPartListShape a sh:NodeShape ;
  sh:or (
    [ sh:hasValue rdf:nil ]
    [
      sh:property [ sh:path rdf:first ; sh:maxCount 1 ; sh:class cprmv:Rule ] ;
      sh:property [ sh:path rdf:rest ; sh:maxCount 1 ; sh:node cprmv:hasPartListShape ] ;
    ]
  ) .
```

This changes the shape of the ask. `hasPart` isn't a candidate mechanism we'd be
borrowing speculatively — it's a real, recursive, already-implemented ordered-list
pattern, **already legal directly on `cprmv:Rule`** (not only on `RuleSet`, where it's
the only place currently populated — see `field-mapping.md`: _"Each unique rulesetId
also produces a cprmv:RuleSet ... that lists its rules via an ordered cprmv:hasPart"_).
Nothing in the shape set stops a `cprmv:Rule` from `hasPart`-ing further `cprmv:Rule`s of
its own. **No new SHACL shape is required** to represent cell-level composition — it's
already legal, just never populated below the RuleSet→Rule level.

One correction this also forces on the earlier draft: **`cprmv:isBasedOn` is an object
property** (`sh:class cprmv:Rule`, or `sh:class cpsv:Rule` in `cprmv:TemporalRuleShape`).
Its value must be a resource itself typed as a Rule — not a bare citation string. Our own
generator (`ttl-editor/src/utils/ttlGenerator.js`, lines 1229–1233) already respects this
today for rule-level `cprmv:extends` → `cprmv:isBasedOn`, turning the string into a URI:

```js
if (rule.extends) {
  const extendsUri = rule.extends.startsWith('http')
    ? rule.extends
    : `https://wetten.overheid.nl/${rule.extends}`;
  ttl += `    cprmv:isBasedOn <${extendsUri}> ;\n`;
}
```

`field-mapping.md`'s Rules-tab entry (`rule.extends` → `cprmv:isBasedOn`, "v1.10.0, was
`ronl:extends`") also **answers**, rather than just raises, one of the open questions
from the previous draft: `cprmv:extends` (the DMN attribute name) and `cprmv:isBasedOn`
(the RDF property name) are already a deliberate, working pair — not two independent,
possibly-conflicting conventions. What's still genuinely open is whether that same
pairing is the right one to reuse one level deeper, at cell granularity (see §5).

## 3. Amsterdam's citation format problem — and where JuriConnect actually fits

> **Revised from the original draft.** The original proposal here — adopt JCI as the
> _mandated_ citation grammar everywhere, replacing `BWBR0002221/Artikel_7a` outright —
> is answered "No, not at all" by the spec owner (open question 3). Two things the
> original draft didn't know: Logius/KOOP's own long-term direction is to replace
> JuriConnect with **ELI**, so mandating JCI now would mandate a format the standard
> itself expects to retire; and CPRMV 0.4.2 is introducing **`ReferenceMethod`** as a
> first-class, pluggable concept — JCI and ELI both become _known_ methods, neither
> canonical. Amsterdam's citation-format gap below is still real; what changes is the
> fix — not a mandate, just confirming JCI (and, per §4, plain citation URLs) as
> accepted value grammars alongside the existing BWBR string, which is what the
> generator already does today in practice.

The current `cprmv:extends`/`cprmv:isBasedOn` value format, as shipped
(`BWBR0002221/Artikel_7a`, or with a version stamp,
`BWBR0002221_2020-01-01_0/Artikel_7a/Lid_1`), only expresses national wetgeving citations
(a BWB number). Most of Amsterdam's own sources in `HvA_annotaties.xml`'s `<documents>`
section are _not_ national wetgeving — they're gemeentelijke verordeningen,
beleidsregels, and un-typed internal `.docx` drafts with no BWB number at all (e.g.
_"Verordening Individuele Inkomenstoeslag Participatiewet Amsterdam 2021"_,
_"Beleidsregels bijzondere bijstand gemeente Amsterdam.docx"_).

iKnow already solves this on its own annotations in more than one way, not just one.
**JuriConnect (JCI)**, the Dutch national standard also used by wetten.overheid.nl and
lokaleregelgeving.overheid.nl, appears directly in the file:

```
juriconnect = "jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4"
```

JCI's `NoBWBnumber` convention already covers both of Amsterdam's cases (national law
and local regulation) with one grammar. But a same-branch edit to
`cprmv-cell-level-linking-prototype.md` (also folded into §4) surfaced Amsterdam citing
other sources with a **plain `lokaleregelgeving.overheid.nl/CVDR.../N` URL** instead —
no JCI string at all. So iKnow's own annotation data is already citing sources in more
than one format today; whatever the design does, it has to accept both, not standardize
on one.

Fortunately, our own pipeline already does, without any change needed:
`ttlGenerator.js` (§2) passes a value through as-is if it's already a URL, and otherwise
prefixes it with `https://wetten.overheid.nl/` — which is exactly right for a bare JCI
string, and a no-op for a CVDR URL that's already a full URL. Both formats already
round-trip through the same code path, confirmed in the same published example
(`Zorgtoeslag-Levensgebeurtenissen.ttl` line 26):

```turtle
cv:hasLegalResource <https://wetten.overheid.nl/jci1.3:c:BWBR0018451&artikel=2> ;
```

### Two different things get cited here — and CPRMV is formalizing both

The spec owner's answer draws a distinction the original draft didn't make:
`cprmv:isBasedOn` always points at a `cprmv:Rule` (§2), and how you address one depends
on where that Rule lives.

- **An external legal resource** (a piece of national or local legislation) — addressed
  via whatever `ReferenceMethod` its own publisher uses. JCI today; ELI eventually, per
  Logius/KOOP's stated direction; CPRMV 0.4.2 formally lists both as known methods,
  neither mandated over the other.
- **An internal `cprmv:Rule`** — one we mint ourselves, like §5's per-cell and
  per-concept resources — addressed via what the spec owner calls a **"rule id path"**:
  an identifier, or a path of identifiers following `hasPart` from the RuleSet root,
  using the CPRMV API's own internal reference method (the suggested default, still
  unnamed as of this writing). The spec owner notes this "could exactly align with how
  a DMN is structured internally" — which, concretely, is what §5's URI scheme already
  is: `.../rules/_rule_1/cell/_inputentry_145` and `.../concepts/4b7157ff-...` are both
  paths through our own `hasPart` tree, keyed by DMN-native ids. §5 wasn't designed
  against this concept — it didn't exist yet when §5 was first drafted — it just turns
  out to already be shaped like one.

**Revised proposal:** don't mandate JCI as the one citation grammar. Instead, ask the
spec owner to confirm (open question 3, revised in §6) that:

1. At the DMN-attribute layer, `cprmv:isBasedOn`'s value is whatever citation format the
   source `<textannotation>` actually supplies — JCI, a plain citation URL, or (once
   0.4.2 ships) an explicit `ReferenceMethod` tag — normalized into a URI by the
   generator exactly as it already does for JCI and CVDR today.
2. Referencing one of our own minted `cprmv:Rule`s (a cell, a concept) should use the
   internal "rule id path" method once it's named and specified in 0.4.2, and that §5's
   existing `hasPart`-path URI scheme is a reasonable candidate to check against it,
   rather than something invented independently that then has to be reconciled later.

## 4. Concrete DMN-layer proposal

> **Revised from the original draft.** The spec owner's answer to open question 4
> (§6) rejects the three-attribute version of this proposal: _"a 'concept' in this
> context is a `cprmv:Rule`"_ — not a separate, tool-specific pointer property. There is
> no `cprmv:concept`. What a cell "points at" — whether that's a piece of legislation or
> an iKnow concept — is always the same relation, `cprmv:isBasedOn`, just resolved via a
> different `ReferenceMethod` depending on what's available (see open question 3's
> answer). §5 covers the consequence at the TTL layer: the concept itself gets minted as
> its own `cprmv:Rule`, not carried as a bare identifier attribute.

Attach two attributes directly to `<inputEntry>` / `<outputEntry>` (the same
foreign-namespace-attribute mechanism `cprmv:extends` etc. already use one level up —
no DMN schema change, no impact on engines that ignore unknown namespaces):

| Attribute           | Value                                                                                                                                                                                                                                                                                                                                       | Maps to                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `cprmv:sourceQuote` | verbatim quoted text                                                                                                                                                                                                                                                                                                                        | `<textannotation><text>`                                                                                                    |
| `cprmv:isBasedOn`   | a legislative citation when the source `<textannotation>` supplies one — a JCI string, **or a plain citation URL** (Amsterdam's own annotation data uses both; see below); otherwise the iKnow concept's own reference (CPT/APT UUID, or its `pna-web.com` URL) when only a bare `<concept>`/`<textannotation>` pointer exists, no citation | `<textannotation juriconnect="...">`, or a citation URL in the annotation text; else `<concept id>` / `<textannotation id>` |

A same-branch edit to `cprmv-cell-level-linking-prototype.md`'s worked-example table
(by Mariette Lokin) supplies real values for what was previously the "no citation" case:
`_inputEntry_1` and `_inputEntry_5` (previously "quote + concept, no pinpoint citation")
now carry `https://lokaleregelgeving.overheid.nl/CVDR645454/12` — a **CVDR URL**, not a
JCI string — and `_inputEntry_3` (previously "concept only, no quote, no citation") now
carries a full `juriconnect="jci1.31:c:BWBR0015703&..."` string. So `isBasedOn`'s value
grammar was already heterogeneous in practice before this proposal existed: JCI when
iKnow emits it, a plain government citation URL when it doesn't, always falling back
further to the bare concept reference only when neither is present. This is the same
pattern `ttlGenerator.js` already implements at rule level for `extends`/`isBasedOn`
(§2): pass a URL through as-is, otherwise construct one.

Full worked example against one real rule (8 cells, showing the full range from
"complete citation" down to "rightfully ungrounded wildcard") is in
`cprmv-cell-level-linking-prototype.md`.

### A cell can need more than one grounding

A single cell is sometimes a **compound** FEEL expression — e.g.
`>= 21 and < pensioengerechtigde leeftijd`, two conditions in one cell, each potentially
citing a different provision. Plain attributes can't express that (an attribute holds one
value), so this was tested directly against local Operaton before settling on an
encoding:

| Design tested                                                                       | Deploys on Operaton? | Notes                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single grounding via `cprmv:concept`/`cprmv:sourceQuote`/`cprmv:isBasedOn`          | ✅ Deploys           | The baseline design as originally tested. The empirical result (attributes deploy, child elements don't) is about the _mechanism_, not this specific attribute set — still holds after dropping `cprmv:concept` above                                                                                       |
| Multiple groundings via repeatable `<cprmv:grounding .../>` **child elements**      | ❌ **Rejected**      | `cvc-complex-type.2.4.d: Invalid content was found starting with element 'cprmv:grounding'. No child element is expected at this point.` — no extension point in `tUnaryTests`'s content model. Foreign attributes are tolerated everywhere in this DMN; foreign child elements are a hard schema rejection |
| Multiple groundings via **numbered attribute families** (`concept1`/`concept2`/...) | ✅ **Deploys**       | Mechanism chosen; attribute names now `sourceQuote1`/`isBasedOn1`, `sourceQuote2`/`isBasedOn2`, etc. — see below                                                                                                                                                                                            |

So the design stays attribute-only: `cprmv:sourceQuote1`/`cprmv:isBasedOn1`,
`cprmv:sourceQuote2`/`cprmv:isBasedOn2`, and so on, with the unnumbered form remaining
valid shorthand for exactly one grounding.

## 5. Sketch: the third design — how this reaches a published `.ttl`

This is the part the previous draft didn't cover: a DMN attribute alone doesn't get
published — it has to survive import and generation in our own CPSV Editor code
(`ttl-editor/src/utils/dmnHelpers.js` and `ttlGenerator.js`), which are ours to change,
not a fixed constraint.

### Cell addressing: `<inputEntry>`/`<outputEntry>` id, not column position

The worked example below originally addressed a cell by its column position within the
row (`cell/1`, `cell/4`, `cell/5`) because at the time `<inputEntry>`/`<outputEntry>`
carried no `id` attribute at all — position was the only handle available. A subsequent
iKnow re-export of `HvA_full_dmn_export.dmn` now gives every `<dmn:input>`,
`<dmn:output>`, `<dmn:rule>`, `<dmn:inputEntry>`, and `<dmn:outputEntry>` its own `id`
(663 `inputEntry` ids and 99 `outputEntry` ids across the file, all globally unique;
`<dmn:decision>`/`<dmn:decisionTable>` ids — the anchor already used by shipped TTL —
are unchanged). The design below now mints a cell URI from that id instead:
`.../cell/{inputEntry or outputEntry id}` rather than `.../cell/{column index}`. This is
more robust than position — it survives a column being reordered or a new condition
inserted mid-row, something a positional key would get silently wrong.

**Caveat, not yet resolved:** these ids are very likely not stable _across_ re-exports.
The same iKnow re-export that added them also regenerated every pre-existing
`<informationRequirement>`, `<authorityRequirement>`, `<inputData>`, and
`<knowledgeSource>` id — same business content, same order, brand-new UUIDs each run.
The new `inputEntry`/`outputEntry`/`rule`/`input`/`output` ids follow the same two
minting styles already used elsewhere in the file (a per-export-run sequential counter
for entries/inputs/outputs, a fresh UUID for rules — both consistent with how the
pre-existing ids in this file are generated), which suggests they too are freshly minted
per export rather than derived from cell content. So this solves _which cell, within one
snapshot_ but not yet _does the same cell keep the same URI after the next re-export_ —
a `hasPart`-composed cell resource minted today would need to be re-minted (and any
external reference to it re-pointed) the next time Amsterdam re-exports this DMN from
iKnow. Positional indexing had exactly the same weakness, just less visibly, so this
isn't a regression — but it isn't solved by moving to id-based addressing either. Worth
raising with iKnow's maintainers if cross-version cell URI stability ever becomes a
requirement (see open question 7, §6).

### Concept resources: minted once, shared via `isBasedOn`

> **Revised from the original draft**, per the spec owner's answers to open questions 4
> and 5. Q4: _"a 'concept' in this context is a `cprmv:Rule`"_ — so referencing an iKnow
> concept from a cell is not a special case needing its own property; it's the same
> `cprmv:isBasedOn` relation used everywhere else in this design, just pointed at a
> `cprmv:Rule` minted for the concept instead of a legislative resource. Q5 reframes the
> original minting question ("skip cells with only a bare concept pointer") around
> whether the same concept is reused: _"multiple cells might point to the same
> concept... it might be most feasible to denote the concept as separate `cprmv:Rule`"_.

That reuse case isn't hypothetical here — it's confirmed in the DMN itself. Decision
`_bca439b7-fdb8-40e3-8a1d-3bb95571c65c` ("Beslistabel bepalen aanspraak op individuele
inkomenstoeslag") has its own `<authorityRequirement>` pointing at `<knowledgeSource>`
`_acb7e506-89c4-11f1-9739-37f7a780e5d8` — CPT `4b7157ff-2bc6-4ada-ba36-8123e6038dfe`,
_"aanspraak individuele inkomenstoeslag"_. The same CPT id is, per the worked example in
`cprmv-cell-level-linking-prototype.md`, exactly what Rule 1's own output cell
(`_outputEntry_1`, boolean `true`) semantically asserts — every "true" row in this
99-rule decision table is restating the same decision-level concept at output-cell
granularity. Minting that concept once and having both the decision-level grounding and
every output cell's grounding `isBasedOn`-point at it avoids re-asserting the same
`dct:source`/quote/citation up to 99 times over.

`HvA_annotaties.xml` also has more for this specific concept than a bare pointer: a
`<textannotation>` (`2823e65b-832e-491d-99b2-813eb920abe8`) explicitly tied to it via
`concept="4b7157ff-..."`, carrying both a quote and a JCI citation:

```
juriconnect = "jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=3"
<text>Een persoon kan op een daartoe strekkend verzoek in aanmerking komen
voor een individuele inkomenstoeslag</text>
```

So the concept resource isn't a thin `dct:source`-only stub — it carries whatever
grounding its own supporting annotation supplies, same as any other `cprmv:Rule`.

Using Rule 1 of the worked example (four grounded cells now — the three input cells as
before, plus the output cell demonstrating concept reuse — DMN rule id
`_07f36f57-eece-49a5-a954-7f3b4aa4c1b8` in the current export, decision table
`_bca439b7-fdb8-40e3-8a1d-3bb95571c65c_table`):

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "_rule_1" ;
    cprmv:ruleType "decision-rule" ;             # unresolved — see open question 8
    cprmv:confidence "medium" ;
    cprmv:decisionTable "_bca439b7-fdb8-40e3-8a1d-3bb95571c65c_table" ;
    cprmv:rulesetType "decision-table" ;         # unresolved — see open question 8
    cprmv:hasPart ( <.../rules/_rule_1/cell/_inputentry_145>
                     <.../rules/_rule_1/cell/_inputentry_149>
                     <.../rules/_rule_1/cell/_inputentry_150>
                     <.../rules/_rule_1/cell/_outputentry_15> ) .

<.../rules/_rule_1/cell/_inputentry_145> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=61d1181d-a7e6-4da1-a121-89ca30fcb7b0> ;
    cprmv:sourceQuote "Woonadres" .

<.../rules/_rule_1/cell/_inputentry_149> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=0f0d5140-0624-4aa3-a077-2a26087d1436> ;
    cprmv:sourceQuote "hij laag inkomen had" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4> .

<.../rules/_rule_1/cell/_inputentry_150> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=6fea33db-8454-4a6c-9e02-db6a1f3417db> ;
    cprmv:sourceQuote "een vermogen" .

<.../rules/_rule_1/cell/_outputentry_15> a cprmv:Rule ;
    cprmv:isBasedOn <.../concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe> .

<.../concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=CPT&id=4b7157ff-2bc6-4ada-ba36-8123e6038dfe> ;
    cprmv:sourceQuote "Een persoon kan op een daartoe strekkend verzoek in aanmerking komen voor een individuele inkomenstoeslag" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=3> .
```

The decision's own pre-existing `authorityRequirement`/`knowledgeSource` grounding
would, once emitted as TTL, point at this exact same
`.../concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe` resource — one concept, minted once,
referenced from both decision level and cell level. The three `_inputentry_*` cells
above are unaffected by this pattern: each is grounded via its own APT
(`<textannotation>`), which is already 1:1 with the cell and carries its own quote —
there's no reuse to dedup there, so they keep `dct:source`/`sourceQuote` inline exactly
as before. The dedup pattern is specifically for **bare CPT concept pointers** — cells
(or decisions) that reference an abstract `<concept>` with no `<textannotation>` of
their own.

For a DMN source whose exporter doesn't emit per-cell ids at all, the design falls back
to the original column-position key (`cell/1`, `cell/2`, ...) — a unique, if less
semantically meaningful, key is still better than none.

The design deliberately reuses, rather than extends, the shape set:

- Each grounded cell becomes its **own `cprmv:Rule`** — no new class, no new shape.
  `cprmv:RuleShape` already has everything a cell resource needs
  (`sourceQuote`, `isBasedOn`, and its own optional `hasPart` if a cell's grounding ever
  needs to compose further, though nothing in Amsterdam's data currently goes that deep).
- The parent `cprmv:DecisionRule`'s new `cprmv:hasPart` list is the exact recursive
  `rdf:first`/`rdf:rest` pattern already populated at RuleSet level, just one level
  deeper.
- The traceability pointer back to iKnow's own concept/textannotation registry uses
  plain **`dct:source`** — still no new `cprmv:concept` property, now confirmed rather
  than just sidestepped (open question 4's answer). A bare CPT concept, once minted, is
  referenced the same way anything else is based on something: `cprmv:isBasedOn`.
- **A concept referenced from more than one place — another cell, another rule, or the
  decision's own `knowledgeSource` — is minted exactly once**, keyed by its iKnow
  CPT/APT id, and reused by URI from every citing resource. This reverses the original
  draft's rule ("don't mint a cell that only has a bare concept pointer"): the concept is
  now always worth minting, precisely because it isn't cell-specific — a `cprmv:Rule`
  that's only ever referenced from one place still tells a reader something the
  decision's `knowledgeSource` alone doesn't (which specific cell, not just which
  decision, asserts it), and if it turns out to be referenced from several places, the
  dedup benefit was there from the start.
- **A cell with more than one grounding needs no new mechanism at this layer** —
  `cprmv:hasPart` is already recursive (`cprmv:hasPartListShape` refers to itself), so a
  cell resource with multiple groundings simply `hasPart`s its own further list of
  grounding resources instead of carrying `sourceQuote`/`isBasedOn` directly:

  ```turtle
  <.../rules/_rule_1/cell/_inputentry_470> a cprmv:Rule ;
      cprmv:hasPart ( <.../rules/_rule_1/cell/_inputentry_470/grounding/1>
                       <.../rules/_rule_1/cell/_inputentry_470/grounding/2> ) .

  <.../rules/_rule_1/cell/_inputentry_470/grounding/1> a cprmv:Rule ;
      cprmv:sourceQuote "hij is meerderjarig" ;
      cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0000001&artikel=1> .

  <.../rules/_rule_1/cell/_inputentry_470/grounding/2> a cprmv:Rule ;
      cprmv:sourceQuote "tot de pensioengerechtigde leeftijd" ;
      cprmv:isBasedOn <https://wetten.overheid.nl/BWBR0002221/Artikel_7a> .
  ```

  `_inputentry_470` is the same rule's column-2 cell (`years(years and months
duration(...))` age check, `>= 21 and < pensioengerechtigde leeftijd` — the compound
  FEEL expression this section opened with). The sub-groundings within one compound cell
  still get a positional sub-key (`grounding/1`, `grounding/2`) — there's no further DMN
  element to key off _inside_ a single `<inputEntry>`, so position remains the natural
  encoding at that level. Same recursive `hasPart` pattern, one level deeper, only where
  a cell actually needs it — still no new SHACL shape.

### What has to change, concretely, in our own code

- `dmnHelpers.js`'s `extractRulesFromDMN()` (currently reads `inputEntry text` /
  `outputEntry text` for FEEL content only) needs to also read each `<inputEntry>` /
  `<outputEntry>`'s own `cprmv:sourceQuote` / `cprmv:isBasedOn` attributes (no
  `cprmv:concept` — dropped per §4).
- `ttlGenerator.js`'s DMN-rule emitter (currently one flat `cprmv:DecisionRule` per
  `<rule>`, no composition — confirmed against the real published
  `Zorgtoeslag-Levensgebeurtenissen.ttl`) needs to emit the `hasPart` list and the
  per-cell resources shown above, reusing the existing `hasPart`-list-building code
  already written for `generateRuleSetSection()` and the existing `isBasedOn`
  URI-construction already written for rule-level `extends`. It also needs to
  **deduplicate concept resources by iKnow CPT/APT id** across the whole generation
  pass (not just within one rule) — a concept minted once for one cell's `isBasedOn`
  must be reused by URI, not re-emitted, when a later cell or decision references the
  same id.
- `linked-data-explorer`'s `dmn-validation.service.ts` needs new checks for the
  DMN-layer attributes: `isBasedOn`'s value is now one of a JCI string, a plain
  citation URL, or a well-formed iKnow CPT/APT UUID — validation needs to accept all
  three, not assume JCI grammar unconditionally.
- `linked-data-explorer`'s `shacl-validation.service.ts` needs **no changes** — the shapes
  this design relies on already exist and are already loaded.

## 6. Open questions for the spec owner

Items 1–6 have been answered by the spec owner; each note below records the resolution
and what changed elsewhere in this doc as a result, not just the original question.
Items 7–9 are still open.

1. ~~Is `cprmv:isBasedOn` on a per-cell `cprmv:Rule` the same relation as the
   already-shipping rule-level one?~~ **Resolved: yes** — the same relation, just a
   smaller scope; CPRMV doesn't restrict what a `hasPart`-composed `cprmv:Rule`'s own
   `isBasedOn` may relate through. One new fact the original question didn't anticipate:
   `cprmv:isBasedOn` can point at more than one `cprmv:Rule`, which the spec owner notes
   makes it awkward to serialize as a single XML attribute value — independent
   confirmation of exactly why the numbered-attribute convention (§4) exists.
2. ~~Is minting one `cprmv:Rule` per grounded cell, collected via `hasPart`, the intended
   reading of the composition model?~~ **Resolved: it's a feasibility/tooling call, not
   a spec rule.** CPRMV allows composition at whatever granularity is economically worth
   the tooling cost. The spec owner also floats that DMN's own `<knowledgeSource>` could
   in principle drive CPRMV metadata automatically via an XSLT (already sketched in the
   CPRMV API), and names a longer-term "CPRMMN" extension living in a separate BPM+
   package file as the "royal way" — explicitly not pursued now, since Operaton doesn't
   support BPM+ packages.
3. ~~Should JuriConnect (JCI) become the mandated citation format across
   `cprmv:extends`/`cprmv:isBasedOn`/`cprmv:implements`?~~ **Resolved: no — "not at
   all."** See §3's rewrite (`ReferenceMethod`/"rule id path" framing replaces the
   mandate proposal). Correction to the original question itself: `cprmv:implements`
   doesn't exist — the actual relation is `cpsv:implements` (`cpsv:Rule` →
   `eli:LegalResource`), a CPSV property, not a CPRMV one.
4. ~~Does `cprmv:concept` belong in the `cprmv:` namespace at all?~~ **Resolved: no** —
   "a 'concept' in this context is a `cprmv:Rule`," not a separate property. See §4's
   rewrite (dropped `cprmv:concept`) and §5's rewrite (concepts minted as their own
   `cprmv:Rule`s).
5. ~~Should a cell that only has a concept pointer get minted as its own `hasPart`
   resource at all?~~ **Resolved, reframed** — not really a quote/citation question: a
   concept referenced from more than one place should be minted once and shared. See
   §5's worked example (the `4b7157ff-...` concept, shared between the decision-level
   `knowledgeSource` and Rule 1's output cell).
6. ~~Is the numbered-attribute convention for multiple groundings on one cell an
   acceptable house convention?~~ **Resolved, informally: "anything that works is
   fine."** No CPRMV-mandated multi-value encoding exists or is currently planned; the
   spec owner floats space- or comma-separated single-attribute lists as an alternative,
   but that's untested against Operaton, so the numbered-attribute convention
   (empirically proven in §4) stands.
7. **Are the DMN-attribute layer's own generated ids (`<inputEntry>`/`<outputEntry>`/
   `<rule>`/`<input>`/`<output>` `id`) meant to be stable across re-exports of the same
   source DMN**, or are they expected to be regenerated on every export run — as
   `<informationRequirement>`/`<authorityRequirement>`/`<inputData>`/`<knowledgeSource>`
   ids already are, confirmed by diffing two iKnow exports of the same underlying model
   (same content and order, entirely new UUIDs each run)? §5's cell-level `cprmv:Rule`
   URIs are now keyed off these ids — if they don't survive re-export, every cell-level
   grounding minted today needs to be re-minted, and any external reference to it
   re-pointed, the next time the DMN is re-exported. This is a question for whoever
   maintains the iKnow exporter rather than for the CPRMV vocabulary itself, but it
   directly bounds how durable the §5 design's URIs can be. Still open.
8. **Are `cprmv:ruleType` and `cprmv:rulesetType` — both used in this doc's own §5
   worked example, and both already shipping in
   `examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn` — actually defined
   anywhere in CPRMV?** Raised directly by the spec owner, unprompted, while discussing
   which DMN attribute names need defining (see open question 9 below): _"I am also not
   familiar with the ruleType and rulesetType
   properties. Either these should become defined in the CPRMV or they should not be
   used altogether. Will look into this."_ Still open, and not hypothetical — this doc's
   own worked example uses both, flagged inline (§5) pending this answer.
9. Once 1–8 are settled: the DMN-attribute names actually used in shipping files
   (`isBasedOn` — renamed from `extends`, `ruleType`, `confidence`, `rulesetType`,
   `ruleMethod`, `note`, `title`, `description`) should either be added to the ReSpec
   document as the documented DMN-serialization layer of the abstract vocabulary, or the
   ReSpec should clarify that the DMN attribute convention is intentionally a separate,
   informally agreed layer. Partially answered already: CPRMV 0.4.2 is introducing a
   governed list of **"methods"** (DMN, Operaton, iKnow, etc.) as a first-class part of
   the standard — this question has a real answer coming, just not shipped yet.

**Context beyond this proposal's scope, noted for awareness:** the spec owner mentioned,
while answering question 9, that the relationship between `cpsv:Rule` and
`cprmv:RuleSet` is an active, unsettled EU-level debate — topic of a CPRMV/CPSV
integration workshop at the SEMIC conference in Dublin, 30 November 2026. Nothing in
this proposal depends on how that resolves, but it's worth knowing the ground could
shift under `cprmv:RuleSet`'s own definition in a future CPRMV version.
