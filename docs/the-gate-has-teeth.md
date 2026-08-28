# The gate now has teeth

How `ttl-editor` enforces supply-chain pinning in CI — what it delivers, how it
is built, how it behaves day to day, and what it deliberately cannot do.

This repository is the **pilot** for IOU's extension of the pinning policy
beyond `github.com/ictu`. `linked-data-explorer` and `ronl-business-api` follow,
copying the same four artifacts. Read this before replicating it.

---

## 1. What problem this solves

IOU policy after a supply-chain incident: **nothing downloaded or executed by a
pipeline may float.** No `latest`, no empty versions — a hash, digest or verified
checksum wherever one exists.

`github.com/ictu` enforces this at the organisation level. These repos are not in
that organisation: they live under `github.com/sgort`, with GitLab
(`git.open-regels.nl`) as a code mirror. They inherit none of that enforcement, so
it is built **inside the repository**, where it travels with the code regardless of
which remote hosts it.

All CI/CD runs on GitHub Actions. GitLab hosts code only — there is no
`.gitlab-ci.yml`. The entire attack surface is the GitHub workflows.

### The concrete risk

A workflow step written `uses: some/action@v1` executes whatever code that tag
points at _today_. Whoever controls the tag controls your pipeline — including the
step holding your deployment token. `Azure/static-web-apps-deploy` illustrates the
problem exactly: it publishes `v1` as **both** a 2021 tag and a 2024 branch head,
3.5 years apart, so `@v1` was ambiguous _and_ partly mutable.

For a two-environment setup the consequence is sharper than it first appears. The
acceptance and production workflows resolve the same ref **independently, at their
own run times**. A ref moving between an acc deploy and the later production deploy
sends _different action code to each environment from identical repository
content_ — leaving no trace in git history. Acceptance silently stops being a
faithful rehearsal of production.

---

## 2. What it delivers

Four enforced properties, plus one honest ledger:

| Property                                                   | Enforced by                               |
| ---------------------------------------------------------- | ----------------------------------------- |
| Every action reference is an immutable commit digest       | zizmor `unpinned-uses`, policy `hash-pin` |
| No job carries more token scope than it needs              | zizmor `excessive-permissions`            |
| No git credential is left in the workspace for later steps | zizmor `artipacked`                       |
| Pins stay current instead of freezing                      | Renovate, under a 14-day cooldown         |
| What _cannot_ be pinned is written down                    | `SECURITY-PIPELINE.md`                    |

Measured result on adoption: **16 findings → 0**, verified at every intermediate
step.

| Stage                                     | unpinned-uses | excessive-permissions | artipacked | Total  |
| ----------------------------------------- | ------------- | --------------------- | ---------- | ------ |
| Before                                    | 8             | 6                     | 2          | **16** |
| After digest pins + `persist-credentials` | 4             | 6                     | 0          | **10** |
| After `permissions:` blocks               | 4             | 0                     | 0          | **4**  |
| After pinning the deploy action           | 0             | 0                     | 0          | **0**  |

---

## 3. How it is built

Five pieces. Four are files in this repo; the fifth is a GitHub setting.

### 3.1 `.github/zizmor.yml` — the policy

```yaml
rules:
  unpinned-uses:
    config:
      policies:
        '*': hash-pin
```

Requires a commit hash for **every** namespace, with no exemption for first-party
`actions/*`.

zizmor 1.29.0 already enforces this by default, so today this file changes no
findings. It is committed deliberately: the policy belongs in the repository rather
than in a tool default that a future release could quietly relax.

### 3.2 Pinned workflows

Every `uses:` is a 40-character commit SHA followed by a `# vX.Y.Z` comment. The
comment is **functional, not decorative** — Renovate parses it to know which version
a digest represents, and rewrites it on update.

| Action                         | Digest                                     | Version |
| ------------------------------ | ------------------------------------------ | ------- |
| `actions/checkout`             | `a37ce9120846195fa4ece8f58b268e6043cb2f26` | v3.7.0  |
| `actions/setup-node`           | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4.4.0  |
| `Azure/static-web-apps-deploy` | `4d27395796ac319302594769cfe812bd207490b1` | v1      |
| `zizmorcore/zizmor-action`     | `3dc1ecc9bcb9e94e9b2c709687979e1298497054` | v0.6.2  |

Pins were taken **at the then-current major, not upgraded**, so adopting the policy
was behaviour-preserving. Version upgrades are a separate, separately-reviewed
change — that separation is what let the first live run prove the _pinning_ worked,
without a simultaneous upgrade muddying the result.

Each workflow also declares least privilege:

```yaml
permissions:
  contents: read # workflow-level default
```

with `build_and_deploy_job` adding only `pull-requests: write` (the Static Web Apps
action posts PR comments), and `close_pull_request_job` taking `permissions: {}` —
it checks out nothing and receives only the Azure token.

