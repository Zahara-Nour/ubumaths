/**
 * Canvas Renderer for Evoland
 *
 * Handles pixel-perfect rendering with progressive color filters.
 * Uses double buffering and Y-sorting for isometric-style depth ordering.
 */

import type { SpriteSheet } from './sprite-sheet';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Rendering configuration for Evoland display */
export const RENDER_CONFIG = {
	BASE_WIDTH: 240,
	BASE_HEIGHT: 160,
	DEFAULT_SCALE: 4,
	TARGET_FPS: 40
} as const;

/**
 * Game Boy-style color palette (green tints).
 * Used when colorLevel is 0 (grayscale/monochrome mode).
 * Each array is [R, G, B] values.
 */
export const GB_PALETTE = [
	[15, 56, 15], // Darkest
	[48, 98, 48], // Dark
	[139, 172, 15], // Light
	[155, 188, 15] // Lightest (background)
] as const;

/** Color level constants for readability */
export const COLOR_LEVELS = {
	GRAYSCALE: 0,
	FOUR_COLORS: 1,
	SIXTEEN_COLORS: 2,
	TWO_FIFTY_SIX_COLORS: 3,
	FULL_COLOR: 4
} as const;

// ============================================================================
// TYPES
// ============================================================================

/** Sprite queued for depth-sorted rendering */
interface QueuedSprite {
	sheet: SpriteSheet;
	col: number;
	row: number;
	x: number;
	y: number;
	zIndex: number;
	flipX: boolean;
	flipY: boolean;
}

// ============================================================================
// COLOR FILTER FUNCTIONS
// ============================================================================

/**
 * Convert a pixel's RGB to luminance (grayscale value).
 * Uses standard luminance coefficients.
 */
function rgbToLuminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Map a grayscale value (0-255) to one of the GB palette colors.
 * Divides the grayscale range into 4 equal bands.
 */
function luminanceToGBIndex(luminance: number): number {
	if (luminance < 64) return 0; // Darkest
	if (luminance < 128) return 1; // Dark
	if (luminance < 192) return 2; // Light
	return 3; // Lightest
}

/**
 * Apply Game Boy-style grayscale filter to ImageData.
 * Converts all colors to the 4-color GB green palette.
 *
 * @param imageData - The ImageData to process (modified in place)
 */
export function applyGrayscaleFilter(imageData: ImageData): void {
	const data = imageData.data;
	const length = data.length;

	for (let i = 0; i < length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		// Skip fully transparent pixels
		if (a === 0) continue;

		const luminance = rgbToLuminance(r, g, b);
		const paletteIndex = luminanceToGBIndex(luminance);
		const color = GB_PALETTE[paletteIndex];

		data[i] = color[0];
		data[i + 1] = color[1];
		data[i + 2] = color[2];
	}
}

/**
 * Quantize a color channel to a limited number of levels.
 * Used for 4, 16, or 256 color palette restrictions.
 */
function quantizeChannel(value: number, levels: number): number {
	if (levels >= 256) return value;
	const step = 256 / levels;
	const quantized = Math.floor(value / step) * step;
	return Math.min(255, quantized + step / 2);
}

/**
 * Apply limited palette filter to ImageData.
 * Reduces colors to the specified count.
 *
 * @param imageData - The ImageData to process (modified in place)
 * @param colorCount - Target color count (4, 16, or 256)
 */
export function applyPaletteFilter(imageData: ImageData, colorCount: number): void {
	const data = imageData.data;
	const length = data.length;

	// Calculate levels per channel based on total colors
	// For RGB: colorCount = levelsPerChannel^3
	// 4 colors -> ~1.6 levels (use 2)
	// 16 colors -> ~2.5 levels (use 3)
	// 256 colors -> ~6.3 levels (use 6)
	let levelsPerChannel: number;
	if (colorCount <= 4) {
		levelsPerChannel = 2;
	} else if (colorCount <= 16) {
		levelsPerChannel = 3;
	} else if (colorCount <= 256) {
		levelsPerChannel = 6;
	} else {
		return; // No filter needed
	}

	for (let i = 0; i < length; i += 4) {
		const a = data[i + 3];

		// Skip fully transparent pixels
		if (a === 0) continue;

		data[i] = quantizeChannel(data[i], levelsPerChannel);
		data[i + 1] = quantizeChannel(data[i + 1], levelsPerChannel);
		data[i + 2] = quantizeChannel(data[i + 2], levelsPerChannel);
	}
}

