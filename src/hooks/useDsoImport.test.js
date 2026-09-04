import { renderHook, waitFor } from '@testing-library/react';

import { useDsoImport } from './useDsoImport';

function navigateTo(search) {
  window.history.pushState({}, '', `/${search}`);
}

function renderDsoImport(overrides = {}) {
  const setDmnData = vi.fn();
  const setService = vi.fn();
  const setOrganization = vi.fn();
  const setActiveTab = vi.fn();
  const notify = vi.fn();

  const handlers = { setDmnData, setService, setOrganization, setActiveTab, notify, ...overrides };
  const view = renderHook(() => useDsoImport(handlers));
  return { ...view, ...handlers };
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('useDsoImport', () => {
  test('does nothing when dsoImport is absent from the URL', () => {
    navigateTo('?foo=bar');
    global.fetch = vi.fn();
    const { setDmnData, notify } = renderDsoImport();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(setDmnData).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test('does nothing when dsoImport is present but not "dmn"', () => {
    navigateTo('?dsoImport=other');
    global.fetch = vi.fn();
    const { setDmnData } = renderDsoImport();
    expect(setDmnData).not.toHaveBeenCalled();
  });

  test('strips the DSO import params from the URL immediately, even before the fetch resolves', () => {
    navigateTo('?dsoImport=dmn&dmnId=abc123&env=pre&extra=keep-me');
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    renderDsoImport();

    const params = new URLSearchParams(window.location.search);
    expect(params.has('dsoImport')).toBe(false);
    expect(params.has('dmnId')).toBe(false);
    expect(params.get('extra')).toBe('keep-me');
  });

  test('reports an error and never fetches when dmnId is missing', async () => {
    navigateTo('?dsoImport=dmn');
    global.fetch = vi.fn();
    const { notify } = renderDsoImport();

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith({
        type: 'error',
        message: 'DSO import: missing dmnId in the deep-link.',
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('on success, prefills dmnData/service/organization and switches to the DMN tab', async () => {
    navigateTo(
      '?dsoImport=dmn&dmnId=abc123&env=prod&activityName=Aanvraag+Zorgtoeslag&authority=Belastingdienst&activityUrn=urn:dso:abc&fsRef=fs-1'
    );
    const dmnXml =
      '<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision id="d1"/></definitions>';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => dmnXml,
    });

    const { setDmnData, setService, setOrganization, setActiveTab, notify } = renderDsoImport();

    await waitFor(() => expect(setActiveTab).toHaveBeenCalledWith('dmn'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/dso/toepasbare-regels/abc123/dmn?env=prod'),
      expect.objectContaining({ headers: { Accept: 'application/xml' } })
    );

    const dmnUpdater = setDmnData.mock.calls[0][0];
    expect(dmnUpdater({})).toMatchObject({
      fileName: 'decision-abc123.dmn',
      content: dmnXml,
      decisionKey: 'd1',
      isImported: false,
    });

    const serviceUpdater = setService.mock.calls[0][0];
    expect(serviceUpdater({})).toMatchObject({
      name: 'Aanvraag Zorgtoeslag',
      identifier: 'urn:dso:abc',
      description: 'Geïmporteerd uit DSO (DSO-activiteit urn:dso:abc, functionele structuur fs-1).',
    });

    const orgUpdater = setOrganization.mock.calls[0][0];
    expect(orgUpdater({})).toMatchObject({ name: 'Belastingdienst' });

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', message: expect.stringContaining('Imported') })
    );
  });

  test('reports an error when the backend responds non-ok', async () => {
    navigateTo('?dsoImport=dmn&dmnId=abc123');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway' });
    const { notify, setDmnData } = renderDsoImport();

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Backend returned 502 Bad Gateway'),
        })
      )
    );
    expect(setDmnData).not.toHaveBeenCalled();
  });

  test('reports an error when the backend returns an empty DMN document', async () => {
    navigateTo('?dsoImport=dmn&dmnId=abc123');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '   ' });
    const { notify } = renderDsoImport();

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('empty DMN document') })
      )
    );
  });

  test('does not prefill organization when no authority is present', async () => {
    navigateTo('?dsoImport=dmn&dmnId=abc123&activityName=Something');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '<definitions/>' });
    const { setOrganization, setActiveTab } = renderDsoImport();

    await waitFor(() => expect(setActiveTab).toHaveBeenCalled());
    expect(setOrganization).not.toHaveBeenCalled();
  });
});
