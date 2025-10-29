/**
 * Cache Event Bus - Publish/Subscribe system for cache invalidation
 *
 * This event bus allows different components and caches to synchronize by publishing
 * and subscribing to cache invalidation events. It enables automatic cache updates
 * when data changes, even across different browser tabs (when combined with BroadcastChannel).
 *
 * @example
 * // Publisher - after updating student data
 * cacheEventBus.invalidateStudents(classId, 'Student grades updated');
 *
 * @example
 * // Subscriber - in a component that uses student data
 * $effect(() => {
 *   const unsubscribe = cacheEventBus.subscribe((event) => {
 *     if (event.type === 'students' && event.scope.classId === currentClassId) {
 *       // Reload student data
 *       studentsCache.invalidate(currentClassId);
 *     }
 *   });
 *   return unsubscribe; // Cleanup on component unmount
 * });
 */

/**
 * Cache invalidation event types
 */
export type CacheInvalidationType = 'students' | 'gidouilles' | 'warnings' | 'all';

/**
 * Scope definition for cache invalidation
 * Allows targeting specific subsets of data
 */
export type CacheInvalidationScope = {
	/** Teacher ID - for teacher-specific caches */
	teacherId?: string;
	/** Class ID - for class-specific caches */
	classId?: string;
	/** Academic period ID - for period-specific caches */
	periodId?: string;
};

/**
 * Cache invalidation event structure
 */
export type CacheInvalidationEvent = {
	/** Type of cache to invalidate */
	type: CacheInvalidationType;
	/** Scope of the invalidation (filters which caches should respond) */
	scope: CacheInvalidationScope;
	/** Optional reason for debugging/logging */
	reason?: string;
	/** Timestamp when the event was published (milliseconds since epoch) */
	timestamp: number;
};

/**
 * Event listener callback type
 */
type EventListener = (event: CacheInvalidationEvent) => void;

/**
 * Cache Event Bus class
 * Implements a publish/subscribe pattern for cache invalidation events
 */
class CacheEventBus {
	/** Set of registered event listeners */
	private listeners: Set<EventListener> = new Set();

	/** BroadcastChannel for cross-tab communication */
	private broadcastChannel: BroadcastChannel | null = null;

