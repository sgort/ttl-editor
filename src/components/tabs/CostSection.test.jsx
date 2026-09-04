import { fireEvent, render, screen } from '@testing-library/react';

import CostSection from './CostSection';

const empty = { identifier: '', value: '', description: '', currency: 'EUR' };

const renderSection = (cost = empty) => {
  const setCost = vi.fn();
  return { setCost, ...render(<CostSection cost={cost} setCost={setCost} />) };
};

describe('CostSection', () => {
  test('shows only the identifier field while the cost is empty', () => {
    renderSection();

    expect(screen.getByPlaceholderText('e.g., cost-001')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g., 25.00 or Free')).not.toBeInTheDocument();
  });

  test('editing the identifier calls setCost with the field merged in', () => {
    const { setCost } = renderSection();

    fireEvent.change(screen.getByPlaceholderText('e.g., cost-001'), {
      target: { value: 'cost-001' },
    });

    expect(setCost).toHaveBeenCalledWith({ ...empty, identifier: 'cost-001' });
  });

  test('reveals the remaining fields once the identifier is set', () => {
    renderSection({ ...empty, identifier: 'cost-001' });

    expect(screen.getByPlaceholderText('e.g., 25.00 or Free')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Application processing fee')).toBeInTheDocument();
  });

  test('currency alone does not open the section', () => {
    // The disclosure gate deliberately omits `currency` — it defaults to EUR on
    // every service, so including it would hold the section permanently open and
    // defeat the progressive disclosure. OutputSection's gate spans all four of
    // its fields because none of them has a default.
    renderSection({ ...empty, currency: 'USD' });

    expect(screen.queryByPlaceholderText('e.g., 25.00 or Free')).not.toBeInTheDocument();
  });

  test('editing a revealed field preserves the currency', () => {
    const withId = { ...empty, identifier: 'cost-001' };
    const { setCost } = renderSection(withId);

    fireEvent.change(screen.getByPlaceholderText('e.g., 25.00 or Free'), {
      target: { value: 'Free' },
    });

    expect(setCost).toHaveBeenCalledWith({ ...withId, value: 'Free' });
  });
});
