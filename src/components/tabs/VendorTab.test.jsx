import { render, screen } from '@testing-library/react';

import VendorTab from './VendorTab';

// Deliberately the thinnest file in P5. VendorTab is 991 lines and its future is
// undecided — it may be removed entirely — so this pins that it renders and
// nothing more. If it survives, deepen it then; if it goes, nothing is wasted.

const renderTab = (overrides = {}) => {
  const props = {
    mappingConfig: {},
    setMappingConfig: vi.fn(),
    availableMappings: [],
    onImportComplete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<VendorTab {...props} />) };
};

describe('VendorTab', () => {
  test('renders the vendor selector', () => {
    renderTab();

    expect(screen.getByRole('heading', { name: 'Select Vendor' })).toBeInTheDocument();
  });

  test('relies on its own default vendorService rather than requiring the prop', () => {
    // vendorService has a default in the signature, so App.jsx may omit it.
    const { container } = renderTab({ vendorService: undefined });

    expect(container).not.toBeEmptyDOMElement();
  });
});
