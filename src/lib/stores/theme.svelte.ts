import { browser } from '$app/environment';
import { toggleMode } from 'mode-watcher';

function createThemeStore() {
	let dark = $state(false);

	// Recopie l'état de la classe `.dark`. `color-scheme` (dont dépend `light-dark()`)
	// est posé par mode-watcher lui-même, au chargement comme à chaque bascule.
	function syncDark() {
		if (!browser) return;

		dark = document.documentElement.classList.contains('dark');
	}

	// Initialize from DOM state (ModeWatcher will set this)
	if (browser) {
		// Use setTimeout to ensure ModeWatcher has initialized first
		setTimeout(() => {
			syncDark();
		}, 0);

		// Watch for .dark class changes from ModeWatcher
		const observer = new MutationObserver(() => {
			syncDark();
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
