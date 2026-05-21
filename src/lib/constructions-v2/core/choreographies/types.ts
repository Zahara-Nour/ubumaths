/**
 * Types for the construction choreography registry.
 *
 * A `Voie` (route) is a named way to construct a geometric figure under a
 * given constraint. The DSL decorator suffix selects which `Voie` to play.
 *
 * Example : `mediatrice(A, B) @euclide @arcs_egaux` triggers the
 * `mediatrice.euclide.arcs_egaux` voie which animates 2 equal compass arcs
 * + intersection + ruler.
 *
 * See `/Users/david/.claude/plans/reflective-munching-catmull.md` for the V1
 * design and `docs/wip/v1-choreographies-phase0-tdd.md` for the spec.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import type { InstrumentType } from '../../types';

/** Decorator categories. */
export type Contrainte = 'direct' | 'euclide' | 'equerre' | 'mesure';
export type Visibilite = 'epure' | 'squelette' | 'complet';

/** Set of well-known constraint names (for validation). */
export const CONTRAINTES = new Set<Contrainte>(['direct', 'euclide', 'equerre', 'mesure']);

/** Set of well-known visibility names (for validation). */
export const VISIBILITES = new Set<Visibilite>(['epure', 'squelette', 'complet']);

/**
 * Resolved decorator triple. Output of `resolveDecorators`. Drives the
 * `ConstructionExecutor` choice of choreography + final visibility.
 */
export interface DecoratorTriple {
	readonly contrainte: Contrainte;
	/** null = use the `defaut: true` voie of the registry for this (builtin, contrainte). */
	readonly methode: string | null;
	readonly visibilite: Visibilite;
}

/**
 * Discriminator for a sub-step animation. Selects which set of element ids is
 * animated by the canvas overlay (drawables, points, lines) and which
 * instrument set is shown.
 *
 * - `compass-measure` : pedagogical step where the compass takes a measure
 *   between two points (spike at the source, pencil reaching the target).
 *   No arc is drawn ; only the compass moves and opens. Typically inserted
 *   BEFORE a `compass-draw` sub-step to show "I measure |AB|, then I draw
 *   an arc of this radius at a different center".
 */
export type SubStepKind =
	| 'compass-measure'
	| 'compass-draw'
	| 'ruler-trace'
	| 'point-fade-in'
	| 'line-fade-in';

/**
 * A single sub-step of a decorated statement's choreography.
 *
 * One DSL statement decorated with `@euclide` expands into N sequential
 * sub-steps in the timeline ; each sub-step becomes one entry in
 * `executor.stepDurations` / `executor.stepPhases` (slider sees them as
 * individual step entries).
 *
 * The choreography returns the full list ; the executor injects each
 * sub-step's metadata into the animation pipeline at runtime.
 */
export interface SubStep {
	readonly kind: SubStepKind;
	/** Primary instrument shown during this sub-step (compass, ruler). */
	readonly instrument?: InstrumentType;
	/** Secondary instrument (typically `pencil` when the primary is `ruler`). */
	readonly secondaryInstrument?: InstrumentType;
	/** Target position of the primary instrument at end of move phase (math units). */
	readonly instrumentTarget?: {
		readonly x: number;
		readonly y: number;
		readonly rotation: number;
	};
	/**
	 * Compass-specific : radius in math units for the opening animation.
	 * Required for `compass-draw` sub-steps. Used by the canvas to interpolate
	 * the compass opening when moving between sub-steps with different radii.
	 */
	readonly compassRadius?: number;
	/**
	 * Geometric distance used to scale the draw phase duration (in math units).
	 * - `compass-draw` : arc length (= radius × sweep in radians).
	 * - `ruler-trace` : segment length between the 2 endpoints.
	 * - `point-fade-in` / `line-fade-in` : 0 (uses DEFAULT_STEP_DURATION).
	 */
	readonly geometricDistance: number;
	/** Figure ids of drawables (segment, arc, circle) to animate progressively. */
	readonly animateDrawableIds: readonly string[];
	/** Figure ids of points to animate with fade-in + bump. */
	readonly animatePointIds: readonly string[];
	/** Figure ids of lines/rays to animate with fade-in. */
	readonly animateLineIds: readonly string[];
	/** Optional human-readable instruction shown alongside this sub-step. */
	readonly instruction?: string;
}

/**
 * Pedagogical category of a trace element. Used by the visibility module
 * (via `traceTags` in `ChoreographyProduced`) to support fine-grained
 * selection of which traces to show in `@complet` and related profiles.
 *
 * - `arc` : a circle/arc drawn by the compass instrument (shows the
 *   « compass gesture »).
 * - `segment-trace` : a segment drawn by the pencil along a ruler/equerre
 *   edge (shows the « trace gesture »).
 * - `marker` : a `GeoAngle` rendered with `marque: 'carre'` (or similar)
 *   highlighting a geometric property like perpendicularity.
 * - `auxiliary-point` : a construction helper point that's not a
 *   pedagogical charnière (e.g. `A*`, `B*`, `B'`, intermediate `F`).
 *
 * Tags are optional ; untagged traces are treated as generic by the
 * visibility module (always shown in `@complet`).
 */
