/**
 * Evoland Game Controller
 *
 * Orchestrates all game systems: renderer, input, game loop, and state.
 * Provides a simple interface for the Svelte component to interact with.
 */

import { Renderer } from './renderer';
import { InputManager, createInputManager, type InputState } from './input-manager';
import { GameLoop, createEvolandLoop } from './game-loop';
import { GameState, createGameState } from '../logic/game-state';
import { TILE_SIZE } from '../logic/constants';
import { evolandStore } from '../stores/evoland.svelte';
import { SpriteCache, EVOLAND_SPRITES, DEFAULT_TILE_SIZE } from './sprite-sheet';
import { getHeroSprite, CHEST_SPRITES } from './sprite-mapping';

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
	private gameState: GameState | null = null;
	private sprites: SpriteCache | null = null;

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

			// Load sprites
			this.sprites = new SpriteCache();
			await this.sprites.loadSheets([
				{ name: 'tiles', src: EVOLAND_SPRITES.tiles, tileSize: DEFAULT_TILE_SIZE },
				{ name: 'sprites', src: EVOLAND_SPRITES.sprites, tileSize: DEFAULT_TILE_SIZE }
			]);

			// Initialize input (using document for keyboard, canvas for touch)
			this.input = createInputManager(this.canvas);

			// Initialize game state
			this.gameState = createGameState();
			await this.gameState.initialize();

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
		this.gameState = null;
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
	private updatePlaying(dt: number, inputState: InputState): void {
		if (!this.gameState) return;

		// Pass input to game state
		this.gameState.handleInput(inputState);

		// Update game state
		this.gameState.update(dt);
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
		if (!this.renderer || !this.gameState) return;

		// Get back buffer context for rendering
		const ctx = (this.renderer as unknown as { backCtx: CanvasRenderingContext2D }).backCtx;
		if (!ctx) return;

		const camera = this.gameState.getCamera();
		const hero = this.gameState.getHero();
		const world = this.gameState.getWorld();

		// Clear with dark background
		ctx.fillStyle = '#1a1a2e';
		ctx.fillRect(0, 0, 240, 160);

		// Calculate visible tile range
		const startTileX = Math.floor(camera.x / TILE_SIZE);
		const startTileY = Math.floor(camera.y / TILE_SIZE);
		const endTileX = Math.ceil((camera.x + 240) / TILE_SIZE);
		const endTileY = Math.ceil((camera.y + 160) / TILE_SIZE);

		// Render tiles (simple colored squares for now)
		for (let ty = startTileY; ty <= endTileY; ty++) {
			for (let tx = startTileX; tx <= endTileX; tx++) {
				const tile = world.getTile(tx, ty);
				const screenX = tx * TILE_SIZE - camera.x;
				const screenY = ty * TILE_SIZE - camera.y;

				// Color based on tile type
				switch (tile) {
					case 1: // Grass
						ctx.fillStyle = '#3a5f3a';
						break;
					case 4: // Tree
						ctx.fillStyle = '#2a4f2a';
						break;
					case 0: // Dark/empty
					default:
						ctx.fillStyle = '#1a1a2e';
						break;
				}

				ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

				// Draw grid lines for visibility
				ctx.strokeStyle = '#333';
				ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
			}
		}

		// Get sprite sheets
		const spritesSheet = this.sprites?.getSheet('sprites');

		// Render chests
		for (const chest of this.gameState.getChests()) {
			const chestScreenX = chest.x * TILE_SIZE - camera.x;
			const chestScreenY = chest.y * TILE_SIZE - camera.y;

			if (spritesSheet?.isLoaded) {
				const chestSprite = chest.opened ? CHEST_SPRITES.open : CHEST_SPRITES.closed;
				spritesSheet.drawSprite(ctx, chestSprite.col, chestSprite.row, chestScreenX, chestScreenY);
			} else {
				// Fallback: colored rectangles
				ctx.fillStyle = chest.opened ? '#654321' : '#ffd700';
				ctx.fillRect(chestScreenX + 2, chestScreenY + 4, 12, 10);
				if (!chest.opened) {
					ctx.fillStyle = '#daa520';
					ctx.fillRect(chestScreenX + 1, chestScreenY + 2, 14, 4);
				}
			}
		}

		// Render hero
		const heroScreenX = hero.x - camera.x;
		const heroScreenY = hero.y - camera.y;

		if (spritesSheet?.isLoaded) {
			const heroSprite = getHeroSprite(hero.direction);
			spritesSheet.drawSprite(ctx, heroSprite.col, heroSprite.row, heroScreenX, heroScreenY);
		} else {
			// Fallback: colored rectangle with direction indicator
			ctx.fillStyle = '#4a9eff';
			ctx.fillRect(heroScreenX, heroScreenY, 16, 16);

			ctx.fillStyle = '#fff';
			const dir = hero.direction;
			const cx = heroScreenX + 8;
			const cy = heroScreenY + 8;
			ctx.beginPath();
			switch (dir) {
				case 0: // Up
					ctx.moveTo(cx, cy - 6);
					ctx.lineTo(cx - 3, cy);
					ctx.lineTo(cx + 3, cy);
					break;
				case 1: // Down
					ctx.moveTo(cx, cy + 6);
					ctx.lineTo(cx - 3, cy);
					ctx.lineTo(cx + 3, cy);
					break;
				case 2: // Left
					ctx.moveTo(cx - 6, cy);
					ctx.lineTo(cx, cy - 3);
					ctx.lineTo(cx, cy + 3);
					break;
				case 3: // Right
					ctx.moveTo(cx + 6, cy);
					ctx.lineTo(cx, cy - 3);
					ctx.lineTo(cx, cy + 3);
					break;
			}
			ctx.fill();
		}

		// Render monsters
		for (const monster of this.gameState.getMonsters()) {
			if (monster.removed) continue;
			const mx = monster.x - camera.x;
			const my = monster.y - camera.y;
			ctx.fillStyle = '#ff4a4a';
			ctx.fillRect(mx, my, 16, 16);
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
