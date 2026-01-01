/**
 * Evoland Game Loop
 *
 * Handles the game update/render cycle at a fixed 40 FPS.
 * Based on the original Timer.hx from Evoland.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Target frames per second (matches original Evoland) */
export const TARGET_FPS = 40;

/** Frame duration in milliseconds */
export const FRAME_DURATION = 1000 / TARGET_FPS;

/** Maximum delta time to prevent spiral of death */
export const MAX_DELTA_TIME = 0.5;

/** Smoothing factor for delta time (0-1, higher = more responsive) */
export const DELTA_SMOOTHING = 0.05;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Callback function for game updates.
 * @param dt - Delta time in seconds (smoothed)
 * @param rawDt - Raw delta time in seconds
 */
export type UpdateCallback = (dt: number, rawDt: number) => void;

/**
 * Callback function for rendering.
 * @param interpolation - Interpolation factor for smooth rendering (0-1)
 */
export type RenderCallback = (interpolation: number) => void;

/**
 * Game loop statistics for debugging.
 */
export interface LoopStats {
	/** Current frames per second */
	readonly fps: number;
	/** Average frame time in milliseconds */
	readonly frameTime: number;
	/** Smoothed delta time multiplier */
	readonly tmod: number;
	/** Total frames rendered */
	readonly frameCount: number;
	/** Time since loop started in seconds */
	readonly elapsedTime: number;
}

/**
 * Game loop configuration options.
 */
export interface GameLoopOptions {
	/** Target FPS (default: 40) */
	readonly targetFps?: number;
	/** Whether to use fixed timestep (default: true) */
	readonly fixedTimestep?: boolean;
	/** Maximum updates per frame for fixed timestep (default: 5) */
	readonly maxUpdatesPerFrame?: number;
}

// ============================================================================
// GAME LOOP CLASS
// ============================================================================

/**
 * Game loop manager with fixed timestep and smooth delta time.
 *
 * Features:
 * - Fixed 40 FPS update rate (configurable)
 * - Smoothed delta time to prevent jitter
 * - Separate update and render callbacks
 * - Pause/resume support
 * - Performance statistics
 *
 * @example
 * ```typescript
 * const loop = new GameLoop({
 *   onUpdate: (dt) => game.update(dt),
 *   onRender: (interp) => game.render(interp)
 * });
 *
 * loop.start();
 * // Later...
 * loop.stop();
 * ```
 */
export class GameLoop {
	private onUpdate: UpdateCallback;
	private onRender: RenderCallback;
	private targetFps: number;
	private frameDuration: number;
	private fixedTimestep: boolean;
	private maxUpdatesPerFrame: number;

	private running: boolean = false;
	private paused: boolean = false;
	private animationFrameId: number | null = null;

	private lastTime: number = 0;
	private accumulator: number = 0;
	private frameCount: number = 0;
	private startTime: number = 0;

	/** Smoothed delta time multiplier (like Timer.tmod in Haxe) */
	private tmod: number = 1;

	// FPS calculation
	private fpsFrameCount: number = 0;
	private fpsLastTime: number = 0;
	private currentFps: number = 0;

	/**
	 * Create a new game loop.
	 * @param onUpdate - Called each update tick with delta time
	 * @param onRender - Called each frame with interpolation factor
	 * @param options - Loop configuration options
	 */
	constructor(onUpdate: UpdateCallback, onRender: RenderCallback, options: GameLoopOptions = {}) {
		this.onUpdate = onUpdate;
		this.onRender = onRender;
		this.targetFps = options.targetFps ?? TARGET_FPS;
		this.frameDuration = 1000 / this.targetFps;
		this.fixedTimestep = options.fixedTimestep ?? true;
		this.maxUpdatesPerFrame = options.maxUpdatesPerFrame ?? 5;
	}

	/**
	 * Start the game loop.
	 */
	start(): void {
		if (this.running) return;

		this.running = true;
		this.paused = false;
		this.lastTime = performance.now();
		this.startTime = this.lastTime;
		this.accumulator = 0;
		this.frameCount = 0;
		this.tmod = 1;
		this.fpsLastTime = this.lastTime;
		this.fpsFrameCount = 0;

		this.tick(this.lastTime);
	}

