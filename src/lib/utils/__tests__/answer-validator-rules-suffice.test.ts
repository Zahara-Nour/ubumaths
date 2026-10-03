/**
 * Mode « la règle suffit » (`rulesSuffice`)
 * =========================================
 *
 * Questions à plusieurs bonnes réponses (« Trouve un diviseur de 12, autre que
 * 1 et 12 ») : avec `rulesSuffice`, une réponse est juste si et seulement si
 * elle respecte toutes les règles ; `expectedAnswer` n'est plus qu'un exemple.
 * Sans le mode, rien ne change : les règles restent une pré-condition.
 */

import { describe, it, expect } from 'vitest';
import { isBlankValueCorrect, validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance, ValidationRule } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Règles de « Trouve un diviseur de a×b (autre que 1 et a×b) » */
const DIVISOR_RULES: ValidationRule[] = [
	{ type: 'divisor', dividend: '{{a}}*{{b}}' },
	{ type: 'custom', expression: 'answer != 1' },
	{ type: 'custom', expression: 'answer != {{a}}*{{b}}' }
];

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-rules-suffice',
		statement: 'Trouve un diviseur de 12' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Diviser',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [
			{ name: 'a', value: '3' },
			{ name: 'b', value: '4' }
		]
	};
}

function divisorBlank(overrides?: Partial<InstanceBlank>): InstanceBlank {
	return {
		expectedAnswer: '2',
		type: 'math',
		validationRules: DIVISOR_RULES,
		rulesSuffice: true,
		...overrides
	};
}

function check(answer: string, blank: InstanceBlank = divisorBlank(), latex = answer) {
	return validateAnswer([answer], createInstance([blank]), [latex]);
}

// ============================================================================
// NOMINAL
// ============================================================================

