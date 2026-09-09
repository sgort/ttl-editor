import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { applyMapping, getAvailableFields, parseIKnowXML } from '../../utils/iknowParser';
import IKnowMappingTab from './IKnowMappingTab';

vi.mock('../../utils/iknowParser');

/**
 * The two modes of the iKnow mapping tab.
 *
 * Configure mode takes an iKnow XML export and lets the author bind its fields
 * to CPSV-AP targets, saving the result as a reusable configuration. Import mode
 * takes a data file plus one of those saved configurations, previews what the
 * editor would be populated with, and applies it.
 *
 * Both modes read a file, and both can fail at parse time, so each has its own
 * error state — the tab must never silently keep stale parsed data after a
 * failed upload, or the next preview maps the previous document.
 *
 * The parser is mocked. What is under test is the tab's flow control; parsing is
 * covered in iknowParser.test.js and iknowParser.mapping.test.js.
 */

const parsed = {
  type: 'CognitatieAnnotation',
  metadata: { name: 'Zorgtoeslag' },
  concepts: [{ id: 'c1', name: 'Leeftijd' }],
  textAnnotations: [],
  documents: [],
};

const savedConfig = {
  name: 'zorgtoeslag-mapping',
  description: 'Mapping for the Zorgtoeslag export',
  mappings: { 'service.name': { source: 'concepts', path: 'name' } },
};

const renderTab = (overrides = {}) => {
  const props = {
    mappingConfig: { mappings: {} },
    setMappingConfig: vi.fn(),
    availableMappings: [savedConfig],
    onImportComplete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<IKnowMappingTab {...props} />) };
};

const xmlFile = (name = 'export.xml') =>
  new File(['<knowledgedomain />'], name, { type: 'text/xml' });

const upload = (input, file) => fireEvent.change(input, { target: { files: file ? [file] : [] } });

const switchToImport = () => fireEvent.click(screen.getByRole('button', { name: /Import Data/ }));

const configureInput = () =>
  screen.getByLabelText(/Upload CognitatieAnnotationExport.xml or SemanticsExport.xml/);
const importInput = () => screen.getByLabelText('Upload iKnow XML data file');

beforeEach(() => {
  vi.clearAllMocks();
  parseIKnowXML.mockReturnValue(parsed);
  getAvailableFields.mockReturnValue({
    concepts: [
      { path: 'name', label: 'Concept Name', example: 'pensioengerechtigde leeftijd' },
      { path: 'id', label: 'Concept ID', example: 'f524c950' },
    ],
    textAnnotations: [{ path: 'text', label: 'Annotation Text', example: 'artikel 1' }],
  });
  applyMapping.mockReturnValue({ service: { name: 'Leeftijd' }, rules: [], parameters: [] });
});

describe('configure mode', () => {
  test('ignores a change event with no file', () => {
    renderTab();

    upload(configureInput(), null);

    expect(parseIKnowXML).not.toHaveBeenCalled();
  });

  test('parses an uploaded export and offers its fields', async () => {
    renderTab();

    upload(configureInput(), xmlFile());

    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    expect(getAvailableFields).toHaveBeenCalledWith(parsed);
  });

  test('a parse failure is reported and leaves no parsed data behind', async () => {
    parseIKnowXML.mockImplementation(() => {
      throw new Error('not an iKnow export');
    });

    renderTab();
    upload(configureInput(), xmlFile());

    expect(await screen.findByText(/Failed to parse XML: not an iKnow export/)).toBeInTheDocument();
    // Fields come from a successful parse only; a failed one must not leave the
    // previous document's fields on offer.
    expect(getAvailableFields).not.toHaveBeenCalled();
  });
});

