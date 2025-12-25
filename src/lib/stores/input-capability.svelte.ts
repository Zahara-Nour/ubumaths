/**
 * Input Capability Detection Store
 * =================================
 *
 * Reactive store for detecting device input capabilities (touch, mouse, hover).
 * Uses CSS media queries via matchMedia for reliable detection.
 *
 * Key differences from screen size detection:
 * - Detects INPUT CAPABILITIES, not screen size
 * - A laptop with touchscreen has both hasTouch AND hasMouse = true
 * - A tablet with bluetooth mouse has hasTouch = true AND hasMouse = true
 *
 * Media queries used:
 * - (any-pointer: coarse): Device has at least one coarse pointer (touch)
 * - (any-pointer: fine): Device has at least one fine pointer (mouse/trackpad)
 * - (any-hover: hover): Device has at least one hover-capable input
 * - (pointer: coarse): PRIMARY input is coarse (touch-first device)
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { inputCapability } from '$lib/stores/input-capability.svelte';
 * </script>
 *
 * <!-- Adapt UI based on touch capability -->
 * <Button class={inputCapability.hasTouch ? 'min-h-11' : 'min-h-9'}>
 *   Click me
 * </Button>
 *
 * <!-- Show tooltips only if device can hover -->
 * {#if inputCapability.canHover}
 *   <Tooltip>Hover for info</Tooltip>
 * {/if}
 * ```
 *
 * Note: For CSS-only solutions, prefer @media (pointer: coarse) directly in styles.
 * This store is for JavaScript logic that needs to know input capabilities.
 */

/**
 * Type for the input capability store
 */
export type InputCapability = {
	/** Device has at least one coarse pointer (touch screen) */
	readonly hasTouch: boolean;
	/** Device has at least one fine pointer (mouse, trackpad, stylus) */
	readonly hasMouse: boolean;
	/** Device has at least one hover-capable input */
	readonly canHover: boolean;
	/** Primary input mechanism is coarse (touch-first device) */
	readonly primaryIsTouch: boolean;
};

/**
 * Creates a new input capability detection store instance.
 * Use this for testing or when you need isolated instances.
 * For normal usage, prefer the singleton `inputCapability`.
 *
 * Note: Media queries can change at runtime when:
 * - User connects/disconnects a mouse to a tablet
 * - User switches between tablet mode and laptop mode on a 2-in-1 device
 */
export function createInputCapabilityStore(): InputCapability {
	// Check if we're in a browser environment
	const isBrowser = typeof window !== 'undefined';

	// Helper to safely check media query
	const matchesMedia = (query: string): boolean => {
		if (!isBrowser) return false;
		return window.matchMedia(query).matches;
	};

	// Use $state for reactivity - values can change when input devices change
	let hasTouch = $state(isBrowser ? matchesMedia('(any-pointer: coarse)') : false);
	let hasMouse = $state(isBrowser ? matchesMedia('(any-pointer: fine)') : true); // Default to desktop
	let canHover = $state(isBrowser ? matchesMedia('(any-hover: hover)') : true); // Default to desktop
	let primaryIsTouch = $state(isBrowser ? matchesMedia('(pointer: coarse)') : false);

	// Set up listeners for changes (e.g., tablet mode, mouse connect/disconnect)
	if (isBrowser) {
		window
			.matchMedia('(any-pointer: coarse)')
			.addEventListener('change', (e) => (hasTouch = e.matches));
		window
			.matchMedia('(any-pointer: fine)')
			.addEventListener('change', (e) => (hasMouse = e.matches));
		window
			.matchMedia('(any-hover: hover)')
			.addEventListener('change', (e) => (canHover = e.matches));
		window
			.matchMedia('(pointer: coarse)')
			.addEventListener('change', (e) => (primaryIsTouch = e.matches));
	}

	return {
		get hasTouch() {
			return hasTouch;
		},
		get hasMouse() {
			return hasMouse;
		},
		get canHover() {
			return canHover;
		},
		get primaryIsTouch() {
			return primaryIsTouch;
		}
	};
}

/** Singleton instance for app-wide usage */
export const inputCapability = createInputCapabilityStore();
