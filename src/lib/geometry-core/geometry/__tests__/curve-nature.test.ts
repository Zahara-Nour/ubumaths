/**
 * La nature d'une courbe donnée par son équation — la classification de
 * `courbe()`, extraite en fonction PURE (sans `Figure`) pour que la carte de
 * l'atelier dise « droite », « cercle »… (géométrie v2, lot 1, PR 2 : C1, C2,
 * C6 ; `docs/wip/atelier-geometrie-phase0.md`).
 *
 * `classifyConic` disait « dégénérée » sans séparer le vide, le point isolé et
 * les droites : `degenerateConicKind` les sépare.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '$lib/mathAST';
import type { MathNode } from '$lib/mathAST';
import { curveNatureOf, curveShapeOf, equationExpression } from '../curve-nature';
import { degenerateConicKind } from '../conic-classify';

// =============================================================================
// Décor
// =============================================================================

/** L'équation lue comme le fait `courbe()` (écriture maison). */
function equation(text: string): MathNode {
	return parseCustom(text);
}

function natureOf(text: string) {
	return curveNatureOf(equation(text));
}

// =============================================================================
// La nature
// =============================================================================

describe('la nature d’une courbe', () => {
	it('C1 : y = 3x − 2 est une droite', () => {
		expect(natureOf('y = 3x - 2')).toBe('line');
	});

	it('C7 : 2y = 6x − 4, écrite telle quelle, est la même droite', () => {
		expect(natureOf('2y = 6x - 4')).toBe('line');
	});

	it('C3 : x = 2 est une droite (verticale)', () => {
		expect(natureOf('x = 2')).toBe('line');
	});

	it('C5 : la forme de la tangente y = 4(x − 2) + 4 est une droite', () => {
		expect(natureOf('y = 4(x - 2) + 4')).toBe('line');
	});

	it('C2 : x² + y² − 1 = 0 et x² + y² = 1 sont un cercle', () => {
		expect(natureOf('x^2 + y^2 - 1 = 0')).toBe('circle');
		expect(natureOf('x^2 + y^2 = 1')).toBe('circle');
	});

	it('C2 : un cercle écrit avec son centre, (x − 1)² + (y − 2)² = 4', () => {
		expect(natureOf('(x - 1)^2 + (y - 2)^2 = 4')).toBe('circle');
	});

	it('ellipse, parabole, hyperbole', () => {
		expect(natureOf('x^2 + 4y^2 = 4')).toBe('ellipse');
		expect(natureOf('y = x^2 - 3x')).toBe('parabola');
		expect(natureOf('x y = 1')).toBe('hyperbola');
		expect(natureOf('x^2 - y^2 = 1')).toBe('hyperbola');
	});

	it('une équation qui n’est pas du second degré est une courbe', () => {
		expect(natureOf('y = sin(x)')).toBe('curve');
		expect(natureOf('y^2 = x^3 - x')).toBe('curve');
	});

	it('C6 : x² + y² = −1 est vide', () => {
		expect(natureOf('x^2 + y^2 = -1')).toBe('empty');
	});

	it('C6 : x² = −1 est vide aussi (dégénérée parabolique)', () => {
		expect(natureOf('x^2 = -1')).toBe('empty');
	});

	it('x² + y² = 0 est un point isolé', () => {
		expect(natureOf('x^2 + y^2 = 0')).toBe('point');
	});

	it('x² = 4 et x² − y² = 0 sont deux droites ; x² = 0 une seule', () => {
		expect(natureOf('x^2 = 4')).toBe('lines');
		expect(natureOf('x^2 - y^2 = 0')).toBe('lines');
		expect(natureOf('x^2 = 0')).toBe('line');
	});

	it('une lettre sans valeur (a) : la nature ne se décide pas', () => {
		expect(natureOf('x^2 + y^2 = a^2')).toBeNull();
	});
});

// =============================================================================
// Les dégénérées
// =============================================================================

describe('degenerateConicKind', () => {
	it('sépare le vide, le point, une droite et deux droites', () => {
		// x² + y² + 1 = 0
		expect(degenerateConicKind(1, 0, 1, 0, 0, 1)).toBe('empty');
		// x² + y² = 0
		expect(degenerateConicKind(1, 0, 1, 0, 0, 0)).toBe('point');
		// x² − 4 = 0
		expect(degenerateConicKind(1, 0, 0, 0, 0, -4)).toBe('lines');
		// x² = 0
		expect(degenerateConicKind(1, 0, 0, 0, 0, 0)).toBe('line');
		// x² + 1 = 0
		expect(degenerateConicKind(1, 0, 0, 0, 0, 1)).toBe('empty');
		// x² − y² = 0
		expect(degenerateConicKind(1, 0, -1, 0, 0, 0)).toBe('lines');
	});

	it('rend null pour une conique qui n’est pas dégénérée', () => {
		expect(degenerateConicKind(1, 0, 1, 0, 0, -1)).toBeNull();
	});
});

// =============================================================================
// La forme (ce qui choisit l'objet de la figure, dans courbe() comme dans l'atelier)
// =============================================================================

describe('curveShapeOf', () => {
	it('suit l’ordre de courbe() : droite, puis y = f(x), puis conique, puis implicite', () => {
		expect(curveShapeOf(equationExpression(equation('y = 3x - 2'))).kind).toBe('line');
		expect(curveShapeOf(equationExpression(equation('y = x^2'))).kind).toBe('function');
		expect(curveShapeOf(equationExpression(equation('x^2 + y^2 = 1'))).kind).toBe('quadratic');
		expect(curveShapeOf(equationExpression(equation('y^2 = x^3 - x'))).kind).toBe('implicit');
	});

	it('sans droite permise (restriction « sur »), y = 2x est une fonction', () => {
		const shape = curveShapeOf(equationExpression(equation('y = 2x')), { allowLine: false });
		expect(shape.kind).toBe('function');
	});

	it('une lettre étrangère (un curseur) reste un coefficient', () => {
		const shape = curveShapeOf(equationExpression(equation('x^2 + y^2 = a^2')));
		expect(shape.kind).toBe('quadratic');
	});
});
