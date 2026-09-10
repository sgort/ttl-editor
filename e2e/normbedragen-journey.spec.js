import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The normbedragen journey: one deployment, four evaluations, four different
 * answers.
 *
 * attach a chained DRD -> confirm the root decision was picked, not the one it
 * depends on -> deploy -> evaluate four request bodies that differ only in
 * peildatum and norm -> assert each exact amount -> export.
 *
 * Where this differs from the other two journeys: authoring-journey.spec.js
 * proves the app can CREATE a service from an empty form, and
 * round-trip-journey.spec.js proves it can READ one back and swap its model.
 * Both evaluate exactly one decision, once. This one evaluates repeatedly
 * against a two-decision DRD where the answer is not in the table the caller
 * names.
 *
 * `pw-normbedragen` has no amounts in it at all. It maps a `norm` name onto one
 * of the 20 output columns of `PW_BijstandsnormBedragen`, which first has to place
 * a `peildatum` inside a half-year termijn and emit all 20 amounts for it. So
 * every answer below travels through a `requiredDecision` edge, and the four
 * cases fail in distinguishable ways:
 *
 *   - two peildatums, same norm, different amounts  -> the termijn lookup works
 *   - peildatum past the last termijn -> null       -> the window is bounded
 *   - second norm, first peildatum, third amount    -> the column select works
 *
 * A single evaluation could pass with the chain hardwired to one termijn, or one
 * column, and nobody would know. That is the failure this guards against.
 *
 * Same live-stack requirements as the other journeys; see e2e/global-setup.js,
 * which refuses to run any of them without a backend and an Operaton.
 *
 * Every run leaves a deployment on that engine, versioned rather than rejected,
 * exactly as the other two journeys do.
 */

// A pinned copy under e2e-fixtures/, not the examples/ corpus: editing an
// example must not silently change what this asserts. See
// e2e-fixtures/manifest.json for where it came from and why.
const DMN = resolve(process.cwd(), 'e2e-fixtures/szw/PW-normbedragen.dmn');
const DMN_NAME = 'PW-normbedragen.dmn';

/** The root of the DRD, and the decision it depends on. */
const ROOT_DECISION = 'pw-normbedragen';
const REQUIRED_DECISION = 'PW_BijstandsnormBedragen';

const SERVICE = {
  identifier: 'e2e-pw-normbedragen',
  name: 'E2E PW Normbedragen',
};
const ORGANIZATION = {
  identifier: 'szw',
  name: 'Ministerie van Sociale Zaken en Werkgelegenheid',
};

/**
 * Four evaluations off one deployment.
 *
 * The amounts are the Participatiewet bijstandsnormen and are not arbitrary
 * fixtures: 1419.46 and 1364.32 come from the CPRMV norms API for
 * `applicable_date: 2026-07-01`, and 1401.50 from the termijn before it. See
 * examples/organizations/szw/testCases/test-cases-validation-pw.md for the
 * article behind each column.
 */
const EVALUATIONS = [
  {
    what: 'a peildatum in the 2026-H2 termijn',
    peildatum: '2026-09-15',
    norm: 'Alleenstaande norm',
    // Rendered by formatJSON as JSON.stringify(_, null, 2), so the assertion
    // matches the pretty-printed form the panel actually shows.
    expect: '"value": 1419.46',
    because:
      'Art. 21 a, column M of the termijn 2026-07-01 <= peildatum < 2027-01-01 — ' +
      'the termijn this work added.',
  },
  {
    what: 'the same norm, one termijn earlier',
    peildatum: '2026-03-15',
    norm: 'Alleenstaande norm',
    // 1401.50 in the model; JSON drops the trailing zero.
    expect: '"value": 1401.5',
    because:
      'Only peildatum moved. A different amount for an unchanged norm is the ' +
      'proof that PW_BijstandsnormBedragen is really being consulted per date, ' +
      'rather than one termijn being baked in.',
  },
  {
    what: 'a peildatum past the last termijn',
    peildatum: '2027-01-01',
    norm: 'Alleenstaande norm',
    expect: '"value": null',
    because:
      'The last termijn ends with a strict <, and there is no default rule, so ' +
      'FIRST matches nothing and every column resolves to null. A row still ' +
      'comes back — this is not an empty result set, and not an error.',
  },
  {
    what: 'a different norm at the first peildatum',
    peildatum: '2026-09-15',
    norm: 'Samenwonende waarvan 1 jongere met kinderen norm',
    expect: '"value": 1769.88',
    because:
      'Art. 20 lid 2 c, column MJK. Same termijn as the first case, different ' +
      'column, so this isolates the norm-to-column mapping from the date ' +
      'lookup. MJK is also the column that had been overwritten with MJ’s ' +
      'value in two termijnen, so a regression there surfaces here.',
  },
];

const body = ({ peildatum, norm }) =>
  JSON.stringify(
    {
      variables: {
        // String, not Date. The rule cells call date(peildatum) themselves, so
        // the engine is handed an ISO-8601 string and converts inside FEEL.
        peildatum: { value: peildatum, type: 'String' },
        norm: { value: norm, type: 'String' },
      },
    },
    null,
    2
  );

