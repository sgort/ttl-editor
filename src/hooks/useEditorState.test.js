import { act, renderHook, waitFor } from '@testing-library/react';

import { iknowMappings } from '../config/iknow-mappings';
import { fetchAllRonlConcepts } from '../utils/ronlHelper';
import { useEditorState } from './useEditorState';

jest.mock('../utils/ronlHelper');

beforeEach(() => {
  localStorage.clear();
  fetchAllRonlConcepts.mockResolvedValue({ analysisConcepts: [], methodConcepts: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useEditorState — initial defaults', () => {
  test('every state slot starts at its documented default', async () => {
    const { result } = renderHook(() => useEditorState());
    // Let the RONL-concepts-loading effect settle before returning — it's not
    // under test here, but its async state update would otherwise land after
    // this test body returns, outside of act().
    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));

    expect(result.current.service).toMatchObject({ identifier: '', name: '', customSector: '' });
    expect(result.current.organization).toMatchObject({ identifier: '', name: '' });
    expect(result.current.legalResource).toMatchObject({ bwbId: '' });
    expect(result.current.ronlAnalysis).toBe('');
    expect(result.current.ronlMethod).toBe('');
    expect(result.current.temporalRules).toEqual([]);
    expect(result.current.parameters).toEqual([]);
    expect(result.current.cprmvRules).toEqual([]);
    expect(result.current.concepts).toEqual([]);
    expect(result.current.cost).toMatchObject({ currency: 'EUR' });
    expect(result.current.output).toMatchObject({ identifier: '' });
    expect(result.current.dmnData).toMatchObject({
      isImported: false,
      deployed: false,
      validationStatus: 'not-validated',
    });
    expect(result.current.vendorService.selectedVendor).toBe('');
    expect(result.current.iknowMappingConfig).toEqual({ mappings: {} });
  });

  test('loads the available iKnow mappings on mount', async () => {
    const { result } = renderHook(() => useEditorState());
    await waitFor(() => expect(result.current.availableIKnowMappings).toEqual(iknowMappings));
  });

  test('falls back to the default TriplyDB config when localStorage has nothing saved', async () => {
    const { result } = renderHook(() => useEditorState());
    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));
    expect(result.current.triplyDBConfig).toBeDefined();
  });
});

describe('useEditorState — RONL concepts loading', () => {
  test('transitions loading -> success and populates both concept lists', async () => {
    fetchAllRonlConcepts.mockResolvedValue({
      analysisConcepts: [{ uri: 'a1', label: 'Analysis 1' }],
      methodConcepts: [{ uri: 'm1', label: 'Method 1' }],
    });

    const { result } = renderHook(() => useEditorState());

    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));
    expect(result.current.ronlAnalysisConcepts).toEqual([{ uri: 'a1', label: 'Analysis 1' }]);
    expect(result.current.ronlMethodConcepts).toEqual([{ uri: 'm1', label: 'Method 1' }]);
    expect(result.current.ronlConceptsError).toBe('');
  });

  test('sets a user-facing error message when the fetch fails', async () => {
    fetchAllRonlConcepts.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useEditorState());

    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));
    expect(result.current.ronlConceptsError).toBe(
      'Failed to load concepts from TriplyDB. Please check your connection.'
    );
    expect(result.current.ronlAnalysisConcepts).toEqual([]);
  });
});

describe('useEditorState — clearAllData', () => {
  test('resets service, organization, array fields, and dmnData to their defaults', async () => {
    const { result } = renderHook(() => useEditorState());
    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));

    act(() => {
      result.current.setService({ identifier: 'svc', name: 'Test Service', customSector: 'x' });
      result.current.setTemporalRules([{ id: 1, identifier: 'r1' }]);
      result.current.setRonlAnalysis('https://regels.overheid.nl/termen/analysis');
      result.current.setDmnData((prev) => ({ ...prev, isImported: true, fileName: 'x.dmn' }));
    });

    expect(result.current.service.identifier).toBe('svc');
    expect(result.current.temporalRules).toHaveLength(1);

    act(() => result.current.clearAllData());

    expect(result.current.service).toMatchObject({ identifier: '', name: '', customSector: '' });
    expect(result.current.ronlAnalysis).toBe('');
    expect(result.current.temporalRules).toEqual([]);
    expect(result.current.dmnData).toMatchObject({ isImported: false, fileName: '' });
  });

  test('does NOT reset the TriplyDB config — intentional, per the code comment', async () => {
    const { result } = renderHook(() => useEditorState());
    await waitFor(() => expect(result.current.ronlConceptsLoading).toBe(false));

    act(() => {
      result.current.setTriplyDBConfig((prev) => ({ ...prev, apiToken: 'kept-across-clear' }));
    });

    act(() => result.current.clearAllData());

    expect(result.current.triplyDBConfig.apiToken).toBe('kept-across-clear');
  });
});
