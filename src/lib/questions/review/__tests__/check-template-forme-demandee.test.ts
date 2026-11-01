/**
 * Vérification d'un modèle qui demande la forme de la réponse finale
 * (D4, lot 5e du chantier simplify-carte, Q36-Q37 du journal)
 *
 * - Q36 : `finalForm` refusé sur une intégrale à bornes (sa réponse est un nombre).
 * - Q37 (E1) : quand une case exige une forme (`requiredForm`), la réponse sur
 *   laquelle finit la correction passe le juge de cette forme, à chaque tirage —
 *   avec ou sans `finalForm` (David, 2026-10-24).
 */

import { describe, it, expect } from 'vitest';
import { checkTemplate, formatCheckReport } from '../check-template';
import { validateTemplate } from '$lib/questions/validators/template-validator';
import type { FinalForm, QuestionTemplate, RequiredForm } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

/** f(x) = ax² − 2ax, f′(x) = 2a(x − 1) ; une case qui exige (ou non) un produit. */
function derivativeTemplate(finalForm?: FinalForm, requiredForm?: RequiredForm): QuestionTemplate {
	return {
		id: 'tmp',
		title: 'Dérivée factorisée',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					'Donner la dérivée de $$f(x) = {{a}}x^2 - {{eval:2*a}}x$$ sous forme factorisée : $?$'
				),
				variables: [{ name: 'a', expression: '2..5' }],
				blanks: [
					{
						expectedAnswer: '{{eval:2*a}}(x-1)',
						...(requiredForm !== undefined && { requiredForm })
					}
				],
				correction: {
					generatedSteps: {
						kind: 'differentiate',
						expression: '{{a}}x^2 - {{eval:2*a}}x',
						...(finalForm !== undefined && { finalForm })
					}
				}
			}
		],
		grades: ['1_SPE'],
		theme: 'Dérivation',
		domain: 'Dériver',
		level: 1,
		testSpecs: [
			{
				description: 'bonne réponse, factorisée',
				variables: { a: '3' },
				answers: ['6(x-1)'],
				expected: { status: 'correct' }
			}
		]
	};
}

function definiteIntegralTemplate(finalForm?: FinalForm): QuestionTemplate {
	return {
		id: 'tmp',
		title: 'Intégrale',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Calculer $$\\int_0^1 {{a}}x\\,dx$$ : $?$'),
				variables: [{ name: 'a', expression: '2..5' }],
				blanks: [{ expectedAnswer: '{{eval:a/2}}' }],
				correction: {
					generatedSteps: {
						kind: 'integrate',
						expression: '{{a}}x',
						definite: { lower: '0', upper: '1' },
						...(finalForm !== undefined && { finalForm })
					}
				}
			}
		],
		grades: ['T_SPE'],
		theme: 'Intégration',
		domain: 'Intégrer',
		level: 1,
		testSpecs: [
			{
				description: 'bonne réponse',
				variables: { a: '4' },
				answers: ['2'],
				expected: { status: 'correct' }
			}
		]
	};
}

/**
 * Deux cases : f′(x) factorisée (produit exigé), puis f′(1) = 0 avec sa propre
 * forme exigée (une fraction) — la correction ne répond qu'à la première (revue).
 */
function twoBlanksTemplate(): QuestionTemplate {
	const template = derivativeTemplate('factorisee', 'product');
	const [variation] = template.variations;
	return {
		...template,
		variations: [
			{
				...variation,
				statement: templateMarkdown(
					"Pour $$f(x) = {{a}}x^2 - {{eval:2*a}}x$$ : $f'(x) = ?$ et $f'(2) = ?$"
				),
				blanks: [
					...(variation.blanks ?? []),
					{ expectedAnswer: '{{eval:2*a}}', requiredForm: 'fraction' }
				]
			}
		],
		testSpecs: [
			{
				description: 'bonne réponse',
				variables: { a: '3' },
				answers: ['6(x-1)', '6'],
				expected: { status: 'correct' }
			}
		]
	};
}

// ============================================================================
// Q36 — intégrale à bornes
// ============================================================================

describe('Q36 : finalForm refusé sur une intégrale à bornes', () => {
	it('sans finalForm : rien à redire', () => {
		expect(validateTemplate(definiteIntegralTemplate())).toEqual([]);
	});

	it('avec finalForm : erreur de structure, modèle non importable', () => {
		const template = definiteIntegralTemplate('factorisee');
		expect(validateTemplate(template).join()).toMatch(/finalForm.*definite/);
		const report = checkTemplate(template, { instances: 2 });
		expect(report.passed).toBe(false);
	});
});

// ============================================================================
// Q37 — garde E1
// ============================================================================

describe('Q37 : la correction passe le juge de la forme exigée (E1)', () => {
	it('factorisée demandée, produit exigé : importable', () => {
		const report = checkTemplate(derivativeTemplate('factorisee', 'product'), { instances: 5 });
		expect(report.reasons).toEqual([]);
		expect(report.passed).toBe(true);
		expect(report.correctionForm.checked).toBe(5);
	});

	it('développée demandée, produit exigé : non importable, la réponse de la correction citée', () => {
		const report = checkTemplate(derivativeTemplate('developpee', 'product'), { instances: 5 });
		expect(report.passed).toBe(false);
		expect(report.correctionForm.checked).toBe(5);
		expect(report.correctionForm.failures).toHaveLength(5);
		expect(report.reasons.join()).toMatch(
			/5 tirage\(s\) sur 5 où la correction n’a pas la forme exigée de l’élève/
		);
		// a = 2 au premier tirage ou non : la ligne cite une forme développée `…x − …`
		expect(formatCheckReport(report)).toMatch(/correction : \d+ x - \d+/);
	});

	it('deux cases : seule la case dont la valeur est celle de la correction est jugée (revue)', () => {
		const report = checkTemplate(twoBlanksTemplate(), { instances: 3 });
		expect(report.correctionForm.failures).toEqual([]);
		expect(report.correctionForm.checked).toBe(3);
	});

	it('forme exigée au niveau de la variation : jugée une seule fois, comme l’élève (revue)', () => {
		const template = derivativeTemplate('developpee');
		template.variations[0] = { ...template.variations[0], requiredForm: 'product' };
		const report = checkTemplate(template, { instances: 2 });
		expect(report.correctionForm.failures).toHaveLength(2);
		expect(report.correctionForm.failures.every((f) => f.errors.length === 1)).toBe(true);
	});

	it('sans forme exigée : rien n’est vérifié, importable', () => {
		const report = checkTemplate(derivativeTemplate('developpee'), { instances: 3 });
		expect(report.passed).toBe(true);
		expect(report.correctionForm.checked).toBe(0);
	});

	it('forme exigée sans finalForm : vérifiée aussi, la forme par défaut développée est refusée', () => {
		// f′ par défaut = 2ax − 2a : un produit exigé la refuse (David, 2026-10-24)
		const report = checkTemplate(derivativeTemplate(undefined, 'product'), { instances: 3 });
		expect(report.correctionForm.checked).toBe(3);
		expect(report.correctionForm.failures).toHaveLength(3);
		expect(report.passed).toBe(false);
	});
});
