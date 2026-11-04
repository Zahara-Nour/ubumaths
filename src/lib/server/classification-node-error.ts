/**
 * Refus de la base sur le nœud où se range un modèle
 * ===================================================
 *
 * Le trigger de rangement (migration `arbre_des_notions`) refuse une branche ou
 * un nœud archivé (`check_violation`, 23514) ; la clé étrangère refuse un nœud
 * inexistant (23503). Ce sont des fautes de saisie : 400 avec un message clair,
 * jamais 500. Le trigger des tags de points (23514 aussi) explique en français
 * pourquoi un nouveau rangement est refusé : son message est repris tel quel.
 */

const CHECK_VIOLATION = '23514';
const FOREIGN_KEY_VIOLATION = '23503';

/** Colonne portée par la clé étrangère du rangement */
const NODE_COLUMN = 'classification_node_id';

/**
 * Message en français pour une erreur de rangement, ou `null` si l'erreur n'en
 * est pas une (à traiter comme une panne).
 */
export function classificationNodeErrorMessage(err: {
	code?: string;
	message?: string;
	details?: string | null;
}): string | null {
	if (err.code === FOREIGN_KEY_VIOLATION) {
		const concerned = `${err.message ?? ''} ${err.details ?? ''}`.includes(NODE_COLUMN);
		return concerned ? "Ce nœud n'existe pas dans l'arbre des notions." : null;
	}
	if (err.code === CHECK_VIOLATION) {
		const message = err.message ?? '';
		if (message.includes('pas dans une branche')) {
			return 'Un modèle se range dans une notion ou une sous-notion, pas dans une branche.';
		}
		if (message.includes('nœud archivé')) {
			return 'Un modèle ne se range pas dans un nœud archivé.';
		}
		return message || 'Rangement refusé par la base.';
	}
	return null;
}
