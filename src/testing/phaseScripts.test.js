// @vitest-environment node
/**
 * Every test file belongs to a phase script (#238).
 *
 * The scoped scripts in package.json (test:generator, test:roundtrip,
 * test:app, test:p2 … test:p6) exist to run one layer at a time. Their filters
 * are path substrings, so a new test file whose name matches none of them still
 * runs in test:ci but silently drops out of every scoped run. That happened
 * twice in a row (v2026.11.0 and v2026.11.1). This test names the file instead
 * of waiting for someone to notice a count that did not grow.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const { scripts } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const PHASE_SCRIPT = /^test:(generator|roundtrip|app|p\d+)$/;

// Vitest's CLI filters select a file when its path contains the filter.
const filters = Object.entries(scripts)
  .filter(([name]) => PHASE_SCRIPT.test(name))
  .flatMap(([, command]) =>
    command
      .replace(/^vitest run\s*/, '')
      .split(/\s+/)
      .filter(Boolean)
  );

const testFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.test\.jsx?$/.test(entry.name)) {
      testFiles.push(relative(root, path).split(sep).join(posix.sep));
    }
  }
};
walk(join(root, 'src'));

describe('phase scripts', () => {
  test('the scripts and the test files were found', () => {
    expect(filters.length).toBeGreaterThan(0);
    expect(testFiles.length).toBeGreaterThan(0);
  });

  test('every test file is selected by at least one phase script', () => {
    const unselected = testFiles.filter((file) => !filters.some((f) => file.includes(f)));
    expect(unselected).toEqual([]);
  });

  test('each watch script selects the same files as its run script', () => {
    for (const [name, command] of Object.entries(scripts)) {
      if (!PHASE_SCRIPT.test(name)) continue;
      expect(scripts[`${name}:watch`], `${name}:watch`).toBe(
        command.replace(/^vitest run /, 'vitest ')
      );
    }
  });
});
