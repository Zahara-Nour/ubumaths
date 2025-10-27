/**
 * Mathémo Game - Server-Side Rendering
 * ======================================
 *
 * Prerendering disabled because:
 * - Bits UI Select component has SSR issues with snippets
 * - The Select dropdown for difficulty selection requires client-side rendering
 *
 * Performance impact:
 * - Still very fast (client-side game logic)
 * - localStorage for state persistence
 * - Word lists are statically imported
 */

export const prerender = false;
