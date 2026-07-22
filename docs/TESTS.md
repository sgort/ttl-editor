# Test suite — CPSV Editor

Modeled on [`ronl-business-api`'s `docs/TESTS.md`](https://github.com/sgort/ronl-business-api/blob/acc/docs/TESTS.md).
That file documents a mature, coverage-instrumented backend suite; this one
documents a suite still being built out phase by phase. For the strategy,
sequencing, and remaining backlog (P5 onward), see
[`TESTING-GUIDE.md`](./TESTING-GUIDE.md).

## Running the tests

All tests run with Jest via `react-scripts test` (this is still a
Create React App project — see `TESTING-GUIDE.md` for the planned Vite
migration).

```bash
# Run everything once, non-interactively
npm run test:ci

# Watch mode during development
npm test

# Just the TTL generator's date-axis/version-target regression tests
npm run test:generator

# Just the round-trip tests (P1)
npm run test:roundtrip

# Just the P2 pure-logic util tests
npm run test:p2

# Just the P3 hook tests
npm run test:p3

# Just the P4 network-touching util tests
npm run test:p4
```

Each phase gets its own `test:<phase>` / `test:<phase>:watch` script pair as
it lands — see "Adding tests" below.

---

## Test files

### `src/App.test.js` — P0

**1 test · component smoke test**

Replaces CRA's stock "learn react link" stub, which asserted text this app
never rendered — `test:ci` had been red for that reason alone since the
project was scaffolded. Now renders `<App />` and asserts on the real header
("Core Public Service Editor").

---

### `src/parseTTL.roundtrip.test.js` — P1

**9 tests · round-trip · real fixtures, no mocks**

Parses a real reference export (`examples/*.ttl`), regenerates TTL from the
parsed state, then parses the regenerated TTL again — comparing every
business field between the two parses rather than diffing against the
original file's own formatting (which would be brittle: the generator's
output style legitimately differs from hand-authored input).

| Fixture                                                | What it covers                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `examples/full-test.ttl`                               | Full-shape export with an embedded DMN model                                                         |
| `examples/full-test-import-export.ttl`                 | Same, purpose-built for round-trip verification; also used for the concepts/DMN coupling tests below |
| `examples/organizations/svb/Bepaling-leeftijd-AOW.ttl` | A real, DMN-free organizational export                                                               |

`dmnData` is derived from each fixture's own `hasDmnData`/`importedDmnBlocks`
the same way `importHandler.js`'s `handleTTLImport` really does it — calling
`generateTTL` with an empty `dmnData` regardless of what the fixture actually
contains would be testing a shape the app never produces.

`examples/ronl.ttl` is deliberately **not** a fixture here — it's the RONL
SKOS vocabulary/taxonomy definition file (prefixed-name concepts throughout,
no bracketed subject URIs), not a CPSV-AP service export. Feeding it to
`parseTTLEnhanced` throws, correctly, on an out-of-scope document shape.

A second `describe` block locks in the concepts/DMN coupling explicitly —
see "Documented behavior" below.

---

### `src/utils/cprmvImport.test.js` — pre-existing + P2

**13 tests · pure unit**

Covers `flattenCprmvRules`, which maps the CPRMV Rules API's nested
`RuleSet → hasPart` JSON into the editor's flat rule array.

| Group                             | What is tested                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sub-clause folding (pre-existing) | Nested `hasPart` members without a `rule_id_path` fold into the parent's `definition`; members that ARE rules (carry a `rule_id_path`) stay separate; a flat rule with no `hasPart` is unchanged |
| Namespace variants (P2)           | 0.4.1 "slash" namespace; 0.3.0 namespace with `contains` instead of `hasPart`; legacy flat array of rule objects with no `RuleSet` wrapper                                                       |
| Multi-entry input (P2)            | A single `RuleSet` object not wrapped in an array; multiple top-level `RuleSet`s flattened together                                                                                              |
| Malformed input (P2)              | `null` / `undefined` / `[]` / an array of `null`/`undefined`/non-object entries — tolerated, never throws                                                                                        |
| id uniqueness (P2)                | Every flattened rule gets a unique id — see "Bugs found and fixed" below                                                                                                                         |

---

### `src/utils/validators.test.js` — P2

**29 tests · pure unit**

Covers all eight exported form-validation functions (`validateService`,
`validateOrganization`, `validateLegalResource`, `validateTemporalRule`,
`validateVendorService`, `validateParameter`, `validateForm`, `isValidDate`).
`validateForm` is tested for aggregation across every section (including
array fields like `temporalRules`/`parameters`) and for a fully-valid,
zero-error case.

---

### `src/utils/ttlHelpers.test.js` — P2

**32 tests · pure unit**

