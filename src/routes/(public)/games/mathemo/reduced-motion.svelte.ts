// Accessibility: detect user's reduced motion preference (Svelte 5 version)
import { browser } from '$app/environment'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getInitialMotionPreference(): boolean {
	if (!browser) return false
	return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

// Create a reactive reduced motion preference using Svelte 5 runes
class ReducedMotionStore {
	value = $state(getInitialMotionPreference())
	private mediaQueryList: MediaQueryList | null = null

	constructor() {
		if (browser) {
			this.mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY)

			const handleChange = (event: MediaQueryListEvent) => {
				this.value = event.matches
			}

			this.mediaQueryList.addEventListener('change', handleChange)
		}
	}

	get reducedMotion() {
		return this.value
	}
}

export const reducedMotion = new ReducedMotionStore()
