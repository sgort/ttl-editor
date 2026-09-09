import { fireEvent, render, screen } from '@testing-library/react';

import { createDefaultParameter } from '../../hooks/useArrayHandlers';
import ParametersTab from './ParametersTab';

const aParameter = (overrides = {}) => ({ id: 1, ...createDefaultParameter(), ...overrides });

const renderTab = (parameters = []) => {
  const props = {
    parameters,
    addParameter: vi.fn(),
    removeParameter: vi.fn(),
    updateParameter: vi.fn(),
  };
  return { props, ...render(<ParametersTab {...props} />) };
};

describe('ParametersTab', () => {
  test('renders without crashing when there are no parameters', () => {
    const { container } = renderTab();

    expect(container).not.toBeEmptyDOMElement();
    expect(
      screen.queryByPlaceholderText('BOVENGRENS_INKOMEN_ALLEENSTAANDE')
    ).not.toBeInTheDocument();
  });

  test('renders a row per parameter', () => {
    renderTab([aParameter({ id: 1 }), aParameter({ id: 2 })]);

    expect(screen.getAllByPlaceholderText('BOVENGRENS_INKOMEN_ALLEENSTAANDE')).toHaveLength(2);
  });

  test('editing a field calls updateParameter with the item id, not its index', () => {
    // The contract is id-based deliberately: rows can be removed from the middle,
    // and an index captured at render time would then address the wrong item.
    const { props } = renderTab([aParameter({ id: 7 })]);

    fireEvent.change(screen.getByPlaceholderText('BOVENGRENS_INKOMEN_ALLEENSTAANDE'), {
      target: { value: 'BOVENGRENS_INKOMEN' },
    });

    expect(props.updateParameter).toHaveBeenCalledWith(7, 'notation', 'BOVENGRENS_INKOMEN');
  });

  test('the id passed back identifies the edited row, not the first one', () => {
    const { props } = renderTab([aParameter({ id: 3 }), aParameter({ id: 9 })]);

    fireEvent.change(screen.getAllByPlaceholderText('BOVENGRENS_INKOMEN_ALLEENSTAANDE')[1], {
      target: { value: 'SECOND' },
    });

    expect(props.updateParameter).toHaveBeenCalledWith(9, 'notation', 'SECOND');
  });
});
