import { describe, expect, it } from 'vitest';
import {
	getChildPasswordResetEmailHtml,
	getChildPasswordResetEmailText,
	getChildPasswordResetLink,
	getChildPasswordResetSubject,
	type ChildPasswordResetEmailData
} from '../child-password-reset';

const DATA: ChildPasswordResetEmailData = {
	childFirstname: 'Noélie',
	loginId: 'noelie42',
	userId: '22222222-2222-4222-8222-222222222222',
	token: 'abc123_def-456'
};

describe('courriel au parent : nouveau mot de passe pour son enfant', () => {
	it('le lien mène à la page du parent, compte et jeton dans l’adresse', () => {
		expect(getChildPasswordResetLink(DATA.userId, DATA.token)).toBe(
			'https://www.chiph.re/auth/reset-password/parent?u=22222222-2222-4222-8222-222222222222&t=abc123_def-456'
		);
	});

	it('donne le prénom, l’identifiant, le lien et sa durée, dans les deux versions', () => {
		const lien = '/auth/reset-password/parent?u=22222222-2222-4222-8222-222222222222';
		const versions = [
			// Texte brut : le lien tel quel ; HTML : `&` échappé dans l'attribut.
			{ body: getChildPasswordResetEmailText(DATA), lien: `${lien}&t=abc123_def-456` },
			{ body: getChildPasswordResetEmailHtml(DATA), lien: `${lien}&amp;t=abc123_def-456` }
		];
		for (const { body, lien: attendu } of versions) {
			expect(body).toContain('Noélie');
			expect(body).toContain('noelie42');
			expect(body).toContain(attendu);
			expect(body).toContain('1 heure');
		}
		expect(getChildPasswordResetSubject(DATA)).toBe('Nouveau mot de passe pour Noélie sur Chiphre');
	});

	it('échappe le prénom dans la version HTML', () => {
		const html = getChildPasswordResetEmailHtml({ ...DATA, childFirstname: '<b>x</b>' });
		expect(html).not.toContain('<b>x</b>');
		expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
	});

	it('encode le jeton dans le lien', () => {
		expect(getChildPasswordResetLink('u', 'a&b"c')).toBe(
			'https://www.chiph.re/auth/reset-password/parent?u=u&t=a%26b%22c'
		);
	});
});
