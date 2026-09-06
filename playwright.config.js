import { defineConfig, devices } from '@playwright/test';

// A headed run exists to be watched, and the journey finishes in about two
// seconds — too fast to follow. Slow the actions down by default when --headed
// is present, and let E2E_SLOW_MO override in either direction (0 disables it).
// Headless runs stay at full speed, since nobody is looking.
// npm_lifecycle_event is the npm script being run, and it is the reliable signal
// here: process.argv alone does not carry --headed by the time this config is
// evaluated, so detecting on that silently did nothing.
const isHeaded =
  process.env.npm_lifecycle_event === 'test:e2e:headed' || process.argv.includes('--headed');
const slowMo = Number(process.env.E2E_SLOW_MO ?? (isHeaded ? 400 : 0));

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
 *   npm run test:e2e            drive the default SVB example, headless
 *   E2E_DMN=heusden/HeusdenpasEindresultaat npm run test:e2e
 *
 *   npm run test:e2e:headed    watch it in a real browser window: tabs opening,
 *                              the DMN uploading, Deploy to Operaton and
 *                              Evaluate Decision being clicked. Actions are
 *                              slowed to 400ms so they can be followed; set
 *                              E2E_SLOW_MO to change that, or 0 for full speed.
 *
 *   npm run test:e2e:ui        the same journey in Playwright's UI mode
 *
 * UI mode does NOT run anything on startup, and that is not a hang. It opens,
 * discovers the tests, and waits for you to press play — the green ▶ at the top
 * of the TESTS panel, the ▶ that appears on hovering a test row, or F5. Until
 * then no dev server starts, the preflight below has not run, and nothing has
 * touched the backend, so an idle window with an empty trace pane is exactly
 * what it should look like. It stays open and re-runs on save; Ctrl-C exits.
 *
 * See e2e/authoring-journey.spec.js for what E2E_DMN accepts.
 */
export default defineConfig({
  testDir: './e2e',

  // Checks the live stack before anything is driven, and fails with a message
  // naming what is missing. Without it, a backend that is down surfaces as a
  // Playwright timeout on a button — true, but several steps removed from the
  // cause. See e2e/global-setup.js.
  globalSetup: './e2e/global-setup.js',

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

  // `open: 'always'` matches ronl-business-api's frontend suite: the HTML report
  // opens after every run rather than leaving you to remember
  // `npx playwright show-report`. It is where the trace, the screenshots and the
  // video live, which is most of the value of running this at all.
  //
  // Note it serves the report and holds the terminal until Ctrl-C. That is fine
  // for a suite run by hand, which this is — but anything that ever wires it
  // into CI must override this, or the job will hang rather than finish.
  reporter: [['list'], ['html', { open: 'always' }]],

  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: { slowMo },
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
