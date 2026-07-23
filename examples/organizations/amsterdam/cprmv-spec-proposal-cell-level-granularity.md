# Proposal for the CPRMV spec owner: legislative linking below the rule level

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

JCI has a defined convention (`NoBWBnumber`) for citing decentralized regulation that has
no BWB identifier — meaning it already uniformly covers both of Amsterdam's cases
(national law and local regulation) with one grammar, and iKnow is already emitting it
natively. Better still: our own pipeline already round-trips a raw, unescaped JCI string
through the exact `https://wetten.overheid.nl/{value}` URI construction shown above,
elsewhere in the same published example
(`Zorgtoeslag-Levensgebeurtenissen.ttl` line 26):

```turtle
cv:hasLegalResource <https://wetten.overheid.nl/jci1.3:c:BWBR0018451&artikel=2> ;
```

So adopting JCI costs nothing beyond a validator regex — the URI construction and its
tolerance for JCI's `&`/`:` characters is already proven in production.

**Proposal:** adopt JCI as the value grammar for the citation property across the board —
not just for a new cell-level attribute, but as a replacement for the current
`BWBR.../Artikel_N` string at `<rule>`/`<decision>` level too, since that string can't
express Amsterdam's local sources at all today.

## 4. Concrete DMN-layer proposal

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

## 5. Sketch: the third design — how this reaches a published `.ttl`

This is the part the previous draft didn't cover: a DMN attribute alone doesn't get
published — it has to survive import and generation in our own CPSV Editor code
(`ttl-editor/src/utils/dmnHelpers.js` and `ttlGenerator.js`), which are ours to change,
not a fixed constraint. Using Rule 1 of the worked example (three grounded cells: a
woonadres check, a langdurig-laag-inkomen check with a full JCI citation, and a vermogen
check):

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "_rule_1" ;
    cprmv:ruleType "decision-rule" ;
    cprmv:confidence "medium" ;
    cprmv:decisionTable "_bca439b7-fdb8-40e3-8a1d-3bb95571c65c_table" ;
    cprmv:rulesetType "decision-table" ;
    cprmv:hasPart ( <.../rules/_rule_1/cell/1> <.../rules/_rule_1/cell/4>
                     <.../rules/_rule_1/cell/5> ) .

<.../rules/_rule_1/cell/1> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=61d1181d-a7e6-4da1-a121-89ca30fcb7b0> ;
    cprmv:sourceQuote "Woonadres" .

<.../rules/_rule_1/cell/4> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=0f0d5140-0624-4aa3-a077-2a26087d1436> ;
    cprmv:sourceQuote "hij laag inkomen had" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4> .

<.../rules/_rule_1/cell/5> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=6fea33db-8454-4a6c-9e02-db6a1f3417db> ;
    cprmv:sourceQuote "een vermogen" .
```

The design deliberately reuses, rather than extends, the shape set:

- Each grounded cell becomes its **own `cprmv:Rule`** — no new class, no new shape.
  `cprmv:RuleShape` already has everything a cell resource needs
  (`sourceQuote`, `isBasedOn`, and its own optional `hasPart` if a cell's grounding ever
  needs to compose further, though nothing in Amsterdam's data currently goes that deep).
- The parent `cprmv:DecisionRule`'s new `cprmv:hasPart` list is the exact recursive
  `rdf:first`/`rdf:rest` pattern already populated at RuleSet level, just one level
  deeper.
- The traceability pointer back to iKnow's own concept/textannotation registry uses
  plain **`dct:source`**, not a new `cprmv:concept` property — sidestepping open question
  4 below entirely at the TTL layer, regardless of how it's eventually resolved at the
  DMN-attribute layer.
- Cells that only carry a bare concept pointer (no quote, no citation) are **not** minted
  as their own resource — a `cprmv:Rule` with nothing but `dct:source` doesn't tell a
  reader more than the decision's existing `knowledgeSource` already does.

### What has to change, concretely, in our own code

- `dmnHelpers.js`'s `extractRulesFromDMN()` (currently reads `inputEntry text` /
  `outputEntry text` for FEEL content only) needs to also read each `<inputEntry>` /
  `<outputEntry>`'s own `cprmv:concept` / `cprmv:sourceQuote` / `cprmv:isBasedOn`
  attributes.
- `ttlGenerator.js`'s DMN-rule emitter (currently one flat `cprmv:DecisionRule` per
  `<rule>`, no composition — confirmed against the real published
  `Zorgtoeslag-Levensgebeurtenissen.ttl`) needs to emit the `hasPart` list and the
  per-cell resources shown above, reusing the existing `hasPart`-list-building code
  already written for `generateRuleSetSection()` and the existing `isBasedOn`
  URI-construction already written for rule-level `extends`.
- `linked-data-explorer`'s `dmn-validation.service.ts` needs new checks for the DMN-layer
  attributes (well-formed UUID for `cprmv:concept`, JCI grammar for `cprmv:isBasedOn`).
- `linked-data-explorer`'s `shacl-validation.service.ts` needs **no changes** — the shapes
  this design relies on already exist and are already loaded.

## 6. Open questions for the spec owner

1. **Is `cprmv:isBasedOn` on a per-cell `cprmv:Rule` the same relation as the
   already-shipping rule-level one** (just recursed one level deeper via `hasPart`), or
   does composing it this way change what it should mean? The design in §5 assumes it's
   the same relation at a smaller scope — worth an explicit confirmation given how much
   of the design leans on that being true.
2. **Is minting one `cprmv:Rule` per grounded cell, collected via `hasPart`, the intended
   reading of the composition model** — or was `hasPart` designed for a coarser
   granularity (combining whole `<rule>` rows, or whole `<decisionTable>`s) and a DMN
   cell is a level too fine for it?
3. **Should JuriConnect (JCI) become the mandated citation format** across
   `cprmv:extends` / `cprmv:isBasedOn` / `cprmv:implements`, replacing the current ad hoc
   `BWBR0002221/Artikel_7a` string? This affects existing shipping files, not just the
   new cell-level attributes.
4. **Does `cprmv:concept` (a tool-specific traceability id) belong in the `cprmv:`
   namespace at all**, or should tool-provenance metadata like this live in a separate,
   explicitly non-normative namespace? Note this only matters for the DMN-attribute
   layer — the TTL layer sidesteps it entirely via plain `dct:source` (§5).
5. **Should a cell that only has a concept pointer (no quote, no citation) get minted as
   its own `hasPart` resource at all**, or is that noise? §5 currently says no — mint only
   when there's a quote or a citation — but that's a design choice, not a rule derived
   from the shapes.
6. Once 1–5 are settled: the DMN-attribute names actually used in shipping files
   (`extends`, `implements`, `ruleType`, `confidence`, `rulesetType`, `ruleMethod`,
   `note`, `title`, `description`) should either be added to the ReSpec document as the
   documented DMN-serialization layer of the abstract vocabulary, or the ReSpec should
   clarify that the DMN attribute convention is intentionally a separate, informally
   agreed layer.
