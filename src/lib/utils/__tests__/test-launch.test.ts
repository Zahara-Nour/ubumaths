/**
 * Que faire d'une URL `/automaths/test?…` (B15, C19) ?
 */
import { describe, it, expect } from 'vitest';
import { resolveTestLaunch } from '../test-launch';
import { encodeCategoriesParam } from '$lib/validation/series';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

function params(entries: Record<string, string>): URLSearchParams {
	return new URLSearchParams(entries);
}

describe('resolveTestLaunch', () => {
	it('C19 : categories SANS mode → choix de la forme', () => {
		expect(resolveTestLaunch(params({ categories: encodeCategoriesParam([ITEM]) }))).toEqual({
			kind: 'choose-form',
			categories: [ITEM]
		});
	});

	it('categories AVEC mode → démarrage direct, comme avant', () => {
		expect(
			resolveTestLaunch(params({ categories: encodeCategoriesParam([ITEM]), mode: 'flash' }))
		).toEqual({ kind: 'start', mode: 'flash', categories: [ITEM], timeLimit: undefined });
	});

	it('Course aux nombres : le temps de l’URL est gardé s’il est plausible', () => {
		const launch = resolveTestLaunch(
			params({ categories: encodeCategoriesParam([ITEM]), mode: 'course', time: '420' })
		);
		expect(launch).toMatchObject({ kind: 'start', mode: 'course', timeLimit: 420 });

		const absurd = resolveTestLaunch(
			params({ categories: encodeCategoriesParam([ITEM]), mode: 'course', time: '99999' })
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
		const launch = resolveTestLaunch(params({ categories: '[{oups' }));
		expect(launch.kind).toBe('error');
	});

	it('forme inconnue → message', () => {
		expect(
			resolveTestLaunch(params({ categories: encodeCategoriesParam([ITEM]), mode: 'quiz' }))
		).toEqual({ kind: 'error', message: 'Forme de série inconnue' });
	});

	it('aucune catégorie → message', () => {
		expect(resolveTestLaunch(params({ mode: 'interactive' }))).toEqual({
			kind: 'error',
			message: 'Ce lien ne contient aucune question.'
		});
	});
});
