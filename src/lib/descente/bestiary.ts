/**
 * La Descente de la Vistule — bestiaire
 * =====================================
 *
 * ⚠️ PROVISOIRE (choix de David du 2026-11-18, question D de la phase 0 de
 * l'étape 2) : trois Bêtes par Province, de quoi coder et tester l'apparition.
 * Les vraies fiches (nom, allure, caractère) sont écrites et validées avant
 * l'étape 4, donc avant qu'un élève voie une Bête. Aucune page n'appelle encore
 * l'apparition : ces clés n'atteignent pas la base de prod d'ici là.
 *
 * La base ne garde que la clé (`student_beasts.beast_key` : minuscules, chiffres,
 * tirets, 40 caractères au plus) ; le nom et l'allure vivent ici.
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';

export interface BeastEntry {
	/** Clé en base : jamais changée une fois qu'un élève l'a rencontrée */
	key: string;
	/** Nom affiché (et libellé du journal des gidouilles) */
	name: string;
}

export const BESTIARY: Readonly<Record<ProvinceId, readonly BeastEntry[]>> = {
	nombrilie: [
		{ key: 'nombrilie-1', name: 'Bête de Nombrilie n° 1' },
		{ key: 'nombrilie-2', name: 'Bête de Nombrilie n° 2' },
		{ key: 'nombrilie-3', name: 'Bête de Nombrilie n° 3' }
	],
	bedonstan: [
		{ key: 'bedonstan-1', name: 'Bête de Bedonstan n° 1' },
		{ key: 'bedonstan-2', name: 'Bête de Bedonstan n° 2' },
		{ key: 'bedonstan-3', name: 'Bête de Bedonstan n° 3' }
	],
	yoyolande: [
		{ key: 'yoyolande-1', name: 'Bête de Yoyolande n° 1' },
		{ key: 'yoyolande-2', name: 'Bête de Yoyolande n° 2' },
		{ key: 'yoyolande-3', name: 'Bête de Yoyolande n° 3' }
	],
	pifometrie: [
		{ key: 'pifometrie-1', name: 'Bête de Pifométrie n° 1' },
		{ key: 'pifometrie-2', name: 'Bête de Pifométrie n° 2' },
		{ key: 'pifometrie-3', name: 'Bête de Pifométrie n° 3' }
	],
	glitchistan: [
		{ key: 'glitchistan-1', name: 'Bête de Glitchistan n° 1' },
		{ key: 'glitchistan-2', name: 'Bête de Glitchistan n° 2' },
		{ key: 'glitchistan-3', name: 'Bête de Glitchistan n° 3' }
	],
	patatovie: [
		{ key: 'patatovie-1', name: 'Bête de Patatovie n° 1' },
		{ key: 'patatovie-2', name: 'Bête de Patatovie n° 2' },
		{ key: 'patatovie-3', name: 'Bête de Patatovie n° 3' }
	]
};
