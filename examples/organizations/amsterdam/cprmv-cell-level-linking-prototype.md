# Prototype: cell-level legislative linking via `cprmv:*`

## Changelog

| Date       | Change                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 2026-07-23 | Multi-grounding cells: numbered attributes confirmed on Operaton, repeatable child elements rejected |
| 2026-07-23 | Added Layers 2–4: DMN-to-TTL pipeline gaps, `.ttl` sketch, validator follow-up                       |
| 2026-07-23 | Initial prototype: DMN-attribute layer, Rule 1 cross-referenced against `HvA_annotaties.xml`         |

## The gap

DMN's own extension points for tying a decision to its legal authority —
`<authorityRequirement>` / `<requiredAuthority>` / `<knowledgeSource>` — only attach at
the `<decision>` level. The CPRMV attributes already shipping in
`examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn` (`cprmv:extends`,
`cprmv:ruleType`, `cprmv:confidence`, `cprmv:note`) go one level deeper by attaching to
`<rule>` — but no further. Neither standard DMN nor the CPRMV attributes in current use
can say "this specific _cell_ — one input or output entry inside one rule row — comes
from this specific legal source."

The Municipality of Amsterdam already needs exactly that. But a DMN in this project is
never published in isolation — it's imported into the CPSV Editor and becomes part of a
`.ttl` file (a `cprmv:DecisionModel` linked to a `cpsv:PublicService`), which is what
actually gets published and validated. **The CPSV Editor is our own code** (`ttl-editor`),
so this doc covers the whole path: the DMN attribute, what our own DMN-import and
TTL-generation code currently do with it, and what publishing a grounded cell actually
looks like in the resulting `.ttl` — not just the `.dmn` file in isolation.

