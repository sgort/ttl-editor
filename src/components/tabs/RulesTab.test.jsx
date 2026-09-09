import { fireEvent, render, screen } from '@testing-library/react';

import { createDefaultTemporalRule } from '../../hooks/useArrayHandlers';
import RulesTab from './RulesTab';

const aRule = (overrides = {}) => ({ id: 1, ...createDefaultTemporalRule(), ...overrides });

const renderTab = (temporalRules = []) => {
  const props = {
    temporalRules,
    addTemporalRule: vi.fn(),
    removeTemporalRule: vi.fn(),
    updateTemporalRule: vi.fn(),
  };
  return { props, ...render(<RulesTab {...props} />) };
};

describe('RulesTab', () => {
  test('renders without crashing when there are no rules', () => {
    const { container } = renderTab();

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByPlaceholderText('e.g., rule-001')).not.toBeInTheDocument();
  });

  test('renders a row per temporal rule', () => {
    renderTab([aRule({ id: 1 }), aRule({ id: 2 })]);

    expect(screen.getAllByPlaceholderText('e.g., rule-001')).toHaveLength(2);
  });

  test('editing the identifier calls updateTemporalRule with the item id', () => {
    const { props } = renderTab([aRule({ id: 4 })]);

    fireEvent.change(screen.getByPlaceholderText('e.g., rule-001'), {
      target: { value: 'rule-001' },
    });

    expect(props.updateTemporalRule).toHaveBeenCalledWith(4, 'identifier', 'rule-001');
  });

  test('editing the URI reaches the same handler with a different field', () => {
    const { props } = renderTab([aRule({ id: 4 })]);

    fireEvent.change(screen.getByPlaceholderText('https://regels.overheid.nl/rules/...'), {
      target: { value: 'https://regels.overheid.nl/rules/aow' },
    });

    expect(props.updateTemporalRule).toHaveBeenCalledWith(
      4,
      'uri',
      'https://regels.overheid.nl/rules/aow'
    );
  });
});
