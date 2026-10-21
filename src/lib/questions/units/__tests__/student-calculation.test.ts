/**
 * Case à unité : calcul écrit par l'élève (PR 2 bis du chantier correction-cases-unite)
 * =====================================================================================
 *
 * Décisions de David du 2026-10-21 (journal `docs/wip/correction-cases-unite-progress.md`,
 * « phase 0 finale ») : une fois l'unité séparée, la partie numérique est jugée comme
 * une case sans unité en mode « nombre simple » (notation scientifique admise en plus).
 * Le calcul est lu selon l'ADR 0031 : `2×3 m` = (2×3) m, `3+2 m` = 3 + (2 m).
 *
 * Les saisies sont celles de MathLive : une unité reconnue arrive
 * `\operatorname{\mathrm{m}}`, une touche du clavier d'unités `\mathrm{m}`, des
 * lettres tapées au clavier ordinaire arrivent nues (`3m`).
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

const FORM_MESSAGE = "Ta réponse n'est pas écrite sous la forme demandée.";

/** Une unité telle que MathLive l'écrit quand il la reconnaît */
function typed(unit: string): string {
	return `\\operatorname{\\mathrm{${unit}}}`;
}

function createInstance(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'test-student-calculation',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['5'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

/** Soumet une saisie MathLive dans un trou à unité */
function submit(latex: string, expectedAnswer: string, required?: string) {
	const blank: InstanceBlank = {
		expectedAnswer,
		type: 'math',
		unit: required ? { expected: true, required } : { expected: true }
	};
	return validateAnswer([latex], createInstance(blank), [latex]);
}

// ============================================================================
// NOMINAL : réponses simples inchangées
// ============================================================================

describe('case à unité — réponses simples, inchangées', () => {
	it.each([
		['6' + typed('m'), '6\\unit{m}'],
		['6m', '6\\unit{m}'],
		['2{,}5' + typed('km'), '2500\\unit{m}'],
		['\\frac{1}{2}' + typed('h'), '30\\unit{min}'],
		['1{,}5\\cdot10^{3}' + typed('m'), '1500\\unit{m}'],
		['-\\frac{1}{2}' + typed('m'), '-0.5\\unit{m}']
	])('%s pour %s : juste', (answer, expected) => {
		expect(submit(answer, expected)).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it('6/2 m pour 3 m : juste, fraction à simplifier', () => {
		expect(submit('\\frac{6}{2}' + typed('m'), '3\\unit{m}')).toMatchObject({
			isCorrect: true,
			status: 'unoptimal_form',
			feedback: 'La fraction peut être simplifiée.'
		});
	});
});

// ============================================================================
// CALCUL NON EFFECTUÉ, BONNE GRANDEUR : forme demandée
// ============================================================================

describe('case à unité — calcul non effectué de la bonne grandeur', () => {
	it.each([
		['2\\times3' + typed('m'), '6\\unit{m}'],
		['2\\times3m', '6\\unit{m}'],
		['2\\times3\\mathrm{m}', '6\\unit{m}'],
		['3' + typed('m') + '+2' + typed('m'), '5\\unit{m}'],
		['3m+2m', '5\\unit{m}'],
		['(3+2)' + typed('m'), '5\\unit{m}'],
		['10^{3}' + typed('m'), '1000\\unit{m}'],
		['2^{3}' + typed('m'), '8\\unit{m}'],
		['2' + typed('m') + '\\times3' + typed('m'), '6\\unit{m^2}'],
		['3' + typed('h') + '+30\\min', '210\\unit{min}']
	])('%s pour %s : forme demandée', (answer, expected) => {
		expect(submit(answer, expected)).toMatchObject({
			isCorrect: false,
			status: 'bad_form',
			feedback: FORM_MESSAGE
		});
	});
});

// ============================================================================
// CALCUL FAUX OU ILLISIBLE
// ============================================================================

describe('case à unité — calcul faux, refusé ou illisible', () => {
	it('2×3 m pour 7 m : valeur incorrecte', () => {
		expect(submit('2\\times3' + typed('m'), '7\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'Valeur incorrecte.'
		});
	});

	it('2×3 kg pour 6 m : pas la bonne grandeur', () => {
		expect(submit('2\\times3' + typed('kg'), '6\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'Cette unité ne mesure pas la bonne grandeur.'
		});
	});

	it('3+2 m pour 5 m : un nombre et une longueur ne s’ajoutent pas', () => {
		expect(submit('3+2' + typed('m'), '5\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'On ne peut pas ajouter un nombre sans unité et une longueur.'
		});
	});

	it.each(['2\\sqrt{2}', '3\\pi'])('%s m pour 3 m : valeur incorrecte', (value) => {
		expect(submit(value + typed('m'), '3\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'Valeur incorrecte.'
		});
	});

	it('3x m pour 3 m : réponse invalide', () => {
		expect(submit('3x' + typed('m'), '3\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'Réponse invalide : vérifier le format.'
		});
	});

	it('5xyz pour 5 m : unité inconnue, inchangé', () => {
		expect(submit('5xyz', '5\\unit{m}')).toMatchObject({
			isCorrect: false,
			feedback: 'Unité inconnue : xyz.'
		});
	});
});

// ============================================================================
// MODE « NOMBRE SIMPLE » TEL QU'IL EST (corrigé à la PR suivante)
// ============================================================================

describe('case à unité — la partie numérique suit le mode « nombre simple »', () => {
	it('(−3) m pour −3 m : forme demandée, comme (−3) sans unité', () => {
		expect(submit('(-3)' + typed('m'), '-3\\unit{m}')).toMatchObject({
			isCorrect: false,
			status: 'bad_form',
			feedback: FORM_MESSAGE
		});
	});

	it.each([
		['.5' + typed('m'), '0.5\\unit{m}'],
		['5{,}' + typed('m'), '5\\unit{m}']
	])('%s pour %s : juste, comme sans unité', (answer, expected) => {
		expect(submit(answer, expected)).toMatchObject({ isCorrect: true });
	});
});
