/**
 * La relation d'une inéquation du second degré, ligne par ligne.
 *
 * ⚠️ Deux défauts mesurés le 2026-10-13 sur `2x^2<2`, visibles dans l'atelier
 * (`.résoudre`) et dans les corrections générées :
 *
 * 1. L'étape `standardize` réécrivait l'inéquation en ÉQUATION :
 *    `2x^2 &< 2 \\ 2x^2 - 2 &= 0`. Le `= 0` se propageait aux étapes suivantes
 *    (`2x^2 - 2 = 0`, Δ > 0 affiché sur `2x^2 - 4x - 1 = 0`), et
 *    `isolate-square` passait de `= 0` à `x^2 < 1`.
 * 2. Les blocs alignés écrivaient l'opérateur brut : `x^2 &>= 1` au lieu de
 *    `\geqslant`, le symbole que `toLatex` donne partout ailleurs dans le
 *    même rendu (étape `identify-equation`).
 *
 * Les coefficients sont différents de 1 exprès : `a = 1` masque les divisions.
 * Le niveau ne change rien au second degré (le collège est relevé au lycée) :
 * on vérifie les deux, puisque l'atelier génère au niveau collège.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { isRelation } from '../../guards';
import { QuadraticEquationRenderer } from '../quadratic-renderer';
import type { RelationNode } from '../../types';

/** Parse une relation, en affirmant que le parseur rend bien une relation. */
function ast(source: string): RelationNode {
	const node = parseCustomSafe(source).ast;
	if (node === null || !isRelation(node)) throw new Error(`pas une relation : ${source}`);
	return node;
}

type Level = 'lycee' | 'college';

/** Le LaTeX rendu de chaque étape, sous la forme `règle → LaTeX`. */
function renderedLines(source: string, level: Level): readonly string[] {
	const relation = ast(source);
	const steps =
		relation.relation === '='
			? generateEquationSteps(relation, { level: 'lycee' })
			: generateInequalitySteps(relation, { level });
	return new QuadraticEquationRenderer()
		.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
		.map((s) => `${s.rule} → ${s.expressionLatex}`);
}

/** Bloc aligné de deux lignes, tel que l'écrit le rendu. */
function aligned(first: string, second: string): string {
	return `\\begin{aligned}   ${first} \\\\   ${second} \\end{aligned}`;
}

const LEVELS: readonly Level[] = ['lycee', 'college'];

