/**
 * Grapheur Store
 *
 * Svelte 5 reactive store for the graphing calculator (Grapheur).
 * Manages functions, viewport state, cursor position, and localStorage persistence.
 *
 * @module stores/grapheur
 */

import { browser } from '$app/environment';
import { parseFunction } from '$lib/grapheur/evaluator';
import { DEFAULT_VIEWPORT, panViewport, zoomViewport } from '$lib/grapheur/viewport';
import { getNextColor } from '$lib/grapheur/colors';
import type {
	Plottable,
	ExplicitFunction,
	SequencePlottable,
	SequenceMode,
	Viewport,
	GraphState,
	Point,
	ViewportMetrics,
	ExplicitFunctionState,
	PlottableState,
	SequenceState,
	SnappedPoint
} from '$lib/grapheur/types';
import { graphStateSchema, GRAPH_STATE_VERSION, isSequence } from '$lib/grapheur/types';
import { DEFAULT_COBWEB_STEPS, nextSequenceName, parseSequence } from '$lib/grapheur/sequence';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'chiphre-grapheur-state';
const DEBOUNCE_MS = 500;

// =============================================================================
// Grapheur Store Class
// =============================================================================

/**
 * Reactive store for the graphing calculator.
 *
 * Features:
 * - Function management (add, update, remove)
 * - Viewport control (pan, zoom, reset)
 * - Cursor tracking for coordinate display
 * - Interaction state for rendering optimization
 * - localStorage persistence with debounce
 * - Zod validation on load
 *
 * @example
 * ```svelte
 * <script>
 * import { grapheurStore } from '$lib/stores/grapheur.svelte';
 *
 * // Add a function
 * grapheurStore.addFunction('x^2');
 *
 * // Access visible functions
 * {#each grapheurStore.visibleFunctions as func}
 *   <FunctionPlot {func} viewport={grapheurStore.viewport} />
 * {/each}
 * </script>
 * ```
 */
class GrapheurStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** List of functions to plot */
	functions = $state<Plottable[]>([]);

	/** Current viewport bounds */
	viewport = $state<Viewport>(DEFAULT_VIEWPORT);

	/** Cursor position in math coordinates (null if not hovering) */
	cursor = $state<Point | null>(null);

	/** Whether user is currently interacting (pan/zoom) - affects rendering quality */
	isInteracting = $state(false);

	/** Whether the grid is visible */
	showGrid = $state(true);

	/** Currently snapped special point (set by CurveHover, used by SpecialPoints/IntersectionPoints) */
	snappedPoint = $state<SnappedPoint | null>(null);

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** Timeout handle for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Only visible functions */
	visibleFunctions = $derived(this.functions.filter((f) => f.visible));

	/** Functions with valid AST (parseable) */
	validFunctions = $derived(this.functions.filter((f) => f.ast !== undefined));

	/** Viewport metrics for convenience */
	viewportMetrics = $derived<ViewportMetrics>({
		width: this.viewport.xMax - this.viewport.xMin,
		height: this.viewport.yMax - this.viewport.yMin,
		centerX: (this.viewport.xMin + this.viewport.xMax) / 2,
		centerY: (this.viewport.yMin + this.viewport.yMax) / 2
	});

	/** Colors currently in use */
	usedColors = $derived(this.functions.map((f) => f.color));

	/** Only the sequences */
	sequences = $derived(this.functions.filter(isSequence));

	/** Names already taken by the sequences on the graph */
	sequenceNames = $derived(this.sequences.map((s) => s.name));

	/** Number of functions */
	functionCount = $derived(this.functions.length);

	/** Whether there are any functions */
	hasFunctions = $derived(this.functions.length > 0);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromStorage();

			// Note: $effect cannot be used in constructor (outside component context)
			// Timeout cleanup is handled in scheduleSave by clearing previous timeout
			// and the timeout naturally completes or is cleared before new saves
		}
	}

	// ===========================================================================
	// Function Management
	// ===========================================================================

	/**
	 * Add a new function to the graph
	 *
	 * @param latex - LaTeX expression (default: empty)
	 * @returns The created function's ID
	 *
	 * @example
	 * ```typescript
	 * const id = grapheurStore.addFunction('x^2');
	 * grapheurStore.addFunction('\\sin(x)');
	 * ```
	 */
	addFunction(latex: string = ''): string {
		const id = crypto.randomUUID();
		const color = getNextColor(this.usedColors);
		const parseResult = parseFunction(latex);

		const func: ExplicitFunction = {
			id,
			type: 'explicit',
			latex,
			ast: parseResult.ast ?? undefined,
			parseError: parseResult.error ?? undefined,
			variable: 'x',
			color,
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		};

		this.functions = [...this.functions, func];
		this.scheduleSave();
		return id;
	}

	/**
	 * Update a function's properties
	 *
	 * @param id - The function's ID
	 * @param updates - Properties to update
	 *
	 * @example
	 * ```typescript
	 * // Update expression
	 * grapheurStore.updateFunction(id, { latex: 'x^3' });
	 *
	 * // Update appearance
	 * grapheurStore.updateFunction(id, { color: '#ff0000', lineWidth: 3 });
	 *
	 * // Toggle visibility
	 * grapheurStore.updateFunction(id, { visible: false });
	 * ```
	 */
	updateFunction(
		id: string,
		updates: Partial<
			Pick<ExplicitFunction, 'latex' | 'color' | 'visible' | 'lineWidth' | 'lineStyle'>
		>
	): void {
		this.functions = this.functions.map((f) => {
			// Sequences have their own updater — see updateSequence.
			if (f.id !== id || f.type !== 'explicit') return f;

			// If latex changed, re-parse
			if (updates.latex !== undefined && updates.latex !== f.latex) {
				const parseResult = parseFunction(updates.latex);
				return {
					...f,
					...updates,
					ast: parseResult.ast ?? undefined,
					parseError: parseResult.error ?? undefined
				};
			}

			return { ...f, ...updates };
		});
		this.scheduleSave();
	}

	// ===========================================================================
	// Sequence Management
	// ===========================================================================

	/**
	 * Add a numeric sequence to the graph
	 *
	 * @param mode - Explicit `u_n = f(n)` or recurrence `u_{n+1} = f(u_n)`
	 * @param latex - Right-hand side of the definition (default: empty)
	 * @returns The created sequence's ID
	 *
	 * @example
	 * ```typescript
	 * grapheurStore.addSequence('recurrence', '0.5u_n+3');
	 * ```
	 */
	addSequence(mode: SequenceMode = 'explicit', latex: string = ''): string {
		const id = crypto.randomUUID();
		const color = getNextColor(this.usedColors);
		const name = nextSequenceName(this.sequenceNames);
		const parseResult = parseSequence(latex, mode, name);

		const sequence: SequencePlottable = {
			id,
			type: 'sequence',
			name,
			mode,
			latex,
			ast: parseResult.ast ?? undefined,
			parseError: parseResult.error ?? undefined,
			usesIndex: parseResult.usesIndex,
			firstIndex: 0,
			firstTerm: mode === 'recurrence' ? 0 : null,
			// The cloud of ranks is the standard representation; the staircase is
			// picked explicitly, since it replaces the points rather than adding to
			// them.
			representation: 'ranks',
			cobwebSteps: DEFAULT_COBWEB_STEPS,
			color,
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		};

		this.functions = [...this.functions, sequence];
		this.scheduleSave();
		return id;
	}

	/**
	 * Update a sequence's properties
	 *
	 * Re-parses the expression whenever the expression, the mode or the name
	 * changes, since all three take part in resolving `u_n`.
	 *
	 * @param id - The sequence's ID
	 * @param updates - Properties to update
	 */
	updateSequence(
		id: string,
		updates: Partial<
			Pick<
				SequencePlottable,
				| 'latex'
				| 'mode'
				| 'name'
				| 'firstIndex'
				| 'firstTerm'
				| 'representation'
				| 'cobwebSteps'
				| 'color'
				| 'visible'
				| 'lineWidth'
				| 'lineStyle'
			>
		>
	): void {
		this.functions = this.functions.map((p) => {
			if (p.id !== id || p.type !== 'sequence') return p;

			const merged = { ...p, ...updates };

			const needsReparse =
				(updates.latex !== undefined && updates.latex !== p.latex) ||
				(updates.mode !== undefined && updates.mode !== p.mode) ||
				(updates.name !== undefined && updates.name !== p.name);

			if (!needsReparse) return merged;

			const parseResult = parseSequence(merged.latex, merged.mode, merged.name);
			return {
				...merged,
				ast: parseResult.ast ?? undefined,
				parseError: parseResult.error ?? undefined,
				usesIndex: parseResult.usesIndex
			};
		});
		this.scheduleSave();
	}

	/**
	 * Remove a function by ID
	 *
	 * @param id - The function's ID to remove
	 */
	removeFunction(id: string): void {
		this.functions = this.functions.filter((f) => f.id !== id);
		this.scheduleSave();
	}

	/**
	 * Clear all functions
	 */
	clearFunctions(): void {
		this.functions = [];
		this.scheduleSave();
	}

	/**
	 * Get a function by ID
	 *
	 * @param id - The function's ID
	 * @returns The function or undefined if not found
	 */
	getFunction(id: string): Plottable | undefined {
		return this.functions.find((f) => f.id === id);
	}

	/**
	 * Reorder functions (for layer control)
	 *
	 * @param fromIndex - Current index
	 * @param toIndex - Target index
	 */
	reorderFunctions(fromIndex: number, toIndex: number): void {
		if (
			fromIndex < 0 ||
			fromIndex >= this.functions.length ||
			toIndex < 0 ||
			toIndex >= this.functions.length
		) {
			return;
		}

		const newFunctions = [...this.functions];
		const [removed] = newFunctions.splice(fromIndex, 1);
		newFunctions.splice(toIndex, 0, removed);
		this.functions = newFunctions;
		this.scheduleSave();
	}

	// ===========================================================================
	// Viewport Management
	// ===========================================================================

	/**
	 * Pan the viewport
	 *
	 * @param dx - Horizontal displacement in math units (positive = pan right)
	 * @param dy - Vertical displacement in math units (positive = pan up)
	 */
	pan(dx: number, dy: number): void {
		this.viewport = panViewport(this.viewport, dx, dy);
		this.scheduleSave();
	}

	/**
	 * Zoom the viewport
	 *
	 * @param factor - Zoom factor (>1 = zoom out, <1 = zoom in)
	 * @param centerX - Center point X (defaults to viewport center)
	 * @param centerY - Center point Y (defaults to viewport center)
	 */
	zoom(factor: number, centerX?: number, centerY?: number): void {
		this.viewport = zoomViewport(this.viewport, factor, centerX, centerY);
		this.scheduleSave();
	}

	/**
	 * Reset viewport to default (-10 to 10 on both axes)
	 */
	resetViewport(): void {
		this.viewport = { ...DEFAULT_VIEWPORT };
		this.scheduleSave();
	}

	/**
	 * Set viewport directly
	 *
	 * @param viewport - The new viewport bounds
	 */
	setViewport(viewport: Viewport): void {
		this.viewport = viewport;
		this.scheduleSave();
	}

	// ===========================================================================
	// Cursor Management
	// ===========================================================================

	/**
	 * Set cursor position in math coordinates
	 *
	 * @param point - The cursor position, or null if not hovering
	 */
	setCursor(point: Point | null): void {
		this.cursor = point;
	}

	/**
	 * Set interaction state (for rendering optimization)
	 *
	 * When interacting is true, rendering can use lower quality
	 * for better performance during pan/zoom.
	 *
	 * @param value - Whether user is currently interacting
	 */
	setInteracting(value: boolean): void {
		this.isInteracting = value;
	}

	/**
	 * Set the currently snapped special point
	 *
	 * Called by CurveHover when it snaps to a special point.
	 * SpecialPoints and IntersectionPoints use this to hide their markers.
	 *
	 * @param point - The snapped point, or null if not snapping
	 */
	setSnappedPoint(point: SnappedPoint | null): void {
		this.snappedPoint = point;
	}

	/**
	 * Toggle grid visibility
	 */
	toggleGrid(): void {
		this.showGrid = !this.showGrid;
		this.scheduleSave();
	}

	// ===========================================================================
	// Serialization
	// ===========================================================================

	/**
	 * Serialize state for storage
	 *
	 * Excludes AST (will be re-parsed on load) since MathNode
	 * is not JSON-serializable.
	 *
	 * @returns GraphState object ready for JSON serialization
	 */
	serialize(): GraphState {
		return {
			version: GRAPH_STATE_VERSION,
			viewport: this.viewport,
			showGrid: this.showGrid,
			functions: this.functions.map((p): PlottableState => {
				if (isSequence(p)) {
					const sequenceState: SequenceState = {
						id: p.id,
						type: p.type,
						name: p.name,
						mode: p.mode,
						latex: p.latex,
						firstIndex: p.firstIndex,
						firstTerm: p.firstTerm,
						representation: p.representation,
						cobwebSteps: p.cobwebSteps,
						color: p.color,
						visible: p.visible,
						lineWidth: p.lineWidth,
						lineStyle: p.lineStyle
					};
					return sequenceState;
				}

				const functionState: ExplicitFunctionState = {
					id: p.id,
					type: p.type,
					latex: p.latex,
					color: p.color,
					visible: p.visible,
					lineWidth: p.lineWidth,
					lineStyle: p.lineStyle,
					variable: p.variable
				};
				return functionState;
			})
		};
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/**
	 * Load state from localStorage
	 *
	 * Validates with Zod and re-parses all function expressions.
	 * Gracefully handles corrupted or incompatible data.
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			const validated = graphStateSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn('Invalid grapheur state in localStorage:', validated.error.issues);
				return;
			}

			const state = validated.data;

			// Restore viewport and grid visibility (schema ensures showGrid exists)
			this.viewport = state.viewport;
			this.showGrid = state.showGrid;

			// Re-parse everything (AST is not stored)
			this.functions = state.functions.map((p): Plottable => {
				if (p.type === 'sequence') {
					const parseResult = parseSequence(p.latex, p.mode, p.name);
					const sequence: SequencePlottable = {
						id: p.id,
						type: p.type,
						name: p.name,
						mode: p.mode,
						latex: p.latex,
						ast: parseResult.ast ?? undefined,
						parseError: parseResult.error ?? undefined,
						usesIndex: parseResult.usesIndex,
						firstIndex: p.firstIndex,
						firstTerm: p.firstTerm,
						representation: p.representation,
						cobwebSteps: p.cobwebSteps,
						color: p.color,
						visible: p.visible,
						lineWidth: p.lineWidth,
						lineStyle: p.lineStyle ?? 'solid'
					};
					return sequence;
				}

				const parseResult = parseFunction(p.latex);
				const func: ExplicitFunction = {
					id: p.id,
					type: p.type,
					latex: p.latex,
					ast: parseResult.ast ?? undefined,
					parseError: parseResult.error ?? undefined,
					variable: p.variable,
					color: p.color,
					visible: p.visible,
					lineWidth: p.lineWidth,
					lineStyle: p.lineStyle ?? 'solid' // Default for backward compatibility
				};
				return func;
			});
		} catch (error) {
			console.warn('Failed to load grapheur state from localStorage:', error);
		}
	}

	/**
	 * Save state to localStorage with debounce
	 *
	 * Called after every state mutation. Uses debouncing to avoid
	 * excessive writes during rapid updates (like dragging).
	 */
	private scheduleSave(): void {
		if (!browser) return;

		// Clear any pending save
		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
		}

		// Schedule new save
		this.saveTimeout = setTimeout(() => {
			this.saveToStorage();
			this.saveTimeout = null;
		}, DEBOUNCE_MS);
	}

	/**
	 * Save state to localStorage immediately
	 */
	private saveToStorage(): void {
		if (!browser) return;

		try {
			const state = this.serialize();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.warn('Failed to save grapheur state to localStorage:', error);

			// Handle quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Try to save with fewer functions
				try {
					const reducedState: GraphState = {
						...this.serialize(),
						functions: this.serialize().functions.slice(0, 10)
					};
					localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedState));
				} catch {
					// If still failing, just clear storage
					this.clearStorage();
				}
			}
		}
	}

	/**
	 * Clear stored state from localStorage
	 */
	clearStorage(): void {
		if (!browser) return;
		localStorage.removeItem(STORAGE_KEY);
	}

	/**
	 * Reset to initial state
	 *
	 * Clears all functions, resets viewport, and clears cursor/interaction state.
	 * Does NOT clear localStorage - use clearStorage() for that.
	 */
	reset(): void {
		this.functions = [];
		this.viewport = { ...DEFAULT_VIEWPORT };
		this.showGrid = true;
		this.cursor = null;
		this.isInteracting = false;
		this.scheduleSave();
	}

	/**
	 * Full reset including localStorage
	 */
	fullReset(): void {
		this.reset();
		this.clearStorage();
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Grapheur store.
 *
 * Use this in components to access graphing calculator state and methods.
 *
 * @example
 * ```svelte
 * <script>
 * import { grapheurStore } from '$lib/stores/grapheur.svelte';
 *
 * // Add a new function
 * function handleAdd() {
 *   grapheurStore.addFunction('x^2');
 * }
 *
 * // Access reactive state
 * $: console.log('Functions:', grapheurStore.functions);
 * </script>
 * ```
 */
export const grapheurStore = new GrapheurStore();

/**
 * Export the class for testing purposes
 */
export { GrapheurStore };
