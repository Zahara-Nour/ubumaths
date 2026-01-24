/**
 * Zoom transition for UbuSlides
 *
 * Zooms content in/out with opacity fade
 */

import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import type { TransitionSpeed } from '../core/types.js';
import { TRANSITION_DURATIONS } from '../core/types.js';

export interface ZoomTransitionParams {
	/** Duration in ms or speed preset */
	duration?: number | TransitionSpeed;
	/** Delay before transition starts */
	delay?: number;
	/** Easing function */
	easing?: (t: number) => number;
	/** Starting scale (0-1) */
	start?: number;
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
 * Zoom transition
 *
 * @param node - The element to transition
 * @param params - Transition parameters
 */
export function zoomTransition(node: Element, params: ZoomTransitionParams = {}): TransitionConfig {
	const { duration = 'default', delay = 0, easing = cubicOut, start = 0.2 } = params;

	const actualDuration = getDuration(duration);

	return {
		duration: actualDuration,
		delay,
		easing,
		css: (t) => {
			const scale = start + (1 - start) * t;
			return `
				transform: scale(${scale});
				opacity: ${t};
			`;
		}
	};
}

/**
 * Zoom in transition (alias)
 * Svelte automatically reverses the t parameter for out: transitions
 */
export const zoomIn = zoomTransition;

/**
 * Zoom out transition (alias)
 * Svelte automatically reverses the t parameter for out: transitions
 */
export const zoomOut = zoomTransition;
