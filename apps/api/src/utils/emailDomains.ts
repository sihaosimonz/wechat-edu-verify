/**
 * Utility functions for checking if an email's domain is allowed based on
 * a list of allowed domain patterns. Supported patterns include exact
 * matches (e.g. "example.edu") and wildcard suffix matches (e.g. "*.edu")
 * which will match any subdomain ending in ".edu". Domain names are
 * compared in a case‑insensitive manner.
 */

/**
 * Determine whether a given email address belongs to an allowed domain.
 *
 * @param email The email address to check
 * @param allowedDomains An array of allowed domain patterns (e.g. ['*.edu', 'example.ac.uk'])
 * @returns true if the email's domain matches one of the allowed patterns
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  for (const pattern of allowedDomains) {
    const p = pattern.trim().toLowerCase();
    if (!p) continue;
    // Exact match
    if (!p.startsWith('*.') && domain === p) {
      return true;
    }
    // Wildcard suffix match (e.g. '*.edu' matches 'school.edu' and 'sub.school.edu')
    if (p.startsWith('*.')) {
      const suffix = p.slice(1); // remove leading '*'
      if (domain === suffix.slice(1) || domain.endsWith(suffix)) {
        return true;
      }
    }
  }
  return false;
}