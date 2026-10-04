/**
 * `keepLinksOfGrade` — règle des cartes partagées entre deux référentiels.
 */
import { describe, it, expect } from 'vitest';
import { keepLinksOfGrade } from '../curriculum-grade';

type Link = { template_id: string; grade: string | null; point: string };
const read = (l: Link) => l;

const LINKS: Link[] = [
	{ template_id: 't-partagee', grade: 'T_COMP', point: 'p-comp' },
	{ template_id: 't-seule', grade: 'T_COMP', point: 'p-comp-seul' },
	{ template_id: 't-partagee', grade: 'T_SPE', point: 'p-spe' },
	{ template_id: 't-sans-theme', grade: null, point: 'p-orphelin' }
];

describe('keepLinksOfGrade', () => {
	it('carte partagée : seulement le point du niveau ; les autres cartes intactes, dans l’ordre', () => {
		expect(keepLinksOfGrade(LINKS, 'T_SPE', read).map((l) => l.point)).toEqual([
			'p-comp-seul',
			'p-spe',
			'p-orphelin'
		]);
	});

	it('sans niveau (null, undefined, vide) : tout est gardé', () => {
		for (const grade of [null, undefined, '']) {
			expect(keepLinksOfGrade(LINKS, grade, read)).toEqual(LINKS);
		}
	});

	it('niveau qu’aucune carte ne porte : tout est gardé', () => {
		expect(keepLinksOfGrade(LINKS, '6', read)).toEqual(LINKS);
	});
});
