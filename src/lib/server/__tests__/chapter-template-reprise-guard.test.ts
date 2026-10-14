/**
 * Garde « déployé d'abord » de la reprise des modèles (ADR 0029, étape 4)
 * =======================================================================
 *
 * En production, la reprise n'écrit rien tant que `origin/production` ne contient pas
 * le merge de #1390 (le code qui sait lire les lignes de lien). La décision est une
 * fonction pure du résultat des deux commandes git : `git fetch origin production`,
 * puis `git merge-base --is-ancestor <commit> origin/production` (0 = contenu,
 * 1 = absent, autre = panne).
 */
import { describe, it, expect } from 'vitest';
import { DEPLOY_COMMIT, deployGuardDecision } from '$lib/server/chapter-template-reprise-guard';

describe('deployGuardDecision', () => {
	it('autorise quand origin/production contient le merge de #1390', () => {
		expect(deployGuardDecision({ fetchStatus: 0, ancestorStatus: 0 })).toEqual({ ok: true });
	});

	it('refuse, en disant de déployer d’abord, quand le merge est absent', () => {
		const d = deployGuardDecision({ fetchStatus: 0, ancestorStatus: 1 });
		expect(d.ok).toBe(false);
		if (!d.ok) {
			expect(d.message).toContain(DEPLOY_COMMIT);
			expect(d.message).toMatch(/deploy:prod/);
		}
	});

	it('refuse quand le fetch échoue : on ne sait pas ce qui est déployé', () => {
		const d = deployGuardDecision({ fetchStatus: 128, ancestorStatus: 0 });
		expect(d.ok).toBe(false);
		if (!d.ok) expect(d.message).toMatch(/fetch/);
	});

	it('refuse quand la comparaison git est en panne (commit inconnu, statut absent)', () => {
		for (const ancestorStatus of [128, null]) {
			const d = deployGuardDecision({ fetchStatus: 0, ancestorStatus });
			expect(d.ok).toBe(false);
			if (!d.ok) expect(d.message).toMatch(/impossible/);
		}
	});

	it('vise le merge de #1390', () => {
		expect(DEPLOY_COMMIT).toBe('5f5e787e9');
	});
});
