# Publishing through the backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The editor publishes through one LDE backend call, made as the signed-in `lde-author`. The TriplyDB base URL, account and token live only on the backend, and each publish is logged.

**Architecture:**
- **LDE backend:** reads the TriplyDB write target from settings, and gains `POST /v1/triplydb/publish` (TTL upload, logo assets, service sync, one log line) and `GET /v1/triplydb/publish-target`.
- **Existing TriplyDB routes:** use the server credential and require `lde-author`.
- **ttl-editor:** keeps only the dataset name, calls the backend, and builds the "required services" picker URL from `publish-target`.

**Tech Stack:**
- LDE backend: Express 5, TypeScript, axios through `createOutboundClient`, Jest with supertest.
- ttl-editor: React with Vite, Vitest with Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-12-server-side-publish-design.md` (ttl-editor)

## Global Constraints

- **Branches:**
  - ttl-editor work goes on `feat/234-server-side-publish`, which already exists and holds the design.
  - LDE work goes on a new `feat/234-server-side-publish` branched from `acc`, created in a standalone command.
  - No worktrees.
- **Commits:** ask the owner before **every** commit, and never add attribution lines.
- **Never:** start, stop or restart dev servers; bypass hooks; run `npm ci`.
- **Settings:** `TRIPLYDB_BASE_URL` (default `https://api.open-regels.triply.cc`, must pass `checkTriplyDbBaseUrl`), `TRIPLYDB_ACCOUNT` (`stevengort` on ACC and PROD), `TRIPLYDB_API_TOKEN`.
- **When the account or token is unset:** the backend still starts. The publish routes and the three existing routes answer `503` with title "Publishing not configured", and `publish-target` answers `503` too.
- **Dataset name rule** (backend and editor alike): `/^[A-Za-z0-9-]{1,40}$/`.
- **Graph rule:** the value must start with `https://regels.overheid.nl/graphs/` and parse as a URL.
- **The token never appears** in a response, a log line, an error detail, or browser storage.
- **Test runs**, with per-file 80% branch-coverage floors:
  - LDE backend: `npm test --workspace=packages/backend` (Jest with coverage);
  - ttl-editor: `npm run test:ci`;
  - run them the way CI does.

## Review Focus

1. **The token never leaks.** The publish route, its failure paths and its log line contain no token. A test checks the response body and every logger call for the token string.
2. **A dataset name trying to escape the account.** `../x`, `a/b`, `a%2Fb` and an empty name each answer 400, and no outbound request is made.
3. **A partial publish.**
   - If the TTL upload fails, the route answers 502 and logs `outcome: "failed"`.
   - If the upload succeeds but the service sync fails, it answers 200 with `serviceUpdated: false` and logs `outcome: "published-with-warning"`.
   - A failing logo only shows up in `logos[].ok`.
4. **An old browser.** `localStorage` holding `{baseUrl, account, dataset, apiToken}` is reduced to `{dataset}` on first load and written back.
5. **The picker when the backend is unconfigured or unreachable.** `publish-target` answering 503, or a network error, leaves the "required services" picker showing "unconfigured", with no crash and no request to TriplyDB.

---

### Task 1: Backend: the publish target in config, and `GET /v1/triplydb/publish-target`

**Files:**
- Modify: `linked-data-explorer/packages/backend/src/utils/config.ts`, `src/routes/triplydb.routes.ts`, `.env.example`
- Test: `src/routes/triplydb.routes.test.ts`, `src/utils/config.test.ts` (if present; otherwise in the routes test)

**Interfaces:**
- Produces:
  - `config.triplydb.publish: { baseUrl: string; account: string; apiToken: string }`. The strings are empty when unset.
  - `publishTarget(): { baseUrl: string; account: string } | null`, exported from `src/services/triplydb.service.ts`. It returns null when the account or token is empty, or when the base URL fails `checkTriplyDbBaseUrl`.
  - `requirePublishTarget` middleware in `triplydb.routes.ts`: 503 problem `{ title: 'Publishing not configured', detail: 'Publishing is not configured on this backend' }` when `publishTarget()` is null.

