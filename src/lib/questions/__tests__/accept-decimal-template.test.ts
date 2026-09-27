/**
 * `acceptDecimal` côté template : propagation par le générateur, schéma Zod
 * (souple et strict) et specs de test (#583, #589).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import type { QuestionTemplate, QuestionVariation } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** #589 : racine de ax+b, attendu `-\dfrac{b}{a}` */
function rootTemplate(
	variation: Partial<QuestionVariation> = {},
	shared?: QuestionTemplate['shared']
): QuestionTemplate {
	return {
		id: 'test-accept-decimal',
		title: 'Racine d’une fonction affine',
		status: 'draft',
		shared,
		variations: [
			{
				statement: templateMarkdown('Racine de $${{a}}x+{{b}}$$ : $?$'),
				variables: [
					{ name: 'a', expression: '5' },
					{ name: 'b', expression: '9' }
				],
				blanks: [{ expectedAnswer: '-\\dfrac{{{b}}}{{{a}}}', acceptDecimal: true }],
				...variation
			}
		],
		grades: ['2nde'],
		theme: 'Fonctions',
		domain: 'Affines',
		level: 1
	};
}

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

describe('acceptDecimal — propagation par le générateur', () => {
	it('recopie le réglage de la case', () => {
		const result = generateInstance(rootTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].acceptDecimal).toBe(true);
	});

	it('hérite de blankDefaults partagé', () => {
		const template = rootTemplate(
			{ blanks: [{ expectedAnswer: '-\\dfrac{{{b}}}{{{a}}}' }] },
			{ blankDefaults: { acceptDecimal: true } }
		);
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].acceptDecimal).toBe(true);
	});

	it('absent : aucune clé sur la case générée', () => {
		const template = rootTemplate({ blanks: [{ expectedAnswer: '-\\dfrac{{{b}}}{{{a}}}' }] });
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0]).not.toHaveProperty('acceptDecimal');
	});
});

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

describe('acceptDecimal — schémas Zod', () => {
	it('schéma strict : accepte la clé sur la case et dans blankDefaults', () => {
		const { id: _id, ...withoutId } = rootTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const withDefaults = {
			...withoutId,
			variations: [{ ...withoutId.variations[0], blankDefaults: { acceptDecimal: true } }]
		};
		expect(questionTemplateSchema.safeParse(withDefaults).success).toBe(true);
	});

	it('schéma strict : refuse une valeur non booléenne', () => {
		const { id: _id, ...withoutId } = rootTemplate({
			blanks: [{ expectedAnswer: '1', acceptDecimal: 'oui' as unknown as boolean }]
		});
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(false);
	});

	it('schémas souples : conservent la clé', () => {
		expect(blankSchema.parse({ expectedAnswer: '1', acceptDecimal: true }).acceptDecimal).toBe(
			true
		);
		expect(blankDefaultsSchema.parse({ acceptDecimal: true }).acceptDecimal).toBe(true);
	});
});

// ============================================================================
// SPECS DE TEST — #589 de bout en bout
// ============================================================================

describe('acceptDecimal — specs de test (#589)', () => {
	it.each([
		['-1{,}8', 'correct'],
		['-1.8', 'correct'],
		['-\\frac{9}{5}', 'correct'],
		['-1{,}9', 'incorrect']
	] as const)('réponse %s → %s', (answer, status) => {
		const result = runTestSpec(rootTemplate(), {
			description: `réponse ${answer}`,
			variables: { a: '5', b: '9' },
			answers: [answer],
			expected: { status }
		});
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe(status);
	});

	it('sans l’option : -1{,}8 → bad_form', () => {
		const template = rootTemplate({ blanks: [{ expectedAnswer: '-\\dfrac{{{b}}}{{{a}}}' }] });
		const result = runTestSpec(template, {
			description: 'sans option',
			variables: { a: '5', b: '9' },
			answers: ['-1{,}8'],
			expected: { status: 'bad_form' }
		});
		expect(result.actual.status).toBe('bad_form');
	});
});
