/**
 * Écriture d'un « nombre simple » (chantier correction-cases-unite, PR « nombre simple »)
 * ======================================================================================
 *
 * Décisions de David (journal `docs/wip/correction-cases-unite-progress.md`) :
 * - `(−3)` : un nombre entre parenthèses inutiles est juste mais perfectible
 *   (« Il y a des parenthèses inutiles. »), comme en case positionnelle ;
 * - `.5` et `5,` : refusés (forme), le BIPM (§ 5.4.4) exige un chiffre de chaque
 *   côté du séparateur décimal.
 *
 * Même règle dans les cases sans unité (`rulesSuffice`, arrondis) et dans la
 * partie numérique des cases à unité (`student-calculation.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import {
	isNumberOrNumberFractionLatex,
	isQuantityValueLatex,
	isSimpleNumberLatex
} from '$lib/mathAST/cosmetic-transforms';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

const FORM_MESSAGE = "Ta réponse n'est pas écrite sous la forme demandée.";
const BRACKETS_MESSAGE = 'Il y a des parenthèses inutiles.';

function createInstance(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'test-nombre-simple',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['5'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

/** Case « la règle suffit » dont la règle fixe la valeur */
function rulesBlank(value: string): InstanceBlank {
	return {
		expectedAnswer: '0',
		type: 'math',
		rulesSuffice: true,
		validationRules: [{ type: 'custom', expression: `answer == ${value}` }]
	};
}

/** Case à arrondi au dixième */
function roundingBlank(expectedAnswer: string): InstanceBlank {
	return { expectedAnswer, type: 'math', precision: { type: 'decimal', digits: 1 } };
}

function submit(latex: string, blank: InstanceBlank) {
	return validateAnswer([latex], createInstance(blank), [latex]);
}

// ============================================================================
// FONCTIONS DE FORME
// ============================================================================

describe('isSimpleNumberLatex — écriture d’un nombre', () => {
	it.each(['3', '-3', '+3', '2{,}5', '-0{,}5', '12\\,500', '0{,}05'])(
		'%s est un nombre simple',
		(latex) => {
			expect(isSimpleNumberLatex(latex)).toBe(true);
		}
	);

	it.each(['(-3)', '\\left(-3\\right)', '(3)', '((-3))', '(+3)', '-(3)', '(3{,}14)'])(
		'%s : nombre entre parenthèses inutiles, encore un nombre simple',
		(latex) => {
			expect(isSimpleNumberLatex(latex)).toBe(true);
			expect(isNumberOrNumberFractionLatex(latex)).toBe(true);
			expect(isQuantityValueLatex(latex)).toBe(true);
		}
	);

	it.each(['.5', '-.5', '{,}5', '5{,}', '5.', '5,'])(
		'%s : un chiffre manque d’un côté du séparateur décimal (BIPM)',
		(latex) => {
			expect(isSimpleNumberLatex(latex)).toBe(false);
			expect(isNumberOrNumberFractionLatex(latex)).toBe(false);
			expect(isQuantityValueLatex(latex)).toBe(false);
		}
	);

	it.each(['\\frac{.5}{2}', '\\frac{1}{5{,}}', '.5\\times10^{3}'])(
		'%s : même exigence dans une fraction ou une notation scientifique',
		(latex) => {
			expect(isNumberOrNumberFractionLatex(latex)).toBe(false);
			expect(isQuantityValueLatex(latex)).toBe(false);
		}
	);

	it.each(['-(-3)', '(2+1)', '(3)(2)', '(x)', '(3,14)', '(-3,5)'])(
		'%s reste refusé (calcul, lettre, couple)',
		(latex) => {
			expect(isSimpleNumberLatex(latex)).toBe(false);
		}
	);
});

// ============================================================================
// CASE SANS UNITÉ
// ============================================================================

describe('case sans unité — nombre entre parenthèses', () => {
	it.each([
		['(-3)', '-3'],
		['\\left(-3\\right)', '-3'],
		['(3)', '3']
	])('%s pour %s (règle) : juste, parenthèses inutiles', (answer, value) => {
		expect(submit(answer, rulesBlank(value))).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			feedback: BRACKETS_MESSAGE
		});
	});

	it('(-3{,}2) pour −3,2 (arrondi) : juste, parenthèses inutiles', () => {
		expect(submit('(-3{,}2)', roundingBlank('-3.2'))).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			feedback: BRACKETS_MESSAGE
		});
	});
});

describe('case sans unité — séparateur décimal sans chiffre', () => {
	it.each([
		['.5', '0.5'],
		['{,}5', '0.5'],
		['5{,}', '5'],
		['5.', '5']
	])('%s pour %s (règle) : forme refusée', (answer, value) => {
		expect(submit(answer, rulesBlank(value))).toMatchObject({
			isCorrect: false,
			status: 'bad_form',
			feedback: FORM_MESSAGE
		});
	});

	it('.5 pour 0,5 (arrondi) : forme refusée', () => {
		expect(submit('.5', roundingBlank('0.5'))).toMatchObject({
			isCorrect: false,
			status: 'bad_form'
		});
	});

	it('0{,}5 pour 0,5 (règle) : juste, inchangé', () => {
		expect(submit('0{,}5', rulesBlank('0.5'))).toMatchObject({
			isCorrect: true,
			status: 'correct'
		});
	});
});
