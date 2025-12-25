/**
 * Mobile Detection Store
 * ======================
 *
 * Reactive store for detecting device screen size.
 * Uses Svelte 5 runes for reactivity.
 *
 * Breakpoints:
 * - Mobile: < 768px (md breakpoint)
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px (lg breakpoint)
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { mobileStore } from '$lib/stores/mobile.svelte';
 * </script>
 *
 * <!-- Access properties directly for reactivity (no destructuring!) -->
 * {#if mobileStore.isMobile}
 *   <MobileNav />
 * {:else}
 *   <DesktopNav />
 * {/if}
 * ```
 */

/** Breakpoint for mobile/tablet transition (Tailwind md) */
export const MOBILE_BREAKPOINT = 768;

/** Breakpoint for tablet/desktop transition (Tailwind lg) */
export const DESKTOP_BREAKPOINT = 1024;

/**
 * Type for the mobile store return value
 */
export type MobileStore = {
	readonly isMobile: boolean;
	readonly isTablet: boolean;
	readonly isDesktop: boolean;
	readonly windowWidth: number;
	destroy: () => void;
};

/**
 * Creates a new mobile detection store instance.
 * Use this for testing or when you need isolated instances.
 * For normal usage, prefer the singleton `mobileStore`.
 */
export function createMobileStore(): MobileStore {
	// Check if we're in a browser environment
	const isBrowser = typeof window !== 'undefined';

	// Get initial width (default to desktop for SSR)
	let windowWidth = $state(isBrowser ? window.innerWidth : DESKTOP_BREAKPOINT);

	// Derived values
	const isMobile = $derived(windowWidth < MOBILE_BREAKPOINT);
	const isTablet = $derived(windowWidth >= MOBILE_BREAKPOINT && windowWidth < DESKTOP_BREAKPOINT);
	const isDesktop = $derived(windowWidth >= DESKTOP_BREAKPOINT);

	// Resize handler (defined outside if block for cleanup access)
	let handleResize: (() => void) | null = null;

	// Set up resize listener in browser
	if (isBrowser) {
		handleResize = () => {
			windowWidth = window.innerWidth;
		};
		window.addEventListener('resize', handleResize);
	}

	// Cleanup function for tests and HMR
	function destroy(): void {
		if (isBrowser && handleResize) {
			window.removeEventListener('resize', handleResize);
		}
	}

	return {
		get isMobile() {
			return isMobile;
		},
		get isTablet() {
			return isTablet;
		},
		get isDesktop() {
			return isDesktop;
		},
		get windowWidth() {
			return windowWidth;
		},
		destroy
	};
}

/** Singleton instance for app-wide usage */
export const mobileStore = createMobileStore();
