import { render, screen } from '@testing-library/react';

import App from './App';

// Replaces CRA's stock "learn react link" stub, which asserted text this
// app never rendered and had been silently failing test:ci ever since
// (see https://iou-architectuur.open-regels.nl/cpsv-editor/developer/testing/,
// phase P0).
test('renders the editor shell without crashing', () => {
  render(<App />);
  expect(screen.getByText('Core Public Service Editor')).toBeInTheDocument();
});
