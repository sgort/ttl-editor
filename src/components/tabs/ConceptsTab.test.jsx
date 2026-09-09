import { fireEvent, render, screen } from '@testing-library/react';

import { createDefaultConcept } from '../../hooks/useArrayHandlers';
import ConceptsTab from './ConceptsTab';

const aConcept = (overrides = {}) => ({ id: 1, ...createDefaultConcept(), ...overrides });

const renderTab = (concepts = []) => {
  const props = {
    concepts,
    removeConcept: vi.fn(),
    updateConcept: vi.fn(),
    setConcepts: vi.fn(),
  };
  return { props, ...render(<ConceptsTab {...props} />) };
};

describe('ConceptsTab', () => {
  test('explains itself rather than showing an empty table when there are no concepts', () => {
    // Concepts are generated from an attached DMN model rather than typed by
    // hand, so an empty tab means "no DMN yet", not "add one here".
    renderTab();

    expect(screen.getByText('NL-SBB Concept Definitions')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g., Geboortedatum Aanvrager')).not.toBeInTheDocument();
  });

  test('renders a row per concept', () => {
    renderTab([aConcept({ id: 1 }), aConcept({ id: 2 })]);

    expect(screen.getAllByPlaceholderText('e.g., Geboortedatum Aanvrager')).toHaveLength(2);
  });

  test('editing the preferred label calls updateConcept with the item id', () => {
    const { props } = renderTab([aConcept({ id: 5 })]);

    fireEvent.change(screen.getByPlaceholderText('e.g., Geboortedatum Aanvrager'), {
      target: { value: 'Geboortedatum Aanvrager' },
    });

    expect(props.updateConcept).toHaveBeenCalledWith(5, 'prefLabel', 'Geboortedatum Aanvrager');
  });

  test('editing the notation reaches the same handler with a different field', () => {
    const { props } = renderTab([aConcept({ id: 5 })]);

    fireEvent.change(screen.getByPlaceholderText('e.g., GA'), { target: { value: 'GA' } });

    expect(props.updateConcept).toHaveBeenCalledWith(5, 'notation', 'GA');
  });
});
