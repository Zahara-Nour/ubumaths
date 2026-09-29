/**
 * Contrainte de forme rebranchée, défaut `strict` (ADR 0013)
 * ==========================================================
 *
 * En mode exact, la comparaison de fin de pipeline (réponse retouchée ≠ attendue
 * retouchée) est gouvernée par `constraints.form` : `strict` (défaut) → mauvaise
 * forme, `warn` → juste avec avertissement, `off` → juste sans remarque.
 * Depuis le 2026-02-24, le réglage n'était plus lu (mesuré : même verdict pour
 * absent / warn / off / strict).
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import { generateInstanceWithFixedVariables } from '$lib/questions/generator/test-instance-builder';
import type { ConstraintMode, QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Question réelle #623 « Deviner le terme général » : attendu `a×b^n`
const SUITE_TEMPLATE = JSON.parse(readFileSync('docs/relecture/suites/623.json', 'utf-8'))
	.template as QuestionTemplate;

function suiteInstance(form?: ConstraintMode): QuestionInstance {
	const template: QuestionTemplate = {
		...SUITE_TEMPLATE,
		id: 'suite-623',
		options: {
			...SUITE_TEMPLATE.options,
			constraints: { ...SUITE_TEMPLATE.options?.constraints, ...(form && { form }) }
		}
	};
	const result = generateInstanceWithFixedVariables(template, { a: '3', b: '2' }, 0);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

function simpleInstance(expectedAnswer: string, form?: ConstraintMode): QuestionInstance {
	return {
		templateId: 'form-constraint',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [{ expectedAnswer }],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(form && { options: { constraints: { form } } })
	};
}

describe('Contrainte de forme : défaut strict (rien ne change sans réglage)', () => {
	it('suite #623 : 6×2^{n−1} pour 3×2^n → mauvaise forme', () => {
		const result = validateAnswer(['6\\times2^{n-1}'], suiteInstance());
		expect(result.status).toBe('bad_form');
		expect(result.isCorrect).toBe(false);
	});

	it('calcul : 400+80 pour 480 → mauvaise forme', () => {
		const result = validateAnswer(['400+80'], simpleInstance('480'));
		expect(result.status).toBe('bad_form');
		expect(result.isCorrect).toBe(false);
	});

	it('développer : l’expression de départ (x+1)(x+2) pour x²+3x+2 → mauvaise forme', () => {
		const result = validateAnswer(['(x+1)(x+2)'], simpleInstance('x^2+3x+2'));
		expect(result.status).toBe('bad_form');
	});

	it('form: strict explicite → même verdict que le défaut', () => {
		expect(validateAnswer(['6\\times2^{n-1}'], suiteInstance('strict')).status).toBe('bad_form');
	});
});

describe('Contrainte de forme : warn et off pris en compte', () => {
	it('suite #623, form: warn → juste avec avertissement de forme', () => {
		const result = validateAnswer(['6\\times2^{n-1}'], suiteInstance('warn'));
		expect(result.status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
		expect(result.constraintViolations).toContainEqual(
			expect.objectContaining({ constraint: 'form', severity: 'warning' })
		);
	});

	it('suite #623, form: off → juste sans remarque', () => {
		const result = validateAnswer(['6\\times2^{n-1}'], suiteInstance('off'));
		expect(result.status).toBe('correct');
		expect(result.isCorrect).toBe(true);
	});

	it('form: warn ne rend pas juste une valeur fausse (5×2^n pour 3×2^n)', () => {
		const result = validateAnswer(['5\\times2^{n}'], suiteInstance('warn'));
		expect(result.isCorrect).toBe(false);
	});

	it('form: off ne rend pas juste une valeur fausse', () => {
		expect(validateAnswer(['5\\times2^{n}'], suiteInstance('off')).isCorrect).toBe(false);
	});

	it('la bonne forme reste juste sans remarque en warn', () => {
		const result = validateAnswer(['3\\times2^{n}'], suiteInstance('warn'));
		expect(result.status).toBe('correct');
	});
});
