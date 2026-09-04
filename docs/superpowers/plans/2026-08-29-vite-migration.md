# Migrate the CPSV Editor from Create React App to Vite

Ready to execute. Written 29 August 2026; nothing in it has been applied yet.

Reviewed 4 September 2026 against `acc` at `10c92d3`, 34 commits further on.
The CI preconditions this plan set have since been met, and the dependency
landscape around it has changed. Changes from that review are marked
**[4 Sep]**; nothing in the phases themselves was altered.

## Why

The React team deprecated Create React App on 14 February 2025. It still works in
maintenance mode — a final version shipped with React 19 support — but it will
receive no new features, no performance work, and **no active security updates**.
For a repository that spent 29 August enforcing "nothing a pipeline downloads may
float", continuing to build on an unmaintained toolchain is the largest remaining
inconsistency.

`linked-data-explorer` already builds with Vite, so migrating aligns tooling
across the RONL ecosystem rather than introducing a third way of doing things.

Raised in
`iou-architectuur/docs/en/cpsv-editor/developer/due-diligence.md`, "Advice for
the DevOps Team".

## The acceptance criterion is the existing test suite

Measured on `acc` at `25abf71`, 29 August 2026:

```
Test Suites: 16 passed, 16 total
Tests:       257 passed, 257 total
Time:        40.503 s
```

**The migration is correct when those same 257 tests pass under Vitest, and the
built site behaves identically.** Not "does it build" — a Vite build that emits
the wrong directory succeeds happily and publishes nothing.

**[4 Sep] The baseline was re-measured and still holds**, on `acc` at `10c92d3`:

```
Test Suites: 16 passed, 16 total
Tests:       257 passed, 257 total
Time:        26.498 s
```

This is not a formality. Between the two measurements `acc` took React 19.2.8,
**lucide-react v1** (a major on a UI dependency), eslint-plugin-simple-import-sort
v14, lint-staged v17, prettier 3.9.6, postcss and autoprefixer. Any of those
could have moved the number, and a migration measured against a stale baseline
cannot distinguish its own defects from drift it inherited. Re-measure again if
more dependency work lands before phase 1 starts.

This net exists because the P0–P4 test phases were deliberately written first.
The UI layer is still thin — `App.js` 14%, `DMNTab.jsx` 8%, `importHandler.js`
10% — and P5–P6 target it **after** this migration, not before. Do not widen the
scope to fix that here; the point of doing the tests first was to make this
migration safe, not to make it a rewrite.

## Known scope, measured

| Thing                                 | Count                                                          | Becomes                        |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `REACT_APP_*` env vars                | 3 names, 26 uses                                               | `VITE_*`                       |
| `process.env` references              | 9                                                              | `import.meta.env`              |
| `%PUBLIC_URL%` in `public/index.html` | 5                                                              | root `index.html`, plain paths |
| `jest.*` calls                        | 43 (`fn` 37, `restoreAllMocks` 4, `mock` 1, `clearAllMocks` 1) | `vi.*`                         |
| npm scripts starting `test`           | 12, all using `--testPathPattern`                              | Vitest positional patterns     |
| `output_location: 'build'`            | 2 workflows                                                    | `dist`                         |

Env vars are `REACT_APP_BACKEND_URL`, `REACT_APP_OPERATON_URL`, `REACT_APP_ENV`,
across four `.env` files (`.development`, `.acceptance`, `.production`,
`.example`).

Helpful absences, confirmed: **no `jsconfig.json`**, so no path aliases to port;
`postcss.config.js` and `tailwind.config.js` already exist as real files, which
Vite picks up without changes.

## Ordering, and why it is this way

The temptation is to swap the build first. Do not. `react-scripts` provides
**both** the build and the test runner, so removing it takes away the regression
net and the thing being tested at the same moment — leaving no way to tell a
migration defect from a configuration defect.

Instead, each phase keeps a working suite at all times:

1. **Vitest alongside Jest.** Both green, no source changes.
2. **Vite alongside CRA.** Both build, output compared.
3. **Cutover.** Atomic, because the build output directory and CI must change together.
4. **Cleanup.** Remove the transitional shims.

Phases 1 and 2 are independently revertable. Phase 3 is the only one that cannot
be half-done.

---

## Phase 1 — Vitest alongside Jest

Goal: **257/257 under Vitest**, while `react-scripts test` still passes too.

1. Add dev dependencies: `vitest`, `jsdom`, `@vitejs/plugin-react`,
   `@vitest/coverage-v8`.
2. Add `vitest.config.js` (separate from `vite.config.js`, which does not exist
   yet) with `environment: 'jsdom'`, `globals: true`, and
   `setupFiles: ['./src/setupTests.vitest.js']`.
