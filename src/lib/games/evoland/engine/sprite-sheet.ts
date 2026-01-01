/**
 * Sprite Sheet Loader for Evoland
 *
 * Handles loading and rendering of 16x16 pixel sprite sheets.
 * Provides pixel-perfect rendering without smoothing/anti-aliasing.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default tile size for Evoland sprites */
export const DEFAULT_TILE_SIZE = 16;

/** Paths to Evoland sprite sheets */
export const EVOLAND_SPRITES = {
	tiles: '/games/evoland/sprites/tiles_alpha.png',
	sprites: '/games/evoland/sprites/sprites_alpha.png'
} as const;

/** Magenta color used as transparency key in original Haxe code (0xFFFF00FF) */
const MAGENTA_R = 255;
const MAGENTA_G = 0;
const MAGENTA_B = 255;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert magenta pixels (RGB 255,0,255) to transparent.
 * Used for sprite sheets that use magenta as a transparency color key.
 *
 * @param imageData - The ImageData to process (modified in place)
 * @returns The same ImageData with magenta pixels made transparent
 */
export function applyMagentaTransparency(imageData: ImageData): ImageData {
	const data = imageData.data;
	const length = data.length;

	for (let i = 0; i < length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];

		// Check for magenta (255, 0, 255)
		if (r === MAGENTA_R && g === MAGENTA_G && b === MAGENTA_B) {
			data[i + 3] = 0; // Set alpha to 0 (fully transparent)
		}
	}

	return imageData;
}

/**
 * Check if OffscreenCanvas is supported in the current environment.
 */
function isOffscreenCanvasSupported(): boolean {
	return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Create a canvas element (OffscreenCanvas if supported, regular Canvas otherwise).
 */
function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
	if (isOffscreenCanvasSupported()) {
		return new OffscreenCanvas(width, height);
	}
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Get 2D rendering context with pixel-perfect settings.
 */
function getPixelPerfectContext(
	canvas: OffscreenCanvas | HTMLCanvasElement
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
	const ctx = canvas.getContext('2d') as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!ctx) {
		throw new Error('Failed to get 2D rendering context');
	}

	// Disable image smoothing for pixel-perfect rendering
	ctx.imageSmoothingEnabled = false;

	return ctx;
}

// ============================================================================
// SPRITE SHEET CLASS
// ============================================================================

/**
 * Represents a loaded sprite sheet with methods to extract and draw sprites.
 * Optimized for 16x16 pixel tile-based sprite sheets.
 */
export class SpriteSheet {
	private image: HTMLImageElement | null = null;
	private canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
	private readonly tileSize: number;
	private cols: number = 0;
	private rows: number = 0;
	private loaded: boolean = false;
	private readonly imageSrc: string;
	private loadPromise: Promise<void> | null = null;

	/**
	 * Create a new SpriteSheet instance.
	 *
	 * @param imageSrc - Path to the sprite sheet image
	 * @param tileSize - Size of each tile in pixels (default: 16)
	 */
	constructor(imageSrc: string, tileSize: number = DEFAULT_TILE_SIZE) {
		this.imageSrc = imageSrc;
		this.tileSize = tileSize;
	}

	/**
	 * Load the sprite sheet image.
	 * Can be called multiple times safely - subsequent calls return the same promise.
	 *
	 * @returns Promise that resolves when the image is loaded
	 * @throws Error if the image fails to load
	 */
	async load(): Promise<void> {
		// Return existing promise if already loading/loaded
		if (this.loadPromise) {
			return this.loadPromise;
		}

		this.loadPromise = new Promise<void>((resolve, reject) => {
			const img = new Image();

			img.onload = () => {
				this.image = img;
				this.cols = Math.floor(img.width / this.tileSize);
				this.rows = Math.floor(img.height / this.tileSize);

				// Create internal canvas for sprite extraction
				this.canvas = createCanvas(img.width, img.height);
				this.ctx = getPixelPerfectContext(this.canvas);

				// Draw the full image to the internal canvas
				this.ctx.drawImage(img, 0, 0);

				this.loaded = true;
				resolve();
			};

			img.onerror = () => {
				reject(new Error(`Failed to load sprite sheet: ${this.imageSrc}`));
			};

			// Set crossOrigin before src for CORS support
			img.crossOrigin = 'anonymous';
			img.src = this.imageSrc;
		});

		return this.loadPromise;
	}

	/**
	 * Get a single sprite as ImageData.
	 *
	 * @param col - Column index (0-based, left to right)
	 * @param row - Row index (0-based, top to bottom)
	 * @returns ImageData for the requested sprite
	 * @throws Error if the sprite sheet is not loaded or coordinates are invalid
	 */
	getSprite(col: number, row: number): ImageData {
		if (!this.loaded || !this.ctx) {
			throw new Error('Sprite sheet not loaded. Call load() first.');
		}

		if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
			throw new Error(
				`Invalid sprite coordinates (${col}, ${row}). Valid range: cols 0-${this.cols - 1}, rows 0-${this.rows - 1}`
			);
		}

		const x = col * this.tileSize;
		const y = row * this.tileSize;

