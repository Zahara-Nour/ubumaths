import { browser } from '$app/environment';
import { toggleMode } from 'mode-watcher';

function createThemeStore() {
	let dark = $state(false);

	// Sync color-scheme CSS property with .dark class
	function syncColorScheme() {
		if (!browser) return;

		const isDark = document.documentElement.classList.contains('dark');
		// Update the color-scheme CSS property to trigger light-dark() function
		// This is critical for Tailwind CSS 4's light-dark() function to work correctly
		document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
		dark = isDark;
	}

	// Initialize from DOM state (ModeWatcher will set this)
	if (browser) {
		// Use setTimeout to ensure ModeWatcher has initialized first
		setTimeout(() => {
			syncColorScheme();
		}, 0);

		// Watch for .dark class changes from ModeWatcher
		const observer = new MutationObserver(() => {
			syncColorScheme();
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});
	}

	function toggle() {
		// Use mode-watcher's toggleMode function
		// This will update localStorage and the .dark class
		toggleMode();
		// Sync will happen automatically via the MutationObserver
	}

	return {
		get dark() {
			return dark;
		},
		toggle
	};
}

export const theme = createThemeStore();