describe('import mode', () => {
  const preview = () =>
    fireEvent.click(screen.getByRole('button', { name: /Preview Mapped Data/ }));

  const selectConfig = (name) =>
    fireEvent.change(screen.getByLabelText('Select mapping configuration'), {
      target: { value: name },
    });

  test('ignores a change event with no file', () => {
    renderTab();
    switchToImport();

    upload(importInput(), null);

    expect(parseIKnowXML).not.toHaveBeenCalled();
  });

  test('a parse failure is reported', async () => {
    parseIKnowXML.mockImplementation(() => {
      throw new Error('malformed');
    });

    renderTab();
    switchToImport();
    upload(importInput(), xmlFile());

    expect(await screen.findByText(/Failed to parse XML: malformed/)).toBeInTheDocument();
  });

  test('previewing is not offered until there is both a file and a configuration', async () => {
    // handlePreviewMapping carries a "Please upload XML file and select a
    // configuration" guard, but the button is rendered only when both are
    // present, so the guard cannot be reached through the UI. The absent button
    // is the real behaviour.
    renderTab();
    switchToImport();

    expect(screen.queryByRole('button', { name: /Preview Mapped Data/ })).not.toBeInTheDocument();

    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    // A file alone is not enough.
    expect(screen.queryByRole('button', { name: /Preview Mapped Data/ })).not.toBeInTheDocument();

    selectConfig(savedConfig.name);
    expect(screen.getByRole('button', { name: /Preview Mapped Data/ })).toBeInTheDocument();
  });

  test('previewing a configuration that has since disappeared says so', async () => {
    // Saved configurations are supplied by the parent and can be reloaded while
    // a selection stands, leaving the tab holding a name that no longer resolves.
    const { rerender } = renderTab();
    switchToImport();
    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    selectConfig(savedConfig.name);

    rerender(
      <IKnowMappingTab
        mappingConfig={{ mappings: {} }}
        setMappingConfig={vi.fn()}
        availableMappings={[]}
        onImportComplete={vi.fn()}
      />
    );

    preview();

    expect(screen.getByText('Selected configuration not found')).toBeInTheDocument();
    expect(applyMapping).not.toHaveBeenCalled();
  });

  test('a successful preview shows the mapped data', async () => {
    renderTab();
    switchToImport();
    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    selectConfig(savedConfig.name);

    preview();

    expect(applyMapping).toHaveBeenCalledWith(parsed, savedConfig);
    expect(await screen.findByText(/Preview of Mapped Data/)).toBeInTheDocument();
  });

  test('a mapping that throws is reported rather than crashing the tab', async () => {
    applyMapping.mockImplementation(() => {
      throw new Error('bad path');
    });

    renderTab();
    switchToImport();
    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    selectConfig(savedConfig.name);

    preview();

    expect(await screen.findByText(/Failed to apply mapping: bad path/)).toBeInTheDocument();
  });

  test('cancelling a preview withdraws the import offer', async () => {
    // handleImportToEditor also carries a "preview first" guard, and it is
    // unreachable for the same reason: the Import button lives inside the
    // preview block, so discarding the preview removes the button with it.
    renderTab();
    switchToImport();
    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    selectConfig(savedConfig.name);
    preview();
    await screen.findByText(/Preview of Mapped Data/);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('button', { name: /Import to Editor/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview of Mapped Data/)).not.toBeInTheDocument();
  });

  test('a previewed mapping is handed to the editor', async () => {
    const { props } = renderTab();
    switchToImport();
    upload(importInput(), xmlFile());
    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    selectConfig(savedConfig.name);
    preview();
    await screen.findByText(/Preview of Mapped Data/);

    fireEvent.click(screen.getByRole('button', { name: /Import to Editor/ }));

    expect(props.onImportComplete).toHaveBeenCalledWith({
      service: { name: 'Leeftijd' },
      rules: [],
      parameters: [],
    });
  });
});

