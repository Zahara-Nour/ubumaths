import { browser } from '$app/environment';

function createThemeStore() {
	let dark = $state(false);

	// Initialize from localStorage or system preference
	if (browser) {
		const stored = localStorage.getItem('theme');
		if (stored) {
			dark = stored === 'dark';
		} else {
			dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		updateDOM();
	}

	function updateDOM() {
		if (browser) {
			if (dark) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}

	function toggle() {
		dark = !dark;
		updateDOM();
		if (browser) {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		}
	}

	return {
		get dark() {
			return dark;
		},
		toggle
	};
}

export const theme = createThemeStore();
