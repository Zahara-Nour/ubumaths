/**
 * `acceptCombinatorialNotation` côté modèle : propagation par le générateur,
 * schémas Zod (souple et strict) et specs de bout en bout (2026-10-05).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import type { QuestionTemplate, QuestionVariation } from '../types';
import { templateMarkdown } from '$lib/ubumark';

/** Mains de k cartes parmi 32 : attendu `binom(32, k)` calculé */
function handsTemplate(
	variation: Partial<QuestionVariation> = {},
	shared?: QuestionTemplate['shared']
): QuestionTemplate {
	return {
		id: 'test-accept-combinatorial-notation',
		title: 'Mains de cartes',
		status: 'draft',
		shared,
		variations: [
			{
				statement: templateMarkdown('Mains de ${{k}}$ cartes parmi $32$ : $?$'),
				variables: [{ name: 'k', expression: '5' }],
				blanks: [{ expectedAnswer: '{{eval:binom(32,k)}}', acceptCombinatorialNotation: true }],
				...variation
			}
		],
		grades: ['T_SPE'],
		theme: 'Probabilités',
		domain: 'Dénombrement',
		level: 1
	};
}

describe('acceptCombinatorialNotation — générateur', () => {
	it('recopie le réglage de la case', () => {
		const result = generateInstance(handsTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].acceptCombinatorialNotation).toBe(true);
	});

	it('hérite de blankDefaults partagé', () => {
		const template = handsTemplate(
			{ blanks: [{ expectedAnswer: '{{eval:binom(32,k)}}' }] },
			{ blankDefaults: { acceptCombinatorialNotation: true } }
		);
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].acceptCombinatorialNotation).toBe(true);
	});

	it('absent : aucune clé sur la case générée', () => {
		const template = handsTemplate({ blanks: [{ expectedAnswer: '{{eval:binom(32,k)}}' }] });
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0]).not.toHaveProperty('acceptCombinatorialNotation');
	});
});

describe('acceptCombinatorialNotation — schémas Zod', () => {
	it('schéma strict : accepte la clé sur la case et dans blankDefaults', () => {
		const { id: _id, ...withoutId } = handsTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const withDefaults = {
			...withoutId,
			variations: [
				{ ...withoutId.variations[0], blankDefaults: { acceptCombinatorialNotation: true } }
			]
		};
		expect(questionTemplateSchema.safeParse(withDefaults).success).toBe(true);
	});

	it('schéma strict : refuse une valeur non booléenne', () => {
		const { id: _id, ...withoutId } = handsTemplate({
			blanks: [{ expectedAnswer: '1', acceptCombinatorialNotation: 'oui' as unknown as boolean }]
		});
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(false);
	});

	it('schémas souples : conservent la clé', () => {
		expect(
			blankSchema.parse({ expectedAnswer: '1', acceptCombinatorialNotation: true })
				.acceptCombinatorialNotation
		).toBe(true);
		expect(
			blankDefaultsSchema.parse({ acceptCombinatorialNotation: true }).acceptCombinatorialNotation
		).toBe(true);
	});
});

describe('acceptCombinatorialNotation — specs de bout en bout', () => {
	it.each([
		['201\\,376', 'correct'],
		['\\binom{32}{5}', 'correct'],
		['\\frac{32!}{5!27!}', 'correct'],
		['\\binom{32}{4}', 'incorrect']
	] as const)('réponse %s → %s', (answer, status) => {
		const result = runTestSpec(handsTemplate(), {
			description: `réponse ${answer}`,
			variables: { k: '5' },
			answers: [answer],
			expected: { status }
		});
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe(status);
	});

	it('sans l’option : \\binom{32}{5} → bad_form (calcul non effectué)', () => {
		const template = handsTemplate({ blanks: [{ expectedAnswer: '{{eval:binom(32,k)}}' }] });
		const result = runTestSpec(template, {
			description: 'sans option',
			variables: { k: '5' },
			answers: ['\\binom{32}{5}'],
			expected: { status: 'bad_form' }
		});
		expect(result.actual.status).toBe('bad_form');
	});
});
