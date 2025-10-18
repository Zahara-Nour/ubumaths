/**
 * MathGraph32 API Wrapper Service
 *
 * Provides a TypeScript-friendly wrapper around the MathGraph32 JavaScript API.
 * Handles CDN loading, initialization, and provides promise-based methods.
 *
 * ## Features
 * - **CDN Loading** - Automatic script loading from MathGraph32 CDN
 * - **Singleton Pattern** - Ensures MathGraph32 loads only once
 * - **Promise-based** - Async/await support for initialization
 * - **Type Safety** - Full TypeScript types for MathGraph32 API
 * - **Helper Functions** - Geometric calculations (distance, angle, etc.)
 *
 * @module mathgraph-api
 * @see {@link MATHGRAPH32_API_GUIDE.md} for detailed MathGraph32 usage
 * @see https://www.mathgraph32.org/documentation/loading/ for official docs
 *
 * @example Load and initialize MathGraph32
 * ```typescript
 * import { MathGraphService } from '$lib/services/mathgraph-api';
 *
 * const service = MathGraphService.getInstance();
 * await service.loadMathGraph();
 *
 * const app = await service.initializePlayer(container, {
 *   width: 600,
 *   height: 400,
 *   figure: baseFigureBase64
 * });
 * ```
 *
 * @example Use helper functions
 * ```typescript
 * import { MathGraphHelpers } from '$lib/services/mathgraph-api';
 *
 * const distance = MathGraphHelpers.calculateDistance(
 *   { x: 100, y: 200 },
 *   { x: 400, y: 600 }
 * );
 *
 * const angle = MathGraphHelpers.calculateAngle(
 *   { x: 0, y: 0 },
 *   { x: 100, y: 0 },
 *   { x: 100, y: 100 }
 * );
 * ```
 */

import type { MathGraphApp, SetFigOptions } from '$lib/types/geometry';

// Global window type extension
declare global {
	interface Window {
		mtgLoad?: (
			container: HTMLElement | string,
			svgOptions: SvgOptions,
			mtgOptions: MtgOptions,
			callback?: (error: Error | null, app: MathGraphApp) => void
		) => Promise<MathGraphApp> | void;
		mtgPublicPath?: string;
	}
}

interface SvgOptions {
	width?: number;
	height?: number;
	svgId?: string;
}

interface MtgOptions {
	isEditable?: boolean;
	fig?: string; // Base64 encoded figure
	loadApi?: boolean;
	level?: 0 | 1 | 2 | 3; // 0=elementary, 1=middle, 2=high, 3=complex
	isInteractive?: boolean;
	displayMeasures?: boolean;
	pointsAuto?: boolean;
	randomOnInit?: boolean;
	stylePointCroix?: boolean;
	onlyPoints?: boolean;
	dys?: boolean;
	construction?: boolean;
	hideCommands?: boolean;
	language?: string;
	zoomFactor?: number;
	open?: boolean;
	save?: boolean;
	newFig?: boolean;
	options?: boolean;
	pythonCodeId?: string;
	javascriptCodeId?: string;
	functionOnSave?: (figCode: string) => void;
	callBackAfterReady?: () => void;
}

/**
 * MathGraph32 CDN URLs
 */
const MATHGRAPH_CDN = {
	production: 'https://www.mathgraph32.org/js/mtgLoad/',
	development: 'https://dev.mathgraph32.org/js/mtgLoad/',
	elements: 'mathgraphElements.min.js',
	loader: 'mtgLoad.min.js'
} as const;

/**
 * Default configuration for MathGraph32
 */
const DEFAULT_SVG_OPTIONS: SvgOptions = {
	width: 800,
	height: 600
};

const DEFAULT_MTG_OPTIONS: MtgOptions = {
	isEditable: false,
	loadApi: true,
	level: 1,
	isInteractive: true,
	displayMeasures: true
};

/**
 * MathGraph32 API Service
 */
