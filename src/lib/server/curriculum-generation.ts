/**
 * Génération d'un point du programme — filtre provisoire de la C5
 * ================================================================
 *
 * Depuis l'étape 2 de C5, un modèle porte deux sortes de tags : vers des points d'ANCIENNE
 * génération (rattachés à un objectif, `objective_id`) et vers des points NEUFS (rattachés à un
 * nœud de l'arbre et à un programme, sans objectif). Tant que le code lit l'ancien référentiel
 * (thème → objectif → point), un lecteur qui compte ou affiche des tags ne retient que les
 * anciens : un point neuf n'a ni thème ni objectif, il compterait sans avoir où s'afficher.
 *
 * Filtre provisoire jusqu'à la bascule du code (étape 3 de C5).
 */

/** Ce qu'un tag lit de son point pour en connaître la génération. */
export interface PointGeneration {
	objective_id: string | null;
}

/**
 * Point d'ancienne génération : il porte un objectif. Un point absent de la jointure n'en est
 * pas un — d'où l'obligation, pour l'appelant, de LIRE `objective_id`.
 */
export function isLegacyPoint(point: PointGeneration | null | undefined): boolean {
	return typeof point?.objective_id === 'string';
}
