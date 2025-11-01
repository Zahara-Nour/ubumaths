/**
 * Load Function Monitoring System
 * =================================
 *
 * Provides tracing and performance monitoring for SvelteKit load functions.
 * Similar to the cache monitoring system, but for navigation flow.
 *
 * FEATURES:
 * - Automatic route detection from event.route.id
 * - Server vs Client load differentiation
 * - First visit vs Revisit tracking
 * - Parent() call detection and timing
 * - Performance metrics (execution time)
 * - Conditional logging via environment variable
 *
 * USAGE:
 * ```typescript
 * import { loadMonitor } from '$lib/utils/loadTracer';
 *
 * // Server-side load
 * export const load = loadMonitor.traceServerLoad(async (event) => {
 *   const data = await event.parent();
 *   // ... your logic
 *   return { result };
 * });
 *
 * // Client-side load
 * export const load = loadMonitor.traceClientLoad(async (event) => {
 *   const data = await event.parent();
 *   // ... your logic
 *   return { result };
 * });
 * ```
 *
 * ENVIRONMENT VARIABLE:
 * VITE_ENABLE_LOAD_MONITORING=true  # Enable load function tracing
 */

import { browser, dev } from '$app/environment';
import { createLogger } from '$lib/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

// We use generic types instead of specific SvelteKit types
// because PageServerLoad, PageLoad, etc. are generated per-file by SvelteKit

// Generic event interfaces based on SvelteKit's actual types
interface ServerLoadEvent {
	fetch: typeof fetch;
	params: Record<string, string>;
	route: { id: string | null };
	url: URL;
	locals: App.Locals;
	parent: () => Promise<Record<string, unknown>>;
	depends: (...deps: string[]) => void;
	request: Request;
	cookies: {
		get: (name: string) => string | undefined;
		set: (name: string, value: string, opts?: unknown) => void;
		delete: (name: string, opts?: unknown) => void;
	};
	setHeaders: (headers: Record<string, string>) => void;
	isDataRequest: boolean;
	isSubRequest: boolean;
}

interface LoadEvent {
	fetch: typeof fetch;
	params: Record<string, string>;
	route: { id: string | null };
	url: URL;
	data: Record<string, unknown>;
	parent: () => Promise<Record<string, unknown>>;
	depends: (...deps: string[]) => void;
}

type ServerLoadFunction = (event: ServerLoadEvent) => Promise<Record<string, unknown>> | Record<string, unknown>;
type ClientLoadFunction = (event: LoadEvent) => Promise<Record<string, unknown>> | Record<string, unknown>;

type VisitType = 'First visit' | 'Revisit';
type LoadType = 'Server' | 'Client';

// ============================================================================
// LOAD MONITOR CLASS
// ============================================================================

export class LoadMonitor {
	// Track visited routes for "First visit" vs "Revisit" detection
	// Key format: "${route}:${type}" (e.g., "/dashboard:Server")
	private visitedRoutes = new Set<string>();

	// Logger instance (trace level for maximum detail)
	private readonly logger = createLogger('loadTracer.ts', 'trace');

	// Monitoring enabled flag (from environment variable)
	private readonly monitoringEnabled =
		dev && import.meta.env.VITE_ENABLE_LOAD_MONITORING === 'true';

	/**
	 * Conditional logging helper
	 * Only logs if monitoring is enabled
	 * @private
	 */
	private log(message: string, ...args: unknown[]) {
		if (!this.monitoringEnabled) return;
		this.logger.trace(message, ...args);
	}

	/**
	 * Get visit type for a route
	 * Tracks both SvelteKit automatic detection AND manual tracking
	 * @private
	 */
	private getVisitType(route: string, type: LoadType): VisitType {
		const key = `${route}:${type}`;

		// Check if we've seen this route:type combination before
		const isRevisit = this.visitedRoutes.has(key);

		// Mark as visited for future calls
		this.visitedRoutes.add(key);

		return isRevisit ? 'Revisit' : 'First visit';
	}

