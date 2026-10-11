import { describe, expect, it } from 'vitest';
import { describeError } from '../error-copy';

describe('describeError', () => {
	it('404 : page introuvable, sans action particulière', () => {
		expect(describeError(404, 'Not Found')).toMatchObject({
			title: 'Page introuvable',
			offerLogin: false,
			offerRetry: false
		});
	});

	it('500 : ne dit plus « page introuvable », propose de réessayer', () => {
		const copy = describeError(500, 'Internal Error');

		expect(copy.title).toBe('Le serveur a trébuché');
		expect(copy.offerRetry).toBe(true);
		expect(copy.technicalDetail).toBeNull();
	});

	it('401 : propose de se connecter, chute sur π', () => {
		expect(describeError(401, 'Unauthorized')).toMatchObject({
			title: 'Connexion requise',
			piVerb: 'se présente à la',
			piTwist: '\u00a0; ta page, elle, voudrait que tu en fasses autant',
			offerLogin: true
		});
	});

	// « Le nombre {code} {piVerb} Nᵉ décimale de π{piTwist}. »
	it.each([
		[400, 'est bien formé à la', '\u00a0; ta demande, elle, ne l’est pas'],
		[403, 'a été autorisé à s’installer à la', '\u00a0; toi, sur cette page, tu ne l’es pas'],
		[404, 'apparaît à la', ', mais la page, elle, reste introuvable'],
		[408, 'arrive dès la', '\u00a0; ta demande, elle, a mis trop de temps'],
		[410, 'a un bail éternel à la', '\u00a0; cette page, elle, a rendu les clés'],
		[429, 'a attendu jusqu’à la', '\u00a0; toi, quelques secondes suffiront'],
		[500, 'tient bon jusqu’à la', '\u00a0; le serveur, lui, a trébuché bien avant'],
		[
			503,
			'est de service à la',
			'\u00a0; cette page, elle, est hors service pour quelques minutes'
		],
		// Codes rares : chute de leur famille
		[413, 'apparaît à la', '\u00a0; ta demande, elle, n’a pas abouti'],
		[502, 'apparaît à la', '\u00a0; le serveur, lui, a perdu le fil']
	])('phrase sur π du %i', (status, piVerb, piTwist) => {
		expect(describeError(status, undefined)).toMatchObject({ piVerb, piTwist });
	});

	it('408 : délai dépassé, propose de réessayer', () => {
		expect(describeError(408, undefined)).toMatchObject({
			title: 'Délai dépassé',
			offerRetry: true
		});
	});

	it('un code sans texte propre retombe sur sa famille', () => {
		expect(describeError(418, undefined).title).toBe('Demande impossible');
		expect(describeError(502, undefined).title).toBe('Le serveur a trébuché');
	});

	it('4xx : le message précis de l’erreur devient le titre', () => {
		expect(describeError(404, 'Exercice introuvable').title).toBe('Exercice introuvable');
		expect(describeError(404, 'Ce lien est invalide ou a expiré').title).toBe(
			'Ce lien est invalide ou a expiré'
		);
	});

	it('500 : le message précis (erreur brute de la base) passe sous « Détails techniques »', () => {
		const copy = describeError(500, 'Erreur de chargement : relation "objectives" does not exist');

		expect(copy.title).toBe('Le serveur a trébuché');
		expect(copy.technicalDetail).toContain('objectives');
	});

	it('401 : « Non autorisé - Authentification requise » répète le titre', () => {
		expect(describeError(401, 'Non autorisé - Authentification requise').title).toBe(
			'Connexion requise'
		);
	});

	it('garde le titre français quand le message répète le code, sans casse ni accents', () => {
		expect(describeError(403, 'Acces refuse').title).toBe('Accès refusé');
		expect(describeError(403, 'Access denied').title).toBe('Accès refusé');
		expect(describeError(404, 'page introuvable !').title).toBe('Page introuvable');
		expect(describeError(404, '   ').title).toBe('Page introuvable');
	});
});