- [ ] **Step 0:** In `linked-data-explorer`, run `git switch -c feat/234-server-side-publish` from an up-to-date `acc`, as a standalone command.
- [ ] **Step 1: Write the failing tests.**
  - `GET /v1/triplydb/publish-target` with the account and token set answers 200 with `{ baseUrl: 'https://api.open-regels.triply.cc', account: 'stevengort' }`, and the body contains no `apiToken`.
  - With the token unset it answers 503 with title `Publishing not configured`.
  - Mock config the way existing tests do.
- [ ] **Step 2:** Run `npm test --workspace=packages/backend -- triplydb.routes`. Expected: FAIL, 404 on the route.
- [ ] **Step 3: Implement.**
  - In config, read `TRIPLYDB_BASE_URL` (with its default), `TRIPLYDB_ACCOUNT` and `TRIPLYDB_API_TOKEN`.
  - Add `publishTarget()`, the middleware and the route.
  - Add the three settings, commented, to `.env.example`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit after the owner says yes: `feat(backend): TriplyDB publish target from settings (ttl-editor#234)`.

### Task 2: Backend: service functions that use the server credential

**Files:**
- Modify: `src/services/triplydb.service.ts`
- Test: `src/services/triplydb.service.test.ts`

**Interfaces:**
- Consumes: `publishTarget()` (Task 1).
- Produces:
  - `serverConfig(dataset: string): TriplyDBConfig`. Builds the config from `config.triplydb.publish` and the dataset; throws if not configured.
  - `uploadTtl(dbConfig: TriplyDBConfig, ttl: string, filename: string, graph: string): Promise<void>`. POST `${baseUrl}/datasets/${account}/${dataset}/jobs?defaultGraphName=${encodeURIComponent(graph)}`, multipart with fields `file` (`text/turtle;charset=utf-8`, the filename ending in `.ttl`) and `defaultGraphName`. Throws `Error('TriplyDB upload failed: <status> <text>')` on a non-2xx answer.
  - `uploadAsset(dbConfig: TriplyDBConfig, fileName: string, dataUrl: string): Promise<void>`. POST `.../assets`, multipart field `file` with the decoded image bytes and the MIME type taken from the data URL.
  - `send()` accepts `body?: string | FormData`. For FormData, the `Content-Type` header is not set by hand.
  - `listGraphs`, `updateService` and `testConnection` keep their signatures.

- [ ] **Step 1: Write the failing tests**, with the outbound client mocked as the existing service tests do:
  - `uploadTtl` posts to the `/jobs` URL with the encoded graph, a `Bearer <token>` header and a FormData body holding `file` and `defaultGraphName`;
  - a 500 answer rejects with a message that does not contain the token;
  - `uploadAsset` posts to `/assets` with a `file` entry of type `image/png`;
  - `serverConfig('x')` throws when not configured.
- [ ] **Step 2:** Run `npm test --workspace=packages/backend -- triplydb.service`. Expected: FAIL, the functions are not defined.
- [ ] **Step 3:** Implement. Node 24 has global `FormData` and `Blob`, and axios sends FormData as multipart.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit after the owner says yes: `feat(backend): TriplyDB uploads with the server credential (ttl-editor#234)`.

### Task 3: Backend: `POST /v1/triplydb/publish`

**Files:**
- Modify: `src/routes/triplydb.routes.ts`
- Test: `src/routes/triplydb.routes.test.ts`, `src/routes/write-auth.test.ts`

**Interfaces:**
- Consumes: `requireAuthor`, `res.locals.user: AuthUser` (`sub`, `username?`), `requirePublishTarget`, `serverConfig`, `uploadTtl`, `uploadAsset`, `updateService`.
- Request body: `{ dataset, graph, filename, ttl, organization, service, logos?: [{ fileName, dataUrl }] }`.
- Responses:
  - `200 { success: true, url, graph, serviceUpdated: boolean, serviceError?: string, logos: [{ fileName, ok }] }`;
  - `400` for an invalid input (`code: 'INVALID_INPUT'`);
  - `502` when the TTL upload fails;
  - `503` when publishing is not configured.
