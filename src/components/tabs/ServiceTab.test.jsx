import { fireEvent, render, screen } from '@testing-library/react';

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
