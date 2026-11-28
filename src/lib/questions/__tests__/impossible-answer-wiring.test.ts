/**
 * Case « expression, ou bien : impossible » (`impossibleLabel`, chantier `reponse-impossible`)
 * dans toute la chaîne : schémas Zod, générateur (case et blankDefaults, `{{if:}}`),
 * validateur (case seule, `orderIndependent`, verdicts par case, barème serveur),
 * réponse attendue affichée et correction.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { gradeQuestion } from '../grading';
import { buildExpectedResult } from '../expected-result';
import { asChoiceInstance } from '../choice-from-errors';
import {
	validateAnswer,
	validateAnswerDetailed,
	validateBlanksDetailed
} from '#lib/utils/answer-validator.ts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '#lib/ubumark/index.ts';
import { IMPOSSIBLE_ANSWER } from '../impossible-answer';

// ============================================================================
// Constantes
// ============================================================================

const LABEL = 'pas factorisable';
/** Réponse enregistrée quand l'élève enfonce le bouton (marque réservée, impossible à taper) */
const BUTTON = IMPOSSIBLE_ANSWER;
/** Texte du bouton, tel que la correction et le prof le voient */
const BUTTON_LATEX = '\\text{pas factorisable}';

// ============================================================================
// Functions
// ============================================================================

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'factoriser',
		statement: 'Factorise' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		level: 2,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function impossibleBlank(expectedAnswer: string): InstanceBlank {
	return { expectedAnswer, type: 'math', impossibleLabel: LABEL };
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

/** Factoriser x² + bx + c : deux racines entières, ou pas de racine selon `delta` */
function factorTemplate(
	where: 'blank' | 'blankDefaults',
	{ c, label = true, answerKind }: { c: string; label?: boolean; answerKind?: 'equation' } = {
		c: '6'
	}
): QuestionTemplate {
	const expected = '{{if:delta<0|impossible|(x-2)(x-3)}}';
	const blankExtras = {
		...(label && where === 'blank' && { impossibleLabel: LABEL }),
		...(answerKind && { answerKind })
	};
	return {
		id: 'test-impossible',
		title: 'Factoriser',
		status: 'draft',
		...(where === 'blankDefaults' &&
			label && { shared: { blankDefaults: { impossibleLabel: LABEL } } }),
		variations: [
			{
				statement: templateMarkdown('Factorise $x^2-5x+{{c}}$ : $?$'),
				variables: [
					{ name: 'c', expression: c },
					{ name: 'delta', expression: '25-4*c' }
				],
				blanks: [{ expectedAnswer: expected, ...blankExtras }],
				correction: { steps: ['On trouve ${{solution}}$.'] }
			}
		],
		grades: ['1_SPE'],
		level: 2
	} as QuestionTemplate;
}

function generated(template: QuestionTemplate): QuestionInstance {
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

// ============================================================================
// Tests
// ============================================================================

describe('schémas Zod : impossibleLabel', () => {
	it('accepte un texte de bouton ordinaire (accents, apostrophe, trait d’union)', () => {
		expect(blankSchema.safeParse({ expectedAnswer: 'x', impossibleLabel: LABEL }).success).toBe(
			true
		);
		expect(blankDefaultsSchema.safeParse({ impossibleLabel: 'pas de réel' }).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ impossibleLabel: "n'existe pas" }).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ impossibleLabel: 'non-défini' }).success).toBe(true);
	});

	it.each([
		['accolade', 'pas {x}'],
		['barre oblique inverse', 'pas\\ factorisable'],
		['plus de 40 caractères', 'a'.repeat(41)],
		['vide', '   '],
		['chiffre en tête', '0 solution']
	])('refuse : %s', (_, label) => {
		expect(blankSchema.safeParse({ expectedAnswer: 'x', impossibleLabel: label }).success).toBe(
			false
		);
		expect(blankDefaultsSchema.safeParse({ impossibleLabel: label }).success).toBe(false);
	});

	it('schéma strict du modèle : accepté dans la case et dans blankDefaults', () => {
		const { id: _id, ...blankLevel } = factorTemplate('blank');
		const { id: _id2, ...defaultsLevel } = factorTemplate('blankDefaults');
		expect(questionTemplateSchema.safeParse(blankLevel).success).toBe(true);
		expect(questionTemplateSchema.safeParse(defaultsLevel).success).toBe(true);
	});

	it('schéma strict du modèle : texte interdit refusé', () => {
		const template = factorTemplate('blank');
		const { id: _id, ...rest } = {
			...template,
			shared: { blankDefaults: { impossibleLabel: 'pas \\{x\\}' } }
		};
		expect(questionTemplateSchema.safeParse(rest).success).toBe(false);
	});
});

