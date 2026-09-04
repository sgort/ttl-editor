import { fireEvent, render, screen } from '@testing-library/react';

import VendorTab from './VendorTab';

// VendorTab branches on the selected vendor URI, not on a capability flag: iKnow
// gets integration tooling, Blueriq gets the contact/technical/certification
// form, and every other vendor gets an "under development" placeholder. Adding a
// vendor to the RONL concept list therefore does NOT give it an editing surface
// — that takes a code change here. These tests pin all three branches so the
// coupling is visible rather than discovered.
const IKNOW = 'https://regels.overheid.nl/termen/iKnow';
const BLUERIQ = 'https://regels.overheid.nl/termen/Blueriq';
const UNSUPPORTED = 'https://regels.overheid.nl/termen/SomeOtherVendor';

const vendorService = (overrides = {}) => ({
  selectedVendor: '',
  contact: {
    organizationName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    logo: '',
  },
  serviceNotes: '',
  technical: { serviceUrl: '', license: '', accessType: 'fair-use' },
  certification: {
    status: 'not-certified',
    certifiedBy: '',
    certifiedAt: '',
    certificationNote: '',
  },
  ...overrides,
});

const concepts = [
  { uri: IKNOW, label: 'iKnow' },
  { uri: BLUERIQ, label: 'Blueriq' },
  { uri: UNSUPPORTED, label: 'Some Other Vendor' },
];

const renderTab = (overrides = {}) => {
  const props = {
    mappingConfig: { mappings: {} },
    setMappingConfig: vi.fn(),
    availableMappings: [],
    onImportComplete: vi.fn(),
    vendorService: vendorService(),
    setVendorService: vi.fn(),
    vendorConcepts: concepts,
    loadingVendors: false,
    vendorsError: '',
    service: {},
    organization: {},
    ...overrides,
  };
  return { props, ...render(<VendorTab {...props} />) };
};

const withVendor = (uri, extra = {}) => ({
  vendorService: vendorService({ selectedVendor: uri, ...extra }),
});