Everything below is prototyped against **Rule 1 of the main decision table** in
`individuele-inkomenstoeslag-iknow-patched.dmn` (decision
`_bca439b7-fdb8-40e3-8a1d-3bb95571c65c`, "Beslistabel bepalen aanspraak op individuele
inkomenstoeslag"), using real cross-references pulled from `HvA_annotaties.xml` — nothing
here is invented placeholder content.

## How the source data already supports this

`HvA_annotaties.xml` has three element kinds that, read together, already are a
cell-level legal grounding model — they just aren't connected to the DMN file's rule/cell
structure today:

- **`<concept>`** — an abstract legal fact/notion (e.g. _"natuurlijk persoon heeft
  woonadres"_). Referenced from a DMN `knowledgeSource` as a **CPT** id.
- **`<textannotation>`** — a literal quoted span of source text, anchored to one
  `<concept>` and one `<document>`. Referenced from a DMN `knowledgeSource` as an **APT**
  id. This is the mechanism behind the DMN's own `<dmn:type>CPT</dmn:type>` /
  `<dmn:type>APT</dmn:type>` distinction on `<knowledgeSource>` — confirmed directly: every
  CPT id in the DMN resolves to a `<concept>` element in this file, every APT id resolves
  to a `<textannotation>` element.
- **`<document>`** — the actual source (a `Wet`, `Gemeentelijke verordening`,
  `Beleidsregel`, or an un-typed internal `.docx` draft), sometimes carrying a
  `juriconnect` (JCI) citation string on the `<textannotation>` that quotes it — e.g.
  `jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4`.

## Rule 1, column by column

Rule 1 (`_rule_1`, lines 100–128 of the patched DMN) has 8 input cells and 1 output cell.
Cross-referencing each cell's underlying condition against `HvA_annotaties.xml` gives four
distinct groundedness levels — deliberately shown as-is, not cherry-picked, because a real
annotation corpus is never uniformly complete:

| Cell             | Condition                                           | Grounding found                                                                                                                                                                                                                                                                                                  | Level                                                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_inputEntry_1`  | woonachtig in de gemeente = `true`                  | APT `61d1181d-a7e6-4da1-a121-89ca30fcb7b0` → concept _"natuurlijk persoon heeft woonadres"_, quote `"Woonadres"`, document `Beleidsregels Stadpas.docx` — **"https://lokaleregelgeving.overheid.nl/CVDR645454/12"**                                                                                                   | quote + concept, no pinpoint citation                                                                                                                                                                                                                                                                                    |
| `_inputEntry_2`  | leeftijd `>= 21 and < pensioengerechtigde leeftijd` | none — the `_adcd1d42` sub-decision that supplies "pensioengerechtigde leeftijd" has no `authorityRequirement`/`knowledgeSource` of its own anywhere in the DMN                                                                                                                                                  | **ungrounded today** (pre-existing gap, not introduced by this proposal) — also the file's one real example of a **compound cell**: two conjuncts (`>= 21`, `< pensioengerechtigde leeftijd`) that could each need a different citation once grounding data exists for either — see "Multiple groundings per cell" below |
| `_inputEntry_3`  | uitzicht op inkomensverbetering = `false`           | CPT `cf35d84d-bec6-42b7-8491-9208ef44d2c9` → concept _"rechthebbende op individuele inkomenstoeslag heeft uitzicht op inkomensverbetering"_ — **juriconnect="jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01"**                                                                                                                                  | concept only, no quote, no citation                                                                                                                                                                                                                                                                                      |
| `_inputEntry_4`  | langdurig laag inkomen = `true`                     | APT `0f0d5140-0624-4aa3-a077-2a26087d1436` → concept _"natuurlijke persoon heeft langdurig laag inkomen"_, quote `"hij laag inkomen had"`, document **Verordening Individuele Inkomenstoeslag Participatiewet Amsterdam 2021**, **`juriconnect="jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4"`** | full triple — concept + quote + pinpoint citation                                                                                                                                                                                                                                                                        |
| `_inputEntry_5`  | vermogen `<= vermogensgrens`                        | APT `6fea33db-8454-4a6c-9e02-db6a1f3417db` → concept _"natuurlijk persoon beschikt over vermogen"_, quote `" vermogen"`, document `Beleidsregels Stadpas.docx` — **https://lokaleregelgeving.overheid.nl/CVDR645454/12**                                                                                                                          | quote + concept, no pinpoint citation                                                                                                                                                                                                                                                                                    |
| `_inputEntry_6`  | een schuldregeling = `-`                            | n/a — wildcard, nothing is tested                                                                                                                                                                                                                                                                                | **rightfully ungrounded**                                                                                                                                                                                                                                                                                                |
| `_inputEntry_7`  | gezinssituatie `not "met partner"`                  | CPT `8bf152a7-22a1-4624-b43b-aa9c9ff68b30` → concept _"natuurlijk persoon heeft gezinssituatie"_                                                                                                                                                                                                                 | concept only                                                                                                                                                                                                                                                                                                             |
| `_inputEntry_8`  | partner uitzicht op inkomensverbetering = `-`       | n/a — wildcard                                                                                                                                                                                                                                                                                                   | **rightfully ungrounded**                                                                                                                                                                                                                                                                                                |
| `_outputEntry_1` | aanspraak = `true`                                  | CPT `4b7157ff-2bc6-4ada-ba36-8123e6038dfe` → concept _"aanspraak individuele inkomenstoeslag"_ (the decision's own existing knowledge source, restated at the specific output value)                                                                                                                             | concept only                                                                                                                                                                                                                                                                                                             |

This spread is the actual argument for the design below: it has to degrade gracefully
when only partial annotation data exists, rather than force every cell to have a full
citation before any of this is usable.

## Layer 1 — the DMN attributes

Three attributes, attached directly to `<inputEntry>` / `<outputEntry>` — the same
foreign-attribute extension mechanism `cprmv:extends`/`cprmv:ruleType`/etc. already use at
`<rule>` level, so nothing about DMN's schema or Operaton's tolerance for unknown
namespaces changes:

| Attribute           | Value                                                                                                                                                            | Source                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `cprmv:concept`     | the iKnow CPT or APT id (not invented — this is the traceability pass-through back to `HvA_annotaties.xml`; see open question 4 in the companion spec-owner doc) | `<concept id>` / `<textannotation id>` |
| `cprmv:sourceQuote` | the literal quoted text, verbatim                                                                                                                                | `<textannotation><text>`               |
| `cprmv:isBasedOn`   | a JuriConnect (JCI) citation string, at the DMN-attribute layer                                                                                                  | `<textannotation juriconnect="...">`   |

`cprmv:sourceQuote` and `cprmv:isBasedOn` are named directly after the properties already
defined in the CPRMV vocabulary — and, importantly, both are **already real, shipping
SHACL shape properties** on `cprmv:Rule` (`packages/backend/shapes/cprmv/0.4.1/cprmv.shacl.ttl`
in `linked-data-explorer`, `cprmv:RuleShape`):

```turtle
cprmv:RuleShape
    a sh:NodeShape ;
    sh:targetClass cprmv:Rule ;
    sh:property [ sh:path cprmv:sourceQuote ; sh:maxCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path cprmv:isBasedOn ; sh:class cprmv:Rule ; sh:minCount 0 ] ;
    sh:property [ sh:path cprmv:hasPart ; sh:node cprmv:hasPartListShape ; sh:maxCount 1 ] .
```

One correction from an earlier draft of this doc: **`cprmv:isBasedOn` is an object
property** (`sh:class cprmv:Rule`) — its value must be a resource that is itself typed
`cprmv:Rule`, not a bare citation string. At the DMN-attribute layer that distinction
doesn't matter yet (an XML attribute is just a string either way); it matters once this
reaches Layer 3 below, where the citation has to become its own addressable resource, not
an inline literal.

### Before / after (DMN XML)

**Before** (current patched DMN, lines 100–128):

```xml
<dmn:rule id="_rule_1">
  <dmn:inputEntry id="_inputEntry_1">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_2">
    <dmn:text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_3">
    <dmn:text>false</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_4">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_5">
    <dmn:text>&lt;= van toepassing zijnde vermogensgrens</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_6">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_7">
    <dmn:text>not "met partner"</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_8">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:outputEntry id="_outputEntry_1">
    <dmn:text>true</dmn:text>
  </dmn:outputEntry>
</dmn:rule>
```

**After** (same rule, `cprmv:*` attributes added — no structural change, no new elements,
no ids changed):

```xml
<dmn:rule id="_rule_1">
  <dmn:inputEntry id="_inputEntry_1"
                  cprmv:concept="61d1181d-a7e6-4da1-a121-89ca30fcb7b0"
                  cprmv:sourceQuote="Woonadres">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_2">
    <dmn:text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_3"
                  cprmv:concept="cf35d84d-bec6-42b7-8491-9208ef44d2c9">
    <dmn:text>false</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_4"
                  cprmv:concept="0f0d5140-0624-4aa3-a077-2a26087d1436"
                  cprmv:sourceQuote="hij laag inkomen had"
                  cprmv:isBasedOn="jci1.31:c:NoBWBnumber&amp;hoofdstuk=ontbrekende nummer&amp;artikel=4">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_5"
                  cprmv:concept="6fea33db-8454-4a6c-9e02-db6a1f3417db"
                  cprmv:sourceQuote="een vermogen">
    <dmn:text>&lt;= van toepassing zijnde vermogensgrens</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_6">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_7"
                  cprmv:concept="8bf152a7-22a1-4624-b43b-aa9c9ff68b30">
    <dmn:text>not "met partner"</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_8">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:outputEntry id="_outputEntry_1"
                   cprmv:concept="4b7157ff-2bc6-4ada-ba36-8123e6038dfe">
    <dmn:text>true</dmn:text>
  </dmn:outputEntry>
</dmn:rule>
```

Note what's _not_ added: `_inputEntry_2` (no concept exists to cite — forcing one would
be fabrication), `_inputEntry_6` and `_inputEntry_8` (wildcards — there's nothing to
ground). The extension has to be optional per cell for this reason.

### Multiple groundings per cell

A single cell can be a **compound** FEEL expression — `_inputEntry_2` in this very rule is
one: `>= 21 and < pensioengerechtigde leeftijd` is two distinct conditions in one cell,
and in principle each could trace to a different legal provision (a general
age-of-majority article for `>= 21`, a pensions-act article for the upper bound). Nothing
in this file's current annotation data actually grounds either conjunct, so the example
below uses clearly-marked placeholder values, not real `HvA_annotaties.xml` content — the
point is the mechanism, not a specific citation.

The single-grounding design above can't express this: `cprmv:concept`/`sourceQuote`/
`isBasedOn` are plain XML attributes, and an attribute holds exactly one value. Two
encodings for "more than one" were tested directly against local Operaton
(`http://localhost:8081/engine-rest`) before picking one:

| Design tested                                                                                                                                             | Deploys on Operaton? | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single grounding via `cprmv:concept`/`cprmv:sourceQuote`/`cprmv:isBasedOn` on `<inputEntry>`                                                              | ✅ Deploys           | The baseline design above; unchanged                                                                                                                                                                                                                                                                                                                                                              |
| Multiple groundings via repeatable `<cprmv:grounding concept="..." .../>` **child elements**                                                              | ❌ **Rejected**      | `cvc-complex-type.2.4.d: Invalid content was found starting with element 'cprmv:grounding'. No child element is expected at this point.` — Operaton's DMN XSD has no extension point in `tUnaryTests`'s content model after `<text>`. Foreign _attributes_ are tolerated everywhere in this DMN; foreign _child elements_ are not — this is a hard schema rejection, not a transform-time warning |
| Multiple groundings via **numbered attribute families** (`cprmv:concept1`/`sourceQuote1`/`isBasedOn1`, `cprmv:concept2`/`sourceQuote2`/`isBasedOn2`, ...) | ✅ **Deploys**       | No upper bound on the count; each grounding is an independent, self-contained set of attributes — no delimiter, no escaping, no risk of three parallel lists drifting out of sync                                                                                                                                                                                                                 |

So the design stays attribute-only, extended with numbering rather than any structural
addition:

```xml
<dmn:inputEntry id="_inputEntry_2"
                cprmv:concept1="PLACEHOLDER-concept-A"
                cprmv:sourceQuote1="hij is meerderjarig"
                cprmv:isBasedOn1="jci1.3:c:BWBR0000001&amp;artikel=1"
                cprmv:concept2="PLACEHOLDER-concept-B"
                cprmv:sourceQuote2="tot de pensioengerechtigde leeftijd"
                cprmv:isBasedOn2="BWBR0002221/Artikel_7a">
  <dmn:text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</dmn:text>
</dmn:inputEntry>
```

The unnumbered `cprmv:concept`/`cprmv:sourceQuote`/`cprmv:isBasedOn` form (used everywhere
else in this doc) remains valid shorthand for the common case — exactly one grounding,
equivalent to an implicit `1`.

This layer alone is a documentation prototype only — the actual `.dmn` files are
unchanged. Turning it into a real DMN-level change additionally needs
`xmlns:cprmv="https://cprmv.open-regels.nl/0.3.0/"` on `<dmn:definitions>` (already
present in `RONL_BerekenLeeftijden_CPRMV.dmn`, absent from this file), and new validator
checks in `linked-data-explorer`'s `dmn-validation.service.ts` — see Layer 4 below.

## Layer 2 — what our own DMN import code does with it today

`individuele inkomenstoeslag-iknow.dmn` isn't published on its own. It goes through the
CPSV Editor's DMN tab, gets imported via `src/utils/dmnHelpers.js`, and turned into `.ttl`
by `src/utils/ttlGenerator.js`. **Both files are ours** — this isn't a third-party
constraint, it's the thing that needs to change.

`extractRulesFromDMN()` in `dmnHelpers.js` (lines 205–247) already reads rule-level CPRMV
attributes and the FEEL text of every cell — but nothing else about the cells:

```js
// dmnHelpers.js:216-229 (current)
const cprmvExtends = rule.getAttribute('cprmv:extends');
const cprmvValidFrom = rule.getAttribute('cprmv:validFrom');
const cprmvValidUntil = rule.getAttribute('cprmv:validUntil');
const cprmvRuleType = rule.getAttribute('cprmv:ruleType') || 'decision-rule';
const cprmvConfidence = rule.getAttribute('cprmv:confidence') || 'medium';
const cprmvNote = rule.getAttribute('cprmv:note');

// Extract input and output entries
const inputs = Array.from(rule.querySelectorAll('inputEntry text')).map((t) => t.textContent);
const outputs = Array.from(rule.querySelectorAll('outputEntry text')).map((t) => t.textContent);
```

`inputEntry text` / `outputEntry text` only ever pulls the FEEL condition/value string —
never the `<inputEntry>` element's own attributes. So `cprmv:concept` /
`cprmv:sourceQuote` / `cprmv:isBasedOn` from Layer 1 are invisible to this code today,
even once they exist in the XML.

`ttlGenerator.js` (lines 1214–1254) then emits one flat `cprmv:DecisionRule` resource per
DMN `<rule>`, with no composition at all — confirmed against a real published file,
`examples/organizations/toeslagen/Zorgtoeslag-Levensgebeurtenissen.ttl`, line 304:

```turtle
<.../rules/DecisionRule_0btwm30> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "DecisionRule_0btwm30" ;
    cprmv:ruleType "decision-rule" ;
    cprmv:confidence "medium" ;
    cprmv:decisionTable "DecisionTable_1jgvsw8" ;
    cprmv:rulesetType "decision-table" .
```

So even with Layer 1 in place, a cell-level citation would currently be silently dropped
on publish. Two files need extending, not one.

## Layer 3 — what publishing a grounded cell should actually look like

Two existing patterns in `ttlGenerator.js` already do exactly what a per-cell resource
needs — neither has to be invented:

**The recursive `hasPart` list.** `generateRuleSetSection()` (lines 817–884) already
builds an ordered `cprmv:hasPart` list of `cprmv:Rule` URIs for a RuleSet:

```js
// ttlGenerator.js:882-883 (current, RuleSet -> Rule)
const memberUris = rules.map((rule) => `<${this.cprmvRuleUri(rule)}>`).join(' ');
ttl += `    cprmv:hasPart (${memberUris}) .\n\n`;
```

`cprmv:RuleShape` already permits `cprmv:hasPart` directly on a `cprmv:Rule` too (not just
a `RuleSet`) — the exact same recursive `rdf:first`/`rdf:rest` list shape
(`cprmv:hasPartListShape`) applies either way. So a `cprmv:DecisionRule` (which is also a
`cprmv:Rule`) `hasPart`-ing an ordered list of small per-cell `cprmv:Rule` resources is
already legal against the shipping shape set — **no new SHACL shape is required.**

**The `isBasedOn` URI construction.** The rule-level emitter (lines 1229–1233) already
turns a citation string into a resource reference:

```js
// ttlGenerator.js:1229-1233 (current, rule-level cprmv:extends)
if (rule.extends) {
  const extendsUri = rule.extends.startsWith('http')
    ? rule.extends
    : `https://wetten.overheid.nl/${rule.extends}`;
  ttl += `    cprmv:isBasedOn <${extendsUri}> ;\n`;
}
```

And the codebase already round-trips a **raw, unescaped JCI string** through this exact
`https://wetten.overheid.nl/{value}` construction elsewhere in the same published example
— `Zorgtoeslag-Levensgebeurtenissen.ttl` line 26:

```turtle
cv:hasLegalResource <https://wetten.overheid.nl/jci1.3:c:BWBR0018451&artikel=2> ;
```

So extending this one construction to also accept a JCI string (not just a bare BWB id)
needs no new escaping logic — it's already proven to work as-is.

### Concrete `.ttl` for Rule 1's grounded cells

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "_rule_1" ;
    dct:title "Decision rule _rule_1"@nl ;
    dct:description "Decision rule _rule_1 of the DMN decision model."@nl ;
    cprmv:ruleType "decision-rule" ;
    cprmv:confidence "medium" ;
    cprmv:decisionTable "_bca439b7-fdb8-40e3-8a1d-3bb95571c65c_table" ;
    cprmv:rulesetType "decision-table" ;
    cprmv:hasPart ( <.../rules/_rule_1/cell/1> <.../rules/_rule_1/cell/4>
                     <.../rules/_rule_1/cell/5> ) .

<.../rules/_rule_1/cell/1> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-1" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=61d1181d-a7e6-4da1-a121-89ca30fcb7b0> ;
    cprmv:sourceQuote "Woonadres" .

<.../rules/_rule_1/cell/4> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-4" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=0f0d5140-0624-4aa3-a077-2a26087d1436> ;
    cprmv:sourceQuote "hij laag inkomen had" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4> .

<.../rules/_rule_1/cell/5> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-5" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=6fea33db-8454-4a6c-9e02-db6a1f3417db> ;
    cprmv:sourceQuote "een vermogen" .
```

**A compound cell with multiple groundings** (illustrative — using the placeholder
`_inputEntry_2` example above, not real annotation data) doesn't need a new pattern at the
TTL layer at all. `cprmv:hasPart` is already recursive (`cprmv:hasPartListShape` refers to
itself), so a cell resource that has more than one grounding simply `hasPart`s its own
further list of grounding resources instead of carrying `sourceQuote`/`isBasedOn`
directly — the same composition mechanism, one recursion deeper, only where needed:

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    # ... same properties as above ...
    cprmv:hasPart ( <.../rules/_rule_1/cell/1> <.../rules/_rule_1/cell/2>
                     <.../rules/_rule_1/cell/4> <.../rules/_rule_1/cell/5> ) .

<.../rules/_rule_1/cell/2> a cprmv:Rule ;
    cprmv:hasPart ( <.../rules/_rule_1/cell/2/grounding/1>
                     <.../rules/_rule_1/cell/2/grounding/2> ) .

<.../rules/_rule_1/cell/2/grounding/1> a cprmv:Rule ;
    cprmv:sourceQuote "hij is meerderjarig" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0000001&artikel=1> .

<.../rules/_rule_1/cell/2/grounding/2> a cprmv:Rule ;
    cprmv:sourceQuote "tot de pensioengerechtigde leeftijd" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/BWBR0002221/Artikel_7a> .
```

Still **zero new SHACL shapes**, and the DMN-side numbered-attribute encoding maps onto
this cleanly: `dmnHelpers.js` groups `conceptN`/`sourceQuoteN`/`isBasedOnN` by `N` into an
array of groundings per cell; `ttlGenerator.js` emits a flat cell resource when the array
has one entry, or a `hasPart`-composed one when it has more than one.

Two choices worth calling out:

- **`dct:source` instead of a new `cprmv:concept` property.** The DMN attribute layer
  (Layer 1) still uses `cprmv:concept` for the traceability pointer, because that's a
  question for the spec owner (see the companion doc). But at the TTL layer, there's
  already a well-known, zero-negotiation Dublin Core property that means exactly "the
  resource this was derived from" — reusing it here means the published graph needs no
  new property at all for this part, regardless of how the `cprmv:concept` question is
  eventually settled.
- **Cells that carry `cprmv:concept` but nothing else** (`_inputEntry_3`, `_inputEntry_7`,
  `_outputEntry_1` — concept-only, no quote or citation) are deliberately **not** minted
  as their own `hasPart` resource above. A `cprmv:Rule` with only a `dct:source` and
  nothing else adds a resource to the graph without adding anything a reader couldn't
  already get from the DMN's own decision-level `knowledgeSource`. Whether that's the
  right cutoff — mint a cell resource only when there's a quote or a citation, not for a
  bare concept pointer — is worth deciding explicitly rather than defaulting to "mint
  one for everything."

## Layer 4 — validator-side follow-up

Both validators in `linked-data-explorer` are also ours to patch, the same way
`dmn-validation.service.ts` was patched earlier for the missing-`id` and INT-007 issues:

- **`dmn-validation.service.ts`** needs new `EXEC-*` checks once Layer 1 attributes are
  real: that `cprmv:concept` is a well-formed UUID, and that `cprmv:isBasedOn` matches a
  JCI grammar (this would also close a pre-existing gap — the current validator never
  checks the format of the existing rule-level `cprmv:extends` value at all).
- **`shacl-validation.service.ts`** needs **no changes** for the core structure — Layer 3
  above only uses properties (`cprmv:sourceQuote`, `cprmv:isBasedOn`, `cprmv:hasPart`)
  already present in `cprmv.shacl.ttl`'s `cprmv:RuleShape`. It would only need attention
  if the "concept-only cells" question above lands on minting a distinct shape/class for
  them, or if `dct:source`'s cardinality needs constraining (currently unconstrained by
  any shape, which is fine for an optional single-valued property but worth confirming).

## Open questions before this should be built for real

See the companion spec-owner doc for the full list. The most consequential:

1. Is `cprmv:isBasedOn` at cell level meant to be the same relation as the already-shipping
   rule-level one, just one level deeper — or does composing it via `hasPart` change what
   it should point at?
2. Should JuriConnect (JCI) become the one citation format across `cprmv:extends` /
   `cprmv:isBasedOn`, replacing the current ad hoc `BWBR0002221/Artikel_7a` string?
3. Does `cprmv:concept` belong in the shared `cprmv:` namespace at all, given the TTL
   layer already gets by with plain `dct:source`?
4. Is the numbered-attribute convention (`cprmv:concept1`/`concept2`/...) for multiple
   groundings on one cell an acceptable house convention, or should the CPRMV vocabulary
   define a standard way to encode a multi-valued relationship in an XML-attribute
   serialization — this isn't specific to `cprmv:concept`, it would recur for any
   future multi-valued CPRMV property attached to a DMN element.
