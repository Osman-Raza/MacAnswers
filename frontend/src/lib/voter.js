/**
 * Returns a stable anonymous token for the current browser session.
 * Stored in sessionStorage — resets on new tab/session.
 * Used to prevent double-upvotes.
 */
export function getVoterToken() {
  const KEY = "mac_voter_token";
  let token = sessionStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(KEY, token);
  }
  return token;
}
