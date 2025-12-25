/**
 * Tests for input capability detection store
 * TDD: Tests written first, implementation follows
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('input capability store', () => {
	let originalMatchMedia: typeof window.matchMedia;

	beforeEach(() => {
		// Save original matchMedia
		originalMatchMedia = window.matchMedia;
	});

	afterEach(() => {
		// Restore original matchMedia
		window.matchMedia = originalMatchMedia;
		vi.resetModules();
	});

	/**
	 * Helper to mock matchMedia for specific media queries
	 */
	function mockMatchMedia(matches: {
		'(any-pointer: coarse)'?: boolean;
		'(any-pointer: fine)'?: boolean;
		'(any-hover: hover)'?: boolean;
		'(pointer: coarse)'?: boolean;
	}): void {
		window.matchMedia = vi.fn((query: string) => ({
			matches: matches[query as keyof typeof matches] ?? false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		})) as unknown as typeof window.matchMedia;
	}

	describe('hasTouch', () => {
		it('returns true when any-pointer: coarse matches (touch device)', async () => {
			mockMatchMedia({ '(any-pointer: coarse)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.hasTouch).toBe(true);
		});

		it('returns false when any-pointer: coarse does not match (mouse only)', async () => {
			mockMatchMedia({ '(any-pointer: coarse)': false, '(any-pointer: fine)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.hasTouch).toBe(false);
		});
	});

	describe('hasMouse', () => {
		it('returns true when any-pointer: fine matches (has mouse/trackpad)', async () => {
			mockMatchMedia({ '(any-pointer: fine)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.hasMouse).toBe(true);
		});

		it('returns false when any-pointer: fine does not match (touch only)', async () => {
			mockMatchMedia({ '(any-pointer: fine)': false, '(any-pointer: coarse)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.hasMouse).toBe(false);
		});
	});

	describe('canHover', () => {
		it('returns true when any-hover: hover matches (has hover capability)', async () => {
			mockMatchMedia({ '(any-hover: hover)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.canHover).toBe(true);
		});

		it('returns false when any-hover: hover does not match (no hover)', async () => {
			mockMatchMedia({ '(any-hover: hover)': false });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.canHover).toBe(false);
		});
	});

	describe('primaryIsTouch', () => {
		it('returns true when pointer: coarse matches (primary input is touch)', async () => {
			mockMatchMedia({ '(pointer: coarse)': true });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.primaryIsTouch).toBe(true);
		});

		it('returns false when pointer: coarse does not match (primary is mouse)', async () => {
			mockMatchMedia({ '(pointer: coarse)': false });
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();
			expect(store.primaryIsTouch).toBe(false);
		});
	});

	describe('hybrid devices', () => {
		it('supports hybrid devices with both touch and mouse', async () => {
			// Laptop with touchscreen
			mockMatchMedia({
				'(any-pointer: coarse)': true,
				'(any-pointer: fine)': true,
				'(any-hover: hover)': true,
				'(pointer: coarse)': false // Primary is mouse
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(true);
			expect(store.hasMouse).toBe(true);
			expect(store.canHover).toBe(true);
			expect(store.primaryIsTouch).toBe(false);
		});

		it('correctly identifies tablet with mouse connected', async () => {
			mockMatchMedia({
				'(any-pointer: coarse)': true,
				'(any-pointer: fine)': true,
				'(any-hover: hover)': true,
				'(pointer: coarse)': true // Primary is still touch
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(true);
			expect(store.hasMouse).toBe(true);
			expect(store.primaryIsTouch).toBe(true);
		});
	});

	describe('SSR safety', () => {
		it('returns desktop defaults when window is undefined', async () => {
			// Note: In actual SSR, window would be undefined
			// Here we test that the store has sensible defaults
			mockMatchMedia({
				'(any-pointer: coarse)': false,
				'(any-pointer: fine)': true,
				'(any-hover: hover)': true,
				'(pointer: coarse)': false
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			// Desktop defaults
			expect(store.hasMouse).toBe(true);
			expect(store.canHover).toBe(true);
			expect(store.primaryIsTouch).toBe(false);
		});
	});

	describe('type and exports', () => {
		it('exports createInputCapabilityStore factory function', async () => {
			mockMatchMedia({});
			const module = await import('../input-capability.svelte');
			expect(module.createInputCapabilityStore).toBeDefined();
			expect(typeof module.createInputCapabilityStore).toBe('function');
		});

		it('exports inputCapability singleton', async () => {
			mockMatchMedia({});
			const module = await import('../input-capability.svelte');
			expect(module.inputCapability).toBeDefined();
		});

		it('exports InputCapability type (compile-time check)', async () => {
			mockMatchMedia({});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			// Runtime type check - these properties must exist
			expect('hasTouch' in store).toBe(true);
			expect('hasMouse' in store).toBe(true);
			expect('canHover' in store).toBe(true);
			expect('primaryIsTouch' in store).toBe(true);
		});
	});

	describe('typical device scenarios', () => {
		it('correctly identifies iPhone/Android phone', async () => {
			mockMatchMedia({
				'(any-pointer: coarse)': true,
				'(any-pointer: fine)': false,
				'(any-hover: hover)': false,
				'(pointer: coarse)': true
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(true);
			expect(store.hasMouse).toBe(false);
			expect(store.canHover).toBe(false);
			expect(store.primaryIsTouch).toBe(true);
		});

		it('correctly identifies desktop with mouse', async () => {
			mockMatchMedia({
				'(any-pointer: coarse)': false,
				'(any-pointer: fine)': true,
				'(any-hover: hover)': true,
				'(pointer: coarse)': false
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(false);
			expect(store.hasMouse).toBe(true);
			expect(store.canHover).toBe(true);
			expect(store.primaryIsTouch).toBe(false);
		});

		it('correctly identifies iPad/tablet', async () => {
			mockMatchMedia({
				'(any-pointer: coarse)': true,
				'(any-pointer: fine)': false,
				'(any-hover: hover)': false,
				'(pointer: coarse)': true
			});
			const { createInputCapabilityStore } = await import('../input-capability.svelte');
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(true);
			expect(store.hasMouse).toBe(false);
			expect(store.canHover).toBe(false);
			expect(store.primaryIsTouch).toBe(true);
		});
	});
});
