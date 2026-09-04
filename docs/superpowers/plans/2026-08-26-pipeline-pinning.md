# Supply-Chain Pipeline Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make everything `ttl-editor`'s pipelines download and execute immutable by digest and least-privileged, enforced by a blocking zizmor gate and kept current by Renovate under a 14-day cooldown.

**Architecture:** zizmor is both the specification and the test harness. Task 1 establishes a measured baseline of 16 failing findings and commits the policy that produces them; each subsequent task drives a named subset to zero. The CI gate lands last, against an already-clean tree, so it never enters the repo red.

**Tech Stack:** GitHub Actions (YAML), zizmor 1.29.0 via `uvx`, Renovate (Mend-hosted GitHub App), Prettier 3.

**Spec:** `docs/superpowers/specs/2026-08-26-pipeline-pinning-design.md`

## Global Constraints

- **Ask before every commit.** `CLAUDE.md` requires explicit approval for each `git commit`, every time. Steps below that say "Commit" mean: stage the files, report exactly what is staged, then **stop and ask**. Never fold a commit into the same turn as the work.
- **No Claude attribution trailers** in commit messages (`Co-Authored-By:`, `Claude-Session:`). End with the substantive body.
- **Work on branch `chore/supply-chain-pinning`.** Never commit directly to `acc`.
- **Never start, stop or restart dev servers.** Not applicable to most of this plan, but binding if a task tempts it.
- **Every `uses:` gets a 40-character commit SHA plus a `# vX.Y.Z` trailing comment.** The comment is functional — Renovate reads and rewrites it.
- **Verification command** (identical at every checkpoint):
  `uvx zizmor@1.29.0 --no-online-audits .github/workflows/`
  zizmor auto-discovers `.github/zizmor.yml`; no `--config` flag is needed once Task 1 lands.
- **Digests already resolved** (GitHub API, 2026-08-26) — use verbatim, do not re-derive:
  - `actions/checkout` v3.7.0 → `a37ce9120846195fa4ece8f58b268e6043cb2f26`
  - `actions/setup-node` v4.4.0 → `49933ea5288caeca8642d1e84afbd3f7d6820020`
  - `zizmorcore/zizmor-action` v0.6.2 → `3dc1ecc9bcb9e94e9b2c709687979e1298497054`
  - `Azure/static-web-apps-deploy` v1 → `4d27395796ac319302594769cfe812bd207490b1`
- **Pin zizmor itself to 1.29.0**, locally and in CI. The `zizmor-action` `version` input defaults to `latest`; a supply-chain gate that pulls an unpinned tool is self-defeating, and a version drift would change the finding counts this plan is measured against. All counts below were verified against 1.29.0 on 2026-08-26.
- **Pin in place, do not upgrade.** `checkout` v7 and `setup-node` v7 exist. Pinning at the current major (v3.7.0 / v4.4.0) is deliberate per spec approach A; major upgrades arrive later as reviewed Renovate PRs. Do not "helpfully" bump them.
- **Two workflow files, structurally identical.** Every workflow edit below applies to **both**:
  - `.github/workflows/azure-static-web-apps-orange-beach-0574c2a03.yml` (acc)
  - `.github/workflows/azure-static-web-apps-white-sky-02b674303.yml` (main)
- **Pre-commit hooks will not format these files.** `lint-staged` is scoped to `src/**` and `package.json` only, so nothing under `.github/` or `docs/` is touched automatically. Run Prettier explicitly where the plan says to.

## Finding Budget

Each task drives the total down. **Every row below was measured**, not estimated: on 2026-08-26 the plan's target state and both intermediate states were reconstructed in a temporary directory and audited with zizmor 1.29.0. The end state reports `No findings to report`, with the new gate workflow auditing itself.

| After task        | unpinned-uses | excessive-permissions | artipacked | Total  |
| ----------------- | ------------- | --------------------- | ---------- | ------ |
| Task 1 (baseline) | 8             | 6                     | 2          | **16** |
| Task 2            | 4             | 6                     | 0          | **10** |
| Task 3            | 4             | 0                     | 0          | **4**  |
| Task 4            | 0             | 0                     | 0          | **0**  |
| Task 5            | 0             | 0                     | 0          | **0**  |

If a checkpoint reports a different number, **stop** — something diverged from the plan. Do not proceed to the next task.

---

