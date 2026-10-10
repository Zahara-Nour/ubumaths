/**
 * `shared` d'un modèle publié : seul l'ajout de `cleanCoefficients: true` s'écrit
 * ===============================================================================
 *
 * Utilisé par `update-published-questions.ts`. `shared` porte les variables et conditions
 * communes à toutes les variations : un écart y change chaque tirage, d'où l'arrêt
 * historique du script. L'option `cleanCoefficients` (docs/pratiques/fiches-exercices.md) vit
 * pourtant dans `shared` : son AJOUT est accepté, et rien d'autre. La valeur écrite est
 * reconstruite depuis la BASE (`{ ...base, cleanCoefficients: true }`), jamais copiée du
 * fichier.
 */

// Types

export type DecisionShared = 'identique' | { valeur: Record<string, unknown> } | { refus: string };

// Fonctions

/** Sérialisation à clés triées (`jsonb` réordonne les clés) ; `null` ≡ absent ≡ `''` */
export function canonique(valeur: unknown): string {
	if (valeur === undefined || valeur === null || valeur === '') return 'null';
	return JSON.stringify(
		valeur,
		(_cle, v: unknown) =>
			v && typeof v === 'object' && !Array.isArray(v)
				? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
				: v,
		2
	);
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/** Objet vide ≡ absent (la base porte `null` ou `{}` selon l'histoire du modèle) */
function canoniqueObjet(valeur: Record<string, unknown>): string {
	return Object.keys(valeur).length === 0 ? 'null' : canonique(valeur);
}

/**
 * Compare le `shared` du fichier à celui de la base.
 * - identiques → `'identique'` (rien à écrire) ;
 * - seule différence : le fichier AJOUTE `cleanCoefficients: true` (absent de la base)
 *   → `{ valeur }`, le `shared` de la base complété de l'option ;
 * - tout autre écart → `{ refus }`.
 */
export function sharedAEcrire(base: unknown, fichier: unknown): DecisionShared {
	if (canonique(base) === canonique(fichier)) return 'identique';
	const baseObjet = base === undefined || base === null ? {} : base;
	if (!estObjet(baseObjet) || !estObjet(fichier)) {
		return { refus: '« shared » n’est pas un objet' };
	}
	if ('cleanCoefficients' in baseObjet) {
		return { refus: 'la base porte déjà « cleanCoefficients » : seul son ajout est écrit' };
	}
	if (fichier.cleanCoefficients !== true) {
		return { refus: 'seul l’ajout de « cleanCoefficients: true » est écrit' };
	}
	const { cleanCoefficients: _option, ...reste } = fichier;
	if (canoniqueObjet(reste) !== canoniqueObjet(baseObjet)) {
		return { refus: 'écart autre que l’ajout de « cleanCoefficients: true »' };
	}
	return { valeur: { ...baseObjet, cleanCoefficients: true } };
}
