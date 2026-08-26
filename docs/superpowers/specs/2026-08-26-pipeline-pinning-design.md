# Supply-chain pinning for IOU pipelines

**Date:** 2026-08-26
**Status:** accepted for implementation planning; one value pending (see Open decisions)
**Pilot repo:** `ttl-editor`
**Rollout:** `ttl-editor` → `linked-data-explorer` → `ronl-business-api`

## Background

Following a supply-chain incident, IOU policy is being extended: nothing
downloaded or executed by a pipeline may float. No `latest`, no empty
versions — a hash, digest or verified checksum wherever one exists.

`github.com/ictu` already enforces hash-pinned GitHub Actions at the
organisation level. The IOU repos are not in that organisation — they live
under `github.com/sgort` with GitLab (`git.open-regels.nl`) as the
authoritative code host. The decision recorded here is to **enforce inside
each repository** rather than migrate, so the controls travel with the code
regardless of which remote hosts it.

All IOU CI/CD runs on GitHub Actions. GitLab hosts code only; `ttl-editor`
has no `.gitlab-ci.yml`. "Extend the policy to GitLab" is therefore vacuous
for these repos — the entire attack surface is the GitHub workflows.

## Goal

Everything a pipeline downloads and executes is immutable by digest,
least-privileged, and continuously updatable under a review cooldown.

## Current state (`ttl-editor`)

Two workflows, structurally identical, differing only in target branch,
Azure token and backend URL:

| Workflow                                           | Trigger           | Environment |
| -------------------------------------------------- | ----------------- | ----------- |
| `azure-static-web-apps-orange-beach-0574c2a03.yml` | push/PR on `acc`  | acceptance  |
| `azure-static-web-apps-white-sky-02b674303.yml`    | push/PR on `main` | production  |

Six `uses:` references, none pinned. No `permissions:` block anywhere, so
every job inherits the default `GITHUB_TOKEN` scope. Triggers are
`pull_request`, not `pull_request_target` — the dangerous variant is absent.

`package-lock.json` is lockfileVersion 3, carrying a `sha512` integrity hash
per package. **The npm layer is already hash-pinned**; `npm ci` verifies it.
This is worth stating explicitly so the work is not redone: the lockfile is
npm's digest mechanism. What it cannot defend against is a legitimately
published malicious version — which is what the cooldown addresses. Lockfile
covers integrity; cooldown covers intent.

## Approach

Three approaches were considered.

**A. Pin in place at current majors, upgrade separately.** — chosen
`checkout@v3` becomes the digest `v3` resolves to today; `setup-node@v4`
likewise. Runtime behaviour is identical to today's; the change is purely
"the same code, now immutable". Major upgrades arrive later as reviewed
Renovate PRs under the cooldown.

**B. Pin and upgrade to latest majors together.** — rejected
Fewer PRs, and it would get us off a 2022-era `checkout` (v7 is current).
But it couples "make immutable" with "change runner behaviour across four
major versions"; a broken acc deploy would be undiagnosable between the two.
The pilot's job is to prove the pattern, not to modernise.

**C. Fork the actions into an IOU-owned namespace.** — rejected
Maximum control, immune to upstream ref moves, but disproportionate for three
repos and four distinct actions, and it relocates the trust problem rather
than solving it.

## Components

Five units, each independently reviewable and revertable.

### 1. Digest pins

Six `uses:` refs become `owner/repo@<40-char-sha> # vX.Y.Z`. The trailing
comment is functional, not decorative: Renovate reads and rewrites it, and it
keeps the diff legible to a human reviewer.

| Current                                | Pin to                                     | Version |
| -------------------------------------- | ------------------------------------------ | ------- |
| `actions/checkout@v3`                  | `a37ce9120846195fa4ece8f58b268e6043cb2f26` | v3.7.0  |
| `actions/setup-node@v4`                | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4.4.0  |
| `Azure/static-web-apps-deploy@v1` (×2) | _pending — see Open decisions_             | v1      |

Digests resolved live against the GitHub API on 2026-08-26.

### 2. Least-privilege permissions

- Workflow level: `permissions: contents: read`
- `build_and_deploy_job` adds `pull-requests: write` — the SWA action is
  given `repo_token` specifically to comment on PRs and fails without it
- `close_pull_request_job` needs neither; it receives only the Azure token

This is the larger blast-radius reduction of the two. An unpinned action is
dangerous _because_ of the token scope it inherits.

### 3. Renovate configuration

`renovate.json`, driven by the Mend-hosted GitHub App. Installing the app on
the `sgort` account is a manual prerequisite.

- `helpers:pinGitHubActionDigests` — maintains pins and keeps the version
  comment accurate
- `minimumReleaseAge: "14 days"` with `internalChecksFilter: "strict"` —
  the cooldown, applied to Actions and npm alike
- a `vulnerabilityAlerts` rule setting `minimumReleaseAge` to null — the
  fast route for advisories, which the cooldown would otherwise block

The third rule is the one most cooldown policies omit, and it is the
difference between a policy people follow and one they disable mid-incident.

