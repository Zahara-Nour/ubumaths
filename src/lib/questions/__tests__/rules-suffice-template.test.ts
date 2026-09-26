/**
 * `rulesSuffice` côté template : propagation par le générateur, garde-fou
 * « mode sans règle », schéma Zod strict et specs de test.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { validateTemplate } from '../validators/template-validator';
import { questionTemplateSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import type { QuestionTemplate, QuestionVariation, ValidationRule } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

const DIVISOR_RULES: ValidationRule[] = [
	{ type: 'divisor', dividend: '{{n}}' },
	{ type: 'custom', expression: 'answer != 1' },
	{ type: 'custom', expression: 'answer != {{n}}' }
];

function divisorTemplate(
	variation: Partial<QuestionVariation> = {},
	shared?: QuestionTemplate['shared']
): QuestionTemplate {
	return {
		id: 'test-rules-suffice',
		title: 'Trouver un diviseur',
		status: 'draft',
		shared,
		variations: [
			{
				statement: templateMarkdown('Trouve un diviseur de $${{n}}$$ : $?$'),
				variables: [{ name: 'n', expression: '12' }],
				blanks: [{ expectedAnswer: '2', rulesSuffice: true }],
				validationRules: DIVISOR_RULES,
				...variation
			}
		],
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Diviser',
		level: 1
	};
}

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

describe('rulesSuffice — propagation par le générateur', () => {
	it('recopie le réglage de la case', () => {
		const result = generateInstance(divisorTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].rulesSuffice).toBe(true);
	});

	it('hérite de blankDefaults de la variation', () => {
		const template = divisorTemplate({
			blanks: [{ expectedAnswer: '2' }],
			blankDefaults: { rulesSuffice: true }
		});
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].rulesSuffice).toBe(true);
	});

	it('hérite de blankDefaults partagé', () => {
		const template = divisorTemplate(
			{ blanks: [{ expectedAnswer: '2' }] },
			{ blankDefaults: { rulesSuffice: true } }
		);
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].rulesSuffice).toBe(true);
	});

	it('absent par défaut', () => {
		const template = divisorTemplate({ blanks: [{ expectedAnswer: '2' }] });
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].rulesSuffice).toBeUndefined();
	});
});

// ============================================================================
// GARDE-FOU : LE MODE SANS RÈGLE
// ============================================================================

describe('rulesSuffice — garde-fou « aucune règle »', () => {
	it('validateTemplate refuse le mode sans règle', () => {
		const template = divisorTemplate({ validationRules: undefined });
		expect(validateTemplate(template).join(' ')).toMatch(/rulesSuffice/);
	});

	it('validateTemplate accepte des règles partagées', () => {
		const template = divisorTemplate(
			{ validationRules: undefined },
			{ validationRules: DIVISOR_RULES }
		);
		expect(validateTemplate(template)).toEqual([]);
	});

	it('validateTemplate accepte des règles sur la case elle-même', () => {
		const template = divisorTemplate({
			validationRules: undefined,
			blanks: [{ expectedAnswer: '2', rulesSuffice: true, validationRules: DIVISOR_RULES }]
		});
		expect(validateTemplate(template)).toEqual([]);
	});
});

// ============================================================================
// SCHÉMA ZOD STRICT (éditeur JSON)
// ============================================================================

describe('rulesSuffice — schéma strict', () => {
	const { id: _id, ...withoutId } = divisorTemplate();

	it('accepte rulesSuffice sur une case et dans blankDefaults', () => {
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const withDefaults = {
			...withoutId,
			variations: [
				{
					...withoutId.variations[0],
					blanks: [{ expectedAnswer: '2' }],
					blankDefaults: { rulesSuffice: true }
				}
			]
		};
		expect(questionTemplateSchema.safeParse(withDefaults).success).toBe(true);
	});

	it('refuse rulesSuffice sans aucune règle', () => {
		const noRules = {
			...withoutId,
			variations: [{ ...withoutId.variations[0], validationRules: undefined }]
		};
		const result = questionTemplateSchema.safeParse(noRules);
		expect(result.success).toBe(false);
		expect(JSON.stringify(result.error?.issues)).toMatch(/rulesSuffice/);
	});
});

// ============================================================================
// SPECS DE TEST (même validateur que l'élève)
// ============================================================================

describe('rulesSuffice — specs de test', () => {
	const template = divisorTemplate();

	it.each([
		['2', 'correct'],
		['6', 'correct'],
		['5', 'incorrect'],
		['1', 'incorrect'],
		['12', 'incorrect']
	] as const)('réponse %s → %s', (answer, status) => {
		const result = runTestSpec(template, {
			description: `réponse ${answer}`,
			variables: { n: '12' },
			answers: [answer],
			expected: { status }
		});
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe(status);
		expect(result.passed).toBe(true);
	});
});
