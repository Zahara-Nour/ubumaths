// Holographic Card Stores
// ========================
// Svelte 5 stores for managing active card state and device orientation

/**
 * Active Card Store
 * Tracks which holographic card is currently active (expanded/focused)
 */
class ActiveCardStore {
	activeCard = $state<HTMLElement | undefined>(undefined);

	set(card: HTMLElement | undefined) {
		this.activeCard = card;
	}

	get(): HTMLElement | undefined {
		return this.activeCard;
	}

	clear() {
		this.activeCard = undefined;
	}
}

export const activeCard = new ActiveCardStore();

/**
 * Orientation Data Interface
 */
interface OrientationData {
	alpha: number;
	beta: number;
	gamma: number;
}

interface OrientationState {
	absolute: OrientationData;
	relative: OrientationData;
}

/**
 * Get raw orientation data from DeviceOrientationEvent
 */
function getRawOrientation(e?: DeviceOrientationEvent | null): OrientationData {
	if (!e) {
		return { alpha: 0, beta: 0, gamma: 0 };
	}
	return {
		alpha: e.alpha || 0,
		beta: e.beta || 0,
		gamma: e.gamma || 0
	};
}

/**
 * Orientation Store
 * Tracks device orientation for gyroscope-based card tilting
 */
class OrientationStore {
	private baseOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };
	private firstReading = true;
	orientation = $state<OrientationState>({
		absolute: { alpha: 0, beta: 0, gamma: 0 },
		relative: { alpha: 0, beta: 0, gamma: 0 }
	});

	constructor() {
		// Setup orientation listener if in browser
		if (typeof window !== 'undefined') {
			this.setupListener();
		}
	}

	private setupListener() {
		const handleOrientation = (e: DeviceOrientationEvent) => {
			if (this.firstReading) {
				this.firstReading = false;
				this.baseOrientation = getRawOrientation(e);
			}

			const absolute = getRawOrientation(e);
			this.orientation = {
				absolute,
				relative: {
					alpha: absolute.alpha - this.baseOrientation.alpha,
					beta: absolute.beta - this.baseOrientation.beta,
					gamma: absolute.gamma - this.baseOrientation.gamma
				}
			};
		};

		window.addEventListener('deviceorientation', handleOrientation, true);
	}

	resetBase() {
		this.firstReading = true;
		this.baseOrientation = { alpha: 0, beta: 0, gamma: 0 };
	}

	get(): OrientationState {
		return this.orientation;
	}
}

export const orientation = new OrientationStore();

/**
 * Reset the base orientation reference point for 3D card rotation
 *
 * This utility function resets the baseline orientation used for calculating
 * relative device tilt. When called, the current device orientation becomes
 * the new zero-point, and relative values are recalculated from that point.
 *
 * USAGE:
 * Call this when the user initiates a new holographic card interaction,
 * or when the card view is first opened, to ensure smooth relative rotations
 * that don't jump based on device position at that moment.
 *
 * @example
 * ```typescript
 * import { resetBaseOrientation } from '$lib/stores/holo-card.svelte';
 *
 * // When user opens the holographic card view
 * resetBaseOrientation();
 * ```
 *
 * INTERNAL MECHANICS:
 * - Sets `firstReading` flag to true, so next deviceorientation event becomes base
 * - Clears current base orientation values (alpha, beta, gamma = 0)
 * - Subsequent orientation changes are relative to this new baseline
 * - Prevents large jumps in card rotation when switching views or resetting
 */
export const resetBaseOrientation = () => orientation.resetBase();
