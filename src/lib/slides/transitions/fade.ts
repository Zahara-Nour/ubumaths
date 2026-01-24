/**
 * Fade transition for UbuSlides
 *
 * Simple opacity fade in/out
 */

import type { TransitionConfig } from 'svelte/transition';
import { linear } from 'svelte/easing';
import type { TransitionSpeed } from '../core/types.js';
import { TRANSITION_DURATIONS } from '../core/types.js';

export interface FadeTransitionParams {
	/** Duration in ms or speed preset */
	duration?: number | TransitionSpeed;
	/** Delay before transition starts */
	delay?: number;
	/** Easing function */
	easing?: (t: number) => number;
}

/**
 * Get duration from speed preset or number
 */
function getDuration(duration: number | TransitionSpeed | undefined): number {
	if (typeof duration === 'number') return duration;
	if (typeof duration === 'string') return TRANSITION_DURATIONS[duration];
	return TRANSITION_DURATIONS.default;
}

/**
 * Fade transition
 *
 * @param node - The element to transition
 * @param params - Transition parameters
 */
export function fadeTransition(node: Element, params: FadeTransitionParams = {}): TransitionConfig {
	const { duration = 'default', delay = 0, easing = linear } = params;

	const actualDuration = getDuration(duration);
	const style = getComputedStyle(node);
	const opacity = +style.opacity;

	return {
		duration: actualDuration,
		delay,
		easing,
		css: (t) => `opacity: ${t * opacity}`
	};
}

/**
 * Fade in transition (alias)
 */
export const fadeIn = fadeTransition;

/**
 * Fade out transition (alias)
 */
export const fadeOut = fadeTransition;
