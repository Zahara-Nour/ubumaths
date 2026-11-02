/**
 * Bloc ```courbe — droite à tracer (`tracer: y = 2x - 1`) : analyse et calcul pur
 *
 * Spécification validée par David le 2026-11-01 (`docs/wip/points-repere-progress.md`
 * § 3, lot 2) et précisée le 2026-11-02 (§ 8) : `tracer:` refusé avec `placer:`,
 * étiquettes « 1 » / « 2 », phrases de la correction, points de la correction = les
 * deux nœuds de la droite les plus proches de l'origine.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import {
	correctionPoints,
	isCourbeAnswerCorrect,
	isTracedLineCorrect,
	lineCoefficients,
	lineNodes,
	lineSegmentInWindow,
	lineThrough,
	readTracedAnswer,
	tracedAnswer,
	tracedLineMistake
} from '../../utils/courbe-tracer';
import type { CourbeNode } from '../../types/courbe';

const WINDOW = ['x: -5 ; 5', 'y: -5 ; 5', 'grille: 1'];
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode) {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

/** Coefficients ramenés à b = 1 (ou a = 1 pour une verticale) pour comparer */
function normalized(equation: string) {
	const line = lineCoefficients(equation);
	if (typeof line === 'string') throw new Error(line);
	const k = line.b !== 0 ? line.b : line.a;
	const round = (v: number) => Math.round((v / k) * 1e9) / 1e9 + 0;
	return { a: round(line.a), b: round(line.b), c: round(line.c) };
}

describe('lineCoefficients — équation d’une droite', () => {
	it('réduite, verticale, cartésienne', () => {
		expect(normalized('y = 2x - 1')).toEqual({ a: -2, b: 1, c: 1 });
		expect(normalized('x = 3')).toEqual({ a: 1, b: 0, c: -3 });
		expect(normalized('2x + 3y - 6 = 0')).toEqual({ a: 0.666666667, b: 1, c: -2 });
		expect(normalized('y = -3')).toEqual({ a: 0, b: 1, c: 3 });
	});

	it('fractions, décimaux, produit implicite', () => {
		expect(normalized('y = 1/2x + 1')).toEqual({ a: -0.5, b: 1, c: -1 });
		expect(normalized('y = 0.5x')).toEqual({ a: -0.5, b: 1, c: 0 });
		expect(normalized('y = 2*(x - 1)')).toEqual({ a: -2, b: 1, c: 2 });
	});

	it('refuse ce qui n’est pas une droite', () => {
		expect(lineCoefficients('y = x^2')).toMatch(/pas l’équation d’une droite/);
		expect(lineCoefficients('y = 1/x')).toMatch(/pas l’équation d’une droite/);
		expect(lineCoefficients('2 = 2')).toMatch(/pas l’équation d’une droite/);
		expect(lineCoefficients('y = 2t + 1')).toMatch(/x et y seulement/);
		expect(lineCoefficients('y + 1')).toMatch(/un seul « = »/);
		expect(lineCoefficients('y = = 1')).toMatch(/un seul « = »/);
		expect(lineCoefficients('y = (2x')).toMatch(/illisible/);
	});
});

