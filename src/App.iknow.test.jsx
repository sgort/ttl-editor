import { fireEvent, render, screen } from '@testing-library/react';

import App from './App';
import { applyMapping, getAvailableFields, parseIKnowXML } from './utils/iknowParser';

vi.mock('./utils/iknowParser');

// setupTests.js stubs this suite-wide to return no concepts. The vendor
// dropdown is built from the method concepts, and the mapping tab appears only
// once the iKnow vendor is the selected one — so this file needs it present.
const IKNOW_VENDOR = 'https://regels.overheid.nl/termen/iKnow';
vi.mock('./utils/ronlHelper', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllRonlConcepts: vi.fn().mockResolvedValue({
    analysisConcepts: [],
    methodConcepts: [{ uri: 'https://regels.overheid.nl/termen/iKnow', label: 'iKnow' }],
  }),
}));

/**
 * Importing iKnow data into the editor, driven end to end through the UI.
 *
 * The mapping tab lives inside the Vendor tab, and hands its previewed result
 * to App through onImportComplete. App then spreads each section into the
 * matching piece of state — but only the sections the mapping actually
 * produced, because a mapping that binds nothing to organisation fields must
 * not blank the organisation the author already filled in.
 *
 * That selectivity is the behaviour under test, and it is why this file drives
 * the real components rather than calling the handler directly: the wiring from
 * IKnowMappingTab through VendorTab to App is part of what can break.
 */

const parsed = { type: 'CognitatieAnnotation', metadata: {}, concepts: [], textAnnotations: [] };

const aowExample = {
  name: 'AOW Example',
  description: 'Bundled demonstration mapping',
  mappings: { 'service.name': { source: 'concepts', path: 'name' } },
};

/** Walk from a fresh editor to a previewed iKnow import. */
const importThroughUi = async (mappedData) => {
  applyMapping.mockReturnValue(mappedData);

  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Vendor/ }));

  // The mapping tab is vendor-specific: it renders only for iKnow.
  fireEvent.change(await screen.findByLabelText(/Vendor \(ronl:MethodConcept\)/), {
    target: { value: IKNOW_VENDOR },
  });

  fireEvent.click(await screen.findByRole('button', { name: /Import Data/ }));
  fireEvent.click(screen.getByRole('button', { name: /Load Example/i }));

  await screen.findByText(/Preview of Mapped Data/);
  fireEvent.click(screen.getByRole('button', { name: /Import to Editor/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  parseIKnowXML.mockReturnValue(parsed);
  getAvailableFields.mockReturnValue({ concepts: { label: 'Concepts', fields: ['name'] } });
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '<x />' });
  // The bundled example configuration has to be among the saved mappings for
  // the one-click path to select it.
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) =>
    key === 'iknow_mappings' ? JSON.stringify([aowExample]) : null
  );
});

afterEach(() => {
  delete globalThis.fetch;
  vi.restoreAllMocks();
});

describe('importing mapped iKnow data', () => {
  test('a mapped service reaches the Service tab', async () => {
    await importThroughUi({
      service: { name: 'Zorgtoeslag', identifier: 'zorgtoeslag' },
      organization: { name: 'SVB' },
      legal: { bwbId: 'BWBR0018451' },
      rules: [{ id: 1, title: 'Regel 1' }],
      parameters: [{ id: 1, name: 'leeftijd' }],
    });

    fireEvent.click(screen.getByRole('button', { name: /Service/ }));

    expect(await screen.findByDisplayValue('Zorgtoeslag')).toBeInTheDocument();
  });

  test('a mapping that binds nothing leaves every tab as it was', async () => {
    // Each section is applied only when the mapping produced one. Spreading an
    // absent section would replace the author's own entries with undefined.
    await importThroughUi({});

    fireEvent.click(screen.getByRole('button', { name: /Service/ }));
    const identifier = await screen.findByLabelText(/Unique identifier for this service/);

    expect(identifier).toHaveValue('');
  });

  test('empty rule and parameter lists are not applied either', async () => {
    // rules and parameters are guarded on length as well as presence, so an
    // empty list is treated the same as an absent one.
    await importThroughUi({ service: { name: 'Zorgtoeslag' }, rules: [], parameters: [] });

    fireEvent.click(screen.getByRole('button', { name: /Service/ }));

    expect(await screen.findByDisplayValue('Zorgtoeslag')).toBeInTheDocument();
  });
});
