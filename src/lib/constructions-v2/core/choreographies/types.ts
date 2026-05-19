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
 * Single animation step inside a choreography.
 *
 * Stays close to the existing `ConstructionExecutor` phase model
 * (instrument move + draw + pause). Phase 3 wires these to the executor's
 * `_stepPhases` machinery.
 */
export interface ChoreographyStep {
	/** Optional instrument to move/show during this step. */
	readonly instrument?: InstrumentType;
	/** Target position/rotation/radius of the instrument at end of move phase. */
	readonly instrumentTarget?: {
		readonly x?: number;
		readonly y?: number;
		readonly rotation?: number;
		readonly radius?: number;
	};
	/** Figure element id to draw progressively during the draw phase. */
	readonly draw?: string;
	/** Pause in ms after this step (≥ 0). */
	readonly pause?: number;
	/** Optional human-readable instruction shown alongside the step. */
	readonly instruction?: string;
}

/**
 * Categorisation of figure elements produced by a choreography. Drives the
 * final visibility pass (Phase 5).
 */
export interface ChoreographyProduced {
	/** id of the principal element returned by the builtin. */
	readonly principal: string;
	/** ids of semantic hinge elements (intersections, midpoints, support lines) — kept in @squelette and @complet. */
	readonly charnieres: readonly string[];
	/** ids of ephemeral construction traces (compass arcs, ghost lines) — hidden in @squelette, dashed-faded in @complet. */
	readonly traces: readonly string[];
}

/** Output of a `ChoreographyFn`. */
export interface ChoreographyResult {
	readonly steps: readonly ChoreographyStep[];
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
