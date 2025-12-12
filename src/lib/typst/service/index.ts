/**
 * Typst Service Module
 *
 * Central service for Typst compilation with queue management,
 * caching, and state tracking.
 *
 * @module typst/service
 *
 * @example
 * ```typescript
 * import { getTypstService, PRIORITY } from '$lib/typst/service';
 *
 * const service = getTypstService();
 * await service.initialize();
 *
 * // Normal compilation
 * const result = await service.compile(typstSource, { format: 'pdf' });
 *
 * // Urgent compilation (downloads, prints)
 * const urgentResult = await service.compileWithPriority(
 *   typstSource,
 *   { format: 'pdf' },
 *   PRIORITY.URGENT
 * );
 *
 * // State subscription
 * const unsubscribe = service.onStateChange((state) => {
 *   console.log('Service state:', state);
 * });
 * ```
 */

export { TypstService, getTypstService, PRIORITY } from './typst-service';
