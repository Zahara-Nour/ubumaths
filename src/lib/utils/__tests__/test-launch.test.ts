/**
 * Que faire d'une URL `/automaths/test?…` (B15, C19) ?
 */
import { describe, it, expect } from 'vitest';
import { resolveTestLaunch } from '../test-launch';
import { ANCIEN_LIEN_MESSAGE, encodeSeriesParam, SERIES_LINK_PARAM } from '$lib/validation/series';

const ITEM = {
	templateId: '11111111-1111-4111-8111-111111111111',
	quantity: 4,
	delay: 20
};

/** Ancienne ligne par catégorie (ADR 0035) : les anciens liens ne sont plus relus */
const LEGACY_ITEM = {
	category: { level: 3 },
	quantity: 4,
	delay: 20
};

function params(entries: Record<string, string>): URLSearchParams {
	return new URLSearchParams(entries);
}

describe('resolveTestLaunch', () => {
	it('Q46 : modeles SANS mode → le panier, paramètre intact', () => {
		const encoded = encodeSeriesParam([ITEM]);
		const launch = resolveTestLaunch(params({ [SERIES_LINK_PARAM]: encoded }));

		expect(launch.kind).toBe('cart');
		const href = new URL((launch as { href: string }).href, 'http://localhost');
		expect(href.pathname).toBe('/automaths/panier');
		expect(href.searchParams.get(SERIES_LINK_PARAM)).toBe(encoded);
	});

	it('Q46 : un ANCIEN lien categories SANS mode → le panier, paramètre intact', () => {
		const encoded = encodeURIComponent(JSON.stringify([LEGACY_ITEM]));
		const launch = resolveTestLaunch(params({ categories: encoded }));

		expect(launch.kind).toBe('cart');
		const href = new URL((launch as { href: string }).href, 'http://localhost');
		expect(href.pathname).toBe('/automaths/panier');
		expect(href.searchParams.get('categories')).toBe(encoded);
		expect(href.searchParams.has(SERIES_LINK_PARAM)).toBe(false);
	});

	it('Q46 : lien abîmé SANS mode → le panier aussi (il dira pourquoi)', () => {
		expect(resolveTestLaunch(params({ [SERIES_LINK_PARAM]: '[{oups' })).kind).toBe('cart');
	});

	it('modeles AVEC mode → démarrage direct', () => {
		expect(
			resolveTestLaunch(params({ [SERIES_LINK_PARAM]: encodeSeriesParam([ITEM]), mode: 'flash' }))
		).toEqual({ kind: 'start', mode: 'flash', lines: [ITEM], timeLimit: undefined });
	});

	it('Course aux nombres : le temps de l’URL est gardé s’il est plausible', () => {
		const launch = resolveTestLaunch(
			params({ [SERIES_LINK_PARAM]: encodeSeriesParam([ITEM]), mode: 'course', time: '420' })
		);
		expect(launch).toMatchObject({ kind: 'start', mode: 'course', timeLimit: 420 });

		const absurd = resolveTestLaunch(
			params({ [SERIES_LINK_PARAM]: encodeSeriesParam([ITEM]), mode: 'course', time: '99999' })
		);
		expect(absurd).toMatchObject({ kind: 'start', timeLimit: undefined });
	});

	it('B15 : une assignation l’emporte, le mode de l’URL est ignoré', () => {
		expect(resolveTestLaunch(params({ assignment: 'abc', mode: 'flash' }))).toEqual({
			kind: 'assignment',
			assignmentId: 'abc'
		});
	});

	it('C19 : lien abîmé → message, pas d’exception', () => {
		const launch = resolveTestLaunch(
			params({ [SERIES_LINK_PARAM]: '[{oups', mode: 'interactive' })
		);
		expect(launch.kind).toBe('error');
	});

	it('un modèle à 99 questions (plafond du panier) se lance', () => {
		const big = { ...ITEM, quantity: 99 };
		expect(
			resolveTestLaunch(
				params({ [SERIES_LINK_PARAM]: encodeSeriesParam([big]), mode: 'interactive' })
			)
		).toMatchObject({ kind: 'start', lines: [big] });
	});

	it('un ANCIEN lien categories AVEC mode → message « ancienne version », pas de démarrage', () => {
		expect(
			resolveTestLaunch(
				params({
					categories: encodeURIComponent(JSON.stringify([LEGACY_ITEM])),
					mode: 'interactive'
				})
			)
		).toEqual({ kind: 'error', message: ANCIEN_LIEN_MESSAGE });
	});

	it('forme inconnue → message', () => {
		expect(
			resolveTestLaunch(params({ [SERIES_LINK_PARAM]: encodeSeriesParam([ITEM]), mode: 'quiz' }))
		).toEqual({ kind: 'error', message: 'Forme de série inconnue' });
	});

	it('aucune composition → message', () => {
		expect(resolveTestLaunch(params({ mode: 'interactive' }))).toEqual({
			kind: 'error',
			message: 'Ce lien ne contient aucune question.'
		});
	});
});
