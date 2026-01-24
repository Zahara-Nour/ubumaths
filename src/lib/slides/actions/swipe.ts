/**
 * Swipe action for touch navigation in UbuSlides
 *
 * Detects swipe gestures and triggers navigation callbacks
 */

import type { Action } from 'svelte/action';

export interface SwipeHandlers {
	/** Called when swiping left (go to next slide) */
	onSwipeLeft?: () => void;
	/** Called when swiping right (go to previous slide) */
	onSwipeRight?: () => void;
	/** Called when swiping up (go to next vertical slide) */
	onSwipeUp?: () => void;
	/** Called when swiping down (go to previous vertical slide) */
	onSwipeDown?: () => void;
}

export interface SwipeOptions extends SwipeHandlers {
	/** Minimum distance in pixels to trigger a swipe (default: 50) */
	threshold?: number;
	/** Maximum time in ms for the swipe gesture (default: 300) */
	maxTime?: number;
	/** Whether to prevent default touch behavior (default: true) */
	preventDefault?: boolean;
}

interface TouchState {
	startX: number;
	startY: number;
	startTime: number;
}

/**
 * Svelte action for swipe gesture detection
 *
 * @example
 * ```svelte
 * <div use:swipe={{ onSwipeLeft: next, onSwipeRight: prev }}>
 *   Content
 * </div>
 * ```
 */
export const swipe: Action<HTMLElement, SwipeOptions | undefined> = (node, options = {}) => {
	let state: TouchState | null = null;

	const getOptions = () => ({
		threshold: options?.threshold ?? 50,
		maxTime: options?.maxTime ?? 300,
		preventDefault: options?.preventDefault ?? true,
		...options
	});

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;

		const touch = event.touches[0];
		state = {
			startX: touch.clientX,
			startY: touch.clientY,
			startTime: Date.now()
		};
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!state) return;

		const opts = getOptions();
		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - state.startX;
		const deltaY = touch.clientY - state.startY;
		const deltaTime = Date.now() - state.startTime;

		state = null;

		// Check if the gesture was too slow
		if (deltaTime > opts.maxTime) return;

		const absX = Math.abs(deltaX);
		const absY = Math.abs(deltaY);

		// Determine if this is a horizontal or vertical swipe
		if (absX > absY && absX >= opts.threshold) {
			// Horizontal swipe
			if (opts.preventDefault) {
				event.preventDefault();
			}
			if (deltaX < 0) {
				opts.onSwipeLeft?.();
			} else {
				opts.onSwipeRight?.();
			}
		} else if (absY > absX && absY >= opts.threshold) {
			// Vertical swipe
			if (opts.preventDefault) {
				event.preventDefault();
			}
			if (deltaY < 0) {
				opts.onSwipeUp?.();
			} else {
				opts.onSwipeDown?.();
			}
		}
	}

	function handleTouchMove(event: TouchEvent) {
		// Optionally prevent scrolling during swipe
		if (state && getOptions().preventDefault) {
			event.preventDefault();
		}
	}

	node.addEventListener('touchstart', handleTouchStart, { passive: true });
	node.addEventListener('touchend', handleTouchEnd, { passive: false });
	node.addEventListener('touchmove', handleTouchMove, { passive: false });

	return {
		update(newOptions: SwipeOptions | undefined) {
			Object.assign(options, newOptions ?? {});
		},
		destroy() {
			node.removeEventListener('touchstart', handleTouchStart);
			node.removeEventListener('touchend', handleTouchEnd);
			node.removeEventListener('touchmove', handleTouchMove);
		}
	};
};

/**
 * Create swipe handlers that work with a DeckStore
 */
export function createSwipeHandlers(store: {
	next: () => void;
	prev: () => void;
	down?: () => void;
	up?: () => void;
}): SwipeHandlers {
	return {
		onSwipeLeft: () => store.next(),
		onSwipeRight: () => store.prev(),
		onSwipeUp: store.down,
		onSwipeDown: store.up
	};
}
