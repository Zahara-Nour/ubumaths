/**
 * Lecture de TOUTES les lignes d'une requête Supabase, page par page.
 *
 * PostgREST plafonne une lecture à 1000 lignes (`max_rows`) et tronque
 * en silence, sans erreur. Toute lecture « de tout » sans filtre borné
 * passe par ici.
 *
 * La requête doit avoir un tri stable (terminer par `.order('id')`) :
 * sans lui, une ligne peut sauter ou être lue deux fois d'une page à l'autre.
 *
 * Arrêt sur une page VIDE, pas sur une page courte : si `max_rows` descendait
 * sous la taille demandée, une page courte ne serait pas la dernière, et l'on
 * retomberait en silence dans la troncature. Le prix : une requête de plus.
 */

// Types

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// Constantes

/** Égale au plafond `max_rows` de PostgREST */
export const READ_ALL_PAGE_SIZE = 1000;

// Functions

/**
 * @param read rend la page [from, to] (bornes incluses, celles de `.range()`)
 * @param what complément du message d'erreur (« lecture <what> impossible »)
 * @throws si une page échoue : jamais de liste partielle
 */
export async function readAllRows<T>(
	read: (from: number, to: number) => PageResult<T>,
	what: string
): Promise<T[]> {
	const rows: T[] = [];
	for (;;) {
		// La page suivante commence après la dernière ligne REÇUE, pas demandée
		const from = rows.length;
		const { data, error } = await read(from, from + READ_ALL_PAGE_SIZE - 1);
		if (error) throw new Error(`lecture ${what} impossible — ${error.message}`);
		if (!data || data.length === 0) return rows;
		rows.push(...data);
	}
}
