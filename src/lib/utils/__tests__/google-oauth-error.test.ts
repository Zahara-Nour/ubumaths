/**
 * Retour de Google en erreur : le message montré au prof.
 * ======================================================
 *
 * Le callback OAuth renvoie vers `/dashboard/teacher/settings/google?error=…`,
 * mais la page ne lisait que `?connected=true` : un refus ou une panne
 * revenait sans un mot.
 *
 * @module utils/google-oauth-error.test
 */

import { describe, it, expect } from 'vitest';
import { googleOAuthErrorMessage } from '../google-oauth-error';

describe('googleOAuthErrorMessage', () => {
	it('pas de paramètre → rien à dire', () => {
		expect(googleOAuthErrorMessage(null)).toBeNull();
		expect(googleOAuthErrorMessage('')).toBeNull();
	});

	it('refus de l’utilisateur chez Google → connexion annulée', () => {
		expect(googleOAuthErrorMessage('access_denied')).toBe('Connexion à Google annulée');
	});

	it('autre erreur → message d’échec qui la cite', () => {
		expect(googleOAuthErrorMessage('Jeton expiré')).toBe(
			'La connexion à Google a échoué : Jeton expiré'
		);
	});

	it('erreur démesurée → tronquée', () => {
		const message = googleOAuthErrorMessage('x'.repeat(1000));
		expect(message).not.toBeNull();
		expect(message!.length).toBeLessThanOrEqual(240);
	});
});
