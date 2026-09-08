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
	'question',
	'assessment',
	'chapter',
	'document',
	// Un exercice DANS une fiche. Son identifiant est celui de la jonction
	// `worksheet_exercises`, pas celui de l'exercice : c'est ce qui permet de
	// citer « exercice 3 de la fiche Dérivées » et de retrouver ensuite la fiche
	// (pour le lien) comme l'exercice (pour la couverture du programme).
	'worksheet_exercise'
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/**
 * Type guard for untrusted input (parsed markdown, query params, DB rows).
 */
export function isResourceKind(value: unknown): value is ResourceKind {
	return typeof value === 'string' && (RESOURCE_KINDS as readonly string[]).includes(value);
}