/**
 * Apply a color filter for a specific level.
 *
 * @param imageData - The ImageData to process (modified in place)
 * @param level - Color level (0=grayscale, 1=4 colors, 2=16, 3=256, 4=full)
 */
function applyColorFilterForLevel(imageData: ImageData, level: number): void {
	switch (level) {
		case 0:
			applyGrayscaleFilter(imageData);
			break;
		case 1:
			applyPaletteFilter(imageData, 4);
			break;
		case 2:
			applyPaletteFilter(imageData, 16);
			break;
		case 3:
			applyPaletteFilter(imageData, 256);
			break;
		default:
			// Level 4+ = full color, no filter
			break;
	}
}

/**
 * Interpolate between two color levels for smooth transitions.
 * Blends the filtered versions based on progress.
 *
 * @param imageData - The ImageData to process (modified in place)
 * @param fromLevel - Starting color level
 * @param toLevel - Target color level
 * @param progress - Transition progress (0 = fromLevel, 1 = toLevel)
 */
export function applyColorTransition(
	imageData: ImageData,
	fromLevel: number,
	toLevel: number,
	progress: number
): void {
	// If no transition needed, just apply target level
	if (progress >= 1 || fromLevel === toLevel) {
		applyColorFilterForLevel(imageData, toLevel);
		return;
	}

	if (progress <= 0) {
		applyColorFilterForLevel(imageData, fromLevel);
		return;
	}

	// Create copies for both filter states
	const fromData = new Uint8ClampedArray(imageData.data);
	const toData = new Uint8ClampedArray(imageData.data);

	// Create temporary ImageData objects
	const fromImageData = new ImageData(fromData, imageData.width, imageData.height);
	const toImageData = new ImageData(toData, imageData.width, imageData.height);

	// Apply both filters
	applyColorFilterForLevel(fromImageData, fromLevel);
	applyColorFilterForLevel(toImageData, toLevel);

	// Blend the results
	const data = imageData.data;
	const length = data.length;
	const invProgress = 1 - progress;

	for (let i = 0; i < length; i += 4) {
		data[i] = Math.round(fromData[i] * invProgress + toData[i] * progress);
		data[i + 1] = Math.round(fromData[i + 1] * invProgress + toData[i + 1] * progress);
		data[i + 2] = Math.round(fromData[i + 2] * invProgress + toData[i + 2] * progress);
		// Alpha stays unchanged
	}
}

// ============================================================================
// DEPTH MANAGER
// ============================================================================

/**
 * Manages depth-sorted (Y-sorted) sprite rendering.
 * Sprites with higher Y/zIndex values are rendered on top.
 */
export class DepthManager {
	private queue: QueuedSprite[] = [];

	/**
	 * Add a sprite to the render queue.
	 */
	add(sprite: QueuedSprite): void {
		this.queue.push(sprite);
	}

	/**
	 * Sort sprites by zIndex (Y position) for correct depth ordering.
	 * Lower zIndex = rendered first (behind).
	 */
	sort(): void {
		this.queue.sort((a, b) => a.zIndex - b.zIndex);
	}

	/**
	 * Clear the sprite queue.
	 */
	clear(): void {
		this.queue.length = 0;
	}

	/**
	 * Iterate over all queued sprites in sorted order.
	 */
	forEach(callback: (sprite: QueuedSprite) => void): void {
		for (const sprite of this.queue) {
			callback(sprite);
		}
	}

