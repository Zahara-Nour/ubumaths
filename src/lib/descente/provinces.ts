/**
 * La Descente de la Vistule — Province de chaque branche du programme
 * ===================================================================
 *
 * Une Bête est sensible à la Province de la notion à travailler : celle de la
 * BRANCHE de son point (arbre des notions : branche → notion → sous-notion).
 * Correspondance validée par David le 2026-11-18 (docs/wip/navadra-progress.md,
 * phase 0 de l'étape 2, question A). Compendium § II pour les six Provinces.
 *
 * La clé est le NOM de la branche, tel qu'en base : les 19 branches n'ont ni code
 * ni identifiant stable entre bases. Une branche inconnue (renommée, ajoutée) ne
 * fait naître aucune Bête : `provinceOfBranch` rend `null` et l'appelant le trace.
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';

export const BRANCH_PROVINCES: Readonly<Record<string, ProvinceId>> = {
	'Nombres et calculs': 'nombrilie',
	Arithmétique: 'nombrilie',
	'Nombres complexes': 'nombrilie',
	Proportionnalité: 'nombrilie',
	Algèbre: 'nombrilie',
	Géométrie: 'bedonstan',
	'Grandeurs et mesures': 'bedonstan',
	Fonctions: 'yoyolande',
	Suites: 'yoyolande',
	Intégration: 'yoyolande',
	'Équations différentielles': 'yoyolande',
	Probabilités: 'pifometrie',
	Dénombrement: 'pifometrie',
	Statistiques: 'pifometrie',
	Algorithmique: 'glitchistan',
	Graphes: 'glitchistan',
	Matrices: 'glitchistan',
	Logique: 'patatovie',
	Ensembles: 'patatovie'
};

/** Province d'une branche, par son nom ; `null` pour une branche inconnue. */
export function provinceOfBranch(branchName: string): ProvinceId | null {
	return Object.hasOwn(BRANCH_PROVINCES, branchName) ? BRANCH_PROVINCES[branchName] : null;
}
