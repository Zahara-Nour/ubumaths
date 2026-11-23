/**
 * Erreurs prévues sur les cases à juge propre (`answerKind`)
 * ===========================================================
 *
 * `expected-errors.test.ts` couvre le calcul ordinaire. Ici : intervalles,
 * équation, vecteur, matrice. Chaque erreur prévue est comparée par le juge de
 * son type (valeur, écritures MathLive), de bout en bout : modèle → instance →
 * `buildExpectedResult`.
 */

import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';

// Fixtures

function template(blank: TemplateBlank): QuestionTemplate {
	return {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		grades: ['1_SPE'],
		title: 't',
		variations: [{ statement: '$?$', blanks: [blank], variables: [] }]
	} as unknown as QuestionTemplate;
}

function generate(t: QuestionTemplate): QuestionInstance {
	const r = generateInstance(t, 1);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

const answer = (value: string) => ({ values: [value], latex: [value] });
const remarks = (r: ExpectedResult) =>
	r.lines.flatMap((l) => (l.kind === 'remark' ? [l.text] : []));

/** Le même scénario pour chaque type : message, erreur prévue, bonne réponse, autre faute */
function scenario(
	instance: QuestionInstance,
	message: string,
	cases: { prevue: string; juste: string; autre: string }
) {
	it('nominal : la réponse fausse prévue reçoit son message, la note ne change pas', () => {
		const r = buildExpectedResult(instance, answer(cases.prevue));
		expect(r.status).toBe('incorrect');
		// Le message en tête ; le juge du type peut garder sa propre remarque derrière
		expect(remarks(r)[0]).toBe(message);
		expect(remarks(r).filter((t) => t === message)).toHaveLength(1);
	});

	it('une autre réponse fausse ne reçoit pas le message', () => {
		const r = buildExpectedResult(instance, answer(cases.autre));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).not.toContain(message);
	});

	it('la bonne réponse ne reçoit rien', () => {
		const r = buildExpectedResult(instance, answer(cases.juste));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('une case vide ne reçoit pas le message', () => {
		expect(remarks(buildExpectedResult(instance, answer('')))).not.toContain(message);
	});
}

describe('erreur prévue : case intervalles', () => {
	const MESSAGE = 'La borne 2 est exclue : le crochet va dans l’autre sens.';
	const instance = generate(
		template({
			expectedAnswer: ']2;+\\infty[',
			answerKind: 'intervalles',
			expectedErrors: [{ answer: '[2;+\\infty[', message: MESSAGE }]
		})
	);
	scenario(instance, MESSAGE, {
		prevue: '[2;+\\infty[',
		juste: ']2;+\\infty[',
		autre: ']3;+\\infty['
	});

	it('l’erreur prévue est résolue en LaTeX d’intervalle', () => {
		expect(instance.blanks?.[0].expectedErrors?.[0].answerLatex).toContain('\\infty');
	});

	it('même valeur, autre écriture : « S = » devant l’intervalle', () => {
		expect(remarks(buildExpectedResult(instance, answer('S=[2;+\\infty[')))[0]).toBe(MESSAGE);
	});
});

describe('erreur prévue : case équation', () => {
	const MESSAGE = 'Tu as changé le signe de l’ordonnée à l’origine.';
	const instance = generate(
		template({
			expectedAnswer: 'y=2x+1',
			answerKind: 'equation',
			expectedErrors: [{ answer: 'y=2x-1', message: MESSAGE }]
		})
	);
	scenario(instance, MESSAGE, {
		prevue: '2x-y-1=0', // même droite que y=2x-1, écrite autrement
		juste: '2x-y+1=0', // même droite que y=2x+1
		autre: 'y=3x+1'
	});

	it('la prévue écrite telle quelle reçoit aussi son message', () => {
		expect(remarks(buildExpectedResult(instance, answer('y=2x-1')))).toEqual([MESSAGE]);
	});
});

describe('erreur prévue : case vecteur', () => {
	const MESSAGE = 'Tu as pris l’opposé du vecteur.';
	const instance = generate(
		template({
			expectedAnswer: '(2;-3)',
			answerKind: 'vecteur',
			expectedErrors: [{ answer: '(-2;3)', message: MESSAGE }]
		})
	);
	scenario(instance, MESSAGE, {
		prevue: '\\begin{pmatrix}-2\\\\ 3\\end{pmatrix}', // colonne, alors que l'erreur est en coordonnées
		juste: '\\begin{pmatrix}2\\\\ -3\\end{pmatrix}',
		autre: '(3;2)'
	});

	it('la prévue en coordonnées reçoit son message', () => {
		expect(remarks(buildExpectedResult(instance, answer('(-2;3)')))).toEqual([MESSAGE]);
	});

	it('la bonne réponse en coordonnées ne reçoit rien', () => {
		const r = buildExpectedResult(instance, answer('(2;-3)'));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});
});

describe('erreur prévue : case matrice', () => {
	const MESSAGE = 'Tu as écrit la transposée.';
	const instance = generate(
		template({
			expectedAnswer: '\\begin{pmatrix}2&-1\\\\0&3\\end{pmatrix}',
			answerKind: 'matrice',
			expectedErrors: [{ answer: '\\begin{pmatrix}2&0\\\\-1&3\\end{pmatrix}', message: MESSAGE }]
		})
	);
	scenario(instance, MESSAGE, {
		prevue: '\\begin{pmatrix}2 & 0\\\\ -1 & 3\\end{pmatrix}', // écriture MathLive
		juste: '\\begin{pmatrix}2 & -1\\\\ 0 & 3\\end{pmatrix}',
		autre: '\\begin{pmatrix}2&-1\\\\0&4\\end{pmatrix}'
	});

	it('mauvaise dimension : pas de message prévu', () => {
		expect(
			remarks(buildExpectedResult(instance, answer('\\begin{pmatrix}2&0\\end{pmatrix}')))
		).not.toContain(MESSAGE);
	});
});