3. Create `src/setupTests.vitest.js`:

   ```js
   import '@testing-library/jest-dom';
   import { vi } from 'vitest';
   // Transitional: the 43 existing call sites use the jest global. Aliasing it
   // means phase 1 changes no test file, so any failure here is unambiguously
   // the runner or the config — never an edit someone made. Removed in phase 4.
   globalThis.jest = vi;
   ```

4. Add `"test:vitest": "vitest run"` **without touching the 12 existing scripts**.
5. Run both. Both must be 257/257.

**Expect failures here, and treat them as information.** Jest and Vitest differ
on module mocking and timer behaviour. Fix them in the _config_, not by editing
tests — a test edited in phase 1 is a test whose behaviour is no longer verified
by the Jest baseline.

**Exit criterion:** `npm run test:ci` and `npm run test:vitest` both report
16 suites / 257 tests.

---

## Phase 2 — Vite alongside CRA

Goal: `vite build` produces a working site, while `react-scripts build` still does.

These genuinely coexist: CRA reads `public/index.html`, Vite reads a root
`index.html`. Nothing needs removing yet.

1. Add `vite` and create `vite.config.js` (`@vitejs/plugin-react`, and fold in the
   phase-1 `test` block so there is one config, not two).
2. Create root `index.html` from `public/index.html`, dropping all five
   `%PUBLIC_URL%` occurrences for plain `/` paths, and adding:

   ```html
   <script type="module" src="/src/index.js"></script>
   ```

3. Add `"build:vite": "vite"` / `"preview": "vite preview"` alongside the CRA
   scripts.
4. Build both. Compare `build/` and `dist/`: same assets present, `index.html`
   references real files, favicons and `manifest.json` resolve.
5. `vite preview` and click through the app — **especially the DMN tab**, which
   holds 5 of the 9 `process.env` sites and is the least test-covered surface at 8%.

**Env vars are still `process.env` at this point and will be `undefined` under
Vite.** That is expected — every consumer has a fallback (`|| 'http://localhost:3001'`),
so the app runs against defaults. Do not fix it here; it is phase 3's job, and
doing it now breaks the Jest baseline that is still load-bearing.

**Exit criterion:** both builds succeed; the Vite preview is functionally
indistinguishable except for env-var defaults.

---

## Phase 3 — Cutover (atomic)

Everything here lands in **one pull request**. The moment `npm run build` emits
`dist` instead of `build`, CI must already expect `dist`.

1. **Env vars.** Rename `REACT_APP_*` → `VITE_*` in all four `.env` files, and
   change 9 `process.env.REACT_APP_X` → `import.meta.env.VITE_X`. Keep every
   existing fallback exactly as it is.
2. **Scripts.** Replace all 12 test scripts. `--testPathPattern` does not exist in
   Vitest; it takes patterns positionally:

   | was                                   | becomes                   |
   | ------------------------------------- | ------------------------- |
   | `react-scripts test`                  | `vitest`                  |
   | `react-scripts test --watchAll=false` | `vitest run`              |
   | `--watchAll=false --coverage`         | `vitest run --coverage`   |
   | `--testPathPattern=ttlGenerator`      | `vitest run ttlGenerator` |
   | `--testPathPattern="a\|b\|c"`         | `vitest run a b c`        |

   Also `start` → `vite`, `build` → `vite build`. Delete `eject`.

3. **CI, both workflows.** `output_location: 'build'` → `'dist'` in
   `azure-static-web-apps-orange-beach-*.yml` **and**
   `azure-static-web-apps-white-sky-*.yml`.
4. **Remove** `react-scripts` from dependencies; delete `public/index.html`,
   `src/reportWebVitals.js`, the `web-vitals` dependency, and the
   `reportWebVitals` import and call in `src/index.js`.

   **[4 Sep] Renovate has #62 open, bumping `web-vitals` to v6 — the dependency
   this step deletes.** Close it rather than merging it; merging spends a review,
   a build and a staging slot on code that phase 3 removes. If it is still open
   when phase 3 lands, this step closes it automatically.

**Exit criterion:** 257/257 under Vitest; `npm run build` emits `dist`; the acc
preview deployment serves a working site.

---

## Phase 4 — Cleanup

No behavioural change; the Vitest suite is now the net.

1. `jest.fn` → `vi.fn` and friends across 43 call sites; add
   `import { vi } from 'vitest'` where needed (or keep `globals: true`).
2. Delete the `globalThis.jest = vi` shim and fold
   `src/setupTests.vitest.js` back into `src/setupTests.js`.