### Task 1: zizmor configuration and red baseline

Establishes the harness and makes the policy explicit in-repo.

**A note on what this config does and does not do.** zizmor 1.11.0 exempted first-party `actions/*` from hash-pinning; 1.29.0 does not, and already reports all 8 `unpinned-uses` under its default policy. So on the pinned version this config **changes no counts today** — verified, both default and strict report 16.

It is still worth committing, for two reasons: it states IOU policy in the repository rather than depending on a tool default, and it prevents a future zizmor release from silently relaxing enforcement. Do not expect the numbers to move in this task; the baseline it establishes is what Tasks 2-4 drive to zero.

**Files:**

- Create: `.github/zizmor.yml`

**Interfaces:**

- Consumes: nothing.
- Produces: `.github/zizmor.yml`, auto-discovered by every later `uvx zizmor` invocation. All later tasks' expected finding counts depend on this file existing.

- [ ] **Step 1: Capture the pre-config baseline**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **16 findings** — 8 `unpinned-uses`, 6 `excessive-permissions`, 2 `artipacked`. All three action references are flagged, `actions/*` included.

If you see 12 findings instead, you are running a zizmor older than ~1.20 with the first-party exemption still in place. Stop and pin the version correctly before continuing, or every count in this plan will be wrong.

- [ ] **Step 2: Write the strict policy config**

Create `.github/zizmor.yml`:

```yaml
# IOU supply-chain policy: every action reference must be a commit hash,
# with no exemption for first-party actions/*.
#
# zizmor 1.29.0 enforces this by default, so this file changes no findings
# today. It is committed deliberately: the policy belongs in the repository
# rather than in a tool default that a future release could relax.
rules:
  unpinned-uses:
    config:
      policies:
        '*': hash-pin
```

- [ ] **Step 3: Confirm the config parses and the baseline is unchanged**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **16 findings**, identical to Step 1 — 8 `unpinned-uses`, 6 `excessive-permissions`, 2 `artipacked`.

This step verifies the config is _valid_, not that it changed anything. A malformed config makes zizmor error out rather than silently ignore the file, so an unchanged 16 is the pass condition. Any error message means the YAML is wrong.

- [ ] **Step 4: Verify formatting**

Run:

```bash
npx --no-install prettier --check .github/zizmor.yml
```

Expected: `All matched files use Prettier code style!` If it warns, run with `--write` and re-check.

- [ ] **Step 5: Stage, report, and ask for commit approval**

```bash
git add .github/zizmor.yml
git status --short
```

Then stop and ask. Proposed message:

```
ci: add explicit zizmor hash-pin policy

States IOU policy in the repository: every action reference must be a
commit hash, with no exemption for first-party actions/*.

zizmor 1.29.0 already enforces this by default, so the file changes no
findings today. It is committed so enforcement does not depend on a
tool default that a future release could relax.

Establishes the 16-finding baseline that the following commits drive
to zero.
```

---

### Task 2: Pin first-party actions and stop credential persistence

Closes 4 `unpinned-uses` and both `artipacked` findings. `artipacked` fires because `actions/checkout` leaves a credential in `.git/config` for later steps to read. The SWA action authenticates with the explicitly-passed `azure_static_web_apps_api_token` and `repo_token`, not with the git credential, so disabling persistence is safe — Step 5 verifies this against the real pipeline.

**Files:**

- Modify: `.github/workflows/azure-static-web-apps-orange-beach-0574c2a03.yml:18-30`
- Modify: `.github/workflows/azure-static-web-apps-white-sky-02b674303.yml:18-30`

**Interfaces:**

- Consumes: `.github/zizmor.yml` from Task 1.
- Produces: pinned `checkout` and `setup-node` steps. Task 5's new workflow reuses the identical `checkout` pin string.

- [ ] **Step 1: Replace the checkout and setup-node steps in BOTH workflow files**

Find this block (identical in both files, lines 18-30):

```yaml
- uses: actions/checkout@v3
  with:
    submodules: true
    lfs: false
```

Replace with:

```yaml
- uses: actions/checkout@a37ce9120846195fa4ece8f58b268e6043cb2f26 # v3.7.0
  with:
    submodules: true
    lfs: false
    persist-credentials: false
```

Then find (identical in both files):

```yaml
uses: actions/setup-node@v4
```

Replace with:

```yaml
uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
```