	/**
	 * Get the number of sprites in the queue.
	 */
	get length(): number {
		return this.queue.length;
	}
}

// ============================================================================
// RENDERER CLASS
// ============================================================================

/**
 * Main renderer for Evoland game.
 * Handles double buffering, color filters, and screen effects.
 */
export class Renderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private backBuffer: OffscreenCanvas;
	private backCtx: OffscreenCanvasRenderingContext2D;
	private scale: number;
	// Start at grayscale (0) like the original game - colors are unlocked via CColor chests
	private colorLevel: number = COLOR_LEVELS.GRAYSCALE;
	private targetColorLevel: number = COLOR_LEVELS.GRAYSCALE;
	private colorTransition: number = 1; // 0-1 for smooth transitions
	private transitionSpeed: number = 0.05; // Transition speed per frame
	private depthManager: DepthManager;
	private shakePower: number = 0;
	private shakeOffsetX: number = 0;
	private shakeOffsetY: number = 0;

	/**
	 * Create a new Renderer instance.
	 *
	 * @param canvas - The display canvas element
	 * @param scale - Scaling factor (default: 4 for 960x640 display)
	 */
	constructor(canvas: HTMLCanvasElement, scale: number = RENDER_CONFIG.DEFAULT_SCALE) {
		this.canvas = canvas;
		this.scale = scale;

		// Setup display canvas
		this.canvas.width = RENDER_CONFIG.BASE_WIDTH * this.scale;
		this.canvas.height = RENDER_CONFIG.BASE_HEIGHT * this.scale;

		const ctx = this.canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Failed to get 2D rendering context for display canvas');
		}
		this.ctx = ctx;
		this.ctx.imageSmoothingEnabled = false;

		// Setup back buffer at base resolution
		this.backBuffer = new OffscreenCanvas(RENDER_CONFIG.BASE_WIDTH, RENDER_CONFIG.BASE_HEIGHT);
		const backCtx = this.backBuffer.getContext('2d');
		if (!backCtx) {
			throw new Error('Failed to get 2D rendering context for back buffer');
		}
		this.backCtx = backCtx;
		this.backCtx.imageSmoothingEnabled = false;

		this.depthManager = new DepthManager();
	}

	/**
	 * Set the color filter level.
	 *
	 * @param level - Target color level (0=GB grayscale, 4=full color)
	 * @param transition - Transition duration in seconds (0 = instant)
	 */
	setColorLevel(level: number, transition: number = 0): void {
		const clampedLevel = Math.max(0, Math.min(4, Math.round(level)));

		if (transition <= 0) {
			// Instant change
			this.colorLevel = clampedLevel;
			this.targetColorLevel = clampedLevel;
			this.colorTransition = 1;
		} else {
			// Start transition
			this.targetColorLevel = clampedLevel;
			this.colorTransition = 0;
			// Calculate speed based on 40 FPS target
			this.transitionSpeed = 1 / (transition * RENDER_CONFIG.TARGET_FPS);
		}
	}

	/**
	 * Get the current color level.
	 */
	getColorLevel(): number {
		return this.colorLevel;
	}

	/**
	 * Get the target color level (for transitions).
	 */
	getTargetColorLevel(): number {
		return this.targetColorLevel;
	}

	/**
	 * Check if a color transition is in progress.
	 */
	isTransitioning(): boolean {
		return this.colorTransition < 1 && this.colorLevel !== this.targetColorLevel;
	}

	/**
	 * Clear the back buffer.
	 */
	clear(): void {
		this.backCtx.clearRect(0, 0, RENDER_CONFIG.BASE_WIDTH, RENDER_CONFIG.BASE_HEIGHT);
	}

	/**
	 * Begin a new frame.
	 * Call this at the start of each render cycle.
	 */
	beginFrame(): void {
		this.clear();
		this.depthManager.clear();

		// Update shake offset
		if (this.shakePower > 0) {
			this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakePower;
			this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakePower;
		} else {
			this.shakeOffsetX = 0;
			this.shakeOffsetY = 0;
		}

		// Update color transition
		if (this.colorTransition < 1 && this.colorLevel !== this.targetColorLevel) {
			this.colorTransition = Math.min(1, this.colorTransition + this.transitionSpeed);
			if (this.colorTransition >= 1) {
				this.colorLevel = this.targetColorLevel;
			}
		}
	}

	/**
	 * End the frame, apply filters, and copy to display canvas.
	 * Call this at the end of each render cycle.
	 */
	endFrame(): void {
		// Flush any remaining queued sprites
		this.flushSpriteQueue();

		// Apply color filter to back buffer
		if (this.colorLevel < COLOR_LEVELS.FULL_COLOR || this.isTransitioning()) {
			const imageData = this.backCtx.getImageData(
				0,
				0,
				RENDER_CONFIG.BASE_WIDTH,
				RENDER_CONFIG.BASE_HEIGHT
			);

			if (this.isTransitioning()) {
				applyColorTransition(
					imageData,
					this.colorLevel,
					this.targetColorLevel,
					this.colorTransition
				);
			} else {
				applyColorFilterForLevel(imageData, this.colorLevel);
			}

			this.backCtx.putImageData(imageData, 0, 0);
		}

		// Clear display canvas
		this.ctx.clearRect(
			0,
			0,
			RENDER_CONFIG.BASE_WIDTH * this.scale,
			RENDER_CONFIG.BASE_HEIGHT * this.scale
		);

		// Apply shake offset and scale to display canvas
		const offsetX = Math.round(this.shakeOffsetX * this.scale);
		const offsetY = Math.round(this.shakeOffsetY * this.scale);

		// Draw back buffer to display canvas with scaling
		this.ctx.drawImage(
			this.backBuffer,
			offsetX,
			offsetY,
			RENDER_CONFIG.BASE_WIDTH * this.scale,
			RENDER_CONFIG.BASE_HEIGHT * this.scale
		);
	}

	/**
	 * Draw a sprite immediately (not depth-sorted).
	 *
	 * @param sheet - The sprite sheet to draw from
	 * @param col - Column index in the sprite sheet
	 * @param row - Row index in the sprite sheet
	 * @param x - Destination X position
	 * @param y - Destination Y position
	 * @param flipX - Whether to flip horizontally
	 * @param flipY - Whether to flip vertically
	 */
	drawSprite(
		sheet: SpriteSheet,
		col: number,
		row: number,
		x: number,
		y: number,
		flipX: boolean = false,
		flipY: boolean = false
	): void {
		sheet.drawSprite(
			this.backCtx as unknown as CanvasRenderingContext2D,
			col,
			row,
			Math.floor(x),
			Math.floor(y),
			flipX,
			flipY
		);
	}

	/**
	 * Queue a sprite for depth-sorted rendering.
	 * Sprites are sorted by zIndex (typically Y position) before drawing.
	 *
	 * @param sheet - The sprite sheet to draw from
	 * @param col - Column index in the sprite sheet
	 * @param row - Row index in the sprite sheet
	 * @param x - Destination X position
	 * @param y - Destination Y position
	 * @param zIndex - Depth sorting value (higher = on top)
	 * @param flipX - Whether to flip horizontally
	 * @param flipY - Whether to flip vertically
	 */
	queueSprite(
		sheet: SpriteSheet,
		col: number,
		row: number,
		x: number,
		y: number,
		zIndex: number,
		flipX: boolean = false,
		flipY: boolean = false
	): void {
		this.depthManager.add({
			sheet,
			col,
			row,
			x,
			y,
			zIndex,
			flipX,
			flipY
		});
	}

	/**
	 * Flush all queued sprites, drawing them in depth-sorted order.
	 */
	flushSpriteQueue(): void {
		this.depthManager.sort();
		this.depthManager.forEach((sprite) => {
			this.drawSprite(
				sprite.sheet,
				sprite.col,
				sprite.row,
				sprite.x,
				sprite.y,
				sprite.flipX,
				sprite.flipY
			);
		});
		this.depthManager.clear();
	}

	/**
	 * Set the screen shake power.
	 *
	 * @param power - Shake intensity in pixels (0 to disable)
	 */
	setShake(power: number): void {
		this.shakePower = Math.max(0, power);
	}

	/**
	 * Get the back buffer rendering context for direct drawing.
	 * Use this for custom rendering operations.
	 */
	get context(): CanvasRenderingContext2D {
		return this.backCtx as unknown as CanvasRenderingContext2D;
	}

	/**
	 * Get the display canvas element.
	 */
	get displayCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	/**
	 * Get the back buffer canvas.
	 */
	get buffer(): OffscreenCanvas {
		return this.backBuffer;
	}

	/**
	 * Get the base resolution width.
	 */
	get baseWidth(): number {
		return RENDER_CONFIG.BASE_WIDTH;
	}

	/**
	 * Get the base resolution height.
	 */
	get baseHeight(): number {
		return RENDER_CONFIG.BASE_HEIGHT;
	}

	/**
	 * Get the current scale factor.
	 */
	get scaleFactor(): number {
		return this.scale;
	}

	/**
	 * Resize the canvas with a new scale factor.
	 *
	 * @param scale - New scaling factor
	 */
	resize(scale: number): void {
		this.scale = scale;
		this.canvas.width = RENDER_CONFIG.BASE_WIDTH * this.scale;
		this.canvas.height = RENDER_CONFIG.BASE_HEIGHT * this.scale;
		this.ctx.imageSmoothingEnabled = false;
	}

	/**
	 * Fill the back buffer with a solid color.
	 *
	 * @param color - CSS color string
	 */
	fillBackground(color: string): void {
		this.backCtx.fillStyle = color;
		this.backCtx.fillRect(0, 0, RENDER_CONFIG.BASE_WIDTH, RENDER_CONFIG.BASE_HEIGHT);
	}

	/**
	 * Draw a filled rectangle on the back buffer.
	 *
	 * @param x - X position
	 * @param y - Y position
	 * @param width - Rectangle width
	 * @param height - Rectangle height
	 * @param color - CSS color string
	 */
	fillRect(x: number, y: number, width: number, height: number, color: string): void {
		this.backCtx.fillStyle = color;
		this.backCtx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
	}

	/**
	 * Draw a stroked rectangle on the back buffer.
	 *
	 * @param x - X position
	 * @param y - Y position
	 * @param width - Rectangle width
	 * @param height - Rectangle height
	 * @param color - CSS color string
	 * @param lineWidth - Stroke line width
	 */
	strokeRect(
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
		lineWidth: number = 1
	): void {
		this.backCtx.strokeStyle = color;
		this.backCtx.lineWidth = lineWidth;
		this.backCtx.strokeRect(
			Math.floor(x) + 0.5,
			Math.floor(y) + 0.5,
			Math.floor(width),
			Math.floor(height)
		);
	}

	/**
	 * Set the global alpha (opacity) for subsequent draw operations.
	 *
	 * @param alpha - Alpha value (0-1)
	 */
	setAlpha(alpha: number): void {
		this.backCtx.globalAlpha = Math.max(0, Math.min(1, alpha));
	}

	/**
	 * Reset the global alpha to fully opaque.
	 */
	resetAlpha(): void {
		this.backCtx.globalAlpha = 1;
	}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new Renderer instance attached to a canvas element.
 *
 * @param canvas - The target canvas element
 * @param options - Optional configuration
 * @returns A new Renderer instance
 */
export function createRenderer(
	canvas: HTMLCanvasElement,
	options: {
		scale?: number;
		colorLevel?: number;
	} = {}
): Renderer {
	const renderer = new Renderer(canvas, options.scale);

	if (options.colorLevel !== undefined) {
		renderer.setColorLevel(options.colorLevel);
	}

	return renderer;
}
