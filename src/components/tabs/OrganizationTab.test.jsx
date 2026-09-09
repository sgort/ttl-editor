import { fireEvent, render, screen } from '@testing-library/react';

import OrganizationTab from './OrganizationTab';

const organization = { identifier: '', name: '', homepage: '' };
const dmnData = {
  isImported: false,
  deployed: false,
  validationStatus: 'not-validated',
  fileName: '',
  content: '',
};

const renderTab = (overrides = {}) => {
  const props = {
    organization,
    setOrganization: vi.fn(),
    dmnData,
    setDmnData: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<OrganizationTab {...props} />) };
};

describe('OrganizationTab', () => {
  test('renders the organization fields', () => {
    renderTab();

    expect(
      screen.getByPlaceholderText('e.g., svb or https://organisaties.overheid.nl/28212263/...')
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Sociale Verzekeringsbank')).toBeInTheDocument();
  });

  test('editing the name calls setOrganization with the field merged in', () => {
    const { props } = renderTab();

    fireEvent.change(screen.getByPlaceholderText('e.g., Sociale Verzekeringsbank'), {
      target: { value: 'Sociale Verzekeringsbank' },
    });

    expect(props.setOrganization).toHaveBeenCalledWith({
      ...organization,
      name: 'Sociale Verzekeringsbank',
    });
  });

  test('renders without crashing once a DMN model is attached', () => {
    renderTab({
      dmnData: { ...dmnData, isImported: true, fileName: 'model.dmn', content: '<definitions/>' },
    });

    expect(screen.getByPlaceholderText('e.g., Sociale Verzekeringsbank')).toBeInTheDocument();
  });
});