Leave the surrounding comment block, `node-version: '20'` and `cache: 'npm'` untouched.

- [ ] **Step 2: Run zizmor to confirm the expected drop**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **10 findings** — 4 `unpinned-uses` (only `Azure/static-web-apps-deploy@v1`, twice per file), 6 `excessive-permissions`, 0 `artipacked`.

- [ ] **Step 3: Confirm no other reference to the old refs survives**

Run:

```bash
grep -rn "actions/checkout@v3\|actions/setup-node@v4$" .github/workflows/
```

Expected: no output.

- [ ] **Step 4: Verify formatting**

Run:

```bash
npx --no-install prettier --check ".github/workflows/*.yml"
```

Expected: clean. If it warns, `--write` then re-check.

- [ ] **Step 5: Stage, report, and ask for commit approval**

```bash
git add .github/workflows/
git status --short
```

Then stop and ask. Flag to the user that `persist-credentials: false` is the one behavioural change in this task and is confirmed only by a real pipeline run (Task 6). Proposed message:

```
ci: pin first-party actions to digests and stop credential persistence

Pins actions/checkout to v3.7.0 and actions/setup-node to v4.4.0 by
commit SHA, at the current major rather than upgrading, so the change
is behaviour-preserving. Adds persist-credentials: false, which
resolves zizmor's artipacked finding; the Static Web Apps action
authenticates with explicitly-passed tokens, not the git credential.

zizmor: 16 findings down to 10.
```

---

### Task 3: Least-privilege token permissions

Closes all 6 `excessive-permissions` findings. No workflow currently declares `permissions:`, so every job inherits the repository default `GITHUB_TOKEN` scope. This is the larger blast-radius reduction of the whole plan — an unpinned action is dangerous _because_ of the token it inherits.

**Files:**

- Modify: `.github/workflows/azure-static-web-apps-orange-beach-0574c2a03.yml`
- Modify: `.github/workflows/azure-static-web-apps-white-sky-02b674303.yml`

**Interfaces:**

- Consumes: `.github/zizmor.yml` from Task 1.
- Produces: `permissions:` blocks at workflow and job level. Task 5's new workflow follows the same shape.

- [ ] **Step 1: Add the workflow-level default to BOTH files**

Insert a `permissions:` block between the `on:` block and `jobs:`. In the acc file the `on:` block ends at line 10 with `      - acc`; in the main file at line 10 with `      - main`. After that line and its blank line, before `jobs:`, insert:

```yaml
# Default to read-only; jobs opt into more only where required.
permissions:
  contents: read
```

- [ ] **Step 2: Give the deploy job the one extra scope it needs**

The SWA action receives `repo_token` specifically to comment on pull requests, and fails without write access to them. In BOTH files, find:

```yaml
build_and_deploy_job:
  if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
  runs-on: ubuntu-latest
```

Insert a `permissions:` block directly after the `if:` line, so it reads:

```yaml
build_and_deploy_job:
  if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
  permissions:
    contents: read
    pull-requests: write
  runs-on: ubuntu-latest
```

- [ ] **Step 3: Give the close job no token at all**

This job checks out nothing and receives no `repo_token` — only the Azure token, which is a secret rather than a GitHub-scoped credential. In BOTH files, find:

```yaml
close_pull_request_job:
  if: github.event_name == 'pull_request' && github.event.action == 'closed'
  runs-on: ubuntu-latest
```

Insert an empty permissions block after the `if:` line:

```yaml
close_pull_request_job:
  if: github.event_name == 'pull_request' && github.event.action == 'closed'
  permissions: {}
  runs-on: ubuntu-latest
```

- [ ] **Step 4: Run zizmor to confirm the expected drop**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **4 findings** — 4 `unpinned-uses`, 0 `excessive-permissions`, 0 `artipacked`. Only the Azure action remains, which Task 4 resolves.

- [ ] **Step 5: Verify formatting**

Run:

```bash
npx --no-install prettier --check ".github/workflows/*.yml"
```

Expected: clean. If it warns, `--write` then re-check.

- [ ] **Step 6: Stage, report, and ask for commit approval**

```bash
git add .github/workflows/
git status --short
```

Then stop and ask. Proposed message:

