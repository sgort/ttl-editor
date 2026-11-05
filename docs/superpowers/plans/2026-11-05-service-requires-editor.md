# Service `dct:requires`: Editor (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public service in the TTL editor can list the services it requires, and that list is published as `dct:requires` and survives an import/export round trip.

**Architecture:**

- `service.requires` is a `string[]` of service URIs.
- **Generator:** emits it inside the `cpsv:PublicService` block, plus a `<uri> a cpsv:PublicService .` type stub per entry for file-local SHACL.
- **Parser:** reads it back and ignores the stubs.
- **Service tab:** edits the list. Options come from a new helper that queries the configured Triply dataset through LDE's existing `POST /v1/triplydb/query` proxy; a URI can also be pasted.

**Tech Stack:** React 19 + Vite, Vitest + Testing Library (jsdom), plain JS.

**Spec:** `docs/superpowers/specs/2026-11-05-service-requires-design.md` (issue #223). PR 2 (LDE) gets its own plan after this PR merges.

## Global Constraints

- **Vocabulary:**
  - Property: `dct:requires` (`http://purl.org/dc/terms/requires`), never `cv:requires`.
  - Stub type: `cpsv:PublicService`.
  - Subject: the dependent service. Object: the service it relies on.
- **Defaults:** `requires` defaults to `[]`. A service with an empty or missing `requires` must generate **byte-identical** TTL to today.
- **Dropdown:**
  - Public datasets only; no API token is sent.
  - SPARQL URL: `${baseUrl}/datasets/${account}/${dataset}/sparql`, the same form `triplydbHelper.js` already builds. Checked live against `stevengort/PublishTest`: it answers SELECT queries.
  - Proxy: `POST ${BACKEND_URL}/v1/triplydb/query` with body `{ endpoint, query }`. Response shape: `{ success, results: { bindings } }`, as in `ronlHelper.js`.
- **Own URI:** `https://regels.overheid.nl/services/${sanitizeServiceIdentifier(service.identifier)}`, the same as `ttlGenerator.js` ~l.77–79.
- **UI labels are English**, like the rest of `ServiceTab.jsx`. Every new control gets an `id` with a matching `htmlFor` label (`src/components/accessible-names.test.jsx` enforces this).
- **No changelog edit.** `src/data/changelog.json` is written only by `/bump-release`.
- **Git and process (from CLAUDE.md):**
  - Ask the user before every `git commit`. Stage the work, report what is staged, and wait. Each "Commit" step below means exactly that.
  - Never `--no-verify`.
  - Never start, stop or restart dev servers.
  - Verify UI by asking the user, not with a headless browser.

## Review Focus

1. **A required URI containing `sector`, `thematicArea`, `title`, `description` or `language`** (for example `…/services/sector-subsidie`) must not overwrite those service fields on import. The parser matches those names with loose `line.includes(...)`. Pinned in Task 2.
2. **A type stub that appears before the real service block** (a hand-edited or reordered file) must not supply the service identifier. The parser takes the identifier from the first service subject it sees. Pinned in Task 2.
3. **State without a `requires` key** (an older import, or state saved before this change) must generate the same TTL as `requires: []`, not throw. Pinned in Task 1.
4. **A `requires` entry equal to the service's own URI** must not be emitted, for example after the identifier is renamed to match an entry. Pinned in Task 1.
5. **A pasted URI with surrounding whitespace**, or one that differs from an existing entry only by whitespace, is trimmed and treated as a duplicate. Pinned in Task 4.

---

### Task 1: Data model and generator

**Files:**

- Modify: `src/utils/constants.js:4-14`: add `requires: []` to `DEFAULT_SERVICE`.
- Modify: `src/utils/ttlGenerator.js`, `generateServiceSection()` (~l.241–334).
- Create test: `src/utils/ttlGenerator.requires.test.js`.

**Interfaces:**

- Produces: `state.service.requires: string[]`, read by every later task.
- Produces: the generated TTL format that Task 2 parses:
  - one property line per entry, `    dct:requires <URI> ;`, placed right before the `cprmv:hasDecisionModel` line (or before the block close when there is no DMN);
  - after the service block, one stub line per entry, `<URI> a cpsv:PublicService .`, followed by a blank line, emitted before the existing language / sector / thematicArea stubs.

- [ ] **Step 1: Write the failing tests** in `src/utils/ttlGenerator.requires.test.js`.

  Build state from the `emptyState()` / `fullState()` shape in `ttlGenerator.sections.test.js` (copy the factory; keep the file self-contained). Use `new TTLGenerator(state).generate()`, or the narrower `generateServiceSection()` where that's enough.

  ```js
  const RECHT = 'https://regels.overheid.nl/services/recht-op-subsidie-thuisbatterij-flevoland';
  const OTHER = 'https://example.org/services/other';
  const OWN = 'https://regels.overheid.nl/services/zorgtoeslag'; // fullState identifier
  ```

  - `emits one dct:requires line per entry inside the service block`: with `requires: [RECHT, OTHER]`, the service section contains `    dct:requires <${RECHT}> ;\n` and `    dct:requires <${OTHER}> ;\n`, both before the ` .\n` that closes the `cpsv:PublicService` block.
  - `types each required service with a cpsv:PublicService stub`: the output contains `<${RECHT}> a cpsv:PublicService .\n` and `<${OTHER}> a cpsv:PublicService .\n`.
  - `empty requires generates exactly what it did before`: the output with `requires: []` equals the output with the `requires` key deleted from `service`. This also pins Review Focus #3.
  - `missing requires key does not throw` (Review Focus #3): `delete state.service.requires` and `generate()` does not throw.
  - `never emits the service as requiring itself` (Review Focus #4): with `requires: [OWN, RECHT]`, neither `dct:requires <${OWN}>` nor `<${OWN}> a cpsv:PublicService .` appears, and RECHT's lines do.
  - `the closing line stays valid when requires is the last property`: with no DMN, no cost and no output but `requires: [RECHT]`, the block ends `dct:requires <${RECHT}> .\n\n`. The existing `slice(0, -2)` close must still work.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `npx vitest run src/utils/ttlGenerator.requires.test.js`
  Expected: FAIL. No `dct:requires` appears in the output.

- [ ] **Step 3: Implement**
  - In `generateServiceSection()`, compute
    `const requires = (this.service.requires || []).map((u) => u.trim()).filter((u) => u && u !== this.serviceUri);`
  - Emit one property line per entry right before the `// DMN reference` block.
  - After the close (`ttl = ttl.slice(0, -2) + ' .\n\n'`) and before the language stub, emit `<${uri}> a cpsv:PublicService .\n\n` per entry.
  - Add `requires: []` to `DEFAULT_SERVICE`.

- [ ] **Step 4: Run the tests to verify they pass, plus the existing generator suites**

  Run: `npm run test:generator`
  Expected: PASS, with no change in the existing `ttlGenerator.*.test.js` results.

- [ ] **Step 5: Commit** (ask the user first): `feat(generator): emit dct:requires and its cpsv:PublicService stubs (#223)`

---

### Task 2: Parser and import mapping

**Files:**

- Modify: `src/parseTTL.enhanced.js`:
  - the initial `parsed.service` object (~l.33–41): add `requires: []`;
  - the type-detection block (~l.186–208);
  - the `currentSection === 'service'` branch (~l.466–498).
- Modify: `src/utils/importHandler.js:15-23`: add `requires: parsed.service?.requires || []`.
- Create test: `src/parseTTL.requires.test.js`.
- Modify test: `src/utils/importHandler.test.js`, extending the existing "passes every field through" and "substitutes a default" tests.

**Interfaces:**

- Consumes: Task 1's TTL format and `generateTTL` (`src/utils/ttlGenerator.js`).
- Produces: `parseTTLEnhanced(ttl).service.requires: string[]` and `parseTTL(ttl).service.requires: string[]` (importHandler, default `[]`).

- [ ] **Step 1: Write the failing tests** in `src/parseTTL.requires.test.js`.

  Use a small inline TTL fixture: prefixes, one service `<https://regels.overheid.nl/services/hoogte-subsidie-thuisbatterij-flevoland>` with `dct:identifier`, `dct:title`, `cv:sector <https://example.org/sector/REGIONAL>`, `cv:thematicArea <https://example.org/theme/energy>`, then `dct:requires` line(s), then the stub(s), then a `cv:PublicOrganisation` block.

  - `reads one dct:requires per line into service.requires`: two separate lines give `[RECHT, OTHER]`.
  - `reads a comma list on one line`: `dct:requires <RECHT>, <OTHER> ;` gives `[RECHT, OTHER]`.
  - `a requires URI containing field names does not leak into those fields` (Review Focus #1): with `dct:requires <https://example.org/services/sector-thematicArea-title-description-language>`, `service.sector`, `thematicArea`, `name`, `description` and `language` equal the fixture's own values, and `requires` holds the URI.
  - `stubs after the service do not disturb it`: `service.identifier`, `name` and `requires` are unchanged by the trailing stubs, and the organisation block after them still parses (`organization.name` is set).
  - `a stub before the service block does not become the service` (Review Focus #2): put `<RECHT> a cpsv:PublicService .` **before** the real service block. Then `service.identifier === 'hoogte-subsidie-thuisbatterij-flevoland'` and `service.name` is the real title.
  - `round trip keeps requires`: `parseTTLEnhanced(generateTTL({...parse1}))` has the same `service` as `parse1`. Follow the `parseTTL.roundtrip.test.js` pattern, including its `deriveDmnData` mapping if the fixture has no DMN.

  In `src/utils/importHandler.test.js`: the full-parse test expects `service.requires` to pass through, and the default test expects `service.requires` to equal `[]`.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `npx vitest run src/parseTTL.requires.test.js src/utils/importHandler.test.js`
  Expected: FAIL, because `requires` is undefined or empty.

- [ ] **Step 3: Implement**
  - **Stubs:** when a detected `service` type line is a bare stub (the trimmed line matches `^<[^>]+>\s+a\s+(cpsv|cpsv-ap):PublicService\s*\.$`), do not change `currentSubject`/`currentSection`, and `continue`. The real service block always has `;` after the type, so it never matches.
  - **`dct:requires`:** in the service branch, test for it **first**. Collect `[...line.matchAll(/<([^>]+)>/g)]` into `parsed.service.requires`, skipping duplicates, then `continue` so the loose `includes` checks below never see the line.
  - **Continuation lines:** a comma list may wrap onto a continuation line that contains only `<…>`. If the previous service line was a `dct:requires` line ending in `,`, treat the next line the same way. _(Builder: implement this only if `generateTTL` or real files produce wrapped lists; Task 1 emits one per line.)_
  - **importHandler:** add the mapping line.

- [ ] **Step 4: Run the tests to verify they pass, plus the round-trip and parser suites**

  Run: `npx vitest run src/parseTTL.requires.test.js src/utils/importHandler.test.js && npm run test:roundtrip`
  Expected: PASS. The existing fixtures still round-trip, and their `service.requires` is `[]` on both sides.

- [ ] **Step 5: Commit** (ask the user first): `feat(parser): read dct:requires back and skip PublicService type stubs (#223)`

---

### Task 3: Published-services helper

**Files:**

- Create: `src/utils/serviceCatalogHelper.js`.
- Create test: `src/utils/serviceCatalogHelper.test.js`.

**Interfaces:**

- Produces:
  - `buildDatasetSparqlUrl(config: {baseUrl, account, dataset}) -> string | null`. Returns `null` when any of the three is empty.
  - `fetchPublishedServices(config) -> Promise<Array<{ uri: string, title: string }>>`. Throws `Error` on an HTTP error or a malformed response. Resolves `[]` when `buildDatasetSparqlUrl` returns `null`, without calling `fetch`.
- `BACKEND_URL`: the same expression as `src/utils/ronlHelper.js` (`import.meta.env.VITE_BACKEND_URL || 'https://acc.backend.linkeddata.open-regels.nl'`).

- [ ] **Step 1: Write the failing tests** (mock `global.fetch` with `vi.fn()`).
  - `builds the dataset SPARQL URL`: `buildDatasetSparqlUrl({ baseUrl: 'https://api.open-regels.triply.cc', account: 'stevengort', dataset: 'PublishTest' })` gives `'https://api.open-regels.triply.cc/datasets/stevengort/PublishTest/sparql'`.
  - `returns null for an incomplete config`: any one of the three empty gives `null`.
  - `posts the query through the backend proxy`: `fetch` is called once with `${BACKEND_URL}/v1/triplydb/query`, method `POST`, and a JSON body whose `endpoint` is the dataset URL and whose `query` contains `cpsv:PublicService` and `dct:title`. The request has no `Authorization` header and no token in the body.
  - `maps bindings to {uri, title}`: the bindings `[{service:{value:A}, title:{value:'B'}}]` give `[{ uri: A, title: 'B' }]`.
  - `throws on a non-ok response` and `throws when success is false`.
  - `resolves [] without fetching when the config is incomplete`.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/utils/serviceCatalogHelper.test.js`
  Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: Implement**

  Use the spec's query verbatim:

  ```sparql
  PREFIX cpsv: <http://purl.org/vocab/cpsv#>
  PREFIX dct:  <http://purl.org/dc/terms/>
  SELECT DISTINCT ?service ?title WHERE {
    ?service a cpsv:PublicService ; dct:title ?title .
  } ORDER BY LCASE(STR(?title))
  ```

  Use the fetch and error shape of `fetchRonlConcepts`. Multilingual titles may produce several rows per service: keep the first row per `uri`.

- [ ] **Step 4: Run to verify they pass**

  Run: `npx vitest run src/utils/serviceCatalogHelper.test.js`
  Expected: PASS.

- [ ] **Step 5: Commit** (ask the user first): `feat(services): list published public services from the Triply dataset (#223)`

---

### Task 4: Service tab "Required services" field

**Files:**

- Modify: `src/components/tabs/ServiceTab.jsx`. Add the field after Language, before `<CostSection>`, and an optional prop `triplyDBConfig`.
- Modify: `src/App.jsx:1025-1032`: pass `triplyDBConfig={triplyDBConfig}` (already destructured at ~l.102).
- Modify test: `src/components/tabs/ServiceTab.test.jsx`.
- Check: `src/components/accessible-names.test.jsx` (the `ServiceTab` case must keep passing; it renders without `triplyDBConfig`).

**Interfaces:**

- Consumes:
  - `fetchPublishedServices(config)` from Task 3, imported from `../../utils/serviceCatalogHelper`;
  - `sanitizeServiceIdentifier` from `src/utils/dmnHelpers.js`;
  - `service.requires` from Task 1.
- Produces: `setService({ ...service, requires: string[] })`. This is the same whole-object contract as `updateField`.

**Behaviour** (spec, "Service tab"):

- **Heading:** "Required services (dct:requires)", with a one-line hint: "Services this service makes use of. Context only; order lives in the BPMN."
- **List:** the selected entries (title when it is known from the fetched list, otherwise the URI), each with a remove button labelled `Remove <title or URI>`.
- **Select** (`id="service-tab-required-service-select"`, labelled): the fetched services, excluding the own URI and already-selected ones, plus an "Add" button.
- **Paste input** (`id="service-tab-required-service-uri"`, labelled, placeholder `https://…/services/…`) and an "Add URI" button. On add:
  - trim the value;
  - reject it if it isn't `http(s)://`, if it equals the own URI, or if it is already in the list (after trimming);
  - show the reason inline.
- **Loading:** fetch on mount, and again from a "Refresh list" button. Only fetch when `buildDatasetSparqlUrl(triplyDBConfig)` is non-null.
- **When the list can't be shown:** with no config, or after an error, show a short note, for example "Could not load published services. You can still paste a URI." The paste input stays enabled. Editing is never blocked.

- [ ] **Step 1: Write the failing tests** in `ServiceTab.test.jsx`.

  Mock the helper with `vi.mock('../../utils/serviceCatalogHelper', …)`, keeping `buildDatasetSparqlUrl` real. Pass a `triplyDBConfig` with `baseUrl`, `account` and `dataset` set.
  - `lists published services and adds one`: the mock resolves `[{uri: RECHT, title: 'Recht op subsidie'}, {uri: OWN, title: 'Self'}]`. The select offers 'Recht op subsidie' and not 'Self'. Choosing it and clicking Add calls `setService` with `requires: [RECHT]`.
  - `adds a pasted URI`: typing `RECHT` and clicking Add URI gives `requires: [RECHT]`.
  - `trims and de-duplicates a pasted URI` (Review Focus #5): with `service.requires = [RECHT]`, typing `'  ' + RECHT + ' '` does **not** call `setService` and shows a duplicate message.
  - `rejects its own URI and a non-http value`: neither call reaches `setService`.
  - `removes an entry`: the `Remove …` button gives `requires: []`.
  - `paste still works when the list fails to load`: the mock rejects, the note appears, and pasting still calls `setService`.
  - `does not fetch without a config`: rendering without `triplyDBConfig` never calls `fetchPublishedServices`.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/components/tabs/ServiceTab.test.jsx`
  Expected: FAIL, because the field is missing.

- [ ] **Step 3: Implement** the field as specified above, and the `App.jsx` prop.

- [ ] **Step 4: Run to verify they pass, plus the accessibility and component suites**

  Run: `npx vitest run src/components/tabs/ServiceTab.test.jsx src/components/accessible-names.test.jsx && npm run test:p5`
  Expected: PASS.

- [ ] **Step 5: Lint and format**

  Run: `npm run lint && npm run check-format`
  Expected: no errors.

- [ ] **Step 6: Commit** (ask the user first): `feat(service-tab): edit required services with a published-services picker (#223)`

---

### Task 5: SHACL check, user acceptance, example

**Files:**

- Modify (by the user, through the editor): `examples/organizations/flevoland/thuisbatterij-split-dmns/hoogte-subsidie-thuisbatterij-Flevoland.ttl`.

- [ ] **Step 1: Validate generated output against the shapes.**
  - Produce a TTL with `requires: [RECHT]` by running `generateTTL` in a throwaway Vitest file or a node script in the scratchpad.
  - POST it to the user's already-running LDE backend: `curl -s -X POST http://localhost:3001/v1/shacl/validate -H 'Content-Type: application/json' -d '{"content": …}'`.
  - Expected: `data.valid === true` for both layers, with no violation on `dct:requires`.
  - If the backend isn't running, **ask the user**; never start it.

- [ ] **Step 2: Hand off to the user for the full suite and UI check.**
  - Give them `npm run test:ci` and ask for the result (expected: all green, coverage thresholds met).
  - Ask them to open the Service tab on their running editor and confirm:
    - the picker lists the `PublishTest` services;
    - adding one shows the `dct:requires` line and stub in the preview;
    - re-importing the exported TTL keeps the entry.

- [ ] **Step 3: Republish and re-export the example (the user does this).**
  - Load `hoogte-subsidie-thuisbatterij-Flevoland.ttl` in the editor on the local stack and add `…/recht-op-subsidie-thuisbatterij-flevoland` as a required service.
  - **Republish** hoogte to `PublishTest`. This is what puts the `dct:requires` triple in Triply, and LDE (PR 2) reads it from there. Saving the file alone is not enough.
  - Then save over the example file.
  - Republishing to ACC and the target Triply dataset happens after this PR merges. It is not part of this task.
  - Then check that the file contains exactly one `dct:requires` line and its stub, and that the other sections are unchanged (`git diff`).
  - Optionally confirm the triple is live with a read-only query on the `PublishTest` SPARQL endpoint (`SELECT ?s ?o WHERE { ?s <http://purl.org/dc/terms/requires> ?o }`).

- [ ] **Step 4: Commit** (ask the user first): `docs(examples): hoogte requires recht in the thuisbatterij split example (#223)`

- [ ] **Step 5: Push and open PR 1** against `acc` once the user confirms. Leave out attribution lines. Reference #223, but don't close it (PR 2 remains).