export type TraceTag = 'arc' | 'segment-trace' | 'marker' | 'auxiliary-point';

/**
 * Categorisation of figure elements produced by a choreography. Drives the
 * final visibility pass (Phase C / applyFinalVisibility).
 */
export interface ChoreographyProduced {
	/** id of the principal element returned by the builtin. */
	readonly principal: string;
	/** ids of semantic hinge elements (intersections, midpoints, support lines) — kept in @squelette and @complet. */
	readonly charnieres: readonly string[];
	/** ids of ephemeral construction traces (compass arcs, ghost lines) — hidden in @squelette, dashed-faded in @complet. */
	readonly traces: readonly string[];
	/**
	 * Optional per-trace pedagogical category. When present, lets the
	 * visibility module filter `traces` by tag (e.g. show arcs but hide
	 * segment-traces). Traces not present in this map are treated as
	 * untagged (always shown in `@complet`).
	 */
	readonly traceTags?: ReadonlyMap<string, TraceTag>;
	/**
	 * Ids of auxiliary elements that should NEVER be visible after the
	 * animation, regardless of visibility mode. Two common subcategories :
	 *
	 * - **Structural plumbing** : elements needed by the geometry-core API
	 *   but with no pedagogical value (e.g. hidden circles fed to
	 *   `createIntersectionCC` because the helper does not accept arcs ;
	 *   scalar expressions driving reactive coordinates).
	 *
	 * - **Animation-only traces** : visible during the ruler/compass gesture
	 *   but redundant once the principal element is revealed (e.g. a
	 *   segment-trace that visually duplicates the final line).
	 *
	 * In contrast, `traces` is for elements WORTH keeping in `@complet`
	 * (e.g. compass arcs that show the construction gesture).
	 */
	readonly hiddenSupport?: readonly string[];
}

/** Output of a `ChoreographyFn`. */
export interface ChoreographyResult {
	readonly subSteps: readonly SubStep[];
	readonly produced: ChoreographyProduced;
}

/**
 * Context passed to a `ChoreographyFn`.
 *
 * - `figure` : the live figure being built. Builtin has already run, so the
 *   principal element exists. The choreography may create additional hidden
 *   elements to support the animation (charnières / traces).
 * - `args` : resolved positional args of the builtin invocation.
 * - `principalId` : the id of the element the builtin returned.
 * - `visibilite` : the resolved visibility (used by composed choreographies
 *   to propagate intent to sub-choreographies).
 * - `sub` : helper to dispatch to a sub-choreography (e.g. cercle_circonscrit
 *   composes two mediatrice choreographies). The caller must :
 *     1. Create the sub-principal element manually (via figure factory
 *        calls) — `sub` does NOT invoke the builtin handler.
 *     2. Pass that element's id as `subPrincipalId`.
 *     3. Provide the args (typically the same point ids as the parent
 *        scenario, e.g. `{ids: [A, B], coords: [...]}` for a mediatrice
 *        sub of cercle_circonscrit).
 *     4. Provide the decorator triple to select the sub-voie + visibility.
 *   Returns the sub-choreography's `ChoreographyResult` (subSteps + produced),
 *   which the parent can splice into its own subSteps and re-classify into
 *   its own `produced` (charnières / traces / hiddenSupport).
 */
export interface ChoreographyCtx {
	readonly figure: Figure;
	readonly args: {
		readonly ids: readonly string[];
		readonly coords: readonly { readonly x: number; readonly y: number }[];
		readonly named?: ReadonlyMap<string, unknown>;
	};
	readonly principalId: string;
	readonly visibilite: Visibilite;
	readonly sub: (
		builtin: string,
		args: ChoreographyCtx['args'],
		subPrincipalId: string,
		decorators: DecoratorTriple
	) => ChoreographyResult;
}

/** A choreography function builds animation steps + classifies produced elements. */
export type ChoreographyFn = (ctx: ChoreographyCtx) => ChoreographyResult;

/**
 * A `Voie` is one named way to construct a figure under one constraint.
 *
 * Multiple Voies may share the same `(builtin, contrainte)` ; exactly one
 * has `defaut: true` and is selected when the user omits the method
 * decorator.
 */
export interface Voie {
	readonly id: string;
	readonly nom_humain: string;
	readonly source: string;
	readonly description: string;
	readonly defaut: boolean;
	readonly choreography: ChoreographyFn;
}

/** Full registry shape : builtin → contrainte → list of voies. */
export type ChoreographyRegistry = Readonly<
	Record<string, Readonly<Record<Contrainte, readonly Voie[] | undefined>>>
>;