describe('configure mode: editing the mapping', () => {
  /** Upload an export so the per-field mapping controls appear. */
  const withParsedExport = async (overrides) => {
    const view = renderTab(overrides);
    upload(configureInput(), xmlFile());
    await waitFor(() => expect(getAvailableFields).toHaveBeenCalled());
    return view;
  };

  test('adding a mapping creates an empty binding for that target field', async () => {
    const { props } = await withParsedExport();

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Mapping' })[0]);

    // setMappingConfig is called with an updater; applying it to the current
    // config is what shows the shape it produces.
    const updater = props.setMappingConfig.mock.calls.at(-1)[0];
    const next = updater({ mappings: {} });
    const [field] = Object.keys(next.mappings);

    expect(next.mappings[field]).toEqual({
      source: '',
      path: '',
      transform: null,
      filter: null,
    });
  });

  test('loading a configuration replaces the current mappings', async () => {
    const { props } = renderTab();
    const saved = JSON.stringify({
      name: 'Zorgtoeslag',
      description: 'Een mapping',
      mappings: { 'service.name': { source: 'concepts', path: 'name' } },
    });

    fireEvent.change(screen.getByLabelText(/Load Configuration/i), {
      target: { files: [new File([saved], 'mapping.json', { type: 'application/json' })] },
    });

    await waitFor(() =>
      expect(props.setMappingConfig).toHaveBeenCalledWith({
        mappings: { 'service.name': { source: 'concepts', path: 'name' } },
      })
    );
  });

  test('a configuration with no mappings loads as an empty one', async () => {
    const { props } = renderTab();

    fireEvent.change(screen.getByLabelText(/Load Configuration/i), {
      target: { files: [new File(['{}'], 'mapping.json', { type: 'application/json' })] },
    });

    await waitFor(() => expect(props.setMappingConfig).toHaveBeenCalledWith({ mappings: {} }));
  });

  test('a malformed configuration file is reported rather than swallowed', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderTab();

    fireEvent.change(screen.getByLabelText(/Load Configuration/i), {
      target: { files: [new File(['{ not json'], 'mapping.json')] },
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'))
    );
    alertSpy.mockRestore();
  });

  test('a change event with no file loads nothing', () => {
    const { props } = renderTab();

    fireEvent.change(screen.getByLabelText(/Load Configuration/i), { target: { files: [] } });

    expect(props.setMappingConfig).not.toHaveBeenCalled();
  });
});

describe('loading the bundled example', () => {
  /**
   * Both modes offer a one-click example: it fetches the bundled
   * CognitatieAnnotationExport.xml, parses it, and — if an "AOW Example"
   * configuration happens to be among the saved ones — selects that too, so the
   * tab lands ready to preview rather than half configured.
   *
   * The name is matched literally, so an installation without that
   * configuration must still load the XML rather than fail.
   */
  const aowExample = {
    name: 'AOW Example',
    description: 'Bundled demonstration mapping',
    mappings: { 'service.name': { source: 'concepts', path: 'name' } },
  };

  const okResponse = () => ({ ok: true, text: async () => '<knowledgedomain />' });

  const clickExample = (name) => fireEvent.click(screen.getByRole('button', { name }));

  afterEach(() => {
    delete globalThis.fetch;
  });

  test('configure mode loads the example and adopts its configuration', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
    const { props } = renderTab({ availableMappings: [aowExample] });

    clickExample(/Load Example/i);

    await waitFor(() => expect(parseIKnowXML).toHaveBeenCalled());
    expect(props.setMappingConfig).toHaveBeenCalledWith({
      name: 'AOW Example',
      description: 'Bundled demonstration mapping',
      mappings: aowExample.mappings,
    });
  });

  test('a configuration with no description or mappings still loads', async () => {
    // The two fallbacks exist because a hand-written configuration file need
    // not carry either field.
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
    const { props } = renderTab({ availableMappings: [{ name: 'AOW Example' }] });

    clickExample(/Load Example/i);

    await waitFor(() =>
      expect(props.setMappingConfig).toHaveBeenCalledWith({
        name: 'AOW Example',
        description: '',
        mappings: {},
      })
    );
  });

  test('the example still loads when no matching configuration exists', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
    const { props } = renderTab({ availableMappings: [] });

    clickExample(/Load Example/i);

    await waitFor(() => expect(getAvailableFields).toHaveBeenCalled());
    expect(props.setMappingConfig).not.toHaveBeenCalled();
  });

  test('a missing example file is reported', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    renderTab();

    clickExample(/Load Example/i);

    expect(
      await screen.findByText(/Failed to load example: Failed to load example XML file/)
    ).toBeInTheDocument();
  });

  test('import mode loads the example, selects the configuration and previews it', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
    renderTab({ availableMappings: [aowExample] });
    switchToImport();

    clickExample(/Load Example/i);

    expect(await screen.findByText(/Preview of Mapped Data/)).toBeInTheDocument();
    expect(applyMapping).toHaveBeenCalledWith(parsed, aowExample);
  });

  test('a mapping that throws during the automatic preview is reported', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
    applyMapping.mockImplementation(() => {
      throw new Error('bad path');
    });
    renderTab({ availableMappings: [aowExample] });
    switchToImport();

    clickExample(/Load Example/i);

    expect(await screen.findByText(/Failed to preview mapping: bad path/)).toBeInTheDocument();
  });

  test('import mode reports a missing example file', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    renderTab();
    switchToImport();

    clickExample(/Load Example/i);

    expect(await screen.findByText(/Failed to load example XML file/)).toBeInTheDocument();
  });
});

