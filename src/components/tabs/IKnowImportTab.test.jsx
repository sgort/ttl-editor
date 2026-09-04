import { render, screen } from '@testing-library/react';

import IKnowImportTab from './IKnowImportTab';

const renderTab = (overrides = {}) => {
  const props = { onImportComplete: vi.fn(), availableMappings: [], ...overrides };
  return { props, ...render(<IKnowImportTab {...props} />) };
};

describe('IKnowImportTab', () => {
  test('renders the import heading and mode selector', () => {
    renderTab();

    expect(screen.getByRole('heading', { name: 'Import Data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import Mode' })).toBeInTheDocument();
  });

  test('renders with no configured mappings', () => {
    // availableMappings defaults to [] in the signature; this pins that an empty
    // list renders rather than throwing on a .map of undefined.
    renderTab({ availableMappings: undefined });

    expect(screen.getByRole('heading', { name: 'Import Data' })).toBeInTheDocument();
  });

  test('renders with mappings available', () => {
    renderTab({
      availableMappings: [{ id: 'svb', name: 'SVB mapping', description: 'Example' }],
    });

    expect(screen.getByRole('heading', { name: 'Import Data' })).toBeInTheDocument();
  });
});
