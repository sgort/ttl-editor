import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The full authoring journey, against a live stack.
 *
 * fill a service -> attach a DMN -> syntax validation -> deploy to Operaton
 * -> evaluate -> concepts generated -> TTL preview -> export.
 *
 * REQUIRES, and does not mock:
 *   - the Linked Data Explorer backend on :3001  (validation, deploy, evaluate)
 *   - an Operaton engine on :8081               (reached via that backend)
 *
 * The Operaton target is the BACKEND's OPERATON_BASE_URL, not the "Base URL"
 * field in the DMN tab. That field is only ever read to build a display string
 * and the ronl:implementedBy value recorded in the TTL — the deploy request
 * carries no engine URL at all. Changing it in the UI redirects nothing.
 *
 * Every run leaves a deployment on that engine. Operaton versions duplicate
 * decision keys rather than rejecting them, so repeated runs are fine, but they
 * do accumulate.
 *
 * WHICH DMN: defaults to the SVB example. Override with E2E_DMN, which accepts
 *   an org-qualified name   E2E_DMN=heusden/HeusdenpasEindresultaat
 *   a bare file name        E2E_DMN=UWV_Leeftijdsinformatie
 *   a path                  E2E_DMN=examples/organizations/duo/Student-finance-application.dmn
 * with or without the .dmn suffix.
 */

const EXAMPLES_ROOT = resolve(process.cwd(), 'examples/organizations');
const DEFAULT_DMN = 'svb/RONL_BerekenLeeftijden_CPRMV';

/** Every .dmn under examples/organizations, as absolute paths. */
const allExamples = () => {
  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return walk(EXAMPLES_ROOT).filter((f) => f.endsWith('.dmn'));
};

/**
 * Resolve E2E_DMN to a file. Ambiguity is an error rather than a guess: several
 * organizations ship similarly-named models, and silently driving the wrong one
 * would make a passing run meaningless.
 */
const resolveDmn = (spec) => {
  const direct = resolve(process.cwd(), spec);
  if (existsSync(direct) && direct.endsWith('.dmn')) return direct;

  const wanted = spec.endsWith('.dmn') ? spec.slice(0, -4) : spec;
  const candidates = allExamples().filter((f) => {
    const withoutRoot = f.slice(EXAMPLES_ROOT.length + 1).replace(/\\/g, '/');
    return (
      withoutRoot === `${wanted}.dmn` ||
      basename(f) === `${wanted}.dmn` ||
      withoutRoot.endsWith(`/${wanted}.dmn`)
    );
  });

  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) {
    throw new Error(
      `E2E_DMN="${spec}" matched no example.\nAvailable:\n` +
        allExamples()
          .map((f) => '  ' + f.slice(EXAMPLES_ROOT.length + 1).replace(/\\/g, '/'))
          .join('\n')
    );
  }
  throw new Error(
    `E2E_DMN="${spec}" is ambiguous, matching:\n` +
      candidates.map((f) => '  ' + f.slice(EXAMPLES_ROOT.length + 1)).join('\n') +
      '\nQualify it with the organization, e.g. svb/RONL_BerekenLeeftijden_CPRMV'
  );
};

const DMN_PATH = resolveDmn(process.env.E2E_DMN ?? DEFAULT_DMN);
const DMN_NAME = basename(DMN_PATH);

const SERVICE = {
  identifier: 'e2e-aow-leeftijd',
  name: 'E2E AOW Leeftijdsbepaling',
};
const ORGANIZATION = {
  identifier: 'svb',
  name: 'Sociale Verzekeringsbank',
};

const openTab = (page, name) => page.getByRole('button', { name, exact: false }).first().click();

