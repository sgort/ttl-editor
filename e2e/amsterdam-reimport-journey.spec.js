import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Import, export, import again — on a real published export, with no DMN swap
 * and no decision engine involved.
 *
 * round-trip-journey.spec.js proves a service survives having its model
 * replaced. This proves something narrower and, as it turned out, more fragile:
 * that reading a published file and writing it straight back changes nothing.
 *
 * It exists because that round trip was destructive. A published export types
 * four different things `a cprmv:Rule` — the Policy tab's Norms & Standards
 * rules, and the cell-level grounding layer's cell resources, minted concepts
 * and citation stubs, which are typed that way only because cprmv:isBasedOn
 * carries sh:class cprmv:Rule. The importer took all four for policy rules, so
 * the grounding layer arrived in the Policy tab as rules nobody wrote and
 * vanished from the preserved DMN block, while the cprmv:hasPart lists that
 * referenced it survived. Re-exporting then wrote the mistake back as
 * `https://cprmv.open-regels.nl/rules/incomplete_<id>`, three of them with a
 * whole URL inside the URI path. The fixture's predecessor carries 12 such
 * fabricated rules, which is how this was found.
 *
 * The unit round-trip in src/parseTTL.roundtrip.test.js now guards the parser
 * directly and runs in CI. This drives the same path through the real
 * application — the file chooser, the tabs, the Download TTL button — which is
 * where the defect was actually noticed.
 *
 * Unlike the other journeys this one needs no Operaton and no backend: it
 * imports a file, downloads a file, and imports that. If the e2e suite is ever
 * wired into CI, this is the spec that can go first.
 */

// A pinned copy, not the examples/ original — see e2e-fixtures/manifest.json.
const FIXTURE = resolve(
  process.cwd(),
  'e2e-fixtures/round-trip/Digital-Twin-Inkomensregelingen.ttl'
);

/** What the fixture carries, and therefore what must survive untouched. */
const IMPORTED = {
  identifier: 'digital-twin',
  title: 'Digital Twin Inkomensregelingen',
  concepts: 77,
};

/**
 * Grounding that must still be in the export afterwards. The quote is a cell's
 * own cprmv:sourceQuote; the label is the concept name the cell is grounded in,
 * reached through the annotation export's @concept link.
 */
const GROUNDING = {
  quote: 'cprmv:sourceQuote "Woonadres"',
  label: 'skos:prefLabel "natuurlijk persoon heeft woonadres"',
  cell: '/cell/_inputentry_145',
};

const openTab = (page, name) => page.getByRole('button', { name, exact: false }).first().click();

/**
 * The generator stamps the moment of export -- an xsd:dateTime on the RuleSet
 * and xsd:date on a couple of resources -- so two downloads of the same state
 * are not byte-identical by construction. Blanking those is what makes
 * "nothing changed" assertable without making it flaky.
 */
const stable = (ttl) =>
  ttl
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<TIMESTAMP>')
    .replace(/"\d{4}-\d{2}-\d{2}"\^\^xsd:date/g, '"<DATE>"^^xsd:date');

