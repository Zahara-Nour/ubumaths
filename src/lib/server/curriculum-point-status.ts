/**
 * État d'un point du programme avant de le cocher ou de le taguer
 * ================================================================
 *
 * Seul un point non archivé se coche (journal) ou se tague (exercice) (B3). Depuis l'étape 4
 * de C5, tout point porte un nœud de l'arbre : il n'y a plus d'ancienne génération à écarter.
 */

/**
 * État d'un point avant de le cocher ou de le taguer : un point archivé est refusé par l'API.
 * `introuvable` : absent, ou illisible.
 */
export async function readPointStatus(
	supabase: App.Locals['supabase'],
	pointId: string
): Promise<'programme' | 'archive' | 'introuvable'> {
	const { data, error } = await supabase
		.from('curriculum_points')
		.select('id, archived_at')
		.eq('id', pointId)
		.maybeSingle();
	if (error) throw new Error(`Point illisible : ${error.message}`);
	if (!data) return 'introuvable';
	return data.archived_at === null ? 'programme' : 'archive';
}

/** Taille d'un lot : les identifiants passent dans l'URL de la lecture. */
const ID_BATCH = 100;

/** Parmi ces identifiants, ceux des points lisibles non archivés : les seuls qu'on coche. */
export async function keepCheckablePointIds(
	supabase: App.Locals['supabase'],
	pointIds: string[]
): Promise<string[]> {
	const cochables = new Set<string>();
	for (let i = 0; i < pointIds.length; i += ID_BATCH) {
		const { data, error } = await supabase
			.from('curriculum_points')
			.select('id, archived_at')
			.in('id', pointIds.slice(i, i + ID_BATCH));
		if (error) throw new Error(`Points illisibles : ${error.message}`);
		for (const p of data ?? []) {
			if (p.archived_at === null) cochables.add(p.id);
		}
	}
	return pointIds.filter((id) => cochables.has(id));
}