	constructor() {
		// Initialize BroadcastChannel for cross-tab sync (browser only)
		if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
			this.broadcastChannel = new BroadcastChannel('cache-invalidation');

			// Listen for events from other tabs
			this.broadcastChannel.onmessage = (event) => {
				// Re-broadcast to local listeners
				const cacheEvent = event.data as CacheInvalidationEvent;
				console.log(
					'[CacheEventBus] Received event from other tab:',
					cacheEvent.type,
					cacheEvent.reason
				);

				this.listeners.forEach((listener) => {
					try {
						listener(cacheEvent);
					} catch (error) {
						console.error('[CacheEventBus] Error in listener:', error);
					}
				});
			};
		}
	}

	/**
	 * Publish a cache invalidation event to all subscribers
	 *
	 * @param event - The invalidation event (timestamp will be added automatically)
	 *
	 * @example
	 * cacheEventBus.publish({
	 *   type: 'students',
	 *   scope: { classId: 'abc-123' },
	 *   reason: 'Student grades updated'
	 * });
	 */
	publish(event: Omit<CacheInvalidationEvent, 'timestamp'>): void {
		const fullEvent: CacheInvalidationEvent = {
			...event,
			timestamp: Date.now()
		};

		console.log('[CacheEventBus] Publishing event:', fullEvent.type, fullEvent.reason);

		// Notify all listeners in THIS tab
		this.listeners.forEach((listener) => {
			try {
				listener(fullEvent);
			} catch (error) {
				// Log errors but don't stop other listeners
				console.error('[CacheEventBus] Error in listener:', error);
			}
		});

		// Broadcast to OTHER tabs via BroadcastChannel
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(fullEvent);
			} catch (error) {
				console.error('[CacheEventBus] Error broadcasting to other tabs:', error);
			}
		}
	}

	/**
	 * Subscribe to cache invalidation events
	 *
	 * @param callback - Function to call when events are published
	 * @returns Unsubscribe function to stop receiving events
	 *
	 * @example
	 * // In a Svelte component with $effect
	 * $effect(() => {
	 *   const unsubscribe = cacheEventBus.subscribe((event) => {
	 *     if (event.type === 'students') {
	 *       console.log('Students cache invalidated:', event.reason);
	 *     }
	 *   });
	 *   return unsubscribe; // Cleanup
	 * });
	 *
	 * @example
	 * // Manual subscription/unsubscription
	 * const unsubscribe = cacheEventBus.subscribe(handleEvent);
	 * // Later...
	 * unsubscribe();
	 */
	subscribe(callback: EventListener): () => void {
		this.listeners.add(callback);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Get the number of active subscribers (useful for testing/debugging)
	 */
	get listenerCount(): number {
		return this.listeners.size;
	}

	/**
	 * Helper: Invalidate students cache for a specific class
	 *
	 * @param classId - ID of the class whose students changed
	 * @param reason - Optional reason for debugging
	 *
	 * @example
	 * // After importing students from CSV
	 * cacheEventBus.invalidateStudents(classId, 'Imported 25 students from CSV');
	 *
	 * @example
	 * // After updating a student's grade
	 * cacheEventBus.invalidateStudents(classId, 'Updated student grade');
	 */
	invalidateStudents(classId: string, reason?: string): void {
		this.publish({
			type: 'students',
			scope: { classId },
			reason
		});
	}

	/**
	 * Helper: Invalidate gidouilles (VIP cards) cache for a specific class
	 *
	 * @param classId - ID of the class whose gidouilles changed
	 * @param reason - Optional reason for debugging
	 *
	 * @example
	 * // After awarding gidouilles to a student
	 * cacheEventBus.invalidateGidouilles(classId, 'Awarded 5 gidouilles to student');
	 *
	 * @example
	 * // After bulk gidouille distribution
	 * cacheEventBus.invalidateGidouilles(classId, 'Distributed gidouilles to entire class');
	 */
	invalidateGidouilles(classId: string, reason?: string): void {
		this.publish({
			type: 'gidouilles',
			scope: { classId },
			reason
		});
	}

	/**
	 * Helper: Invalidate warnings cache for a specific class and period
	 *
	 * @param classId - ID of the class whose warnings changed
	 * @param periodId - ID of the academic period
	 * @param reason - Optional reason for debugging
	 *
	 * @example
	 * // After creating a new warning
	 * cacheEventBus.invalidateWarnings(classId, periodId, 'Created warning for homework');
	 *
	 * @example
	 * // After deleting a warning
	 * cacheEventBus.invalidateWarnings(classId, periodId, 'Deleted warning #123');
	 */
	invalidateWarnings(classId: string, periodId: string, reason?: string): void {
		this.publish({
			type: 'warnings',
			scope: { classId, periodId },
			reason
		});
	}

	/**
	 * Helper: Invalidate all caches for a specific teacher
	 * Use this for major operations that affect multiple data types
	 *
	 * @param teacherId - ID of the teacher whose caches should be cleared
	 * @param reason - Optional reason for debugging
	 *
	 * @example
	 * // After end-of-year reset
	 * cacheEventBus.invalidateAll(teacherId, 'End of academic year reset');
	 *
	 * @example
	 * // After changing active period
	 * cacheEventBus.invalidateAll(teacherId, 'Switched to new academic period');
	 */
	invalidateAll(teacherId: string, reason?: string): void {
		this.publish({
			type: 'all',
			scope: { teacherId },
			reason
		});
	}

	/**
	 * Clear all listeners (useful for testing)
	 * @internal
	 */
	_clearListeners(): void {
		this.listeners.clear();
	}

	/**
	 * Clean up BroadcastChannel (useful for testing and cleanup)
	 * @internal
	 */
	_cleanup(): void {
		if (this.broadcastChannel) {
			this.broadcastChannel.close();
			this.broadcastChannel = null;
		}
		this.listeners.clear();
	}
}

/**
 * Singleton instance of the cache event bus
 * Use this throughout the application for cache invalidation
 *
 * @example
 * import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';
 *
 * // Publish an event
 * cacheEventBus.invalidateStudents(classId);
 *
 * // Subscribe to events
 * $effect(() => {
 *   const unsubscribe = cacheEventBus.subscribe((event) => {
 *     console.log('Cache invalidated:', event);
 *   });
 *   return unsubscribe;
 * });
 */
export const cacheEventBus = new CacheEventBus();
