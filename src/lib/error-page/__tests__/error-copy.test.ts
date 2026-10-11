import { describe, expect, it } from 'vitest';
import { describeError } from '../error-copy';

describe('describeError', () => {
	it('404 : page introuvable, sans action particulière', () => {
		expect(describeError(404, 'Not Found')).toMatchObject({
			title: 'Page introuvable',
			explanation: null,
			detail: null,
			offerLogin: false,
			offerRetry: false
		});
	});

	it('500 : ne dit plus « page introuvable », propose de réessayer', () => {
		const copy = describeError(500, 'Internal Error');

		expect(copy.title).toBe('Le serveur a trébuché');
		expect(copy.offerRetry).toBe(true);
		expect(copy.detail).toBeNull();
	});

	it('401 : propose de se connecter', () => {
		expect(describeError(401, 'Unauthorized')).toMatchObject({
			title: 'Connexion requise',
			offerLogin: true,
			detail: null
		});
	});

	it('un code sans texte propre retombe sur sa famille', () => {
		expect(describeError(418, undefined).title).toBe('Demande impossible');
		expect(describeError(502, undefined).title).toBe('Le serveur a trébuché');
	});

	it('garde le message précis de l’erreur', () => {
		expect(describeError(404, 'Exercice introuvable').detail).toBe('Exercice introuvable');
		expect(describeError(404, 'Ce lien est invalide ou a expiré').detail).toBe(
			'Ce lien est invalide ou a expiré'
		);
	});

	it('500 : le message précis (erreur brute de la base) passe sous « Détails techniques »', () => {
		const copy = describeError(500, 'Erreur de chargement : relation "objectives" does not exist');

		expect(copy.detail).toBeNull();
		expect(copy.technicalDetail).toContain('objectives');
	});

	it('401 : « Non autorisé - Authentification requise » répète le titre', () => {
		expect(describeError(401, 'Non autorisé - Authentification requise').detail).toBeNull();
	});

	it('masque un message qui répète le titre, sans casse ni accents', () => {
		expect(describeError(403, 'Acces refuse').detail).toBeNull();
		expect(describeError(403, 'Access denied').detail).toBeNull();
		expect(describeError(404, 'page introuvable !').detail).toBeNull();
		expect(describeError(404, '   ').detail).toBeNull();
	});
});
