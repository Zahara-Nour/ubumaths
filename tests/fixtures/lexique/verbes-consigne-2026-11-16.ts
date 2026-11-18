/**
 * Verbes de consigne « jamais soulignés » : copie figée des 10 entrées passées à
 * `auto_link = false` le 2026-11-16 (validées par David, chantier mots-cliquables, R5),
 * par la migration 20261116205041_dictionnaire_verbes_consigne_jamais_soulignes.
 *
 * Le jeu de référence est figé (docs/systeme/dictionnaire.md, « Comment étendre ») : les
 * tests qui comparent la base à REFERENCE_DICTIONARY appliquent ce changement par
 * `withConsigneVerbs`.
 */

import type { MathTerm } from '#lib/dictionary/model.ts';

export const CONSIGNE_VERBS_2026_11_16: readonly string[] = [
	'calculer',
	'comparer',
	'vérifier',
	'déterminer',
	'ordonner',
	'représenter',
	'tracer',
	'décomposer',
	'convertir',
	'justifier'
];

/** Les entrées attendues après la migration : les 10 verbes (sans sens) jamais soulignés. */
export function withConsigneVerbs(entries: readonly MathTerm[]): MathTerm[] {
	return entries.map((entry) =>
		entry.sense === undefined && CONSIGNE_VERBS_2026_11_16.includes(entry.term)
			? { ...entry, autoLink: false }
			: entry
	);
}
