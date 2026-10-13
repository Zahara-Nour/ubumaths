/**
 * Le premier degré écrit ≤ et ≥ comme le reste du rendu : `\leqslant`,
 * `\geqslant` (`RELATION_MAP`, celui de `toLatex`).
 *
 * ⚠️ Ses blocs alignés écrivaient `\leq`/`\geq` (`relToLatex`) alors que les
 * lignes simples, rendues par `toLatex`, écrivent `\leqslant`/`\geqslant` :
 * deux dessins différents du même symbole dans une même correction
 * (relevé le 2026-10-13, en harmonisant le second degré).
 */

import { describe, it, expect } from 'vitest';
import { generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { isRelation } from '../../guards';
import { LinearEquationRenderer } from '../linear-renderer';
import type { RelationNode } from '../../types';

function ast(source: string): RelationNode {
	const node = parseCustomSafe(source).ast;
	if (node === null || !isRelation(node)) throw new Error(`pas une relation : ${source}`);
	return node;
}

function renderedLatex(source: string, level: 'college' | 'lycee'): string {
	const steps = generateInequalitySteps(ast(source), { level });
	return new LinearEquationRenderer()
		.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
		.map((s) => s.expressionLatex)
		.join('\n');
}

describe.each(['college', 'lycee'] as const)('inéquation du premier degré (%s)', (level) => {
	it.each(['-2x+1>=5', '3x-4<=2x+1'])(
		'%s : \\geqslant / \\leqslant dans les blocs alignés',
		(src) => {
			const latex = renderedLatex(src, level);

			expect(latex).toMatch(/&\\(geqslant|leqslant)/);
			expect(latex).not.toMatch(/\\(geq|leq)(?!slant)/);
		}
	);
});