/** Rules the importer must never invent, in any form the defect produced. */
function expectNoFabricatedRules(ttl) {
  expect(ttl).not.toContain('rules/incomplete_');
  // a policy-rule subject carrying a cell id, a bare concept id or a nested URL
  expect(ttl).not.toMatch(/<https:\/\/cprmv\.open-regels\.nl\/rules\/[^>]*-cell-/);
  expect(ttl).not.toMatch(/<https:\/\/cprmv\.open-regels\.nl\/rules\/[^>]*https:\/\//);
}

test.describe('published-export re-import journey', () => {
  test.beforeEach(async ({ page }) => {
    // See authoring-journey.spec.js: showSaveFilePicker is a native dialog
    // Playwright cannot drive, so removing it forces downloadTTL's Blob +
    // link.click() fallback, which page.waitForEvent('download') sees.
    await page.addInitScript(() => {
      delete window.showSaveFilePicker;
    });
    await page.goto('/');
  });

  test('imports a published export, writes it back, and imports that unchanged', async ({
    page,
  }, testInfo) => {
    // ---- 1. import the published export ---------------------------------
    await page.getByLabel('Import TTL File').setInputFiles(FIXTURE);

    await expect(
      page.getByText('TTL imported successfully. DMN data preserved but cannot be edited.')
    ).toBeVisible({ timeout: 30_000 });

    await openTab(page, 'Service');
    await expect(page.getByLabel(/Unique identifier for this service/)).toHaveValue(
      IMPORTED.identifier
    );
    await expect(page.getByLabel(/Official name of the service/)).toHaveValue(IMPORTED.title);

    // Every concept in the file arrived. The Concepts tab carries the count in
    // a badge, so the tab button itself is the assertion.
    await expect(page.getByRole('button', { name: /Concepts/ }).first()).toContainText(
      String(IMPORTED.concepts)
    );

    // ---- 2. the Policy tab is empty, and must stay that way --------------
    // This service has no Norms & Standards rules at all. Every cprmv:Rule in
    // the file belongs to the grounding layer, so a rule appearing here is
    // fabricated — this is the assertion the defect would have failed.
    await openTab(page, 'Policy');
    await expect(page.getByText(/Norms & Standards/).first()).toBeVisible();
    await expect(page.getByText(/^Rule 1$/)).toHaveCount(0);

    // ---- 3. export -------------------------------------------------------
    const firstDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download TTL' }).click();
    // saveAs with the suggested filename, not path(): Playwright parks a
    // download under a generated name with no extension, and the import input
    // only accepts .ttl -- so re-importing path() silently does nothing.
    const exportedPath = testInfo.outputPath('exported.ttl');
    await (await firstDownload).saveAs(exportedPath);
    const exported = readFileSync(exportedPath, 'utf8');

    expect(exported).toContain('@prefix cpsv:');
    expect(exported).toContain(IMPORTED.identifier);
    expectNoFabricatedRules(exported);

    // The grounding layer came back out with the file, rather than being
    // rewritten into the Policy tab on the way through.
    expect(exported).toContain(GROUNDING.quote);
    expect(exported).toContain(GROUNDING.label);
    expect(exported).toContain(GROUNDING.cell);

    // ---- 4. import what was just written --------------------------------
    await page.goto('/');
    await page.getByLabel('Import TTL File').setInputFiles(exportedPath);

    await expect(
      page.getByText('TTL imported successfully. DMN data preserved but cannot be edited.')
    ).toBeVisible({ timeout: 30_000 });

    // ---- 5. the second import is the first -------------------------------
    await openTab(page, 'Service');
    await expect(page.getByLabel(/Unique identifier for this service/)).toHaveValue(
      IMPORTED.identifier
    );
    await expect(page.getByLabel(/Official name of the service/)).toHaveValue(IMPORTED.title);

    await openTab(page, 'Policy');
    await expect(page.getByText(/^Rule 1$/)).toHaveCount(0);

    // ---- 6. and writing it back a second time still changes nothing ------
    // One cycle can hide a defect that only compounds; two cannot. The
    // corruption this guards grew on every republish.
    const secondDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download TTL' }).click();
    const reExportedPath = testInfo.outputPath('re-exported.ttl');
    await (await secondDownload).saveAs(reExportedPath);
    const reExported = readFileSync(reExportedPath, 'utf8');

    expectNoFabricatedRules(reExported);
    expect(reExported).toContain(GROUNDING.quote);
    expect(reExported).toContain(GROUNDING.label);
    expect(reExported).toContain(GROUNDING.cell);

    // The file stopped changing: whatever the first cycle produced, the second
    // reproduced exactly, down to the byte once the export stamps are blanked.
    // That is the property "round trip" actually means, and it is the one the
    // old behaviour broke -- there, each cycle added more fabricated rules.
    expect(stable(reExported)).toBe(stable(exported));
  });
});