	/**
	 * Stop the game loop completely.
	 */
	stop(): void {
		this.running = false;
		this.paused = false;

		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Pause the game loop (keeps RAF running but skips updates).
	 */
	pause(): void {
		this.paused = true;
	}

	/**
	 * Resume a paused game loop.
	 */
	resume(): void {
		if (!this.paused) return;

		this.paused = false;
		this.lastTime = performance.now();
		this.accumulator = 0;
	}

	/**
	 * Toggle pause state.
	 */
	togglePause(): void {
		if (this.paused) {
			this.resume();
		} else {
			this.pause();
		}
	}

	/**
	 * Check if the loop is currently running.
	 */
	get isRunning(): boolean {
		return this.running;
	}

	/**
	 * Check if the loop is currently paused.
	 */
	get isPaused(): boolean {
		return this.paused;
	}

	/**
	 * Get current loop statistics.
	 */
	get stats(): LoopStats {
		return {
			fps: this.currentFps,
			frameTime: this.frameDuration,
			tmod: this.tmod,
			frameCount: this.frameCount,
			elapsedTime: (performance.now() - this.startTime) / 1000
		};
	}

	/**
	 * Main tick function called by requestAnimationFrame.
	 */
	private tick = (currentTime: number): void => {
		if (!this.running) return;

		this.animationFrameId = requestAnimationFrame(this.tick);

		// Calculate raw delta time in seconds
		const rawDt = Math.min((currentTime - this.lastTime) / 1000, MAX_DELTA_TIME);
		this.lastTime = currentTime;

		// Update FPS counter
		this.updateFps(currentTime);

		// Skip updates if paused (but keep RAF running)
		if (this.paused) {
			return;
		}

		// Smooth delta time (like Timer.tmod in original Haxe)
		// tmod = tmod * 0.95 + deltaT * 0.05 * wantedFPS
		this.tmod = this.tmod * (1 - DELTA_SMOOTHING) + rawDt * DELTA_SMOOTHING * this.targetFps;

		if (this.fixedTimestep) {
			// Fixed timestep with accumulator
			this.accumulator += rawDt * 1000;

			let updates = 0;
			while (this.accumulator >= this.frameDuration && updates < this.maxUpdatesPerFrame) {
				this.onUpdate(this.tmod, this.frameDuration / 1000);
				this.accumulator -= this.frameDuration;
				updates++;
			}

			// Calculate interpolation for smooth rendering
			const interpolation = this.accumulator / this.frameDuration;
			this.onRender(interpolation);
		} else {
			// Variable timestep
			this.onUpdate(this.tmod, rawDt);
			this.onRender(0);
		}

		this.frameCount++;
	};

	/**
	 * Update FPS counter (calculated every second).
	 */
	private updateFps(currentTime: number): void {
		this.fpsFrameCount++;

		const elapsed = currentTime - this.fpsLastTime;
		if (elapsed >= 1000) {
			this.currentFps = Math.round((this.fpsFrameCount * 1000) / elapsed);
			this.fpsFrameCount = 0;
			this.fpsLastTime = currentTime;
		}
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a simple game loop with just an update function.
 * Useful for games that don't need separate render interpolation.
 *
 * @param onTick - Called each frame with delta time
 * @param options - Loop configuration options
 * @returns GameLoop instance
 */
export function createSimpleLoop(
	onTick: (dt: number) => void,
	options: GameLoopOptions = {}
): GameLoop {
	return new GameLoop(
		(dt) => onTick(dt),
		() => {}, // No-op render
		options
	);
}

/**
 * Create a game loop configured for Evoland (40 FPS, fixed timestep).
 *
 * @param onUpdate - Called each update tick
 * @param onRender - Called each frame for rendering
 * @returns GameLoop instance
 */
export function createEvolandLoop(onUpdate: UpdateCallback, onRender: RenderCallback): GameLoop {
	return new GameLoop(onUpdate, onRender, {
		targetFps: TARGET_FPS,
		fixedTimestep: true,
		maxUpdatesPerFrame: 5
	});
}