- `url` is `${baseUrl without 'api.'}/datasets/${account}/${dataset}`, which is what the editor shows today.
- Log line, through `logger.info` on success or warning and `logger.warn` on failure, message `'[TriplyDB] publish'`:
  - fields `{ event: 'triplydb.publish', user: username ?? sub, organization, service, graph, dataset, outcome, error? }`;
  - `outcome` is one of `published`, `published-with-warning` or `failed`.

- [ ] **Step 1: Write the failing tests.**
  - The happy path calls `uploadTtl`, then `uploadAsset` for each logo, then `updateService(serverConfig(dataset), dataset, undefined, graph)`. It answers 200 and logs `outcome: 'published'` with `user`.
  - Each invalid input answers 400, and `uploadTtl` is not called. The invalid inputs are:
    - a dataset of `../x`, `a/b`, `a%2Fb`, `''`, or 41 characters;
    - a graph `https://evil.example/graphs/x`;
    - an empty `ttl`;
    - a logo whose `fileName` contains `/` or `..`, or a `dataUrl` that is not `data:image/`.
  - When `uploadTtl` rejects, the route answers 502 and logs `outcome: 'failed'`.
  - When `updateService` rejects, the route answers 200 with `serviceUpdated: false` and logs `published-with-warning`.
  - When one `uploadAsset` rejects, its entry has `ok: false` and the response is still 200.
  - **Token never leaks:** the JSON of every response body and of every logger call's arguments lacks the configured token string.
  - In `write-auth.test.ts`, add `['post', '/v1/triplydb/publish']` and `['post', '/api/triplydb/publish']` to `CLOSED`.
- [ ] **Step 2:** Run `npm test --workspace=packages/backend -- triplydb.routes write-auth`. Expected: FAIL, 404.
- [ ] **Step 3:** Implement the route, using `requireAuthor` and then `requirePublishTarget`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit after the owner says yes: `feat(backend): publish to TriplyDB as the signed-in author, logged (ttl-editor#234)`.

### Task 4: Backend: the existing routes on the server credential; OpenAPI and docs

**Files:**
- Modify: `src/routes/triplydb.routes.ts`, `openapi/openapi.yaml`, the LDE docs listing environment variables (find them with `grep -rln TRIPLYDB_TIMEOUT docs packages/backend --include=*.md`), and `docs/sign-in-rollout.md` if it lists backend settings
- Test: `src/routes/triplydb.routes.test.ts`, `src/routes/write-auth.test.ts`, `src/openapi/*.test.ts` (existing)

**Interfaces:**
- `update-service`, `list-graphs` and `test-connection` use `requireAuthor` and then `requirePublishTarget`.
- The dataset comes from `body.dataset ?? body.config?.dataset` and is checked against the dataset name rule (400 otherwise).
- They call the service with `serverConfig(dataset)`. `body.config.apiToken`, `baseUrl` and `account` are ignored.
- `test-connection` answers 200 `{ success: true }` when `testConnection` is true, and otherwise 404 with title `Dataset not found`.

- [ ] **Step 1: Write the failing tests.**
  - `update-service` with `config.apiToken: 'caller'` calls `updateService` with the **server** token, not the caller's.
  - A missing or invalid dataset answers 400.
  - `list-graphs` and `test-connection` without a sign-in answer 401. Add `['post', '/v1/triplydb/list-graphs']` and `['post', '/v1/triplydb/test-connection']` to `CLOSED`.
  - `test-connection` for an unknown dataset answers 404.
  - Update the existing tests that send an `apiToken` and expect a 400 without it.