const openTab = (page, name) => page.getByRole('button', { name, exact: false }).first().click();

test.describe('normbedragen journey', () => {
  test.beforeEach(async ({ page }) => {
    // See authoring-journey.spec.js for why: showSaveFilePicker is a native
    // dialog Playwright cannot drive, so removing it forces downloadTTL's
    // Blob + link.click() fallback, which page.waitForEvent('download') sees.
    await page.addInitScript(() => {
      delete window.showSaveFilePicker;
    });
    await page.goto('/');
  });

  test('drives a chained DRD through four evaluations and exports it', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Core Public Service Editor' })).toBeVisible();

    // ---- 1. a minimal service, so the export has something to carry ------
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

    // ---- 2. attach the model ---------------------------------------------
    await openTab(page, 'DMN');
    await page.getByLabel('Choose a file').setInputFiles(DMN);
    await expect(page.getByText(DMN_NAME).first()).toBeVisible();

    // ---- 3. the right decision was chosen --------------------------------
    // Two decisions means the picker renders instead of the plain read-only
    // line, and it must have defaulted to the ROOT — the decision nothing else
    // requires. Defaulting to PW_BijstandsnormBedragen would still deploy and
    // still evaluate, answering 20 columns instead of one bedrag, so this is
    // the assertion that separates "it worked" from "it worked by accident".
    await expect(page.getByText(/2 testable decisions detected/)).toBeVisible();

    const picker = page.getByLabel(/pick the one to evaluate/);
    await expect(picker).toHaveValue(ROOT_DECISION);
    // And the required decision is offered, rather than filtered out of sight.
    await expect(picker.locator(`option[value="${REQUIRED_DECISION}"]`)).toHaveCount(1);

    // ---- 4. the generated request body is usable as-is -------------------
    // The generator reads the <inputValues> enumeration to pick an example
    // norm, and recognises peildatum as a date by name. Before this model
    // declared <inputData> and enumerated its norms, it produced nothing at
    // all — so this asserts a body was built for BOTH inputs, without
    // asserting today's date, which would rot.
    // toHaveValue, not toContainText: this is a controlled <textarea> whose
    // content lives in the value property, not in its text nodes, so a
    // text-content assertion would compare against an empty string and pass
    // only by matching nothing.
    const requestBody = page.getByPlaceholder(
      'Enter JSON request body or upload a DMN file to auto-generate'
    );
    await expect(requestBody).toHaveValue(/"peildatum"/);
    await expect(requestBody).toHaveValue(/Alleenstaande in inrichting norm/);

    // ---- 5. deploy --------------------------------------------------------
    await page.getByRole('button', { name: /Deploy to Operaton/ }).click();

    const evaluate = page.getByRole('button', { name: /Evaluate Decision/ });
    await expect(evaluate).toBeEnabled({ timeout: 60_000 });

    // ---- 6. four evaluations, four answers -------------------------------
    const response = page.locator('pre').filter({ hasText: 'bedrag' });

    for (const [index, evaluation] of EVALUATIONS.entries()) {
      await test.step(`${index + 1}. ${evaluation.what} -> ${evaluation.expect}`, async () => {
        await requestBody.fill(body(evaluation));
        await evaluate.click();

        if (index === 0) {
          // Only meaningful the first time. Once a response has rendered the
          // badge stays put, so on later rounds it would assert nothing —
          // the value assertion below is what proves the new answer arrived.
          await expect(page.getByText('200 OK')).toBeVisible({ timeout: 60_000 });
        }

        // Every expected value in EVALUATIONS is distinct, so waiting for this
        // text cannot be satisfied by the previous round's response still on
        // screen. That is what makes a loop of assertions safe here.
        await expect(response).toContainText(evaluation.expect, { timeout: 60_000 });
      });
    }

    // ---- 7. export, and check what was written ---------------------------
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download TTL' }).click();
    const ttl = readFileSync(await (await downloadPromise).path(), 'utf8');

    expect(ttl).toContain('@prefix cpsv:');
    expect(ttl).toContain(SERVICE.identifier);
    expect(ttl).toContain(SERVICE.name);
    expect(ttl).toContain(ORGANIZATION.name);

    // The model that was actually evaluated, and the decision key it was
    // evaluated under, both landed in the export.
    expect(ttl).toContain(ROOT_DECISION);

    // ---- 8. the cell grounding survived the round trip ------------------
    // The fixture carries cprmv:sourceQuote/cprmv:isBasedOn on 80 cells and
    // cprmv:validFrom/validUntil on its five termijn rules. Asserting them here
    // is what makes this journey cover Layers 1-3 rather than just evaluation:
    // the attributes have to be parsed out of the DMN by dmnHelpers and
    // re-emitted as cprmv:Rule resources by ttlGenerator to appear at all.
    expect(ttl).toContain('cprmv:sourceQuote');
    expect(ttl).toContain('https://cprmv.open-regels.nl/rules/BWBR0015703_2026-07-01_0_');
    expect(ttl).toContain('cprmv:validFrom "2026-07-01"^^xsd:date');
    expect(ttl).toContain('cprmv:validUntil "2026-12-31"^^xsd:date');
  });
});
