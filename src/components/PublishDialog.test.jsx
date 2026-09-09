import { fireEvent, render, screen } from '@testing-library/react';

import PublishDialog from './PublishDialog';

const savedConfig = {
  baseUrl: 'https://api.example.org',
  account: 'acme',
  dataset: 'services',
  apiToken: 'secret-token',
};

// The dialog is controlled: App owns the config and renders the dialog only
// while it is open, so there is no `isOpen` prop and no internal copy of the
// config to fall back on. See issue #87.
const renderDialog = (overrides = {}) => {
  const props = {
    onClose: vi.fn(),
    onPublish: vi.fn(),
    config: savedConfig,
    onConfigChange: vi.fn(),
    publishingState: null,
    ttlContent: '',
    ...overrides,
  };
  return { props, ...render(<PublishDialog {...props} />) };
};

describe('PublishDialog', () => {
  test('renders the TriplyDB connection fields', () => {
    renderDialog();

    // "Publish to TriplyDB" is both the heading and the submit button, so the
    // role is what disambiguates them.
    expect(screen.getByRole('heading', { name: 'Publish to TriplyDB' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('stevengort')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('PublishTest')).toBeInTheDocument();
  });

  test('displays the config it is given', () => {
    renderDialog();

    expect(screen.getByDisplayValue('https://api.example.org')).toBeInTheDocument();
    expect(screen.getByDisplayValue('acme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('services')).toBeInTheDocument();
  });

  // The dialog holds no config state of its own, so an edit is only visible to
  // the user if it reaches the owner. Defaults are the loader's job and are
  // covered in triplydbHelper.test.js, not here.
  test('reports an edited field to the owner without mutating the config', () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByPlaceholderText('stevengort'), { target: { value: 'acmeX' } });

    expect(props.onConfigChange).toHaveBeenCalledWith({ ...savedConfig, account: 'acmeX' });
    expect(props.config).toEqual(savedConfig);
  });

  test('masks the API token by default', () => {
    renderDialog();

    expect(screen.getByPlaceholderText('Enter your TriplyDB API token')).toHaveAttribute(
      'type',
      'password'
    );
  });
});