- [ ] **Step 2:** Run `npm test --workspace=packages/backend -- triplydb.routes write-auth`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Change the routes.
  - In `openapi.yaml`, describe `POST /v1/triplydb/publish` and `GET /v1/triplydb/publish-target`, remove `apiToken`, `baseUrl` and `account` from the three request bodies, and add `dataset`. Then run `npm run build:openapi --workspace=packages/backend`.
  - Update the doc comments on the routes.
  - Document the three settings, and mark that `TRIPLYDB_API_TOKEN` is a secret.
- [ ] **Step 4:** Run `npm test --workspace=packages/backend`. Expected: the whole suite passes, coverage floors included.
- [ ] **Step 5:** Commit after the owner says yes: `feat(backend): TriplyDB routes use the server credential and require lde-author (ttl-editor#234)`.

### Task 5: Editor: the helper calls the backend

**Files:**
- Modify: `ttl-editor/src/utils/triplydbHelper.js`, `src/utils/index.js`
- Test: `src/utils/triplydbHelper.test.js`

**Interfaces:**
- Produces:
  - `loadTriplyDBConfig(): { dataset: string }`. Reads `triplydb_config`, keeps only `dataset` (default `'DMN-discovery'`), and writes `{ dataset }` back whenever the stored value had any other key.
  - `saveTriplyDBConfig({ dataset })`.
  - `validateTriplyDBConfig(config): { valid, error? }`. Checks only the dataset name rule.
  - `fetchPublishTarget(): Promise<{ baseUrl, account } | null>`. GET `${BACKEND_URL}/v1/triplydb/publish-target`; null on a non-2xx answer or a network error.
  - `testTriplyDBConnection({ dataset }): Promise<{ success, message?, error? }>`. POST `${BACKEND_URL}/v1/triplydb/test-connection` with `authHeaders()` and the body `{ dataset }`. A 404 maps to "Dataset not found. Please check the dataset name.", and a 401 or 403 to "Sign in as an author to check the dataset."
  - `publishToTriplyDB({ dataset, graph, filename, ttl, organization, service, logos }): Promise<{ url, graph, serviceUpdated, serviceError?, logos }>`. POST `/v1/triplydb/publish` with `authHeaders()`. Throws `Error` carrying `getProblemDetail(...)` on a non-2xx answer; a 401 or 403 throws `Error('Sign in as an author to publish.')`.
  - `buildGraphIRI` is unchanged.
- Removed: `publishToTriplyDB_SPARQL`, `uploadLogoAsset`, `updateTriplyDBService`, `getDefaultTriplyDBConfig`'s token fields, and every direct `fetch` to TriplyDB. Update `src/utils/index.js` to match.

- [ ] **Step 1: Write the failing tests**, with `fetch` and `authHeaders` mocked as the existing tests do:
  - **Request shape:** `publishToTriplyDB` posts JSON to `${BACKEND_URL}/v1/triplydb/publish` with the auth header, and no request goes to a `triply.cc` URL.
  - **Error mapping:** 401 gives the sign-in error; 502 gives the problem detail.
  - **Clean-up:** `loadTriplyDBConfig` with stored `{baseUrl, account, dataset:'X', apiToken:'secret'}` returns `{dataset:'X'}`, and `localStorage` afterwards holds no `apiToken`.
  - **Validation:** `validateTriplyDBConfig({dataset:'a/b'}).valid` is false.
  - `fetchPublishTarget` returns null on 503 and on a rejected fetch.
