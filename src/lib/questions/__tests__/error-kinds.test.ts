/**
 * Types d'erreur d'une réponse, case par case (chantier `type-erreur`, PR 2).
 */
import { describe, expect, it } from 'vitest';
import {
	answerErrorKinds,
	blankErrorGuess,
	blankErrorKindLabel,
	errorGuessLabel,
	errorGuessSentence
} from '../error-kinds';
import type { InstanceBlank, QuestionInstance, ValidationStatus } from '../types';
import {
	validateAnswerDetailed,
	type BlankVerdict,
	type DetailedVerdict
} from '#lib/utils/answer-validator.ts';

function instance(
	blanks: Partial<InstanceBlank>[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 't',
		statement: 'Calcule.',
		blanks: blanks.map((b) => ({ type: 'math', expectedAnswer: '', ...b })),
		options,
		grades: [],
		level: 1,
		generatedAt: '2026-11-15T10:00:00Z'
	} as unknown as QuestionInstance;
}

function math(expected: string): Partial<InstanceBlank> {
	return { expectedAnswer: expected, expectedAnswerLatex: expected };
}

function verdict(
	blanks: { answer: string; status?: ValidationStatus; remarks?: string[]; ungraded?: true }[],
	feedback?: string
): DetailedVerdict {
	const detailed: BlankVerdict[] = blanks.map((b, index) => ({
		index,
		status: b.status ?? 'incorrect',
		remarks: b.remarks ?? [],
		answer: b.answer,
		...(b.ungraded && { ungraded: true as const })
	}));
	return { status: 'incorrect', blanks: detailed, ...(feedback && { feedback }) };
}

describe('answerErrorKinds', () => {
	it('nominal : la case fausse porte son type', () => {
		const result = answerErrorKinds(
			instance([math('12')]),
			verdict([{ answer: '-12' }]),
			['-12'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [{ blank: 1, guess: { kind: 'sign' } }], unrecognized: 0 });
	});

	it('plusieurs cases : un type par case, les justes ignorées', () => {
		const result = answerErrorKinds(
			instance([math('35'), math('8'), math('25')]),
			verdict([{ answer: '3,5' }, { answer: '8', status: 'correct' }, { answer: '7' }]),
			['3,5', '8', '7'],
			'incorrect'
		);
		expect(result).toEqual({
			kinds: [{ blank: 1, guess: { kind: 'power-of-ten', exponent: -1 } }],
			unrecognized: 1
		});
	});

	it('mauvaise forme : bonne valeur, aucun type, rien de compté', () => {
		const result = answerErrorKinds(
			instance([math('7')]),
			verdict([{ answer: '\\frac{14}{2}', status: 'bad_form' }]),
			['\\frac{14}{2}'],
			'bad_form'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 0 });
	});

	it('message déjà donné à la case : il prime, aucun type', () => {
		const result = answerErrorKinds(
			instance([math('12')]),
			verdict([{ answer: '-12', remarks: ['Arrondis au dixième.'] }]),
			['-12'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 1 });
	});

	it('message global générique (« Les blancs suivants sont incorrects ») : type gardé', () => {
		const result = answerErrorKinds(
			instance([math('12')]),
			verdict([{ answer: '-12' }], 'Les blancs suivants sont incorrects: 1'),
			['-12'],
			'incorrect'
		);
		expect(result.kinds).toEqual([{ blank: 1, guess: { kind: 'sign' } }]);
	});

	it('ambiguïté (attendu 4, réponse 2) : non reconnue', () => {
		const result = answerErrorKinds(
			instance([math('4')]),
			verdict([{ answer: '2' }]),
			['2'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 1 });
	});

	it('cases hors écriture mathématique (choix, geste, tableau de signes) : non reconnues', () => {
		const result = answerErrorKinds(
			instance([
				{ type: 'choice', expectedAnswer: '1' },
				{ ...math('12'), construire: 'line' },
				{ ...math('12'), cellule: 'valeur' }
			]),
			verdict([{ answer: '-1' }, { answer: '-12' }, { answer: '-12' }]),
			['-1', '-12', '-12'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 3 });
	});

	it('cases appariées librement : attendu de la case inconnu, non reconnue', () => {
		const result = answerErrorKinds(
			instance([math('12'), math('5')], { orderIndependent: true }),
			verdict([{ answer: '-12' }, { answer: '5', status: 'correct' }]),
			['-12', '5'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 1 });
	});

	it('réponse trop longue (saisie arbitraire) : jamais lue, non reconnue', () => {
		const long = `-${'0'.repeat(80)}12`;
		const result = answerErrorKinds(
			instance([math('12')]),
			verdict([{ answer: long }]),
			[long],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 1 });
	});

	it('figure de travail : jamais comptée', () => {
		const result = answerErrorKinds(
			instance([{ type: 'graphical', expectedAnswer: '' }, math('12')]),
			verdict([{ answer: 'trace', status: 'empty', ungraded: true }, { answer: '-12' }]),
			['trace', '-12'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [{ blank: 2, guess: { kind: 'sign' } }], unrecognized: 0 });
	});

	it('détail indisponible, une case : lu d’après la valeur saisie', () => {
		const result = answerErrorKinds(
			instance([math('12')]),
			{ unavailable: true, status: 'incorrect' },
			['-12'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [{ blank: 1, guess: { kind: 'sign' } }], unrecognized: 0 });
	});

	it('détail indisponible, plusieurs cases : rien (on ne sait pas laquelle est fausse)', () => {
		const result = answerErrorKinds(
			instance([math('12'), math('5')]),
			{ unavailable: true, status: 'incorrect' },
			['-12', '5'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [], unrecognized: 0 });
	});
});