test.describe('authoring journey', () => {
  test.beforeEach(async ({ page }) => {
    // showSaveFilePicker opens a NATIVE save dialog, which Playwright cannot
    // drive — clicking Download with it present hangs the test rather than
    // failing it. Removing it before the app loads forces downloadTTL's own
    // Blob + link.click() fallback, which page.waitForEvent('download') can
    // capture. That means this asserts the fallback path, not the one a Chrome
    // user takes; the preview-panel assertion below covers TTL generation
    // independently of any browser API.
    await page.addInitScript(() => {
      delete window.showSaveFilePicker;
    });
    await page.goto('/');
  });

  test(`drives ${DMN_NAME} from empty form to exported TTL`, async ({ page }) => {
    // ---- the app boots -------------------------------------------------
    await expect(page.getByRole('heading', { name: 'Core Public Service Editor' })).toBeVisible();

    // ---- a minimal service ---------------------------------------------
    await openTab(page, 'Service');
    await page.getByLabel(/Unique identifier for this service/).fill(SERVICE.identifier);
    await page.getByLabel(/Official name of the service/).fill(SERVICE.name);

    await openTab(page, 'Organization');
    await page
      .getByLabel(/Unique identifier for this organization|identifier/)
      .first()
      .fill(ORGANIZATION.identifier);
    await page
      .getByLabel(/Official name of the organization|name of the organization/)
      .first()
      .fill(ORGANIZATION.name);

    // ---- attach the DMN, which triggers syntax validation ---------------
    await openTab(page, 'DMN');
    await page.getByLabel('Choose a file').setInputFiles(DMN_PATH);
    await expect(page.getByText(DMN_NAME).first()).toBeVisible();

    // Validation is advisory: it renders a result whether the model is clean,
    // has findings, or the backend could not be reached. Waiting for the Deploy
    // button is what tells us the upload settled.
    const deploy = page.getByRole('button', { name: /Deploy to Operaton/ });
    await expect(deploy).toBeVisible();

    // ---- deploy to the local engine -------------------------------------
    await deploy.click();

    const evaluate = page.getByRole('button', { name: /Evaluate Decision/ });
    await expect(evaluate).toBeEnabled({ timeout: 60_000 });

    // ---- evaluate, which is what generates the concepts -----------------
    await evaluate.click();

    // A positive signal, not the absence of an error: the response panel shows
    // "200 OK" only once the engine has actually answered. Asserting that
    // "Evaluation failed" is absent would pass instantly, before the request
    // had even been sent.
    await expect(page.getByText('200 OK')).toBeVisible({ timeout: 60_000 });

    // ---- concepts are derived from the evaluation result ----------------
    await openTab(page, 'Concepts');

    // Not the "NL-SBB Concept Definitions" heading: ConceptsTab renders that in
    // BOTH states — once in the empty-state early return and again as a section
    // header when populated — so it cannot tell them apart. Concept rows only
    // exist when there are concepts.
    // The count heading is DMN-agnostic — a different E2E_DMN yields a different
    // number of concepts, so the assertion is that there are some, not how many.
    await expect(page.getByRole('heading', { name: /\d+ concepts/ })).toBeVisible({
      timeout: 30_000,
    });
    // ...and that they rendered as editable rows, not just a count.
    // getByPlaceholder, not getByPlaceholderText — the latter is Testing
    // Library's spelling and does not exist on a Playwright page.
    await expect(page.getByPlaceholder('e.g., Geboortedatum Aanvrager').first()).toBeVisible();

    // ---- the preview reflects what was typed ----------------------------
    await page.getByRole('button', { name: 'Show Preview' }).click();
    await expect(page.getByText('Live TTL Preview')).toBeVisible();

    // By this point in the journey there are two <pre> blocks on the page: the
    // DMN tab's evaluation response, and this panel. Selecting on the tag alone
    // is a strict-mode violation, so scope to the one holding Turtle.
    const previewTtl = page.locator('pre').filter({ hasText: '@prefix' });
    await expect(previewTtl).toContainText(SERVICE.identifier);
    await expect(previewTtl).toContainText(SERVICE.name);

    // ---- export ----------------------------------------------------------
    // Left open on purpose: exporting while looking at the preview is the
    // natural thing to do, and it only works because playwright.config.js sets
    // a 1600px viewport. Below that the fixed preview panel covers these
    // controls — see the note there.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download TTL' }).click();
    const download = await downloadPromise;

    // The filename is derived from the service name via sanitizeFilename.
    expect(download.suggestedFilename()).toMatch(/\.ttl$/);

    // Assert what was actually written, not just that a download fired. A
    // filename check passes even if the file is empty, which is the same class
    // of false green as a deploy that publishes an empty directory.
    const saved = await download.path();
    const ttl = readFileSync(saved, 'utf8');

    expect(ttl).toContain('@prefix cpsv:');
    expect(ttl).toContain(SERVICE.identifier);
    expect(ttl).toContain(SERVICE.name);
    expect(ttl).toContain(ORGANIZATION.name);
  });
});
