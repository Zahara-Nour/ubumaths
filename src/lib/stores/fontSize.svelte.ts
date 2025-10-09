import { browser } from '$app/environment';

/**
 * Font Size Store
 * ===============
 *
 * Manages the --text-scaling CSS variable for main content area only.
 *
 * Integration with Skeleton UI:
 * - Uses Skeleton's --text-scaling variable infrastructure
 * - Applied only to <main> element, not globally
 * - Works with custom scaling rules in app.css
 *
 * Controls:
 * - Increase/decrease buttons in Header component
 * - Persists to localStorage as 'fontScale'
 * - Range: 75% to 150% in 12.5% increments
 */

const MIN_SCALE = 0.75; // 75%
const MAX_SCALE = 1.5; // 150%
const DEFAULT_SCALE = 1.0; // 100%
const STEP = 0.125; // 12.5% increments

function createFontSizeStore() {
	let scale = $state(DEFAULT_SCALE);

	// Initialize from localStorage
	if (browser) {
		const stored = localStorage.getItem('fontScale');
		if (stored) {
			const parsed = parseFloat(stored);
			scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, parsed));
		}
		updateDOM();
	}

	function updateDOM() {
		if (browser) {
			// Apply Skeleton's text-scaling CSS variable globally
			// This allows Skeleton's text variables (--text-xl, etc.) to scale
			document.documentElement.style.setProperty('--text-scaling', scale.toString());
		}
	}

	function increase() {
		if (scale < MAX_SCALE) {
			scale += STEP;
			updateDOM();
			if (browser) {
				localStorage.setItem('fontScale', scale.toString());
			}
		}
	}

	function decrease() {
		if (scale > MIN_SCALE) {
			scale -= STEP;
			updateDOM();
			if (browser) {
				localStorage.setItem('fontScale', scale.toString());
			}
		}
	}

	function reset() {
		scale = DEFAULT_SCALE;
		updateDOM();
		if (browser) {
			localStorage.setItem('fontScale', scale.toString());
		}
	}

	return {
		get size() {
			return scale;
		},
		get canIncrease() {
			return scale < MAX_SCALE;
		},
		get canDecrease() {
			return scale > MIN_SCALE;
		},
		increase,
		decrease,
		reset
	};
}

export const fontSize = createFontSizeStore();