describe('générateur', () => {
	it.each(['blank', 'blankDefaults'] as const)(
		'tirage sans réponse (%s) : attendue « impossible », affichée en texte',
		(where) => {
			const blank = generated(factorTemplate(where, { c: '7' })).blanks![0];
			expect(blank.impossibleLabel).toBe(LABEL);
			expect(blank.expectedAnswer).toBe('impossible');
			expect(blank.expectedAnswerLatex).toBe(BUTTON_LATEX);
		}
	);

	it('tirage avec réponse : l’expression, le bouton reste (tous les tirages)', () => {
		const blank = generated(factorTemplate('blankDefaults', { c: '6' })).blanks![0];
		expect(blank.impossibleLabel).toBe(LABEL);
		expect(blank.expectedAnswer).not.toBe('impossible');
		expect(blank.expectedAnswerLatex).not.toContain('\\text');
	});

	it('case à answerKind : impossibleLabel ignoré', () => {
		const template: QuestionTemplate = {
			...factorTemplate('blankDefaults', { c: '6' }),
			variations: [
				{
					statement: templateMarkdown('Équation : $?$'),
					blanks: [{ expectedAnswer: 'y=2x+1', answerKind: 'equation' }]
				}
			]
		} as QuestionTemplate;
		const blank = generated(template).blanks![0];
		expect(blank.answerKind).toBe('equation');
		expect(blank.impossibleLabel).toBeUndefined();
	});

	it('attendue « impossible » sans bouton : erreur de génération lisible', () => {
		const result = generateInstance(factorTemplate('blank', { c: '7', label: false }), 1);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toContain(
			"La case 1 attend « impossible » mais n'a pas de bouton « impossible » (impossibleLabel)."
		);
	});

	it('sans bouton, tirage qui n’atteint pas « impossible » : rien ne change', () => {
		expect(generateInstance(factorTemplate('blank', { c: '6', label: false }), 1).success).toBe(
			true
		);
	});
});

