/**
 * Découpage des listes `.in()` PostgREST
 * ======================================
 *
 * ⚠️ POURQUOI CE MODULE EXISTE
 *
 * PostgREST met **toute la liste** d'un `.in()` dans l'URL. Une liste qui
 * grossit avec les données finit donc par dépasser la limite de longueur d'une
 * ligne de requête HTTP — usuellement **8 Ko** côté nginx/Kong. Au-delà, ce
 * n'est pas une lenteur : c'est un **414 URI Too Long**, donc un écran cassé,
 * et qui ne casse que pour les classes ou les niveaux les plus fournis — donc
 * tard, et pour les utilisateurs les plus actifs.
 *
 * Mesuré en production le 2026-09-15 :
 *
 * | Niveau  | Points actifs | URL ≈        |
 * | ------- | ------------- | ------------ |
 * | 2ᵈᵉ     | 185           | 6 845 octets |
 * | 1ʳᵉ spé | 173           | 6 401 octets |
 * | 6ᵉ      | 95            | 3 515 octets |
 *
 * La 2ᵈᵉ est déjà à ~85 % du plafond, et les listes de **templates** sont pires :
 * elles grossissent avec l'usage d'une classe, sans borne.
 *
 * Les lots partent en **parallèle** : le découpage ne doit pas transformer un
 * aller-retour en file d'attente, sinon il échange une panne rare contre une
 * lenteur permanente.
 */

/**
 * Taille maximale d'une liste envoyée à `.in()`.
 *
 * 100 UUID ≈ 3,7 Ko d'URL : large marge sous la limite, tout en gardant le
 * nombre de requêtes bas (un lot pour la 6ᵉ, deux pour la 2ᵈᵉ).
 */
export const IN_CHUNK_SIZE = 100;

/** Découpe une liste en lots d'au plus `size` éléments. Liste vide → aucun lot. */
export function chunk<T>(items: T[], size: number = IN_CHUNK_SIZE): T[][] {
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		batches.push(items.slice(i, i + size));
	}
	return batches;
}

/**
 * Exécute une requête Supabase par lots d'identifiants et concatène les lignes.
 *
 * `runBatch` reçoit un lot et doit rendre le `{ data, error }` habituel de
 * PostgREST. Les lots partent en parallèle.
 *
 * ⚠️ **Tout ou rien.** Si un seul lot échoue, on rend l'erreur et **aucune**
 * donnée. Un résultat partiel serait pire qu'une erreur : l'appelant croirait
 * avoir tout lu, afficherait des compteurs faux, et rien ne le signalerait —
 * le même piège silencieux qu'une lecture refusée par la RLS.
 */
export async function fetchInChunks<Row, Err>(
	ids: string[],
	runBatch: (batch: string[]) => PromiseLike<{ data: Row[] | null; error: Err | null }>
): Promise<{ data: Row[]; error: Err | null }> {
	const batches = chunk(ids);
	if (batches.length === 0) return { data: [], error: null };

	// `batches.map(runBatch)` passerait aussi l'index et le tableau à `runBatch` —
	// un appelant avec un second paramètre optionnel le recevrait en silence.
	const results = await Promise.all(batches.map((batch) => runBatch(batch)));

	const failed = results.find((r) => r.error);
	if (failed?.error) return { data: [], error: failed.error };

	return { data: results.flatMap((r) => r.data ?? []), error: null };
}
