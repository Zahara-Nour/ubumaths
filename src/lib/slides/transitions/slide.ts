/**
 * Slide transition for UbuSlides
 *
 * Slides content in from left/right (or up/down for vertical)
 */

import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import type { TransitionSpeed, TransitionDirection } from '../core/types.js';
import { TRANSITION_DURATIONS } from '../core/types.js';

export interface SlideTransitionParams {
	/** Duration in ms or speed preset */
	duration?: number | TransitionSpeed;
	/** Delay before transition starts */
	delay?: number;
	/** Easing function */
	easing?: (t: number) => number;
	/** Direction of transition */
	direction?: TransitionDirection;
	/** Whether this is a vertical slide */
	vertical?: boolean;
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
 * Slide in/out transition
 *
 * @param node - The element to transition
 * @param params - Transition parameters
 */
export function slideTransition(
	node: Element,
	params: SlideTransitionParams = {}
): TransitionConfig {
	const {
		duration = 'default',
		delay = 0,
		easing = cubicOut,
		direction = 'forward',
		vertical = false
	} = params;

	const actualDuration = getDuration(duration);

	// Determine axis and direction
	const axis = vertical ? 'Y' : 'X';
	const multiplier = direction === 'forward' ? 1 : -1;

	return {
		duration: actualDuration,
		delay,
		easing,
		css: (t) => {
			const translateValue = (1 - t) * 100 * multiplier;
			return `
				transform: translate${axis}(${translateValue}%);
				opacity: ${t};
			`;
		}
	};
}

/**
 * Slide in from right (for entering slides)
 */
export function slideIn(
	node: Element,
	params: Omit<SlideTransitionParams, 'direction'> = {}
): TransitionConfig {
	return slideTransition(node, { ...params, direction: 'forward' });
}

/**
 * Slide out to left (for exiting slides)
 */
export function slideOut(
	node: Element,
	params: Omit<SlideTransitionParams, 'direction'> = {}
): TransitionConfig {
	return slideTransition(node, { ...params, direction: 'backward' });
}
