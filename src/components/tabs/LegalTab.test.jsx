import { fireEvent, render, screen } from '@testing-library/react';

import LegalTab from './LegalTab';

const legalResource = { bwbId: '', version: '', title: '', description: '' };

const renderTab = (overrides = {}) => {
  const props = {
    legalResource,
    setLegalResource: vi.fn(),
    ronlAnalysis: '',
    setRonlAnalysis: vi.fn(),
    ronlMethod: '',
    setRonlMethod: vi.fn(),
    analysisConcepts: [],
    methodConcepts: [],
    loadingConcepts: false,
    conceptsFailed: false,
    ...overrides,
  };
  return { props, ...render(<LegalTab {...props} />) };
};

describe('LegalTab', () => {
  test('renders the legal resource identifier field', () => {
    renderTab();

    expect(
      screen.getByPlaceholderText('e.g., BWBR0011453 or CVDR123456 or https://...')
    ).toBeInTheDocument();
  });

  test('editing the BWB identifier calls setLegalResource with the field merged in', () => {
    const { props } = renderTab();

    fireEvent.change(
      screen.getByPlaceholderText('e.g., BWBR0011453 or CVDR123456 or https://...'),
      { target: { value: 'BWBR0011453' } }
    );

    expect(props.setLegalResource).toHaveBeenCalledWith({ ...legalResource, bwbId: 'BWBR0011453' });
  });

  test('renders without crashing while RONL concepts are still loading', () => {
    renderTab({ loadingConcepts: true });

    expect(
      screen.getByPlaceholderText('e.g., BWBR0011453 or CVDR123456 or https://...')
    ).toBeInTheDocument();
  });

  test('names concepts, not vendors, when the RONL fetch failed', () => {
    renderTab({ conceptsFailed: true });

    // The same fetch feeds the Vendor tab, which calls the results vendors.
    // This tab has to say concepts.
    expect(screen.getByText(/Failed to load concepts from TriplyDB/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g., BWBR0011453 or CVDR123456 or https://...')
    ).toBeInTheDocument();
  });
});
