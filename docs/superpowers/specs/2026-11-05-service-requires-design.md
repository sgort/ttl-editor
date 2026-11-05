# Service dependency: `dct:requires` between public services

Issue: #223. Spans ttl-editor and linked-data-explorer (LDE). Delivered as two
pull requests: ttl-editor first, then LDE.

## Intent

Splitting a combined DMN into separate models (PR #222, thuisbatterij) makes
each decision independently publishable and linkable in BPMN, but the published
data no longer says the parts belong together. The *hoogte* service is computed
"under the assumption of *recht*", and nothing records that.

This feature lets a public service state, in its published TTL, that it
requires another public service, and lets LDE show that link. It is **context
only**: it records that one service makes use of another, not in what order
they run or under which condition. Order and conditions stay in the BPMN
(`decisionRef`s and gateways), which LDE already owns.

## Goals

- A service can declare zero or more required services, from any organisation
  or dataset.
- The relation is published as standard CPSV-AP and passes the editor's SHACL
  check.
- The relation survives an editor round trip (import → edit → export → publish).
- LDE shows the link on both ends: "requires …" on the dependent service's DMN,
  "required by …" on the required one.

## Non-goals

- LDE does **not** act on the relation: no auto-adding to chains, no BPMN
  ordering warnings, no evaluation gating.
- No condition or ordering semantics in the data (no "only if
  `rechtOpSubsidie = true`").
- No umbrella grouping (option C in #223). That would be a `dcat:Dataset` /
  catalogue, because CPSV-AP 3.2.0 constrains `dct:isPartOf` on a PublicService
  to `sh:class dcat:Dataset`. Out of scope until needed.
- No new LDE endpoint for listing public services (see Editor: choosing a
  service).
- **Public datasets only** for the editor's dropdown. LDE's query proxy passes no
  API token, and it stays that way. For a private dataset the list doesn't load,
  and pasting a URI is the way to add a link. *(User decision.)*
- **"Required by" covers one dataset.** LDE builds its DMN list from one endpoint
  at a time, so "required by" shows only when the dependent service is in the
  same dataset.
  - That fits the planned Triply OTAP split: one dataset per environment (O, T,
    A, and P on its own instance), with related services published together into
    the same one.
  - A `dct:requires` that points into another dataset still shows as "Requires"
    on the dependent service's DMN. *(User decision.)*

## Anti-goals

- Bidirectional `dct:requires` (both services requiring each other) must not be
  the way to make a link visible from both sides. `dct:requires` is directional;
  LDE derives the inverse.

## Vocabulary (checked)

- **Property:** `dct:requires` (`http://purl.org/dc/terms/requires`). In the
  CPSV-AP 3.2.0 shapes vendored in LDE
  (`packages/backend/shapes/cpsv-ap/3.2.0/cpsv-ap-SHACL.ttl`, ~l.968),
  PublicService.requires is `dct:requires` with `sh:class cpsv:PublicService`,
  no cardinality, "the way a Public Service makes use of other Public Services".
  It is **not** `cv:requires`.
- **Direction:** the subject is the dependent service and the object is the
  service it relies on. For thuisbatterij:
  `<…/hoogte-subsidie-thuisbatterij-flevoland> dct:requires <…/recht-op-subsidie-thuisbatterij-flevoland>`.
- **Shapes:** `PublicServiceShape` is `sh:closed false`. The CPRMV 0.4.1 shapes
  do not target `cpsv:PublicService`. An extra `dct:requires` violates nothing,
  *provided* the object is typed `cpsv:PublicService` in the file being
  validated (see Generator).

## Editor (PR 1, ttl-editor)

### State

- `DEFAULT_SERVICE` (`src/utils/constants.js`) gains `requires: []`, an array of
  service URI strings.
- `src/utils/importHandler.js` copies service keys through a fixed whitelist.
  Add `requires` there (default `[]`), or imports drop it.

### Service tab

- In `src/components/tabs/ServiceTab.jsx`, add a "Requires" field (English label,
  like the tab's other labels) with a list of the selected
  required services, each removable.
- **Adding:**
  - A dropdown of public services already published to the current Triply
    dataset. Each option shows the service title, with its URI on hover or as
    secondary text.
  - A text input to paste a URI, so that publishing order does not matter: the
    dependent service can be published before the required one exists.
- **Rules:**
  - Exclude the service being edited from the dropdown, and reject pasting its
    own URI.
    - The service's own URI is the one the generator builds
      (`https://regels.overheid.nl/services/{sanitized identifier}`,
      `ttlGenerator.js` ~l.78). Compare against that. *(My call.)*
  - Reject duplicates.
  - Accept only `http(s)` URIs.
- **When the list can't load** (no dataset configured, network error): show a
  short note and leave the paste input usable. Never block editing.

### Choosing a service: where the list comes from

- **Use the existing proxy.** No new LDE route. Use `POST /v1/triplydb/query`
  (`{ endpoint, query }`) on the LDE backend, following
  `src/utils/ronlHelper.js` (`fetchRonlConcepts`).
- **The query:**
  ```sparql
  PREFIX cpsv: <http://purl.org/vocab/cpsv#>
  PREFIX dct:  <http://purl.org/dc/terms/>
  SELECT DISTINCT ?service ?title WHERE {
    ?service a cpsv:PublicService ; dct:title ?title .
  } ORDER BY LCASE(STR(?title))
  ```
  Requiring `dct:title` excludes the untitled type stubs described under
  Generator.
- **The endpoint:** derive the SPARQL endpoint from the editor's saved
  `triplyDBConfig` (`baseUrl`, `account`, `dataset`; `src/utils/triplydbHelper.js`).
  - LDE talks to these datasets as
    `{baseUrl}/datasets/{account}/{dataset}/services/{dataset}/sparql`. For
    example, the `PublishTest` dataset is served at
    `…/datasets/stevengort/PublishTest/services/PublishTest/sparql`.
  - The editor today only builds `{baseUrl}/datasets/{account}/{dataset}/sparql`
    (`triplydbHelper.js` ~l.268).
  - **Checked on 2026-11-05:** both forms answer SELECT queries for
    `stevengort/PublishTest`. Use the dataset-level `…/sparql` form, which the
    editor already builds.
- Fetch the list when the Service tab is opened and on demand (a refresh
  control). Caching beyond that is the builder's call.

### Generator

In `generateServiceSection()` (`src/utils/ttlGenerator.js` ~l.241–334):

- Emit `dct:requires <uri>` for each entry. Put them among the relationship
  properties, before `cprmv:hasDecisionModel`. One triple per line or a comma
  list is the builder's call, but it must match what the parser reads.
- **After the service block**, emit `<uri> a cpsv:PublicService .` for each
  required URI.
  - Same reason as the existing `dct:LinguisticSystem` and `skos:Concept` stubs
    (l.314–332): file-local SHACL `sh:class` checks run without entailment.
  - In Triply the stub merges harmlessly with the required service's own data.
    If that service is never published, the stub is an untitled
    `cpsv:PublicService` (hence the `dct:title` filter above).

### Parser

In `src/parseTTL.enhanced.js`, in the `currentSection === 'service'` branch
(~l.466–498), read `dct:requires` and collect **every** `<…>` on the line, into
`service.requires`.

**Main risk: the stub triples.** `<uri> a cpsv:PublicService .` is detected as a
service by `detectEntityType`, and that resets `currentSubject`/`currentSection`.
On import the stub must not:

- replace or overwrite the real service,
- create a second service, or
- swallow the lines that follow.

Recognise the stubs (a subject other than the main service, with only `a
cpsv:PublicService`) and skip them. The existing language and `skos:Concept`
stubs show how a bare type line is already tolerated; the builder must verify
the PublicService case specifically, because it is the type the parser treats as
"the service".

### Tests (ttl-editor)

- **Generator:**
  - `dct:requires` is emitted for 0, 1 and 2 entries.
  - The stubs are emitted.
  - Nothing is emitted when `requires` is empty, so the output is byte-identical
    to today.
- **Parser:** a service with two requires, written both as two lines and as a
  comma list. The stubs don't disturb the service or the following sections.
- **Round trip** (`src/parseTTL.roundtrip.test.js` pattern): `requires` survives
  parse → generate → parse.
- **importHandler:** `requires` passes through, with a default of `[]`.
- **ServiceTab:**
  - Add from the dropdown (proxy mocked).
  - Paste a URI.
  - Reject self, duplicates and invalid URIs.
  - Remove an entry.
  - When the list fails to load, the paste input still works.
- **SHACL:** a generated TTL with `requires` and its stubs validates clean
  against CPSV-AP 3.2.0 and CPRMV 0.4.1. Use the existing shaclHelper path or an
  LDE-side fixture, whichever the suites already support.

### Example

- Add `dct:requires <…/recht-op-subsidie-thuisbatterij-flevoland>` and its stub
  to `examples/organizations/flevoland/thuisbatterij-split-dmns/hoogte-subsidie-thuisbatterij-Flevoland.ttl`.
  Do this by re-exporting from the editor once the feature works, not by hand,
  so the example reflects real output.
  - This depends on PR #222 having merged first. If it hasn't, leave the example
    for a follow-up.
- **No changelog edit in either PR.** `src/data/changelog.json` (and LDE's) is
  written only by `/bump-release`, from the commit history, when a release is
  cut.

## LDE (PR 2, linked-data-explorer)

### Backend

- **A separate query.** In `packages/backend/src/services/sparql.service.ts`, add
  a query that returns every `(?service, ?required, ?requiredTitle?)` pair on the
  endpoint:
  ```sparql
  SELECT ?service ?required ?requiredTitle WHERE {
    ?service dct:requires ?required .
    OPTIONAL { ?required dct:title ?requiredTitle }
  }
  ```
  - Do not add it to the main DMN query. That query keeps the first row per DMN
    (~l.256–299), so extra rows would be lost or would multiply.
  - Follow the `getVendorCounts` pre-query pattern (~l.248, l.871).
- **Attach the results in `getAllDmns`** to each DMN by its `service` URI:
  - `requires`: the services this DMN's service requires.
  - `requiredBy`: the services that require this DMN's service (the inverse,
    derived).
  - Each entry is `{ service: string, title?: string, dmnIdentifier?: string }`.
    Fill `dmnIdentifier` when the other service's DMN is in the same result set,
    so the UI can name the DMN the user recognises from the dropdown.
  - The values are cached with the DMN list.
- **Types:** add both fields, optional, to `packages/backend/src/types/dmn.types.ts`
  and to the frontend `DmnModel` (`packages/frontend/src/types/index.ts`).
- **OpenAPI:** document both fields on `DmnModel` in
  `packages/backend/openapi/openapi.yaml` (~l.6227), as optional. No new route.
  `coverage.test.ts` is unaffected, and the conformance check in
  `dmn.routes.test.ts` must still pass.

### Frontend

- **Chain Builder "Available DMNs" card** (`packages/frontend/src/components/ChainBuilder/DmnList.tsx`,
  after the organisation line ~l.122): one small line each, only when non-empty.
  - "Requires: <name>"
  - "Required by: <name>"
  - Name: `dmnIdentifier`, falling back to the service title, then the last URI
    segment.
- **BPMN "Link to DMN/DRD" info box** (`packages/frontend/src/components/BpmnModeler/DmnTemplateSelector.tsx`,
  info box ~l.163–194, before "Decision Ref"): the same two lines for the
  selected DMN. Text only, no actions.
- The composer card (`ChainComposer.tsx`) is optional; builder's call.

### Tests (LDE)

- **sparql.service:**
  - Pairs map to `requires` and `requiredBy` on the right DMNs.
  - `dmnIdentifier` is filled when the other DMN is present and left out when it
    isn't.
  - A required service with no DMN (or unpublished) still appears, with title or
    URI.
- **dmn.routes:** OpenAPI conformance holds with the new fields.
- **DmnList and DmnTemplateSelector:** the lines render when present and are
  absent when empty.

## Constraints

- Follow existing patterns:
  - backend proxy for SPARQL from the editor
  - type stubs for `sh:class`
  - the pre-query plus mapping pattern in LDE
  - optional fields, so older datasets without `dct:requires` behave exactly as
    today
- **No dev-server lifecycle actions; no hook bypasses.**
- Ask before each commit; the user runs the acceptance tests.
- **Verify UI by asking the user**, not with a headless browser.

## Left to the builder

- UI wording and layout details within the placements above.
- Single-line versus comma-list `dct:requires` emission (the parser must accept
  both).
- Caching of the editor's service list.
- Whether the composer card also shows the relation.
