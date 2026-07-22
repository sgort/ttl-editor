import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';

import {
  createDefaultCprmvRule,
  createDefaultParameter,
  createDefaultTemporalRule,
  useArrayHandlers,
  useCprmvRulesHandlers,
  useParametersHandlers,
  useTemporalRulesHandlers,
} from './useArrayHandlers';

// useArrayHandlers only returns handlers, not the array itself — this harness
// wraps it in a real useState so handleAdd/handleUpdate/etc.'s effect on
// state is actually observable across re-renders, the way a real component
// would use it.
function useHarness(initial, createDefaultItem) {
  const [items, setItems] = useState(initial);
  const handlers = useArrayHandlers(items, setItems, createDefaultItem);
  return { items, ...handlers };
}

describe('useArrayHandlers', () => {
  test('handleAdd appends a new item with a fresh sequential id', () => {
    const { result } = renderHook(() => useHarness([], createDefaultTemporalRule));

    act(() => result.current.handleAdd());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(1);
    expect(result.current.items[0]).toMatchObject(createDefaultTemporalRule());

    act(() => result.current.handleAdd());
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1].id).toBe(2);
  });

  test('handleAdd continues from the highest existing id, not the array length', () => {
    const { result } = renderHook(() =>
      useHarness([{ id: 5, notation: 'X' }], createDefaultParameter)
    );

    act(() => result.current.handleAdd());
    expect(result.current.items[1].id).toBe(6);
  });

  test('handleUpdate merges fields into the matching item only', () => {
    const { result } = renderHook(() =>
      useHarness(
        [
          { id: 1, ruleId: 'a' },
          { id: 2, ruleId: 'b' },
        ],
        createDefaultCprmvRule
      )
    );

    act(() => result.current.handleUpdate(2, { ruleId: 'updated' }));
    expect(result.current.items).toEqual([
      { id: 1, ruleId: 'a' },
      { id: 2, ruleId: 'updated' },
    ]);
  });

  test('handleUpdateField updates a single field via handleUpdate', () => {
    const { result } = renderHook(() =>
      useHarness([{ id: 1, notation: 'old' }], createDefaultParameter)
    );

    act(() => result.current.handleUpdateField(1, 'notation', 'new'));
    expect(result.current.items[0].notation).toBe('new');
  });

  test('handleRemove drops only the matching item', () => {
    const { result } = renderHook(() =>
      useHarness(
        [
          { id: 1, ruleId: 'a' },
          { id: 2, ruleId: 'b' },
        ],
        createDefaultCprmvRule
      )
    );

    act(() => result.current.handleRemove(1));
    expect(result.current.items).toEqual([{ id: 2, ruleId: 'b' }]);
  });

  test('handleClear empties the array', () => {
    const { result } = renderHook(() => useHarness([{ id: 1 }, { id: 2 }], createDefaultParameter));

    act(() => result.current.handleClear());
    expect(result.current.items).toEqual([]);
  });

  test('handleReplace swaps in an entirely new array', () => {
    const { result } = renderHook(() => useHarness([{ id: 1 }], createDefaultParameter));

    const replacement = [{ id: 99, notation: 'X' }];
    act(() => result.current.handleReplace(replacement));
    expect(result.current.items).toBe(replacement);
  });
});

describe('default item factories', () => {
  test('createDefaultTemporalRule matches the expected shape', () => {
    expect(createDefaultTemporalRule()).toEqual({
      identifier: '',
      title: '',
      uri: '',
      extends: '',
      validFrom: '',
      validUntil: '',
      confidenceLevel: 'high',
      description: '',
    });
  });

  test('createDefaultParameter matches the expected shape', () => {
    expect(createDefaultParameter()).toEqual({
      notation: '',
      label: '',
      value: '',
      unit: 'EUR',
      description: '',
      validFrom: '',
      validUntil: '',
    });
  });

  test('createDefaultCprmvRule matches the expected shape', () => {
    expect(createDefaultCprmvRule()).toEqual({
      ruleId: '',
      rulesetId: '',
      definition: '',
      situatie: '',
      norm: '',
      ruleIdPath: '',
    });
  });
});

describe('pre-configured array hooks', () => {
  test('useTemporalRulesHandlers adds a temporal-rule-shaped item', () => {
    const { result } = renderHook(() => {
      const [temporalRules, setTemporalRules] = useState([]);
      return { temporalRules, ...useTemporalRulesHandlers(temporalRules, setTemporalRules) };
    });

    act(() => result.current.handleAdd());
    expect(result.current.temporalRules[0]).toMatchObject({ confidenceLevel: 'high' });
  });

  test('useParametersHandlers adds a parameter-shaped item', () => {
    const { result } = renderHook(() => {
      const [parameters, setParameters] = useState([]);
      return { parameters, ...useParametersHandlers(parameters, setParameters) };
    });

    act(() => result.current.handleAdd());
    expect(result.current.parameters[0]).toMatchObject({ unit: 'EUR' });
  });

  test('useCprmvRulesHandlers adds a cprmv-rule-shaped item', () => {
    const { result } = renderHook(() => {
      const [cprmvRules, setCprmvRules] = useState([]);
      return { cprmvRules, ...useCprmvRulesHandlers(cprmvRules, setCprmvRules) };
    });

    act(() => result.current.handleAdd());
    expect(result.current.cprmvRules[0]).toMatchObject({ ruleId: '' });
  });
});
