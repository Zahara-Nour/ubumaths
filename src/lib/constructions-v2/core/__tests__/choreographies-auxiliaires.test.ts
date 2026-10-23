/**
 * Points auxiliaires nommés — lot 9 de `docs/wip/constructions-progress.md`.
 *
 * Chaque point auxiliaire (Q, R, C*, A′, O…) et la droite `e` que cite une
 * consigne portent cette lettre sur la figure. Une lettre déjà prise sur la
 * figure ou par le script (même déclarée plus loin) reçoit un prime :
 * Q → Q′ → Q″, et la consigne écrit la même lettre que la figure.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { GeoElement } from '$lib/geometry-core/types/elements';

// =============================================================================
// Décor
// =============================================================================

const LIGNE = ['A = point(0, 0)', 'B = point(4, 1)', 'P = point(1, 3)'];
const ANGLE = ['A = point(3, 0)', 'V = point(0, 0)', 'B = point(1, 3)'];
const TRANSPORTE = [
	'A = point(3, 0)',
	'V = point(0, 0)',
	'B = point(0, 3)',
	'al = angle(A, V, B)',
	'Vp = point(5, 0)',
	'P = point(6, 1)'
];

/** Voie → script, et lettres auxiliaires attendues (consignes ET figure). */
const VOIES: Record<string, { script: string[]; letters: string[] }> = {
	'parallele @parallelogramme': {
		script: [...LIGNE, 'm = parallele(P, A, B) @euclide @parallelogramme'],
		letters: ['Q']
	},
	'parallele @euclide @double_perpendiculaire': {
		script: [...LIGNE, 'm = parallele(P, A, B) @euclide @double_perpendiculaire'],
		letters: ['A*', 'B*', 'Q', 'e', 'C*', 'D*', 'R']
	},
	'parallele @equerre @double_perpendiculaire': {
		script: [...LIGNE, 'm = parallele(P, A, B) @equerre @double_perpendiculaire'],
		letters: ['e']
	},
	'perpendiculaire @arcs_egaux': {
		script: [...LIGNE, 'm = perpendiculaire(P, A, B) @euclide @arcs_egaux'],
		letters: ['B′', 'Q']
	},
	'perpendiculaire @rayon_libre': {
		script: [...LIGNE, 'm = perpendiculaire(P, A, B) @euclide @rayon_libre'],
		letters: ['A*', 'B*', 'Q']
	},
	'bissectrice @arcs_egaux': {
		script: [...ANGLE, 'm = bissectrice(A, V, B) @euclide @arcs_egaux'],
		letters: ['A′', 'B′', 'P']
	},
	'bissectrice @arc_milieu': {
		script: [...ANGLE, 'm = bissectrice(A, V, B) @euclide @arc_milieu'],
		letters: ['A′', 'B′', 'M']
	},
	cercle_circonscrit: {
		script: [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'C = point(1, 3)',
			'm = cercle_circonscrit(A, B, C) @euclide'
		],
		letters: ['O']
	},
	transporte: {
		script: [...TRANSPORTE, 'be = transporte(al, Vp, P) @euclide'],
		letters: ['A′', 'B′', 'A″', 'B″']
	}
};

function run(lines: readonly string[]): { exec: ConstructionExecutor; texts: string[] } {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	expect(exec.loadError).toBeNull();
	const texts: string[] = [];
	while (exec.step()) {
		const ss = exec.currentSubStep;
		if (ss?.instruction) texts.push(ss.instruction);
	}
	return { exec, texts };
}

function labelled(exec: ConstructionExecutor, label: string): GeoElement[] {
	return exec.figure.getAllElements().filter((el) => el.label === label);
}

/** Le nom `name` comme mot entier (pas la lettre de A*, B′, PC*…). */
function mentions(text: string, name: string): boolean {
	const escaped = name.replace(/[*]/g, '\\*');
	return new RegExp(`(?<![\\p{L}\\d_*′″‴'])${escaped}(?![\\p{L}\\d_*′″‴'])`, 'u').test(text);
}