describe('the parsed-data summary', () => {
  /**
   * After a successful parse the tab summarises what it found, so the author can
   * confirm they uploaded the file they meant to before binding any fields.
   *
   * Every detail in that summary is optional — a concept need not carry a
   * definition, a document or annotation need not carry a type — and the whole
   * point of the summary is to describe real exports, which routinely omit them.
   */
  const richParse = {
    type: 'CognitatieAnnotation',
    metadata: { name: 'Zorgtoeslag', exportDateTime: '2026-01-01T00:00:00' },
    concepts: [
      { id: 'c1', name: 'Leeftijd', type: 'input', definition: 'De leeftijd van de aanvrager' },
      { id: 'c2', name: 'Inkomen' },
    ],
    documents: [
      { id: 'd1', title: 'Zorgtoeslagwet', type: 'wet' },
      { id: 'd2', title: 'Bijlage' },
    ],
    textAnnotations: [
      { id: 't1', text: 'Artikel 1', type: 'artikel' },
      { id: 't2', text: 'Artikel 2' },
    ],
  };

  test('lists what was found, including entries missing their optional details', async () => {
    parseIKnowXML.mockReturnValue(richParse);
    renderTab();

    upload(configureInput(), xmlFile());
    await waitFor(() => expect(getAvailableFields).toHaveBeenCalled());

    // A concept with a definition shows it; one without simply does not.
    expect(await screen.findByText(/De leeftijd van de aanvrager/)).toBeInTheDocument();
    expect(screen.getByText('Inkomen')).toBeInTheDocument();
    // Typed documents and annotations carry a badge; untyped ones do not.
    expect(screen.getByText('wet')).toBeInTheDocument();
    expect(screen.getByText('artikel')).toBeInTheDocument();
  });

  test('counts an export that contains nothing at all', async () => {
    // `concepts?.length || 0` — a parse can legitimately yield no concepts, and
    // the summary has to say zero rather than render an empty count.
    parseIKnowXML.mockReturnValue({ type: 'SemanticsExport', metadata: {} });
    renderTab();

    upload(configureInput(), xmlFile());
    await waitFor(() => expect(getAvailableFields).toHaveBeenCalled());

    expect(await screen.findByText(/0 concepts/)).toBeInTheDocument();
  });
});

describe('configure mode: binding fields', () => {
  /** Upload an export so the per-field mapping controls render. */
  const withParsedExport = async (overrides) => {
    const view = renderTab(overrides);
    upload(configureInput(), xmlFile());
    await waitFor(() => expect(getAvailableFields).toHaveBeenCalled());
    return view;
  };

  test('adding a mapping creates an empty binding for that target field', async () => {
    const { props } = await withParsedExport();

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Mapping' })[0]);

    // setMappingConfig takes an updater; applying it shows the shape produced.
    const next = props.setMappingConfig.mock.calls.at(-1)[0]({ mappings: {} });
    const [field] = Object.keys(next.mappings);

    expect(next.mappings[field]).toEqual({
      source: '',
      path: '',
      transform: null,
      filter: null,
    });
  });

  test('removing a mapping deletes only that binding', async () => {
    const existing = {
      mappings: {
        'service.identifier': { source: 'concepts', path: 'id' },
        'service.name': { source: 'concepts', path: 'name' },
      },
    };
    const { props } = await withParsedExport({ mappingConfig: existing });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    const next = props.setMappingConfig.mock.calls.at(-1)[0](existing);

    expect(Object.keys(next.mappings)).toHaveLength(1);
  });

  test('changing a binding keeps the rest of it', async () => {
    const existing = { mappings: { 'service.identifier': { source: 'concepts', path: 'id' } } };
    const { props } = await withParsedExport({ mappingConfig: existing });

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'textAnnotations' } });

    const next = props.setMappingConfig.mock.calls.at(-1)[0](existing);

    expect(next.mappings['service.identifier']).toMatchObject({ path: 'id' });
  });
});
