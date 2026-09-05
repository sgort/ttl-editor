import { defineConfig, devices } from '@playwright/test';

/**
 * P7 of the testing roadmap: an end-to-end authoring journey.
 *
 * This suite is deliberately NOT wired into CI. It drives the real application
 * against two live services — the Linked Data Explorer backend on :3001 and an
 * Operaton engine on :8081 — and neither exists on a GitHub runner. Wiring that
 * up means a service container for Operaton and booting a second repository,
 * which is a much larger piece of work than this. Adding a workflow now would
 * only ever be red, so there isn't one.
 *
 * Run it locally, with both services up:
 *
 *   npm run test:e2e            drive the default SVB example
 *   npm run test:e2e:ui         the same, in Playwright's UI mode
 *   E2E_DMN=heusden/HeusdenpasEindresultaat npm run test:e2e
 *
 * See e2e/authoring-journey.spec.js for what E2E_DMN accepts.
 */
export default defineConfig({
  testDir: './e2e',

  // Kept out of src/ on purpose: vite.config.mjs points Vitest at
  // 'src/**/*.test.{js,jsx}', and a Playwright spec picked up by Vitest fails in
  // a thoroughly confusing way. Separate directories make that impossible rather
  // than merely unlikely.

  // The journey deploys to and evaluates against a real engine. Running the
  // files in parallel would have several deployments of the same decision key
  // racing on one Operaton, so it does not.
  fullyParallel: false,
  workers: 1,

  // A real deploy-then-evaluate round trip is slow, and slow is not flaky.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  // No retries: this suite exists to tell the truth about a live stack. A retry
  // would convert "the backend was down" into a green run.
  retries: 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 1600x900, not the 1280x720 Desktop Chrome defaults to.
        //
        // PreviewPanel mounts in a `fixed right-0 top-0 h-screen w-[500px] z-50`
        // container that is NOT accounted for by the page's own layout, so below
        // 1600px it sits on top of the header controls. Measured:
        //
        //   1280px  Hide Preview COVERED, Clear All COVERED
        //   1440px  Clear All COVERED
        //   1600px  all clickable
        //
        // At 1280 that means opening the preview leaves no way to close it.
        // That is a real defect, not a test artefact, and it is reported rather
        // than papered over — this viewport only keeps the journey from being
        // blocked by it. Narrow it back to 1280 to reproduce.
        viewport: { width: 1600, height: 900 },
      },
    },
  ],

  // Playwright owns the dev server's lifecycle here — starting it, waiting for
  // it, and stopping it again. reuseExistingServer means a server you already
  // have running is used as-is rather than colliding with strictPort: 3000 in
  // vite.config.mjs, which would otherwise fail outright instead of picking
  // another port.
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
