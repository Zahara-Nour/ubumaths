/**
 * Demo Hub - Static Prerendering
 * ===============================
 *
 * This page can be prerendered at build time because:
 * - No dynamic data (no auth, no database queries)
 * - Pure static content with links to other demos
 * - Same for all users
 *
 * Performance impact:
 * - Instant load (HTML already generated)
 * - No server-side rendering needed
 * - Better SEO and initial page load
 */

export const prerender = true;
