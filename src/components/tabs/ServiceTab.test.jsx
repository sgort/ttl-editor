import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ServiceTab from './ServiceTab';

// P5 smoke coverage. Deliberately thin: each component renders with realistic
// props, and one representative field proves the controlled-component contract
// — edit reaches the setter with the right shape. Exhaustive per-field coverage
// is not the goal; catching a component that stops rendering or stops wiring up
// its handlers is.
//
// Queries go through placeholder text because no form control in this tree is
// associated with its label — 102 controls, zero ids. The follow-up PR fixes
// that and migrates these queries to getByLabelText, which is what will prove
// the associations actually resolve rather than merely exist.

const service = {
  identifier: '',
  name: '',
  description: '',
  authority: '',
  sector: '',
  customSector: '',
  keywords: '',
  language: '',
};
const cost = { identifier: '', value: '', description: '', currency: 'EUR' };
const output = { identifier: '', name: '', description: '', type: '' };

const renderTab = (overrides = {}) => {
  const props = {
    service,
    setService: vi.fn(),
    cost,
    setCost: vi.fn(),
    output,
    setOutput: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ServiceTab {...props} />) };
};

describe('ServiceTab', () => {
  test('renders the mandatory service fields', () => {
    renderTab();

    expect(screen.getByPlaceholderText('e.g., aow-leeftijd')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., AOW Leeftijdsbepaling')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the service...')).toBeInTheDocument();
  });

  test('editing the identifier calls setService with the field merged in', () => {
    const { props } = renderTab();

    fireEvent.change(screen.getByPlaceholderText('e.g., aow-leeftijd'), {
      target: { value: 'aow-leeftijd' },
    });

    // The whole object is passed back, not just the changed field — this is the
    // contract App.jsx depends on, and the reason updateField spreads.
    expect(props.setService).toHaveBeenCalledWith({ ...service, identifier: 'aow-leeftijd' });
  });

  test('renders the nested CostSection and OutputSection', () => {
    renderTab();

    expect(screen.getByPlaceholderText('e.g., cost-001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., output-001')).toBeInTheDocument();
  });
});

describe('ServiceTab custom sector', () => {
  const SECTOR_LABEL = /Government level providing this service/;
  const NATIONAL =
    'https://publications.europa.eu/resource/authority/corporate-body-classification/NATIONAL';

  // Sector and customSector are written in one setState so they can never
  // disagree: picking anything but "custom" has to clear the free-text URI, or
  // a stale value keeps being serialised into the TTL long after the user
  // stopped choosing "custom".
  test('choosing "custom" keeps whatever custom URI was already entered', () => {
    const { props } = renderTab({
      service: { ...service, sector: '', customSector: 'https://example.org/kept' },
    });

    fireEvent.change(screen.getByLabelText(SECTOR_LABEL), { target: { value: 'custom' } });

    expect(props.setService).toHaveBeenCalledWith(
      expect.objectContaining({ sector: 'custom', customSector: 'https://example.org/kept' })
    );
  });

  test('choosing a listed sector clears the custom URI', () => {
    const { props } = renderTab({
      service: { ...service, sector: 'custom', customSector: 'https://example.org/stale' },
    });

    fireEvent.change(screen.getByLabelText(SECTOR_LABEL), { target: { value: NATIONAL } });

    expect(props.setService).toHaveBeenCalledWith(
      expect.objectContaining({ sector: NATIONAL, customSector: '' })
    );
  });

  test('the custom URI field appears only for "custom" and shows the current value', () => {
    renderTab({ service: { ...service, sector: 'custom', customSector: 'https://example.org/x' } });

    expect(screen.getByLabelText('Custom sector URI')).toHaveValue('https://example.org/x');
  });

  test('the custom URI field renders empty rather than uncontrolled when unset', () => {
    // customSector is absent, not empty-string: an imported service that never
    // had the field. Without the || '' the input would go uncontrolled and
    // React would warn.
    const { customSector: _omitted, ...withoutCustom } = service;
    renderTab({ service: { ...withoutCustom, sector: 'custom' } });

    expect(screen.getByLabelText('Custom sector URI')).toHaveValue('');
  });

  test('no custom URI field is offered for a listed sector', () => {
    renderTab({ service: { ...service, sector: NATIONAL } });

    expect(screen.queryByLabelText('Custom sector URI')).not.toBeInTheDocument();
  });
});

// "Required services" (dct:requires, issue #223). The picker lists the public
// services published to the configured Triply dataset; the real
// buildDatasetSparqlUrl decides whether there is anything to fetch from, and
// only the network call is mocked.
vi.mock('../../utils/serviceCatalogHelper', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPublishedServices: vi.fn(),
}));

