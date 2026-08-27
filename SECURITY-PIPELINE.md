# Pipeline supply-chain posture

Policy: nothing downloaded or executed by a pipeline may float. No
`latest`, no empty versions — a hash, digest or verified checksum
wherever one exists. Enforced in-repo by `.github/zizmor.yml` and the
`Supply-chain audit` workflow, and kept current by Renovate under a
14-day cooldown.

## Pinned

| Dependency                     | Pin                                                 | Version           |
| ------------------------------ | --------------------------------------------------- | ----------------- |
| `actions/checkout`             | `a37ce9120846195fa4ece8f58b268e6043cb2f26`          | v3.7.0            |
| `actions/setup-node`           | `49933ea5288caeca8642d1e84afbd3f7d6820020`          | v4.4.0            |
| `zizmorcore/zizmor-action`     | `3dc1ecc9bcb9e94e9b2c709687979e1298497054`          | v0.6.2            |
| `Azure/static-web-apps-deploy` | `4d27395796ac319302594769cfe812bd207490b1`          | v1                |
| zizmor (the audit tool itself) | `version: "1.29.0"` input, not `latest`             | 1.29.0            |
| npm dependencies               | `package-lock.json`, `sha512` integrity per package | lockfileVersion 3 |

The npm layer was already hash-pinned before this work: `npm ci`
verifies every package against its lockfile integrity hash. The
lockfile covers integrity; the Renovate cooldown covers intent —
a lockfile cannot tell you that a legitimately published version is
malicious.

## Exceptions

### `mcr.microsoft.com/appsvc/staticappsclient:stable` — cannot be pinned

`Azure/static-web-apps-deploy` is a three-line wrapper. Its
`action.yml` declares `runs: using: docker, image: "Dockerfile"`, and
that Dockerfile is, at every candidate commit, identical:

```dockerfile
FROM mcr.microsoft.com/appsvc/staticappsclient:stable
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]
```

All deploy logic lives in that container image, on a floating `stable`
tag, hardcoded inside a third-party action. Pinning the action makes
the wrapper immutable and leaves the payload floating.

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
