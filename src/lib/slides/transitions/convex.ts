/**
 * Convex transition for UbuSlides
 *
 * 3D rotation effect that makes slides appear to rotate around a vertical axis
 */

import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import type { TransitionSpeed, TransitionDirection } from '../core/types.js';
import { TRANSITION_DURATIONS } from '../core/types.js';

export interface ConvexTransitionParams {
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
 * Convex 3D rotation transition
 *
 * @param node - The element to transition
 * @param params - Transition parameters
 */
export function convexTransition(
	node: Element,
	params: ConvexTransitionParams = {}
): TransitionConfig {
	const {
		duration = 'default',
		delay = 0,
		easing = cubicOut,
		direction = 'forward',
		angle = 90
	} = params;

	const actualDuration = getDuration(duration);
	const multiplier = direction === 'forward' ? 1 : -1;

	return {
		duration: actualDuration,
		delay,
		easing,
		css: (t) => {
			const rotateY = (1 - t) * angle * multiplier;
			const translateZ = (1 - t) * -500;
			return `
				transform: perspective(1000px) rotateY(${rotateY}deg) translateZ(${translateZ}px);
				opacity: ${t};
				transform-origin: center center;
			`;
		}
	};
}

/**
 * Convex in (for entering slides - rotates from right)
 */
export function convexIn(
	node: Element,
	params: Omit<ConvexTransitionParams, 'direction'> = {}
): TransitionConfig {
	return convexTransition(node, { ...params, direction: 'forward' });
}

/**
 * Convex out (for exiting slides - rotates to left)
 */
export function convexOut(
	node: Element,
	params: Omit<ConvexTransitionParams, 'direction'> = {}
): TransitionConfig {
	return convexTransition(node, { ...params, direction: 'backward' });
}
