/**
 * Rattachement d'un modèle à ses points du référentiel (`create-questions.ts`)
 * ============================================================================
 *
 * Logique pure : lecture du champ `points` d'un fichier JSON, contrôle des codes
 * résolus en base (inconnu, archivé, niveau absent de `grades`) et calcul des liens
 * à ajouter / déjà présents / en base mais absents du fichier.
 */

import { describe, it, expect } from 'vitest';
import {
	MAX_POINTS_PER_TEMPLATE,
	checkPointCodes,
	extractTemplatePoints,
	planPointLinks,
	type ResolvedPoint
} from '../lib/template-points';

const modeleBrut = { title: 'Lire un vecteur normal', grades: ['1_SPE'], theme: 'Géométrie' };

describe('extractTemplatePoints', () => {
	it('sans champ `points` : codes null, modèle rendu intact', () => {
		const r = extractTemplatePoints(modeleBrut, 'a.json');
		expect(r).toEqual({ ok: true, template: modeleBrut, codes: null });
	});

	it('retire `points` du modèle et rend les codes', () => {
		const r = extractTemplatePoints({ ...modeleBrut, points: ['1SPE-135', '1SPE-118'] }, 'a.json');
		expect(r).toEqual({ ok: true, template: modeleBrut, codes: ['1SPE-135', '1SPE-118'] });
		if (r.ok) expect('points' in r.template).toBe(false);
	});

	it('accepte un tableau vide (aucun point voulu)', () => {
		const r = extractTemplatePoints({ ...modeleBrut, points: [] }, 'a.json');
		expect(r).toEqual({ ok: true, template: modeleBrut, codes: [] });
	});

	it.each([
		['une chaîne seule', '1SPE-135'],
		['un nombre dans le tableau', ['1SPE-135', 12]],
		['une chaîne vide', ['']],
		['un code avec espace', ['1SPE 135']]
	])('refuse %s en nommant le fichier', (_cas, points) => {
		const r = extractTemplatePoints({ ...modeleBrut, points }, 'b.json');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toContain('b.json');
	});

	it('refuse un doublon en le nommant', () => {
		const r = extractTemplatePoints({ ...modeleBrut, points: ['1SPE-135', '1SPE-135'] }, 'c.json');
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.error).toContain('c.json');
			expect(r.error).toContain('1SPE-135');
		}
	});

	it(`refuse plus de ${MAX_POINTS_PER_TEMPLATE} codes, accepte exactement ${MAX_POINTS_PER_TEMPLATE}`, () => {
		const codes = (n: number) => Array.from({ length: n }, (_, i) => `1SPE-${100 + i}`);
		expect(extractTemplatePoints({ ...modeleBrut, points: codes(20) }, 'd.json').ok).toBe(true);
		expect(extractTemplatePoints({ ...modeleBrut, points: codes(21) }, 'd.json').ok).toBe(false);
	});

	it('refuse un JSON qui n’est pas un objet', () => {
		expect(extractTemplatePoints([1, 2], 'e.json').ok).toBe(false);
		expect(extractTemplatePoints(null, 'e.json').ok).toBe(false);
	});
});

describe('checkPointCodes', () => {
	const resolus = new Map<string, ResolvedPoint>([
		['1SPE-135', { id: 'p135', code: '1SPE-135', grade: '1_SPE' }],
		['TCOMP-048', { id: 'pc48', code: 'TCOMP-048', grade: 'T_COMP' }],
		['TSPE-189', { id: 'ps189', code: 'TSPE-189', grade: 'T_SPE' }]
	]);

	it('aucune erreur quand chaque code existe et son niveau est dans `grades`', () => {
		expect(
			checkPointCodes(
				[
					{ file: 'a.json', codes: ['1SPE-135'], grades: ['1_SPE'] },
					{ file: 'b.json', codes: ['TSPE-189', 'TCOMP-048'], grades: ['T_SPE', 'T_COMP'] },
					{ file: 'c.json', codes: null, grades: ['2'] }
				],
				resolus
			)
		).toEqual([]);
	});

	it('code inconnu (ou archivé, donc non résolu) : erreur qui nomme fichier et code', () => {
		const erreurs = checkPointCodes(
			[{ file: 'a.json', codes: ['1SPE-135', '1SPE-999'], grades: ['1_SPE'] }],
			resolus
		);
		expect(erreurs).toHaveLength(1);
		expect(erreurs[0]).toContain('a.json');
		expect(erreurs[0]).toContain('1SPE-999');
	});

	it('point TCOMP sur un modèle T_SPE : erreur de niveau', () => {
		const erreurs = checkPointCodes(
			[{ file: 'b.json', codes: ['TSPE-189', 'TCOMP-048'], grades: ['T_SPE'] }],
			resolus
		);
		expect(erreurs).toHaveLength(1);
		expect(erreurs[0]).toContain('b.json');
		expect(erreurs[0]).toContain('TCOMP-048');
		expect(erreurs[0]).toContain('T_COMP');
	});

	it('rend TOUTES les erreurs de tous les fichiers', () => {
		const erreurs = checkPointCodes(
			[
				{ file: 'a.json', codes: ['X-1'], grades: ['1_SPE'] },
				{ file: 'b.json', codes: ['1SPE-135'], grades: ['T_SPE'] }
			],
			resolus
		);
		expect(erreurs).toHaveLength(2);
	});
});

describe('planPointLinks', () => {
	it('sépare à ajouter, déjà présents et en base absents du fichier', () => {
		const plan = planPointLinks(
			['1SPE-135', '1SPE-118'],
			[
				{ pointId: 'p118', code: '1SPE-118' },
				{ pointId: 'p200', code: '1SPE-200' }
			]
		);
		expect(plan).toEqual({
			toAdd: ['1SPE-135'],
			present: ['1SPE-118'],
			extra: [{ pointId: 'p200', code: '1SPE-200' }]
		});
	});

	it('rien en base : tout est à ajouter', () => {
		expect(planPointLinks(['1SPE-135'], [])).toEqual({
			toAdd: ['1SPE-135'],
			present: [],
			extra: []
		});
	});

	it('fichier à liste vide : tout ce qui est en base est « en trop »', () => {
		expect(planPointLinks([], [{ pointId: 'p1', code: 'A-1' }])).toEqual({
			toAdd: [],
			present: [],
			extra: [{ pointId: 'p1', code: 'A-1' }]
		});
	});
});
