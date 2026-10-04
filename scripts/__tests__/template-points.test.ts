/**
 * Rattachement d'un modèle à ses points du référentiel (`create-questions.ts`)
 * ============================================================================
 *
 * Logique pure : lecture du champ `points` d'un fichier JSON, contrôle des codes
 * résolus en base (inconnu, archivé, niveau absent de `grades`) et calcul des liens
 * à ajouter / déjà présents / en base mais absents du fichier. Aussi : comparaison de
 * `grades` (`--mettre-a-jour`), lecture du mapping de `link-template-points.ts` et décision
 * de changement de niveau (`--niveaux`).
 */

import { describe, it, expect } from 'vitest';
import {
	MAX_MAPPING_ENTRIES,
	MAX_POINTS_PER_TEMPLATE,
	checkPointCodes,
	decideLinkAction,
	describeGradeChange,
	describeLinkPlan,
	extractTemplatePoints,
	parseMapping,
	planGradeChange,
	planPointLinks,
	sameGrades,
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

describe('sameGrades', () => {
	it('ordre indifférent', () => {
		expect(sameGrades(['T_SPE', 'T_COMP'], ['T_COMP', 'T_SPE'])).toBe(true);
	});

	it('niveau changé : différent', () => {
		expect(sameGrades(['1_SPE'], ['2'])).toBe(false);
	});

	it('niveau ajouté ou retiré : différent', () => {
		expect(sameGrades(['1_SPE'], ['1_SPE', '2'])).toBe(false);
		expect(sameGrades(['1_SPE', '2'], ['1_SPE'])).toBe(false);
	});

	it('doublon ignoré (ensemble), vides égaux', () => {
		expect(sameGrades(['2', '2'], ['2'])).toBe(true);
		expect(sameGrades([], [])).toBe(true);
	});
});

describe('describeLinkPlan', () => {
	const plan = {
		toAdd: ['2-010'],
		present: [],
		extra: [{ pointId: 'p1', code: '1SPE-050' }]
	};

	it('liens d’un autre niveau en base : signalés « gardés » sans --remplacer-points', () => {
		const texte = describeLinkPlan(plan, false);
		expect(texte).toContain('+1 à ajouter (2-010)');
		expect(texte).toContain('1 en base absents du fichier, gardés (1SPE-050)');
	});

	it('avec --remplacer-points : annoncés « à supprimer »', () => {
		expect(describeLinkPlan(plan, true)).toContain('-1 à supprimer (1SPE-050)');
	});
});

describe('parseMapping', () => {
	const id1 = '11111111-1111-4111-8111-111111111111';
	const id2 = '22222222-2222-4222-8222-222222222222';

	it('rend les entrées valides', () => {
		const r = parseMapping([
			{ id: id1, points: ['1SPE-050', '1SPE-051'] },
			{ id: id2, points: ['2-010'] }
		]);
		expect(r).toEqual({
			ok: true,
			entries: [
				{ id: id1, codes: ['1SPE-050', '1SPE-051'] },
				{ id: id2, codes: ['2-010'] }
			]
		});
	});

	it.each([
		['pas un tableau', { id: id1, points: ['A-1'] }],
		['tableau vide', []],
		['id qui n’est pas un uuid', [{ id: '42', points: ['A-1'] }]],
		['points absent', [{ id: id1 }]],
		['points vide', [{ id: id1, points: [] }]],
		['code avec espace', [{ id: id1, points: ['1SPE 050'] }]],
		['clé inconnue (faute de frappe)', [{ id: id1, point: ['A-1'] }]],
		['code en double dans une entrée', [{ id: id1, points: ['A-1', 'A-1'] }]],
		[
			'même id deux fois',
			[
				{ id: id1, points: ['A-1'] },
				{ id: id1, points: ['A-2'] }
			]
		]
	])('refuse : %s', (_cas, brut) => {
		const r = parseMapping(brut);
		expect(r.ok).toBe(false);
	});

	it('nomme l’entrée fautive', () => {
		const r = parseMapping([
			{ id: id1, points: ['A-1'] },
			{ id: 'pas-un-uuid', points: ['A-1'] }
		]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toContain('entrée 2');
	});

	it(`au plus ${MAX_POINTS_PER_TEMPLATE} codes par entrée`, () => {
		const codes = (n: number) => Array.from({ length: n }, (_, i) => `1SPE-${100 + i}`);
		expect(parseMapping([{ id: id1, points: codes(20) }]).ok).toBe(true);
		expect(parseMapping([{ id: id1, points: codes(21) }]).ok).toBe(false);
	});

	it(`au plus ${MAX_MAPPING_ENTRIES} entrées`, () => {
		const entrees = (n: number) =>
			Array.from({ length: n }, (_, i) => ({
				id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
				points: ['A-1']
			}));
		expect(parseMapping(entrees(500)).ok).toBe(true);
		expect(parseMapping(entrees(501)).ok).toBe(false);
	});
});

describe('decideLinkAction', () => {
	const aAjouter = { toAdd: ['A-1'], present: [], extra: [] };
	const rienAAjouter = { toAdd: [], present: ['A-1'], extra: [{ pointId: 'p', code: 'B-1' }] };

	it('brouillon avec liens manquants : ajout', () => {
		expect(decideLinkAction('draft', false, aAjouter)).toBe('add');
	});

	it('rien à ajouter : rien (même si des liens en base sont absents du mapping)', () => {
		expect(decideLinkAction('draft', false, rienAAjouter)).toBe('nothing');
		expect(decideLinkAction('published', false, rienAAjouter)).toBe('nothing');
	});

	it('publié sans --liens-publies : refus', () => {
		expect(decideLinkAction('published', false, aAjouter)).toBe('refused');
	});

	it('publié avec --liens-publies : ajout', () => {
		expect(decideLinkAction('published', true, aAjouter)).toBe('add');
	});

	it('tout statut autre que draft est traité comme publié', () => {
		expect(decideLinkAction('archived', false, aAjouter)).toBe('refused');
	});
});

describe('parseMapping — champ facultatif `grades`', () => {
	const id1 = '11111111-1111-4111-8111-111111111111';

	it('sans `grades` : entrée sans grades (niveau en base gardé)', () => {
		const r = parseMapping([{ id: id1, points: ['2-010'] }]);
		expect(r).toEqual({ ok: true, entries: [{ id: id1, codes: ['2-010'] }] });
	});

	it('avec `grades` : rendus tels quels', () => {
		const r = parseMapping([
			{ id: id1, points: ['TSPE-1', 'TCOMP-1'], grades: ['T_SPE', 'T_COMP'] }
		]);
		expect(r).toEqual({
			ok: true,
			entries: [{ id: id1, codes: ['TSPE-1', 'TCOMP-1'], grades: ['T_SPE', 'T_COMP'] }]
		});
	});

	it.each([
		['grades vide', []],
		['code de niveau inconnu', ['seconde']],
		['niveau en double', ['2', '2']],
		['plus de 4 niveaux', ['2', '1_SPE', 'T_SPE', 'T_COMP', 'T_EXP']],
		['pas un tableau', '2']
	])('refuse : %s', (_cas, grades) => {
		const r = parseMapping([{ id: id1, points: ['2-010'], grades }]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toContain('entrée 1');
	});

	it('accepte exactement 4 niveaux', () => {
		const r = parseMapping([
			{ id: id1, points: ['A-1'], grades: ['2', '1_SPE', 'T_SPE', 'T_COMP'] }
		]);
		expect(r.ok).toBe(true);
	});
});

describe('planGradeChange', () => {
	const base = { status: 'published', dbGrades: ['1_SPE'], niveaux: true, liensPublies: true };

	it('mapping sans grades : rien à changer, cible = grades en base', () => {
		expect(planGradeChange({ ...base, wanted: undefined })).toEqual({
			kind: 'same',
			target: ['1_SPE']
		});
	});

	it('mêmes grades (ordre indifférent) : rien à changer, même sans drapeau', () => {
		expect(
			planGradeChange({
				...base,
				dbGrades: ['T_SPE', 'T_COMP'],
				wanted: ['T_COMP', 'T_SPE'],
				niveaux: false,
				liensPublies: false
			})
		).toEqual({ kind: 'same', target: ['T_SPE', 'T_COMP'] });
	});

	it('grades différents sans --niveaux : refus qui nomme le drapeau et les deux listes', () => {
		const r = planGradeChange({ ...base, wanted: ['2'], niveaux: false });
		expect(r.kind).toBe('refused');
		if (r.kind === 'refused') {
			expect(r.reason).toContain('--niveaux');
			expect(r.reason).toContain('[1_SPE]');
			expect(r.reason).toContain('[2]');
		}
	});

	it('brouillon, grades différents sans --niveaux : refus aussi', () => {
		const r = planGradeChange({ ...base, status: 'draft', wanted: ['2'], niveaux: false });
		expect(r.kind).toBe('refused');
	});

	it('publié avec --niveaux mais sans --liens-publies : refus qui nomme --liens-publies', () => {
		const r = planGradeChange({ ...base, wanted: ['2'], liensPublies: false });
		expect(r.kind).toBe('refused');
		if (r.kind === 'refused') expect(r.reason).toContain('--liens-publies');
	});

	it('brouillon avec --niveaux : changement (pas besoin de --liens-publies)', () => {
		expect(
			planGradeChange({ ...base, status: 'draft', wanted: ['2'], liensPublies: false })
		).toEqual({ kind: 'change', from: ['1_SPE'], target: ['2'] });
	});

	it('publié avec --niveaux et --liens-publies : changement', () => {
		expect(planGradeChange({ ...base, wanted: ['T_SPE', 'T_COMP'] })).toEqual({
			kind: 'change',
			from: ['1_SPE'],
			target: ['T_SPE', 'T_COMP']
		});
	});
});

describe('describeGradeChange', () => {
	it('annonce avant → après', () => {
		expect(describeGradeChange(['1_SPE'], ['2'])).toBe('grades : [1_SPE] → [2]');
		expect(describeGradeChange(['1_SPE'], ['T_SPE', 'T_COMP'])).toBe(
			'grades : [1_SPE] → [T_SPE, T_COMP]'
		);
	});
});

describe('checkPointCodes contre les grades CIBLES', () => {
	const resolus = new Map<string, ResolvedPoint>([
		['2-010', { id: 'p2', code: '2-010', grade: '2' }]
	]);

	it('point 2-xxx sur un modèle 1_SPE passé à [2] : accepté avec les grades cibles', () => {
		const cible = planGradeChange({
			status: 'published',
			dbGrades: ['1_SPE'],
			wanted: ['2'],
			niveaux: true,
			liensPublies: true
		});
		expect(cible.kind).toBe('change');
		if (cible.kind === 'refused') return;
		expect(
			checkPointCodes([{ file: 'm', codes: ['2-010'], grades: cible.target }], resolus)
		).toEqual([]);
		expect(
			checkPointCodes([{ file: 'm', codes: ['2-010'], grades: ['1_SPE'] }], resolus)
		).toHaveLength(1);
	});
});
