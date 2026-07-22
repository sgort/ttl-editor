# Testing Guide — CPSV Editor

Companion to `developer/due-diligence.md`'s "What to assess" section, which
first flagged "No automated tests for TTL output" and "Create React App
(deprecated)" as two separate, related gaps. This guide covers both: how to
build up real test coverage, and how that coverage sequences with the
CRA → Vite migration the due-diligence doc recommends.

## Analysis

### Current state

- **Test runner**: `react-scripts test` (CRA's wrapped Jest). `test:ci`
  (`--watchAll=false`) is the CI-safe variant; `test:generator` scopes to
  `ttlGenerator` specifically.
- **Existing coverage**: not zero, but thin and undocumented as a
  deliberate effort — `src/utils/ttlGenerator.dateAxis.test.js`,
  `src/utils/ttlGenerator.versionTarget.test.js`, and
  `src/utils/cprmvImport.test.js` (13 tests, all passing, all regression
  tests written to pin down a specific bug once found — not a planned
  layer-by-layer sweep).
- **`src/App.test.js` is CRA's original stub and is currently failing**:
  it asserts `screen.getByText(/learn react/i)`, which obviously isn't in
  this app. `npm run test:ci` is red today because of this alone, not
  because of any real regression. This is worth fixing first, independent
  of everything else below — a red CI script trains everyone to ignore it.
- **No RDF library.** TTL parsing (`parseTTL.enhanced.js`, 774 lines) and
  generation (`ttlGenerator.js`, 1461 lines) are entirely hand-written. No
  DOM, no network — pure input → string transforms — which makes them both
  the cheapest tests to write and the highest-value ones, since this
  hand-rolled logic is exactly what the due-diligence doc flags as
  "fragile for edge cases."
- **Real-world fixtures already exist**: `examples/*.ttl` (6 files,
  including `full-test-import-export.ttl` and `ronl.ttl`) are actual
  reference exports the due-diligence doc describes as covering "12+
  organizations." These are ready-made round-trip fixtures — import, or
  compare a fresh generate against them — no synthetic test data needed
  for the highest-value layer.
- **No backend of its own.** Unlike `ronl-business-api` (its own Express
  backend, its own `docker-compose.yml`), this app depends entirely on the
  **Linked Data Explorer's** shared Express backend for three things: the
  RONL vocabulary SPARQL proxy, TriplyDB publish/re-index, and DMN
  syntactic validation (`POST /v1/dmns/validate`). There's no local
  backend to spin up for tests here — anything touching those three needs
  network-boundary mocking, not a real integration target. (A real E2E
  phase, if pursued later, would need the LDE backend running, the same
  way `ronl-business-api`'s E2E plan needs LDE's backend for
  Procesbibliotheek.)
- **Sizing** (line counts, current):

  | File                                     | Lines     | Testability                                                                                                                        |
  | ---------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
  | `App.js`                                 | 1180      | Orchestration + ~300-line publish workflow; needs decomposition to test well (see due-diligence's `usePublishWorkflow` suggestion) |
  | `components/tabs/DMNTab.jsx`             | 1808      | Largest file. Validate/deploy/test/generate-concepts lifecycle, all calling Operaton directly from the browser                     |
  | `utils/ttlGenerator.js`                  | 1461      | Pure logic, no RDF library, highest regression risk                                                                                |
  | `parseTTL.enhanced.js`                   | 774       | Pure logic, round-trip counterpart to the generator                                                                                |
  | `components/PublishDialog.jsx`           | 566       | Multi-step workflow (validate → generate → upload → confirm), triggers real TriplyDB/backend calls                                 |
  | `utils/triplydbHelper.js`                | 587       | Network-boundary utility                                                                                                           |
  | `utils/dmnHelpers.js`                    | 516       | Pure DMN-XML parsing/inference logic                                                                                               |
  | `utils/iknowParser.js`                   | 457       | Pure logic, one-directional XML import mapping                                                                                     |
  | `hooks/useEditorState.js`                | 260       | Central state hook                                                                                                                 |
  | `utils/validators.js`                    | 241       | Pure logic                                                                                                                         |
  | `utils/importHandler.js`                 | 305       | Orchestrates parseTTL + state population                                                                                           |
  | `hooks/useArrayHandlers.js`              | 168       | Pure CRUD-on-arrays logic                                                                                                          |
  | `hooks/useDsoImport.js`                  | 150       | Fetches from LDE backend on mount, populates 3 tabs                                                                                |
  | `utils/ttlHelpers.js` / `constants.js`   | 152 / 153 | Small pure utilities                                                                                                               |
  | `utils/cprmvImport.js`                   | 148       | Pure logic, already has a test file                                                                                                |
  | `utils/ronlHelper.js` / `shaclHelper.js` | 86 / 53   | Small, one network-touching (`shaclHelper`)                                                                                        |

- **CRA is deprecated, not broken.** Maintenance mode only (final release
  shipped with React 19 support) — no forcing function, no urgency, but no
  future security patches either. This matters for sequencing below: there's
  no reason to rush the bundler swap, but no reason to indefinitely defer it.

## Plan

### Sequencing: tests first, migrate second — but write them once

The instinct that started this (write tests before migrating, so the
migration has a safety net) holds, and the natural objection — "won't
Jest-authored tests need porting to Vitest after the migration?" — turns
out to be cheap here specifically:

- Jest and Vitest share almost the same API surface (`describe`/`test`/
  `expect` are compatible; `jest.fn()` → `vi.fn()` and `jest.mock()` →
  `vi.mock()` are close to mechanical renames). `ronl-business-api`'s own
  `docs/TESTING-FRONTEND.md` and this repo's future Vitest setup would
  look nearly identical.
- The highest-value tests (TTL generator/parser, DMN helpers, validators)
  are pure functions with **zero dependency on the bundler or test
  runner** — they don't touch JSX, DOM, or CRA-specific tooling at all.
  Writing them now under `react-scripts test` and re-running the exact
  same files under Vitest after the migration is a legitimate regression
  check on the migration itself, not throwaway work.
- The bundler swap itself is a proven, low-risk path in this ecosystem
  already: **Linked Data Explorer already made this exact move** (Vite,
  `@vitejs/plugin-react`, mode-based `build:acc`/`build:prod` scripts).
  LDE's `vite.config.ts` is a direct template for env-var handling
  (`REACT_APP_*` → `VITE_*`), dev server config, and path aliases.
  Note LDE's own frontend has **no Vitest setup of its own** — this repo
  would be establishing the second Vitest-based frontend in the RONL
  ecosystem, following `ronl-business-api`'s already-documented pattern
  (`docs/TESTING-FRONTEND.md`) rather than LDE's (which doesn't have one).

So: fix the dead stub, write the pure-logic test layers under the current
CRA/Jest setup, migrate the bundler once that layer is green, re-run the
same suite under Vitest to confirm the migration didn't regress anything,
then continue building out hooks/components/E2E in Vitest from that point
on.

### Tooling

- **Now (pre-migration)**: `react-scripts test` (Jest), `@testing-library/react`
  - `@testing-library/jest-dom` (already devDependencies) for anything that
    needs to render.
- **Post-migration**: Vitest + the same Testing Library packages, `jsdom`
  environment per-file (mirroring `ronl-business-api`'s node-default +
  `// @vitest-environment jsdom` docblock strategy — most of this app's
  high-value tests are pure logic and don't need jsdom at all).
- **Network-boundary mocking**: no local backend to run, so anything
  touching `shaclHelper.js`, `triplydbHelper.js`, or `useDsoImport.js`'s
  fetch to the LDE backend needs mocking at the fetch/axios boundary
  (`msw`, matching `ronl-business-api`'s choice) rather than a real
  integration target.
- **Fixtures**: `examples/*.ttl` for round-trip generator/parser tests;
  synthetic minimal fixtures for edge cases the real examples don't cover
  (empty optional fields, multiple rulesets, etc. — see the existing
  `dateAxis`/`versionTarget` tests for the established style).
- **Conventions**: colocate `*.test.js` next to source, matching what's
  already there. For files with multiple independent concerns worth
  testing separately (like `ttlGenerator.js` already does with
  `.dateAxis.test.js` / `.versionTarget.test.js`), keep splitting by
  concern rather than one giant file — easier to review, easier to see
  what's covered at a glance.

### E2E — later, and shaped differently than `ronl-business-api`'s

Deferred to its own phase, after the unit/component layers are solid — but
worth noting now why it won't look like a copy of `ronl-business-api`'s
Playwright plan:

- No Keycloak, no roles, no tenants — this is a single-user authoring tool
  today. The due-diligence doc's "Authentication & Authorization for
  Production Publishing" section describes OIDC auth as a **prerequisite
  for production publishing**, not yet built. An E2E login-flow test has
  nothing to drive until that lands.
- The realistic E2E surface today is closer to: load the app, fill out a
  minimal service description across a few tabs, export TTL, verify the
  preview panel's content — or import one of the `examples/*.ttl` files,
  edit a field, re-export, and diff. Publishing to TriplyDB and deploying
  to Operaton are real network side effects against shared infrastructure
  (same caution `ronl-business-api`'s Operaton container needed — prefer a
  disposable/local target over the real `operaton.open-regels.nl` if an
  E2E test ever needs to deploy a DMN for real).

## Phased approach

| Phase  | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why this order                                                                                                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | Fix or delete `src/App.test.js`'s dead CRA stub.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | One-line-effort, unblocks a currently-red `test:ci` — do this before anything else so the suite is green before new coverage is added on top.                                                                                                                                                                                               |
| **P1** | `utils/ttlGenerator.js` + `parseTTL.enhanced.js` round-trip tests against `examples/*.ttl`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Highest value, lowest cost — pure logic, no RDF library backing it (the due-diligence doc's top concern), real fixtures already exist. Partially started (`dateAxis`, `versionTarget`); extend to full round-trip (import an example, regenerate, compare) and remaining generator sections.                                                |
| **P2** | Remaining pure-logic utils: `dmnHelpers.js`, `iknowParser.js`, `validators.js`, `ttlHelpers.js`, `ronlHelper.js`, `constants.js`, rest of `cprmvImport.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Same pattern as P1, mechanical extension — no new tooling needed.                                                                                                                                                                                                                                                                           |
| **P3** | Hooks: `useEditorState.js`, `useArrayHandlers.js`, `useDsoImport.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Needs `renderHook` + jsdom; `useDsoImport` also needs fetch mocking for its LDE backend call. Covers the state-management core the whole app is built on.                                                                                                                                                                                   |
| **P4** | Network-touching utils: `shaclHelper.js`, `triplydbHelper.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Same `msw`-at-the-boundary pattern as P3's `useDsoImport`, just without a hook wrapper.                                                                                                                                                                                                                                                     |
| —      | **Vite migration checkpoint — done here, before P5, not after.** Once P1–P4 are green, migrate the bundler (CRA → Vite, following LDE's proven config) and re-run the full P1–P4 suite under Vitest before continuing. A clean pass here is the actual proof the migration didn't regress anything. P1–P4 are the phases cheap to port (pure logic/hooks, near-identical Jest↔Vitest API), so they're written once under CRA/Jest and ported for near-free. P5–P7 below are deliberately sequenced _after_ this checkpoint, so the DOM-rendering, bundler-sensitive work (Tailwind/CSS processing, JSX transform, `process.env` vs `import.meta.env`) gets written once, directly under Vite/Vitest, instead of under CRA and then re-verified post-migration. |                                                                                                                                                                                                                                                                                                                                             |
| **P5** | Components: tab components (`ServiceTab`, `OrganizationTab`, etc.), `PreviewPanel`, `PublishDialog`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Written directly under Vite/Vitest (post-checkpoint). Scope to critical interactions only (field entry → state update → preview reflects it; publish workflow's step transitions) — not exhaustive branch coverage, same "critical interactions only" discipline `ronl-business-api`'s P5/P8 used for its larger dashboard containers.      |
| **P6** | `components/tabs/DMNTab.jsx` (1808 lines, the largest and most complex file).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Also post-checkpoint. Last among unit-level work — highest effort, most external dependencies (Operaton REST calls directly from the browser for deploy/test). Mock Operaton at the fetch boundary; validate the four-stage lifecycle (validate → deploy → test → generate concepts) at the interaction level, not every DMN edge case.     |
| **P7** | Playwright E2E — smoke test(s) only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Also post-checkpoint (Playwright is bundler-agnostic, but by this point the app is already served via Vite in dev/preview). Start narrow: app loads, minimal service description exported successfully. Expand once there's more automated-testable surface and/or once OIDC auth lands and publishing has a real identity to test against. |

### Not in scope (deliberately deferred)

- **RDF library swap (N3.js or similar).** The due-diligence doc raises
  this as a question to evaluate, not a decision already made. P1's
  round-trip tests will surface whether the hand-rolled parser is
  _actually_ fragile enough to justify the migration cost — decide with
  data, not in advance of it.
- **OIDC / production publishing auth.** A separate, security-sensitive
  workstream (backend-mediated publishing, replacing the hardcoded
  Operaton `demo:demo` Basic Auth, audit trail). Doesn't block any of the
  phases above; do not fold it into this plan.
- **Visual regression, cross-browser matrix, CI wiring.** Same reasoning
  as `ronl-business-api`'s Phase 1 E2E plan — revisit once the phases
  above are proven stable locally.
