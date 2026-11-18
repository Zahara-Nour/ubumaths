/**
 * La Descente de la Vistule — coups de la recrue
 * ==============================================
 *
 * Un coup par Province dès le premier jour, sans notion maîtrisée (phase 0 de
 * la v1, point 2). Le coup choisi donne la Province, donc le domaine de la
 * question. Les coups de départ ne sont pas écrits en base (étape 1).
 *
 * ⚠️ NOMS PROVISOIRES (phase 0 de l'étape 3, question F) : les vrais noms sont
 * écrits et validés avec les fiches du bestiaire, avant l'étape 4. Gagner
 * d'autres coups en maîtrisant une notion vient avec l'étape 5 (question G).
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';

// Types
export interface CombatMove {
	/** Clé stable (comme `student_combat_moves.move_key`) */
	key: string;
	province: ProvinceId;
	/** Nom affiché */
	name: string;
}

// Constantes
/** Ordre d'affichage des coups : celui du Tour du Royaume. */
export const STARTING_MOVES: readonly CombatMove[] = [
	{ key: 'coup-nombrilie', province: 'nombrilie', name: 'Coup de Nombrilie' },
	{ key: 'coup-bedonstan', province: 'bedonstan', name: 'Coup de Bedonstan' },
	{ key: 'coup-yoyolande', province: 'yoyolande', name: 'Coup de Yoyolande' },
	{ key: 'coup-pifometrie', province: 'pifometrie', name: 'Coup de Pifométrie' },
	{ key: 'coup-glitchistan', province: 'glitchistan', name: 'Coup de Glitchistan' },
	{ key: 'coup-patatovie', province: 'patatovie', name: 'Coup de Patatovie' }
];

export const PROVINCE_IDS: readonly ProvinceId[] = STARTING_MOVES.map((move) => move.province);

// Functions
export function isProvinceId(value: unknown): value is ProvinceId {
	return typeof value === 'string' && (PROVINCE_IDS as readonly string[]).includes(value);
}
