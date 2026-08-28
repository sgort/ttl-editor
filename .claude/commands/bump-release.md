# bump-release

Cut a release: flip the current Upcoming changelog entry to Released, bump
`package.json`'s version to match, and land the result on `acc`.

This is the same skill used in `ronl-business-api`, adapted for a
single-package repo: no monorepo scope dimension (there's only one
`package.json`), no backend endpoint map to reconcile, and the changelog
lives in `src/data/changelog.json` (plain JSON) rather than a typed
`changelog-data.ts`. New entries use the same per-commit shape as
`ronl-business-api`/Linked Data Explorer (`"format": "commits"`); the
pre-existing `"sections"`-based entries are legacy and are never authored
fresh — `ChangelogTab.jsx` renders both, branching on the `format` field.

## Versioning: CalVer `YYYY.MM.patch`

Released versions use CalVer, not SemVer — matching the Norm Editor's
convention (`scripts/generate-changelog.mjs`'s release-tagging scheme):

- `2026.07.0` — first release cut in July 2026
- `2026.07.1` — a same-month follow-up release
- `2026.08.0` — the first release of the next month (patch resets to `0`)

To pick the next version: take the current date's `YYYY.MM`. If the most
recent **Released** entry in `changelog.json` already has that same
`YYYY.MM` prefix, increment its patch number by 1. Otherwise (first release
of a new month, or no prior release at all this month) use patch `0`.

Note this is a CalVer _string_ only — no git tags are created, and nothing
else about the release workflow changes (no `generate-changelog.mjs`, no
commit-message enforcement, no `versions.json`). Historical entries already
in `changelog.json` (SemVer strings like `1.10.6`, `1.10.7`) are left as-is;
only new entries going forward use CalVer.

## Entry shape

```jsonc
{
  "format": "commits",
  "version": "2026.07.0",
  "status": "Upcoming", // bump-release flips this to "Released"
  "date": "23 jul 2026",
  "commits": [
    {
      "sha": "abc1234",
      "author": "Steven Gort",
      "type": "feat", // feat | fix | test | docs | chore | refactor | ci | other
      "subject": "Clean, readable release-note header",
      "details": ["One or more body paragraphs, same technical depth as the commit message."],
    },
  ],
}
```

No `scope` field (single deployable, nothing to badge) and no `feedback`
field (that's a `ronl-business-api`-specific external GitLab tracker link —
skip it here unless this repo grows an equivalent).

## Steps

### 0. Reconcile outstanding pull requests

Run this **before touching any version**. A pull request merged outside a
release entry ships silently and appears in no changelog, so the release
history stops being a record of what is actually deployed.

```bash
gh pr list --state open --json number,title,author,files
```

Present the open PRs and ask which are in scope for this release: all, a
subset, or none. Out-of-scope PRs stay open and are gathered by the next
release. Then:

1. **Merge the in-scope PRs before any version editing.** Dependency PRs
   rewrite `package-lock.json` — the same file step 3 edits. Bump the version
   first and the merge either conflicts or silently reverts it.
2. **Re-check mergeability between merges** when several PRs touch the same
   file. The `acc` ruleset does not require branches to be up to date, so
   merging one leaves the next based on a stale tree.
3. **Say that each merge to `acc` triggers an acceptance deploy** when
   proposing to merge several.
4. **Bring the working branch up to date with `acc` afterwards** — rebase if
   the branch is unpushed, merge if it is not. Only then compute the commit
   range in step 1.

### 1. Determine the released version

- Read `src/data/changelog.json`.
- The first entry in `versions` is the one being released — extract its
  `version` string. If an explicit version was passed as an argument, use
  that instead and find it in the array. If no version was passed and a new
  entry needs authoring, compute the next CalVer string per "Versioning"
  above.
- **If the first entry's `status` is already `Released`, there is no
  pending entry** — stop and author a new one first (see "Authoring a new
  entry" below) before continuing. Do not fabricate changelog content
  without confirming it with the user.

#### Authoring a new entry (when there is no pending one)

1. Find the commit range: `PREV=$(git log --grep='^chore: bump release' -n 1 --format=%H)`,
   then `git log $PREV..HEAD --no-merges --oneline` lists everything since.

   **`--no-merges` is required.** Releases land through pull requests now, so
   every range contains merge commits, and a merge commit carries no content
   for a changelog.

   **Compute the range only after step 0 has brought the branch up to date.**
   Rebasing rewrites SHAs, so a range captured earlier records hashes that no
   longer exist — and nothing downstream will catch it.

   Drop any commits already covered by an existing changelog entry (a release
   is sometimes cut mid-stream, leaving a few already-documented commits still
   in range).

2. For each remaining commit, pull its real SHA (short form), author, and
   full subject + body: `git log -1 --format='%h|%an|%s%n%b' <sha>`. Derive
   `type` from the commit's conventional-commit prefix (`feat`, `fix`,
   `test`, `docs`, `chore`, `refactor`, `ci`), falling back to `other`.
   `ci` covers pipeline and supply-chain work; `ChangelogTab.jsx` renders it
   with its own icon.
3. Write `subject` as a clean, readable release-note header — informed by
   the commit subject but not required to be verbatim. Write `details` as
   1–3 paragraphs adapted from the commit body at the same technical depth
   the body already has. Strip any `Co-Authored-By` / `Claude-Session`
   trailer lines; never surface them.
4. Order the `commits` array **descending** — most recent commit first.
   When extending an already-existing Upcoming entry with new commits found
   on a later pass, prepend the new ones above the existing list.
5. Set `status: "Upcoming"` — bump-release flips it to `"Released"` in step 2.
6. **Show the drafted entry to the user and get confirmation before adding
   it to `changelog.json`.** Do not silently commit authored changelog
   content.
7. **If the entry needs a source change to render correctly** — a commit type
   `ChangelogTab.jsx` does not know, for example — commit that change _before_
   the bump and list it in the entry. The bump commit is the boundary marker
   `git log --grep` searches for and is never listed in its own entry, so a
   source change folded into it ships unlisted.

### 2. Flip the released entry to Released

Set `"status": "Released"` on the entry. There are no separate color
fields on the commit-format shape — `ChangelogTab.jsx` derives the status
badge and border color from the `status` string itself (`Released` →
green, `Upcoming` → blue). Do not add color keys to a commit-format entry;
they're ignored.

### 3. Bump `package.json` and the lockfile

Set `"version"` by hand in **both**:

- `package.json` — the only package.json in the repo, so no scope decision
- `package-lock.json` — the top-level `version` **and** `packages[""].version`

**Do not use `npm version`.** It coerces its argument to strict SemVer, and a
zero-padded CalVer month is not a valid SemVer numeric identifier — so
`npm version 2026.08.3` silently writes **`2026.8.3`**. That was tried during
the Linked Data Explorer's v2026.08.3 release and reverted. There is no flag to
disable the coercion. `npm pkg set version=...` preserves the string but does
not touch the lockfile, so it solves only half the problem.

**Why the lockfile is called out.** This step used to name only `package.json`,
so no release ever updated the lockfile. Through v2026.08.1 it still read
`0.1.0` — the value from the initial commit — while `package.json` had moved on
across 35 changelog entries.

The drift is not fatal: `npm ci` validates dependency satisfiability, not the
root `version` field, and exits 0 either way (verified against the drifted
state). But the lockfile is what CI installs from and what SBOM, audit and
provenance tooling reads, so all of it reported the wrong version — and the
first plain `npm install` afterwards drops a spurious version diff into whatever
unrelated commit follows. Re-run `npm ci --dry-run` after editing, to confirm
the lockfile still resolves.

v2026.08.1's lockfile was deliberately left stale rather than corrected out of
band; the next release picks it up.

### 4. Normalize formatting before committing

```bash
npm run format
git add .
```

`npm run format` is `prettier --write .`; the pre-push hook's
`npm run check-format` re-checks the whole repo (not just staged files),
so run this even if `lint-staged` already touched the relevant files on
commit. Skip only if `npm run format` reports no changes.

### 5. Report and ask to commit

State:

- The version being released
- That `package.json` was bumped to match
- How many commits the entry covers (if newly authored or extended)

Then ask whether to commit. Do not commit unless the user confirms.
Commit message format: `chore: bump release to v<released-version>` — no
Co-Authored-By line.

### 6. Land the release through a pull request

`acc` is protected by the `acc supply-chain gate` ruleset, which requires a
pull request and a passing `audit` check. A locally created bump commit has
never been through CI, so **the old flow — `git checkout acc` followed by
`git merge --ff-only` and a direct push — is rejected outright.** Do not work
around it: the gate applies to releases like everything else, and bypassing a
verification gate is never a step in this task.

```bash
git push -u origin <working-branch>
gh pr create --base acc --title "chore: bump release to v<version>" --body "..."
```

- **Merge with a merge commit, never squash.** The changelog entry names each
  commit by its SHA. Squashing collapses them into one new commit, leaving the
  entry pointing at commits that do not exist on `acc`.

  ```bash
  gh pr merge <n> --merge --delete-branch
  ```

  Renovate's dependency PRs are the opposite case — squash those. Each is a
  single change, and no entry names its constituent commits.

- Report the PR URL and let the human merge it. The release is audited before
  it lands, which is the point of the change.
- The PR runs `audit` and `Build and Deploy`; the latter produces a Static Web
  Apps preview deployment.
- **Merging the PR pushes `acc`, which triggers the acceptance deploy.** There
  is no separate "ask whether to push" step any more — merging is the push.
- Afterwards, clean up and sync local:

  ```bash
  git checkout acc && git pull --ff-only
  git branch -d <working-branch>
  ```

  Use `-d`, not `-D` — it only succeeds when the branch is fully merged. If it
  refuses, stop and investigate rather than forcing it.

### Why this changed

Through v2026.08.2 this step fast-forwarded `acc` locally and asked separately
about pushing. That stopped working when `acc` gained a ruleset requiring a PR
and a passing `audit` check — enforcement introduced by the supply-chain
pinning work, documented in `docs/the-gate-has-teeth.md`.

The v2026.08.2 release was the first cut under the gate and is where each of
these steps was corrected: the missing `--no-merges`, the missing `ci` type,
the PR reconciliation in step 0, the range being computed before a rebase had
rewritten its SHAs, this landing model, and the merge method — squashing a
release PR would have orphaned every SHA the entry cites.
