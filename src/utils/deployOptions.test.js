import { fetchTestDeployOffer } from './deployOptions';

/**
 * GET /v1/dmns/deploy/options (#163 in linked-data-explorer): whether the
 * backend lets a visitor who is not an author make a test deploy. The DMN tab
 * offers "Test deploy" on it, and the "View only" note words itself by it.
 */

const respond = (body, ok = true) => ({ ok, json: () => Promise.resolve(body) });
const OFFER = { enabled: true, tenantId: 'TestOnly', ttlHours: 48 };

afterEach(() => {
  delete global.fetch;
});

describe('fetchTestDeployOffer', () => {
  test('returns the offer when test deploys are enabled', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(respond({ success: true, data: { testDeploy: OFFER } }));

    await expect(fetchTestDeployOffer()).resolves.toEqual(OFFER);
    expect(String(global.fetch.mock.calls[0][0])).toMatch(/\/v1\/dmns\/deploy\/options$/);
  });

  test('returns null when they are disabled', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        respond({ success: true, data: { testDeploy: { ...OFFER, enabled: false } } })
      );

    await expect(fetchTestDeployOffer()).resolves.toBeNull();
  });

  test('returns null on an HTTP error, a malformed body or a network failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(respond({}, false));
    await expect(fetchTestDeployOffer()).resolves.toBeNull();

    global.fetch = vi.fn().mockResolvedValue(respond({ success: true }));
    await expect(fetchTestDeployOffer()).resolves.toBeNull();

    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchTestDeployOffer()).resolves.toBeNull();
  });
});
