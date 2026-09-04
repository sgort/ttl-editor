import { fireEvent, render, screen } from '@testing-library/react';

import OutputSection from './OutputSection';

const empty = { identifier: '', name: '', description: '', type: '' };

const renderSection = (output = empty) => {
  const setOutput = vi.fn();
  return { setOutput, ...render(<OutputSection output={output} setOutput={setOutput} />) };
};

describe('OutputSection', () => {
  test('shows only the identifier field while the output is empty', () => {
    renderSection();

    expect(screen.getByPlaceholderText('e.g., output-001')).toBeInTheDocument();
    // Progressive disclosure: the rest stays hidden until there is something to
    // describe, so an untouched service does not present four empty required
    // fields.
    expect(screen.queryByPlaceholderText('e.g., Permit Document')).not.toBeInTheDocument();
  });

  test('editing the identifier calls setOutput with the field merged in', () => {
    const { setOutput } = renderSection();

    fireEvent.change(screen.getByPlaceholderText('e.g., output-001'), {
      target: { value: 'output-001' },
    });

    expect(setOutput).toHaveBeenCalledWith({ ...empty, identifier: 'output-001' });
  });

  test('reveals the remaining fields once the identifier is set', () => {
    renderSection({ ...empty, identifier: 'output-001' });

    expect(screen.getByPlaceholderText('e.g., Permit Document')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('URI or code, e.g., http://example.org/types/Permit')
    ).toBeInTheDocument();
  });

  test('reveals the remaining fields when an import supplied a name but no identifier', () => {
    // The disclosure gate is deliberately an OR across every field, so imported
    // data is never hidden behind an identifier the importer did not set.
    renderSection({ ...empty, name: 'Permit Document' });

    expect(screen.getByPlaceholderText('e.g., Permit Document')).toBeInTheDocument();
  });

  test('editing a revealed field reaches the setter', () => {
    const withId = { ...empty, identifier: 'output-001' };
    const { setOutput } = renderSection(withId);

    fireEvent.change(screen.getByPlaceholderText('e.g., Permit Document'), {
      target: { value: 'Permit Document' },
    });

    expect(setOutput).toHaveBeenCalledWith({ ...withId, name: 'Permit Document' });
  });
});
