import '@testing-library/jest-dom';

import { vi } from 'vitest';

/* global globalThis -- the shared eslint config predates ES2020 globals. */

// Transitional: the 43 existing call sites use the jest global. Aliasing it
// means phase 1 changes no test file, so any failure here is unambiguously
// the runner or the config — never an edit someone made. Removed in phase 4.
globalThis.jest = vi;
