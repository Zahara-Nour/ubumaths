/**
 * TypstService - Central service for Typst compilation
 *
 * Wraps the Typst compiler with:
 * - Singleton pattern for shared instance
 * - Compilation queue with priority system
 * - Cache integration for performance
 * - State management for UI feedback
 *
 * @module typst/service/typst-service
 *
 * @example Basic usage
 * ```typescript
 * import { getTypstService } from '$lib/typst/service';
 *
 * const service = getTypstService();
 * await service.initialize();
 *
 * const result = await service.compile(typstSource, { format: 'pdf' });
 * if (result.success) {
 *   // Use result.data (Uint8Array for PDF)
 * }
 * ```
 *
 * @example With priority
 * ```typescript
 * import { getTypstService, PRIORITY } from '$lib/typst/service';
 *
 * const service = getTypstService();
 * const result = await service.compileWithPriority(
 *   typstSource,
 *   { format: 'pdf' },
 *   PRIORITY.URGENT  // Downloads, prints
 * );
 * ```
 */

import type {
	CompileOptions,
	CompileResult,
	ServiceState,
	TypstServiceConfig,
	OutputFormat,
	CacheStats,
	TypstCompiler
} from '../types';
import { DEFAULT_SERVICE_CONFIG } from '../types';
import { TypstCache } from '../cache';
import { getTypstCompiler } from '../compiler';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Priority levels for compilation queue
 *
 * Higher values = higher priority = processed first
 */
export const PRIORITY = {
	/** Background/batch compilations (lowest priority) */
	BATCH: 0,
	/** Normal user-initiated compilations */
	NORMAL: 1,
	/** Preview refreshes */
	PREVIEW: 2,
	/** Downloads, prints (highest priority) */
	URGENT: 3
} as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Queue item for compilation requests
 */
interface QueueItem {
	/** Unique identifier for this queue item */
	id: string;
	/** Typst source content to compile */
	content: string;
	/** Compilation options (format, skipCache) */
	options: CompileOptions;
	/** Priority level (higher = processed first) */
	priority: number;
	/** Promise resolve callback */
	resolve: (result: CompileResult) => void;
	/** Promise reject callback */
	reject: (error: Error) => void;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * TypstService - Singleton service for Typst compilation
 *
 * Provides centralized compilation with:
 * - Priority-based queue management
 * - LRU cache integration
 * - State tracking for UI feedback
 * - Timeout handling for long compilations
 */
export class TypstService {
	private static instance: TypstService | null = null;

	private compiler: TypstCompiler | null = null;
	private cache: TypstCache;
	private queue: QueueItem[] = [];
	private isProcessing = false;
	private _state: ServiceState = 'idle';
	private config: Required<TypstServiceConfig>;
	private stateListeners: Set<(state: ServiceState) => void> = new Set();

	/**
	 * Private constructor - use getInstance() or getTypstService()
	 */
	private constructor(config?: TypstServiceConfig) {
		this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
		this.cache = new TypstCache(this.config.cacheMaxSize, this.config.cacheTTL);
	}

	/**
	 * Get singleton instance of TypstService
	 *
	 * @param config - Optional configuration (only used on first call)
	 * @returns The singleton TypstService instance
	 */
	static getInstance(config?: TypstServiceConfig): TypstService {
		if (!TypstService.instance) {
			TypstService.instance = new TypstService(config);
		}
		return TypstService.instance;
	}

	/**
	 * Reset singleton instance (for testing)
	 */
	static resetInstance(): void {
		TypstService.instance = null;
	}

	// =========================================================================
	// State Management
	// =========================================================================

	/**
	 * Current service state
	 */
	get state(): ServiceState {
		return this._state;
	}

	/**
	 * Update state and notify listeners
	 */
	private setState(newState: ServiceState): void {
		this._state = newState;
		this.stateListeners.forEach((listener) => listener(newState));
	}

	/**
	 * Subscribe to state changes
	 *
	 * @param listener - Callback invoked on state change
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = service.onStateChange((state) => {
	 *   console.log('State changed to:', state);
	 * });
	 * // Later: unsubscribe();
	 * ```
	 */
	onStateChange(listener: (state: ServiceState) => void): () => void {
		this.stateListeners.add(listener);
		return () => this.stateListeners.delete(listener);
	}

