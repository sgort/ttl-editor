# Prototype: cell-level legislative linking via `cprmv:*`

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-13 | Synced against the companion spec-owner doc's resolved open questions: `cprmv:concept` dropped in favor of `dct:source` (both layers), concept-only cells now minted and deduped (`_outputEntry_1`/`4b7157ff-...`), cell URIs id-based, JCI-mandate question closed as "no" |
| 2026-07-23 | Multi-grounding cells: numbered attributes confirmed on Operaton, repeatable child elements rejected                                                                                                                                                                        |
| 2026-07-23 | Added Layers 2–4: DMN-to-TTL pipeline gaps, `.ttl` sketch, validator follow-up                                                                                                                                                                                              |
| 2026-07-23 | Initial prototype: DMN-attribute layer, Rule 1 cross-referenced against `HvA_annotaties.xml`                                                                                                                                                                                |

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
Cross-referencing each cell's underlying condition against `HvA_annotaties.xml` gives
several distinct groundedness levels, from a full concept+quote+citation triple down to
a rightfully ungrounded wildcard — deliberately shown as-is, not cherry-picked, because a
real annotation corpus is never uniformly complete:

| Cell             | Condition                                           | Grounding found                                                                                                                                                                                                                                                                                                  | Level                                                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_inputEntry_1`  | woonachtig in de gemeente = `true`                  | APT `61d1181d-a7e6-4da1-a121-89ca30fcb7b0` → concept _"natuurlijk persoon heeft woonadres"_, quote `"Woonadres"`, document `Beleidsregels Stadpas.docx` — **"https://lokaleregelgeving.overheid.nl/CVDR645454/12"**                                                                                              | full triple — concept + quote + citation (a CVDR URL, not JCI)                                                                                                                                                                                                                                                           |
| `_inputEntry_2`  | leeftijd `>= 21 and < pensioengerechtigde leeftijd` | none — the `_adcd1d42` sub-decision that supplies "pensioengerechtigde leeftijd" has no `authorityRequirement`/`knowledgeSource` of its own anywhere in the DMN                                                                                                                                                  | **ungrounded today** (pre-existing gap, not introduced by this proposal) — also the file's one real example of a **compound cell**: two conjuncts (`>= 21`, `< pensioengerechtigde leeftijd`) that could each need a different citation once grounding data exists for either — see "Multiple groundings per cell" below |
| `_inputEntry_3`  | uitzicht op inkomensverbetering = `false`           | CPT `cf35d84d-bec6-42b7-8491-9208ef44d2c9` → concept _"rechthebbende op individuele inkomenstoeslag heeft uitzicht op inkomensverbetering"_ — **juriconnect="jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01"**                                                              | concept + citation, no quote (a CPT has none)                                                                                                                                                                                                                                                                            |
| `_inputEntry_4`  | langdurig laag inkomen = `true`                     | APT `0f0d5140-0624-4aa3-a077-2a26087d1436` → concept _"natuurlijke persoon heeft langdurig laag inkomen"_, quote `"hij laag inkomen had"`, document **Verordening Individuele Inkomenstoeslag Participatiewet Amsterdam 2021**, **`juriconnect="jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4"`** | full triple — concept + quote + pinpoint citation (JCI)                                                                                                                                                                                                                                                                  |
| `_inputEntry_5`  | vermogen `<= vermogensgrens`                        | APT `6fea33db-8454-4a6c-9e02-db6a1f3417db` → concept _"natuurlijk persoon beschikt over vermogen"_, quote `" vermogen"`, document `Beleidsregels Stadpas.docx` — **https://lokaleregelgeving.overheid.nl/CVDR645454/12**                                                                                         | full triple — concept + quote + citation (a CVDR URL, not JCI)                                                                                                                                                                                                                                                           |
| `_inputEntry_6`  | een schuldregeling = `-`                            | n/a — wildcard, nothing is tested                                                                                                                                                                                                                                                                                | **rightfully ungrounded**                                                                                                                                                                                                                                                                                                |
| `_inputEntry_7`  | gezinssituatie `not "met partner"`                  | CPT `8bf152a7-22a1-4624-b43b-aa9c9ff68b30` → concept _"natuurlijk persoon heeft gezinssituatie"_                                                                                                                                                                                                                 | concept only                                                                                                                                                                                                                                                                                                             |
| `_inputEntry_8`  | partner uitzicht op inkomensverbetering = `-`       | n/a — wildcard                                                                                                                                                                                                                                                                                                   | **rightfully ungrounded**                                                                                                                                                                                                                                                                                                |
| `_outputEntry_1` | aanspraak = `true`                                  | CPT `4b7157ff-2bc6-4ada-ba36-8123e6038dfe` → concept _"aanspraak individuele inkomenstoeslag"_ (the decision's own existing knowledge source, restated at the specific output value)                                                                                                                             | concept only                                                                                                                                                                                                                                                                                                             |

This spread is the actual argument for the design below: it has to degrade gracefully
when only partial annotation data exists, rather than force every cell to have a full
citation before any of this is usable.

## Layer 1 — the DMN attributes

> **Revised** to match the spec owner's answers, recorded in the companion spec-owner
> doc's §6 (open questions 1–6, all now resolved). The most consequential change here:
> there is no `cprmv:concept` — a concept the DMN points at is itself a `cprmv:Rule`
> (open question 4's answer), so the traceability pointer back to iKnow's own registry
> uses the same well-known property the TTL layer already uses for it, `dct:source`, not
> a bespoke CPRMV-namespace property.

Three attributes, attached directly to `<inputEntry>` / `<outputEntry>` — the same
foreign-attribute extension mechanism `cprmv:extends`/`cprmv:ruleType`/etc. already use at
`<rule>` level, so nothing about DMN's schema or Operaton's tolerance for unknown
namespaces changes:

| Attribute           | Value                                                                                                                                                                                                                                  | Source                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `dct:source`        | the iKnow CPT or APT id (not invented — this is the traceability pass-through back to `HvA_annotaties.xml`), present whenever a concept/textannotation grounds the cell at all, independent of whether a quote or citation also exists | `<concept id>` / `<textannotation id>`                                         |
| `cprmv:sourceQuote` | the literal quoted text, verbatim                                                                                                                                                                                                      | `<textannotation><text>`                                                       |
| `cprmv:isBasedOn`   | a legislative citation — a JuriConnect (JCI) string, or a plain citation URL (Amsterdam's own data has both; see "Rule 1, column by column" above) — only present when the source `<textannotation>` actually supplies one             | `<textannotation juriconnect="...">`, or a citation URL in the annotation text |

`dct:source` and `cprmv:isBasedOn` are no longer two readings of the same slot — the
earlier draft had `isBasedOn` fall back to carrying the bare concept id when no citation
existed, which meant the same attribute meant two different things depending on what was
available. Splitting them is cleaner: `dct:source` is always the traceability/dedup
pointer when any grounding exists; `isBasedOn` is always a citation, never a stand-in
for one.

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

**After** (same rule, `dct:source`/`cprmv:*` attributes added — no structural change, no
new elements, no ids changed). `_inputEntry_1`, `_inputEntry_3`, and `_inputEntry_5` now
also carry `cprmv:isBasedOn`, using the real citations a same-branch edit surfaced (see
"Rule 1, column by column" above) — `_inputEntry_1`/`_5` as a plain CVDR URL,
`_inputEntry_3` as a JCI string, so both value grammars are represented here, not just
JCI:

```xml
<dmn:rule id="_rule_1">
  <dmn:inputEntry id="_inputEntry_1"
                  dct:source="61d1181d-a7e6-4da1-a121-89ca30fcb7b0"
                  cprmv:sourceQuote="Woonadres"
                  cprmv:isBasedOn="https://lokaleregelgeving.overheid.nl/CVDR645454/12">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_2">
    <dmn:text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_3"
                  dct:source="cf35d84d-bec6-42b7-8491-9208ef44d2c9"
                  cprmv:isBasedOn="jci1.3:c:BWBR0015703&amp;hoofdstuk=4&amp;paragraaf=4.1&amp;artikel=36&amp;z=2026-07-01&amp;g=2026-07-01">
    <dmn:text>false</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_4"
                  dct:source="0f0d5140-0624-4aa3-a077-2a26087d1436"
                  cprmv:sourceQuote="hij laag inkomen had"
                  cprmv:isBasedOn="jci1.31:c:NoBWBnumber&amp;hoofdstuk=ontbrekende nummer&amp;artikel=4">
    <dmn:text>true</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_5"
                  dct:source="6fea33db-8454-4a6c-9e02-db6a1f3417db"
                  cprmv:sourceQuote="een vermogen"
                  cprmv:isBasedOn="https://lokaleregelgeving.overheid.nl/CVDR645454/12">
    <dmn:text>&lt;= van toepassing zijnde vermogensgrens</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_6">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_7"
                  dct:source="8bf152a7-22a1-4624-b43b-aa9c9ff68b30">
    <dmn:text>not "met partner"</dmn:text>
  </dmn:inputEntry>
  <dmn:inputEntry id="_inputEntry_8">
    <dmn:text>-</dmn:text>
  </dmn:inputEntry>
  <dmn:outputEntry id="_outputEntry_1"
                   dct:source="4b7157ff-2bc6-4ada-ba36-8123e6038dfe">
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

