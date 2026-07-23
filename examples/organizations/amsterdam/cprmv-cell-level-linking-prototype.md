# Prototype: cell-level legislative linking via `cprmv:*`

## The gap

DMN's own extension points for tying a decision to its legal authority —
`<authorityRequirement>` / `<requiredAuthority>` / `<knowledgeSource>` — only attach at
the `<decision>` level. The CPRMV attributes already shipping in
`examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn` (`cprmv:extends`,
`cprmv:ruleType`, `cprmv:confidence`, `cprmv:note`) go one level deeper by attaching to
`<rule>` — but no further. Neither standard DMN nor the CPRMV attributes in current use
can say "this specific *cell* — one input or output entry inside one rule row — comes
from this specific legal source."

The Municipality of Amsterdam already needs exactly that. This doc prototypes it against
**Rule 1 of the main decision table** in
`individuele-inkomenstoeslag-iknow-patched.dmn` (decision
`_bca439b7-fdb8-40e3-8a1d-3bb95571c65c`, "Beslistabel bepalen aanspraak op individuele
inkomenstoeslag"), using real cross-references pulled from `HvA_annotaties.xml` — nothing
here is invented placeholder content.

## How the source data already supports this

`HvA_annotaties.xml` has three element kinds that, read together, already are a
cell-level legal grounding model — they just aren't connected to the DMN file's rule/cell
structure today:

- **`<concept>`** — an abstract legal fact/notion (e.g. *"natuurlijk persoon heeft
  woonadres"*). Referenced from a DMN `knowledgeSource` as a **CPT** id.
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

| Cell | Condition | Grounding found | Level |
|---|---|---|---|
| `_inputEntry_1` | woonachtig in de gemeente = `true` | APT `61d1181d-a7e6-4da1-a121-89ca30fcb7b0` → concept *"natuurlijk persoon heeft woonadres"*, quote `"Woonadres"`, document `Beleidsregels Stadpas.docx` — **no JCI citation on this particular annotation** | quote + concept, no pinpoint citation |
| `_inputEntry_2` | leeftijd `>= 21 and < pensioengerechtigde leeftijd` | none — the `_adcd1d42` sub-decision that supplies "pensioengerechtigde leeftijd" has no `authorityRequirement`/`knowledgeSource` of its own anywhere in the DMN | **ungrounded today** (pre-existing gap, not introduced by this proposal) |
| `_inputEntry_3` | uitzicht op inkomensverbetering = `false` | CPT `cf35d84d-bec6-42b7-8491-9208ef44d2c9` → concept *"rechthebbende op individuele inkomenstoeslag heeft uitzicht op inkomensverbetering"* — a CPT, so no literal quote exists | concept only, no quote, no citation |
| `_inputEntry_4` | langdurig laag inkomen = `true` | APT `0f0d5140-0624-4aa3-a077-2a26087d1436` → concept *"natuurlijke persoon heeft langdurig laag inkomen"*, quote `"hij laag inkomen had"`, document **Verordening Individuele Inkomenstoeslag Participatiewet Amsterdam 2021**, **`juriconnect="jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende nummer&artikel=4"`** | full triple — concept + quote + pinpoint citation |
| `_inputEntry_5` | vermogen `<= vermogensgrens` | APT `6fea33db-8454-4a6c-9e02-db6a1f3417db` → concept *"natuurlijk persoon beschikt over een vermogen"*, quote `"een vermogen"`, document `Beleidsregels Stadpas.docx` — no JCI citation | quote + concept, no pinpoint citation |
| `_inputEntry_6` | een schuldregeling = `-` | n/a — wildcard, nothing is tested | **rightfully ungrounded** |
| `_inputEntry_7` | gezinssituatie `not "met partner"` | CPT `8bf152a7-22a1-4624-b43b-aa9c9ff68b30` → concept *"natuurlijk persoon heeft gezinssituatie"* | concept only |
| `_inputEntry_8` | partner uitzicht op inkomensverbetering = `-` | n/a — wildcard | **rightfully ungrounded** |
| `_outputEntry_1` | aanspraak = `true` | CPT `4b7157ff-2bc6-4ada-ba36-8123e6038dfe` → concept *"aanspraak individuele inkomenstoeslag"* (the decision's own existing knowledge source, restated at the specific output value) | concept only |

This spread is the actual argument for the design below: it has to degrade gracefully
when only partial annotation data exists, rather than force every cell to have a full
citation before any of this is usable.

## Proposed attributes

Three attributes, attached directly to `<inputEntry>` / `<outputEntry>` — the same
foreign-attribute extension mechanism `cprmv:extends`/`cprmv:ruleType`/etc. already use at
`<rule>` level, so nothing about DMN's schema or Operaton's tolerance for unknown
namespaces changes:

| Attribute | Value | Source |
|---|---|---|
| `cprmv:concept` | the iKnow CPT or APT id (not invented — this is the traceability pass-through back to `HvA_annotaties.xml`; see open question 4 in the companion spec-owner doc) | `<concept id>` / `<textannotation id>` |
| `cprmv:sourceQuote` | the literal quoted text, verbatim | `<textannotation><text>` |
| `cprmv:isBasedOn` | a JuriConnect (JCI) citation string | `<textannotation juriconnect="...">` |

`cprmv:sourceQuote` and `cprmv:isBasedOn` are named directly after the properties already
defined in the abstract CPRMV vocabulary (`https://cprmv.open-regels.nl/respec/`) —
`sourceQuote` ("replicates (a part of) the definition of the cprmv:Rule that is being
extended") and `isBasedOn` (the citation/derivation link) — rather than inventing new
names. Whether that's actually the right call, or whether it collides with the
already-shipping `cprmv:extends`, is exactly what the companion doc asks the spec owner
to resolve.

## Before / after

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

Note what's *not* added: `_inputEntry_2` (no concept exists to cite — forcing one would
be fabrication), `_inputEntry_6` and `_inputEntry_8` (wildcards — there's nothing to
ground). The extension has to be optional per cell for this reason; making it mandatory
would either block deployment of every real DMN in this corpus or force garbage
citations onto ungrounded/wildcard cells.

This is a documentation prototype only — the actual `.dmn` files (patched or original)
are unchanged by this doc. Turning it into a real change additionally needs:
`xmlns:cprmv="https://cprmv.open-regels.nl/0.3.0/"` on `<dmn:definitions>` (already
present in `RONL_BerekenLeeftijden_CPRMV.dmn`, absent from this file), and new validator
checks in `linked-data-explorer`'s `dmn-validation.service.ts` (an `EXEC-*` check that
`cprmv:concept` values are well-formed UUIDs, and — once the JCI-format question below is
settled — a check that `cprmv:isBasedOn` matches the JCI grammar rather than the current
`BWB_ID_RE`, which only matches a bare BWB number and doesn't even validate the existing
rule-level `cprmv:extends` value).

## Open questions before this should be built for real

See the companion doc for the full list — the two that block writing validator code:

1. Is `cprmv:isBasedOn` meant to replace `cprmv:extends`, or do they coexist at different
   granularities (rule vs. cell)?
2. Should JuriConnect (JCI) become the one citation format across all of `cprmv:extends`
   / `cprmv:isBasedOn` / `cprmv:implements`, replacing the current ad hoc
   `BWBR0002221/Artikel_7a` string — given it already uniformly covers both national
   wetgeving and Amsterdam's un-BWB'd local verordeningen/beleidsregels, and iKnow already
   emits it natively with zero mapping work required?
