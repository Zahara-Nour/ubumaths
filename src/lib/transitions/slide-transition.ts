/**
 * Slide Transition
 * ================
 *
 * Custom Svelte transition combining horizontal slide + fade effect.
 * Used for smooth question transitions in test components.
 *
 * Features:
 * - Slide from right (entering) or to left (exiting)
 * - Combined with fade effect for smoother appearance
 * - Configurable duration and easing
 */

import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

interface SlideTransitionParams {
	/**
	 * Duration of the transition in milliseconds
	 * @default 500
	 */
	duration?: number;

	/**
	 * Delay before starting the transition in milliseconds
	 * @default 0
	 */
	delay?: number;

	/**
	 * Easing function
	 * @default cubicOut
	 */
	easing?: (t: number) => number;
}

/**
 * Slide from right transition (for entering elements)
 *
 * @param node - The DOM element to transition
 * @param params - Transition parameters
 * @returns Svelte transition configuration
 *
 * @example
 * ```svelte
 * <div in:slideFromRight>Content</div>
 * ```
 */
export function slideFromRight(
	node: HTMLElement,
	params: SlideTransitionParams = {}
): TransitionConfig {
	const { duration = 500, delay = 0, easing = cubicOut } = params;

	return {
		duration,
		delay,
		easing,
		css: (t) => {
			const translateX = (1 - t) * 100; // Start from 100% (off-screen right)
			const opacity = t; // Fade in

			return `
				transform: translateX(${translateX}%);
				opacity: ${opacity};
			`;
		}
	};
}

/**
 * Slide to left transition (for exiting elements)
 *
 * @param node - The DOM element to transition
 * @param params - Transition parameters
 * @returns Svelte transition configuration
 *
 * @example
 * ```svelte
 * <div out:slideToLeft>Content</div>
 * ```
 */
export function slideToLeft(
	node: HTMLElement,
	params: SlideTransitionParams = {}
): TransitionConfig {
	const { duration = 500, delay = 0, easing = cubicOut } = params;

	return {
		duration,
		delay,
		easing,
		css: (t) => {
			const translateX = (t - 1) * 100; // End at -100% (off-screen left)
			const opacity = t; // Fade out

			return `
				transform: translateX(${translateX}%);
				opacity: ${opacity};
			`;
		}
	};
}
