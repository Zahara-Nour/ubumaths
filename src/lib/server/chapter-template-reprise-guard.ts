/**
 * Garde « déployé d'abord » de la reprise des modèles (ADR 0029, étape 4)
 * =======================================================================
 *
 * La reprise crée des lignes de lien. L'ancien code de production ne sait pas les
 * lire : `deleteDocument` supprimerait le fichier d'une ligne de lien, et
 * `/api/documents/[id]` lirait le stockage avec les droits de l'élève, qui n'en a
 * aucun sous `templates/…`. Écrire en production n'est donc permis que lorsque
 * `origin/production` contient le merge de #1390 (serveur et interface du lien).
 *
 * Fonction PURE : le script exécute les deux commandes git et passe leurs codes
 * de sortie ; la décision se teste sans git.
 *
 * @module server/chapter-template-reprise-guard
 */

// Types
/** Codes de sortie de `git fetch origin production` et de `git merge-base --is-ancestor`. */
export interface DeployGitCheck {
	fetchStatus: number;
	/** 0 = contenu, 1 = absent, autre ou `null` = panne de git. */
	ancestorStatus: number | null;
}

export type DeployGuardDecision = { ok: true } | { ok: false; message: string };

// Constantes
/** Le merge de #1390 (feat/modeles-serveur) : le code qui sait lire les lignes de lien. */
export const DEPLOY_COMMIT = '5f5e787e9';

// Functions

/** Écrire en production est-il permis ? Sinon, pourquoi, en français. */
export function deployGuardDecision(check: DeployGitCheck): DeployGuardDecision {
	if (check.fetchStatus !== 0) {
		return {
			ok: false,
			message:
				`git fetch origin production a échoué (code ${check.fetchStatus}) : ` +
				'impossible de savoir ce qui est déployé. Rien n’est écrit.'
		};
	}
	if (check.ancestorStatus === 0) return { ok: true };
	if (check.ancestorStatus === 1) {
		return {
			ok: false,
			message:
				`origin/production ne contient pas ${DEPLOY_COMMIT} (merge de #1390) : le code ` +
				'qui lit les lignes de lien n’est pas en production. Lancer `pnpm deploy:prod` ' +
				'd’abord (sur demande de David), puis la reprise. Rien n’est écrit.'
		};
	}
	return {
		ok: false,
		message:
			`Vérification git impossible (git merge-base, code ${check.ancestorStatus ?? 'absent'}) : ` +
			`commit ${DEPLOY_COMMIT} inconnu ? Rien n’est écrit.`
	};
}