3. Update `.claude/commands/bump-release.md` and `docs/testing.md` for the new
   commands.
4. **[4 Sep] Remove both Renovate deferral rules from `renovate.json`** — the
   `tailwindcss` and `typescript` major holds added on 4 September. Both exist
   only because `react-scripts` constrains the toolchain, and phase 3 deletes
   `react-scripts`:

   - **tailwindcss v4** moves the PostCSS plugin to `@tailwindcss/postcss`; the
     build failed on it in #56.
   - **typescript v7** cannot resolve at all, because `react-scripts@5.0.1`
     peer-requires `^3.2.1 || ^4`. #58 shipped a manifest bump with no lockfile
     for that reason.

   Each rule's `description` says to remove it here. **Nothing enforces that.**
   Left in place, two majors stay silently frozen with no signal that they are
   being held — which is exactly the failure mode the rules were written to
   avoid for a different reason.

---

## Traps specific to this repository

**The deploy can succeed while publishing nothing.** `output_location` is the
single highest-risk line in the migration. If it still says `build` when Vite
emits `dist`, Azure uploads an empty directory and reports success. Verify by
loading the preview URL, not by reading a green check.

**`white-sky` targets `main`, which is not promoted yet.** Change it in phase 3
anyway. Leaving it on `build` plants a failure that fires weeks later during a
production promotion, with nothing in the diff to point at.

**Staging slots will bite every pull request here.** ~~ttl-editor's SWA workflows
have no `paths:` filter, ten Renovate PRs are open, and the ceiling is three —
see #52.~~ Every migration PR touches build config, so none of them can be
filtered out. Note only `audit` is a required check, so a refused preview does
not block a merge — but it does remove the preview this migration most needs.

**[4 Sep] This precondition is now satisfied, and one number in it was wrong.**

The ceiling is **ten**, not three: on 4 September ten staging environments
coexisted and the eleventh was refused, which puts these apps on Standard rather
than Free. The sizing was wrong in #52 and inherited here. The conclusion was
not — an unbounded queue against a bounded pool behaves the same at either
number.

What changed:

- Renovate is capped at **5** concurrent pull requests (#57). It had been
  running at its default of 10, which exactly consumed the ten-slot ceiling and
  left nothing for human work.
- The queue was drained from ten open pull requests to two.
- Documentation-only changes no longer deploy at all (#65, closing #52), so
  editing _this file_ during the migration costs no slot.
- Stacked pull requests now run the audit (#54). Before that fix, a pull request
  based on a feature branch accumulated no `audit`, reported CLEAN with zero
  checks, and blocked permanently once GitHub retargeted it to `acc`. **Phases 1
  and 2 are naturally stacked, so this mattered directly.** Verified live on
  #61.

Eight slots are free at the time of writing. Previews are available for every
phase.

**The runner's flags change, and the repo's own rules mention the old ones.**
`CLAUDE.md` records that Jest's serial flag is `--runInBand` while Vitest uses
`--run` / `--no-file-parallelism`. After phase 3 this repository is a Vitest repo;
anyone reaching for `--runInBand` will get a rejected flag. Worth a line in
`docs/testing.md`.

**Do not add tests during the migration.** The suite is the instrument. Changing
the instrument and the thing it measures at the same time is how a migration
becomes unfalsifiable. P5–P6 exist for that, afterwards.

## Rollback

Phases 1 and 2 are additive — revert the commit. Phase 3 is one PR, so
`gh pr revert` or a revert commit restores CRA wholesale, provided phase 3 was
genuinely atomic. **This is the reason for insisting on that.**

## Explicitly out of scope

- Raising UI-layer coverage (`App.js`, `DMNTab.jsx`, `importHandler.js`) — that is
  P5–P6
- Any behavioural or styling change
- `gitlab-pieter`, which is also `ttl-editor` but at version `0.1.0` — a stale
  clone, not a sibling application
- TypeScript. Vite makes it easier; that is not a reason to do it here.
- **[4 Sep] Tailwind v4.** Removing `react-scripts` unblocks it, and under Vite
  the idiomatic setup is the `@tailwindcss/vite` plugin rather than the PostCSS
  pipeline this repository uses today. That is a second migration wearing the
  first one's clothes. `postcss.config.js` and `tailwind.config.js` keep working
  unchanged on tailwind v3, which is what "Vite picks them up without changes"
  above depends on. Do it after, deliberately, with its own acceptance run.
- **[4 Sep] The testing-library major, #63.** It changes the instrument this
  migration is measured with. Either merge it _before_ phase 1 and re-measure
  the baseline on top of it, or hold it until after phase 4 — but do not let it
  land mid-migration, for the same reason the plan forbids adding tests.
