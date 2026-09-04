import { act, fireEvent, render, screen } from '@testing-library/react';

import PreviewPanel from './PreviewPanel';

describe('PreviewPanel', () => {
  test('shows a placeholder and "Ready" when there is no content yet', () => {
    render(<PreviewPanel ttlContent="" />);

    expect(screen.getByText(/No content yet/)).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  test('renders the TTL and counts its lines', () => {
    render(<PreviewPanel ttlContent={'@prefix a: <x> .\n\na:s a:p a:o .'} />);

    expect(screen.getByText(/@prefix a:/)).toBeInTheDocument();
    // Three lines, because the blank one counts — the footer reports the length
    // of the split, not the number of statements.
    expect(screen.getByText('3 lines')).toBeInTheDocument();
  });

  describe('copy to clipboard', () => {
    let writeText;

    beforeEach(() => {
      vi.useFakeTimers();
      writeText = vi.fn();
      // jsdom provides no clipboard, so the real handler would throw on the
      // first click without this.
      Object.assign(navigator, { clipboard: { writeText } });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    test('writes the TTL to the clipboard and confirms', () => {
      render(<PreviewPanel ttlContent="@prefix a: <x> ." />);

      fireEvent.click(screen.getByTitle('Copy to clipboard'));

      expect(writeText).toHaveBeenCalledWith('@prefix a: <x> .');
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    test('reverts the confirmation after two seconds', () => {
      render(<PreviewPanel ttlContent="@prefix a: <x> ." />);

      fireEvent.click(screen.getByTitle('Copy to clipboard'));
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(2000));

      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });
});