describe('tracer: — lecture du bloc', () => {
	it('réduite : l’équation, ses coefficients', () => {
		const tracer = spec(block(...WINDOW, 'tracer: y = 2x - 1')).tracer!;
		expect(tracer.equation).toBe('y = 2x - 1');
		expect(tracer.line).toBe(4);
	});

	it('variables substituées : `+ -3`, `--2` normalisés', () => {
		expect(spec(block(...WINDOW, 'tracer: y = -2x + -3')).tracer!.equation).toBe('y = -2x - 3');
		expect(spec(block(...WINDOW, 'tracer: y = 1x - -2')).tracer!.equation).toBe('y = 1x + 2');
	});

	it('virgule décimale lue comme un point', () => {
		expect(spec(block(...WINDOW, 'tracer: y = 0,5x + 1')).tracer!.equation).toBe('y = 0.5x + 1');
	});

	it('verticale et cartésienne acceptées', () => {
		expect(spec(block(...WINDOW, 'tracer: x = 3')).tracer).toBeDefined();
		expect(spec(block(...WINDOW, 'tracer: 2x + 3y - 6 = 0')).tracer).toBeDefined();
	});

	it('pas une droite : erreur au prof', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: y = x^2'))).toMatch(
			/Ligne 4 : tracer : .*pas l’équation d’une droite/
		);
	});

	it('vide : erreur au prof', () => {
		expect(errorsOf(block(...WINDOW, 'tracer:'))).toMatch(/tracer: attend l’équation/);
	});

	it('moins de deux nœuds dans la fenêtre : refusée au prof', () => {
		// y = 0,5x + 0,25 ne passe par aucun nœud d'une grille de pas 1
		expect(errorsOf(block(...WINDOW, 'tracer: y = 0.5x + 0.25'))).toMatch(
			/passe par moins de deux nœuds de la grille/
		);
		// x = 9 est hors de la fenêtre
		expect(errorsOf(block(...WINDOW, 'tracer: x = 9'))).toMatch(/moins de deux nœuds/);
		// y = 0,5x + 0,25 passe par des nœuds d'une grille de pas 0,25 ? (0,5 ; 0,5) oui
		expect(
			spec(block('x: -5 ; 5', 'y: -5 ; 5', 'grille: 0,25', 'tracer: y = 0.5x + 0.25')).tracer
		).toBeDefined();
	});

	it('avec placer: : refusé (un seul geste par repère)', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(1 ; 1)', 'tracer: y = x'))).toMatch(
			/tracer: et placer: ne vont pas ensemble/
		);
	});

	it('deux lignes tracer: : refusées', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: y = x', 'tracer: y = -x'))).toMatch(
			/clé « tracer » répétée/
		);
	});

	it('case: accepté avec tracer:', () => {
		const node = block('case: 2', ...WINDOW, 'tracer: y = x');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
	});

	it('masqué (`tracer: ?`) : lu sans vérification, l’équation n’est pas là', () => {
		const tracer = spec(block(...WINDOW, 'tracer: ?')).tracer!;
		expect(tracer.equation).toBe('?');
	});
});

describe('nœuds de la droite, points de la correction', () => {
	const grid = spec(block(...WINDOW, 'tracer: y = 2x - 1'));

	it('nœuds dans la fenêtre', () => {
		const line = lineCoefficients('y = 2x - 1');
		if (typeof line === 'string') throw new Error(line);
		expect(lineNodes(grid, line)).toEqual([
			{ x: -2, y: -5 },
			{ x: -1, y: -3 },
			{ x: 0, y: -1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 3 },
			{ x: 3, y: 5 }
		]);
	});

	it('verticale : un nœud par ligne horizontale', () => {
		const line = lineCoefficients('x = 3');
		if (typeof line === 'string') throw new Error(line);
		expect(lineNodes(grid, line)).toHaveLength(11);
	});

	it('correction : les deux nœuds les plus proches de l’origine', () => {
		expect(correctionPoints(grid, 'y = 2x - 1')).toEqual([
			{ x: 0, y: -1 },
			{ x: 1, y: 1 }
		]);
		expect(correctionPoints(grid, 'y = -x + 4')).toEqual([
			{ x: 2, y: 2 },
			{ x: 1, y: 3 }
		]);
	});
});

