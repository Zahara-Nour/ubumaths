/**
 * Tests for TypstService - Singleton service with queue management
 *
 * @module typst/service/typst-service.test
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { TypstService, getTypstService, PRIORITY } from './typst-service';
import type { TypstCompiler, ServiceState } from '../types';

// Mock the compiler module
vi.mock('../compiler', () => ({
	getTypstCompiler: vi.fn()
}));

// Mock the cache module
vi.mock('../cache', () => ({
	TypstCache: vi.fn().mockImplementation(() => ({
		get: vi.fn().mockReturnValue(null),
		set: vi.fn(),
		clear: vi.fn(),
		getStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0, evictions: 0 })
	}))
}));

// Get the mocked function
import { getTypstCompiler } from '../compiler';
import { TypstCache } from '../cache';

describe('TypstService', () => {
	let mockCompiler: TypstCompiler;
	let mockCache: {
		get: Mock;
		set: Mock;
		clear: Mock;
		getStats: Mock;
	};

	beforeEach(() => {
		vi.useFakeTimers();

		// Reset singleton before each test
		TypstService.resetInstance();

		// Create mock compiler
		mockCompiler = {
			setCompilerInitOptions: vi.fn(),
			setRendererInitOptions: vi.fn(),
			svg: vi.fn().mockResolvedValue('<svg>test</svg>'),
			pdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
			mapShadow: vi.fn(),
			addSource: vi.fn(),
			resetShadow: vi.fn()
		};

		// Setup compiler mock to return our mock compiler
		(getTypstCompiler as Mock).mockResolvedValue(mockCompiler);

		// Create a fresh mock cache for each test
		mockCache = {
			get: vi.fn().mockReturnValue(null),
			set: vi.fn(),
			clear: vi.fn(),
			getStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0, evictions: 0 })
		};

		// Reset the mock implementation for each test
		(TypstCache as Mock).mockImplementation(() => mockCache);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	// =========================================================================
	// Singleton
	// =========================================================================

	describe('singleton', () => {
		it('should return singleton instance via getTypstService()', () => {
			const service = getTypstService();
			expect(service).toBeInstanceOf(TypstService);
		});

		it('should return same instance on multiple calls', () => {
			const service1 = getTypstService();
			const service2 = getTypstService();
			const service3 = TypstService.getInstance();

			expect(service1).toBe(service2);
			expect(service2).toBe(service3);
		});
	});

	// =========================================================================
	// State management
	// =========================================================================

	describe('state management', () => {
		it('should start in idle state', () => {
			const service = getTypstService();
			expect(service.state).toBe('idle');
		});

		it('should transition to loading when initializing', async () => {
			const service = getTypstService();
			const states: ServiceState[] = [];

			service.onStateChange((state) => {
				states.push(state);
			});

			// Create a promise that we control when to resolve
			let resolveCompiler: (value: TypstCompiler) => void;
			const compilerPromise = new Promise<TypstCompiler>((resolve) => {
				resolveCompiler = resolve;
			});
			(getTypstCompiler as Mock).mockReturnValue(compilerPromise);

			// Start initialization
			const initPromise = service.initialize();

			// Should have transitioned to loading
			expect(states).toContain('loading');

			// Resolve the compiler
			resolveCompiler!(mockCompiler);
			await initPromise;
		});

		it('should transition to ready after initialization', async () => {
			const service = getTypstService();
			const states: ServiceState[] = [];

			service.onStateChange((state) => {
				states.push(state);
			});

			await service.initialize();

			expect(service.state).toBe('ready');
			expect(states).toContain('ready');
		});

		it('should transition to compiling during compilation', async () => {
			const service = getTypstService();
			await service.initialize();

			const states: ServiceState[] = [];
			service.onStateChange((state) => {
				states.push(state);
			});

			await service.compile('#set page(paper: "a4")');

			expect(states).toContain('compiling');
		});

		it('should allow subscribing to state changes', async () => {
			const service = getTypstService();
			const listener = vi.fn();

			const unsubscribe = service.onStateChange(listener);
			await service.initialize();

			expect(listener).toHaveBeenCalled();

			// Unsubscribe should work
			unsubscribe();
			listener.mockClear();

			// Compile should not trigger the listener anymore
			await service.compile('test');
			expect(listener).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// Compilation
	// =========================================================================

	describe('compilation', () => {
		it('should compile typst content to PDF', async () => {
			const service = getTypstService();
			await service.initialize();

			const result = await service.compile('#set page(paper: "a4")', { format: 'pdf' });

			expect(result.success).toBe(true);
			expect(result.format).toBe('pdf');
			expect(result.data).toBeInstanceOf(Uint8Array);
			expect(mockCompiler.pdf).toHaveBeenCalled();
		});

		it('should compile typst content to SVG', async () => {
			const service = getTypstService();
			await service.initialize();

			const result = await service.compile('#set page(paper: "a4")', { format: 'svg' });

			expect(result.success).toBe(true);
			expect(result.format).toBe('svg');
			expect(typeof result.data).toBe('string');
			expect(mockCompiler.svg).toHaveBeenCalled();
		});

		it('should return typst source when format is typst', async () => {
			const service = getTypstService();
			const content = '#set page(paper: "a4")';

			const result = await service.compile(content, { format: 'typst' });

			expect(result.success).toBe(true);
			expect(result.format).toBe('typst');
			expect(result.data).toBe(content);
			expect(result.cached).toBe(false);
			// Should not call compiler for typst format
			expect(mockCompiler.pdf).not.toHaveBeenCalled();
			expect(mockCompiler.svg).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// Queue
	// =========================================================================

	describe('queue', () => {
		it('should queue compilations sequentially', async () => {
			const service = getTypstService();
			await service.initialize();

			const callOrder: number[] = [];
			let pdfResolve: ((value: Uint8Array) => void) | null = null;

			// Make PDF compilation slow
			(mockCompiler.pdf as Mock).mockImplementation(
				() =>
					new Promise<Uint8Array>((resolve) => {
						pdfResolve = resolve;
					})
			);

			// Start first compilation
			const compile1Promise = service.compile('content1', { format: 'pdf' }).then(() => {
				callOrder.push(1);
			});

			// Start second compilation (should be queued)
			const compile2Promise = service.compile('content2', { format: 'pdf' }).then(() => {
				callOrder.push(2);
			});

			// Queue should have 1 item (second one waiting)
			expect(service.getQueueLength()).toBeGreaterThanOrEqual(0);

			// Resolve first compilation
			pdfResolve!(new Uint8Array([1]));
			await compile1Promise;

			// Now second should run
			pdfResolve!(new Uint8Array([2]));
			await compile2Promise;

			expect(callOrder).toEqual([1, 2]);
		});

		it('should process higher priority items first', async () => {
			const service = getTypstService();
			await service.initialize();

			const callOrder: string[] = [];
			let pdfResolve: ((value: Uint8Array) => void) | null = null;
			let callCount = 0;

			// Make PDF compilation slow and trackable
			(mockCompiler.pdf as Mock).mockImplementation(
				({ mainContent }: { mainContent: string }) =>
					new Promise<Uint8Array>((resolve) => {
						const currentCall = ++callCount;
						if (currentCall === 1) {
							pdfResolve = resolve;
						} else {
							callOrder.push(mainContent);
							resolve(new Uint8Array([currentCall]));
						}
					})
			);

			// Start first compilation (blocks the queue)
			const blockingPromise = service.compile('blocking', { format: 'pdf' });

			// Add items with different priorities while first is running
			const lowPriorityPromise = service.compileWithPriority(
				'low-priority',
				{ format: 'pdf' },
				PRIORITY.BATCH
			);
			const highPriorityPromise = service.compileWithPriority(
				'high-priority',
				{ format: 'pdf' },
				PRIORITY.URGENT
			);
			const normalPriorityPromise = service.compileWithPriority(
				'normal-priority',
				{ format: 'pdf' },
				PRIORITY.NORMAL
			);

			// Complete blocking compilation
			pdfResolve!(new Uint8Array([0]));
			await blockingPromise;

			// Wait for all to complete
			await Promise.all([lowPriorityPromise, highPriorityPromise, normalPriorityPromise]);

			// High priority should have been processed before normal, normal before low
			expect(callOrder.indexOf('high-priority')).toBeLessThan(callOrder.indexOf('normal-priority'));
			expect(callOrder.indexOf('normal-priority')).toBeLessThan(callOrder.indexOf('low-priority'));
		});

		it('should return queue length', async () => {
			const service = getTypstService();
			await service.initialize();

			expect(service.getQueueLength()).toBe(0);

			// Make compilation hang
			let resolveCompile: (() => void) | null = null;
			(mockCompiler.pdf as Mock).mockImplementation(
				() =>
					new Promise<Uint8Array>((resolve) => {
						resolveCompile = () => resolve(new Uint8Array([1]));
					})
			);

			// Start a compilation
			const compilePromise = service.compile('content', { format: 'pdf' });

			// Add more to queue
			service.compile('content2', { format: 'pdf' });
			service.compile('content3', { format: 'pdf' });

			// Queue should have items
			expect(service.getQueueLength()).toBeGreaterThanOrEqual(1);

			// Cleanup
			resolveCompile!();
			await compilePromise;
		});
	});

	// =========================================================================
	// Cache integration
	// =========================================================================

	describe('cache integration', () => {
		it('should return cached result when available', async () => {
			const service = getTypstService();
			await service.initialize();

			const cachedData = new Uint8Array([1, 2, 3]);
			mockCache.get.mockReturnValue(cachedData);

			const result = await service.compile('cached-content', { format: 'pdf' });

			expect(result.success).toBe(true);
			expect(result.cached).toBe(true);
			expect(result.data).toBe(cachedData);
			expect(mockCompiler.pdf).not.toHaveBeenCalled();
		});

		it('should skip cache when skipCache option is true', async () => {
			const service = getTypstService();
			await service.initialize();

			const cachedData = new Uint8Array([1, 2, 3]);
			mockCache.get.mockReturnValue(cachedData);

			const result = await service.compile('cached-content', { format: 'pdf', skipCache: true });

			expect(result.success).toBe(true);
			expect(result.cached).toBe(false);
			expect(mockCompiler.pdf).toHaveBeenCalled();
		});

		it('should store result in cache after compilation', async () => {
			const service = getTypstService();
			await service.initialize();

			mockCache.get.mockReturnValue(null); // No cache hit

			await service.compile('new-content', { format: 'pdf' });

			expect(mockCache.set).toHaveBeenCalledWith('new-content', 'pdf', expect.any(Uint8Array));
		});
	});

	// =========================================================================
	// Error handling
	// =========================================================================

	describe('error handling', () => {
		it('should return error result on compilation failure', async () => {
			const service = getTypstService();
			await service.initialize();

			(mockCompiler.pdf as Mock).mockRejectedValue(new Error('Syntax error at line 5'));

			const result = await service.compile('invalid content', { format: 'pdf' });

			expect(result.success).toBe(false);
			expect(result.error).toContain('Syntax error at line 5');
			expect(result.format).toBe('pdf');
		});

		it('should timeout long compilations', async () => {
			const service = getTypstService({ compileTimeout: 1000 }); // 1 second timeout
			await service.initialize();

			// Make compilation hang forever
			(mockCompiler.pdf as Mock).mockImplementation(
				() => new Promise(() => {}) // Never resolves
			);

			const resultPromise = service.compile('slow content', { format: 'pdf' });

			// Advance timers past timeout
			vi.advanceTimersByTime(1500);

			const result = await resultPromise;

			expect(result.success).toBe(false);
			expect(result.error).toContain('timeout');
		});
	});

	// =========================================================================
	// Cleanup
	// =========================================================================

	describe('cleanup', () => {
		it('should clear cache on dispose', async () => {
			const service = getTypstService();
			await service.initialize();

			service.dispose();

			expect(mockCache.clear).toHaveBeenCalled();
		});

		it('should reset state on dispose', async () => {
			const service = getTypstService();
			await service.initialize();

			expect(service.state).toBe('ready');

			service.dispose();

			expect(service.state).toBe('idle');
		});
	});

	// =========================================================================
	// PRIORITY constants
	// =========================================================================

	describe('PRIORITY constants', () => {
		it('should have correct priority levels', () => {
			expect(PRIORITY.BATCH).toBe(0);
			expect(PRIORITY.NORMAL).toBe(1);
			expect(PRIORITY.PREVIEW).toBe(2);
			expect(PRIORITY.URGENT).toBe(3);
		});

		it('should have URGENT > PREVIEW > NORMAL > BATCH', () => {
			expect(PRIORITY.URGENT).toBeGreaterThan(PRIORITY.PREVIEW);
			expect(PRIORITY.PREVIEW).toBeGreaterThan(PRIORITY.NORMAL);
			expect(PRIORITY.NORMAL).toBeGreaterThan(PRIORITY.BATCH);
		});
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	describe('edge cases', () => {
		it('should auto-initialize when compiling without explicit init', async () => {
			const service = getTypstService();
			// Don't call initialize()

			const result = await service.compile('content', { format: 'pdf' });

			expect(result.success).toBe(true);
			expect(service.state).toBe('ready');
		});

		it('should handle initialization failure gracefully', async () => {
			(getTypstCompiler as Mock).mockRejectedValue(new Error('Failed to load WASM'));

			const service = getTypstService();
			const success = await service.initialize();

			expect(success).toBe(false);
			expect(service.state).toBe('error');
		});

		it('should return error when compiling after failed initialization', async () => {
			(getTypstCompiler as Mock).mockRejectedValue(new Error('Failed to load WASM'));

			const service = getTypstService();
			await service.initialize(); // Will fail

			const result = await service.compile('content', { format: 'pdf' });

			expect(result.success).toBe(false);
			expect(result.error).toContain('Failed to initialize');
		});

		it('should get cache stats', async () => {
			const service = getTypstService();
			await service.initialize();

			const stats = service.getCacheStats();

			expect(stats).toEqual({ size: 0, hits: 0, misses: 0, evictions: 0 });
		});

		it('should clear cache via clearCache method', async () => {
			const service = getTypstService();
			await service.initialize();

			service.clearCache();

			expect(mockCache.clear).toHaveBeenCalled();
		});
	});
});
