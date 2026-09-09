import { fireEvent, render, screen } from '@testing-library/react';

import IKnowMappingTab from './IKnowMappingTab';

// mappingConfig must carry a `mappings` object. IKnowMappingTab reads
// `mappingConfig.mappings` unguarded in three places, including a `disabled`
// expression at line 777 that only evaluates once configName is non-empty — so
// a `{}` prop renders fine and then throws the moment someone types a name.
// useEditorState always seeds `{ mappings: {} }`, so the app never hits it, but
// the component neither defaults nor declares the requirement.
const renderTab = (overrides = {}) => {
  const props = {
    mappingConfig: { mappings: {} },
    setMappingConfig: vi.fn(),
    availableMappings: [],
    onImportComplete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<IKnowMappingTab {...props} />) };
};

describe('IKnowMappingTab', () => {
  test('opens in configure mode with the naming fields visible', () => {
    renderTab();

    expect(screen.getByPlaceholderText('e.g., AOW Pension Service Mapping')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Brief description of this mapping configuration')
    ).toBeInTheDocument();
  });

  test('the configuration name is local state, not a prop callback', () => {
    // configName lives in the component until a config is saved, so typing must
    // not reach setMappingConfig — that only happens on save.
    const { props } = renderTab();

    fireEvent.change(screen.getByPlaceholderText('e.g., AOW Pension Service Mapping'), {
      target: { value: 'AOW mapping' },
    });

    expect(screen.getByDisplayValue('AOW mapping')).toBeInTheDocument();
    expect(props.setMappingConfig).not.toHaveBeenCalled();
  });

  test('renders with mappings already configured', () => {
    renderTab({
      availableMappings: [{ id: 'svb', name: 'SVB mapping', description: 'Example' }],
    });

    expect(screen.getByPlaceholderText('e.g., AOW Pension Service Mapping')).toBeInTheDocument();
  });
});
