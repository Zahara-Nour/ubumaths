/**
 * Resource kinds — the vocabulary alone.
 * ======================================
 *
 * Split out of `registry.ts` on purpose: the registry pulls in Lucide icons and
 * SvelteKit's `$app/paths`, which have no business in a server-side Zod schema or
 * in a plain-node script. Anything that only needs to know *which kinds exist*
 * imports this file; only code that needs a URL or an icon imports the registry.
 *
 * @module resources/kinds
 */

/**
 * Resource kinds that can be referenced from anywhere in the app.
 *
 * Deliberately limited to the kinds actually referenced today — they are exactly
 * the ones the cahier de texte already links to. Adding a kind is a line here
 * plus its routes in the registry; the cost lives in what gets wired behind it
 * (picker, search, tags), not in the list.
 */
export const RESOURCE_KINDS = [
	'exercise',
	// La FICHE d'exercices elle-même. Citée seule, c'est un lien vers la fiche
	// (pour la télécharger, par exemple) et elle n'apporte AUCUN point de
	// programme : rien ne dit lesquels de ses exercices ont été faits.
	'worksheet',
	// Un exercice DANS une fiche. Son identifiant est celui de la jonction
	// `worksheet_exercises`, pas celui de l'exercice : c'est ce qui permet de
	// citer « exercice 3 de la fiche Dérivées » et de retrouver ensuite la fiche
	// (pour le lien) comme l'exercice (pour la couverture du programme).
	//
	// ⚠️ Absent du CATALOGUE de recherche (migration 20260909020000) : on cherche
	// la fiche, puis on désigne l'exercice par son numéro. Il reste un type de
	// référence de plein droit — les liens déjà écrits fonctionnent.
	'worksheet_exercise',
	'question',
	'assessment',
	'chapter',
	'python_exercise',
	'python_notebook',
	'construction',
	'document'
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/**
 * Type guard for untrusted input (parsed markdown, query params, DB rows).
 */
export function isResourceKind(value: unknown): value is ResourceKind {
	return typeof value === 'string' && (RESOURCE_KINDS as readonly string[]).includes(value);
}
