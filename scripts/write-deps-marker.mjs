// Snapshots package-lock.json into node_modules right after a successful
// install, so scripts/check-deps.sh can later ask "does the lockfile on disk
// still match what was actually installed?" by comparing content rather than
// file mtimes. `git checkout` and `git merge --ff-only` rewrite tracked files
// even when their content is unchanged, so an mtime says nothing about whether
// dependencies moved.
//
// Node, not bash. This runs as the "postinstall" script, and so it also runs in
// the Static Web Apps build: both deploy workflows leave the build to the
// action, where Oryx runs `npm install` at app_location '/' inside its own
// container. That container has no shell this repository can see or rely on,
// but it is running npm, so it is running node. A bash script here would put
// every deploy at the mercy of the image's contents.
import { copyFileSync } from 'node:fs';

copyFileSync('package-lock.json', 'node_modules/.package-lock-installed.json');
