/**
 * Master registry of construction choreographies.
 *
 * Maps `builtin → contrainte → list of voies`. Selected at runtime by the
 * `ConstructionExecutor` via `resolveDecorators` (see `resolve.ts`).
 *
 * Adding a new builtin to the registry :
 *   1. Create `<builtin>.ts` exposing `VOIES_<BUILTIN>_<CONTRAINTE>`.
 *   2. Reference it below.
 *   3. Add documentation source/description to each voie.
 *   4. Implement the `choreography` function (Phase 4 work).
 *
 * Adding a new constraint to an existing builtin :
 *   1. Add a new `VOIES_<BUILTIN>_<CONSTRAINT>` export.
 *   2. Reference it in the same row below.
 *
 * Auto-generated docs : `pnpm tsx scripts/generate-construction-docs.ts`
 * reads this registry and produces `docs/ref/geometry/methodes-de-construction.md`.
 */

import type { ChoreographyRegistry } from './types';
import { VOIES_MEDIATRICE_EUCLIDE } from './mediatrice';
import { VOIES_BISSECTRICE_EUCLIDE } from './bissectrice';
import { VOIES_PARALLELE_EUCLIDE } from './parallele';
import { VOIES_PERPENDICULAIRE_EUCLIDE, VOIES_PERPENDICULAIRE_EQUERRE } from './perpendiculaire';
import { VOIES_CERCLE_CIRCONSCRIT_EUCLIDE } from './cercle_circonscrit';
import { VOIES_TRANSPORTE_EUCLIDE } from './transporte';

export const REGISTRY: ChoreographyRegistry = {
	mediatrice: {
		direct: undefined,
		euclide: VOIES_MEDIATRICE_EUCLIDE,
		equerre: undefined,
		mesure: undefined
	},
	bissectrice: {
		direct: undefined,
		euclide: VOIES_BISSECTRICE_EUCLIDE,
		equerre: undefined,
		mesure: undefined
	},
	parallele: {
		direct: undefined,
		euclide: VOIES_PARALLELE_EUCLIDE,
		equerre: undefined,
		mesure: undefined
	},
	perpendiculaire: {
		direct: undefined,
		euclide: VOIES_PERPENDICULAIRE_EUCLIDE,
		equerre: VOIES_PERPENDICULAIRE_EQUERRE,
		mesure: undefined
	},
	cercle_circonscrit: {
		direct: undefined,
		euclide: VOIES_CERCLE_CIRCONSCRIT_EUCLIDE,
		equerre: undefined,
		mesure: undefined
	},
	transporte: {
		direct: undefined,
		euclide: VOIES_TRANSPORTE_EUCLIDE,
		equerre: undefined,
		mesure: undefined
	}
};

/** List of builtins that have at least one declared choreography (any constraint). */
export const CHOREOGRAPHED_BUILTINS: ReadonlySet<string> = new Set(Object.keys(REGISTRY));
