/**
 * Bloc ```courbe — vecteurs donnés (`vecteurs:`) et somme à tracer
 * (`tracer: vecteur u + v depuis A`) : analyse et calcul pur
 *
 * Phase 0 validée par David le 2026-11-08 (`docs/wip/somme-vecteurs-progress.md` § 2) :
 * représentants n'importe où (SV1), coefficients entiers de −3 à 3 (SV2), phrases
 * nommées pour deux vecteurs (SV3), pointillés de construction sur le repère (SV4).
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { tracedVectorMistake } from '../../utils/courbe-vecteur';
import { constructionTraces } from '../../utils/courbe-combinaison';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { maskVectorValue } from '../../utils/masked-value';
import { findUnmaskedAnswers, maskGestureAnswers } from '$lib/questions/masked-statement';
import type { CourbeNode, CourbeSpec } from '../../types/courbe';

const WINDOW = ['x: -6 ; 6', 'y: -6 ; 6', 'grille: 1'];
/** u = AB = (3 ; 1), v = AC = (1 ; 3), même origine A(-2 ; -1) */
const POINTS = 'points: A(-2;-1), B(1;0), C(-1;2)';
const GIVEN = 'vecteurs: u = AB, v = AC';
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode): CourbeSpec {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

/** La phrase de la correction pour la réponse `answer` du bloc `s` */
function mistakeFor(s: CourbeSpec, answer: string) {
	const v = s.vecteur!;
	return tracedVectorMistake(answer, {
		u: v.coords!,
		name: v.name,
		...(v.origin !== undefined && { origin: v.origin }),
		...(v.terms !== undefined && { terms: v.terms })
	});
}

describe('vecteurs: — vecteurs donnés', () => {
	it('nommés, entre points de points:, quel que soit l’ordre des lignes', () => {
		const s = spec(block(...WINDOW, GIVEN, POINTS));
		expect(s.vecteurs).toEqual([
			{ name: 'u', from: 'A', to: 'B', line: 4 },
			{ name: 'v', from: 'A', to: 'C', line: 4 }
		]);
	});

	it('sans nom : AB', () => {
		const s = spec(block(...WINDOW, POINTS, 'vecteurs: AB'));
		expect(s.vecteurs).toEqual([{ name: '', from: 'A', to: 'B', line: 5 }]);
	});

	it('points de plusieurs caractères : A1B', () => {
		const s = spec(block(...WINDOW, 'points: A1(0;0), B(1;1)', 'vecteurs: w = A1B'));
		expect(s.vecteurs).toEqual([{ name: 'w', from: 'A1', to: 'B', line: 5 }]);
	});

	it('refusé : point inconnu', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: u = AD'))).toMatch(
			/vecteurs : u = AD : .*points:/
		);
	});

	it('refusé : vecteur nul', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: u = AA'))).toMatch(/nul/);
	});

	it('refusé : nom en double, nom pris par un point', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: u = AB, u = AC'))).toMatch(/deux fois/);
		expect(
			errorsOf(block(...WINDOW, 'points: A(0;0), B(1;1), u(2;2)', 'vecteurs: u = AB'))
		).toMatch(/déjà le nom d’un point/);
	});

	it('refusé : plus de 4 vecteurs', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: AB, AC, BA, BC, CA'))).toMatch(/au plus 4/);
	});

	it('écriture illisible', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: u = A'))).toMatch(/illisible|points:/);
	});

	it('la scène dessine les flèches données, avec leurs coordonnées', () => {
		const scene = buildCourbeScene(spec(block(...WINDOW, POINTS, GIVEN)));
		expect(scene.vectors).toEqual([
			{ name: 'u', from: { x: -2, y: -1 }, to: { x: 1, y: 0 } },
			{ name: 'v', from: { x: -2, y: -1 }, to: { x: -1, y: 2 } }
		]);
	});

	it('PDF : les flèches données et leur nom dans l’énoncé', () => {
		const typst = generateCourbeTypst(block(...WINDOW, POINTS, GIVEN));
		expect(typst).toContain('// vecteur u');
		expect(typst).toMatch(/line\(\(.*\), \(.*\), stroke: [^)]*mark: \(end: ">"/);
	});
});

