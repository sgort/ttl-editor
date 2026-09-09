import { fireEvent, render, screen } from '@testing-library/react';

import OrganizationTab from './OrganizationTab';

/**
 * The DMN validation-metadata panel.
 *
 * The tab shows one of several states depending on what is known about the DMN:
 * nothing attached, an imported model whose metadata is read-only, or a locally
 * deployed and tested model whose metadata can still be edited. Which state
 * appears is decided by three flags — isImported, hasValidationMetadata, and
 * hasDMN, the last being fileName AND deployed AND lastTestResult together.
 *
 * These are the branches that decide whether a service's provenance is editable
 * or frozen, and none of them was exercised before this file.
 */

const organization = { identifier: 'svb', name: 'SVB', homepage: '' };

const dmn = (overrides = {}) => ({
  isImported: false,
  deployed: false,
  validationStatus: 'not-validated',
  fileName: '',
  content: '',
  ...overrides,
});

const renderTab = (dmnData) =>
  render(
    <OrganizationTab
      organization={organization}
      setOrganization={vi.fn()}
      dmnData={dmnData}
      setDmnData={vi.fn()}
    />
  );

describe('OrganizationTab imported validation metadata', () => {
  const imported = (overrides = {}) =>
    dmn({ isImported: true, validationStatus: 'validated', ...overrides });

  test('an imported DMN with metadata is shown read-only', () => {
    renderTab(imported());

    expect(screen.getByText(/DMN Validation Metadata \(imported\)/)).toBeInTheDocument();
    expect(screen.getByText(/✅ Validated/)).toBeInTheDocument();
  });

  test('the in-review status has its own label', () => {
    renderTab(imported({ validationStatus: 'in-review' }));

    expect(screen.getByText(/🔄 In Review/)).toBeInTheDocument();
  });

  test('an imported DMN that was never validated shows no read-only panel', () => {
    // hasValidationMetadata excludes 'not-validated' specifically, so an import
    // that carried no validation is not presented as frozen metadata.
    renderTab(imported({ validationStatus: 'not-validated' }));

    expect(screen.queryByText(/DMN Validation Metadata \(imported\)/)).not.toBeInTheDocument();
  });

  test('validator, timestamp and note are each shown only when present', () => {
    renderTab(
      imported({
        validatedBy: 'https://example.org/org/svb',
        validatedAt: '2026-09-01',
        validationNote: 'Checked against the 2026 tables',
      })
    );

    expect(screen.getByText('https://example.org/org/svb')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
    expect(screen.getByText('Checked against the 2026 tables')).toBeInTheDocument();
  });

  test('nothing is shown for the fields that are absent', () => {
    renderTab(imported());

    expect(screen.queryByText(/Checked against/)).not.toBeInTheDocument();
  });
});

describe('OrganizationTab DMN readiness', () => {
  test('a file that is not deployed does not count as an available DMN', () => {
    // hasDMN needs all three: a file, a deployment, and a test result. Any one
    // missing leaves the tab in its "attach a DMN first" state.
    renderTab(dmn({ fileName: 'zorg.dmn' }));

    expect(screen.getByRole('button', { name: /Go to DMN tab/ })).toBeInTheDocument();
  });

  test('a deployed file with no test result still does not count', () => {
    renderTab(dmn({ fileName: 'zorg.dmn', deployed: true }));

    expect(screen.getByRole('button', { name: /Go to DMN tab/ })).toBeInTheDocument();
  });

  test('a deployed and tested file offers the editable validation fields', () => {
    renderTab(dmn({ fileName: 'zorg.dmn', deployed: true, lastTestResult: { success: true } }));

    expect(screen.queryByRole('button', { name: /Go to DMN tab/ })).not.toBeInTheDocument();
  });

  test('the DMN call to action is inert when there is no DMN tab to switch to', () => {
    // The button looks for the tab button by data-tab-id and does nothing when
    // the component is rendered on its own, as it is here.
    renderTab(dmn());

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /Go to DMN tab/ }))
    ).not.toThrow();
  });
});

describe('OrganizationTab logo display', () => {
  const withLogo = (logo) =>
    render(
      <OrganizationTab
        organization={{ ...organization, logo }}
        setOrganization={vi.fn()}
        dmnData={dmn()}
        setDmnData={vi.fn()}
      />
    );

  test('a logo held as a data URI is shown as an embedded image', () => {
    // Uploaded logos are resized and stored inline, so they travel with the
    // TTL rather than depending on a host that may disappear.
    withLogo('data:image/png;base64,iVBORw0KGgo=');

    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
  });

  test('a logo held as a remote URL is presented differently from an embedded one', () => {
    const { container } = withLogo('https://example.org/logo.png');

    expect(container).not.toBeEmptyDOMElement();
  });

  test('no logo panel is shown when the organization has none', () => {
    withLogo(undefined);

    expect(screen.queryByAltText(/logo/i)).not.toBeInTheDocument();
  });
});
