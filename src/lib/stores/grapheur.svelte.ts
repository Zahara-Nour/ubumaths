/**
 * Grapheur Store
 *
 * Svelte 5 reactive store for the graphing calculator (Grapheur).
 * Manages functions, viewport state and cursor position. Rien n'est conservé :
 * chaque instance vit en mémoire, possédée par l'atelier qui la crée.
 *
 * @module stores/grapheur
 */

import { parseFunction } from '$lib/grapheur/evaluator';
import { DEFAULT_VIEWPORT, panViewport, zoomViewport } from '$lib/grapheur/viewport';
import { getNextSlot } from '$lib/grapheur/colors';
import type {
	Plottable,
	ExplicitFunction,
	SequencePlottable,
	SequenceMode,
	Viewport,
	Point,
	ViewportMetrics,
	SnappedPoint,
	Parameter,
	ScatterPlottable
} from '$lib/grapheur/types';
import {
	DEFAULT_PARAMETER_MAX,
	DEFAULT_PARAMETER_MIN,
	isSequence,
	nextParameterName,
	RESERVED_PARAMETER_NAMES
} from '$lib/grapheur/types';
import {
	DEFAULT_COBWEB_STEPS,
	nextSequenceName,
	parseSequence,
	DEFAULT_FIRST_TERM_MIN,
	DEFAULT_FIRST_TERM_MAX
} from '$lib/grapheur/sequence';
import {
	clearLabelsOf,
	cyclePinnedLabels,
	type PinnedLabel,
	type PinnedLabelTarget
} from '$lib/grapheur/pinned-labels';

// =============================================================================
// Grapheur Store Class
// =============================================================================

/**
 * Reactive store for the graphing calculator.
 *
 * Features:
 * - Function management (add, update, remove)
 * - Viewport control (pan, zoom)
 * - Cursor tracking for coordinate display
 * - Interaction state for rendering optimization
 *
 * Une instance par atelier (`new GrapheurStore()`), fournie aux composants par
 * `provideGrapheurStore` et lue par `useGrapheurStore`.
 */
class GrapheurStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** List of functions to plot */
	functions = $state<Plottable[]>([]);

	/** Named constants usable in any expression, each driven by a slider. */
	parameters = $state<Parameter[]>([]);

	/** Current viewport bounds */
	viewport = $state<Viewport>(DEFAULT_VIEWPORT);

	/** Cursor position in math coordinates (null if not hovering) */
	cursor = $state<Point | null>(null);

	/**
	 * Labels a click left on the graph.
	 *
	 * What you point at during a lesson. Each holds only what was clicked, so its
	 * value follows the parameters instead of going stale.
	 */
	pinnedLabels = $state<PinnedLabel[]>([]);

	/** Whether user is currently interacting (pan/zoom) - affects rendering quality */
	isInteracting = $state(false);

	/** Whether the grid is visible */
	showGrid = $state(true);

	/** Currently snapped special point (set by CurveHover, used by SpecialPoints/IntersectionPoints) */
	snappedPoint = $state<SnappedPoint | null>(null);

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/**
	 * Parameter values, keyed by name, ready to bind into an expression.
	 *
	 * Rebuilt whenever a slider moves — that is what redraws the curves.
	 */
	parameterBindings = $derived(
		Object.fromEntries(this.parameters.map((p) => [p.name, p.value])) as Record<string, number>
	);

	/** Names declared as parameters, accepted as free variables in expressions. */
	parameterNames = $derived(this.parameters.map((p) => p.name));

	/** Only visible functions */
	visibleFunctions = $derived(this.functions.filter((f) => f.visible));

	/**
	 * Functions with a valid AST (parseable).
	 *
	 * ⚠️ A scatter has no AST at all — its two series ARE the data. It is
	 * therefore excluded rather than counted as invalid: the panel shows this
	 * count as « n valides », and a cloud of points is not a failed parse.
	 */
	validFunctions = $derived(
		this.functions.filter((f) => f.type !== 'scatter' && f.ast !== undefined)
	);

	/** Viewport metrics for convenience */
	viewportMetrics = $derived<ViewportMetrics>({
		width: this.viewport.xMax - this.viewport.xMin,
		height: this.viewport.yMax - this.viewport.yMin,
		centerX: (this.viewport.xMin + this.viewport.xMax) / 2,
		centerY: (this.viewport.yMin + this.viewport.yMax) / 2
	});

	/** Places (couleur + style de trait) déjà occupées : décident de la suivante */
	usedSlots = $derived(this.functions.map((f) => ({ color: f.color, lineStyle: f.lineStyle })));

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
	 * const id = graph.addFunction('x^2');
	 * graph.addFunction('\\sin(x)');
	 * ```
	 */
	// ===========================================================================
	// Parameters
	// ===========================================================================

	/**
	 * Add a parameter, named with the first free letter.
	 *
	 * @returns The created parameter's ID
	 */
	addParameter(): string {
		const id = crypto.randomUUID();

		this.parameters = [
			...this.parameters,
			{
				id,
				name: nextParameterName(this.parameters.map((p) => p.name)),
				value: 1,
				min: DEFAULT_PARAMETER_MIN,
				max: DEFAULT_PARAMETER_MAX
			}
		];
		this.reparseSequences();
		return id;
	}

	/** Update a parameter's value or slider bounds. */
	updateParameter(id: string, updates: Partial<Pick<Parameter, 'value' | 'min' | 'max'>>): void {
		this.parameters = this.parameters.map((p) => (p.id === id ? { ...p, ...updates } : p));
	}

	/**
	 * Rename a parameter.
	 *
	 * Expressions refer to a parameter by its name, so a rename silently breaks
	 * the ones that used the old one — they will show their own error. What is
	 * refused here is a name that could never work.
	 *
	 * @returns An error message in French, or null when the rename went through
	 */
	renameParameter(id: string, name: string): string | null {
		const trimmed = name.trim();

		if (!/^[a-z]$/.test(trimmed)) return 'Un paramètre se nomme par une seule lettre minuscule.';
		if (RESERVED_PARAMETER_NAMES.has(trimmed))
			return `« ${trimmed} » est déjà pris par le grapheur.`;
		if (this.parameters.some((p) => p.id !== id && p.name === trimmed)) {
			return `Un paramètre « ${trimmed} » existe déjà.`;
		}
		if (this.sequenceNames.includes(trimmed)) {
			return `« ${trimmed} » est le nom d'une suite.`;
		}

		this.parameters = this.parameters.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
		this.reparseSequences();
		return null;
	}

	/** Remove a parameter. Expressions using it stop evaluating until it returns. */
	removeParameter(id: string): void {
		this.parameters = this.parameters.filter((p) => p.id !== id);
		this.reparseSequences();
	}

	/**
	 * Re-read every sequence against the current parameter names.
	 *
	 * A sequence validates its free variables when it is parsed. Writing
	 * `a·u_n` before declaring `a` therefore leaves it in error, and nothing
	 * would lift that error later — the expression has not changed, only what
	 * counts as a known name has. Explicit functions do not need this: they
	 * accept any free variable and simply evaluate to nothing until it is bound.
	 */
	private reparseSequences(): void {
		const names = this.parameterNames;

		this.functions = this.functions.map((p) => {
			if (!isSequence(p)) return p;

			const parsed = parseSequence(p.latex, p.mode, p.name, names);
			return {
				...p,
				ast: parsed.ast ?? undefined,
				parseError: parsed.error ?? undefined,
				usesIndex: parsed.usesIndex
			};
		});
	}

	addFunction(latex: string = ''): string {
		const id = crypto.randomUUID();
		const slot = getNextSlot(this.usedSlots);
		const parseResult = parseFunction(latex);

		const func: ExplicitFunction = {
			id,
			type: 'explicit',
			latex,
			ast: parseResult.ast ?? undefined,
			parseError: parseResult.error ?? undefined,
			variable: 'x',
			showDerivative: false,
			tangentAt: null,
			integral: null,
			showOsculating: false,
			showArcLength: false,
			color: slot.color,
			visible: true,
			lineWidth: 2,
			lineStyle: slot.lineStyle
		};

		this.functions = [...this.functions, func];
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
	 * graph.updateFunction(id, { latex: 'x^3' });
	 *
	 * // Update appearance
	 * graph.updateFunction(id, { color: '#ff0000', lineWidth: 3 });
	 *
	 * // Toggle visibility
	 * graph.updateFunction(id, { visible: false });
	 * ```
	 */
	updateFunction(
		id: string,
		updates: Partial<
			Pick<
				ExplicitFunction,
				| 'latex'
				| 'color'
				| 'visible'
				| 'lineWidth'
				| 'lineStyle'
				| 'showDerivative'
				| 'tangentAt'
				| 'integral'
				| 'showOsculating'
				| 'showArcLength'
				| 'restriction'
				| 'reading'
			>
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
	 * graph.addSequence('recurrence', '0.5u_n+3');
	 * ```
	 */
	addSequence(mode: SequenceMode = 'explicit', latex: string = ''): string {
		const id = crypto.randomUUID();
		const slot = getNextSlot(this.usedSlots);
		const name = nextSequenceName(this.sequenceNames);
		const parseResult = parseSequence(latex, mode, name, this.parameterNames);

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
			firstTermParameter: null,
			firstTermMin: DEFAULT_FIRST_TERM_MIN,
			firstTermMax: DEFAULT_FIRST_TERM_MAX,
			// The cloud of ranks is the standard representation; the staircase is
			// picked explicitly, since it replaces the points rather than adding to
			// them.
			representation: 'ranks',
			cobwebSteps: DEFAULT_COBWEB_STEPS,
			color: slot.color,
			visible: true,
			lineWidth: 2,
			lineStyle: slot.lineStyle
		};

		this.functions = [...this.functions, sequence];
		return id;
	}

	/**
	 * Pose un nuage de points à partir de deux séries.
	 *
	 * ⚠️ Les séries arrivent **déjà lues** : c'est l'atelier qui détient les
	 * listes et qui a écarté ce qui n'était pas un nombre. Le grapheur ne fait
	 * que les dessiner — un seul sens, comme pour les courbes (option B).
	 *
	 * @param xs - Abscisses
	 * @param ys - Ordonnées ; les paires incomplètes ne seront pas dessinées
	 * @param label - Ce que le panneau affiche, par exemple « L / M »
	 * @returns L'identifiant du nuage posé
	 */
	addScatter(xs: readonly number[], ys: readonly number[], label = ''): string {
		const id = crypto.randomUUID();
		// Un nuage n'a pas de trait : il prend la couleur de la place, le style ne
		// se voit pas (formes de points distinctes : hors chantier, décision Q1a).
		const slot = getNextSlot(this.usedSlots);
		const scatter: ScatterPlottable = {
			id,
			type: 'scatter',
			label,
			xs: [...xs],
			ys: [...ys],
			color: slot.color,
			visible: true,
			lineWidth: 2,
			lineStyle: slot.lineStyle
		};

		this.functions = [...this.functions, scatter];
		return id;
	}

	/**
	 * Met un nuage à jour.
	 *
	 * ⚠️ Un identifiant inconnu ne casse pas : la synchronisation depuis
	 * l'atelier peut arriver après un retrait, et faire tomber l'écran pour ça
	 * serait disproportionné.
	 */
	updateScatter(
		id: string,
		updates: Partial<Pick<ScatterPlottable, 'xs' | 'ys' | 'label' | 'color' | 'visible'>>
	): void {
		const index = this.functions.findIndex((f) => f.id === id && f.type === 'scatter');
		if (index === -1) return;

		const current = this.functions[index] as ScatterPlottable;
		const next: ScatterPlottable = {
			...current,
			...updates,
			...(updates.xs && { xs: [...updates.xs] }),
			...(updates.ys && { ys: [...updates.ys] })
		};

		this.functions = [...this.functions.slice(0, index), next, ...this.functions.slice(index + 1)];
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
				| 'firstTermParameter'
				| 'firstTermMin'
				| 'firstTermMax'
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

			const parseResult = parseSequence(
				merged.latex,
				merged.mode,
				merged.name,
				this.parameterNames
			);
			return {
				...merged,
				ast: parseResult.ast ?? undefined,
				parseError: parseResult.error ?? undefined,
				usesIndex: parseResult.usesIndex
			};
		});
	}

	/**
	 * Remove a function by ID
	 *
	 * @param id - The function's ID to remove
	 */
	removeFunction(id: string): void {
		this.functions = this.functions.filter((f) => f.id !== id);
		this.pinnedLabels = clearLabelsOf(this.pinnedLabels, id);
	}

	/**
	 * Apply a click on a term: pin its decimal value — the hover already shows
	 * the exact one — then flip back to exact, then remove the label.
	 *
	 * @param target - Sequence and rank that was clicked
	 */
	togglePinnedLabel(target: PinnedLabelTarget): void {
		this.pinnedLabels = cyclePinnedLabels(this.pinnedLabels, target);
	}

	/** Remove every label, for instance when the graph is cleared. */
	clearPinnedLabels(): void {
		this.pinnedLabels = [];
	}

	/**
	 * Clear all functions
	 */
	clearFunctions(): void {
		this.functions = [];
		this.pinnedLabels = [];
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
	}

	/**
	 * Reset viewport to default (-10 to 10 on both axes)
	 */
	resetViewport(): void {
		this.viewport = { ...DEFAULT_VIEWPORT };
	}

	/**
	 * Set viewport directly
	 *
	 * @param viewport - The new viewport bounds
	 */
	setViewport(viewport: Viewport): void {
		this.viewport = viewport;
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
	}
}

export { GrapheurStore };