	// =========================================================================
	// Initialization
	// =========================================================================

	/**
	 * Initialize the service by loading the Typst compiler
	 *
	 * @returns True if initialization succeeded, false otherwise
	 */
	async initialize(): Promise<boolean> {
		if (this.compiler) return true;

		this.setState('loading');
		try {
			this.compiler = await getTypstCompiler();
			this.setState('ready');
			return true;
		} catch (_error) {
			this.setState('error');
			return false;
		}
	}

	// =========================================================================
	// Compilation
	// =========================================================================

	/**
	 * Compile Typst content with default priority
	 *
	 * @param content - Typst source content
	 * @param options - Compilation options (format, skipCache)
	 * @returns Compilation result
	 *
	 * @example
	 * ```typescript
	 * const result = await service.compile(typstSource, { format: 'pdf' });
	 * if (result.success) {
	 *   downloadPdf(result.data as Uint8Array);
	 * }
	 * ```
	 */
	async compile(
		content: string,
		options: CompileOptions = { format: 'pdf' }
	): Promise<CompileResult> {
		return this.compileWithPriority(content, options, PRIORITY.NORMAL);
	}

	/**
	 * Compile Typst content with specified priority
	 *
	 * Higher priority items are processed first in the queue.
	 *
	 * @param content - Typst source content
	 * @param options - Compilation options
	 * @param priority - Priority level (use PRIORITY constants)
	 * @returns Compilation result
	 */
	async compileWithPriority(
		content: string,
		options: CompileOptions,
		priority: number
	): Promise<CompileResult> {
		// For 'typst' format, just return the content directly (no compilation needed)
		if (options.format === 'typst') {
			return { success: true, data: content, format: 'typst', cached: false };
		}

		// Check cache first (unless skipCache)
		if (!options.skipCache) {
			const cached = this.cache.get(content, options.format);
			if (cached !== null) {
				return { success: true, data: cached, format: options.format, cached: true };
			}
		}

		// Add to queue
		return new Promise((resolve, reject) => {
			const item: QueueItem = {
				id: crypto.randomUUID(),
				content,
				options,
				priority,
				resolve,
				reject
			};

			// Insert by priority (higher priority = earlier in queue)
			const insertIndex = this.queue.findIndex((q) => q.priority < priority);
			if (insertIndex === -1) {
				this.queue.push(item);
			} else {
				this.queue.splice(insertIndex, 0, item);
			}

			this.processQueue();
		});
	}

	/**
	 * Process items from the queue sequentially
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) return;

		this.isProcessing = true;

		try {
			while (this.queue.length > 0) {
				const item = this.queue.shift()!;

				try {
					// Ensure compiler is initialized
					if (!this.compiler) {
						await this.initialize();
						if (!this.compiler) {
							item.resolve({
								success: false,
								error: 'Failed to initialize compiler',
								format: item.options.format
							});
							continue;
						}
					}

					this.setState('compiling');

					// Compile with timeout
					const result = await this.compileWithTimeout(item);

					// Cache successful result
					if (result.success && result.data) {
						this.cache.set(item.content, item.options.format, result.data);
					}

					item.resolve(result);
				} catch (error) {
					item.resolve({
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
						format: item.options.format
					});
				}
			}
		} finally {
			this.isProcessing = false;
			if (this.compiler) {
				this.setState('ready');
			}
		}
	}

	/**
	 * Compile with timeout protection
	 */
	private async compileWithTimeout(item: QueueItem): Promise<CompileResult> {
		const timeoutPromise = new Promise<CompileResult>((resolve) => {
			setTimeout(() => {
				resolve({
					success: false,
					error: 'Compilation timeout',
					format: item.options.format
				});
			}, this.config.compileTimeout);
		});

		const compilePromise = this.doCompile(item.content, item.options.format);

		return Promise.race([compilePromise, timeoutPromise]);
	}

