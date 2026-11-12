# Publishing through the backend, as the signed-in author (#234)

Issue: sgort/ttl-editor#234. Builds on linked-data-explorer#163 (sign-in with realm `ronl`, role `lde-author`).

## Why

Publishing a service description to TriplyDB is a write on behalf of an organisation. Since #163, the editor knows who is signed in and locks Publish for anyone without `lde-author`. The publish itself bypasses that, though:

- the browser uploads the TTL and the logos **straight to TriplyDB**, with a TriplyDB API token the user types into the Publish dialog;
- that token is kept in `localStorage` and also sent in the request body to the LDE backend's `update-service`.

So anyone with the token can publish without signing in, the lock is UI only, and nothing records who published. That is the remaining gap against the IOU PSA decisions AB-17 (backends accept tokens from one OIDC issuer) and AB-20 (every write is authenticated, authorised and logged).

The whole stack is a prototyping sandbox. "PROD" means the stable release, not production.

PROD will later move to its own, new TriplyDB instance. That move is a direction, not a requirement of this work. This design puts the **write** target in backend settings. Several **read** paths still hardcode `api.open-regels.triply.cc/datasets/stevengort/...`; see "Follow-ups".

## Goals

- **One server-side credential.** The TriplyDB base URL, account and API token live only on the LDE backend. They never reach the browser.
- **Only `lde-author` publishes**, for any organisation. Authorisation is by role only, with no limit per organisation.
- **One log line per publish attempt** in the backend: who, organisation, service, graph, dataset, time and outcome.
- **The author still chooses the dataset name.** Base URL and account are fixed per environment.

## Non-goals

- No per-organisation authorisation and no organisation attribute on users.
- No audit store, report or UI. The backend log is enough.
- No rotation of the current token. PROD moves to a new TriplyDB instance anyway.
- No changes to the read paths: `/v1/triplydb/query`, `GET /v1/triplydb/assets` and the LDE frontend's logo resolver stay as they are.
- No change to how the TTL is generated or to the graph IRI scheme (`buildGraphIRI`).

## Anti-goals (a failure even if it works)

- The TriplyDB token appears in any response, log line, error message or browser storage.
- An author can steer a write outside the configured account or host, for example through a dataset name with `/` or `..` in it.
- The editor ends up in a state where it still holds or sends the old token.
- Publish is broken on ACC or PROD between the LDE deploy and the ttl-editor deploy, beyond the few minutes the rollout order allows.

## Design

### Backend (linked-data-explorer, `packages/backend`)

**Configuration** (`src/utils/config.ts`, `.env.example`, and the docs listing environment variables):

| Setting | Meaning | Default |
|---|---|---|
| `TRIPLYDB_BASE_URL` | the TriplyDB API to publish to | `https://api.open-regels.triply.cc` |
| `TRIPLYDB_ACCOUNT` | the shared account: `stevengort` on ACC and PROD, the account every read path uses today | none |
| `TRIPLYDB_API_TOKEN` | its API token, a secret | none |

- `TRIPLYDB_BASE_URL` must pass the existing `checkTriplyDbBaseUrl`: https, and the host must be in `TRIPLYDB_ALLOWED_HOSTS`.
- If the account or the token is missing, **the backend still starts**. The publish routes then answer `503` with "Publishing is not configured on this backend". Everything else in the LDE works without TriplyDB writes, unlike without `KEYCLOAK_URL`.

**New route `POST /v1/triplydb/publish`**, behind `requireAuthor`. JSON body; the existing 10 MB body limit is enough for a TTL plus two logos as data URLs:

```json
{
  "dataset": "DMN-discovery",
  "graph": "https://regels.overheid.nl/graphs/<org>/<service>",
  "filename": "<service>.ttl",
  "ttl": "<turtle>",
  "organization": "<organisation identifier>",
  "service": "<service identifier>",
  "logos": [{ "fileName": "<org>_logo.png", "dataUrl": "data:image/png;base64,..." }]
}
```

The route does, in order:
1. **Validate.**
   - `dataset` must match TriplyDB's dataset-name rule: letters, digits and `-`, 1 to 40 characters.
   - `graph` must be an absolute `https://regels.overheid.nl/graphs/...` IRI, the scheme `buildGraphIRI` produces.
   - `ttl` must be a non-empty string.
   - Each logo must be an `image/*` data URL with a plain file name: no path separators and no `..`.
   - Failures return `400` as a problem response, before anything is written.
2. **Upload the TTL** to `<base>/datasets/<account>/<dataset>/jobs` with `defaultGraphName=<graph>`, as the browser does today. A failure here fails the publish with `502`.
3. **Upload each logo** to `<base>/datasets/<account>/<dataset>/assets`. A failing logo does **not** fail the publish; it is reported in the response (`logos: [{ fileName, ok }]`), as the editor does today.
4. **Update the service** (the existing `updateService` logic, with the server credential). If this fails after a successful upload, the response is `200` with `serviceUpdated: false` and the reason. That is today's "published with warning".
5. **Log one line**, through the existing logger:
   - always: `event: "triplydb.publish"`, `user` (`preferred_username`), `organization`, `service`, `graph`, `dataset`, `outcome` (`published`, `published-with-warning` or `failed`), plus a timestamp and request id;
   - when it failed: the `error` message.
   - Never the token, the TTL or the logo data.

