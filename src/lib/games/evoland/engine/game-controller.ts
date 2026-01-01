/**
 * Evoland Game Controller
 *
 * Orchestrates all game systems: renderer, input, game loop, and state.
 * Provides a simple interface for the Svelte component to interact with.
 */

import { Renderer } from './renderer';
import { InputManager, createInputManager, type InputState } from './input-manager';
import { GameLoop, createEvolandLoop } from './game-loop';
import { evolandStore } from '../stores/evoland.svelte';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Game controller configuration.
 */
export interface GameControllerConfig {
	/** Canvas element for rendering */
	readonly canvas: HTMLCanvasElement;
	/** Scale factor (default: 4) */
	readonly scale?: number;
	/** Show FPS counter (default: false) */
	readonly showFps?: boolean;
}

/**
 * Game controller state.
 */
export interface GameControllerState {
	/** Whether the game is initialized */
	readonly initialized: boolean;
	/** Whether the game loop is running */
	readonly running: boolean;
	/** Whether the game is paused */
	readonly paused: boolean;
	/** Current FPS */
	readonly fps: number;
}

// ============================================================================
// GAME CONTROLLER
// ============================================================================

/**
 * Main game controller that coordinates all systems.
 *
 * Usage:
 * ```typescript
 * const controller = new GameController({ canvas });
 * await controller.initialize();
 * controller.start();
 *
 * // Later...
 * controller.stop();
 * controller.destroy();
 * ```
 */
export class GameController {
	private canvas: HTMLCanvasElement;
	private scale: number;
	private showFps: boolean;

	private renderer: Renderer | null = null;
	private input: InputManager | null = null;
	private gameLoop: GameLoop | null = null;

	private _initialized: boolean = false;

	constructor(config: GameControllerConfig) {
		this.canvas = config.canvas;
		this.scale = config.scale ?? 4;
		this.showFps = config.showFps ?? false;
	}

	/**
	 * Initialize all game systems.
	 * Must be called before start().
	 */
	async initialize(): Promise<void> {
		if (this._initialized) return;

		try {
			// Initialize renderer
			this.renderer = new Renderer(this.canvas, this.scale);

			// Initialize input (using document for keyboard, canvas for touch)
			this.input = createInputManager(this.canvas);

			// Create game loop
			this.gameLoop = createEvolandLoop(
				(dt) => this.update(dt),
				(interpolation) => this.render(interpolation)
			);

			this._initialized = true;

			// Update store
			evolandStore.setLoading(false);
		} catch (error) {
			console.error('Failed to initialize game:', error);
			throw error;
		}
	}

	/**
	 * Start the game loop.
	 */
	start(): void {
		if (!this._initialized) {
			throw new Error('Game controller not initialized. Call initialize() first.');
		}

		this.gameLoop?.start();
		evolandStore.startNewGame();
	}

	/**
	 * Stop the game loop.
	 */
	stop(): void {
		this.gameLoop?.stop();
	}

	/**
	 * Pause the game.
	 */
	pause(): void {
		this.gameLoop?.pause();
		evolandStore.pauseGame();
	}

	/**
	 * Resume the game.
	 */
	resume(): void {
		this.gameLoop?.resume();
		evolandStore.resumeGame();
	}

	/**
	 * Toggle pause state.
	 */
	togglePause(): void {
		if (this.gameLoop?.isPaused) {
			this.resume();
		} else {
			this.pause();
		}
	}

	/**
	 * Clean up all resources.
	 */
	destroy(): void {
		this.stop();
		this.input?.destroy();
		this.renderer = null;
		this.input = null;
		this.gameLoop = null;
		this._initialized = false;
	}

	/**
	 * Get current state.
	 */
	get state(): GameControllerState {
		return {
			initialized: this._initialized,
			running: this.gameLoop?.isRunning ?? false,
			paused: this.gameLoop?.isPaused ?? false,
			fps: this.gameLoop?.stats.fps ?? 0
		};
	}

	/**
	 * Get the input manager (for external input queries).
	 */
	get inputManager(): InputManager | null {
		return this.input;
	}

	// ========================================================================
	// PRIVATE METHODS
	// ========================================================================

	/**
	 * Main update loop - called at fixed 40 FPS.
	 */
	private update(dt: number): void {
		if (!this.input) return;

		// Update input state
		this.input.update();

		// Get input state
		const inputState = this.input.getState();

		// Handle game logic based on current screen
		switch (evolandStore.screen) {
			case 'playing':
				this.updatePlaying(dt, inputState);
				break;
			case 'dialog':
				// Dialog is handled by UI component
				break;
			default:
				break;
		}

		// Update FPS in store if showing
		if (this.showFps && this.gameLoop) {
			evolandStore.updateFPS(this.gameLoop.stats.fps);
		}
	}

	/**
	 * Update game while playing.
	 */
	private updatePlaying(_dt: number, inputState: InputState): void {
		// TODO: Implement actual game logic
		// For now, just log input for testing
		if (inputState.moveX !== 0 || inputState.moveY !== 0) {
			// Movement detected
		}

		if (inputState.action) {
			// Action button pressed (attack/interact)
		}
	}

	/**
	 * Main render loop - called each frame.
	 */
	private render(_interpolation: number): void {
		if (!this.renderer) return;

		// Begin frame
		this.renderer.beginFrame();

		// Render based on current screen
		switch (evolandStore.screen) {
			case 'playing':
			case 'paused':
			case 'dialog':
				this.renderGame();
				break;
			case 'title':
				this.renderTitle();
				break;
			case 'gameover':
			case 'victory':
				this.renderGame(); // Show game in background
				break;
		}

		// End frame (applies filters, copies to display)
		this.renderer.endFrame();
	}

	/**
	 * Render the game world.
	 */
	private renderGame(): void {
		if (!this.renderer) return;

		// TODO: Implement actual game rendering
		// For now, just draw a placeholder

		// Draw a simple gradient background
		const ctx = (this.renderer as unknown as { backCtx: CanvasRenderingContext2D }).backCtx;
		if (ctx) {
			// Dark blue background
			ctx.fillStyle = '#1a1a2e';
			ctx.fillRect(0, 0, 240, 160);

			// Draw a simple grid for testing
			ctx.strokeStyle = '#333';
			for (let x = 0; x < 240; x += 16) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, 160);
				ctx.stroke();
			}
			for (let y = 0; y < 160; y += 16) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(240, y);
				ctx.stroke();
			}

			// Draw a placeholder hero
			ctx.fillStyle = '#4a9eff';
			ctx.fillRect(112, 72, 16, 16);
		}
	}

	/**
	 * Render the title screen background.
	 */
	private renderTitle(): void {
		if (!this.renderer) return;

		// Title background is handled by UI component
		// Just render a dark background
		const ctx = (this.renderer as unknown as { backCtx: CanvasRenderingContext2D }).backCtx;
		if (ctx) {
			ctx.fillStyle = '#0a0a1e';
			ctx.fillRect(0, 0, 240, 160);
		}
	}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a game controller with the given configuration.
 */
export function createGameController(config: GameControllerConfig): GameController {
	return new GameController(config);
}