describe.each(LEVELS)('inéquation du second degré : la relation à chaque ligne (%s)', (level) => {
	it('2x^2 < 2 : la forme standard garde « < 0 », puis x^2 < 1', () => {
		expect(renderedLines('2x^2<2', level)).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('2x^2 &< 2', '2x^2 - 2 &< 0')}`,
				'recognize-no-linear-term → 2x^2 - 2 < 0',
				`isolate-square → ${aligned('2x^2 - 2 &< 0', 'x^2 &< 1')}`
			])
		);
	});

	it('3x^2 ≥ 12 : \\geqslant à chaque ligne, jamais « >= » ni « = 0 »', () => {
		const lines = renderedLines('3x^2>=12', level);

		expect(lines).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('3x^2 &\\geqslant 12', '3x^2 - 12 &\\geqslant 0')}`,
				`isolate-square → ${aligned('3x^2 - 12 &\\geqslant 0', 'x^2 &\\geqslant 4')}`
			])
		);
		expect(lines.join('\n')).not.toMatch(/>=|&= 0/);
	});

	it('-2x^2 ≥ -8 (a < 0, b = 0) : la division par a retourne le sens, en \\leqslant', () => {
		expect(renderedLines('-2x^2>=-8', level)).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('-2x^2 &\\geqslant -8', '-2x^2 + 8 &\\geqslant 0')}`,
				`isolate-square → ${aligned('-2x^2 + 8 &\\geqslant 0', 'x^2 &\\leqslant 4')}`
			])
		);
	});

	it('-2x^2 + 8 > 0 (déjà standard, a < 0) : le sens retourné, déjà juste', () => {
		expect(renderedLines('-2x^2+8>0', level)).toContain(
			`isolate-square → ${aligned('-2x^2 + 8 &> 0', 'x^2 &< 4')}`
		);
	});

	it('2x^2 + 3x ≥ 0 (c = 0) : la factorisation garde \\geqslant', () => {
		expect(renderedLines('2x^2+3x>=0', level)).toContain(
			`factor-common-x → ${aligned('2x^2 + 3x &\\geqslant 0', 'x \\left( 2x + 3\\right) &\\geqslant 0')}`
		);
	});

	it('2x^2 > 3x (c = 0, membre de droite non nul) : « > 0 » jusqu’à la factorisation', () => {
		expect(renderedLines('2x^2>3x', level)).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('2x^2 &> 3x', '2x^2 - 3x &> 0')}`,
				'recognize-no-constant-term → 2x^2 - 3x > 0',
				`factor-common-x → ${aligned('2x^2 - 3x &> 0', 'x \\left( 2x - 3\\right) &> 0')}`
			])
		);
	});

	it('2x^2 - x ≥ 3x + 1 (Δ > 0) : la forme standard et le signe de Δ portent \\geqslant', () => {
		const lines = renderedLines('2x^2-x>=3x+1', level);

		expect(lines).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('2x^2 - x &\\geqslant 3x + 1', '2x^2 - 4x - 1 &\\geqslant 0')}`,
				'discriminant-positive → 2x^2 - 4x - 1\\geqslant 0'
			])
		);
		expect(lines.join('\n')).not.toMatch(/>=|- 1 = 0|&= 0/);
	});

	it('4x^2 + 1 ≤ 4x (Δ = 0) : \\leqslant, pas « = 0 »', () => {
		expect(renderedLines('4x^2+1<=4x', level)).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('4x^2 + 1 &\\leqslant 4x', '4x^2 - 4x + 1 &\\leqslant 0')}`,
				'discriminant-zero → 4x^2 - 4x + 1\\leqslant 0'
			])
		);
	});

	it('2x^2 + 1 > 2x (Δ < 0) : « > 0 », pas « = 0 »', () => {
		expect(renderedLines('2x^2+1>2x', level)).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('2x^2 + 1 &> 2x', '2x^2 - 2x + 1 &> 0')}`,
				'discriminant-negative → 2x^2 - 2x + 1 > 0'
			])
		);
	});

	it('-3x^2 - 1 < 0 : le sens retourné, déjà juste', () => {
		expect(renderedLines('-3x^2-1<0', level)).toContain(
			`isolate-square → ${aligned('-3x^2 - 1 &< 0', 'x^2 &> -\\dfrac{1}{3}')}`
		);
	});
});

describe('une équation du second degré ne change pas', () => {
	it('2x^2 = 8 : « = 0 » après la mise en forme standard', () => {
		expect(renderedLines('2x^2=8', 'lycee')).toEqual(
			expect.arrayContaining([
				`standardize → ${aligned('2x^2 &= 8', '2x^2 - 8 &= 0')}`,
				`isolate-square → ${aligned('x^2 - 4 &= 0', 'x^2 &= 4')}`
			])
		);
	});

	it('2x^2 - x = 3x + 1 : « = 0 » après la mise en forme standard', () => {
		expect(renderedLines('2x^2-x=3x+1', 'lycee')).toContain(
			`standardize → ${aligned('2x^2 - x &= 3x + 1', '2x^2 - 4x - 1 &= 0')}`
		);
	});
});

describe('l’explication de « On isole le carré » reprend la relation', () => {
	/** L'explication rendue de l'étape `isolate-square`. */
	function isolateExplanation(source: string): string | undefined {
		const relation = ast(source);
		const steps =
			relation.relation === '='
				? generateEquationSteps(relation, { level: 'lycee' })
				: generateInequalitySteps(relation, { level: 'lycee' });
		return new QuadraticEquationRenderer()
			.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
			.find((s) => s.rule === 'isolate-square')?.explanation;
	}

	it('2x^2 < 2 : division par un positif, l’inéquation est préservée', () => {
		expect(isolateExplanation('2x^2<2')).toBe(
			'On transpose le terme constant, puis on divise les deux membres par $2$ pour isoler $x^2$. $2$ est positif, donc l’inéquation est préservée : $x^2 < 1$.'
		);
	});

	it('-2x^2 ≥ -8 : division par un négatif, le sens est retourné', () => {
		expect(isolateExplanation('-2x^2>=-8')).toBe(
			'On transpose le terme constant, puis on divise les deux membres par $-2$ pour isoler $x^2$. Comme $-2$ est négatif, l’opérateur de l’inéquation est retourné (changement de sens : < devient >, ≤ devient ≥, etc.) : $x^2\\leqslant 4$.'
		);
	});

	it('2x^2 = 8 : l’explication d’une équation ne change pas', () => {
		expect(isolateExplanation('2x^2=8')).toBe(
			'En divisant par a et en transposant, on obtient x² = −c / a.'
		);
	});
});
