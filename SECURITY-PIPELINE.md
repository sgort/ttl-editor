# Pipeline supply-chain posture

Policy: nothing downloaded or executed by a pipeline may float. No
`latest`, no empty versions — a hash, digest or verified checksum
wherever one exists. Enforced in-repo by `.github/zizmor.yml` and the
`Supply-chain audit` workflow. Most pins are kept current by Renovate
under a 14-day cooldown; a few are not — see the "Maintained by" column
below for which, and why.

## Manual prerequisites

Two settings outside this repo's files must be in place for the
mechanisms above to actually run:

- The Renovate (Mend-hosted) GitHub App must be installed on the
  `sgort` account. Without it, `renovate.json` is inert configuration
  that nothing executes.
- **Dependabot alerts** must be enabled in the repository settings.
  `vulnerabilityAlerts` in `renovate.json` — the no-cooldown fast route
  for security advisories — only fires off of those alerts; with the
  toggle off, the rule has nothing to react to and the fast route is
  inert too.

## Pinned

| Dependency                     | Pin                                                 | Version           | Maintained by                                                           |
| ------------------------------ | --------------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `actions/checkout`             | `a37ce9120846195fa4ece8f58b268e6043cb2f26`          | v3.7.0            | Renovate                                                                |
| `actions/setup-node`           | `49933ea5288caeca8642d1e84afbd3f7d6820020`          | v4.4.0            | Renovate                                                                |
| `zizmorcore/zizmor-action`     | `3dc1ecc9bcb9e94e9b2c709687979e1298497054`          | v0.6.2            | Renovate                                                                |
| `Azure/static-web-apps-deploy` | `4d27395796ac319302594769cfe812bd207490b1`          | v1                | manual — Renovate disabled for it, see "The `@v1` ambiguity" below      |
| zizmor (the audit tool itself) | `version: '1.29.0'` input, not `latest`             | 1.29.0            | manual — Renovate's github-actions manager does not parse action inputs |
| npm dependencies (test/lint)   | `package-lock.json`, `sha512` integrity per package | lockfileVersion 3 | Renovate                                                                |

The npm layer feeding `npm ci` — lint and the test suite — was already
hash-pinned before this work: `npm ci` verifies every package against
its lockfile integrity hash. This governs what gets **tested**, not
what gets **shipped**: the production bundle is built separately, by
Oryx, inside the deploy container — see the container exception below.
Lockfile covers integrity; the Renovate cooldown covers intent — a
lockfile cannot tell you that a legitimately published version is
malicious.

The zizmor pin is stronger than the two rows above suggest in
isolation. `zizmor-action`'s `action.sh` looks the requested `version`
up in a digest table and runs the audit as
`ghcr.io/zizmorcore/zizmor:1.29.0@sha256:863026d54f91271b10b60b67ad8054cb37120167e162482597db102b3026a284`
— a genuine container digest pin, not just a version string.

## Exceptions

### `mcr.microsoft.com/appsvc/staticappsclient:stable` — cannot be pinned, and it builds what ships

`Azure/static-web-apps-deploy` is a three-line wrapper. Its
`action.yml` declares `runs: using: docker, image: "Dockerfile"`, and
that Dockerfile is, at every candidate commit, identical:

```dockerfile
FROM mcr.microsoft.com/appsvc/staticappsclient:stable
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]
```

Neither deploy workflow sets `skip_app_build`, and there is no
`staticwebapp.config.json` anywhere in the repo. Under those
conditions, `StaticSitesClient` runs Oryx **inside** this container,
and Oryx performs its own install and build of the production bundle
there. The floating image is not merely an upload step — it is the
build toolchain that produces the artifact that actually gets
deployed, and it does its own dependency resolution independent of
`package-lock.json`.

**Reachable from our side:** no. **Would require:** Microsoft
publishing digest-pinned image references, or IOU forking the action.
**Accepted risk,** reviewed when this document is next revised.

### The `@v1` ambiguity — resolved by evidence

`Azure/static-web-apps-deploy` publishes `v1` as both a tag (commit
`1a947af…`, 2021-03-03) and a branch 28 commits ahead (commit
`4d27395…`, 2024-09-11). Resolution of ambiguous refs is undocumented,
so the pinned digest was taken from a real Actions run log rather than
inferred.

This mattered specifically because of the two-environment split: acc
and production resolved the same ref independently at their own run
times, so a branch move between deploys could have sent different
action code to each from identical repository content, leaving no
trace in git history. The pin restores acc as a faithful rehearsal of
production.

It is also why this one dependency is exempted from Renovate in
`renovate.json`: Renovate's github-tags datasource resolves `v1` to
the 2021 tag, not the branch head actually pinned here, so an
automated digest update would silently revert the deploy step to
3.5-year-old code. The action has only ever published `v1`, so nothing
is lost by maintaining this pin by hand instead.

### `node-version: '20'` in the deploy workflows — floats across patch releases

Both Azure Static Web Apps workflows pass `actions/setup-node`
`node-version: '20'`, not an exact patch, and there is no `.nvmrc` and
no `engines` field anywhere pinning a runtime version. `setup-node`
therefore downloads whichever 20.x patch is current at run time.

**Reachable from our side:** yes, in principle — an exact patch or an
`.nvmrc` `setup-node` can read would close this. **Not done here:**
out of scope for a branch pinning pipeline _code_; picking and then
maintaining an exact Node version is a separate decision. **Accepted
as a known gap,** reviewed when this document is next revised.

### `iou-architectuur` — known gap, deliberately deferred

Out of scope by decision on 2026-08-26, recorded so the choice stays
deliberate rather than forgotten.

Its `requirements.txt` uses `>=` floors for five of six packages and
its workflow runs `pip install --upgrade pip`, so both the
dependencies and the installer float, with no lockfile or hash file.
It has looser dependency integrity than any repo currently in scope,
and it builds the documentation site the other repos link to.

**Fix, when taken up:** a `requirements.in` of intents compiled by
`pip-compile --generate-hashes` into a fully pinned `requirements.txt`,
installed with `pip install --require-hashes`, plus a pinned pip.

## For repos adopting this template

The `Supply-chain audit` workflow passes zizmor neither `inputs:` nor
`collect:`, so it audits the whole repository — workflows, action
definitions, Dependabot config — under the action's defaults, which is
wider than the `.github/workflows/` scope used for local baselines
while developing this pin. It makes no difference in `ttl-editor`,
which has no `action.yml` and no `dependabot.yml` anywhere, but a repo
that carries composite actions (as `linked-data-explorer` or
`ronl-business-api` may) will see CI audit files this register's local
baseline never touched. Re-run the local baseline against the whole
repo, not just `.github/workflows/`, before trusting a zero-findings
comparison.
