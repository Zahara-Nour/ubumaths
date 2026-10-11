import { describe, expect, it } from 'vitest';
import { describeError } from '../error-copy';

describe('describeError', () => {
	it('404 : page introuvable, sans action particulière', () => {
		expect(describeError(404, 'Not Found')).toMatchObject({
			title: 'Page introuvable',
			explanation: null,
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

	it('401 : propose de se connecter, sans explication, chute sur π', () => {
		expect(describeError(401, 'Unauthorized')).toMatchObject({
			title: 'Connexion requise',
			explanation: null,
			piVerb: 'se présente',
			piTwist: '\u00a0; ta page, elle, voudrait que tu en fasses autant',
			offerLogin: true
		});
	});

	it('phrase sur π : chute pour 403, 404 et 410, aucune pour un code sans chute', () => {
		expect(describeError(404, undefined).piTwist).toBe(', mais la page, elle, reste introuvable');
		expect(describeError(403, undefined)).toMatchObject({
			explanation: null,
			piVerb: 'a été autorisé à s’installer',
			piTwist: '\u00a0; toi, sur cette page, tu ne l’es pas'
		});
		expect(describeError(410, undefined)).toMatchObject({
			explanation: null,
			piVerb: 'a un bail éternel',
			piTwist: '\u00a0; cette page, elle, a rendu les clés'
		});
		expect(describeError(429, undefined)).toMatchObject({ piVerb: 'apparaît', piTwist: null });
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
