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
export const resetBaseOrientation = () => orientation.resetBase();
