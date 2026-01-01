/**
 * Evoland Input Manager
 *
 * Handles keyboard and touch input for the game.
 * Based on the original Key.hx from Evoland.
 */

// ============================================================================
// KEY CODES
// ============================================================================

/**
 * Key code constants matching the original Haxe Key class.
 */
export const KeyCode = {
	// Arrow keys
	UP: 38,
	DOWN: 40,
	LEFT: 37,
	RIGHT: 39,

	// WASD
	W: 87,
	A: 65,
	S: 83,
	D: 68,

	// ZQSD (French layout)
	Z: 90,
	Q: 81,

	// Action keys
	SPACE: 32,
	ENTER: 13,
	ESCAPE: 27,

	// Additional
	E: 69,
	F: 70,
	CONTROL: 17,
	SHIFT: 16
} as const;

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input state for the current frame.
 */
export interface InputState {
	/** Movement direction X (-1, 0, or 1) */
	readonly moveX: number;
	/** Movement direction Y (-1, 0, or 1) */
	readonly moveY: number;
	/** Attack/action button pressed this frame */
	readonly action: boolean;
	/** Attack/action button held down */
	readonly actionHeld: boolean;
	/** Menu/pause button pressed this frame */
	readonly menu: boolean;
	/** Confirm button pressed this frame */
	readonly confirm: boolean;
}

/**
 * Touch swipe detection result.
 */
export interface SwipeResult {
	readonly direction: 'up' | 'down' | 'left' | 'right' | null;
	readonly distance: number;
	readonly velocity: number;
}

/**
 * Input manager configuration.
 */
export interface InputManagerOptions {
	/** Element to attach keyboard listeners to (default: document) */
	readonly keyboardTarget?: EventTarget;
	/** Element to attach touch listeners to */
	readonly touchTarget?: HTMLElement;
	/** Minimum swipe distance in pixels (default: 30) */
	readonly swipeThreshold?: number;
	/** Enable WASD controls (default: true) */
	readonly enableWasd?: boolean;
	/** Enable ZQSD controls for French keyboards (default: true) */
	readonly enableZqsd?: boolean;
}

// ============================================================================
// INPUT MANAGER CLASS
// ============================================================================

/**
 * Input manager for keyboard and touch controls.
 *
 * Features:
 * - Keyboard input with key down/up tracking
 * - isDown() for held keys, isToggled() for just-pressed
 * - Touch swipe detection for mobile
 * - Configurable key mappings (WASD, ZQSD, arrows)
 * - Frame-based input state
 *
 * @example
 * ```typescript
 * const input = new InputManager({ touchTarget: canvas });
 *
 * // In game loop
 * input.update();
 * const state = input.getState();
 *
 * if (state.moveX !== 0 || state.moveY !== 0) {
 *   hero.move(state.moveX, state.moveY);
 * }
 *
 * if (state.action) {
 *   hero.attack();
 * }
 * ```
 */
export class InputManager {
	private keyStates: Map<number, number> = new Map();
	private frameCounter: number = 0;
	private enableWasd: boolean;
	private enableZqsd: boolean;
	private swipeThreshold: number;

	// Touch state
	private touchStartX: number = 0;
	private touchStartY: number = 0;
	private touchStartTime: number = 0;
	private lastSwipe: SwipeResult = { direction: null, distance: 0, velocity: 0 };
	private swipeConsumed: boolean = false;

	// Event targets
	private keyboardTarget: EventTarget;
	private touchTarget: HTMLElement | null;

	// Bound event handlers for cleanup
	private boundKeyDown: (e: KeyboardEvent) => void;
	private boundKeyUp: (e: KeyboardEvent) => void;
	private boundTouchStart: (e: TouchEvent) => void;
	private boundTouchEnd: (e: TouchEvent) => void;
	private boundTouchCancel: () => void;

	/**
	 * Create a new input manager.
	 * @param options - Configuration options
	 */
	constructor(options: InputManagerOptions = {}) {
		this.keyboardTarget = options.keyboardTarget ?? document;
		this.touchTarget = options.touchTarget ?? null;
		this.swipeThreshold = options.swipeThreshold ?? 30;
		this.enableWasd = options.enableWasd ?? true;
		this.enableZqsd = options.enableZqsd ?? true;

		// Bind event handlers
		this.boundKeyDown = this.handleKeyDown.bind(this);
		this.boundKeyUp = this.handleKeyUp.bind(this);
		this.boundTouchStart = this.handleTouchStart.bind(this);
		this.boundTouchEnd = this.handleTouchEnd.bind(this);
		this.boundTouchCancel = this.handleTouchCancel.bind(this);

		// Attach listeners
		this.attachListeners();
	}

	/**
	 * Attach event listeners.
	 */
	private attachListeners(): void {
		this.keyboardTarget.addEventListener('keydown', this.boundKeyDown as EventListener);
		this.keyboardTarget.addEventListener('keyup', this.boundKeyUp as EventListener);

		if (this.touchTarget) {
			this.touchTarget.addEventListener('touchstart', this.boundTouchStart, { passive: false });
			this.touchTarget.addEventListener('touchend', this.boundTouchEnd, { passive: false });
			this.touchTarget.addEventListener('touchcancel', this.boundTouchCancel);
		}
	}

	/**
	 * Detach event listeners and clean up.
	 */
	destroy(): void {
		this.keyboardTarget.removeEventListener('keydown', this.boundKeyDown as EventListener);
		this.keyboardTarget.removeEventListener('keyup', this.boundKeyUp as EventListener);

		if (this.touchTarget) {
			this.touchTarget.removeEventListener('touchstart', this.boundTouchStart);
			this.touchTarget.removeEventListener('touchend', this.boundTouchEnd);
			this.touchTarget.removeEventListener('touchcancel', this.boundTouchCancel);
		}

		this.keyStates.clear();
	}

