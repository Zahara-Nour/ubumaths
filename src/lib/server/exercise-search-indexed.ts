/**
 * « Afficher sur Google » — cohérence de `exercises.search_indexed`
 *
 * Un exercice public n'apparaît sur Google (sitemap, pas de balise noindex)
 * que si son auteur coche une case distincte. La base refuse un exercice privé
 * affiché sur Google : contrainte `exercises_search_indexed_requires_public`,
 * code Postgres 23514.
 *
 * Toute écriture qui peut rendre un exercice privé doit donc écrire aussi
 * `search_indexed: false` dans la même requête, sinon elle échoue dès que la
 * case était cochée (dépublier, restaurer, importer).
 *
 * @module lib/server/exercise-search-indexed
 */

/** Code Postgres d'une violation de contrainte CHECK. */
const CHECK_VIOLATION = '23514';

/** Nom de la contrainte : d'autres CHECK de la table rendent le même code. */
const CONSTRAINT_NAME = 'exercises_search_indexed_requires_public';

/** Message montré au professeur quand il demande « privé + Google ». */
export const SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE =
	'Seul un exercice public peut être affiché sur Google. Cochez d’abord « publique ».';

/** Demande incohérente : afficher sur Google un exercice privé. */
export class SearchIndexedRequiresPublicError extends Error {
	constructor() {
		super(SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
		this.name = 'SearchIndexedRequiresPublicError';
	}
}

/**
 * Valeur de `search_indexed` à écrire avec `is_public` : vraie seulement si
 * l'exercice est public ET que la case est explicitement cochée. Sert aux
 * écritures qui recopient une ligne venue d'ailleurs (restauration, import) :
 * une valeur absente ou incohérente devient `false`, jamais `true`.
 */
export function consistentSearchIndexed(isPublic: unknown, searchIndexed: unknown): boolean {
	return isPublic === true && searchIndexed === true;
}

/** L'erreur vient-elle de la contrainte « privé + Google » de la base ? */
export function isSearchIndexedViolation(error: unknown): boolean {
	if (error instanceof SearchIndexedRequiresPublicError) return true;
	if (typeof error !== 'object' || error === null) return false;
	const { code, message } = error as { code?: unknown; message?: unknown };
	return (
		code === CHECK_VIOLATION && typeof message === 'string' && message.includes(CONSTRAINT_NAME)
	);
}
