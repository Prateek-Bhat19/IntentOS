"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUrl = isValidUrl;
exports.extractDomain = extractDomain;
exports.matchesDomain = matchesDomain;
exports.normalizeUrl = normalizeUrl;
/**
 * Validate and parse URL
 */
function isValidUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
/**
 * Extract domain from URL
 */
function extractDomain(urlString) {
    try {
        const url = new URL(urlString);
        return url.hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
/**
 * Check if URL matches a domain pattern
 */
function matchesDomain(urlString, patterns) {
    const domain = extractDomain(urlString);
    if (!domain)
        return false;
    return patterns.some((pattern) => {
        // Support wildcards like *.amazon.com
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(domain);
    });
}
/**
 * Normalize URL (remove tracking parameters, etc.)
 */
function normalizeUrl(urlString) {
    try {
        const url = new URL(urlString);
        // Remove common tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'tag'];
        trackingParams.forEach((param) => url.searchParams.delete(param));
        return url.toString();
    }
    catch {
        return urlString;
    }
}
