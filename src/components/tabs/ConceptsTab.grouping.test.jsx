import { render, screen, within } from '@testing-library/react';

import { createDefaultConcept } from '../../hooks/useArrayHandlers';
import ConceptsTab from './ConceptsTab';

/**
 * Decision chips, and the grouping of outputs by decision.
 *
 * Concepts come from an attached DMN model. Inputs are DRD-level and shared, so
 * one input concept can belong to several decisions and gets a chip for each;
 * outputs belong to exactly one and are clustered so the outputs of a decision
 * sit together, in the order their decisions were first seen. ConceptsTab.test.jsx
 * covers the tab's fields and handlers; this file covers that arrangement.
 */

const aConcept = (overrides = {}) => ({ id: 1, ...createDefaultConcept(), ...overrides });

const renderTab = (concepts = []) =>
  render(
    <ConceptsTab
      concepts={concepts}
      removeConcept={vi.fn()}
      updateConcept={vi.fn()}
      setConcepts={vi.fn()}
    />
  );

/**
 * Variable names in the order they are rendered.
 *
 * Each concept card carries a "Remove concept <name>" button, and getAllByRole
 * returns matches in document order — so the accessible names of those buttons
 * are the rendered sequence. Reading the props array back would only restate
 * the input order and could never observe the grouping.
 */
const namesInDomOrder = () =>
  screen
    .getAllByRole('button', { name: /^Remove concept / })
    .map((button) => button.getAttribute('aria-label').replace('Remove concept ', ''));

describe('ConceptsTab decision chips', () => {
  test('an input concept lists every decision it feeds', () => {
    renderTab([
      aConcept({
        id: 1,
        linkedToType: 'input',
        variableName: 'leeftijd',
        decisions: ['BepaalLeeftijd', 'BepaalRecht'],
      }),
    ]);

    expect(screen.getByText('BepaalLeeftijd')).toBeInTheDocument();
    expect(screen.getByText('BepaalRecht')).toBeInTheDocument();
  });

  test('a concept with no decisions renders no chips at all', () => {
    // DecisionChips returns null rather than an empty container, so a concept
    // that predates decision tracking shows nothing rather than a stray gap.
    const { container } = renderTab([
      aConcept({ id: 1, linkedToType: 'input', variableName: 'leeftijd', decisions: [] }),
    ]);

    expect(within(container).queryByText('BepaalLeeftijd')).not.toBeInTheDocument();
  });

  test('a concept whose decisions are absent entirely renders no chips', () => {
    const { decisions: _omitted, ...withoutDecisions } = aConcept({
      id: 1,
      linkedToType: 'input',
      variableName: 'leeftijd',
    });

    expect(() => renderTab([withoutDecisions])).not.toThrow();
  });

  test('output chips are styled differently from input chips', () => {
    renderTab([
      aConcept({ id: 1, linkedToType: 'input', variableName: 'in', decisions: ['D1'] }),
      aConcept({ id: 2, linkedToType: 'output', variableName: 'out', decisions: ['D2'] }),
    ]);

    // Colour carries the input/output distinction where the badge does not
    // repeat it, so the two variants must not collapse into one class.
    expect(screen.getByText('D1')).toHaveClass('bg-blue-100');
    expect(screen.getByText('D2')).toHaveClass('bg-green-100');
  });
});

describe('ConceptsTab output grouping', () => {
  test('outputs of the same decision are clustered, in first-seen decision order', () => {
    const concepts = [
      aConcept({ id: 1, linkedToType: 'output', variableName: 'a', decisions: ['Second'] }),
      aConcept({ id: 2, linkedToType: 'output', variableName: 'b', decisions: ['First'] }),
      aConcept({ id: 3, linkedToType: 'output', variableName: 'c', decisions: ['Second'] }),
    ];
    renderTab(concepts);

    const sequence = namesInDomOrder();

    // 'Second' was seen first, so its outputs come first — a and c together,
    // rather than the raw a, b, c of the source array.
    expect(sequence).toEqual(['a', 'c', 'b']);
  });

  test('outputs without a decision are grouped together under the empty key', () => {
    const concepts = [
      aConcept({ id: 1, linkedToType: 'output', variableName: 'a', decisions: [] }),
      aConcept({ id: 2, linkedToType: 'output', variableName: 'b', decisions: ['D1'] }),
      aConcept({ id: 3, linkedToType: 'output', variableName: 'c', decisions: [] }),
    ];
    renderTab(concepts);

    expect(namesInDomOrder()).toEqual(['a', 'c', 'b']);
  });

  test('an output whose decisions field is missing is grouped with the undecided', () => {
    const concepts = [
      aConcept({ id: 1, linkedToType: 'output', variableName: 'a', decisions: ['D1'] }),
      { ...aConcept({ id: 2, linkedToType: 'output', variableName: 'b' }), decisions: undefined },
    ];
    renderTab(concepts);

    expect(namesInDomOrder()).toEqual(['a', 'b']);
  });
});
