/**
 * Séries de chapitre — logique pure
 * =================================
 *
 * 1. Le lien de lancement produit pour l'élève doit être ACCEPTÉ par la page
 *    `/automaths/test` (`resolveTestLaunch`), dans la forme choisie et avec les
 *    catégories de la série — sinon l'élève clique et tombe sur une erreur.
 * 2. Q129 (b) : « évaluation non terminée » = ni archivée (clôturée), ni date
 *    limite dépassée — brouillon (à venir) ou publiée (en cours).
 */

import { describe, it, expect } from 'vitest';
import { toChapterSeries, isEvaluationUnfinished } from '../chapter-series';
import { resolveTestLaunch } from '$lib/utils/test-launch';

const CATEGORIES = [
	{
		category: { theme: 'Fonctions', domain: 'Étude de fonction', subdomain: 'Méthode', level: 1 },
		quantity: 4,
		delay: 20
	},
	{
		category: { theme: 'Fonctions', domain: 'Dérivation', subdomain: null, level: 2 },
		quantity: 3,
		delay: 30
	}
];

function ligne(form: string) {
	return {
		id: 'lien',
		chapter_id: 'chap',
		series_id: 'serie',
		form,
		display_order: 0,
		section_id: null,
		section_order: 0,
		published_at: null,
		created_at: '2026-10-02T00:00:00Z'
	};
}

function lancer(href: string) {
	return resolveTestLaunch(new URL(href, 'http://localhost').searchParams);
}

describe('toChapterSeries → resolveTestLaunch', () => {
	it.each(['flash', 'interactive'] as const)(
		'forme %s : lien accepté, bonnes catégories',
		(form) => {
			const cs = toChapterSeries(ligne(form), { title: 'Méthode', categories: CATEGORIES });
			expect(cs.form).toBe(form);
			expect(cs.questionCount).toBe(7);
			expect(new URL(cs.launchHref!, 'http://localhost').pathname).toBe('/automaths/test');

			const launch = lancer(cs.launchHref!);
			expect(launch.kind).toBe('start');
			if (launch.kind !== 'start') return;
			expect(launch.mode).toBe(form);
			expect(launch.categories).toEqual(CATEGORIES);
			expect(launch.timeLimit).toBeUndefined();
		}
	);

	it('forme inconnue en base : retombe sur flash (défaut Q124 a)', () => {
		expect(toChapterSeries(ligne('course'), { title: 'x', categories: CATEGORIES }).form).toBe(
			'flash'
		);
	});

	it('composition illisible : pas de lien (jamais un lien vers une erreur)', () => {
		const cs = toChapterSeries(ligne('flash'), { title: 'x', categories: [{ nope: 1 }] });
		expect(cs.launchHref).toBeNull();
		expect(cs.questionCount).toBe(0);
	});

	it('série illisible : titre null, pas de lien', () => {
		const cs = toChapterSeries(ligne('flash'), undefined);
		expect(cs.title).toBeNull();
		expect(cs.launchHref).toBeNull();
	});
});

describe('isEvaluationUnfinished (Q129 b)', () => {
	const demain = new Date(Date.now() + 86_400_000).toISOString();
	const hier = new Date(Date.now() - 86_400_000).toISOString();

	it.each([
		['brouillon sans date (à venir)', { status: 'draft', deadline: null }, true],
		['publiée sans date (en cours)', { status: 'published', deadline: null }, true],
		['publiée, date limite demain', { status: 'published', deadline: demain }, true],
		['publiée, date limite passée', { status: 'published', deadline: hier }, false],
		['archivée (clôturée)', { status: 'archived', deadline: null }, false]
	])('%s → %s', (_nom, evaluation, attendu) => {
		expect(isEvaluationUnfinished(evaluation)).toBe(attendu);
	});
});
