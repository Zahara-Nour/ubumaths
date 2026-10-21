/**
 * Génération d'un point du programme — filtre de la bascule (C5)
 * ================================================================
 *
 * Un modèle porte encore deux sortes de tags : vers des points NEUFS (rattachés à un nœud de
 * l'arbre et à un programme) et vers des points d'ANCIENNE génération (rattachés à un objectif).
 * Depuis la bascule du code (étape 3 de C5), un lecteur qui compte ou affiche des tags ne
 * retient que les neufs ; les anciens restent en base jusqu'à leur suppression (étape 4), qui
 * rendra ce filtre inutile.
 */

/** Ce qu'un tag lit de son point pour en connaître la génération. */
export interface PointGeneration {
	node_id: string | null;
}

/**
 * Point de la génération neuve : il porte un nœud de l'arbre. Un point absent de la jointure
 * n'en est pas un — d'où l'obligation, pour l'appelant, de LIRE `node_id`.
 */
export function isProgrammePoint(point: PointGeneration | null | undefined): boolean {
	return typeof point?.node_id === 'string';
}

/**
 * Génération d'un point avant de le cocher ou de le taguer : un ancien point n'est plus
 * proposé par aucun écran, l'API le refuse aussi. `introuvable` : absent, ou illisible.
 */
export async function readPointGeneration(
	supabase: App.Locals['supabase'],
	pointId: string
): Promise<'programme' | 'ancien' | 'introuvable'> {
	const { data, error } = await supabase
		.from('curriculum_points')
		.select('id, node_id')
		.eq('id', pointId)
		.maybeSingle();
	if (error) throw new Error(`Point illisible : ${error.message}`);
	if (!data) return 'introuvable';
	return isProgrammePoint(data) ? 'programme' : 'ancien';
}

/** Taille d'un lot : les identifiants passent dans l'URL de la lecture. */
const ID_BATCH = 100;

/** Parmi ces identifiants, ceux des points neufs (les autres sont écartés). */
export async function keepProgrammePointIds(
	supabase: App.Locals['supabase'],
	pointIds: string[]
): Promise<string[]> {
	const neufs = new Set<string>();
	for (let i = 0; i < pointIds.length; i += ID_BATCH) {
		const { data, error } = await supabase
			.from('curriculum_points')
			.select('id, node_id')
			.in('id', pointIds.slice(i, i + ID_BATCH));
		if (error) throw new Error(`Points illisibles : ${error.message}`);
		for (const p of data ?? []) if (isProgrammePoint(p)) neufs.add(p.id);
	}
	return pointIds.filter((id) => neufs.has(id));
}
