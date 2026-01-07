/**
 * Validate and parse URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if URL matches a domain pattern
 */
export function matchesDomain(urlString: string, patterns: string[]): boolean {
  const domain = extractDomain(urlString);
  if (!domain) return false;

  return patterns.some((pattern) => {
    // Support wildcards like *.amazon.com
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    );
    return regex.test(domain);
  });
}

/**
 * Normalize URL (remove tracking parameters, etc.)
 */
export function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'tag'];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    
    return url.toString();
  } catch {
    return urlString;
  }
}