	/**
	 * Perform actual compilation
	 */
	private async doCompile(content: string, format: OutputFormat): Promise<CompileResult> {
		if (!this.compiler) {
			return { success: false, error: 'Compiler not initialized', format };
		}

		try {
			let data: Uint8Array | string;

			if (format === 'pdf') {
				data = await this.compiler.pdf({ mainContent: content });
			} else if (format === 'svg') {
				data = await this.compiler.svg({ mainContent: content });
			} else {
				return { success: false, error: `Unknown format: ${format}`, format };
			}

			return { success: true, data, format, cached: false };
		} catch (error) {
			// Log the full error for debugging
			console.error('[TypstService] Compilation error:', error);
			if (error instanceof Error) {
				console.error('[TypstService] Error message:', error.message);
				console.error('[TypstService] Error stack:', error.stack);
			}
			// Try to extract as much info as possible from the error
			let errorMessage = 'Compilation failed';
			if (error instanceof Error) {
				errorMessage = error.message || 'Compilation failed';
			} else if (typeof error === 'string') {
				errorMessage = error;
			} else if (error && typeof error === 'object') {
				errorMessage = JSON.stringify(error);
			}
			return {
				success: false,
				error: errorMessage,
				format
			};
		}
	}

	// =========================================================================
	// Cache Management
	// =========================================================================

	/**
	 * Get current queue length
	 */
	getQueueLength(): number {
		return this.queue.length;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		return this.cache.getStats();
	}

	/**
	 * Clear the compilation cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	// =========================================================================
	// Virtual File System (for external images)
	// =========================================================================

	/**
	 * Map a virtual file path to binary content
	 *
	 * Use this to make external images available to the Typst compiler.
	 * The compiler runs in WASM and cannot access external URLs directly,
	 * so images must be fetched and mapped to virtual paths.
	 *
	 * @param path - Virtual file path (e.g., '/virtual/images/abc123.png')
	 * @param content - Binary content as Uint8Array
	 *
	 * @example
	 * ```typescript
	 * const imageData = await fetch(url).then(r => r.arrayBuffer());
	 * service.mapShadow('/virtual/images/photo.png', new Uint8Array(imageData));
	 * ```
	 */
	mapShadow(path: string, content: Uint8Array): void {
		if (!this.compiler) {
			logger.warn('Cannot map shadow: compiler not initialized');
			return;
		}

		try {
			this.compiler.mapShadow(path, content);
			logger.info('Mapped virtual file', { path, size: content.length });
		} catch (error) {
			logger.error('Failed to map shadow file', {
				path,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	/**
	 * Map multiple virtual files at once
	 *
	 * Convenience method for mapping multiple images.
	 *
	 * @param files - Map of virtual path to binary content
	 */
	mapShadowBatch(files: Map<string, Uint8Array>): void {
		for (const [path, content] of files) {
			this.mapShadow(path, content);
		}
	}

	/**
	 * Reset/clear all shadow mappings
	 *
	 * Call this after compilation to free memory from mapped files.
	 * Note: This also clears any files added via addSource.
	 */
	resetShadow(): void {
		if (!this.compiler) {
			return;
		}

		try {
			this.compiler.resetShadow();
			logger.info('Reset shadow file system');
		} catch (error) {
			logger.warn('Failed to reset shadow', {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	// =========================================================================
	// Cleanup
	// =========================================================================

	/**
	 * Dispose the service and release resources
	 *
	 * Clears the queue, cache, and resets state.
	 * Call this when the service is no longer needed.
	 */
	dispose(): void {
		this.queue = [];
		this.cache.clear();
		this.resetShadow();
		this.compiler = null;
		this.setState('idle');
		this.stateListeners.clear();
	}
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Get the singleton TypstService instance
 *
 * Convenience wrapper around TypstService.getInstance()
 *
 * @param config - Optional configuration (only used on first call)
 * @returns The singleton TypstService instance
 *
 * @example
 * ```typescript
 * const service = getTypstService();
 * const result = await service.compile(typstSource, { format: 'pdf' });
 * ```
 */
export function getTypstService(config?: TypstServiceConfig): TypstService {
	return TypstService.getInstance(config);
}
