/**
 * Cadres de réponse automatiques (ADR 0030, lot 3)
 * ================================================
 *
 * Avec « réponses sur le sujet », un cadre après chaque question (défaut) ou
 * après l'exercice. Une question = un élément de premier niveau d'une liste
 * numérotée de premier niveau de l'énoncé. Hauteur estimée d'après le corrigé
 * de la même variante, découpé de la même façon.
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import {
	ANSWER_FRAME_HEIGHT_CM,
	EXERCISE_FRAME_MAX_CM,
	answerFrameSize,
	answerLines,
	estimateAnswerFrames,
	estimateForView,
	MAX_VIEW_QUESTIONS,
	questionItems
} from '../answer-frames';
import { EXERCISE_FRAME_HEIGHTS_CM } from '$lib/types/worksheets';
import type { ParagraphNode } from '$lib/ubumark/types';

const PARTS = [
	'**Partie A**',
	'',
	'1. Q1',
	'2. Q2',
	'3. Q3',
	'',
	'**Partie B**',
	'',
	'1. Q4',
	'2. Q5'
].join('\n');

const WITH_SUBQUESTIONS = [
	'Soit $f(x)=x^2$.',
	'',
	'1. Étudier $f$.',
	'   1. Dériver.',
	'   2. Conclure.',
	'2. Tracer.'
].join('\n');

/** Une réponse de 1, 4 et 9 lignes : petit, moyen, grand */
const SHORT = '$x = 2$';
const MEDIUM = ['Ligne un.', '', 'Ligne deux.', '', 'Ligne trois.', '', 'Ligne quatre.'].join('\n');
const LONG = Array.from({ length: 9 }, (_, i) => `Étape ${i + 1}.`).join('\n\n');

function indentItem(text: string): string {
	return text
		.split('\n')
		.map((line, i) => (i === 0 || line === '' ? line : `   ${line}`))
		.join('\n');
}

function numbered(...answers: string[]): string {
	return answers.map((a, i) => `${i + 1}. ${indentItem(a)}`).join('\n\n');
}

describe('découpage en questions', () => {
	it('une liste numérotée : un élément, une question', () => {
		expect(questionItems(parseMarkdown('1. A\n2. B\n3. C'))).toHaveLength(3);
	});

	it('deux listes séparées par des paragraphes : toutes leurs questions comptent', () => {
		expect(questionItems(parseMarkdown(PARTS))).toHaveLength(5);
	});

	it('les sous-questions restent dans leur question', () => {
		expect(questionItems(parseMarkdown(WITH_SUBQUESTIONS))).toHaveLength(2);
	});

	it('pas de liste numérotée (ou une liste à puces) : aucune question', () => {
		expect(questionItems(parseMarkdown('Calculer $2+3$.'))).toHaveLength(0);
		expect(questionItems(parseMarkdown('- A\n- B'))).toHaveLength(0);
	});
});

describe('taille estimée d’après la longueur de la réponse', () => {
	it('une ligne : petit ; quatre : moyen ; neuf : grand', () => {
		expect(answerFrameSize(answerLines(parseMarkdown(SHORT).children))).toBe('small');
		expect(answerFrameSize(answerLines(parseMarkdown(MEDIUM).children))).toBe('medium');
		expect(answerFrameSize(answerLines(parseMarkdown(LONG).children))).toBe('large');
	});

	it('un long paragraphe compte plusieurs lignes', () => {
		const paragraph = 'mot '.repeat(80);
		expect(answerLines(parseMarkdown(paragraph).children)).toBeGreaterThan(3);
	});

	it('une formule compte ses symboles, pas ses commandes LaTeX', () => {
		const formula = '$\\dfrac{\\sqrt{2}}{2}$';
		const text = 'abcdefghijklmnopqrstu';
		expect(answerLines(parseMarkdown(formula).children)).toBe(1);
		expect(answerLines(parseMarkdown(text).children)).toBe(1);
	});

	it('hauteurs : petit < moyen < grand', () => {
		expect(ANSWER_FRAME_HEIGHT_CM.small).toBeLessThan(ANSWER_FRAME_HEIGHT_CM.medium);
		expect(ANSWER_FRAME_HEIGHT_CM.medium).toBeLessThan(ANSWER_FRAME_HEIGHT_CM.large);
	});
});