/**
 * Noms de points cités par une consigne : majuscule, suivie d'astérisques
 * ou de primes, pas d'une minuscule (« On », « Compas » exclus) ;
 * « |PA| », « (AB) », « PC* » donnent chacun leurs lettres.
 */
function pointNames(text: string): string[] {
	return [...text.matchAll(/[A-Z][*′″‴]*(?![a-zà-ÿp])/g)].map((m) => m[0]);
}

// =============================================================================
// Tests
// =============================================================================

describe('points auxiliaires : la lettre de la consigne est sur la figure', () => {
	for (const [key, { script, letters }] of Object.entries(VOIES)) {
		it(`${key} : ${letters.join(', ')} cités et étiquetés une fois`, () => {
			const { exec, texts } = run(script);
			for (const letter of letters) {
				expect({ letter, cited: texts.some((t) => mentions(t, letter)) }).toEqual({
					letter,
					cited: true
				});
				const els = labelled(exec, letter);
				expect({ letter, count: els.length }).toEqual({ letter, count: 1 });
				const kind = letter === 'e' ? 'line' : 'point';
				expect({
					letter,
					isKind: kind === 'line' ? els[0].type === 'line' : els[0].type !== 'line'
				}).toEqual({
					letter,
					isKind: true
				});
			}
		});

		it(`${key} : toute lettre de point des consignes est une étiquette de la figure`, () => {
			const { exec, texts } = run(script);
			const labels = new Set(exec.figure.getAllElements().map((el) => el.label));
			for (const text of texts) {
				for (const name of pointNames(text)) {
					expect({ text, name, onFigure: labels.has(name) }).toEqual({
						text,
						name,
						onFigure: true
					});
				}
			}
		});
	}
});

describe('points auxiliaires : visibilité de l’étiquette selon le mode', () => {
	const script = (mode: string) => [
		...LIGNE,
		`m = parallele(P, A, B) @euclide @parallelogramme ${mode}`
	];

	it('@epure : Q étiqueté mais masqué', () => {
		const { exec } = run(script('@epure'));
		const [q] = labelled(exec, 'Q');
		expect(q.visible).toBe(false);
	});

	it('@squelette : Q visible avec son nom', () => {
		const { exec } = run(script('@squelette'));
		const [q] = labelled(exec, 'Q');
		expect(q.visible).not.toBe(false);
		expect(q.labelHidden).toBeFalsy();
	});

	it('@squelette : C*, D* masqués, R et e visibles (double perpendiculaire)', () => {
		const { exec } = run([
			...LIGNE,
			'm = parallele(P, A, B) @euclide @double_perpendiculaire @squelette'
		]);
		expect(labelled(exec, 'C*')[0].visible).toBe(false);
		expect(labelled(exec, 'D*')[0].visible).toBe(false);
		expect(labelled(exec, 'R')[0].visible).not.toBe(false);
		expect(labelled(exec, 'e')[0].visible).not.toBe(false);
	});
});