describe('tracer: vecteur u + v — la combinaison', () => {
	it('somme de deux vecteurs nommés : coordonnées calculées, termes gardés', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v depuis A'));
		expect(s.vecteur).toMatchObject({
			name: '',
			coords: { x: 4, y: 4 },
			from: 'A',
			origin: { x: -2, y: -1 }
		});
		expect(s.vecteur!.terms).toEqual([
			{ coef: 1, name: 'u', from: 'A', to: 'B', at: { x: -2, y: -1 }, u: { x: 3, y: 1 } },
			{ coef: 1, name: 'v', from: 'A', to: 'C', at: { x: -2, y: -1 }, u: { x: 1, y: 3 } }
		]);
	});

	it('coefficients entiers, couples de points, origine libre', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur 2u - AC'));
		expect(s.vecteur).toMatchObject({ coords: { x: 5, y: -1 } });
		expect(s.vecteur!.terms!.map((t) => [t.coef, t.name])).toEqual([
			[2, 'u'],
			[-1, '']
		]);
	});

	it('premier terme négatif, coefficient collé ou espacé', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur -u + 3 v'));
		expect(s.vecteur).toMatchObject({ coords: { x: 0, y: 8 } });
	});

	it('refusé : coefficient hors de −3 à 3, fraction, zéro', () => {
		for (const bad of ['4u + v', '1/2 u + v', '0u + v']) {
			expect(errorsOf(block(...WINDOW, POINTS, GIVEN, `tracer: vecteur ${bad}`))).toMatch(
				/entiers? de -3 à 3/
			);
		}
	});

	it('refusé : nom absent de vecteurs:', () => {
		expect(errorsOf(block(...WINDOW, POINTS, 'vecteurs: u = AB', 'tracer: vecteur u + w'))).toMatch(
			/w : aucun vecteur de ce nom dans vecteurs:/
		);
	});

	it('refusé : combinaison nulle', () => {
		expect(errorsOf(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u - u'))).toMatch(/nul/);
	});

	it('refusé : un nom devant une combinaison', () => {
		expect(errorsOf(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur w = u + v'))).toMatch(/nom/);
	});

	it('refusé : extrémité hors fenêtre depuis l’origine imposée', () => {
		expect(errorsOf(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur 3u + 3v depuis A'))).toMatch(
			/sort de la fenêtre/
		);
	});

	it('les coordonnées restent permises : tracer: vecteur (3 ; -2)', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur (3 ; -2)'));
		expect(s.vecteur).toMatchObject({ coords: { x: 3, y: -2 } });
		expect(s.vecteur!.terms).toBeUndefined();
	});

	it('énoncé masqué d’une évaluation : la combinaison reste (c’est la tâche)', () => {
		expect(maskVectorValue('vecteur u + v depuis A')).toBe('vecteur u + v depuis A');
	});
});

describe('tracer: vecteur u + v — phrases de la correction', () => {
	const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v depuis A'));

	it('juste : aucune phrase', () => {
		expect(mistakeFor(s, '-2;-1/2;3')).toBeNull();
	});

	it('u⃗ seul', () => {
		expect(mistakeFor(s, '-2;-1/1;0')).toEqual({
			text: 'Ta flèche représente $\\vec{u}$ seul, pas $\\vec{u}+\\vec{v}$.',
			markdown: true
		});
	});

	it('v⃗ seul', () => {
		expect(mistakeFor(s, '-2;-1/-1;2')?.text).toBe(
			'Ta flèche représente $\\vec{v}$ seul, pas $\\vec{u}+\\vec{v}$.'
		);
	});

	it('u⃗ − v⃗ et v⃗ − u⃗', () => {
		expect(mistakeFor(s, '-2;-1/0;-3')?.text).toBe(
			'Ta flèche représente $\\vec{u}-\\vec{v}$, pas $\\vec{u}+\\vec{v}$.'
		);
		expect(mistakeFor(s, '-2;-1/-4;1')?.text).toBe(
			'Ta flèche représente $-\\vec{u}+\\vec{v}$, pas $\\vec{u}+\\vec{v}$.'
		);
	});

	it('mauvais sens', () => {
		expect(mistakeFor(s, '-2;-1/-6;-5')?.text).toBe(
			'Ta flèche va dans le mauvais sens : elle représente $-(\\vec{u}+\\vec{v})$.'
		);
	});

	it('autre flèche : ses coordonnées, et la combinaison attendue', () => {
		expect(mistakeFor(s, '-2;-1/0;1')?.text).toBe(
			'Ta flèche représente le vecteur (2 ; 2), pas $\\vec{u}+\\vec{v}$.'
		);
	});

	it('couples de points et coefficients en formule', () => {
		const t = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur 2u - AC'));
		// 2u⃗ + AC⃗ = (7 ; 5) : le signe du second terme oublié
		expect(mistakeFor(t, '-3;-3/4;2')?.text).toBe(
			'Ta flèche représente $2\\vec{u}+\\overrightarrow{AC}$, pas $2\\vec{u}-\\overrightarrow{AC}$.'
		);
	});

	it('trois termes : pas de phrase nommée par terme, la phrase générale', () => {
		const t = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v + AB'));
		expect(mistakeFor(t, '0;0/3;1')?.text).toBe(
			'Ta flèche représente le vecteur (3 ; 1), pas $\\vec{u}+\\vec{v}+\\overrightarrow{AB}$.'
		);
	});

	it('les phrases de toujours restent : extrémité manquante, même point', () => {
		expect(mistakeFor(s, '-2;-1/')).toEqual({ text: 'Il faut placer l’extrémité.' });
		expect(mistakeFor(s, '-2;-1/-2;-1')).toEqual({
			text: 'Ton origine et ton extrémité sont au même endroit.'
		});
	});
});

describe('tracer: vecteur u + v — pointillés de la correction', () => {
	it('même origine : les deux côtés du parallélogramme qui manquent', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v depuis A'));
		expect(constructionTraces(s, s.vecteur!.terms!, { x: -2, y: -1 })).toEqual([
			{ from: { x: 1, y: 0 }, to: { x: 2, y: 3 }, arrow: false },
			{ from: { x: -1, y: 2 }, to: { x: 2, y: 3 }, arrow: false }
		]);
	});

	it('même origine, coefficient ≠ 1 : le côté 2u⃗ aussi', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur 2u - v depuis A'));
		expect(constructionTraces(s, s.vecteur!.terms!, { x: -2, y: -1 })).toEqual([
			{ from: { x: -2, y: -1 }, to: { x: 4, y: 1 }, arrow: true },
			{ from: { x: -2, y: -1 }, to: { x: -3, y: -4 }, arrow: true },
			{ from: { x: 4, y: 1 }, to: { x: 3, y: -2 }, arrow: false },
			{ from: { x: -3, y: -4 }, to: { x: 3, y: -2 }, arrow: false }
		]);
	});

	it('autres origines : v⃗ mis au bout de u⃗ (Chasles)', () => {
		const s = spec(
			block(
				...WINDOW,
				'points: A(-5;-5), B(-3;-4), C(2;2), D(3;4)',
				'vecteurs: u = AB, v = CD',
				'tracer: vecteur u + v'
			)
		);
		expect(constructionTraces(s, s.vecteur!.terms!, { x: 0, y: 0 })).toEqual([
			{ from: { x: 0, y: 0 }, to: { x: 2, y: 1 }, arrow: true },
			{ from: { x: 2, y: 1 }, to: { x: 3, y: 3 }, arrow: true }
		]);
	});

	it('trait qui sortirait de la fenêtre : laissé', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur 3u - v depuis A'));
		const traces = constructionTraces(s, s.vecteur!.terms!, { x: -2, y: -1 });
		// 3u⃗ depuis A finit en (7 ; 2), hors de la fenêtre : ni ce côté ni celui qui en part
		expect(traces).toEqual([
			{ from: { x: -2, y: -1 }, to: { x: -3, y: -4 }, arrow: true },
			{ from: { x: -3, y: -4 }, to: { x: 6, y: -1 }, arrow: false }
		]);
	});

	it('un seul terme ou plus de deux : aucun pointillé', () => {
		const s = spec(block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v + AB'));
		expect(constructionTraces(s, s.vecteur!.terms!, { x: 0, y: 0 })).toEqual([]);
	});

	it('PDF corrigé : la flèche juste et les pointillés', () => {
		const node = block(...WINDOW, POINTS, GIVEN, 'tracer: vecteur u + v depuis A');
		expect(generateCourbeTypst(node)).not.toContain('dash');
		const solved = generateCourbeTypst(node, { solved: true });
		expect(solved).toContain('// solution vecteur');
		expect(solved).toContain('// construction');
		expect(solved).toMatch(/dash: "dashed"/);
	});
});