		return this.ctx.getImageData(x, y, this.tileSize, this.tileSize);
	}

	/**
	 * Draw a sprite directly to a canvas context.
	 * This is more efficient than getSprite() + putImageData() for rendering.
	 *
	 * @param ctx - Target canvas rendering context
	 * @param col - Column index in the sprite sheet (0-based)
	 * @param row - Row index in the sprite sheet (0-based)
	 * @param destX - Destination X position on the target canvas
	 * @param destY - Destination Y position on the target canvas
	 * @param flipX - Whether to flip the sprite horizontally
	 * @param flipY - Whether to flip the sprite vertically
	 */
	drawSprite(
		ctx: CanvasRenderingContext2D,
		col: number,
		row: number,
		destX: number,
		destY: number,
		flipX: boolean = false,
		flipY: boolean = false
	): void {
		if (!this.loaded || !this.image) {
			throw new Error('Sprite sheet not loaded. Call load() first.');
		}

		const srcX = col * this.tileSize;
		const srcY = row * this.tileSize;

		// Save context state for transformations
		ctx.save();

		// Disable smoothing for pixel-perfect rendering
		ctx.imageSmoothingEnabled = false;

		if (flipX || flipY) {
			// Apply transformations for flipping
			const translateX = flipX ? destX + this.tileSize : destX;
			const translateY = flipY ? destY + this.tileSize : destY;
			const scaleX = flipX ? -1 : 1;
			const scaleY = flipY ? -1 : 1;

			ctx.translate(translateX, translateY);
			ctx.scale(scaleX, scaleY);

			ctx.drawImage(
				this.image,
				srcX,
				srcY,
				this.tileSize,
				this.tileSize,
				0,
				0,
				this.tileSize,
				this.tileSize
			);
		} else {
			// Direct draw without transformation (faster)
			ctx.drawImage(
				this.image,
				srcX,
				srcY,
				this.tileSize,
				this.tileSize,
				destX,
				destY,
				this.tileSize,
				this.tileSize
			);
		}

		ctx.restore();
	}

	/**
	 * Draw a sprite with scaling support.
	 *
	 * @param ctx - Target canvas rendering context
	 * @param col - Column index in the sprite sheet (0-based)
	 * @param row - Row index in the sprite sheet (0-based)
	 * @param destX - Destination X position on the target canvas
	 * @param destY - Destination Y position on the target canvas
	 * @param destWidth - Destination width (for scaling)
	 * @param destHeight - Destination height (for scaling)
	 * @param flipX - Whether to flip the sprite horizontally
	 * @param flipY - Whether to flip the sprite vertically
	 */
	drawSpriteScaled(
		ctx: CanvasRenderingContext2D,
		col: number,
		row: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		flipX: boolean = false,
		flipY: boolean = false
	): void {
		if (!this.loaded || !this.image) {
			throw new Error('Sprite sheet not loaded. Call load() first.');
		}

		const srcX = col * this.tileSize;
		const srcY = row * this.tileSize;

		ctx.save();
		ctx.imageSmoothingEnabled = false;

		if (flipX || flipY) {
			const translateX = flipX ? destX + destWidth : destX;
			const translateY = flipY ? destY + destHeight : destY;
			const scaleX = flipX ? -1 : 1;
			const scaleY = flipY ? -1 : 1;

			ctx.translate(translateX, translateY);
			ctx.scale(scaleX, scaleY);

			ctx.drawImage(
				this.image,
				srcX,
				srcY,
				this.tileSize,
				this.tileSize,
				0,
				0,
				destWidth,
				destHeight
			);
		} else {
			ctx.drawImage(
				this.image,
				srcX,
				srcY,
				this.tileSize,
				this.tileSize,
				destX,
				destY,
				destWidth,
				destHeight
			);
		}

		ctx.restore();
	}

	/**
	 * Draw a region of multiple tiles from the sprite sheet.
	 *
	 * @param ctx - Target canvas rendering context
	 * @param srcCol - Starting column in the sprite sheet
	 * @param srcRow - Starting row in the sprite sheet
	 * @param width - Width in tiles
	 * @param height - Height in tiles
	 * @param destX - Destination X position
	 * @param destY - Destination Y position
	 */
	drawRegion(
		ctx: CanvasRenderingContext2D,
		srcCol: number,
		srcRow: number,
		width: number,
		height: number,
		destX: number,
		destY: number
	): void {
		if (!this.loaded || !this.image) {
			throw new Error('Sprite sheet not loaded. Call load() first.');
		}

		const srcX = srcCol * this.tileSize;
		const srcY = srcRow * this.tileSize;
		const srcWidth = width * this.tileSize;
		const srcHeight = height * this.tileSize;

		ctx.save();
		ctx.imageSmoothingEnabled = false;

		ctx.drawImage(this.image, srcX, srcY, srcWidth, srcHeight, destX, destY, srcWidth, srcHeight);

		ctx.restore();
	}

	/**
	 * Check if the sprite sheet is loaded and ready to use.
	 */
	get isLoaded(): boolean {
		return this.loaded;
	}

	/**
	 * Get the width of the sprite sheet in pixels.
	 */
	get width(): number {
		return this.image?.width ?? 0;
	}

	/**
	 * Get the height of the sprite sheet in pixels.
	 */
	get height(): number {
		return this.image?.height ?? 0;
	}

	/**
	 * Get the number of tile columns in the sprite sheet.
	 */
	get tilesPerRow(): number {
		return this.cols;
	}

	/**
	 * Get the number of tile rows in the sprite sheet.
	 */
	get tilesPerCol(): number {
		return this.rows;
	}

	/**
	 * Get the tile size used by this sprite sheet.
	 */
	get tileSizePixels(): number {
		return this.tileSize;
	}
}