Covers all ten exported TTL string/URI helpers — escaping, sanitizing
(filenames, `ruleIdPath`, IRIs), and formatting (dates, literals, URIs).
`sanitizeIri` is checked for idempotence (re-running on already-sanitized
input is a no-op) and for leaving structural URI characters (`/`, `:`, `#`,
`?`) intact.

---

### `src/utils/ronlHelper.test.js` — P2

**5 tests · unit · plain `global.fetch` mock**

Covers `fetchRonlConcepts` and `fetchAllRonlConcepts` — the two functions
that POST a SPARQL query to the shared LDE backend's TriplyDB proxy. Uses a
plain `jest.fn()`-based `fetch` mock rather than `msw`: two small functions
and one endpoint don't justify the larger P4 mocking setup planned for
`shaclHelper.js`/`triplydbHelper.js`.

---

### `src/utils/dmnHelpers.test.js` — P2

**45 tests · unit · real DOM parsing (jsdom's `DOMParser`)**

Covers all twelve exported DMN helpers, including `extractPrimaryDecisionKey`
(root-decision detection, `p_*` constant skipping, multi-root tie-breaking
by document order — real DMN XML fixtures built inline), `extractRulesFromDMN`
(decision-table rule attribute/entry extraction), `validateDMNData`, the
concept-generation helpers (`generateConceptUri`/`Label`/`Definition`/
`Notation`, including notation collision handling and acronym-aware camelCase
splitting), and `evaluateTestCaseExpectation` (structured vs. human-readable
expected values, the empty-result-set special case, loose value comparison).

---

### `src/utils/iknowParser.test.js` — P2

**24 tests · unit · real DOM parsing**

Covers both iKnow XML export formats (`CognitatieAnnotationExport` and
`SemanticsExport`), format auto-detection (`parseIKnowXML`), the field-map
helper (`getAvailableFields`), the dot-path/array-index value extractor
(`extractValue`), and `applyMapping` — including filters, `prefix`/`uri`
transforms, the `legal.url → legal.bwbId` field rename, and grouping
`parameters.*` mappings into a single parameter object.

---

### `src/hooks/useArrayHandlers.test.js` — P3

**13 tests · hook · `renderHook` + a `useState` test harness**

`useArrayHandlers` only returns handlers, not the array itself, so a small
harness hook wraps it in a real `useState` to make `handleAdd`/`handleUpdate`/
etc.'s effect on state actually observable across re-renders — the way a
real component uses it. Covers `handleAdd` (including that new ids continue
from the highest existing id, not the array length), `handleUpdate`,
`handleUpdateField`, `handleRemove`, `handleClear`, `handleReplace`, the four
default-item factories, and the four pre-configured wrapper hooks
(`useTemporalRulesHandlers`, `useParametersHandlers`, `useCprmvRulesHandlers`).

---

### `src/hooks/useDsoImport.test.js` — P3

**8 tests · hook · `renderHook` + `global.fetch` mock + real `window.history`**

Covers the DSO → DMN deep-link import hook: no-op when `dsoImport` is absent
or not `"dmn"`; the import params are stripped from the URL immediately
(before the fetch even resolves, so a refresh mid-import can't re-trigger
it); missing `dmnId` reports an error without fetching; a full success path
prefilling `dmnData`/`service`/`organization` and switching to the DMN tab;
non-ok and empty-body backend responses each report their own error; and
organization is left alone when no `authority` is present. Real
`window.history.pushState` navigation drives the URL-based trigger rather
than mocking `window.location`.

---

### `src/hooks/useEditorState.test.js` — P3

**7 tests · hook · `renderHook` + mocked `ronlHelper`**

Covers the central state hook: every state slot's documented initial default,
the iKnow-mappings-loaded-on-mount effect, the RONL-concepts-loading effect
(loading → success populating both concept lists, and loading → error setting
a user-facing message — `fetchAllRonlConcepts` is mocked via
`jest.mock('../utils/ronlHelper')`), and `clearAllData` — including the
explicitly-tested exception called out in the source comment: TriplyDB config
is **not** cleared by `clearAllData`.

---

### `src/utils/shaclHelper.test.js` — P4

**3 tests · unit · plain `global.fetch` mock**

Covers `validateTtl` — the pre-publish SHACL check against the shared LDE
backend. Success (returns the backend's `data.data`), a backend response
that parses but reports `success: false` (neutral invalid shape, one error),
and a network failure (the distinct `unavailable: true` shape — validation
is advisory, so a backend outage must never block publishing).

---

### `src/utils/triplydbHelper.test.js` — P4

**37 tests · unit · plain `global.fetch` mock + real `File`/`FormData`/`Blob`/`atob` (jsdom)**

Covers all ten exported functions: `buildGraphIRI` (pure — default/org-scoped/
bare graph construction), `validateTriplyDBConfig` (every missing-field and
malformed-URL branch), `publishToTriplyDB` (multipart upload happy path,
empty-content rejection before any fetch, JSON and non-JSON error-body
parsing, the `TypeError: Failed to fetch` → friendly network-error
translation), `updateTriplyDBService` (config-gated, backend-proxy POST),
`publishToTriplyDB_SPARQL` (config- and content-length-gated; the
`@prefix` → `PREFIX` conversion and `INSERT DATA { GRAPH <...> { ... } }`
wrapping are asserted directly against the posted request body),
`uploadLogoAsset` (base64 → Blob → multipart upload), `testTriplyDBConnection`
(200 / 404 / 401 / 403 / other status / network failure, each mapped to its
own message), and the three `localStorage`-backed config functions
(`loadTriplyDBConfig`, `saveTriplyDBConfig`, `getDefaultTriplyDBConfig`,
including recovery from invalid stored JSON).

**Deviation from `TESTING-GUIDE.md`'s original P4 plan:** the guide's Tooling
section anticipated `msw` for this phase's "larger surface." In practice,
every function here is a single self-contained `fetch` call (not a
multi-request flow or a shared server-side contract), so the plain
`global.fetch` mock already established in P2's `ronlHelper.test.js` stayed
proportionate — `msw` would be worth revisiting if a future phase needs to
model a multi-endpoint flow or shared request/response fixtures across many
tests.

---

## Bugs found and fixed

Both were found by writing the tests above, not known beforehand — the
whole point of P1/P2 per `TESTING-GUIDE.md`'s Analysis section (hand-rolled
parser/generator, no RDF library, "fragile for edge cases").

### `cprmv:isBasedOn` / `cprmv:extends` parser gap (P1)

A past commit renamed the generator's `cprmv:extends` predicate to
`cprmv:isBasedOn` (confirmed in `changelog.json`'s own history: _"cprmv:extends
renamed to cprmv:isBasedOn in the temporal/decision sections"_), but
`parseTTL.enhanced.js`'s read side was never updated to match. Since that
rename, **every export-then-reimport of a temporal rule silently dropped its
`extends`/`isBasedOn` relationship** — the round-trip test caught this
immediately as a field that came back empty. Fixed to recognize both
(`isBasedOn` first, `extends` for historical exports predating the rename).

### `flattenCprmvRules` id collision across calls (P2)

`id: base + seq++` reset both `base` (`Date.now()`) and the sequence counter
on every call to `flattenCprmvRules`. Two calls landing in the same
millisecond — plausible in a fast import flow — minted identical ids,
colliding as React keys if both calls' results ended up merged into the same
`cprmvRules` list. Fixed with a module-level counter that never resets, so
ids stay unique for the life of the page regardless of call timing.

---

## Documented behavior (not a bug — a coupling worth knowing about)

**NL-SBB concepts only regenerate when a DMN model is attached in session
state.** `generateConceptsSection()` (`ttlGenerator.js`) is gated behind
`hasDMN()` — i.e. `dmnData.isImported && dmnData.importedDmnBlocks`, or
`dmnData.fileName && dmnData.content` — not on `this.concepts.length > 0`.
This is confirmed to work correctly end-to-end when `dmnData` is derived the
way the real app's `importHandler.js` does it (concepts survive round-trip
whenever the fixture's `hasDmnData` is true), but a caller that skips that
mapping and calls `generateTTL` with empty `dmnData` will see concepts
silently vanish — even though `this.concepts` still has entries.
`parseTTL.roundtrip.test.js`'s dedicated `describe` block spells out both
cases explicitly, so this is a locked-in, visible assertion rather than a
silent gap. Whether concepts _should_ be exportable independent of an
attached DMN is a product question, not something fixed unilaterally here —
see `TESTING-GUIDE.md`.

---

## Coverage

No coverage report has been generated for this suite yet — unlike
`ronl-business-api`'s backend (94% stmts via a dedicated coverage campaign),
line/branch percentages aren't tracked here. To generate one:

```bash
npx react-scripts test --coverage --watchAll=false
```

This is a reasonable thing to add once the P5–P6 phases in
`TESTING-GUIDE.md` are further along — premature right now, since large
parts of the app (most components, hooks, `App.js`'s orchestration) have no
tests yet at all, and a coverage number this early would mostly measure how
little of the app is covered rather than how well the covered parts are
tested.

---

## Adding tests

Test files are colocated with the source they cover (`foo.js` →
`foo.test.js`), matching the convention already established by
`ttlGenerator.dateAxis.test.js` / `ttlGenerator.versionTarget.test.js`. Files
with multiple independent concerns worth testing separately keep splitting by
concern rather than growing one giant file.

Add a `test:<phase>` / `test:<phase>:watch` script pair to `package.json` for
each new phase, mirroring `test:generator`/`test:roundtrip`/`test:p2` — a
`--testPathPattern` regex naming the files (or a single shared substring, if
one exists) covered by that phase.