describe('answerErrorKinds — avec le vrai validateur', () => {
	it.each([
		['12', '-12', { kind: 'sign' }],
		['35', '3,5', { kind: 'power-of-ten', exponent: -1 }],
		['\\frac{3}{4}', '\\frac{4}{3}', { kind: 'inverse' }],
		['25', '5', { kind: 'square-missing' }]
	])('attendu %s, réponse %s : type reconnu', (expected, answer, guess) => {
		const inst = instance([math(expected)]);
		const detail = validateAnswerDetailed(inst, { values: [answer] });
		expect(detail.status).toBe('incorrect');
		expect(answerErrorKinds(inst, detail, [answer], 'incorrect').kinds).toEqual([
			{ blank: 1, guess }
		]);
	});
});

describe('answerErrorKinds — erreurs prévues (chantier idees-format, idée 3)', () => {
	/** Attendu 7 (3 + 4) ; erreur prévue −1 (3 − 4) */
	function withExpected(label?: string): QuestionInstance {
		return instance([
			{
				...math('7'),
				expectedErrors: [
					{
						answer: '-1',
						answerLatex: '-1',
						message: "Tu as soustrait au lieu d'additionner.",
						...(label !== undefined && { label })
					}
				]
			}
		]);
	}

	it('nominal : la réponse de l’erreur prévue compte sous son nom court', () => {
		const inst = withExpected('Soustraction au lieu d’addition');
		const detail = validateAnswerDetailed(inst, { values: ['-1'] });
		expect(answerErrorKinds(inst, detail, ['-1'], 'incorrect')).toEqual({
			kinds: [{ blank: 1, expected: 'Soustraction au lieu d’addition' }],
			unrecognized: 0
		});
	});

	it('sans nom court : sous le message de l’élève (Q2)', () => {
		const inst = withExpected();
		const detail = validateAnswerDetailed(inst, { values: ['-1'] });
		expect(answerErrorKinds(inst, detail, ['-1'], 'incorrect').kinds).toEqual([
			{ blank: 1, expected: "Tu as soustrait au lieu d'additionner." }
		]);
	});

	it('même valeur, autre écriture : la même erreur prévue (Q1)', () => {
		const inst = withExpected('Soustraction');
		const detail = validateAnswerDetailed(inst, { values: ['-\\frac{2}{2}'] });
		expect(answerErrorKinds(inst, detail, ['-\\frac{2}{2}'], 'incorrect').kinds).toEqual([
			{ blank: 1, expected: 'Soustraction' }
		]);
	});

	it('autre réponse fausse : le type deviné, comme avant', () => {
		const inst = withExpected('Soustraction');
		const detail = validateAnswerDetailed(inst, { values: ['-7'] });
		expect(answerErrorKinds(inst, detail, ['-7'], 'incorrect').kinds).toEqual([
			{ blank: 1, guess: { kind: 'sign' } }
		]);
	});

	it('erreur prévue ET remarque de la case : l’erreur prévue compte quand même', () => {
		const result = answerErrorKinds(
			withExpected('Soustraction'),
			verdict([{ answer: '-1', remarks: ['Arrondis au dixième.'] }]),
			['-1'],
			'incorrect'
		);
		expect(result).toEqual({ kinds: [{ blank: 1, expected: 'Soustraction' }], unrecognized: 0 });
	});

	it('détail indisponible, une case : l’erreur prévue se lit sur la valeur saisie', () => {
		const result = answerErrorKinds(
			withExpected('Soustraction'),
			{ unavailable: true, status: 'incorrect' },
			['-1'],
			'incorrect'
		);
		expect(result.kinds).toEqual([{ blank: 1, expected: 'Soustraction' }]);
	});
});

