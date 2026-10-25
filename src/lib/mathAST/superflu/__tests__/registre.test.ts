/**
 * Registre des règles de superflu : une fiche par règle, lue par le juge, l'éditeur
 * de modèles, les messages à l'élève et le schéma des modèles.
 *
 * Chantier : docs/archive/wip/simplify-carte-progress.md § 46-47.
 */

import { describe, it, expect } from 'vitest';
import { SUPERFLU_RULES } from '../rules';
import { reduceRadicalsAST } from '../transforms';
import { CONSTRAINT_IDS, CONSTRAINT_LABELS } from '../../../questions/constraint-constants';
import { CONSTRAINT_FEEDBACK } from '../../../questions/feedback';
import { constraintIdSchema, constraintsSchema } from '../../../questions/template-schema';
import { parseLatexSafe } from '../../parser';
import { toLatex } from '../../latex-generator';

describe('registre des règles de superflu', () => {
	it('range les règles sur la chaîne tapée, puis les règles sur l’arbre dans l’ordre du juge', () => {
		expect(SUPERFLU_RULES.map((rule) => rule.id)).toEqual([
			'zeros',
			'spaces',
			'reducedRadicals',
			'reducedFractions',
			'factorZero',
			'nullTerms',
			'brackets',
			'signs',
			'factorOne',
			'products'
		]);
	});

	it('seules les règles sur l’arbre portent une transformation', () => {
		const withTransform = SUPERFLU_RULES.filter((rule) => 'transform' in rule).map(
			(rule) => rule.id
		);
		expect(withTransform).not.toContain('zeros');
		expect(withTransform).not.toContain('spaces');
		expect(withTransform).toHaveLength(8);
	});

	it.each(SUPERFLU_RULES.map((rule) => [rule.id, rule] as const))(
		'%s : réglable, libellé et message tirés de sa fiche',
		(id, rule) => {
			expect(CONSTRAINT_IDS).toContain(id);
			expect(CONSTRAINT_LABELS[id]).toBe(rule.label);
			expect(CONSTRAINT_FEEDBACK[id]).toEqual(rule.feedback);
			expect(constraintIdSchema.safeParse(id).success).toBe(true);
			expect(constraintsSchema.safeParse({ [id]: 'strict' }).success).toBe(true);
		}
	);

	it('le schéma refuse toujours une contrainte inconnue', () => {
		expect(constraintsSchema.strict().safeParse({ inconnue: 'strict' }).success).toBe(false);
	});
});

describe('racines : même extraction de carré que tidy', () => {
	it.each([
		['\\sqrt{12}', '2\\sqrt{3}'],
		['3\\sqrt{8}', '6\\sqrt{2}'],
		['\\sqrt{4}', '2'],
		['\\sqrt{72}', '6\\sqrt{2}'],
		['\\sqrt{3}', '\\sqrt{3}'],
		['\\sqrt{x}', '\\sqrt{x}'],
		['\\sqrt[3]{16}', '\\sqrt[3]{16}']
	])('%s → %s', (input, output) => {
		const ast = parseLatexSafe(input).ast;
		if (!ast) throw new Error(input);
		const expected = parseLatexSafe(output).ast;
		if (!expected) throw new Error(output);
		expect(toLatex(reduceRadicalsAST(ast))).toBe(toLatex(expected));
	});
});
