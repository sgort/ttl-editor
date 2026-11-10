import { expect } from '@playwright/test';

/**
 * Signs the journey in as an lde-author (#163 in linked-data-explorer).
 *
 * Deploying to Operaton needs a token with the realm role lde-author; signed
 * out, the DMN tab offers only a test deploy to the tenant TestOnly, which the
 * journeys do not drive. The account is the e2e user that
 * ronl-business-api/scripts/keycloak-add-lde-clients.sh --with-e2e creates.
 *
 *   E2E_LDE_USERNAME   default: lde-e2e
 *   E2E_LDE_PASSWORD   required
 *
 * The sign-in opens Keycloak's employee page ("Medewerker") in a popup; the
 * popup closes itself once Keycloak is done, and the editor picks up the
 * session without reloading.
 */
export async function signIn(page) {
  const password = process.env.E2E_LDE_PASSWORD;
  if (!password) throw new Error('E2E_LDE_PASSWORD is not set');
  const username = process.env.E2E_LDE_USERNAME ?? 'lde-e2e';

  await page.getByRole('button', { name: 'Sign in' }).click();
  const popupOpened = page.waitForEvent('popup');
  await page.getByRole('menuitem', { name: 'Medewerker' }).click();
  const popup = await popupOpened;

  await popup.locator('#username').fill(username);
  await popup.locator('#password').fill(password);
  await popup.locator('#password').press('Enter');

  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 30_000 });
  // Signed in without the role, Deploy would be a test deploy and the journey
  // would fail much later, on a button it cannot find. Say so here instead.
  await expect(
    page.getByText('View only'),
    `${username} is signed in but lacks the lde-author role`
  ).toHaveCount(0);
}