describe('blankErrorKindLabel', () => {
	it('type deviné : son étiquette ; erreur prévue : son nom', () => {
		expect(blankErrorKindLabel({ blank: 1, guess: { kind: 'power-of-ten', exponent: 2 } })).toBe(
			'Puissance de 10 (× 100)'
		);
		expect(blankErrorKindLabel({ blank: 1, expected: 'Soustraction' })).toBe('Soustraction');
	});
});

describe('errorGuessLabel', () => {
	it('nomme le type ; la puissance de 10 dit son facteur', () => {
		expect(errorGuessLabel({ kind: 'sign' })).toBe('Erreur de signe');
		expect(errorGuessLabel({ kind: 'square-missing' })).toBe('Carré oublié');
		expect(errorGuessLabel({ kind: 'power-of-ten', exponent: 3 })).toBe(
			'Puissance de 10 (× 1 000)'
		);
		expect(errorGuessLabel({ kind: 'power-of-ten', exponent: -1 })).toBe('Puissance de 10 (÷ 10)');
	});
});

describe('errorGuessSentence', () => {
	it('dit la relation, puis invite à vérifier (Q3)', () => {
		expect(errorGuessSentence({ kind: 'sign' })).toBe(
			"Ta réponse est l'opposé du résultat : vérifie le signe."
		);
		expect(errorGuessSentence({ kind: 'power-of-ten', exponent: 3 })).toBe(
			'Ta réponse est 1\u202f000 fois trop grande : vérifie la place de la virgule.'
		);
		expect(errorGuessSentence({ kind: 'power-of-ten', exponent: -2 })).toBe(
			'Ta réponse est 100 fois trop petite : vérifie la place de la virgule.'
		);
	});

	it('chaque type a sa phrase, sans formule (texte rendu tel quel)', () => {
		const kinds = ['sign', 'inverse', 'double', 'half', 'square-missing', 'square-extra'] as const;
		const sentences = kinds.map((kind) => errorGuessSentence({ kind }));
		expect(new Set(sentences).size).toBe(kinds.length);
		for (const s of sentences) expect(s).toMatch(/^[^$]+ : vérifie [^$]+\.$/);
	});
});

describe('blankErrorGuess', () => {
	const one = (answer: string, extra: Partial<BlankVerdict> = {}): BlankVerdict => ({
		index: 0,
		status: 'incorrect',
		remarks: [],
		answer,
		...extra
	});

	it('case fausse sans remarque : son type', () => {
		expect(blankErrorGuess(instance([math('12')]), one('-12'))).toEqual({ kind: 'sign' });
	});

	it('remarque déjà là, case juste, non notée : rien', () => {
		const inst = instance([math('12')]);
		expect(
			blankErrorGuess(inst, one('-12', { remarks: ['N’oublie pas le symbole %.'] }))
		).toBeNull();
		expect(blankErrorGuess(inst, one('-12', { status: 'unoptimal_form' }))).toBeNull();
		expect(blankErrorGuess(inst, one('-12', { ungraded: true }))).toBeNull();
	});

	it('case hors écriture mathématique ordinaire, ou appariement libre : rien', () => {
		expect(blankErrorGuess(instance([{ ...math('12'), type: 'text' }]), one('-12'))).toBeNull();
		expect(
			blankErrorGuess(instance([math('12')], { orderIndependent: true }), one('-12'))
		).toBeNull();
	});
});