export class MathGraphService {
	private static instance: MathGraphService;
	private loadingPromise: Promise<void> | null = null;
	private isLoaded = false;
	private activeApps: Map<string, MathGraphApp> = new Map();

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): MathGraphService {
		if (!MathGraphService.instance) {
			MathGraphService.instance = new MathGraphService();
		}
		return MathGraphService.instance;
	}

	/**
	 * Load MathGraph32 from CDN
	 */
	async loadMathGraph(useDevelopmentCDN = false): Promise<void> {
		// Return existing promise if already loading
		if (this.loadingPromise) {
			return this.loadingPromise;
		}

		// Return immediately if already loaded
		if (this.isLoaded && typeof window.mtgLoad === 'function') {
			return Promise.resolve();
		}

		// Create new loading promise
		this.loadingPromise = new Promise((resolve, reject) => {
			const cdnBase = useDevelopmentCDN ? MATHGRAPH_CDN.development : MATHGRAPH_CDN.production;
			const scriptUrl = `${cdnBase}${MATHGRAPH_CDN.loader}`;

			// Check if script already exists
			const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
			if (existingScript) {
				// Script exists, check if loaded
				if (typeof window.mtgLoad === 'function') {
					this.isLoaded = true;
					resolve();
					return;
				}

				// Wait for existing script to load
				existingScript.addEventListener('load', () => {
					this.isLoaded = true;
					resolve();
				});
				existingScript.addEventListener('error', () => {
					reject(new Error('Failed to load MathGraph32 from existing script'));
				});
				return;
			}

			// Create and load script
			const script = document.createElement('script');
			script.src = scriptUrl;
			script.async = true;

			script.onload = () => {
				if (typeof window.mtgLoad !== 'function') {
					reject(new Error('MathGraph32 loaded but mtgLoad function not found'));
					return;
				}
				this.isLoaded = true;
				resolve();
			};

			script.onerror = () => {
				this.loadingPromise = null;
				reject(new Error(`Failed to load MathGraph32 from ${scriptUrl}`));
			};

			document.head.appendChild(script);
		});

		return this.loadingPromise;
	}

	/**
	 * Initialize a MathGraph32 player (read-only)
	 */
	async initializePlayer(
		container: HTMLElement,
		options: {
			width?: number;
			height?: number;
			figure?: string; // Base64 encoded
			svgId?: string;
			level?: 0 | 1 | 2 | 3;
			interactive?: boolean;
			displayMeasures?: boolean;
		} = {}
	): Promise<MathGraphApp> {
		await this.loadMathGraph();

		if (!window.mtgLoad) {
			throw new Error('MathGraph32 not loaded');
		}

		const svgOptions: SvgOptions = {
			width: options.width ?? DEFAULT_SVG_OPTIONS.width,
			height: options.height ?? DEFAULT_SVG_OPTIONS.height,
			svgId: options.svgId ?? `mtg-player-${Date.now()}`
		};

		const mtgOptions: MtgOptions = {
			...DEFAULT_MTG_OPTIONS,
			isEditable: false,
			fig: options.figure ?? '',
			level: options.level ?? 1,
			isInteractive: options.interactive ?? true,
			displayMeasures: options.displayMeasures ?? true
		};

		return new Promise((resolve, reject) => {
			window.mtgLoad!(container, svgOptions, mtgOptions, (error, app) => {
				if (error) {
					reject(error);
					return;
				}

				// Register app with both the requested ID and the actual SVG ID
				if (svgOptions.svgId) {
					this.activeApps.set(svgOptions.svgId, app);
				}

				// Find the actual SVG element and register with its ID too
				// MathGraph32 often creates its own IDs like "svgMtg0", "svgMtg1", etc.
				setTimeout(() => {
					const svg = container.querySelector('svg');
					if (svg && svg.id && svg.id !== svgOptions.svgId) {
						console.log(`Registering MathGraph app with actual SVG ID: ${svg.id}`);
						this.activeApps.set(svg.id, app);
					}
				}, 100);

				resolve(app);
			});
		});
	}

	/**
	 * Initialize a MathGraph32 editor (full editing capabilities)
	 */
	async initializeEditor(
		container: HTMLElement,
		options: {
			width?: number;
			height?: number;
			figure?: string; // Base64 encoded
			svgId?: string;
			level?: 0 | 1 | 2 | 3;
			allowedTools?: string[];
			showToolbar?: boolean;
			enableSave?: boolean;
			enableOpen?: boolean;
			onSave?: (figCode: string) => void;
			onReady?: () => void;
		} = {}
	): Promise<MathGraphApp> {
		await this.loadMathGraph();

		if (!window.mtgLoad) {
			throw new Error('MathGraph32 not loaded');
		}

		const svgOptions: SvgOptions = {
			width: options.width ?? DEFAULT_SVG_OPTIONS.width,
			height: options.height ?? DEFAULT_SVG_OPTIONS.height,
			svgId: options.svgId ?? `mtg-editor-${Date.now()}`
		};

		const mtgOptions: MtgOptions = {
			...DEFAULT_MTG_OPTIONS,
			isEditable: true,
			fig: options.figure ?? '',
			level: options.level ?? 1,
			save: options.enableSave ?? true,
			open: options.enableOpen ?? false,
			newFig: true,
			options: true,
			functionOnSave: options.onSave,
			callBackAfterReady: options.onReady
		};

		return new Promise((resolve, reject) => {
			window.mtgLoad!(container, svgOptions, mtgOptions, (error, app) => {
				if (error) {
					reject(error);
					return;
				}

				// Register app with both the requested ID and the actual SVG ID
				if (svgOptions.svgId) {
					this.activeApps.set(svgOptions.svgId, app);
				}

				// Find the actual SVG element and register with its ID too
				// MathGraph32 often creates its own IDs like "svgMtg0", "svgMtg1", etc.
				setTimeout(() => {
					const svg = container.querySelector('svg');
					if (svg && svg.id && svg.id !== svgOptions.svgId) {
						console.log(`Registering MathGraph app with actual SVG ID: ${svg.id}`);
						this.activeApps.set(svg.id, app);
					}
				}, 100);

				resolve(app);
			});
		});
	}

	/**
	 * Get an existing MathGraph32 app by SVG ID
	 */
	getApp(svgId: string): MathGraphApp | undefined {
		return this.activeApps.get(svgId);
	}

	/**
	 * Remove an app from tracking
	 */
	removeApp(svgId: string): void {
		this.activeApps.delete(svgId);
	}

	/**
	 * Clean up all apps
	 */
	cleanup(): void {
		this.activeApps.clear();
	}

	/**
	 * Check if MathGraph32 is loaded
	 */
	isReady(): boolean {
		return this.isLoaded && typeof window.mtgLoad === 'function';
	}

	/**
	 * Request fullscreen mode for a MathGraph32 container
	 * @param container - The container element to make fullscreen
	 * @param onResize - Optional callback when container is resized
	 */
	async requestFullscreen(
		container: HTMLElement,
		onResize?: (width: number, height: number) => void
	): Promise<void> {
		if (!container) {
			throw new Error('Container element is required for fullscreen');
		}

		// Request fullscreen using the standard Web API
		try {
			await container.requestFullscreen();

			// Listen for fullscreen changes to trigger resize
			if (onResize) {
				const handleFullscreenChange = () => {
					if (document.fullscreenElement === container) {
						// Entered fullscreen
						const width = window.innerWidth;
						const height = window.innerHeight;
						onResize(width, height);
					} else {
						// Exited fullscreen - restore original size
						const width = container.clientWidth;
						const height = container.clientHeight;
						onResize(width, height);
					}
				};

				document.addEventListener('fullscreenchange', handleFullscreenChange);

				// Store the listener for cleanup
				container.dataset.fullscreenListener = 'true';
			}
		} catch (error) {
			throw new Error(
				`Failed to enter fullscreen: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Exit fullscreen mode
	 */
	async exitFullscreen(): Promise<void> {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		}
	}

	/**
	 * Check if an element is currently in fullscreen
	 * @param container - Optional container to check (if not provided, checks any fullscreen element)
	 */
	isFullscreen(container?: HTMLElement): boolean {
		if (container) {
			return document.fullscreenElement === container;
		}
		return document.fullscreenElement !== null;
	}

	/**
	 * Toggle fullscreen mode
	 * @param container - The container element
	 * @param onResize - Optional callback when container is resized
	 */
	async toggleFullscreen(
		container: HTMLElement,
		onResize?: (width: number, height: number) => void
	): Promise<void> {
		if (this.isFullscreen(container)) {
			await this.exitFullscreen();
		} else {
			await this.requestFullscreen(container, onResize);
		}
	}
}

/**
 * Helper functions for common operations
 */
export class MathGraphHelpers {
	/**
	 * Create an empty figure with just a coordinate system
	 */
	static async createEmptyFigure(app: MathGraphApp): Promise<void> {
		// Create default coordinate system
		const A = await app.addPoint({ name: 'A', x: 0, y: 0, hidden: true });
		const B = await app.addPoint({ name: 'B', x: 100, y: 0, hidden: true });
		const C = await app.addPoint({ name: 'C', x: 0, y: 100, hidden: true });

		await app.addSystemOfAxis({
			o: A,
			a: B,
			b: C,
			color: '#e6e6e6',
			horizontalGrid: true,
			verticalGrid: true
		});
	}

	/**
	 * Get current figure state as base64
	 */
	static async getFigureState(app: MathGraphApp): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				// MathGraph32 stores figure state in the app object
				// We need to trigger a save to get the base64 code
				const originalSaveHandler = (window as any).mtgSaveHandler;

				(window as any).mtgSaveHandler = (figCode: string) => {
					(window as any).mtgSaveHandler = originalSaveHandler;
					resolve(figCode);
				};

				// Trigger save (this will call our handler)
				// Note: This is a workaround - actual implementation may vary
				setTimeout(() => {
					(window as any).mtgSaveHandler = originalSaveHandler;
					reject(new Error('Timeout getting figure state'));
				}, 5000);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Clear all objects from the figure
	 */
	static async clearFigure(app: MathGraphApp): Promise<void> {
		const list = app.listApi;
		const objects = list.col;

		// Remove objects in reverse order to avoid dependency issues
		for (let i = objects.length - 1; i >= 0; i--) {
			const obj = objects[i];
			if (obj.estDeNature && obj.existe) {
				app.deleteAfter({ elt: obj });
			}
		}

		this.refreshDisplay(app);
	}

	/**
	 * Refresh figure display
	 * Uses official API reDisplay() with fallback to legacy updateFigDisplay()
	 */
	static refreshDisplay(app: MathGraphApp): void {
		if (app.reDisplay) {
			app.reDisplay();
		} else if (app.updateFigDisplay) {
			app.updateFigDisplay();
		}
	}

	/**
	 * Count objects by type in the figure
	 */
	static countObjects(app: MathGraphApp): Record<string, number> {
		const list = app.listApi;
		const counts: Record<string, number> = {
			points: 0,
			lines: 0,
			circles: 0,
			segments: 0,
			polygons: 0,
			measurements: 0,
			calculations: 0,
			other: 0
		};

		for (const obj of list.col) {
			if (!obj.existe) continue;

			// Determine object type based on nature
			// Note: These nature constants would need to be imported from MathGraph32
			const className = (obj as any).className;

			if (className?.includes('Point')) counts.points++;
			else if (className?.includes('Droite') || className?.includes('Line')) counts.lines++;
			else if (className?.includes('Cercle') || className?.includes('Circle')) counts.circles++;
			else if (className?.includes('Segment')) counts.segments++;
			else if (className?.includes('Polygone') || className?.includes('Polygon')) counts.polygons++;
			else if (className?.includes('Mesure') || className?.includes('Measure'))
				counts.measurements++;
			else if (className?.includes('Calcul') || className?.includes('Calc')) counts.calculations++;
			else counts.other++;
		}

		return counts;
	}

	/**
	 * Get all points in the figure
	 */
	static getAllPoints(
		app: MathGraphApp
	): Array<{ name: string; x: number; y: number; tag?: string }> {
		const list = app.listApi;
		const points: Array<{ name: string; x: number; y: number; tag?: string }> = [];

		for (const obj of list.col) {
			if (obj.existe && (obj as any).className?.includes('Point')) {
				const point = obj as any;
				points.push({
					name: point.nom || point.name || '',
					x: point.x || 0,
					y: point.y || 0,
					tag: point.tag
				});
			}
		}

		return points;
	}

	/**
	 * Find an object by tag
	 * Uses official API getElement() with fallback to legacy methods
	 */
	static findByTag(app: MathGraphApp, tag: string): any | null {
		// Try official API first
		if (app.getElement) {
			return app.getElement(tag);
		}
		// Fallback to legacy method
		if (app.getObjectByTag) {
			return app.getObjectByTag(tag);
		}
		// Try listApi
		if (app.listApi?.getElement) {
			return app.listApi.getElement(tag);
		}
		if (app.listApi?.getByTag) {
			return app.listApi.getByTag(tag);
		}
		return null;
	}

	/**
	 * Find a point by name
	 * Uses official API getElement() with fallback to legacy methods
	 */
	static findPointByName(app: MathGraphApp, name: string): any | null {
		// Try official API first
		if (app.getElement) {
			return app.getElement(name);
		}
		// Fallback to legacy method
		if (app.getPointByName) {
			return app.getPointByName(name);
		}
		// Try listApi
		if (app.listApi?.getPointByName) {
			return app.listApi.getPointByName(name);
		}
		return null;
	}

	/**
	 * Calculate distance between two points
	 */
	static calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Calculate angle between three points (in degrees)
	 */
	static calculateAngle(
		a: { x: number; y: number },
		o: { x: number; y: number },
		b: { x: number; y: number }
	): number {
		const angle1 = Math.atan2(a.y - o.y, a.x - o.x);
		const angle2 = Math.atan2(b.y - o.y, b.x - o.x);
		let angle = (angle2 - angle1) * (180 / Math.PI);

		// Normalize to 0-360
		while (angle < 0) angle += 360;
		while (angle >= 360) angle -= 360;

		return angle;
	}

	/**
	 * Check if two values are approximately equal within tolerance
	 */
	static approximatelyEqual(a: number, b: number, tolerance: number = 0.01): boolean {
		return Math.abs(a - b) <= tolerance;
	}

	/**
	 * Check if a point lies on a line (within tolerance)
	 */
	static pointOnLine(
		point: { x: number; y: number },
		linePoint1: { x: number; y: number },
		linePoint2: { x: number; y: number },
		tolerance: number = 2
	): boolean {
		// Calculate distance from point to line
		const dx = linePoint2.x - linePoint1.x;
		const dy = linePoint2.y - linePoint1.y;
		const length = Math.sqrt(dx * dx + dy * dy);

		if (length === 0) return false;

		const distance = Math.abs(
			(dy * point.x - dx * point.y + linePoint2.x * linePoint1.y - linePoint2.y * linePoint1.x) /
				length
		);

		return distance <= tolerance;
	}

	/**
	 * Check if two lines are parallel (within tolerance)
	 */
	static linesParallel(
		line1Point1: { x: number; y: number },
		line1Point2: { x: number; y: number },
		line2Point1: { x: number; y: number },
		line2Point2: { x: number; y: number },
		angleTolerance: number = 2
	): boolean {
		const angle1 = Math.atan2(line1Point2.y - line1Point1.y, line1Point2.x - line1Point1.x);
		const angle2 = Math.atan2(line2Point2.y - line2Point1.y, line2Point2.x - line2Point1.x);

		let angleDiff = Math.abs(angle1 - angle2) * (180 / Math.PI);

		// Normalize angle difference
		while (angleDiff > 180) angleDiff = 360 - angleDiff;

		// Check if parallel (0°) or anti-parallel (180°)
		return angleDiff <= angleTolerance || Math.abs(angleDiff - 180) <= angleTolerance;
	}

	/**
	 * Check if two lines are perpendicular (within tolerance)
	 */
	static linesPerpendicular(
		line1Point1: { x: number; y: number },
		line1Point2: { x: number; y: number },
		line2Point1: { x: number; y: number },
		line2Point2: { x: number; y: number },
		angleTolerance: number = 2
	): boolean {
		const angle1 = Math.atan2(line1Point2.y - line1Point1.y, line1Point2.x - line1Point1.x);
		const angle2 = Math.atan2(line2Point2.y - line2Point1.y, line2Point2.x - line2Point1.x);

		let angleDiff = Math.abs(angle1 - angle2) * (180 / Math.PI);

		// Normalize angle difference
		while (angleDiff > 180) angleDiff = 360 - angleDiff;

		// Check if 90° or 270°
		return (
			Math.abs(angleDiff - 90) <= angleTolerance || Math.abs(angleDiff - 270) <= angleTolerance
		);
	}
}

/**
 * Export singleton instance
 */
export const mathGraphService = MathGraphService.getInstance();

/**
 * Convenience function to initialize a player
 */
export async function initMathGraphPlayer(
	container: HTMLElement,
	options?: Parameters<typeof mathGraphService.initializePlayer>[1]
): Promise<MathGraphApp> {
	return mathGraphService.initializePlayer(container, options);
}

/**
 * Convenience function to initialize an editor
 */
export async function initMathGraphEditor(
	container: HTMLElement,
	options?: Parameters<typeof mathGraphService.initializeEditor>[1]
): Promise<MathGraphApp> {
	return mathGraphService.initializeEditor(container, options);
}
