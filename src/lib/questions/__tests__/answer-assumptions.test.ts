/**
 * Hypothèses de l'énoncé (ADR 0012) — schéma et validation du modèle
 * ==================================================================
 *
 * `options.answerAssumptions` : { x: 'positive', n: 'natural' }. Vocabulaire
 * fermé, nom de variable = une lettre ASCII ou un nom de lettre grecque, ni
 * `e` ni `i` (constantes pour mathAST), au plus 10, jamais le nom d'une
 * variable TIRÉE du modèle (une hypothèse vise une variable libre de la réponse).
 *
 * Refusé côté éditeur (schéma strict) ET côté serveur (schémas de l'API) :
 * le serveur ne doit ni laisser passer une valeur non vérifiée, ni la
 * supprimer en silence.
 */

import { describe, it, expect } from 'vitest';
import {
	answerAssumptionsSchema,
	assumptionsToRows,
	rowsToAssumptions,
	findAssumptionCollisions,
	formatAnswerAssumptions,
	isSequenceCategory,
	validateAssumptionRows,
	MAX_ANSWER_ASSUMPTIONS
} from '../answer-assumptions';
import { questionTemplateSchema } from '../template-schema';
import { validateTemplate } from '../validators/template-validator';
import { mapDbTemplateToForm, type QuestionTemplate } from '../types';
import {
	createQuestionTemplateSchema,
	updateQuestionTemplateSchema
} from '$lib/server/validation/questions';
import { editedQuestionTemplateSchema } from '$lib/server/validation/migration-review';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

const baseTemplate = {
	title: 'Puissances',
	grades: ['2'],
	theme: 'Algèbre',
	domain: 'Puissances',
	level: 1,
	status: 'published' as const,
	variations: [
		{
			statement: 'Soit $x>0$. Simplifie $x^{{{a}}}x^b$.',
			variables: [{ name: 'a', expression: '{{random:2..5}}' }],
			blanks: [{ expectedAnswer: 'x^{{{a}}+b}' }]
		}
	]
};

function withAssumptions(answerAssumptions: unknown) {
	return { ...baseTemplate, options: { answerAssumptions } };
}

function manyAssumptions(count: number): Record<string, string> {
	const letters = 'bcdfghjklmnopqrstuvwxyz'.split('');
	return Object.fromEntries(letters.slice(0, count).map((l) => [l, 'positive']));
}

function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
	return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []);
}

// ============================================================================
// answerAssumptionsSchema
// ============================================================================

describe('answerAssumptionsSchema', () => {
	it('accepte les cinq hypothèses sur des lettres et des noms grecs', () => {
		const value = {
			x: 'positive',
			y: 'nonnegative',
			theta: 'nonzero',
			n: 'integer',
			k: 'natural'
		};
		expect(answerAssumptionsSchema.parse(value)).toEqual(value);
	});

	it('accepte une majuscule ASCII (X)', () => {
		expect(answerAssumptionsSchema.safeParse({ X: 'positive' }).success).toBe(true);
	});

	it.each(['e', 'i'])('refuse %s : constante pour mathAST', (name) => {
		const result = answerAssumptionsSchema.safeParse({ [name]: 'positive' });
		expect(result.success).toBe(false);
		expect(messagesOf(result).join(' ')).toMatch(/constante/);
	});

	it.each(['x_1', 'x1', 'xy', 'Alpha', 'pi', '', ' x', 'é'])(
		'refuse le nom « %s » (ni indice, ni mot, ni π)',
		(name) => {
			const result = answerAssumptionsSchema.safeParse({ [name]: 'positive' });
			expect(result.success).toBe(false);
			expect(messagesOf(result).join(' ')).toMatch(/lettre/);
		}
	);

	it('refuse une hypothèse hors vocabulaire', () => {
		const result = answerAssumptionsSchema.safeParse({ x: 'negative' });
		expect(result.success).toBe(false);
		expect(messagesOf(result).join(' ')).toMatch(/Hypothèse inconnue/);
	});

	it(`accepte ${MAX_ANSWER_ASSUMPTIONS} hypothèses, refuse la ${MAX_ANSWER_ASSUMPTIONS + 1}e`, () => {
		expect(answerAssumptionsSchema.safeParse(manyAssumptions(10)).success).toBe(true);
		const result = answerAssumptionsSchema.safeParse(manyAssumptions(11));
		expect(result.success).toBe(false);
		expect(messagesOf(result).join(' ')).toMatch(/Au plus 10 hypothèses/);
	});

	it('refuse un tableau ou une chaîne à la place de l’objet', () => {
		expect(answerAssumptionsSchema.safeParse(['x']).success).toBe(false);
		expect(answerAssumptionsSchema.safeParse('x>0').success).toBe(false);
	});
});

// ============================================================================
// Collision avec une variable tirée
// ============================================================================

