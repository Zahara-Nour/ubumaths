import { describe, it, expect } from 'vitest';
import { redactAnalyticsEvent, redactSecretUrl } from '../analytics-redact';

const JETON = 'AbCdEfGhJkMnPqRsTuVwXyZ0123456789_-abcdefg';

describe('redactSecretUrl', () => {
	it('masque le jeton du carnet, adresse absolue ou relative', () => {
		expect(redactSecretUrl(`https://chiph.re/carnet/${JETON}`)).toBe(
			'https://chiph.re/carnet/[token]'
		);
		expect(redactSecretUrl(`/carnet/${JETON}?bienvenue=1#courriels`)).toBe(
			'/carnet/[token]?bienvenue=1#courriels'
		);
	});

	it('masque le jeton de confirmation', () => {
		expect(redactSecretUrl(`https://chiph.re/carnet/confirmer/${JETON}`)).toBe(
			'https://chiph.re/carnet/confirmer/[token]'
		);
	});

	it('masque chaque jeton d’un texte qui en cite plusieurs', () => {
		expect(redactSecretUrl(`de /carnet/${JETON} vers /carnet/confirmer/${JETON}.`)).toBe(
			'de /carnet/[token] vers /carnet/confirmer/[token].'
		);
	});

	it('masque le jeton d’une invitation de cours particulier', () => {
		expect(redactSecretUrl(`https://chiph.re/auth/register/invitation/${JETON}?/create`)).toBe(
			'https://chiph.re/auth/register/invitation/[token]?/create'
		);
		expect(redactSecretUrl('https://chiph.re/auth/register/parent')).toBe(
			'https://chiph.re/auth/register/parent'
		);
	});

	it('laisse les autres adresses intactes', () => {
		expect(redactSecretUrl('https://chiph.re/parents')).toBe('https://chiph.re/parents');
		expect(redactSecretUrl('https://chiph.re/dashboard/student/carnet')).toBe(
			'https://chiph.re/dashboard/student/carnet'
		);
	});
});

describe('redactAnalyticsEvent', () => {
	it('garde les autres champs de l’événement', () => {
		const event = { type: 'pageview' as const, url: `https://chiph.re/carnet/${JETON}` };
		expect(redactAnalyticsEvent(event)).toEqual({
			type: 'pageview',
			url: 'https://chiph.re/carnet/[token]'
		});
	});
});