The single-grounding design above can't express this: `dct:source`/`sourceQuote`/
`isBasedOn` are plain XML attributes, and an attribute holds exactly one value. Two
encodings for "more than one" were tested directly against local Operaton
(`http://localhost:8081/engine-rest`) before picking one:

| Design tested                                                                                                                                       | Deploys on Operaton? | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single grounding via `dct:source`/`cprmv:sourceQuote`/`cprmv:isBasedOn` on `<inputEntry>`                                                           | ✅ Deploys           | The baseline design above; the empirical result (attributes deploy, child elements don't) is about the _mechanism_, not the specific attribute names, so it's unaffected by dropping `cprmv:concept` in favor of `dct:source`                                                                                                                                                                     |
| Multiple groundings via repeatable `<cprmv:grounding concept="..." .../>` **child elements**                                                        | ❌ **Rejected**      | `cvc-complex-type.2.4.d: Invalid content was found starting with element 'cprmv:grounding'. No child element is expected at this point.` — Operaton's DMN XSD has no extension point in `tUnaryTests`'s content model after `<text>`. Foreign _attributes_ are tolerated everywhere in this DMN; foreign _child elements_ are not — this is a hard schema rejection, not a transform-time warning |
| Multiple groundings via **numbered attribute families** (`dct:source1`/`sourceQuote1`/`isBasedOn1`, `dct:source2`/`sourceQuote2`/`isBasedOn2`, ...) | ✅ **Deploys**       | No upper bound on the count; each grounding is an independent, self-contained set of attributes — no delimiter, no escaping, no risk of three parallel lists drifting out of sync                                                                                                                                                                                                                 |

So the design stays attribute-only, extended with numbering rather than any structural
addition:

```xml
<dmn:inputEntry id="_inputEntry_2"
                dct:source1="PLACEHOLDER-concept-A"
                cprmv:sourceQuote1="hij is meerderjarig"
                cprmv:isBasedOn1="jci1.3:c:BWBR0000001&amp;artikel=1"
                dct:source2="PLACEHOLDER-concept-B"
                cprmv:sourceQuote2="tot de pensioengerechtigde leeftijd"
                cprmv:isBasedOn2="BWBR0002221/Artikel_7a">
  <dmn:text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</dmn:text>
</dmn:inputEntry>
```

The unnumbered `dct:source`/`cprmv:sourceQuote`/`cprmv:isBasedOn` form (used everywhere
else in this doc) remains valid shorthand for the common case — exactly one grounding,
equivalent to an implicit `1`.

This layer alone is a documentation prototype only — the actual `.dmn` files are
unchanged. Turning it into a real DMN-level change additionally needs
`xmlns:cprmv="https://cprmv.open-regels.nl/0.3.0/"` on `<dmn:definitions>` (already
present in `RONL_BerekenLeeftijden_CPRMV.dmn`, absent from this file) **and**
`xmlns:dct="http://purl.org/dc/terms/"` (the same prefix already used throughout every
published `.ttl` in this repo — `src/utils/constants.js` — now needed on the DMN side
too, for `dct:source`), plus new validator checks in `linked-data-explorer`'s
`dmn-validation.service.ts` — see Layer 4 below.

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
never the `<inputEntry>` element's own attributes. So `dct:source` / `cprmv:sourceQuote`
/ `cprmv:isBasedOn` from Layer 1 are invisible to this code today, even once they exist
in the XML.

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

> **Revised** to match the companion spec-owner doc's §5 (open questions 4 and 5, both
> resolved): concept-only cells are minted too, and a concept referenced from more than
> one place — `_outputEntry_1` and the decision's own `knowledgeSource` both resolve to
> the same CPT concept, `4b7157ff-...` — is minted exactly once and shared via
> `isBasedOn`, not duplicated. Cell URIs are now keyed off the DMN's own `<inputEntry>`/
> `<outputEntry>` `id` (`_inputEntry_1`, not a column index), matching this file's
> existing id scheme (unlike `HvA_full_dmn_export.dmn`, this patched file's ids already
> double as stable per-cell keys — see the companion doc's §5 for why that matters).

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    dct:identifier "_rule_1" ;
    dct:title "Decision rule _rule_1"@nl ;
    dct:description "Decision rule _rule_1 of the DMN decision model."@nl ;
    cprmv:ruleType "decision-rule" ;             # unresolved — companion doc's open question 8
    cprmv:confidence "medium" ;
    cprmv:decisionTable "_bca439b7-fdb8-40e3-8a1d-3bb95571c65c_table" ;
    cprmv:rulesetType "decision-table" ;         # unresolved — companion doc's open question 8
    cprmv:hasPart ( <.../rules/_rule_1/cell/_inputEntry_1>
                     <.../rules/_rule_1/cell/_inputEntry_3>
                     <.../rules/_rule_1/cell/_inputEntry_4>
                     <.../rules/_rule_1/cell/_inputEntry_5>
                     <.../rules/_rule_1/cell/_inputEntry_7>
                     <.../rules/_rule_1/cell/_outputEntry_1> ) .

<.../rules/_rule_1/cell/_inputEntry_1> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_inputEntry_1" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=61d1181d-a7e6-4da1-a121-89ca30fcb7b0> ;
    cprmv:sourceQuote "Woonadres" ;
    cprmv:isBasedOn <https://lokaleregelgeving.overheid.nl/CVDR645454/12> .

<.../rules/_rule_1/cell/_inputEntry_3> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_inputEntry_3" ;
    cprmv:isBasedOn <.../concepts/cf35d84d-bec6-42b7-8491-9208ef44d2c9> .

<.../rules/_rule_1/cell/_inputEntry_4> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_inputEntry_4" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=0f0d5140-0624-4aa3-a077-2a26087d1436> ;
    cprmv:sourceQuote "hij laag inkomen had" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4> .

<.../rules/_rule_1/cell/_inputEntry_5> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_inputEntry_5" ;
    dct:source <https://hva.pna-web.com/hva/?type=APT&id=6fea33db-8454-4a6c-9e02-db6a1f3417db> ;
    cprmv:sourceQuote "een vermogen" ;
    cprmv:isBasedOn <https://lokaleregelgeving.overheid.nl/CVDR645454/12> .

<.../rules/_rule_1/cell/_inputEntry_7> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_inputEntry_7" ;
    cprmv:isBasedOn <.../concepts/8bf152a7-22a1-4624-b43b-aa9c9ff68b30> .

<.../rules/_rule_1/cell/_outputEntry_1> a cprmv:Rule ;
    dct:identifier "_rule_1-cell-_outputEntry_1" ;
    cprmv:isBasedOn <.../concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe> .

<.../concepts/cf35d84d-bec6-42b7-8491-9208ef44d2c9> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=CPT&id=cf35d84d-bec6-42b7-8491-9208ef44d2c9> ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01> .

<.../concepts/8bf152a7-22a1-4624-b43b-aa9c9ff68b30> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=CPT&id=8bf152a7-22a1-4624-b43b-aa9c9ff68b30> .

<.../concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe> a cprmv:Rule ;
    dct:source <https://hva.pna-web.com/hva/?type=CPT&id=4b7157ff-2bc6-4ada-ba36-8123e6038dfe> ;
    cprmv:sourceQuote "Een persoon kan op een daartoe strekkend verzoek in aanmerking komen voor een individuele inkomenstoeslag" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=3> .
```

`.../concepts/4b7157ff-...` is minted once and referenced from two places: this rule's
output cell above, and (once the decision-level `authorityRequirement`/`knowledgeSource`
is itself emitted as TTL, a separate, pre-existing gap not scoped to this doc) the
decision `_bca439b7-...` itself — same concept, same URI, no duplication. The three APT
cells (`_inputEntry_1`, `_4`, `_5`) don't go through a concept resource at all: each is
already 1:1 with its own `<textannotation>`, so there's no reuse to dedup and they carry
`dct:source`/`sourceQuote`/`isBasedOn` directly, exactly as before.

**A compound cell with multiple groundings** (illustrative — using the placeholder
`_inputEntry_2` example above, not real annotation data) doesn't need a new pattern at the
TTL layer at all. `cprmv:hasPart` is already recursive (`cprmv:hasPartListShape` refers to
itself), so a cell resource that has more than one grounding simply `hasPart`s its own
further list of grounding resources instead of carrying `sourceQuote`/`isBasedOn`
directly — the same composition mechanism, one recursion deeper, only where needed:

```turtle
<.../rules/_rule_1> a cpsv:Rule, cprmv:DecisionRule ;
    # ... same properties as above ...
    cprmv:hasPart ( <.../rules/_rule_1/cell/_inputEntry_1>
                     <.../rules/_rule_1/cell/_inputEntry_2>
                     <.../rules/_rule_1/cell/_inputEntry_4>
                     <.../rules/_rule_1/cell/_inputEntry_5> ) .

<.../rules/_rule_1/cell/_inputEntry_2> a cprmv:Rule ;
    cprmv:hasPart ( <.../rules/_rule_1/cell/_inputEntry_2/grounding/1>
                     <.../rules/_rule_1/cell/_inputEntry_2/grounding/2> ) .

<.../rules/_rule_1/cell/_inputEntry_2/grounding/1> a cprmv:Rule ;
    cprmv:sourceQuote "hij is meerderjarig" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0000001&artikel=1> .

<.../rules/_rule_1/cell/_inputEntry_2/grounding/2> a cprmv:Rule ;
    cprmv:sourceQuote "tot de pensioengerechtigde leeftijd" ;
    cprmv:isBasedOn <https://wetten.overheid.nl/BWBR0002221/Artikel_7a> .
```

Still **zero new SHACL shapes**, and the DMN-side numbered-attribute encoding maps onto
this cleanly: `dmnHelpers.js` groups `sourceN`/`sourceQuoteN`/`isBasedOnN` by `N` into an
array of groundings per cell; `ttlGenerator.js` emits a flat cell resource when the array
has one entry, or a `hasPart`-composed one when it has more than one.

Two choices worth calling out:

- **`dct:source`, at both layers, instead of a new `cprmv:concept` property.** The
  earlier draft of this doc used `cprmv:concept` at the DMN-attribute layer while noting
  the TTL layer already got by with plain `dct:source` — flagged as an open question for
  the spec owner either way. The answer (open question 4) settled it in `dct:source`'s
  favor at both layers: there's no `cprmv:concept` anywhere now, DMN attribute or TTL
  property. One well-known, zero-negotiation Dublin Core term, used consistently.
- **Concept-only cells are minted now, reversing the earlier draft's rule.** The
  earlier version of this doc deliberately did _not_ mint `_inputEntry_3`,
  `_inputEntry_7`, or `_outputEntry_1` as their own resources — reasoning that a
  `cprmv:Rule` with only a `dct:source` adds nothing a reader couldn't already get from
  the decision's own `knowledgeSource`. Open question 5's answer reframes this: it was
  never really about whether a quote or citation exists — it's about whether the same
  concept is referenced from more than one place. `_outputEntry_1` above is exactly that
  case, confirmed against real data, not hypothetical: the same concept is minted once
  and referenced from two places instead of duplicated — a `cprmv:Rule` that's only ever
  referenced from one place is still worth minting (it tells a reader which specific
  cell asserts it, not just which decision), and if it later turns out to be shared, the
  dedup benefit was there from the start.

## Layer 4 — validator-side follow-up

Both validators in `linked-data-explorer` are also ours to patch, the same way
`dmn-validation.service.ts` was patched earlier for the missing-`id` and INT-007 issues:

- **`dmn-validation.service.ts`** needs new `EXEC-*` checks once Layer 1 attributes are
  real: that `dct:source` is a well-formed UUID (or a `pna-web.com` URL), and that
  `cprmv:isBasedOn` matches either JCI grammar or a plain citation URL — not JCI
  unconditionally, since Amsterdam's own data already uses both (this would also close a
  pre-existing gap — the current validator never checks the format of the existing
  rule-level `cprmv:extends` value at all).
- **`shacl-validation.service.ts`** needs **no changes** for the core structure — Layer 3
  above only uses properties (`cprmv:sourceQuote`, `cprmv:isBasedOn`, `cprmv:hasPart`)
  already present in `cprmv.shacl.ttl`'s `cprmv:RuleShape`. It would only need attention
  if `dct:source`'s cardinality needs constraining (currently unconstrained by any
  shape, which is fine for an optional single-valued property but worth confirming).

## Open questions before this should be built for real

See the companion spec-owner doc's §6 for the full list, including the actual answers.
The questions raised directly by this prototype, now resolved:

1. ~~Is `cprmv:isBasedOn` at cell level the same relation as the already-shipping
   rule-level one?~~ **Resolved: yes**, same relation, smaller scope (companion doc,
   open question 1).
2. ~~Should JuriConnect (JCI) become the one citation format?~~ **Resolved: no** —
   see the companion doc's §3 rewrite and open question 3. Amsterdam's own data (this
   doc's own worked example, above) already mixes JCI and plain citation URLs; both are
   accepted, neither mandated.
3. ~~Does `cprmv:concept` belong in the shared `cprmv:` namespace at all?~~
   **Resolved: no such property** — `dct:source` throughout, both layers (Layer 1
   above; companion doc's open question 4).
4. ~~Is the numbered-attribute convention an acceptable house convention?~~
   **Resolved, informally: "anything that works is fine"** — companion doc's open
   question 6. Kept, since it's empirically proven on Operaton and the spec owner's
   own alternative (delimited single-attribute lists) isn't.

Still open, relevant to this prototype specifically: whether `cprmv:ruleType` and
`cprmv:rulesetType` (both used in the "Concrete `.ttl`" block above) are actually
defined anywhere in CPRMV — raised unprompted by the spec owner, unresolved (companion
doc's open question 8), flagged inline in the turtle above.
