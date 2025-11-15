/**
 * Suppression list for email addresses that have bounced or complained.
 * This in-memory list records emails that should not receive further OTP emails.
 * In a production deployment this data should be persisted in a database
 * or cache to survive restarts and be shared across server instances.
 */

// Internal set of suppressed email addresses (lowercased)
const suppressed = new Set<string>();

/**
 * Add an email to the suppression list. The address will be normalised to
 * lowercase before being stored.
 *
 * @param email The email address to suppress
 */
export function addSuppressedEmail(email: string): void {
  suppressed.add(email.toLowerCase());
}

/**
 * Check whether an email is suppressed. Returns true if the email has been
 * recorded as bounced or complained.
 *
 * @param email The email address to check
 */
export function isSuppressed(email: string): boolean {
  return suppressed.has(email.toLowerCase());
}

/**
 * Remove an email from the suppression list. Useful if a suppression was
 * recorded in error or the user has resolved deliverability issues.
 *
 * @param email The email address to remove from suppression
 */
export function removeSuppressedEmail(email: string): void {
  suppressed.delete(email.toLowerCase());
}

/**
 * Retrieve all suppressed email addresses. Intended for administrative
 * introspection; avoid exposing this list publicly.
 */
export function getSuppressedEmails(): string[] {
  return Array.from(suppressed);
}