describe('validateur : case seule', () => {
	it.each([
		['tirage impossible + bouton', 'impossible', BUTTON, 'correct'],
		// Le texte du bouton tapé dans la case n'est PAS le bouton (décision de David, 2026-11-23)
		['tirage impossible + texte du bouton tapé', 'impossible', BUTTON_LATEX, 'incorrect'],
		['tirage impossible + expression', 'impossible', '(x-2)(x-3)', 'incorrect'],
		['tirage impossible + texte quelconque', 'impossible', '\\text{impossible}', 'incorrect'],
		['tirage réel + bouton', '(x-2)(x-3)', BUTTON, 'incorrect'],
		['tirage réel + bonne expression', '(x-2)(x-3)', '(x-3)(x-2)', 'correct'],
		['tirage réel + mauvaise expression', '(x-2)(x-3)', '(x+2)(x+3)', 'incorrect']
	])('%s → %s', (_, expected, answer, status) => {
		expect(statusOf(answer, impossibleBlank(expected))).toBe(status);
	});

	it('case vide : « vide », avec ou sans tirage impossible', () => {
		expect(statusOf('', impossibleBlank('impossible'))).toBe('empty');
		expect(statusOf('', impossibleBlank('(x-2)(x-3)'))).toBe('empty');
	});

	it('bouton juste : aucun message (ni forme, ni « trop complexe »)', () => {
		const instance = instanceWith([impossibleBlank('impossible')]);
		const verdict = validateAnswerDetailed(instance, { values: [BUTTON], latex: [BUTTON] });
		expect(verdict.status).toBe('correct');
		expect(verdict.blanks[0].remarks).toEqual([]);
	});

	it('expression contre tirage impossible : faux, sans remarque de forme', () => {
		const instance = instanceWith([impossibleBlank('impossible')]);
		const result = validateAnswer(['x^2+1'], instance, ['x^2+1']);
		expect(result.isCorrect).toBe(false);
		expect(result.status ?? 'incorrect').toBe('incorrect');
		expect(result.constraintViolations ?? []).toEqual([]);
		const verdict = validateAnswerDetailed(instance, { values: ['x^2+1'], latex: ['x^2+1'] });
		expect(verdict.blanks[0].remarks).toEqual([]);
	});

	it('barème serveur = verdict du navigateur', () => {
		const instance = instanceWith([impossibleBlank('impossible')]);
		expect(gradeQuestion(instance, { values: [BUTTON] }).status).toBe('correct');
		expect(gradeQuestion(instance, { values: ['(x-2)(x-3)'] }).status).toBe('incorrect');
	});
});

describe('validateur : orderIndependent et verdicts par case', () => {
	const instance = instanceWith([impossibleBlank('impossible'), impossibleBlank('2')], {
		orderIndependent: true
	});

	it('dans le désordre : bouton et valeur justes', () => {
		const answers = ['2', BUTTON];
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
	});

	it('expression à la place du bouton : faux', () => {
		const answers = ['2', '3'];
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(false);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'incorrect'
		]);
	});

	it('bouton deux fois : une seule case le prend', () => {
		const answers = [BUTTON, BUTTON];
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(false);
	});
});

describe('réponse attendue affichée et correction', () => {
	it('tirage impossible : la réponse attendue est le texte du bouton', () => {
		const instance = generated(factorTemplate('blankDefaults', { c: '7' }));
		const expected = JSON.stringify(buildExpectedResult(instance));
		expect(expected).toContain('\\\\text{pas factorisable}');
		expect(expected).not.toMatch(/i\s*\\?cdot\s*m|imposs\\/);
	});

	it('tirage impossible : {{solution}} de la correction donne le texte du bouton', () => {
		const instance = generated(factorTemplate('blankDefaults', { c: '7' }));
		const steps = JSON.stringify(instance.correction);
		expect(steps).toContain('\\\\text{pas factorisable}');
	});

	it('élève qui clique le bouton : correction « juste »', () => {
		const instance = generated(factorTemplate('blankDefaults', { c: '7' }));
		const result = buildExpectedResult(instance, { values: [BUTTON], latex: [BUTTON] });
		expect(result.status).toBe('correct');
	});

	it('réponse de l’élève montrée en texte du bouton, jamais la marque', () => {
		// Tirage factorisable : seule la réponse de l'élève peut dire « pas factorisable »
		const instance = generated(factorTemplate('blankDefaults', { c: '6' }));
		const shown = JSON.stringify(
			buildExpectedResult(instance, { values: [BUTTON], latex: [BUTTON] })
		);
		expect(shown).not.toContain(JSON.stringify(BUTTON).slice(1, -1));
		expect(shown).toContain('pas factorisable');
	});
});

// ============================================================================
// Revue de la PR : erreur prévue « impossible », cases de bloc, nature de réponse, casse
// ============================================================================