describe('VendorTab', () => {
  describe('vendor selection', () => {
    test('renders the vendor selector with the available concepts', () => {
      renderTab();

      expect(screen.getByRole('heading', { name: 'Select Vendor' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'iKnow' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Blueriq' })).toBeInTheDocument();
    });

    test('the selector is disabled while the vendor list is still loading', () => {
      renderTab({ loadingVendors: true, vendorConcepts: [] });

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    test('the selector is disabled when no vendor concepts came back', () => {
      // Distinct from loading: the fetch finished and returned nothing, so there
      // is nothing to choose and the control must not look available.
      renderTab({ vendorConcepts: [] });

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    test('surfaces an error when the vendor concepts failed to load', () => {
      renderTab({ vendorsError: 'Failed to fetch concepts' });

      expect(screen.getByText(/Failed to fetch concepts/)).toBeInTheDocument();
    });

    test('choosing a vendor sets selectedVendor at the top level', () => {
      const { props } = renderTab();

      fireEvent.change(screen.getByRole('combobox'), { target: { value: BLUERIQ } });

      expect(props.setVendorService).toHaveBeenCalledWith(
        expect.objectContaining({ selectedVendor: BLUERIQ })
      );
    });

    test('no vendor-specific content appears until a vendor is chosen', () => {
      renderTab();

      expect(screen.queryByPlaceholderText('e.g., Blueriq BV')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'iKnow Integration' })).not.toBeInTheDocument();
    });
  });

  describe('per-vendor branching', () => {
    test('iKnow embeds the whole IKnowMappingTab rather than a contact form', () => {
      renderTab(withVendor(IKNOW));

      // Two headings read "iKnow Integration" here, and that is the point: the
      // h3 is VendorTab's own banner, the h2 belongs to IKnowMappingTab, which
      // this branch renders wholesale. The same mapping UI is therefore reachable
      // from two tabs, and a change to it shows up in both.
      expect(
        screen.getByRole('heading', { level: 3, name: 'iKnow Integration' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'iKnow Integration' })
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., AOW Pension Service Mapping')).toBeInTheDocument();

      expect(screen.queryByPlaceholderText('e.g., Blueriq BV')).not.toBeInTheDocument();
    });

    test('Blueriq gets the contact and technical form', () => {
      renderTab(withVendor(BLUERIQ));

      expect(screen.getByPlaceholderText('e.g., Blueriq BV')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('contact@blueriq.com')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('https://api.blueriq.com/aow-leeftijd')
      ).toBeInTheDocument();
    });

    test('any other vendor gets an "under development" notice naming it', () => {
      renderTab(withVendor(UNSUPPORTED));

      expect(
        screen.getByRole('heading', { name: 'Integration Not Yet Available' })
      ).toBeInTheDocument();
      expect(screen.getByText(/is currently under development/)).toBeInTheDocument();

      // The notice names the vendor. Matching on the emphasised element rather
      // than the bare string, because the same label is also an <option> in the
      // selector above, and the sentence is split across element boundaries by
      // the <strong> so no single text query spans it.
      expect(
        screen.getByText(
          (_content, element) =>
            element?.tagName === 'STRONG' && element.textContent === 'Some Other Vendor'
        )
      ).toBeInTheDocument();

      expect(screen.queryByPlaceholderText('e.g., Blueriq BV')).not.toBeInTheDocument();
    });
  });

  describe('editing vendor details', () => {
    test('editing a contact field merges into that section only', () => {
      // updateVendorField is a two-level merge — unlike the flat tabs it has to
      // preserve both the sibling sections and the untouched fields in its own.
      const { props } = renderTab(withVendor(BLUERIQ));

      fireEvent.change(screen.getByPlaceholderText('contact@blueriq.com'), {
        target: { value: 'contact@example.org' },
      });

      expect(props.setVendorService).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedVendor: BLUERIQ,
          contact: expect.objectContaining({ email: 'contact@example.org', phone: '' }),
          technical: expect.objectContaining({ accessType: 'fair-use' }),
        })
      );
    });

    test('editing a technical field leaves the contact section untouched', () => {
      const { props } = renderTab(
        withVendor(BLUERIQ, { contact: { ...vendorService().contact, email: 'a@b.c' } })
      );

      fireEvent.change(screen.getByPlaceholderText('e.g., Commercial, MIT, Apache 2.0'), {
        target: { value: 'MIT' },
      });

      expect(props.setVendorService).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: expect.objectContaining({ email: 'a@b.c' }),
          technical: expect.objectContaining({ license: 'MIT' }),
        })
      );
    });
  });

  describe('inline URL validation', () => {
    test('flags a malformed website', () => {
      renderTab(
        withVendor(BLUERIQ, { contact: { ...vendorService().contact, website: 'not-a-url' } })
      );

      expect(screen.getByPlaceholderText('https://www.blueriq.com')).toHaveClass('border-red-500');
    });

    test('accepts an empty website, because the field is optional', () => {
      renderTab(withVendor(BLUERIQ));

      expect(screen.getByPlaceholderText('https://www.blueriq.com')).not.toHaveClass(
        'border-red-500'
      );
    });

    test('accepts a well-formed service URL', () => {
      renderTab(
        withVendor(BLUERIQ, {
          technical: { ...vendorService().technical, serviceUrl: 'https://api.example.org/aow' },
        })
      );

      expect(screen.getByPlaceholderText('https://api.blueriq.com/aow-leeftijd')).not.toHaveClass(
        'border-red-500'
      );
    });
  });

  describe('certifiedBy is derived from the organization', () => {
    test('expands a bare organization identifier into a RONL URI', () => {
      const { props } = renderTab({ organization: { identifier: 'svb' } });

      expect(props.setVendorService).toHaveBeenCalledWith(
        expect.objectContaining({
          certification: expect.objectContaining({
            certifiedBy: 'https://regels.overheid.nl/organizations/svb',
          }),
        })
      );
    });

    test('leaves an identifier that is already a URI alone', () => {
      const { props } = renderTab({
        organization: { identifier: 'https://organisaties.overheid.nl/28212263/SVB' },
      });

      expect(props.setVendorService).toHaveBeenCalledWith(
        expect.objectContaining({
          certification: expect.objectContaining({
            certifiedBy: 'https://organisaties.overheid.nl/28212263/SVB',
          }),
        })
      );
    });

    test('does not overwrite a certifiedBy that is already set', () => {
      const { props } = renderTab({
        organization: { identifier: 'svb' },
        vendorService: vendorService({
          certification: {
            status: 'not-certified',
            certifiedBy: 'https://example.org/already-set',
            certifiedAt: '',
            certificationNote: '',
          },
        }),
      });

      expect(props.setVendorService).not.toHaveBeenCalled();
    });

    test('does not derive one for an already-certified vendor', () => {
      const { props } = renderTab({
        organization: { identifier: 'svb' },
        vendorService: vendorService({
          certification: {
            status: 'certified',
            certifiedBy: '',
            certifiedAt: '',
            certificationNote: '',
          },
        }),
      });

      expect(props.setVendorService).not.toHaveBeenCalled();
    });

    test('does nothing when there is no organization identifier yet', () => {
      const { props } = renderTab({ organization: {} });

      expect(props.setVendorService).not.toHaveBeenCalled();
    });
  });
});