`actions/checkout` sets `persist-credentials: false`. Before this, a live
`GITHUB_TOKEN` was written into `.git/config` and mounted into a closed-source
third-party container. That is a real hole closed, not a cosmetic lint fix.

### 3.3 `.github/workflows/zizmor.yml` — the gate

Runs on `pull_request` and `push` for `acc` and `main`. Job name: **`audit`**.

Three inputs are deliberate:

- **`version: '1.29.0'`** — the action's `version` input defaults to `latest`. A
  supply-chain gate that pulls an unpinned tool on every run would defeat itself.
  The action resolves this version through an internal digest table and runs
  `ghcr.io/zizmorcore/zizmor:1.29.0@sha256:863026d5…`, so this is a genuine
  container digest pin.
- **`advanced-security: false`** — the default `true` uploads SARIF and requires
  `security-events: write`. This job is `contents: read` only. It also means **fork
  PRs work**, since there is no upload step to fail.
- **`annotations: true`** — surfaces findings inline on the PR diff. Mutually
  exclusive with `advanced-security`; the action errors if both are true.

Do **not** set `token: ''`. See §6.

### 3.4 `renovate.json` — keeping pins alive

```json
{
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "minimumReleaseAge": "14 days",
  "internalChecksFilter": "strict",
  "vulnerabilityAlerts": { "minimumReleaseAge": null, "labels": ["security"] }
}
```

Each key earns its place:

- `helpers:pinGitHubActionDigests` — maintains digests _and_ rewrites the version
  comment to match.
- `minimumReleaseAge: "14 days"` — the cooldown, giving vendors and researchers time
  to find problems before we adopt. Visible on PRs as a `renovate/stability-days`
  check.
- `internalChecksFilter: "strict"` — suppresses the PR entirely until the age is
  genuinely met, rather than raising one that fails the check.
- `vulnerabilityAlerts` with `minimumReleaseAge: null` — the fast route for security
  advisories. **Without this override the cooldown would delay exactly the updates
  that must not wait.** This is the rule most cooldown policies omit, and its absence
  is why people disable such policies mid-incident.

There is also a `packageRules` entry disabling updates for
`Azure/static-web-apps-deploy`. This is not arbitrary: its `v1` is both a 2021 tag
and a 2024 branch head, the workflows pin the **branch**, and Renovate's
`github-tags` datasource resolves the **tag**. Without the guard, Renovate would open
a routine-looking "update digest" PR that silently reverts the production deploy
step to 3.5-year-old code — and the 14-day cooldown offers no protection, because the
target commit is years old.

### 3.5 The `acc` ruleset — what makes it _enforcement_

A workflow that runs but cannot block is advice. The ruleset is what converts it
into a gate.

Ruleset **`acc supply-chain gate`** (id `21728745`), target `refs/heads/acc`,
enforcement `active`:

- `required_status_checks` → context **`audit`**
- `pull_request` → `required_approving_review_count: 0`

Both rules are needed together. Requiring the check alone still lets a direct push
to `acc` bypass the gate entirely.

Approvals are `0` because the repository has a single maintainer and GitHub does not
permit self-approval — requiring `1` would make `acc` unmergeable. Raise it when a
second reviewer exists.

**There are no bypass actors.** The gate applies to everyone, including the owner,
including releases.

---

## 4. How it works, day to day

```
push to a feature branch          → nothing runs (workflows trigger on acc/main only)
open a PR against acc             → audit + Build and Deploy run
audit fails                       → merge blocked by the ruleset
audit passes                      → merge allowed
direct push to acc                → rejected: a PR is required
```

Renovate raises its update PRs against `acc` like any contributor, so **the bot's own
PRs are gated by the policy the bot maintains**. Observed on the first Renovate PRs:
`audit` passed in 11–13s alongside `renovate/stability-days` reporting _"Updates have
met minimum release age requirement."_

### Supporting GitHub settings

| Setting                           | State                     | Why                                                                                                                      |
| --------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Dependabot **alerts**             | enabled                   | Renovate's `vulnerabilityAlerts` rule consumes this feed. Without it, the no-cooldown security lane never fires.         |
| Dependabot **security updates**   | **disabled — keep it so** | It opens its own fix PRs, duplicating Renovate and bypassing the 14-day cooldown. Two bots racing on the same manifests. |
| Dependabot **version updates**    | not configured            | Renovate owns this.                                                                                                      |
| Secret scanning + push protection | enabled                   | Free on public repos, adjacent benefit.                                                                                  |

---

## 5. What this does **not** protect

Recorded fully in `SECURITY-PIPELINE.md`. Summarised here because a gate whose limits
are undocumented invites false confidence.