/** Modèle à erreur prévue « l'élève a cliqué le bouton » sur un tirage factorisable */
function withButtonError(c: string): QuestionTemplate {
	const template = factorTemplate('blankDefaults', { c });
	const [variation] = template.variations;
	return {
		...template,
		variations: [
			{
				...variation,
				blanks: [
					{
						expectedAnswer: '{{if:delta<0|impossible|(x-2)(x-3)}}',
						expectedErrors: [{ answer: 'impossible', message: 'Δ ≥ 0 : il y a des racines.' }]
					}
				]
			}
		]
	} as QuestionTemplate;
}

describe('erreur prévue « impossible » (bouton cliqué à tort)', () => {
	it('générateur : jamais lue par le parseur, affichée en texte du bouton', () => {
		const [error] = generated(withButtonError('6')).blanks![0].expectedErrors!;
		expect(error.answer).toBe('impossible');
		expect(error.answerLatex).toBe(BUTTON_LATEX);
	});

	it('clic sur un tirage factorisable : faux, AVEC le message de l’erreur prévue', () => {
		const instance = generated(withButtonError('6'));
		const verdict = validateAnswerDetailed(instance, { values: [BUTTON], latex: [BUTTON] });
		expect(verdict.status).toBe('incorrect');
		expect(
			JSON.stringify(buildExpectedResult(instance, { values: [BUTTON], latex: [BUTTON] }))
		).toContain('Δ ≥ 0 : il y a des racines.');
	});

	it('expression fausse sur un tirage factorisable : pas ce message', () => {
		const instance = generated(withButtonError('6'));
		const answer = '(x+2)(x+3)';
		expect(
			JSON.stringify(buildExpectedResult(instance, { values: [answer], latex: [answer] }))
		).not.toContain('Δ ≥ 0');
	});

	it('sans bouton : erreur de génération lisible', () => {
		const template = withButtonError('6');
		const result = generateInstance({ ...template, shared: undefined } as QuestionTemplate, 1);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toContain(
			"La case 1 attend « impossible » mais n'a pas de bouton « impossible » (impossibleLabel)."
		);
	});

	it('jamais proposée en QCM : une case à bouton reste en saisie', () => {
		expect(asChoiceInstance(generated(withButtonError('6')), 1)).toBeNull();
	});
});

describe('impossibleLabel de blankDefaults : cases ordinaires seulement', () => {
	it('case d’un bloc ```operation : pas de bouton ; case ordinaire voisine : bouton', () => {
		const template: QuestionTemplate = {
			...factorTemplate('blankDefaults', { c: '6' }),
			variations: [
				{
					statement: templateMarkdown(
						['Factorise : $?$', '', '```operation', 'calcul: 45 + 37', '```'].join('\n')
					),
					blanks: [{ expectedAnswer: '(x-2)(x-3)' }, { expectedAnswer: '' }]
				}
			]
		} as QuestionTemplate;
		const [ordinary, operation] = generated(template).blanks!;
		expect(ordinary.impossibleLabel).toBe(LABEL);
		expect(operation.operation).toBe(true);
		expect(operation.impossibleLabel).toBeUndefined();
	});

	it('attendue « impossible » sur une case à nature de réponse : message dédié', () => {
		const result = generateInstance(
			factorTemplate('blankDefaults', { c: '7', answerKind: 'equation' }),
			1
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toContain(
			'La case 1 attend « impossible », mais le bouton « impossible » est réservé aux cases ordinaires (sans nature de réponse).'
		);
	});
});

describe('casse : « Impossible » écrit par le prof', () => {
	it('gardé hors du parseur, comme « impossible »', () => {
		const template = factorTemplate('blankDefaults', { c: '7' });
		const [variation] = template.variations;
		const capital = {
			...template,
			variations: [
				{ ...variation, blanks: [{ expectedAnswer: '{{if:delta<0|Impossible|(x-2)(x-3)}}' }] }
			]
		} as QuestionTemplate;
		const blank = generated(capital).blanks![0];
		expect(blank.expectedAnswer).toBe('impossible');
		expect(blank.expectedAnswerLatex).toBe(BUTTON_LATEX);
		expect(statusOf(BUTTON, blank)).toBe('correct');
	});
});
