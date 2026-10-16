export const AUTH_COOKIE = "tracker_auth";

// Long-lived so a trusted browser only has to enter the password once.
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

// The cookie stores a hash of the password rather than the password itself.
// Changing APP_PASSWORD invalidates every existing cookie.
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`job-tracker:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