describe('tracer: vecteur u + v — évaluation notée (revue de #2467)', () => {
	it('la combinaison n’est pas une fuite : la question reste dans l’évaluation', () => {
		const source = [
			'Trace u + v.',
			'',
			'```courbe',
			...WINDOW,
			POINTS,
			GIVEN,
			'tracer: vecteur u + v depuis A',
			'case: 1',
			'```'
		].join('\n');
		expect(findUnmaskedAnswers(maskGestureAnswers(source))).toEqual([]);
	});

	it('des coordonnées non masquées restent une fuite', () => {
		const source = ['```courbe', ...WINDOW, 'tracer: vecteur (3 ; -2)', 'case: 1', '```'].join(
			'\n'
		);
		expect(findUnmaskedAnswers(source)).toEqual(['courbe']);
	});
});

describe('tracer: vecteur AB + AC — pointillés sans vecteurs: (revue de #2467)', () => {
	it('couples de points non dessinés : les quatre côtés du parallélogramme', () => {
		const s = spec(block(...WINDOW, POINTS, 'tracer: vecteur AB + AC depuis A'));
		expect(constructionTraces(s, s.vecteur!.terms!, { x: -2, y: -1 })).toEqual([
			{ from: { x: -2, y: -1 }, to: { x: 1, y: 0 }, arrow: true },
			{ from: { x: -2, y: -1 }, to: { x: -1, y: 2 }, arrow: true },
			{ from: { x: 1, y: 0 }, to: { x: 2, y: 3 }, arrow: false },
			{ from: { x: -1, y: 2 }, to: { x: 2, y: 3 }, arrow: false }
		]);
	});

	it('couple dessiné par vecteurs: (sans nom) : son côté n’est pas redoublé', () => {
		const s = spec(
			block(...WINDOW, POINTS, 'vecteurs: AB, AC', 'tracer: vecteur AB + AC depuis A')
		);
		expect(constructionTraces(s, s.vecteur!.terms!, { x: -2, y: -1 })).toHaveLength(2);
	});
});