describe('rulesSuffice — cas nominal', () => {
	it('accepte la réponse tirée', () => {
		expect(check('2')).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it.each(['3', '4', '6'])('accepte un autre diviseur juste : %s', (answer) => {
		expect(check(answer)).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it('refuse un non-diviseur, sans message technique en anglais', () => {
		const verdict = check('5');
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback ?? '').not.toMatch(/divide/);
		expect(verdict.blankFeedback ?? []).not.toContainEqual(expect.stringMatching(/divide/));
	});
});

// ============================================================================
// LIMITES
// ============================================================================

describe('rulesSuffice — cas limites', () => {
	it.each(['1', '12'])('refuse une valeur exclue : %s', (answer) => {
		expect(check(answer).isCorrect).toBe(false);
	});

	it('juge la forme : 6 écrit 12/2 est une fraction à simplifier (décision 2026-10-03)', () => {
		// Même règle qu'une case positionnelle attendant 6 : `reducedFractions`
		expect(check('\\frac{12}{2}')).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			constraintViolations: [expect.objectContaining({ constraint: 'reducedFractions' })]
		});
	});

	it('juge la forme : un calcul non effectué (8-2) reste une forme incorrecte', () => {
		expect(check('8-2')).toMatchObject({ isCorrect: false, status: 'bad_form' });
	});

	it('sans le mode, seule la réponse tirée est juste (comportement inchangé)', () => {
		const blank = divisorBlank({ rulesSuffice: undefined });
		expect(check('2', blank).isCorrect).toBe(true);
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('sans le mode, 12/2 vaut 6 pour la règle, puis est comparé à la réponse tirée', () => {
		const blank = divisorBlank({ rulesSuffice: undefined });
		const verdict = check('12/2', blank, '\\frac{12}{2}');
		// 6 divise 12 (la règle passe) mais n'est pas la réponse tirée (2) :
		// réponse fausse ordinaire, sans le faux « pas un nombre » d'avant
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback).toBe('Les blancs suivants sont incorrects: 1');
	});

	it('case texte : le mode est ignoré (comparaison à la réponse attendue)', () => {
		// 3 passe la règle de divisibilité : refusé parce que comparé à « deux »
		const blank = divisorBlank({ type: 'text', expectedAnswer: 'deux' });
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('case avec unité : le mode est ignoré (comparaison à la réponse attendue)', () => {
		const blank = divisorBlank({ unit: { expected: true } });
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('avec le mode mais sans aucune règle, ne devient jamais « tout est juste »', () => {
		const blank = divisorBlank({ validationRules: undefined });
		expect(check('2', blank).isCorrect).toBe(true);
		expect(check('7', blank).isCorrect).toBe(false);
	});
});

// ============================================================================
// ERREURS
// ============================================================================

describe('rulesSuffice — cas d’erreur', () => {
	it('case vide → empty', () => {
		expect(check('')).toMatchObject({ isCorrect: false, status: 'empty' });
	});

	it('réponse non numérique → incorrecte, sans exception', () => {
		expect(() => check('abc')).not.toThrow();
		expect(check('abc').isCorrect).toBe(false);
	});

	it('règle qui référence une variable absente → incorrecte, sans exception', () => {
		const blank = divisorBlank({
			validationRules: [{ type: 'divisor', dividend: '{{inconnue}}' }]
		});
		expect(() => check('3', blank)).not.toThrow();
		expect(check('3', blank).isCorrect).toBe(false);
	});
});

// ============================================================================
// ORDRE INDIFFÉRENT ET VERDICT PAR CASE
// ============================================================================

describe('rulesSuffice — autres chemins', () => {
	it('ordre indifférent : chaque case est jugée par ses règles', () => {
		const instance = {
			...createInstance([divisorBlank(), divisorBlank({ expectedAnswer: '3' })]),
			options: { orderIndependent: true }
		};
		expect(validateAnswer(['4', '6'], instance, ['4', '6']).isCorrect).toBe(true);
		expect(validateAnswer(['4', '5'], instance, ['4', '5']).isCorrect).toBe(false);
	});

	it('isBlankValueCorrect suit le même verdict que validateAnswer', () => {
		const instance = createInstance([divisorBlank()]);
		expect(isBlankValueCorrect('6', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('5', instance.blanks![0], instance)).toBe(false);
		expect(isBlankValueCorrect('1', instance.blanks![0], instance)).toBe(false);
	});
});

// ============================================================================
// FRACTIONS (décision de David, 2026-10-03)
// ============================================================================
//
// En mode « la règle suffit », un nombre écrit en fraction irréductible est une
// réponse au même titre qu'un nombre simple ; sa valeur exacte passe par les
// règles. Une fraction à simplifier suit la règle des fractions d'une case
// positionnelle (`reducedFractions` → forme perfectible), signe compris
// (`\frac{-3}{4}` y est perfectible). Un calcul non effectué reste refusé.
// Le mode `precision` (arrondis) n'est pas concerné : un nombre simple y est exigé.

/** Case « donne un contre-exemple à : pour tout réel x, x² > x » */
function counterExampleBlank(overrides?: Partial<InstanceBlank>): InstanceBlank {
	return divisorBlank({
		expectedAnswer: '0',
		validationRules: [{ type: 'custom', expression: 'answer^2 <= answer' }],
		...overrides
	});
}

function rulesBlank(rules: ValidationRule[], overrides?: Partial<InstanceBlank>): InstanceBlank {
	return divisorBlank({ expectedAnswer: '0', validationRules: rules, ...overrides });
}

const REDUCED_FRACTIONS = [expect.objectContaining({ constraint: 'reducedFractions' })];

describe('rulesSuffice — fractions, règle custom (contre-exemple)', () => {
	it.each(['0', '1', '0{,}3', '\\frac{1}{2}', '\\frac{1}{3}'])(
		'accepte un contre-exemple juste : %s',
		(answer) => {
			expect(check(answer, counterExampleBlank())).toMatchObject({
				isCorrect: true,
				status: 'correct'
			});
		}
	);

	it.each(['2', '-1', '\\frac{3}{2}', '-\\frac{1}{2}'])(
		'refuse une valeur qui ne contredit pas : %s',
		(answer) => {
			const verdict = check(answer, counterExampleBlank());
			expect(verdict.isCorrect).toBe(false);
			expect(verdict.status).not.toBe('bad_form');
		}
	);

	it('fraction à simplifier (2/4) : juste, forme perfectible (reducedFractions)', () => {
		expect(check('\\frac{2}{4}', counterExampleBlank())).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			constraintViolations: REDUCED_FRACTIONS
		});
	});

	it.each(['1-1', '\\frac{1}{2}+0', '2\\times\\frac{1}{4}'])(
		'calcul non effectué : forme incorrecte (%s)',
		(answer) => {
			expect(check(answer, counterExampleBlank())).toMatchObject({
				isCorrect: false,
				status: 'bad_form'
			});
		}
	);

	it('expression littérale (x) : refusée', () => {
		expect(check('x', counterExampleBlank()).isCorrect).toBe(false);
	});

	it('dénominateur nul (1/0) : refusé, sans exception', () => {
		expect(() => check('\\frac{1}{0}', counterExampleBlank())).not.toThrow();
		expect(check('\\frac{1}{0}', counterExampleBlank()).isCorrect).toBe(false);
	});

	it('valeur exacte : 1/7 vérifie « answer >= 1/7 » et pas « answer < 1/7 »', () => {
		const atLeast = rulesBlank([{ type: 'custom', expression: 'answer >= 1/7' }]);
		const below = rulesBlank([{ type: 'custom', expression: 'answer < 1/7' }]);
		expect(check('\\frac{1}{7}', atLeast).isCorrect).toBe(true);
		expect(check('\\frac{1}{7}', below).isCorrect).toBe(false);
	});

	it('valeur exacte : 1/3 vérifie « 3*answer == 1 »', () => {
		const blank = rulesBlank([{ type: 'custom', expression: '3*answer == 1' }]);
		expect(check('\\frac{1}{3}', blank).isCorrect).toBe(true);
	});
});

describe('rulesSuffice — fractions, signe', () => {
	const between = rulesBlank([{ type: 'range', min: '-1', max: '1' }]);

	it('-3/4 (signe devant) : juste, forme correcte', () => {
		expect(check('-\\frac{3}{4}', between)).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it.each(['\\frac{-3}{4}', '\\frac{3}{-4}'])(
		'%s : juste, même forme perfectible qu’en case positionnelle',
		(answer) => {
			expect(check(answer, between)).toMatchObject({
				isCorrect: true,
				status: 'unoptimal_form',
				constraintViolations: REDUCED_FRACTIONS
			});
		}
	);
});

describe('rulesSuffice — fractions, autres règles', () => {
	it('range [0;1] : 1/2 accepté, 3/2 refusé', () => {
		const blank = rulesBlank([{ type: 'range', min: '0', max: '1' }]);
		expect(check('\\frac{1}{2}', blank)).toMatchObject({ isCorrect: true, status: 'correct' });
		expect(check('\\frac{3}{2}', blank).isCorrect).toBe(false);
	});

	it('range [0;1/3] : borne atteinte exactement (inclusive juste, exclusive fausse)', () => {
		const inclusive = rulesBlank([{ type: 'range', min: '0', max: '1/3' }]);
		const exclusive = rulesBlank([{ type: 'range', min: '0', max: '1/3', inclusive: false }]);
		expect(check('\\frac{1}{3}', inclusive).isCorrect).toBe(true);
		expect(check('\\frac{1}{3}', exclusive).isCorrect).toBe(false);
	});

	it('divisor : 1/2 refusé proprement, sans exception', () => {
		expect(() => check('\\frac{1}{2}')).not.toThrow();
		const verdict = check('\\frac{1}{2}');
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.status).not.toBe('bad_form');
	});

	it('multiple de 3 : 1/2 refusé, 12/2 (= 6) juste mais à simplifier', () => {
		const blank = rulesBlank([{ type: 'multiple', base: '3' }]);
		expect(check('\\frac{1}{2}', blank).isCorrect).toBe(false);
		expect(check('\\frac{12}{2}', blank)).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			constraintViolations: REDUCED_FRACTIONS
		});
	});

	it('equationRoot (2x - 1 = 0) : 1/2 accepté', () => {
		const blank = rulesBlank([{ type: 'equation_root', equation: '2*x - 1 = 0' }]);
		expect(check('\\frac{1}{2}', blank)).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it('isInteger : 4/2 vaut 2 (règle passée), forme perfectible ; 1/2 refusé', () => {
		const blank = rulesBlank([{ type: 'predicate', predicate: 'isInteger' }]);
		expect(check('\\frac{4}{2}', blank)).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			constraintViolations: REDUCED_FRACTIONS
		});
		expect(check('\\frac{1}{2}', blank).isCorrect).toBe(false);
	});

	it('ordre indifférent : même jugement de forme qu’en positionnel', () => {
		const instance = {
			...createInstance([counterExampleBlank(), counterExampleBlank()]),
			options: { orderIndependent: true }
		};
		const answers = ['\\frac{1}{2}', '\\frac{1}{3}'];
		// Tout juste en ordre indifférent : pas de statut, aucune violation
		const verdict = validateAnswer(answers, instance, answers);
		expect(verdict.isCorrect).toBe(true);
		expect(verdict.status).toBeUndefined();
		expect(verdict.constraintViolations ?? []).toEqual([]);
		const unreduced = ['\\frac{1}{2}', '\\frac{2}{6}'];
		expect(validateAnswer(unreduced, instance, unreduced)).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			constraintViolations: REDUCED_FRACTIONS
		});
	});
});

describe('mode precision (arrondis) : inchangé', () => {
	it('une fraction reste une forme incorrecte en case à précision', () => {
		const blank: InstanceBlank = {
			expectedAnswer: '0{,}5',
			type: 'math',
			precision: { type: 'decimal', digits: 1 }
		};
		expect(check('\\frac{1}{2}', blank)).toMatchObject({ isCorrect: false, status: 'bad_form' });
	});

	it('rulesSuffice + precision : la précision garde son exigence de nombre simple', () => {
		const blank = counterExampleBlank({ precision: { type: 'decimal', digits: 1 } });
		expect(check('\\frac{1}{2}', blank)).toMatchObject({ isCorrect: false, status: 'bad_form' });
	});
});

// ============================================================================
// MESSAGE ÉCRIT PAR L'AUTEUR (description d'une règle custom)
// ============================================================================
//
// Modèle `logique-1spe/B-02` : « Donne un contre-exemple à x² ≥ a·x ». La
// règle `custom` porte une `description` écrite pour l'élève ; quand elle
// échoue, c'est ce message qu'il lit (sous la case, ou en retour global s'il
// n'y a qu'une case). Les messages génériques restent tus (décision du
// 2026-09-26 : ils répéteraient la consigne) ; une saisie illisible garde son
// retour ordinaire.

const NOT_A_COUNTER_EXAMPLE = "Ce nombre n'est pas un contre-exemple : il vérifie l'inégalité.";

/** B-02 variante 1, a = 5 : contre-exemples = réels de ]0 ; 5[, exemple tiré 1 */
function counterExampleB02(overrides?: Partial<InstanceBlank>): InstanceBlank {
	return divisorBlank({
		expectedAnswer: '1',
		validationRules: [
			{
				type: 'custom',
				expression: 'answer^2 < (5)*answer',
				description: NOT_A_COUNTER_EXAMPLE
			}
		],
		...overrides
	});
}

describe('rulesSuffice — message écrit par l’auteur', () => {
	it('réponse refusée par une règle décrite : la description est le retour', () => {
		const verdict = check('7', counterExampleB02());
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback).toBe(NOT_A_COUNTER_EXAMPLE);
	});

	it('un autre contre-exemple juste reste juste, sans message', () => {
		const verdict = check('2', counterExampleB02());
		expect(verdict).toMatchObject({ isCorrect: true, status: 'correct' });
		expect(verdict.feedback).toBeUndefined();
	});

	it('plusieurs cases : la description s’affiche pour la case fautive seulement', () => {
		const instance = createInstance([counterExampleB02(), counterExampleB02()]);
		const verdict = validateAnswer(['2', '-3'], instance, ['2', '-3']);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.blankFeedback).toEqual([undefined, NOT_A_COUNTER_EXAMPLE]);
	});

	it('le message ne contient jamais la réponse tirée', () => {
		const verdict = check('7', counterExampleB02({ expectedAnswer: '4' }));
		expect(verdict.feedback).toBe(NOT_A_COUNTER_EXAMPLE);
		expect(verdict.feedback).not.toContain('4');
	});

	it('règle custom SANS description : retour ordinaire (pas de message générique)', () => {
		const verdict = check(
			'7',
			counterExampleB02({
				validationRules: [{ type: 'custom', expression: 'answer^2 < (5)*answer' }]
			})
		);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback ?? '').not.toMatch(/critères demandés/);
	});

	it('règle générique (diviseur) : toujours tue, même à côté d’une règle décrite', () => {
		const blank = divisorBlank({
			validationRules: [
				{ type: 'divisor', dividend: '12' },
				{ type: 'custom', expression: 'answer != 1', description: 'Autre que 1.' }
			]
		});
		const verdict = check('5', blank);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback ?? '').not.toMatch(/diviseur|Autre que 1/);
	});

	it.each(['abc', 'x', ''])(
		'saisie non numérique (%s) : jamais la description, retour inchangé',
		(answer) => {
			const verdict = check(answer, counterExampleB02());
			expect(verdict.isCorrect).toBe(false);
			expect(verdict.feedback ?? '').not.toBe(NOT_A_COUNTER_EXAMPLE);
		}
	);
});

describe('note de migration (« Legacy testAnswer: … ») : jamais montrée à l’élève', () => {
	const legacy: ValidationRule = {
		type: 'custom',
		expression: 'answer != 1',
		description: 'Legacy testAnswer: &answer!=1'
	};

	it('rulesSuffice : retour ordinaire', () => {
		const verdict = check('1', counterExampleB02({ validationRules: [legacy] }));
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback ?? '').not.toMatch(/Legacy|&answer/);
	});

	it('règle en pré-condition (sans le mode) : message générique en français', () => {
		const verdict = check(
			'1',
			counterExampleB02({ validationRules: [legacy], rulesSuffice: undefined })
		);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback).toBe('Ta réponse ne satisfait pas les critères demandés.');
	});
});
