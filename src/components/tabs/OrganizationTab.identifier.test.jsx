import { fireEvent, render, screen } from '@testing-library/react';

import OrganizationTab from './OrganizationTab';

/**
 * The organization identifier, and the logo upload's validation.
 *
 * The identifier is either a full URI, used as given, or a short code that gets
 * expanded to a regels.overheid.nl URI. The tab shows which of the two it is
 * about to do, because the answer ends up in the published TTL and the short
 * form is easy to mistake for a complete one.
 *
 * The logo upload rejects on type and on size before any reading happens, so
 * those two guards are checked here without touching FileReader.
 * OrganizationTab.test.jsx covers the tab's fields and handlers.
 */

const organization = { identifier: '', name: '', homepage: '' };
const dmnData = {
  isImported: false,
  deployed: false,
  validationStatus: 'not-validated',
  fileName: '',
  content: '',
};

const renderTab = (overrides = {}) =>
  render(
    <OrganizationTab
      organization={organization}
      setOrganization={vi.fn()}
      dmnData={dmnData}
      setDmnData={vi.fn()}
      {...overrides}
    />
  );

const FULL_URI_NOTE = /Full URI detected/;
const WILL_GENERATE = /Will generate:/;

describe('OrganizationTab identifier', () => {
  test('says nothing while the field is empty', () => {
    renderTab();

    expect(screen.queryByText(FULL_URI_NOTE)).not.toBeInTheDocument();
    expect(screen.queryByText(WILL_GENERATE)).not.toBeInTheDocument();
  });

  test('a short code shows the URI it will be expanded to', () => {
    renderTab({ organization: { ...organization, identifier: 'svb' } });

    expect(
      screen.getByText(/https:\/\/regels\.overheid\.nl\/organizations\/svb/)
    ).toBeInTheDocument();
    expect(screen.queryByText(FULL_URI_NOTE)).not.toBeInTheDocument();
  });

  test('an https URI is used directly', () => {
    renderTab({
      organization: { ...organization, identifier: 'https://organisaties.overheid.nl/28212263' },
    });

    expect(screen.getByText(FULL_URI_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(WILL_GENERATE)).not.toBeInTheDocument();
  });

  test('an http URI counts as a full URI too', () => {
    renderTab({ organization: { ...organization, identifier: 'http://example.org/org/1' } });

    expect(screen.getByText(FULL_URI_NOTE)).toBeInTheDocument();
  });
});

describe('OrganizationTab logo upload validation', () => {
  // The file input is wrapped by its label, so it already has an accessible
  // name — no need to reach into the DOM for it.
  const logoInput = () => screen.getByLabelText(/PNG or JPG/);

  const upload = (file) => fireEvent.change(logoInput(), { target: { files: [file] } });

  let alertSpy;
  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('a non-image file is rejected by type', () => {
    renderTab();

    upload(new File(['x'], 'notes.pdf', { type: 'application/pdf' }));

    expect(alertSpy).toHaveBeenCalledWith('Please select a JPG or PNG image file');
  });

  test('an image over 5MB is rejected by size', () => {
    renderTab();

    const big = new File(['x'], 'logo.png', { type: 'image/png' });
    // Constructing six real megabytes would be wasteful; the guard reads .size.
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    upload(big);

    expect(alertSpy).toHaveBeenCalledWith('File size must be less than 5MB');
  });

  test('a change event with no file is ignored', () => {
    // Cancelling the file picker fires change with an empty list.
    renderTab();

    fireEvent.change(logoInput(), { target: { files: [] } });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('a valid PNG passes both guards', () => {
    renderTab();

    const ok = new File(['x'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(ok, 'size', { value: 1024 });
    upload(ok);

    expect(alertSpy).not.toHaveBeenCalled();
  });
});
