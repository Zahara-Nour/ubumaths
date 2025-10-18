/**
 * Mathémo Game - Static Prerendering
 * ===================================
 *
 * This game can be prerendered because:
 * - Client-side only (localStorage for state)
 * - No auth required
 * - Word lists are static (imported from words.ts)
 *
 * Performance impact:
 * - Instant initial load
 * - Game logic runs client-side
 * - No server round-trip
 */

export const prerender = true;
