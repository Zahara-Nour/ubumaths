/**
 * La première étape nomme l'inconnue de la résolution, pas toujours x.
 *
 * ⚠️ `.résoudre 3 = 2t ; t` annonçait « On va isoler x étape par étape »,
 * puis isolait t.
 */

import { describe, it, expect } from 'vitest';
import { LinearEquationRenderer } from '../linear-renderer';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';

function firstExplanation(latex: string, variable: string): string {
	const relation = parseLatex(latex) as RelationNode;
	const steps =
		relation.relation === '='
			? generateEquationSteps(relation, { level: 'college', variable })
			: generateInequalitySteps(relation, { level: 'college', variable });
	const rendered = new LinearEquationRenderer().renderAll(steps, {
		schoolLevel: 'college',
		verbosity: 'detailed'
	});
	return rendered[0].explanation ?? '';
}

describe('l’étape « Équation du premier degré » nomme l’inconnue', () => {
	it('équation en t', () => {
		expect(firstExplanation('3 = 2t', 't')).toContain('isoler t');
	});

	it('inéquation en t', () => {
		expect(firstExplanation('2t + 1 < 5', 't')).toContain('isole t');
	});

	it('en x, inchangé', () => {
		expect(firstExplanation('2x + 1 = 5', 'x')).toContain('isoler x');
	});
});