```
ci: scope GITHUB_TOKEN to least privilege

No workflow declared permissions:, so every job inherited the default
repository token scope. Workflows now default to contents: read.
build_and_deploy_job adds pull-requests: write, which the Static Web
Apps action needs to comment on PRs. close_pull_request_job takes an
empty block: it checks out nothing and receives only the Azure token.

zizmor: 10 findings down to 4.
```

---

### Task 4: Pin the Azure Static Web Apps action

Closes the final 4 `unpinned-uses`. `Azure/static-web-apps-deploy` publishes `v1` as both a tag (commit `1a947af…`, 2021-03-03) and a branch 28 commits ahead (commit `4d27395…`, 2024-09-11). Resolution of ambiguous refs is undocumented, and this is the step holding the deploy token — so the choice was settled by evidence rather than inference.

**Resolved 2026-08-27: pin the branch commit `4d27395796ac319302594769cfe812bd207490b1`.** The entire executed surface is byte-identical at both commits — `action.yml`'s `runs:` block, the `Dockerfile`, and `entrypoint.sh` (`cd /bin/staticsites/ && ./StaticSitesClient $INPUT_ACTION`). The 28 commits added input _declarations_ and repo scaffolding, not behaviour. On top of that: GitHub's own API resolves the ambiguous `v1` to the branch commit, and the branch version declares a strict superset of inputs, so pinning to it can only remove "unexpected input" warnings, never introduce them.

**Files:**

- Modify: `.github/workflows/azure-static-web-apps-orange-beach-0574c2a03.yml:41,62`
- Modify: `.github/workflows/azure-static-web-apps-white-sky-02b674303.yml:41,62`

**Interfaces:**

- Consumes: `.github/zizmor.yml` from Task 1.
- Produces: a fully pinned workflow pair, and the digest value that Task 7's exceptions register cites.

- [ ] **Step 1: Replace all four references**

In BOTH files replace both occurrences of:

```yaml
uses: Azure/static-web-apps-deploy@v1
```

with:

```yaml
uses: Azure/static-web-apps-deploy@4d27395796ac319302594769cfe812bd207490b1 # v1
```

The comment is `# v1` rather than a semver triple because this action has only ever published `v1` — there is no patch tag to name.

- [ ] **Step 2: Confirm no floating reference survives**

Run:

```bash
grep -rn "static-web-apps-deploy@v1" .github/workflows/
```

Expected: no output.

- [ ] **Step 3: Run zizmor to confirm a clean tree**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **0 findings.**

- [ ] **Step 4: Verify formatting**

Run:

```bash
npx --no-install prettier --check ".github/workflows/*.yml"
```

Expected: clean.

- [ ] **Step 5: Stage, report, and ask for commit approval**

```bash
git add .github/workflows/
git status --short
```

Then stop and ask. Proposed message:

```
ci: pin Azure/static-web-apps-deploy to a digest

The v1 ref exists as both a tag (2021) and a branch 28 commits ahead
(2024), so @v1 was ambiguous and partly mutable. Both workflows now
pin the digest the runner actually resolves, taken from a real Actions
run log rather than inferred.

This is what makes acc a faithful rehearsal of production: previously
the two environments resolved the same ref independently at their own
run times, so a branch move between deploys could send different
action code to each from identical repository content, leaving no
trace in git history.

zizmor: 4 findings down to 0.
```

---

### Task 5: The blocking zizmor gate

Lands the gate against an already-clean tree, so it is green on introduction. The gate's own action references are pinned and its token scoped — a security gate on a floating tag defeats itself.

**Files:**

- Create: `.github/workflows/zizmor.yml`

**Interfaces:**

- Consumes: `.github/zizmor.yml` from Task 1; a 0-finding tree from Task 4.
- Produces: a required status check named `Supply-chain audit`.

- [ ] **Step 1: Create the gate workflow**

Create `.github/workflows/zizmor.yml`:

```yaml
name: Supply-chain audit

on:
  pull_request:
    branches:
      - acc
      - main
  push:
    branches:
      - acc
      - main

# Read-only: the audit inspects the tree and needs nothing else.
permissions:
  contents: read

jobs:
  zizmor:
    name: Supply-chain audit
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@a37ce9120846195fa4ece8f58b268e6043cb2f26 # v3.7.0
        with:
          persist-credentials: false
      - name: Run zizmor
        uses: zizmorcore/zizmor-action@3dc1ecc9bcb9e94e9b2c709687979e1298497054 # v0.6.2
        with:
          # The action's `version` input defaults to "latest". Pinning it is
          # the whole point of this exercise — and it keeps CI's findings
          # identical to the local baseline this plan was measured against.
          version: '1.29.0'
          # advanced-security uploads SARIF, which needs security-events:
          # write. This job is contents: read only, so it must be false.
          advanced-security: false
          annotations: true
          online-audits: false
```

