import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { createDefaultConcept } from '../../hooks/useArrayHandlers';
import ConceptsTab from './ConceptsTab';

/**
 * Editing a concept's variable name, and adding one.
 *
 * The variable name is not just a label: it is the last segment of the concept's
 * URI, so editing it rewrites the URI in the same update. Both happen through
 * setConcepts over the whole array, which means every other concept has to
 * survive the map untouched — the part worth testing, and the part a
 * single-concept fixture cannot show.
 */

const aConcept = (overrides = {}) => ({ id: 1, ...createDefaultConcept(), ...overrides });

/**
 * A harness that owns the concepts array.
 *
 * ConceptsTab calls setConcepts with a whole new array, so a vi.fn() would
 * record the call but never re-render — and the paths that run after a concept
 * is added, which look for it in the DOM, would have nothing to find.
 */
function Harness({ initial }) {
  const [concepts, setConcepts] = useState(initial);
  return (
    <ConceptsTab
      concepts={concepts}
      removeConcept={vi.fn()}
      updateConcept={vi.fn()}
      setConcepts={setConcepts}
    />
  );
}

const variableNameField = (name) => screen.getByDisplayValue(name);

describe('ConceptsTab variable name editing', () => {
  test('renaming an input concept rewrites its URI and leaves the others alone', () => {
    const setConcepts = vi.fn();
    render(
      <ConceptsTab
        concepts={[
          aConcept({
            id: 1,
            linkedToType: 'input',
            variableName: 'leeftijd',
            uri: 'https://example.org/concepts/leeftijd',
          }),
          aConcept({
            id: 2,
            linkedToType: 'input',
            variableName: 'inkomen',
            uri: 'https://example.org/concepts/inkomen',
          }),
        ]}
        removeConcept={vi.fn()}
        updateConcept={vi.fn()}
        setConcepts={setConcepts}
      />
    );

    fireEvent.change(variableNameField('leeftijd'), { target: { value: 'geboorte datum' } });

    expect(setConcepts).toHaveBeenCalledWith([
      // Spaces are not legal in an IRI segment, so the name is sanitised and
      // the URI is rebuilt from the same base.
      expect.objectContaining({
        id: 1,
        variableName: 'geboorte_datum',
        uri: 'https://example.org/concepts/geboorte_datum',
      }),
      expect.objectContaining({
        id: 2,
        variableName: 'inkomen',
        uri: 'https://example.org/concepts/inkomen',
      }),
    ]);
  });

  test('renaming an output concept does the same in the outputs section', () => {
    const setConcepts = vi.fn();
    render(
      <ConceptsTab
        concepts={[
          aConcept({
            id: 1,
            linkedToType: 'output',
            variableName: 'zorgtoeslag',
            uri: 'https://example.org/concepts/zorgtoeslag',
          }),
          aConcept({
            id: 2,
            linkedToType: 'output',
            variableName: 'recht',
            uri: 'https://example.org/concepts/recht',
          }),
        ]}
        removeConcept={vi.fn()}
        updateConcept={vi.fn()}
        setConcepts={setConcepts}
      />
    );

    fireEvent.change(variableNameField('zorgtoeslag'), { target: { value: 'hoogte' } });

    expect(setConcepts).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1, variableName: 'hoogte' }),
      expect.objectContaining({ id: 2, variableName: 'recht' }),
    ]);
  });
});

describe('ConceptsTab adding a concept', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  test('a newly added concept is scrolled to and focused', () => {
    // scrollIntoView is not implemented in jsdom; the component calls it on the
    // element it just found, so it has to exist for the focus step to run.
    Element.prototype.scrollIntoView = vi.fn();
    // The tab shows an explanatory empty state instead of the editor when there
    // are no concepts, so the Add button needs at least one to exist.
    render(
      <Harness initial={[aConcept({ id: 1, linkedToType: 'input', variableName: 'leeftijd' })]} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Input Concept/ }));

    act(() => vi.advanceTimersByTime(200));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement?.tagName).toBe('INPUT');
  });
});

describe('ConceptsTab call to action', () => {
  test('the DMN call to action is inert when there is no DMN tab to switch to', () => {
    // Concepts are generated from a DMN model, so the empty state points at the
    // DMN tab. The button finds that tab by data-tab-id and does nothing when
    // the component is rendered on its own, as it is here — the guard exists so
    // this is a no-op rather than a crash.
    render(<Harness initial={[]} />);

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /Go to DMN tab/ }))
    ).not.toThrow();
  });
});