	/**
	 * Wrap event.parent() to detect calls and measure timing
	 * @private
	 */
	private wrapParent<T extends Record<string, unknown>>(
		originalParent: () => Promise<T>,
		route: string,
		type: LoadType
	): () => Promise<T> {
		return async () => {
			const startTime = performance.now();

			try {
				const result = await originalParent();

				const duration = (performance.now() - startTime).toFixed(2);

				this.log(`[${type} Load] ${route} - parent() called (${duration}ms)`);

				return result;
			} catch (error) {
				const duration = (performance.now() - startTime).toFixed(2);
				this.log(`[${type} Load] ${route} - parent() failed (${duration}ms)`, error);
				throw error;
			}
		};
	}

	/**
	 * Trace a server-side load function
	 *
	 * @param loadFn - The original server load function
	 * @returns Wrapped load function with monitoring
	 *
	 * @example
	 * ```typescript
	 * export const load = loadMonitor.traceServerLoad(async (event) => {
	 *   const { user } = await event.parent();
	 *   return { user };
	 * });
	 * ```
	 */
	traceServerLoad<T extends ServerLoadFunction>(loadFn: T): T {
		// If monitoring disabled, return original function unchanged
		if (!this.monitoringEnabled) {
			return loadFn;
		}

		// Create wrapped function
		const wrapped = async (event: ServerLoadEvent) => {
			const route = event.route.id || '/';
			const visitType = this.getVisitType(route, 'Server');

			// Wrap event.parent() to track calls
			const wrappedEvent = {
				...event,
				parent: this.wrapParent(event.parent.bind(event), route, 'Server')
			} as ServerLoadEvent;

			this.log(`[Server Load] ${route} (${visitType}) - Started`);

			const startTime = performance.now();

			try {
				const result = await loadFn(wrappedEvent);

				const duration = (performance.now() - startTime).toFixed(2);

				this.log(`[Server Load] ${route} (${visitType}) - Completed (${duration}ms)`);

				return result;
			} catch (error) {
				const duration = (performance.now() - startTime).toFixed(2);
				this.log(`[Server Load] ${route} (${visitType}) - Error (${duration}ms)`, error);
				throw error;
			}
		};

		return wrapped as T;
	}

	/**
	 * Trace a client-side load function
	 *
	 * @param loadFn - The original client load function
	 * @returns Wrapped load function with monitoring
	 *
	 * @example
	 * ```typescript
	 * export const load = loadMonitor.traceClientLoad(async (event) => {
	 *   const { user } = await event.parent();
	 *   return { user };
	 * });
	 * ```
	 */
	traceClientLoad<T extends ClientLoadFunction>(loadFn: T): T {
		// If monitoring disabled, return original function unchanged
		if (!this.monitoringEnabled) {
			return loadFn;
		}

		// Create wrapped function
		const wrapped = async (event: LoadEvent) => {
			const route = event.route.id || '/';
			const visitType = this.getVisitType(route, 'Client');

			// Determine if this is SSR or client-side navigation
			const context = browser ? 'Browser' : 'SSR';

			// Wrap event.parent() to track calls
			const wrappedEvent = {
				...event,
				parent: this.wrapParent(event.parent.bind(event), route, 'Client')
			} as LoadEvent;

			this.log(`[Client Load] ${route} (${visitType}, ${context}) - Started`);

			const startTime = performance.now();

			try {
				const result = await loadFn(wrappedEvent);

				const duration = (performance.now() - startTime).toFixed(2);

				this.log(`[Client Load] ${route} (${visitType}, ${context}) - Completed (${duration}ms)`);

				return result;
			} catch (error) {
				const duration = (performance.now() - startTime).toFixed(2);
				this.log(`[Client Load] ${route} (${visitType}, ${context}) - Error (${duration}ms)`, error);
				throw error;
			}
		};

		return wrapped as T;
	}

	/**
	 * Clear visited routes tracking
	 * Useful for testing or resetting state
	 */
	clearVisitedRoutes(): void {
		this.visitedRoutes.clear();
		this.log('[Load Monitor] Cleared visited routes tracking');
	}

	/**
	 * Get statistics about monitored routes
	 * @returns Number of unique route:type combinations tracked
	 */
	getStats(): { totalVisited: number; routes: string[] } {
		return {
			totalVisited: this.visitedRoutes.size,
			routes: Array.from(this.visitedRoutes)
		};
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of the load monitor
 */
export const loadMonitor = new LoadMonitor();