describe('findAssumptionCollisions', () => {
	it('trouve une hypothèse posée sur une variable tirée (variation)', () => {
		expect(findAssumptionCollisions({ a: 'positive', x: 'positive' }, baseTemplate)).toEqual(['a']);
	});

	it('trouve une hypothèse posée sur une variable partagée', () => {
		const template = {
			...baseTemplate,
			shared: { variables: [{ name: 'k', expression: '{{random:1..3}}' }] }
		};
		expect(findAssumptionCollisions({ k: 'natural' }, template)).toEqual(['k']);
	});

	it('supporte un `shared` inconnu (corps de requête non typé) sans planter', () => {
		expect(findAssumptionCollisions({ x: 'positive' }, { shared: 'n’importe quoi' })).toEqual([]);
		expect(findAssumptionCollisions({ x: 'positive' }, {})).toEqual([]);
	});
});

// ============================================================================
// Schéma strict de l'éditeur (mode JSON)
// ============================================================================

describe('questionTemplateSchema : options.answerAssumptions', () => {
	it('accepte des hypothèses valides', () => {
		const result = questionTemplateSchema.safeParse(
			withAssumptions({ x: 'positive', b: 'integer' })
		);
		expect(result.success).toBe(true);
	});

	it('refuse une hypothèse sur une variable tirée, message en français', () => {
		const result = questionTemplateSchema.safeParse(withAssumptions({ a: 'positive' }));
		expect(result.success).toBe(false);
		expect(messagesOf(result).join(' ')).toMatch(/« a » est une variable tirée/);
	});

	it('refuse e, un indice, une hypothèse inconnue, 11 hypothèses', () => {
		for (const bad of [
			{ e: 'positive' },
			{ x_1: 'positive' },
			{ x: 'negative' },
			manyAssumptions(11)
		]) {
			expect(questionTemplateSchema.safeParse(withAssumptions(bad)).success).toBe(false);
		}
	});
});

// ============================================================================
// validateTemplate
// ============================================================================

describe('validateTemplate : collision avec une variable tirée', () => {
	const template: QuestionTemplate = {
		id: 't',
		...baseTemplate,
		variations: [
			{
				...baseTemplate.variations[0],
				statement: templateMarkdown(baseTemplate.variations[0].statement)
			}
		]
	};

	it('sans collision : aucune erreur liée aux hypothèses', () => {
		const errors = validateTemplate({
			...template,
			options: { answerAssumptions: { x: 'positive' } }
		});
		expect(errors.filter((e) => e.includes('Hypothèse'))).toEqual([]);
	});

	it('hypothèse sur la variable tirée `a` : erreur en français', () => {
		const errors = validateTemplate({
			...template,
			options: { answerAssumptions: { a: 'positive' } }
		});
		expect(errors.some((e) => /« a » est une variable tirée/.test(e))).toBe(true);
	});
});

// ============================================================================
// Schémas serveur (API)
// ============================================================================

describe('API : createQuestionTemplateSchema / updateQuestionTemplateSchema', () => {
	it('garde les hypothèses valides (pas de suppression silencieuse)', () => {
		const parsed = createQuestionTemplateSchema.parse(withAssumptions({ x: 'positive' }));
		expect(parsed.options?.answerAssumptions).toEqual({ x: 'positive' });
		const updated = updateQuestionTemplateSchema.parse(withAssumptions({ n: 'natural' }));
		expect(updated.options?.answerAssumptions).toEqual({ n: 'natural' });
	});

	it.each([
		['e', { e: 'positive' }],
		['i', { i: 'nonzero' }],
		['un indice', { x_1: 'positive' }],
		['une hypothèse inconnue', { x: 'negative' }],
		['11 hypothèses', manyAssumptions(11)],
		['une variable tirée', { a: 'positive' }]
	])('refuse %s (création et mise à jour)', (_label, bad) => {
		expect(createQuestionTemplateSchema.safeParse(withAssumptions(bad)).success).toBe(false);
		expect(updateQuestionTemplateSchema.safeParse(withAssumptions(bad)).success).toBe(false);
	});

	it('refuse une collision avec une variable partagée même si `shared` est non typé', () => {
		const body = {
			...withAssumptions({ k: 'natural' }),
			shared: { variables: [{ name: 'k', expression: '3' }] }
		};
		expect(createQuestionTemplateSchema.safeParse(body).success).toBe(false);
	});

	it('mise à jour partielle sans hypothèse : inchangée', () => {
		expect(updateQuestionTemplateSchema.safeParse({ title: 'Nouveau titre' }).success).toBe(true);
	});
});

describe('Relecture de migration : editedQuestionTemplateSchema', () => {
	const edited = (answerAssumptions: unknown) => ({
		variations: baseTemplate.variations,
		options: { answerAssumptions }
	});

	it('garde des hypothèses valides', () => {
		const parsed = editedQuestionTemplateSchema.parse(edited({ x: 'positive' }));
		expect(parsed.options?.answerAssumptions).toEqual({ x: 'positive' });
	});

	it('refuse des hypothèses invalides au lieu de les laisser passer (passthrough)', () => {
		expect(editedQuestionTemplateSchema.safeParse(edited({ e: 'positive' })).success).toBe(false);
		expect(editedQuestionTemplateSchema.safeParse(edited({ a: 'positive' })).success).toBe(false);
	});
});

