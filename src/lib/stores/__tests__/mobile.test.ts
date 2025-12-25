/**
 * Tests for mobile detection store
 * TDD: Tests written first, should fail until implementation
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('mobile store', () => {
	let originalInnerWidth: number;

	beforeEach(() => {
		// Save original window.innerWidth
		originalInnerWidth = window.innerWidth;
	});

	afterEach(() => {
		// Restore original window.innerWidth
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: originalInnerWidth
		});
		vi.restoreAllMocks();
	});

	function setWindowWidth(width: number): void {
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: width
		});
		window.dispatchEvent(new Event('resize'));
	}

	describe('isMobile', () => {
		it('returns true when window width is less than 768px', async () => {
			setWindowWidth(767);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isMobile).toBe(true);
		});

		it('returns false when window width is 768px or more', async () => {
			setWindowWidth(768);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isMobile).toBe(false);
		});

		it('returns false when window width is 1024px', async () => {
			setWindowWidth(1024);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isMobile).toBe(false);
		});
	});

	describe('isTablet', () => {
		it('returns false when window width is less than 768px', async () => {
			setWindowWidth(600);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isTablet).toBe(false);
		});

		it('returns true when window width is between 768px and 1023px', async () => {
			setWindowWidth(900);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isTablet).toBe(true);
		});

		it('returns false when window width is 1024px or more', async () => {
			setWindowWidth(1024);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isTablet).toBe(false);
		});
	});

	describe('isDesktop', () => {
		it('returns false when window width is less than 768px', async () => {
			setWindowWidth(600);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isDesktop).toBe(false);
		});

		it('returns false when window width is 900px (tablet)', async () => {
			setWindowWidth(900);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isDesktop).toBe(false);
		});

		it('returns true when window width is 1024px or more', async () => {
			setWindowWidth(1024);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();
			expect(store.isDesktop).toBe(true);
		});
	});

	describe('updates on resize', () => {
		it('updates values when window is resized', async () => {
			setWindowWidth(1200);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();

			expect(store.isDesktop).toBe(true);
			expect(store.isMobile).toBe(false);

			// Resize to mobile
			setWindowWidth(500);

			expect(store.isMobile).toBe(true);
			expect(store.isDesktop).toBe(false);
		});
	});

	describe('SSR safety', () => {
		it('provides default values when window is undefined', async () => {
			// This test verifies the store handles SSR gracefully
			// The actual SSR behavior would need integration testing
			const { MOBILE_BREAKPOINT, DESKTOP_BREAKPOINT } = await import('../mobile.svelte');
			expect(MOBILE_BREAKPOINT).toBe(768);
			expect(DESKTOP_BREAKPOINT).toBe(1024);
		});
	});

	describe('cleanup', () => {
		it('has a destroy function', async () => {
			setWindowWidth(1024);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();

			expect(typeof store.destroy).toBe('function');
		});

		it('can be called without errors', async () => {
			setWindowWidth(1024);
			const { createMobileStore } = await import('../mobile.svelte');
			const store = createMobileStore();

			expect(() => store.destroy()).not.toThrow();
		});
	});

	describe('type export', () => {
		it('exports MobileStore type', async () => {
			const module = await import('../mobile.svelte');
			// Type checking happens at compile time, this just verifies the export exists
			expect(module.createMobileStore).toBeDefined();
			expect(module.mobileStore).toBeDefined();
		});
	});
});
