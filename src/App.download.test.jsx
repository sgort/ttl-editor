import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from './App';

/**
 * Saving the generated TTL, from the Download button.
 *
 * There are two paths and the browser decides which. Chromium-family browsers
 * expose the File System Access API and get a native Save As dialog; everything
 * else falls back to an anchor-and-Blob download. Both matter, and only one of
 * them exists in any given environment — jsdom has neither, so both are driven
 * here by defining and deleting window.showSaveFilePicker.
 *
 * The cancel case is the one worth pinning. Dismissing the native dialog throws
 * AbortError, which is not a failure: it must leave no message and trigger no
 * fallback download, or cancelling produces the very file the user just
 * declined to save.
 */

const clickDownload = () => fireEvent.click(screen.getByRole('button', { name: /Download TTL/i }));

/** A file handle whose writable records what was written. */
const fileHandleSpy = (name = 'service.ttl') => {
  const written = [];
  const handle = {
    name,
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(async (chunk) => written.push(chunk)),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  };
  return { handle, written };
};

let originalPicker;

beforeEach(() => {
  originalPicker = Object.getOwnPropertyDescriptor(window, 'showSaveFilePicker');
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  delete window.showSaveFilePicker;
  if (originalPicker) Object.defineProperty(window, 'showSaveFilePicker', originalPicker);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saving through the File System Access API', () => {
  test('writes the TTL and confirms where it went', async () => {
    const { handle, written } = fileHandleSpy('zorgtoeslag.ttl');
    window.showSaveFilePicker = vi.fn().mockResolvedValue(handle);

    render(<App />);
    clickDownload();

    expect(
      await screen.findByText(/File saved successfully as zorgtoeslag.ttl/)
    ).toBeInTheDocument();
    expect(written.join('')).toContain('@prefix');
  });

  test('suggests a filename derived from the service, defaulting to "service"', async () => {
    const { handle } = fileHandleSpy();
    window.showSaveFilePicker = vi.fn().mockResolvedValue(handle);

    render(<App />);
    clickDownload();

    // Nothing has been typed, so neither the name nor the identifier is set and
    // the last fallback applies.
    await waitFor(() =>
      expect(window.showSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedName: 'service.ttl' })
      )
    );
  });

  test('the confirmation clears itself after a few seconds', async () => {
    const { handle } = fileHandleSpy();
    window.showSaveFilePicker = vi.fn().mockResolvedValue(handle);

    render(<App />);
    clickDownload();
    await screen.findByText(/File saved successfully/);

    vi.advanceTimersByTime(5000);

    await waitFor(() =>
      expect(screen.queryByText(/File saved successfully/)).not.toBeInTheDocument()
    );
  });

  test('cancelling the dialog saves nothing and says nothing', async () => {
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    window.showSaveFilePicker = vi.fn().mockRejectedValue(abort);
    const createElement = vi.spyOn(document, 'createElement');

    render(<App />);
    clickDownload();

    await waitFor(() => expect(window.showSaveFilePicker).toHaveBeenCalled());
    expect(screen.queryByText(/Error saving file/)).not.toBeInTheDocument();
    // No anchor is minted, so the fallback download did not run either.
    expect(createElement).not.toHaveBeenCalledWith('a');
  });

  test('a real failure warns and falls back to a plain download', async () => {
    window.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('disk full'));

    render(<App />);
    clickDownload();

    expect(
      await screen.findByText(/Error saving file. Using fallback download/)
    ).toBeInTheDocument();
  });
});

describe('saving without the File System Access API', () => {
  test('falls straight through to the plain download', () => {
    // Firefox and Safari have no picker; the button must still produce a file.
    delete window.showSaveFilePicker;
    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    );

    render(<App />);
    clickDownload();

    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('service.ttl');
  });
});