describe('points auxiliaires : lettre déjà prise → prime', () => {
	it('Q déclaré avant la parallèle : Q′ dans les consignes et sur la figure', () => {
		const { exec, texts } = run([
			...LIGNE,
			'Q = point(6, 5)',
			'm = parallele(P, A, B) @euclide @parallelogramme'
		]);
		expect(texts).toEqual([
			'Compas en A, on prend la mesure |AB|',
			'On reporte cette ouverture en P et on trace un arc vers Q′',
			'Compas en P, on prend la mesure |PA|',
			'On reporte en B et on trace un arc qui croise le précédent',
			'Les arcs se croisent en Q′',
			'Règle par P et Q′ : on trace la parallèle'
		]);
		expect(labelled(exec, 'Q')).toHaveLength(1);
		expect(labelled(exec, 'Q′')).toHaveLength(1);
	});

	it('Q déclaré après la parallèle : Q′ aussi', () => {
		const { exec, texts } = run([
			...LIGNE,
			'm = parallele(P, A, B) @euclide @parallelogramme',
			'Q = point(6, 5)'
		]);
		expect(texts).toContain('Les arcs se croisent en Q′');
		expect(labelled(exec, 'Q')).toHaveLength(1);
		expect(labelled(exec, 'Q′')).toHaveLength(1);
	});

	it('deux parallèles : Q puis Q′', () => {
		const { exec, texts } = run([
			...LIGNE,
			'S = point(-1, 4)',
			'm = parallele(P, A, B) @euclide @parallelogramme',
			'n = parallele(S, A, B) @euclide @parallelogramme'
		]);
		expect(texts.filter((t) => t.startsWith('Les arcs se croisent en'))).toEqual([
			'Les arcs se croisent en Q',
			'Les arcs se croisent en Q′'
		]);
		expect(labelled(exec, 'Q')).toHaveLength(1);
		expect(labelled(exec, 'Q′')).toHaveLength(1);
	});

	it('trois parallèles : Q, Q′, Q″', () => {
		const { texts } = run([
			...LIGNE,
			'S = point(-1, 4)',
			'T = point(2, 6)',
			'm = parallele(P, A, B) @euclide @parallelogramme',
			'n = parallele(S, A, B) @euclide @parallelogramme',
			'k = parallele(T, A, B) @euclide @parallelogramme'
		]);
		expect(texts.filter((t) => t.startsWith('Les arcs se croisent en'))).toEqual([
			'Les arcs se croisent en Q',
			'Les arcs se croisent en Q′',
			'Les arcs se croisent en Q″'
		]);
	});

	it('bissectrice avec un point P dans le script : les arcs se coupent en P′', () => {
		const { exec, texts } = run([
			...ANGLE,
			'P = point(5, 5)',
			'm = bissectrice(A, V, B) @euclide @arcs_egaux'
		]);
		expect(texts).toContain('Les arcs se coupent en P′');
		expect(texts).toContain('Règle de V à P′ : on trace la bissectrice');
		expect(labelled(exec, 'P′')).toHaveLength(1);
	});

	it('deux doubles perpendiculaires : e puis e′, R puis R′', () => {
		const { exec, texts } = run([
			...LIGNE,
			'S = point(-1, 4)',
			'm = parallele(P, A, B) @euclide @double_perpendiculaire',
			'n = parallele(S, A, B) @euclide @double_perpendiculaire'
		]);
		expect(texts).toContain('La perpendiculaire e à (AB) passant par P apparaît');
		expect(texts).toContain('La perpendiculaire e′ à (AB) passant par S apparaît');
		expect(texts).toContain('Règle par S et R′ : on trace la parallèle à (AB)');
		expect(labelled(exec, 'e′')).toHaveLength(1);
		expect(labelled(exec, 'R′')).toHaveLength(1);
	});

	it('transporte après une bissectrice : A″, B″ puis A‴ (lettres distinctes dans la même consigne)', () => {
		const { texts } = run([
			...TRANSPORTE,
			'm = bissectrice(A, V, B) @euclide @arcs_egaux',
			'be = transporte(al, Vp, P) @euclide'
		]);
		expect(texts).toContain("On marque A″, B″ (sur les côtés de l'angle) et A‴ (sur la direction)");
		expect(texts).toContain('Les deux arcs se coupent en B‴');
	});

	it('C dans le script ne fait pas renommer C* (lettre différente)', () => {
		const { texts } = run([
			'C = point(0, 0)',
			'D = point(4, 1)',
			'M = point(1, 3)',
			'm = parallele(M, C, D) @euclide @double_perpendiculaire'
		]);
		expect(texts).toContain('Compas en M, petite ouverture : un petit arc coupe e en C*');
	});
});
