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
      "type": "feat", // feat | fix | test | docs | chore | refactor | other
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
   then `git log $PREV..HEAD --oneline` lists everything since. Drop any
   commits already covered by an existing changelog entry (a release is
   sometimes cut mid-stream, leaving a few already-documented commits still
   in range).
2. For each remaining commit, pull its real SHA (short form), author, and
   full subject + body: `git log -1 --format='%h|%an|%s%n%b' <sha>`. Derive
   `type` from the commit's conventional-commit prefix (`feat`, `fix`,
   `test`, `docs`, `chore`, `refactor`), falling back to `other`.
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

### 2. Flip the released entry to Released

Set `"status": "Released"` on the entry. There are no separate color
fields on the commit-format shape — `ChangelogTab.jsx` derives the status
badge and border color from the `status` string itself (`Released` →
green, `Upcoming` → blue). Do not add color keys to a commit-format entry;
they're ignored.

### 3. Bump `package.json`

Read the file before editing (required by the Edit tool). Set `"version"`
to the released version. This is the only package.json in the repo — no
scope decision, no other package to leave behind.

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

### 6. Fast-forward onto `acc` and clean up the working branch

Once the bump commit exists, land it on `acc` by default — do not ask
first, this is the standard flow. Skip this step only if the commit was
already made directly on `acc`.

```bash
git checkout acc
git merge --ff-only <working-branch>
```

- If this isn't a clean fast-forward (`acc` has diverged), **stop and
  ask** how to proceed. Never force-merge, rebase, or `--no-ff` silently.
- On success, delete the now-fully-merged working branch:

  ```bash
  git branch -d <working-branch>
  ```

  Use `-d`, not `-D` — it only succeeds when fully merged, which it will
  be immediately after an `--ff-only` merge. If it refuses, stop and
  investigate rather than forcing it.

- This is local-only: it does **not** push `acc` to `origin`. Report the
  new local `acc` HEAD (short SHA) and ask separately whether to push —
  pushing to a shared branch still needs explicit confirmation.
