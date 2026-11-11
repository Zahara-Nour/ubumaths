import { describe, expect, it } from 'vitest';
import { welcomeEmailState } from '../welcome-email-state';

describe('welcomeEmailState', () => {
	it('enfant inscrit par son parent : lien vers les consentements, jamais d’envoi', () => {
		expect(
			welcomeEmailState({ email: 'camille507@eleves.chiph.re', welcomeEmailSentAt: null })
		).toEqual({ kind: 'parent-link', loginId: 'camille507' });
	});

	it('élève à adresse réelle, rien envoyé : envoi possible', () => {
		expect(welcomeEmailState({ email: 'eleve@example.com', welcomeEmailSentAt: null })).toEqual({
			kind: 'send'
		});
	});

	it('déjà envoyé : la date', () => {
		expect(
			welcomeEmailState({ email: 'eleve@example.com', welcomeEmailSentAt: '2026-11-01T10:00:00Z' })
		).toEqual({ kind: 'sent', sentAt: '2026-11-01T10:00:00Z' });
	});

	it('sans adresse : adresse requise', () => {
		expect(welcomeEmailState({ email: null, welcomeEmailSentAt: null })).toEqual({
			kind: 'no-email'
		});
	});
});
