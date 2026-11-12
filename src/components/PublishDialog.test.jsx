import { fireEvent, render, screen } from '@testing-library/react';

import PublishDialog from './PublishDialog';

const savedConfig = { dataset: 'services' };

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
  test('asks only for the dataset: no base URL, account or token (#234)', () => {
    renderDialog();

    // "Publish to TriplyDB" is both the heading and the submit button, so the
    // role is what disambiguates them.
    expect(screen.getByRole('heading', { name: 'Publish to TriplyDB' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Dataset Name/)).toHaveValue('services');
    expect(screen.queryByLabelText(/Base URL/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Account Name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/API Token/)).not.toBeInTheDocument();
    expect(screen.queryByText(/API token/i)).not.toBeInTheDocument();
  });

  // The dialog holds no config state of its own, so an edit is only visible to
  // the user if it reaches the owner. Defaults are the loader's job and are
  // covered in triplydbHelper.test.js, not here.
  test('reports an edited dataset to the owner without mutating the config', () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByLabelText(/Dataset Name/), { target: { value: 'Other' } });

    expect(props.onConfigChange).toHaveBeenCalledWith({ dataset: 'Other' });
    expect(props.config).toEqual(savedConfig);
  });
});
