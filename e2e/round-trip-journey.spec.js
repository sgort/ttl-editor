import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The round-trip journey: import an existing service, swap its decision model,
 * prove the new model evaluates, and export the result.
 *
 * import a full TTL -> confirm every section came back -> clear the imported DMN
 * -> upload a different DMN -> deploy -> evaluate with a known request body ->
 * assert the engine's exact answer -> download and check what was written.
 *
 * Where this differs from authoring-journey.spec.js: that one starts from an
 * empty form and proves the app can CREATE a service. This one starts from a
 * service that already exists and proves the app can READ one back, change the
 * part that matters, and write it out again without losing the rest. The
 * failure it guards against is silent loss on import or re-export — a field
 * that parses but never regenerates.
 *
 * Same live-stack requirements as the authoring journey; see
 * e2e/global-setup.js, which refuses to run either without them.
 */

// Pinned copies under e2e-fixtures/, not the examples/ corpus: editing an
// example must not silently change what this asserts. See
// e2e-fixtures/manifest.json for where each came from and why.
const FIXTURE = resolve(process.cwd(), 'e2e-fixtures/round-trip/full-test-import-export.ttl');
const DMN = resolve(process.cwd(), 'e2e-fixtures/toeslagen/BerekenRechtEnHoogteZorg.dmn');

/** What the fixture carries, and therefore what must survive the round trip. */
const IMPORTED = {
  identifier: 'test-comprehensive-service',
  title: 'Comprehensive Test Service - All Fields',
};

/**
 * The decision under test takes six eligibility inputs. This combination — a
 * resident of the right age, insured, not in detention, no payment arrangement,
 * and an income of 2300 — is the one that yields an allowance rather than a
 * refusal, which is what makes the expected output below a meaningful assertion
 * rather than a null result.
 */
const REQUEST_BODY = JSON.stringify(
  {
    variables: {
      ingezetene_requirement: { value: true, type: 'Boolean' },
      leeftijd_requirement: { value: true, type: 'Boolean' },
      betalingsregeling_requirement: { value: false, type: 'Boolean' },
      detentie_requirement: { value: false, type: 'Boolean' },
      verzekering_requirement: { value: true, type: 'Boolean' },
      inkomen_en_vermogen_requirement: { value: 2300, type: 'Double' },
    },
  },
  null,
  2
);

const EXPECTED = {
  zorgtoeslag: 1150,
  annotation: 'Provides allowance to eligible residents over 18 years old.',
};

const openTab = (page, name) => page.getByRole('button', { name, exact: false }).first().click();

test.describe('round-trip journey', () => {
  test.beforeEach(async ({ page }) => {
    // See authoring-journey.spec.js for why: showSaveFilePicker is a native
    // dialog Playwright cannot drive, so removing it forces downloadTTL's
    // Blob + link.click() fallback, which page.waitForEvent('download') sees.
    await page.addInitScript(() => {
      delete window.showSaveFilePicker;
    });
    await page.goto('/');
  });

  test('imports a full service, swaps its DMN, evaluates it, and exports it again', async ({
    page,
  }) => {
    // ---- 1. import ------------------------------------------------------
    await page.getByLabel('Import TTL File').setInputFiles(FIXTURE);

    // ---- 2. the import succeeded, and brought its contents with it ------
    // The message is the DMN-preserving variant, because the fixture carries an
    // embedded model. Getting the other message here would mean the DMN blocks
    // were not recognised.
    await expect(
      page.getByText('TTL imported successfully. DMN data preserved but cannot be edited.')
    ).toBeVisible({ timeout: 30_000 });

    await openTab(page, 'Service');
    await expect(page.getByLabel(/Unique identifier for this service/)).toHaveValue(
      IMPORTED.identifier
    );
    await expect(page.getByLabel(/Official name of the service/)).toHaveValue(IMPORTED.title);

    // ---- 3. clear the imported DMN --------------------------------------
    await openTab(page, 'DMN');
    await expect(page.getByText('📋 DMN Data Imported')).toBeVisible();
    await page.getByRole('button', { name: 'Clear Imported DMN Data' }).click();

    // Clearing returns the tab to its normal upload state.
    await expect(page.getByLabel('Choose a file')).toBeAttached();

    // ---- 4. attach a different model ------------------------------------
    await page.getByLabel('Choose a file').setInputFiles(DMN);
    await expect(page.getByText('BerekenRechtEnHoogteZorg.dmn').first()).toBeVisible();

    // ---- 5. deploy -------------------------------------------------------
    await page.getByRole('button', { name: /Deploy to Operaton/ }).click();

    const evaluate = page.getByRole('button', { name: /Evaluate Decision/ });
    await expect(evaluate).toBeEnabled({ timeout: 60_000 });

    // ---- 6. evaluate with the known inputs -------------------------------
    await page
      .getByPlaceholder('Enter JSON request body or upload a DMN file to auto-generate')
      .fill(REQUEST_BODY);
    await evaluate.click();

    await expect(page.getByText('200 OK')).toBeVisible({ timeout: 60_000 });

    // ---- 7. the engine returned exactly what this input should produce ----
    // Asserting the values, not merely that a response arrived: a decision table
    // that silently stopped matching would still answer 200 with an empty
    // result set.
    const response = page.locator('pre').filter({ hasText: 'zorgtoeslag' });
    await expect(response).toContainText(String(EXPECTED.zorgtoeslag));
    await expect(response).toContainText(EXPECTED.annotation);

    // ---- 8. export, and check what was written --------------------------
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download TTL' }).click();
    const ttl = readFileSync(await (await downloadPromise).path(), 'utf8');

    // The imported service survived a DMN swap and a re-export.
    expect(ttl).toContain('@prefix cpsv:');
    expect(ttl).toContain(IMPORTED.identifier);
    expect(ttl).toContain(IMPORTED.title);

    // Sections that came from the fixture and had nothing to do with the DMN
    // must still be there — this is the silent-loss check.
    expect(ttl).toContain('test-cost-001');
    expect(ttl).toContain('test-output-001');
    expect(ttl).toContain('test-org-001');
    expect(ttl).toContain('BWBR9999999');

    // And the swap actually took: the new decision, not the fixture's original.
    expect(ttl.toLowerCase()).toContain('berekenrechtenhoogtezorg');
  });
});
