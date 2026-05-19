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
 */
export type SubStepKind = 'compass-draw' | 'ruler-trace' | 'point-fade-in' | 'line-fade-in';

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
	 * Ids of auxiliary elements that are purely structural for the choreography
	 * (e.g. hidden circles used as input to `createIntersectionCC` because the
	 * intersection helper does not accept arcs). Never made visible by any
	 * visibility mode.
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
 *   composes two mediatrice choreographies).
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