- [ ] **Step 2:** Run `npx vitest run src/utils/triplydbHelper.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit after the owner says yes: `feat: publish through the LDE backend as the signed-in author (#234)`.

### Task 6: Editor: dialog, publish flow and picker

**Files:**
- Modify: `src/components/PublishDialog.jsx`, `src/App.jsx` (`handlePublish`, the picker's `triplyDBConfig` prop), `src/hooks/useEditorState.js`
- Test: `src/components/PublishDialog.test.jsx`, `PublishDialog.states.test.jsx`, a test for the picker config (`src/components/tabs/RequiredServicesSection.test.jsx` or the `App` test that renders it), and the App publish test if one exists

**Interfaces:**
- Consumes: Task 5's helpers.
- `useEditorState` adds `publishTarget` (state, initially null, filled once by `fetchPublishTarget()` in an effect) and exposes `pickerConfig = publishTarget ? { ...publishTarget, dataset: triplyDBConfig.dataset } : { dataset: triplyDBConfig.dataset }`. The `RequiredServicesSection` receives `pickerConfig` as `triplyDBConfig`.
- `PublishDialog` shows only the Dataset Name field, "Test connection", and the existing progress and outcome area. Publish is enabled when `validateTriplyDBConfig(config).valid`.
- `handlePublish(config)` makes one call to `publishToTriplyDB` and moves through the steps generating TTL (30), publishing (60), and done (100):
  - success when `serviceUpdated`;
  - the existing "Published with warning" when not, showing `serviceError`;
  - the existing error path on a throw;
  - it saves `{ dataset }` on success or warning.
- Logos: the organisation logo goes as `${orgId}_logo.png` and the vendor logo as `${vendorName}_vendor_logo.png`, each only when it is a `data:` URL, with the same names as today.

- [ ] **Step 1: Write the failing tests.**
  - The dialog has no "API Token", "Base URL" or "Account" field.
  - Publish is disabled for dataset `a/b`.
  - "Test connection" calls `testTriplyDBConnection` with `{ dataset }`.
  - The picker gets `{ baseUrl, account, dataset }` when `fetchPublishTarget` resolves, and shows unconfigured when it resolves to null.
  - `handlePublish` with `serviceUpdated: false` shows the warning message.
- [ ] **Step 2:** Run `npx vitest run src/components`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run test:ci` and `npm run lint`. Expected: the whole suite passes, coverage floors included, and lint is clean.
- [ ] **Step 5:** Ask the owner to try it on the local stack. The LDE backend needs `TRIPLYDB_ACCOUNT` and `TRIPLYDB_API_TOKEN` in `packages/backend/.env`, and the owner restarts it. The checks:
  - signed in, publish to a test dataset, and see the success message;
  - check the backend log line;
  - DevTools Application → Local Storage `triplydb_config` holds only `dataset`.
- [ ] **Step 6:** Commit after the owner's green: `feat: Publish dialog keeps only the dataset; the picker gets its target from the backend (#234)`.

### Task 7: Docs, rollout and the follow-up issue

**Files:**
- Modify: ttl-editor `README.md` (the publish section, if it mentions the token) and the ttl-editor docs that describe publishing (find them with `grep -rli "api token" docs README.md`).

- [ ] **Step 1:** Update the docs: publishing needs sign-in as `lde-author`, the dataset is the only setting, and no TriplyDB token is needed.
- [ ] **Step 2:** Commit after the owner says yes: `docs: publishing needs sign-in, not a TriplyDB token (#234)`.
- [ ] **Step 3: Rollout settings.**
  - Read the current settings of `ronl-linkeddata-backend-acc` and `-prod` (subscription "PDR - C1380", resource group `RONL-Preproduction`).
  - Hand the owner a script at `~/<name>.sh` that sets `TRIPLYDB_ACCOUNT=stevengort` and prompts for `TRIPLYDB_API_TOKEN`, so the value never shows.
  - Verify with `appsettings list`, checking the names only, never printing the value.
  - Delete the script afterwards.
- [ ] **Step 4:** Push both branches and open the PRs (LDE first; ttl-editor's body says to merge it right after LDE's). Only after the owner asks.
- [ ] **Step 5: File the follow-up issue** in `sgort/linked-data-explorer`: "Read paths hardcode the open-regels TriplyDB host and the stevengort account". List these paths from the spec's "Follow-ups":
  - LDE frontend: `utils/constants.ts`, `defaultTestCases.ts`, `RopaRecordEditor.tsx` and `logoResolver.ts`;
  - LDE backend: `GET /v1/triplydb/assets`;
  - ttl-editor: `useEditorState.js`.

  Give the reason (PROD will move to its own TriplyDB instance) and link ttl-editor#234.
