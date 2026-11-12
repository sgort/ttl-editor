/* global window */
// The sign-in or sign-out popup lands here when Keycloak is done (#163 in
// linked-data-explorer). Tell the editor's tabs, which then pick up the session
// with a silent check, and close. The authorization code in the URL is not used.
try {
  new window.BroadcastChannel('ttl-auth').postMessage('done');
} catch {
  // No BroadcastChannel: the editor notices the popup closing instead.
}
window.close();