describe('réponse et juge', () => {
	it('réponse : deux points séparés par « / », vide sans point', () => {
		expect(tracedAnswer([null, null])).toBe('');
		expect(tracedAnswer([{ x: 0, y: -1 }, null])).toBe('0;-1/');
		expect(tracedAnswer([null, { x: 1.5, y: 2 }])).toBe('/1.5;2');
		expect(
			tracedAnswer([
				{ x: 0, y: -1 },
				{ x: 1, y: 1 }
			])
		).toBe('0;-1/1;1');
		expect(readTracedAnswer('0;-1/1;1')).toEqual([
			{ x: 0, y: -1 },
			{ x: 1, y: 1 }
		]);
		expect(readTracedAnswer('0;-1/')).toEqual([{ x: 0, y: -1 }, null]);
		expect(readTracedAnswer('')).toEqual([null, null]);
	});

	it('juste : toute paire de points distincts de la droite', () => {
		expect(isTracedLineCorrect('0;-1/1;1', 'y = 2x - 1')).toBe(true);
		expect(isTracedLineCorrect('3;5/-2;-5', 'y = 2x - 1')).toBe(true);
		expect(isTracedLineCorrect('3;0/3;4', 'x = 3')).toBe(true);
		expect(isTracedLineCorrect('3;0/0;2', '2x + 3y - 6 = 0')).toBe(true);
		expect(isTracedLineCorrect('2;2/4;3', 'y = 1/2x + 1')).toBe(true);
	});

	it('faux : un point hors de la droite, points confondus, un seul point', () => {
		expect(isTracedLineCorrect('0;-1/1;2', 'y = 2x - 1')).toBe(false);
		expect(isTracedLineCorrect('1;1/1;1', 'y = 2x - 1')).toBe(false);
		expect(isTracedLineCorrect('1;1/', 'y = 2x - 1')).toBe(false);
		expect(isTracedLineCorrect('', 'y = 2x - 1')).toBe(false);
	});

	it('isCourbeAnswerCorrect : un point (`2;3`) ou une droite (une équation)', () => {
		expect(isCourbeAnswerCorrect('2;3', '2;3')).toBe(true);
		expect(isCourbeAnswerCorrect('3;2', '2;3')).toBe(false);
		expect(isCourbeAnswerCorrect('0;-1/1;1', 'y = 2x - 1')).toBe(true);
		expect(isCourbeAnswerCorrect('0;-1/1;2', 'y = 2x - 1')).toBe(false);
	});

	it('phrases de la correction', () => {
		expect(tracedLineMistake('0;-1/1;1', 'y = 2x - 1')).toBeNull();
		expect(tracedLineMistake('', 'y = 2x - 1')).toBe('Il faut placer deux points.');
		expect(tracedLineMistake('/1;1', 'y = 2x - 1')).toBe('Il faut placer deux points.');
		expect(tracedLineMistake('1;1/1;1', 'y = 2x - 1')).toBe(
			'Tes deux points sont au même endroit : ils ne font pas une droite.'
		);
		expect(tracedLineMistake('0;-1/1;2', 'y = 2x - 1')).toBe(
			'Ta droite n’est pas celle d’équation y = 2x − 1.'
		);
	});
});

describe('dessin : la droite d’un bord à l’autre de la fenêtre', () => {
	const window = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

	it('droite par deux points', () => {
		const line = lineThrough({ x: 0, y: -1 }, { x: 1, y: 1 });
		expect(line).not.toBeNull();
		expect(lineSegmentInWindow(line!, window)).toEqual([
			{ x: -2, y: -5 },
			{ x: 3, y: 5 }
		]);
		expect(lineThrough({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
	});

	it('verticale et horizontale', () => {
		expect(lineSegmentInWindow({ a: 1, b: 0, c: -3 }, window)).toEqual([
			{ x: 3, y: -5 },
			{ x: 3, y: 5 }
		]);
		expect(lineSegmentInWindow({ a: 0, b: 1, c: -2 }, window)).toEqual([
			{ x: -5, y: 2 },
			{ x: 5, y: 2 }
		]);
	});

	it('droite qui manque la fenêtre : null', () => {
		expect(lineSegmentInWindow({ a: 1, b: 0, c: -9 }, window)).toBeNull();
	});
});