// ============================================================================
// Affichage et lignes de l'éditeur
// ============================================================================

describe('formatAnswerAssumptions', () => {
	it('écrit la notation française', () => {
		expect(
			formatAnswerAssumptions({
				x: 'positive',
				y: 'nonnegative',
				z: 'nonzero',
				n: 'natural',
				k: 'integer'
			})
		).toBe('x > 0 ; y ≥ 0 ; z ≠ 0 ; n ∈ ℕ ; k ∈ ℤ');
	});

	it('affiche une lettre grecque par son symbole', () => {
		expect(formatAnswerAssumptions({ theta: 'positive' })).toBe('θ > 0');
	});

	it('rien à afficher sans hypothèse', () => {
		expect(formatAnswerAssumptions(undefined)).toBe('');
		expect(formatAnswerAssumptions({})).toBe('');
	});
});

describe('validateAssumptionRows (éditeur)', () => {
	it('lignes valides → objet d’hypothèses, aucune erreur', () => {
		const result = validateAssumptionRows(
			[
				{ name: 'x', kind: 'positive' },
				{ name: ' n ', kind: 'natural' }
			],
			['a']
		);
		expect(result.errors).toEqual([undefined, undefined]);
		expect(result.assumptions).toEqual({ x: 'positive', n: 'natural' });
	});

	it('ligne vide ignorée', () => {
		const result = validateAssumptionRows([{ name: '', kind: 'positive' }], []);
		expect(result.errors).toEqual([undefined]);
		expect(result.assumptions).toBeUndefined();
	});

	it('doublon, nom invalide, e, variable tirée : message par ligne', () => {
		const result = validateAssumptionRows(
			[
				{ name: 'x', kind: 'positive' },
				{ name: 'x', kind: 'integer' },
				{ name: 'x_1', kind: 'positive' },
				{ name: 'e', kind: 'positive' },
				{ name: 'a', kind: 'positive' }
			],
			['a']
		);
		expect(result.errors[0]).toBeUndefined();
		expect(result.errors[1]).toMatch(/déjà une hypothèse/);
		expect(result.errors[2]).toMatch(/lettre/);
		expect(result.errors[3]).toMatch(/constante/);
		expect(result.errors[4]).toMatch(/variable tirée/);
	});

	it('plus de 10 lignes : erreur sur les lignes en trop', () => {
		const rows = Object.keys(manyAssumptions(11)).map((name) => ({
			name,
			kind: 'positive' as const
		}));
		const result = validateAssumptionRows(rows, []);
		expect(result.errors[10]).toMatch(/Au plus 10 hypothèses/);
	});
});

describe('isSequenceCategory (proposition « n ∈ ℕ »)', () => {
	it('reconnaît le thème ou le domaine Suites', () => {
		expect(isSequenceCategory('Suites', 'Généralités')).toBe(true);
		expect(isSequenceCategory('Analyse', 'Suites arithmétiques')).toBe(true);
		expect(isSequenceCategory(' suites ', '')).toBe(true);
	});

	it('ignore les autres catégories', () => {
		expect(isSequenceCategory('Algèbre', 'Puissances')).toBe(false);
		expect(isSequenceCategory('Probabilités', 'Poursuites')).toBe(false);
	});
});

describe('aller-retour éditeur ↔ base', () => {
	it('lignes → hypothèses → lignes : identique', () => {
		const rows = [
			{ name: 'x', kind: 'positive' as const },
			{ name: 'n', kind: 'natural' as const }
		];
		expect(assumptionsToRows(rowsToAssumptions(rows))).toEqual(rows);
	});

	it('lignes vides → aucune hypothèse (pas de clé vide)', () => {
		expect(rowsToAssumptions([{ name: '  ', kind: 'positive' }])).toBeUndefined();
	});

	it('hypothèse inconnue lue en base : écartée des lignes', () => {
		expect(
			assumptionsToRows({ x: 'negative', n: 'integer' } as unknown as Record<string, 'integer'>)
		).toEqual([{ name: 'n', kind: 'integer' }]);
	});

	it('ligne de base → formulaire → PUT : options.answerAssumptions conservé', () => {
		const dbRow = {
			id: '00000000-0000-4000-8000-000000000000',
			...baseTemplate,
			exercise_instruction: null,
			default_display_options: null,
			multiple_answers: null,
			test_specs: null,
			options: { answerAssumptions: { x: 'positive', n: 'natural' } }
		};
		const form = mapDbTemplateToForm(dbRow);
		expect(form.options?.answerAssumptions).toEqual({ x: 'positive', n: 'natural' });
		const rows = assumptionsToRows(form.options?.answerAssumptions);
		const payload = {
			...baseTemplate,
			options: { answerAssumptions: rowsToAssumptions(rows) }
		};
		const parsed = updateQuestionTemplateSchema.parse(payload);
		expect(parsed.options?.answerAssumptions).toEqual({ x: 'positive', n: 'natural' });
	});
});