describe('ServiceTab required services', () => {
  const RECHT = 'https://regels.overheid.nl/services/recht-op-subsidie-thuisbatterij-flevoland';
  const OWN = 'https://regels.overheid.nl/services/hoogte-subsidie';
  const CONFIG = {
    baseUrl: 'https://api.open-regels.triply.cc',
    account: 'stevengort',
    dataset: 'PublishTest',
  };
  const hoogte = { ...service, identifier: 'hoogte-subsidie', requires: [] };

  let fetchPublishedServices;
  beforeEach(async () => {
    ({ fetchPublishedServices } = await import('../../utils/serviceCatalogHelper'));
    fetchPublishedServices.mockReset();
    fetchPublishedServices.mockResolvedValue([
      { uri: RECHT, title: 'Recht op subsidie' },
      { uri: OWN, title: 'Self' },
    ]);
  });

  const pasteUri = (value) => {
    fireEvent.change(screen.getByLabelText('Required service URI'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Add URI' }));
  };

  test('lists published services, without itself, and adds one', async () => {
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });

    const select = screen.getByLabelText('Published service');
    expect(await screen.findByRole('option', { name: 'Recht op subsidie' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Self' })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: RECHT } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [RECHT] });
  });

  test('adds a pasted URI', async () => {
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });
    await screen.findByRole('option', { name: 'Recht op subsidie' });

    pasteUri(RECHT);

    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [RECHT] });
  });

  test('trims and de-duplicates a pasted URI', async () => {
    const { props } = renderTab({
      service: { ...hoogte, requires: [RECHT] },
      triplyDBConfig: CONFIG,
    });
    // Already listed, so not offered in the picker; its entry gains the title
    // once the list has loaded.
    await screen.findByRole('button', { name: 'Remove Recht op subsidie' });
    expect(screen.queryByRole('option', { name: 'Recht op subsidie' })).not.toBeInTheDocument();

    pasteUri(`  ${RECHT} `);

    expect(props.setService).not.toHaveBeenCalled();
    expect(screen.getByText(/already listed/i)).toBeInTheDocument();
  });

  test('rejects its own URI and a value that is not an http(s) URI', async () => {
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });
    await screen.findByRole('option', { name: 'Recht op subsidie' });

    pasteUri(OWN);
    expect(screen.getByText(/cannot require itself/i)).toBeInTheDocument();
    pasteUri('urn:example:not-http');
    expect(screen.getByText(/http\(s\) URI/i)).toBeInTheDocument();

    expect(props.setService).not.toHaveBeenCalled();
  });

  test('rejects a URI with characters Turtle does not allow in an IRI', async () => {
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });
    await screen.findByRole('option', { name: 'Recht op subsidie' });

    // Would be written as `dct:requires <https://x.org/y>> ;` — invalid Turtle.
    for (const bad of ['https://x.org/y>', 'https://x.org/"y"', 'https://x.org/{y}']) {
      pasteUri(bad);
      expect(screen.getByText(/http\(s\) URI/i)).toBeInTheDocument();
    }

    expect(props.setService).not.toHaveBeenCalled();
  });

  test('accepts a URI pasted with its Turtle angle brackets', async () => {
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });
    await screen.findByRole('option', { name: 'Recht op subsidie' });

    pasteUri(`<${RECHT}>`);

    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [RECHT] });
  });

  test('removes an entry, naming it by its title when known', async () => {
    const { props } = renderTab({
      service: { ...hoogte, requires: [RECHT] },
      triplyDBConfig: CONFIG,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Recht op subsidie' }));

    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [] });
  });

  test('pasting still works when the list fails to load', async () => {
    fetchPublishedServices.mockRejectedValue(new Error('HTTP 500'));
    const { props } = renderTab({ service: hoogte, triplyDBConfig: CONFIG });

    expect(await screen.findByText(/could not load published services/i)).toBeInTheDocument();
    pasteUri(RECHT);

    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [RECHT] });
  });

  test('does not fetch without a config, and still accepts a pasted URI', () => {
    const { props } = renderTab({ service: hoogte });

    expect(fetchPublishedServices).not.toHaveBeenCalled();
    pasteUri(RECHT);
    expect(props.setService).toHaveBeenCalledWith({ ...hoogte, requires: [RECHT] });
  });

  test('Refresh list fetches the published services again', async () => {
    renderTab({ service: hoogte, triplyDBConfig: CONFIG });
    await screen.findByRole('option', { name: 'Recht op subsidie' });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }));

    await waitFor(() => expect(fetchPublishedServices).toHaveBeenCalledTimes(2));
  });

  test('a service without a requires key renders an empty list', () => {
    renderTab();

    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });
});