// ============================================================================
// SPRITE CACHE CLASS
// ============================================================================

/** Configuration for loading a sprite sheet */
export interface SpriteSheetConfig {
	/** Unique name to identify this sheet */
	name: string;
	/** Path to the sprite sheet image */
	src: string;
	/** Tile size in pixels (default: 16) */
	tileSize?: number;
}

/**
 * Cache for managing multiple sprite sheets.
 * Provides centralized loading and access to all game sprite sheets.
 */
export class SpriteCache {
	private sheets: Map<string, SpriteSheet> = new Map();

	/**
	 * Load multiple sprite sheets in parallel.
	 *
	 * @param configs - Array of sprite sheet configurations
	 * @returns Promise that resolves when all sheets are loaded
	 * @throws Error if any sheet fails to load
	 */
	async loadSheets(configs: SpriteSheetConfig[]): Promise<void> {
		const loadPromises = configs.map(async (config) => {
			const sheet = new SpriteSheet(config.src, config.tileSize);
			await sheet.load();
			this.sheets.set(config.name, sheet);
		});

		await Promise.all(loadPromises);
	}

	/**
	 * Get a loaded sprite sheet by name.
	 *
	 * @param name - The name of the sprite sheet
	 * @returns The sprite sheet, or undefined if not found
	 */
	getSheet(name: string): SpriteSheet | undefined {
		return this.sheets.get(name);
	}

	/**
	 * Get a loaded sprite sheet by name, throwing if not found.
	 *
	 * @param name - The name of the sprite sheet
	 * @returns The sprite sheet
	 * @throws Error if the sheet is not found
	 */
	requireSheet(name: string): SpriteSheet {
		const sheet = this.sheets.get(name);
		if (!sheet) {
			throw new Error(`Sprite sheet not found: ${name}`);
		}
		return sheet;
	}

	/**
	 * Check if all loaded sheets are ready.
	 */
	get ready(): boolean {
		if (this.sheets.size === 0) {
			return false;
		}
		const sheets = Array.from(this.sheets.values());
		for (const sheet of sheets) {
			if (!sheet.isLoaded) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get the number of loaded sprite sheets.
	 */
	get size(): number {
		return this.sheets.size;
	}

	/**
	 * Get all loaded sprite sheet names.
	 */
	get sheetNames(): string[] {
		return Array.from(this.sheets.keys());
	}

	/**
	 * Clear all loaded sprite sheets from the cache.
	 */
	clear(): void {
		this.sheets.clear();
	}
}

// ============================================================================
// PRELOAD FUNCTION
// ============================================================================

/**
 * Preload all standard Evoland sprite sheets.
 * Convenience function for game initialization.
 *
 * @returns Promise resolving to a SpriteCache with all Evoland sprites loaded
 */
export async function loadEvolandSprites(): Promise<SpriteCache> {
	const cache = new SpriteCache();

	await cache.loadSheets([
		{ name: 'tiles', src: EVOLAND_SPRITES.tiles, tileSize: DEFAULT_TILE_SIZE },
		{ name: 'sprites', src: EVOLAND_SPRITES.sprites, tileSize: DEFAULT_TILE_SIZE }
	]);

	return cache;
}

// ============================================================================
// SINGLETON INSTANCE (optional usage pattern)
// ============================================================================

/** Global sprite cache instance for convenience */
let globalSpriteCache: SpriteCache | null = null;

/**
 * Get or create the global sprite cache.
 * Useful for accessing sprites from anywhere without passing references.
 *
 * @returns The global SpriteCache instance
 */
export function getGlobalSpriteCache(): SpriteCache {
	if (!globalSpriteCache) {
		globalSpriteCache = new SpriteCache();
	}
	return globalSpriteCache;
}

/**
 * Initialize the global sprite cache with Evoland sprites.
 * Should be called once during game initialization.
 *
 * @returns Promise that resolves when all sprites are loaded
 */
export async function initGlobalSpriteCache(): Promise<SpriteCache> {
	const cache = getGlobalSpriteCache();

	if (!cache.ready) {
		await cache.loadSheets([
			{ name: 'tiles', src: EVOLAND_SPRITES.tiles, tileSize: DEFAULT_TILE_SIZE },
			{ name: 'sprites', src: EVOLAND_SPRITES.sprites, tileSize: DEFAULT_TILE_SIZE }
		]);
	}

	return cache;
}