**The Static Web Apps container cannot be pinned.**
`Azure/static-web-apps-deploy` is a three-line wrapper whose `action.yml` declares
`runs: using: docker, image: "Dockerfile"`, and that Dockerfile is:

```dockerfile
FROM mcr.microsoft.com/appsvc/staticappsclient:stable
```

`skip_app_build` is not set, so Oryx runs **inside** that image and builds the
production bundle there. The floating image is therefore the **build toolchain that
produces the deployed artifact**, not merely an upload step. Pinning the action makes
the wrapper immutable and leaves the payload floating. Unreachable from our side.

**`npm ci` integrity covers what is tested, not what is shipped.**
`package-lock.json` (lockfileVersion 3) carries a `sha512` per package, and `npm ci`
verifies it — but that step feeds lint and the unit tests. Oryx performs its own
install inside the container to produce the deployed bytes.

**`node-version: '20'` floats** across all 20.x patches and is downloaded at run
time. There is no `.nvmrc` pinning CI.

**zizmor validates pin _format_, never pin _truth_.** A wrong or hostile digest with
a plausible `# v4.4.0` comment passes zizmor, Prettier and review alike. Nothing
currently re-checks that a digest resolves to the tag it claims.

**The register will drift.** Renovate updates workflow pins and never touches
`SECURITY-PIPELINE.md`. Nothing checks the two agree.

Those last two are the motivation for a planned `scripts/check-supply-chain.mjs`
preflight.

**Production is not yet covered.** GitHub Actions runs the workflow file _from the
branch being pushed_. `main` still carries the unpinned workflow until `acc` is
promoted.

---

## 6. Evidence it works — and a cautionary tale

The gate caught a real breakage on its first live run, and the failure is instructive.

During review, `token: ''` was added to the zizmor action as "optional hardening" —
the input defaults to `${{ github.token }}`, and zeroing it looked consistent with the
workflow's own least-privilege logic. Every local check passed: zizmor 0 findings,
Prettier clean, two independent reviews approved.

In CI it failed in 7 seconds:

```
error: invalid value '' for '--gh-token <GH_TOKEN>': GitHub token cannot be empty
```

The action passes the input as an **environment variable**, and zizmor's `--gh-token`
is env-backed through clap — which distinguishes _unset_ (fine) from _set-but-empty_
(rejected) at argument parsing, before any audit runs. `online-audits: false` does not
avoid it.

Three lessons worth keeping:

1. **The only change with no functional justification was the one that broke it.**
   Everything load-bearing — digests, permissions, `persist-credentials: false` —
   worked first time.
2. **It was invisible to local tooling by construction.** zizmor validates format,
   Prettier validates syntax; neither executes the action. Only a real run could
   surface it.
3. **Verify against a real pipeline before declaring done.** Static analysis proved
   the configuration was well-formed, not that it ran.

---

## 7. Replicating this in another repo

Copy these four, in this order:

1. `.github/zizmor.yml` — verbatim.
2. `renovate.json` — verbatim **except** the `packageRules` guard, which is specific
   to `Azure/static-web-apps-deploy`. Keep it only if that action is used.
3. `.github/workflows/zizmor.yml` — verbatim. Land it **after** the tree already reports
   zero findings, so the gate arrives green rather than red.
4. `SECURITY-PIPELINE.md` — as a template; its exceptions are repo-specific and must be
   re-derived, not copied.

Then, in order:

1. Pin the existing workflows and add `permissions:` blocks until `zizmor` reports 0.
2. Merge to the default branch **before** installing Renovate — it reads config only
   from the default branch, and installing first makes it onboard with defaults: no
   cooldown, no digest pinning, no guard.
3. Install Renovate, scoped to that repository only.
4. Enable Dependabot **alerts** only.
5. Create the ruleset with both `required_status_checks` and `pull_request`.

### Two traps

**Audit scope differs between local and CI.** The gate passes neither `inputs:` nor
`collect:`, so it audits the whole repository using action defaults — wider than the
`.github/workflows/` scope typically used for a local baseline. No difference in
`ttl-editor`, which has no composite actions or `dependabot.yml`. It will differ in a
repo that does.

**Releases must go through a PR.** Any release flow that lands on the protected branch
by `git checkout acc && git merge --ff-only` plus a direct push **will be blocked** —
a locally-created commit has never passed `audit`. This repo's `/bump-release` needs
exactly that change.

---

## References

- `SECURITY-PIPELINE.md` — the exceptions register
- `docs/superpowers/specs/2026-08-26-pipeline-pinning-design.md` — design and rejected alternatives
- `docs/superpowers/plans/2026-08-26-pipeline-pinning.md` — implementation plan with measured checkpoints
- [zizmor](https://github.com/zizmorcore/zizmor) · [Renovate](https://docs.renovatebot.com/)