### 4. zizmor gate

A workflow running zizmor on pull requests, blocking. Its own `uses:` refs
are digest-pinned — a security gate on a floating tag defeats itself.

Expected findings and dispositions:

| Finding                                          | Disposition                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `unpinned-uses`                                  | fixed by component 1                                                                                   |
| `excessive-permissions`                          | fixed by component 2                                                                                   |
| `artipacked` (checkout persists git credentials) | likely; fix with `persist-credentials: false`, subject to confirming the SWA action does not need them |
| unpinned container image                         | cannot fix — see component 5                                                                           |

### 5. Exceptions register

`SECURITY-PIPELINE.md` recording what is pinned, what cannot be, and why.

The primary entry, verified at source on 2026-08-26. `action.yml` at both
candidate commits of `Azure/static-web-apps-deploy` declares
`runs: using: docker, image: "Dockerfile"`, and that Dockerfile is, at both
commits, byte-identical:

```dockerfile
FROM mcr.microsoft.com/appsvc/staticappsclient:stable
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]
```

The action is a three-line wrapper; all deploy logic lives in a container
image on a floating `:stable` tag, hardcoded inside a third-party action and
unreachable from our side. Pinning the action makes the wrapper immutable and
leaves the payload floating.

This must be stated plainly rather than glossed. A register that claims total
coverage produces a permanent unfixable finding at the first audit, and the
predictable response is to weaken the gate. The register is what allows the
gate to stay strict honestly.

Second entry: **`iou-architectuur` is a known, deliberately deferred gap.**
Its `requirements.txt` uses `>=` floors for five of six packages and its
workflow runs `pip install --upgrade pip`, so both the dependencies and the
installer float, with no lockfile or hash file. It has looser integrity than
any repo in this plan. Scoped out by decision on 2026-08-26; recorded so the
choice is deliberate rather than forgotten. The fix, when taken up, is
`requirements.in` compiled by `pip-compile --generate-hashes` and installed
with `pip install --require-hashes`.

## The `@v1` ambiguity

`uses: owner/repo@ref` accepts a branch, a tag or a SHA, and GitHub does not
require those namespaces to be distinct. `Azure/static-web-apps-deploy` has
both:

| Ref         | Commit     | Date       |
| ----------- | ---------- | ---------- |
| tag `v1`    | `1a947af…` | 2021-03-03 |
| branch `v1` | `4d27395…` | 2024-09-11 |

Branch `v1` is 28 commits ahead of the tag and 0 behind: one fast-forward
line, tag cut in 2021 and never moved. `@v1` names both, and resolution of
ambiguous refs is undocumented.

The practical risk is bounded. Both wrappers delegate to the same floating
image, and both workflows use only inputs present in both versions
(`action`, `azure_static_web_apps_api_token`, `repo_token`, `app_location`,
`api_location`, `output_location`). The 28 commits added seven inputs we do
not use. Either commit would work today.

**The argument that does bite is the acc/main split.** Both workflows resolve
the same ref independently, at their own run times. If branch `v1` moves
between an acc deploy and the later production deploy, the two environments
run different action code from identical repository content — and the
difference leaves no trace in git history. Acceptance stops being a faithful
rehearsal of production. A shared digest pin across both workflows restores
that guarantee: the same bytes reach both environments, and any change to
them becomes a reviewable diff.

## Order of operations

1. Components 1 and 2 land together — one commit, one behavioural surface.
2. Verify green (see below).
3. Component 4 lands against a passing tree, so the gate is introduced to a
   clean repo rather than a failing one.
4. Components 3 and 5 are inert configuration and may land alongside either.

## Verification

The workflows trigger only on `acc` and `main`, so a feature-branch push runs
nothing. The real test is a pull request **targeting `acc`**, which fires
`build_and_deploy_job` and produces a Static Web Apps preview deployment.

Locally verifiable: `npm run lint`, `npm run test:ci`, YAML validity.
Not locally verifiable: the pipeline itself. Confirmation that the Actions
run succeeds and the preview URL serves is a human step.

Rollback is a single revert of the commit.

## Open decisions

**The `Azure/static-web-apps-deploy` digest.** Two candidate commits, 3.5
years apart, on the step holding the deploy token. Resolvable exactly, not by
inference: any recent Actions run log contains

```
Download action repository 'Azure/static-web-apps-deploy@v1' (SHA:xxxxxxxx…)
```

That SHA is authoritative. The table entry above is left blank rather than
filled speculatively.

## Rollout notes

- `linked-data-explorer` (6 workflows) and `iou-architectuur` are on disk but
  outside the assistant's approved working directories; they must be added
  before being edited.
- `ronl-business-api` local is stale — 6 workflow files locally against 9 on
  GitHub (`pa-demo-acc`, `pa-demo-prod`, `pa-demo-drift` absent locally). It
  must be synced before work begins there.
- Seventeen workflows across the three in-scope repos, four distinct actions.
  The pilot's deliverable is as much the reusable `renovate.json`, zizmor
  config and register template as the pinned YAML.
