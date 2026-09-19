/**
 * La mise en facteur commun doit se DIRE en français.
 *
 * ⚠️ Les deux règles `common-factor-*` ont été ajoutées sans leurs
 * descriptions. Mesuré : l'élève lisait
 *
 *   titre       : « Règle: common-factor-bare-term »
 *   explication : (vide)
 *   catégorie   : « autre »
 *
 * — le nom interne de la règle, en anglais, avec un deux-points collé. Le
 * défaut ne s'était pas vu parce que l'intention `factoriser` n'était
 * atteignable depuis aucune interface : la commande `.factoriser` l'ouvre, et
 * la met du même coup sous les yeux des élèves.
 */

import { describe, it, expect } from 'vitest';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { PedagogicalSimplifyRenderer } from '../renderer';
import { categorizeRule } from '../intent-rules';
import { getPedagogicalSimplifyRuleDescription } from '../descriptions-fr';
import { parseCustomSafe } from '../../parser/custom';
import type { SchoolLevel } from '../../common/step-renderer-base';

const RULES = ['common-factor-products', 'common-factor-bare-term'] as const;

function factorise(expression: string, schoolLevel: SchoolLevel = 'lycee') {
	const ast = parseCustomSafe(expression).ast;
	expect(ast, `« ${expression} » ne se lit pas`).toBeDefined();
	const result = generatePedagogicalSimplifySteps(ast!, {
		intent: 'factoriser',
		schoolLevel,
		verbosity: 'detailed'
	});
	return new PedagogicalSimplifyRenderer().renderAll(result.steps, {
		schoolLevel,
		verbosity: 'detailed'
	});
}

describe('la règle est rangée avec les factorisations', () => {
	it.each(RULES)('%s est une factorisation, pas « autre »', (rule) => {
		expect(categorizeRule(rule)).toBe('factorisation');
	});
});

describe('la description neutre est en français', () => {
	it.each(RULES)('%s ne rend plus son nom interne', (rule) => {
		const description = getPedagogicalSimplifyRuleDescription(rule);

		expect(description).not.toContain(rule);
		expect(description).not.toContain('Règle');
		expect(description).toContain('facteur commun');
	});
});

describe('ce que l’élève lit', () => {
	it('un facteur commun écrit dans les deux termes', () => {
		// x·sin(x) + 2·sin(x) → (x + 2)sin(x)
		const [step] = factorise('x*sin(x)+2*sin(x)');

		expect(step.rule).toBe('common-factor-products');
		expect(step.title).toBe('On met le facteur commun en évidence');
		expect(step.explanation).toContain('facteur commun');
	});

	it('un facteur commun dont l’un des termes est nu', () => {
		// exp(x) + x·exp(x) → (x + 1)exp(x)
		const [step] = factorise('exp(x)+x*exp(x)');

		expect(step.rule).toBe('common-factor-bare-term');
		expect(step.title).toBe('On met le facteur commun en évidence');
		// ⚠️ C'est LÀ qu'un élève décroche : pourquoi un 1 apparaît-il ?
		expect(step.explanation).toContain('1');
	});

	it('au collège, la phrase est plus simple qu’au lycée', () => {
		const college = factorise('x*sin(x)+2*sin(x)', 'college')[0];
		const lycee = factorise('x*sin(x)+2*sin(x)', 'lycee')[0];

		expect(college.title).not.toBe(lycee.title);
		expect(college.title).not.toContain('common-factor');
	});

	it.each(['primaire', 'college', 'lycee', 'superieur'] as const)(
		'aucun niveau ne laisse fuir le nom interne (%s)',
		(schoolLevel) => {
			const [step] = factorise('exp(x)+x*exp(x)', schoolLevel);

			expect(step.title).not.toContain('common-factor');
			expect(step.explanation ?? '').not.toContain('common-factor');
		}
	);
});
