import { fireEvent, render, screen } from '@testing-library/react';

import { createDefaultCprmvRule } from '../../hooks/useArrayHandlers';
import CPRMVTab from './CPRMVTab';

const aRule = (overrides = {}) => ({ id: 1, ...createDefaultCprmvRule(), ...overrides });

const renderTab = (cprmvRules = []) => {
  const props = {
    cprmvRules,
    addCPRMVRule: vi.fn(),
    removeCPRMVRule: vi.fn(),
    updateCPRMVRule: vi.fn(),
    handleImportJSON: vi.fn(),
    setCprmvRules: vi.fn(),
    legalResource: { bwbId: '', version: '', title: '', description: '' },
  };
  return { props, ...render(<CPRMVTab {...props} />) };
};

describe('CPRMVTab', () => {
  test('renders without crashing when there are no rules', () => {
    const { container } = renderTab();

    expect(container).not.toBeEmptyDOMElement();
    expect(
      screen.queryByPlaceholderText(
        'e.g., BWBR0015703_2025-07-01_0, Artikel 20, lid 1, onderdeel a.'
      )
    ).not.toBeInTheDocument();
  });

  test('renders a row per rule', () => {
    renderTab([aRule({ id: 1 }), aRule({ id: 2 })]);

    expect(
      screen.getAllByPlaceholderText(
        'e.g., BWBR0015703_2025-07-01_0, Artikel 20, lid 1, onderdeel a.'
      )
    ).toHaveLength(2);
  });

  test('editing the rule path calls updateCPRMVRule with the item id', () => {
    const { props } = renderTab([aRule({ id: 6 })]);

    fireEvent.change(
      screen.getByPlaceholderText(
        'e.g., BWBR0015703_2025-07-01_0, Artikel 20, lid 1, onderdeel a.'
      ),
      { target: { value: 'BWBR0015703_2025-07-01_0' } }
    );

    expect(props.updateCPRMVRule).toHaveBeenCalledWith(6, 'ruleIdPath', 'BWBR0015703_2025-07-01_0');
  });
});
