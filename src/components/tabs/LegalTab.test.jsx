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
    conceptsError: null,
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

  test('renders without crashing when the RONL concept fetch failed', () => {
    renderTab({ conceptsError: 'Failed to fetch concepts' });

    expect(
      screen.getByPlaceholderText('e.g., BWBR0011453 or CVDR123456 or https://...')
    ).toBeInTheDocument();
  });
});