describe('correspondance énoncé / corrigé', () => {
	it('autant d’éléments : chaque question prend la taille de sa réponse', () => {
		const estimate = estimateAnswerFrames('1. A\n2. B\n3. C', numbered(SHORT, LONG, MEDIUM));
		expect(estimate.questions).toEqual(['small', 'large', 'medium']);
	});

	it('deux parties dans l’énoncé et le corrigé : la correspondance suit l’ordre', () => {
		const solution = `**Partie A**\n\n${numbered(SHORT, SHORT, LONG)}\n\n**Partie B**\n\n${numbered(SHORT, MEDIUM)}`;
		expect(estimateAnswerFrames(PARTS, solution).questions).toEqual([
			'small',
			'small',
			'large',
			'small',
			'medium'
		]);
	});

	it('nombre différent : toutes les questions en taille moyenne', () => {
		const estimate = estimateAnswerFrames('1. A\n2. B\n3. C', numbered(SHORT, LONG));
		expect(estimate.questions).toEqual(['medium', 'medium', 'medium']);
	});

	it('corrigé vide ou absent : taille moyenne', () => {
		expect(estimateAnswerFrames('1. A\n2. B', null).questions).toEqual(['medium', 'medium']);
		expect(estimateAnswerFrames('1. A\n2. B', '').questions).toEqual(['medium', 'medium']);
		expect(estimateAnswerFrames('Calculer.', null).exercise_cm).toBe(ANSWER_FRAME_HEIGHT_CM.medium);
	});

	it('énoncé sans question : aucune taille par question', () => {
		expect(estimateAnswerFrames('Calculer $2+3$.', SHORT).questions).toEqual([]);
	});

	it('cadre d’exercice : d’après tout le corrigé, plus grand si très long, plafonné', () => {
		expect(estimateAnswerFrames('Calculer.', SHORT).exercise_cm).toBe(ANSWER_FRAME_HEIGHT_CM.small);
		const veryLong = Array.from({ length: 14 }, (_, i) => `Étape ${i + 1}.`).join('\n\n');
		// Hauteurs fermées (audit S1) : la hauteur ne dit pas la longueur à la ligne près
		const long = estimateAnswerFrames('Calculer.', veryLong).exercise_cm;
		expect(long).toBe(10);
		expect(EXERCISE_FRAME_HEIGHTS_CM).toContain(long);
		const huge = Array.from({ length: 80 }, (_, i) => `Étape ${i + 1}.`).join('\n\n');
		expect(estimateAnswerFrames('Calculer.', huge).exercise_cm).toBe(EXERCISE_FRAME_MAX_CM);
	});
});

describe('ce que la vue de l’élève reçoit (audit S1, R5)', () => {
	const questions = estimateAnswerFrames('1. A\n2. B\n3. C', numbered(SHORT, LONG, MEDIUM));

	it('mode question : les tailles par question, jamais la hauteur de l’exercice', () => {
		expect(estimateForView(questions, 'question')).toEqual({
			questions: ['small', 'large', 'medium']
		});
	});

	it('mode exercice : la hauteur seule, sans les tailles par question', () => {
		expect(estimateForView(questions, 'exercise')).toEqual({ exercise_cm: questions.exercise_cm });
	});

	it('énoncé sans question : la hauteur seule, même en mode question', () => {
		const single = estimateAnswerFrames('Calculer.', SHORT);
		expect(estimateForView(single, 'question')).toEqual({
			exercise_cm: ANSWER_FRAME_HEIGHT_CM.small
		});
	});

	it('plus de questions que le schéma n’en accepte : tronqué, jamais d’erreur', () => {
		const many = estimateAnswerFrames(
			Array.from({ length: MAX_VIEW_QUESTIONS + 50 }, (_, i) => `${i + 1}. Q`).join('\n'),
			null
		);
		expect(estimateForView(many, 'question').questions).toHaveLength(MAX_VIEW_QUESTIONS);
	});
});

describe('nœuds en ligne : leur texte compte (revue R4)', () => {
	const paragraph = (child: ParagraphNode['children'][number]): ParagraphNode => ({
		type: 'paragraph',
		children: [child]
	});

	it('mot-dièse, mention et lien interne : leur texte, pas un forfait', () => {
		const long = 'x'.repeat(200);
		expect(answerLines([paragraph({ type: 'hashtag', tag: long })])).toBe(4);
		expect(answerLines([paragraph({ type: 'mention', username: long })])).toBe(4);
		expect(
			answerLines([
				paragraph({ type: 'internal-link', referenceType: 'exercise', uuid: 'u', label: long })
			])
		).toBe(4);
	});
});
