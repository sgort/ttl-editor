import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import VendorTab from './VendorTab';

/**
 * The vendor logo is scaled down before it is stored (#336 in
 * linked-data-explorer). Read as-is, a large logo made the publish body pass
 * the backend's 10 MB limit and the whole publish failed with 413.
 *
 * jsdom neither decodes images nor draws on a canvas, so both are stubbed: the
 * test checks what the tab asks of them and what it stores, not the pixels.
 */
const BLUERIQ = 'https://regels.overheid.nl/termen/Blueriq';
const SCALED = 'data:image/png;base64,c2NhbGVk';

const vendorService = {
  selectedVendor: BLUERIQ,
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
};

let drawn;
let imageSize;
beforeEach(() => {
  drawn = null;
  imageSize = { width: 2048, height: 1024 };
  vi.stubGlobal(
    'Image',
    class {
      set src(_value) {
        this.width = imageSize.width;
        this.height = imageSize.height;
        setTimeout(() => this.onload?.());
      }
    }
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return {
      drawImage: (_img, _x, _y, width, height) => {
        drawn = { canvas: { width: this.width, height: this.height }, width, height };
      },
    };
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(SCALED);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const upload = (setVendorService, file) => {
  render(
    <VendorTab
      mappingConfig={{ mappings: {} }}
      setMappingConfig={vi.fn()}
      availableMappings={[]}
      onImportComplete={vi.fn()}
      vendorService={vendorService}
      setVendorService={setVendorService}
      vendorConcepts={[{ uri: BLUERIQ, label: 'Blueriq' }]}
      loadingVendors={false}
      vendorsFailed={false}
      service={{}}
      organization={{}}
    />
  );
  fireEvent.change(screen.getByLabelText(/Upload Logo/), { target: { files: [file] } });
};

const png = () => new File(['x'.repeat(64)], 'logo.png', { type: 'image/png' });

test('a large logo is scaled to 512 px on its longest side and stored as PNG', async () => {
  const setVendorService = vi.fn();

  upload(setVendorService, png());

  await waitFor(() => expect(setVendorService).toHaveBeenCalled());
  expect(drawn).toEqual({ canvas: { width: 512, height: 256 }, width: 512, height: 256 });
  expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
  expect(setVendorService.mock.calls[0][0].contact.logo).toBe(SCALED);
});

test('a logo that already fits keeps its size', async () => {
  imageSize = { width: 300, height: 120 };
  const setVendorService = vi.fn();

  upload(setVendorService, png());

  await waitFor(() => expect(setVendorService).toHaveBeenCalled());
  expect(drawn).toEqual({ canvas: { width: 300, height: 120 }, width: 300, height: 120 });
});
