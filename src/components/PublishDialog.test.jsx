import { render, screen } from '@testing-library/react';

import PublishDialog from './PublishDialog';

const renderDialog = (overrides = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onPublish: vi.fn(),
    currentConfig: null,
    publishingState: null,
    ttlContent: '',
    ...overrides,
  };
  return { props, ...render(<PublishDialog {...props} />) };
};

describe('PublishDialog', () => {
  test('renders nothing when closed', () => {
    const { container } = renderDialog({ isOpen: false });

    expect(container).toBeEmptyDOMElement();
  });

  test('renders the TriplyDB connection fields when open', () => {
    renderDialog();

    // "Publish to TriplyDB" is both the heading and the submit button, so the
    // role is what disambiguates them.
    expect(screen.getByRole('heading', { name: 'Publish to TriplyDB' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('stevengort')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('PublishTest')).toBeInTheDocument();
  });

  test('falls back to the default base URL when no config was saved', () => {
    // currentConfig is null on a first run; the dialog must still offer a usable
    // endpoint rather than an empty field.
    renderDialog({ currentConfig: null });

    expect(screen.getByDisplayValue('https://api.open-regels.triply.cc')).toBeInTheDocument();
  });

  test('prefers a saved config over the defaults', () => {
    renderDialog({
      currentConfig: {
        baseUrl: 'https://api.example.org',
        account: 'acme',
        dataset: 'services',
        apiToken: 'secret',
      },
    });

    expect(screen.getByDisplayValue('https://api.example.org')).toBeInTheDocument();
    expect(screen.getByDisplayValue('acme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('services')).toBeInTheDocument();
  });

  test('masks the API token by default', () => {
    renderDialog({
      currentConfig: {
        baseUrl: 'https://api.example.org',
        account: 'acme',
        dataset: 'services',
        apiToken: 'secret-token',
      },
    });

    expect(screen.getByPlaceholderText('Enter your TriplyDB API token')).toHaveAttribute(
      'type',
      'password'
    );
  });
});
