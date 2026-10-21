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