	/**
	 * Update input state. Call once per frame before reading input.
	 */
	update(): void {
		this.frameCounter++;
	}

	/**
	 * Check if a key is currently held down.
	 * @param keyCode - Key code to check
	 */
	isDown(keyCode: number): boolean {
		return this.keyStates.has(keyCode);
	}

	/**
	 * Check if a key was just pressed this frame.
	 * @param keyCode - Key code to check
	 */
	isToggled(keyCode: number): boolean {
		return this.keyStates.get(keyCode) === this.frameCounter;
	}

	/**
	 * Get the current input state for the game.
	 */
	getState(): InputState {
		let moveX = 0;
		let moveY = 0;

		// Arrow keys
		if (this.isDown(KeyCode.LEFT)) moveX -= 1;
		if (this.isDown(KeyCode.RIGHT)) moveX += 1;
		if (this.isDown(KeyCode.UP)) moveY -= 1;
		if (this.isDown(KeyCode.DOWN)) moveY += 1;

		// WASD
		if (this.enableWasd) {
			if (this.isDown(KeyCode.A)) moveX -= 1;
			if (this.isDown(KeyCode.D)) moveX += 1;
			if (this.isDown(KeyCode.W)) moveY -= 1;
			if (this.isDown(KeyCode.S)) moveY += 1;
		}

		// ZQSD (French)
		if (this.enableZqsd) {
			if (this.isDown(KeyCode.Q)) moveX -= 1;
			// D is already handled by WASD
			if (this.isDown(KeyCode.Z)) moveY -= 1;
			// S is already handled by WASD
		}

		// Clamp movement
		moveX = Math.max(-1, Math.min(1, moveX));
		moveY = Math.max(-1, Math.min(1, moveY));

		// Apply swipe if not consumed
		if (!this.swipeConsumed && this.lastSwipe.direction) {
			switch (this.lastSwipe.direction) {
				case 'left':
					moveX = -1;
					break;
				case 'right':
					moveX = 1;
					break;
				case 'up':
					moveY = -1;
					break;
				case 'down':
					moveY = 1;
					break;
			}
			this.swipeConsumed = true;
		}

		// Action (attack)
		const action = this.isToggled(KeyCode.SPACE) || this.isToggled(KeyCode.E);
		const actionHeld = this.isDown(KeyCode.SPACE) || this.isDown(KeyCode.E);

		// Menu/pause
		const menu = this.isToggled(KeyCode.ESCAPE);

		// Confirm
		const confirm = this.isToggled(KeyCode.ENTER) || this.isToggled(KeyCode.SPACE);

		return {
			moveX,
			moveY,
			action,
			actionHeld,
			menu,
			confirm
		};
	}

	/**
	 * Get the last detected swipe.
	 */
	getLastSwipe(): SwipeResult {
		return this.lastSwipe;
	}

	/**
	 * Clear the last swipe (call after handling it).
	 */
	clearSwipe(): void {
		this.lastSwipe = { direction: null, distance: 0, velocity: 0 };
		this.swipeConsumed = false;
	}

	/**
	 * Reset all input state.
	 */
	reset(): void {
		this.keyStates.clear();
		this.clearSwipe();
	}

	// ========================================================================
	// EVENT HANDLERS
	// ========================================================================

	private handleKeyDown(event: KeyboardEvent): void {
		const code = event.keyCode;

		// Only set if not already down (to preserve the frame it was pressed)
		if (!this.keyStates.has(code)) {
			this.keyStates.set(code, this.frameCounter);
		}

		// Prevent default for game keys
		if (this.isGameKey(code)) {
			event.preventDefault();
		}
	}

	private handleKeyUp(event: KeyboardEvent): void {
		this.keyStates.delete(event.keyCode);
	}

	private handleTouchStart(event: TouchEvent): void {
		if (event.touches.length === 0) return;

		const touch = event.touches[0];
		this.touchStartX = touch.clientX;
		this.touchStartY = touch.clientY;
		this.touchStartTime = performance.now();

		// Prevent scrolling
		event.preventDefault();
	}

	private handleTouchEnd(event: TouchEvent): void {
		if (event.changedTouches.length === 0) return;

		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - this.touchStartX;
		const deltaY = touch.clientY - this.touchStartY;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
		const elapsed = performance.now() - this.touchStartTime;
		const velocity = elapsed > 0 ? distance / elapsed : 0;

		// Detect swipe direction
		if (distance >= this.swipeThreshold) {
			let direction: SwipeResult['direction'] = null;

			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				// Horizontal swipe
				direction = deltaX > 0 ? 'right' : 'left';
			} else {
				// Vertical swipe
				direction = deltaY > 0 ? 'down' : 'up';
			}

			this.lastSwipe = { direction, distance, velocity };
			this.swipeConsumed = false;
		}

		event.preventDefault();
	}

	private handleTouchCancel(): void {
		this.touchStartX = 0;
		this.touchStartY = 0;
		this.touchStartTime = 0;
	}

	/**
	 * Check if a key code is a game control key (for preventDefault).
	 */
	private isGameKey(code: number): boolean {
		return (
			code === KeyCode.UP ||
			code === KeyCode.DOWN ||
			code === KeyCode.LEFT ||
			code === KeyCode.RIGHT ||
			code === KeyCode.SPACE ||
			code === KeyCode.ENTER ||
			code === KeyCode.ESCAPE
		);
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create an input manager for a canvas element.
 * @param canvas - Canvas element for touch input
 * @returns InputManager instance
 */
export function createInputManager(canvas?: HTMLCanvasElement): InputManager {
	return new InputManager({
		touchTarget: canvas,
		enableWasd: true,
		enableZqsd: true
	});
}