Three inputs, each deliberate:

- **`version: "1.29.0"`** — the action defaults to `latest`. Leaving it would mean a supply-chain gate that pulls an unpinned tool on every run, and would let a zizmor release change the pass/fail outcome without any change to this repository.
- **`advanced-security: false`** — the default `true` uploads SARIF to the security tab, requiring `security-events: write`. Granting that would contradict Task 3's least-privilege work for a feature we are not using.
- **`annotations: true`** — mutually exclusive with `advanced-security`, and surfaces findings inline on the PR diff, which is where a reviewer will actually look.

`checkout` is pinned to v3.7.0 for consistency with the two deploy workflows, so Renovate proposes a single coordinated upgrade across all three rather than leaving the repo on mixed majors.

- [ ] **Step 2: Run zizmor over the expanded workflow directory**

The gate must not introduce findings of its own — it now audits itself.

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
```

Expected: **0 findings**, now across three files rather than two.

- [ ] **Step 3: Verify formatting**

Run:

```bash
npx --no-install prettier --check ".github/workflows/*.yml"
```

Expected: clean. If it warns, `--write` then re-check.

- [ ] **Step 4: Stage, report, and ask for commit approval**

```bash
git add .github/workflows/zizmor.yml
git status --short
```

Then stop and ask. Also tell the user that making this a **required** status check is a repository setting they must apply in GitHub's branch-protection UI — the workflow alone does not block merges. Proposed message:

```
ci: add blocking zizmor supply-chain audit

Runs zizmor on PRs and pushes to acc and main, enforcing the strict
hash-pin policy added earlier. Introduced only after the tree reached
zero findings, so the gate is green on arrival rather than landing red.

Its own references are pinned and its token is read-only; a security
gate on a floating tag would defeat itself.
```

---

### Task 6: Renovate configuration

Pinned digests rot without an updater. This is the counterpart that makes pinning sustainable rather than a one-off freeze.

**Files:**

- Create: `renovate.json`

**Interfaces:**

- Consumes: the `# vX.Y.Z` comments written in Tasks 2, 4 and 5 — Renovate parses them to know which version a digest represents.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Create the Renovate config**

Create `renovate.json` at the repository root:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "minimumReleaseAge": "14 days",
  "internalChecksFilter": "strict",
  "vulnerabilityAlerts": {
    "minimumReleaseAge": null,
    "labels": ["security"]
  }
}
```

Each key earns its place:

- `helpers:pinGitHubActionDigests` — keeps pins current and rewrites the `# vX.Y.Z` comment to match.
- `minimumReleaseAge: "14 days"` — the cooldown, giving vendors and researchers time to find problems before we adopt.
- `internalChecksFilter: "strict"` — without it, Renovate may still raise a PR that fails the cooldown; strict suppresses it until the age is genuinely met.
- `vulnerabilityAlerts` with `minimumReleaseAge: null` — the fast route for advisories. Without this override the cooldown would delay exactly the updates that must not wait. This is the rule most cooldown policies omit, and its absence is why people disable such policies mid-incident.

- [ ] **Step 2: Verify it is valid JSON and Prettier-clean**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('renovate.json','utf8')); console.log('valid JSON')"
npx --no-install prettier --check renovate.json
```

Expected: `valid JSON`, then a clean Prettier report. If Prettier warns, `--write` then re-check.

- [ ] **Step 3: Stage, report, and ask for commit approval**

```bash
git add renovate.json
git status --short
```

Then stop and ask. Tell the user that **installing the Mend-hosted Renovate GitHub App on the `sgort` account is a manual prerequisite** — the config is inert until then, and no agent can perform that install. Proposed message:

```
chore: add Renovate config with a 14-day cooldown

Pinned digests rot without an updater. Renovate maintains them and
keeps the version comments accurate, under a 14-day cooldown that
gives vendors and researchers time to find problems before adoption.

Security advisories bypass the cooldown via a vulnerabilityAlerts
override, so the policy does not delay the updates that must not wait.

