#!/usr/bin/env node
/**
 * check-branch-coverage.mjs — a per-file branch floor, with a ratchet.
 *
 * Vitest cannot express this policy on its own, which is why it lives here.
 * Its `thresholds` block accepts glob keys that look like per-file overrides,
 * but they are additive rather than overriding — from Vitest's own source:
 *
 *     // Global threshold is for all files, even if they are included by glob patterns
 *
 * So a file matching `'src/App.jsx': { branches: 34 }` is still measured against
 * the global 80 as well, and the build fails anyway. Verified by configuring it
 * that way and watching all fifteen lagging files fail against the *global*
 * threshold. `perFile: true` with no globs is all-or-nothing, and this
 * repository is not at 80% everywhere yet.
 *
 * ── Why branches, and why per file ──
 *
 * Per file, because a project average lets a well-tested utility pay for an
 * untested component. The branches that matter are precisely the ones nobody
 * has exercised, and an average is designed to hide them.
 *
 * Branches, because statement and line coverage largely restate "was this file
 * imported", and function coverage rewards splitting code into more functions.
 * A branch is a decision the code makes; an uncovered branch is a decision no
 * test has ever checked.
 *
 * ── The debt list ──
 *
 * DEBT records files below the floor, each pinned just under its current value.
 * It is a ratchet, not an exemption list, and it tightens from both ends:
 *
 *   - below its pin, a file fails — no silent regression;
 *   - more than RATCHET_SLACK above its pin, it fails too, asking for the pin
 *     to be raised, so an entry cannot quietly become permanent;
 *   - at or above FLOOR, it fails asking to be deleted from the list;
 *   - naming a file that no longer exists fails, so deletions cannot leave
 *     stale entries behind.
 *
 * ── This script is temporary ──
 *
 * It exists only to carry DEBT. Once every entry is gone, Vitest can express
 * the whole policy natively —
 *
 *     thresholds: { branches: 80, perFile: true }
 *
 * — because with nothing to exempt, the additive-globs problem above stops
 * mattering. Deleting this file and moving those four lines into
 * vite.config.mjs is the last step of the work, not an afterthought.
 *
 * ── A caveat worth carrying ──
 *
 * These numbers come from Vitest only. The two Playwright journeys drive TTL
 * import, DMN upload, deployment and evaluation end to end, and none of that
 * reaches this report. DMNTab.jsx reads 30% here while both journeys exercise
 * its upload, deploy and evaluate paths on every run. Treat the list as a
 * measure of unit-test coverage, not of risk — and, when picking what to work
 * on next, prefer the entries with no E2E journey beneath them.
 */

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const FLOOR = 80;

/**
 * How far above its pin a file may drift before the pin must be raised.
 *
 * Zero would be a true ratchet but would fail the build every time an unrelated
 * test happened to touch a new branch, which is how a gate gets removed rather
 * than repaired. Ten points is coarse enough to leave ordinary work alone and
 * tight enough that no entry survives real progress.
 */
const RATCHET_SLACK = 10;

/**
 * Files below the floor, pinned at their measured value as of 2026-09-08.
 *
 * One file remains: DMNTab.jsx, at 1811 lines the largest in the repository and
 * needing 208 of the branches between here and 80% everywhere — more than the
 * three files retired alongside this edit needed together. Raise a pin as tests
 * land; delete the entry once the file clears FLOOR.
 */
const DEBT = {
  // 208 branches, the biggest file in the repository. Both E2E journeys drive
  // its upload, deploy and evaluate paths.
  'src/components/tabs/DMNTab.jsx': 30,
};

const COVERAGE = resolve('coverage/coverage-final.json');

if (!existsSync(COVERAGE)) {
  console.error(
    `\n  no coverage report at ${relative(process.cwd(), COVERAGE)}\n` +
      `  run it through the suite first: npm run test:ci\n`
  );
  process.exit(1);
}

const report = JSON.parse(readFileSync(COVERAGE, 'utf8'));

/** Branch coverage per file, keyed by repo-relative POSIX path. */
const measured = new Map();
for (const [absolute, data] of Object.entries(report)) {
  const counts = Object.values(data.b ?? {}).flat();
  // A file with no branches cannot fail a branch floor. Reporting it as 100%
  // matches what the Vitest table shows and keeps it out of the way.
  const pct = counts.length ? (counts.filter((n) => n > 0).length / counts.length) * 100 : 100;
  measured.set(relative(process.cwd(), absolute).split(sep).join('/'), {
    pct,
    total: counts.length,
  });
}

const failures = [];

for (const [file, { pct, total }] of [...measured].sort()) {
  const pinned = DEBT[file];
  const floor = pinned ?? FLOOR;

  if (pct + 1e-9 < floor) {
    const needed = Math.ceil(total * (floor / 100)) - Math.round((pct / 100) * total);
    failures.push(
      pinned === undefined
        ? `${file}\n      ${pct.toFixed(2)}% branch coverage, floor is ${FLOOR}%` +
            ` — about ${needed} more branch${needed === 1 ? '' : 'es'} to cover`
        : `${file}\n      ${pct.toFixed(2)}% branch coverage has fallen below its pinned ${pinned}%` +
            ` — this file is recorded debt and must not regress further`
    );
    continue;
  }

  if (pinned !== undefined && pct >= FLOOR) {
    failures.push(
      `${file}\n      ${pct.toFixed(2)}% branch coverage now clears the ${FLOOR}% floor` +
        ` — delete its entry from DEBT in ${relative(process.cwd(), import.meta.filename)}`
    );
    continue;
  }

  if (pinned !== undefined && pct > pinned + RATCHET_SLACK) {
    failures.push(
      `${file}\n      ${pct.toFixed(2)}% branch coverage is more than ${RATCHET_SLACK} points` +
        ` above its pinned ${pinned}% — raise the pin to ${Math.floor(pct)} so the gain is held`
    );
  }
}

for (const file of Object.keys(DEBT)) {
  if (!measured.has(file)) {
    failures.push(
      `${file}\n      listed in DEBT but absent from the coverage report` +
        ` — if the file was deleted, delete its entry too`
    );
  }
}

const belowFloor = [...measured.values()].filter((m) => m.pct < FLOOR).length;

if (failures.length) {
  console.error(`\n  branch coverage floor: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`    ${f}\n`);
  process.exit(1);
}

console.log(
  `  branch coverage floor ok — ${measured.size - belowFloor}/${measured.size} files at ${FLOOR}%+, ` +
    `${Object.keys(DEBT).length} pinned as recorded debt`
);
