/**
 * Concave transition for UbuSlides
 *
 * 3D rotation effect that makes slides appear to rotate inward (opposite of convex)
 * Creates the illusion of slides rotating around a vertical axis with reversed depth
 */

import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import type { TransitionSpeed, TransitionDirection } from '../core/types.js';
import { TRANSITION_DURATIONS } from '../core/types.js';

export interface ConcaveTransitionParams {
	/** Duration in ms or speed preset */
	duration?: number | TransitionSpeed;
	/** Delay before transition starts */
	delay?: number;
	/** Easing function */
	easing?: (t: number) => number;
	/** Direction of rotation */
	direction?: TransitionDirection;
	/** Maximum rotation angle in degrees */
	angle?: number;
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
 * Concave 3D rotation transition (opposite of convex)
 *
 * @param node - The element to transition
 * @param params - Transition parameters
 */
export function concaveTransition(
	node: Element,
	params: ConcaveTransitionParams = {}
): TransitionConfig {
	const {
		duration = 'default',
		delay = 0,
		easing = cubicOut,
		direction = 'forward',
		angle = 90
	} = params;

	const actualDuration = getDuration(duration);
	// Concave rotates the opposite direction from convex
	const multiplier = direction === 'forward' ? -1 : 1;

	return {
		duration: actualDuration,
		delay,
		easing,
		css: (t) => {
			const rotateY = (1 - t) * angle * multiplier;
			// Concave moves toward the viewer (positive Z) instead of away
			const translateZ = (1 - t) * 500;
			return `
				transform: perspective(1000px) rotateY(${rotateY}deg) translateZ(${translateZ}px);
				opacity: ${t};
				transform-origin: center center;
			`;
		}
	};
}

/**
 * Concave in (for entering slides - rotates from left)
 */
export function concaveIn(
	node: Element,
	params: Omit<ConcaveTransitionParams, 'direction'> = {}
): TransitionConfig {
	return concaveTransition(node, { ...params, direction: 'forward' });
}

/**
 * Concave out (for exiting slides - rotates to right)
 */
export function concaveOut(
	node: Element,
	params: Omit<ConcaveTransitionParams, 'direction'> = {}
): TransitionConfig {
	return concaveTransition(node, { ...params, direction: 'backward' });
}