Requires the Renovate GitHub App to be installed on the account; the
config is inert until then.
```

---

### Task 7: Exceptions register

Records what is pinned, what cannot be, and why. Without it the first audit produces a permanent unfixable finding, and the predictable response is to weaken the gate. The register is what lets the gate stay strict honestly.

**Files:**

- Create: `SECURITY-PIPELINE.md`

**Interfaces:**

- Consumes: the digest values from Tasks 2, 4 and 5.
- Produces: the template the rollout copies to `linked-data-explorer` and `ronl-business-api`.

- [ ] **Step 1: Create the register**

Create `SECURITY-PIPELINE.md` at the repository root.

````markdown
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
````

- [ ] **Step 2: Verify formatting**

Run:

```bash
npx --no-install prettier --check SECURITY-PIPELINE.md
```

Expected: clean. If it warns, `--write` then re-check.

- [ ] **Step 3: Stage, report, and ask for commit approval**

```bash
git add SECURITY-PIPELINE.md
git status --short
```

Then stop and ask. Proposed message:

```
docs: add pipeline supply-chain exceptions register

Records what is pinned, what cannot be, and why. The primary exception
is verified at source: Azure/static-web-apps-deploy delegates to
mcr.microsoft.com/appsvc/staticappsclient:stable, so pinning the action
makes the wrapper immutable and leaves the payload floating.

Without this register the first audit produces a permanent unfixable
finding, and the predictable response is to weaken the gate. Also
records iou-architectuur as a deliberately deferred gap.
```

---

### Task 8: Pipeline verification — human step

Nothing so far has exercised the real pipeline. Local zizmor proves the policy; only a run proves the deploy still works.

**Files:** none.

**Interfaces:**

- Consumes: every preceding task.
- Produces: the go/no-go for merging to `acc`.

- [ ] **Step 1: Confirm the full local check passes**

Run:

```bash
uvx zizmor@1.29.0 --no-online-audits .github/workflows/
npx --no-install prettier --check ".github/workflows/*.yml" renovate.json SECURITY-PIPELINE.md .github/zizmor.yml
```

Expected: 0 findings, and a clean Prettier report.

- [ ] **Step 2: Push the branch and ask the user to open a PR against `acc`**

The deploy workflows trigger only on `acc` and `main`, so a feature-branch push runs nothing. A pull request **targeting `acc`** fires `build_and_deploy_job` and produces a Static Web Apps preview deployment.

Ask the user to open the PR, then confirm:

- the `Supply-chain audit` check passes
- `build_and_deploy_job` succeeds — in particular the `Build And Deploy` step, which exercises `persist-credentials: false` and the new token scopes
- the preview URL serves the application

Do not attempt to verify the frontend by driving a browser. Ask the user to look at it — per `CLAUDE.md`, they have the app running and can confirm far faster than a headless setup here.

- [ ] **Step 3: On failure, diagnose before changing anything**

The two behavioural changes in this plan, in order of likelihood:

1. **`persist-credentials: false`** — if the SWA action fails fetching git metadata, revert that one line and re-run; `artipacked` returns as an accepted finding pending investigation.
2. **`permissions:`** — if PR commenting fails, `build_and_deploy_job` needs a scope beyond `pull-requests: write`; read the actual error rather than broadening to `write-all`.

If the Azure pin is wrong, the step fails immediately at action download. Re-read the run log for the resolved SHA.

- [ ] **Step 4: Report the outcome**

State plainly whether the run passed, with the evidence. If any step was skipped or a task left blocked, say so explicitly rather than reporting the plan as complete.

---

## Rollout beyond this repo

Out of scope for this plan; recorded so the pilot's deliverable is understood.

`ttl-editor` (2 workflows) → `linked-data-explorer` (6) → `ronl-business-api` (9). Seventeen workflows, four distinct actions.

- `linked-data-explorer` is on disk but outside the assistant's approved working directories; it must be added before being edited.
- `ronl-business-api` local is stale — 6 workflow files locally against 9 on GitHub (`pa-demo-acc`, `pa-demo-prod`, `pa-demo-drift` absent locally). Sync before starting.
- The reusable artefacts are `.github/zizmor.yml`, `.github/workflows/zizmor.yml`, `renovate.json` and the `SECURITY-PIPELINE.md` template — not the pinned deploy YAML, which differs per repo.