Response on success: `{ success: true, url: <dataset page>, graph, serviceUpdated, logos }`.

**New route `GET /v1/triplydb/publish-target`**, open like the other read routes. It returns the non-secret part of the write target, `{ baseUrl, account }`, or `503` when publishing is not configured. Never the token. The editor needs it for the "required services" picker (see below).

**Existing routes** keep their paths, so the published API is not broken. All three move behind `requireAuthor` and use the server credential, ignoring any `apiToken` the caller sends:
- `update-service` takes `config.dataset` from the body, or a top-level `dataset`;
- `list-graphs`, likewise;
- `test-connection` becomes a dataset-existence check for the given dataset.

The OpenAPI document and the route doc comments drop `apiToken` from the request bodies.

`TriplyDBConfig` in `triplydb.service.ts` is built from the server config plus the requested dataset. The service functions no longer receive a token from a request.

### Editor (ttl-editor)

- **`src/utils/triplydbHelper.js`:**
  - `publishToTriplyDB` becomes one call to `POST /v1/triplydb/publish` with `authHeaders()`. It returns what the dialog needs: the dataset URL, the warning from a failed service update, and the logo outcomes.
  - The direct TriplyDB calls are removed: the `/jobs` upload, `uploadLogoAsset`, the unused `publishToTriplyDB_SPARQL`, and the direct `testTriplyDBConnection`.
  - `updateTriplyDBService` goes as well; the publish route does it.
  - `testTriplyDBConnection` calls the backend's `test-connection` with the dataset name.
- **Config:**
  - The stored config is only `{ dataset }`, under the existing `triplydb_config` key.
  - `loadTriplyDBConfig` drops `baseUrl`, `account` and `apiToken` from whatever it reads, and writes the cleaned value back, so the old token leaves `localStorage` on first load.
  - `validateTriplyDBConfig` checks only the dataset name, with the same rule as the backend.
- **The "required services" picker** (`RequiredServicesSection.jsx`, from #223) builds its SPARQL URL with `buildDatasetSparqlUrl(triplyDBConfig)`, which needs `baseUrl`, `account` and `dataset`. Without the first two it shows an empty list, silently.
  - The editor fetches `publish-target` once and combines it with the stored dataset name into the config the picker receives.
  - When the backend answers `503` or cannot be reached, the picker shows it as unconfigured, as it does today with an incomplete config.
  - A test covers the picker receiving a complete config from the stored dataset plus the publish target.
- **`PublishDialog.jsx`:** keeps the Dataset Name field and "Test connection". The Base URL, Account and API Token fields, and the token help text, are removed.
- **`App.jsx`, `handlePublish`:**
  - the progress steps follow the single call: generating TTL, publishing, done or warning;
  - the three outcomes stay: success, published with warning, and error;
  - a `401` or `403` gives the same sign-in message as Deploy;
  - Publish stays wrapped in `LockedAction`.
- **Tests:** unit tests for the helper, covering the request shape, auth header, warning and error mapping, and the `localStorage` clean-up. Also the dialog, which has no token field. The existing e2e publish journey, if any, signs in first, as the deploy journeys do since #163.

### Rollout

The order is the same as #163:
1. Set `TRIPLYDB_ACCOUNT` and `TRIPLYDB_API_TOKEN` on `ronl-linkeddata-backend-acc` and `-prod`. The owner does this, from a handed script.
2. Merge the LDE pull request, then the ttl-editor one straight after.

Between the two deploys, the old editor still publishes directly to `stevengort`, because the old token still works. Its `update-service` call then goes through the new backend, which ignores the token it sends, uses the server's (also `stevengort`) and still requires `lde-author`. So nothing breaks in between.

## Follow-ups (not in this work)

These read paths hardcode the open-regels host or the `stevengort` account. They have to become configurable before PROD moves to its own TriplyDB instance:
- **LDE frontend:** `utils/constants.ts`, `defaultTestCases.ts`, `RopaRecordEditor.tsx`, and `logoResolver.ts`, which takes the account from the endpoint;
- **LDE backend:** `GET /v1/triplydb/assets`, which hardcodes the base URL;
- **ttl-editor:** the default SPARQL endpoint in `useEditorState.js`.

## Left to the builder

- Whether the TTL upload uses `fetch` with `FormData`/`Blob` (Node 24 has both) or the existing service helpers.
- How the 503 "not configured" check is shared between the routes: a small middleware or a guard function.
- The exact wording of the dialog texts, in the style of the existing ones.
- The file layout of new tests, following each repository's convention, and meeting the per-file 80% branch-coverage floors of both repositories.

## Calls made by the assistant (for review)

- The backend starts without TriplyDB settings; only publishing answers 503.
- The dataset name is restricted to TriplyDB's naming rule, so an author cannot leave the configured account.
- The old routes are kept, behind `lde-author`, using the server credential and ignoring a caller's token, rather than removed.
- A failed logo upload or service update does not fail the publish, as today.
- This document lives in ttl-editor, because the issue does.
- The picker gets base URL and account from a new open `publish-target` route, rather than from build-time variables or hardcoded defaults.
- Moving PROD to its own TriplyDB instance is read as a direction, so the hardcoded read paths are follow-ups rather than part of this work.
