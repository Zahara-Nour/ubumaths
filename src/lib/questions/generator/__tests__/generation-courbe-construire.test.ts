/**
 * Question à escalier à construire (` ```courbe ` + `construire N` sur la ligne d'une
 * suite récurrente, outil 48, `docs/wip/outil-escalier-suite-progress.md`)
 *
 * N cases (une par terme) ; réponse attendue de la case k = `escalier k=… ; u0=… ;
 * marge=… ; f=…`, jamais écrite dans le modèle ; la réponse de l'élève (la chaîne de
 * ses termes jusqu'à k) est juste si son terme k est à moins d'une marge de f(son
 * terme k − 1).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import {
	isBlankValueCorrect,
	validateAnswer,
	validateAnswerDetailed
} from '#lib/utils/answer-validator.ts';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { toPublicQuestion } from '../../public-question';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-courbe-construire',
		title: 'Construire les termes',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['T_SPE'],
		level: 1
	} as QuestionTemplate;
}

const courbe = (...body: string[]) => ['```courbe', ...body, '```'].join('\n');
const WINDOW = ['x: 0 ; 4', 'y: 0 ; 4'];
const RACINE = 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 construire 3';

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('escalier à construire : les cases et leurs réponses', () => {
	it('N cases, posées dans le bloc', () => {
		const result = assignBlankIndices(courbe(...WINDOW, RACINE));
		expect(result.totalBlanks).toBe(3);
		expect(result.statement).toBe(courbe('case: 0', ...WINDOW, RACINE));
	});

	it('une réponse attendue par terme ; chaque terme jugé depuis celui de l’élève', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, RACINE) }));
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.construire])).toEqual([
			['escalier k=1 ; u0=0 ; marge=0.12 ; f=sqrt(2*(x)+3)', 'courbe'],
			['escalier k=2 ; u0=0 ; marge=0.12 ; f=sqrt(2*(x)+3)', 'courbe'],
			['escalier k=3 ; u0=0 ; marge=0.12 ; f=sqrt(2*(x)+3)', 'courbe']
		]);
		const [b1, b2, b3] = instance.blanks!;
		expect(isBlankValueCorrect('1.73', b1, instance)).toBe(true);
		expect(isBlankValueCorrect('1.73;2.54', b2, instance)).toBe(true);
		expect(isBlankValueCorrect('1.73;2.54;2.84', b3, instance)).toBe(true);
		// Erreur sur u₁ : u₂ juste depuis le u₁ de l'élève
		expect(isBlankValueCorrect('1', b1, instance)).toBe(false);
		expect(isBlankValueCorrect('1;2.24', b2, instance)).toBe(true);
		// Terme absent
		expect(isBlankValueCorrect('1.73;', b2, instance)).toBe(false);
	});

	it('requête forgée : chaque case est jugée depuis la chaîne de la dernière case du repère', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, RACINE) }));
		// Case 2 qui ne prolonge pas la case 1 : avant, les trois étaient justes
		const forged = ['1.73', '0;1.73', '0;0;1.73'];
		expect(validateAnswer(forged, instance, forged).status).not.toBe('correct');
		const statuses = validateAnswerDetailed(instance, { values: forged }).blanks.map(
			(b) => b.status
		);
		// Chaîne retenue : 0 ; 0 ; 1.73 → u₁ = 0 faux, u₂ = 0 faux, u₃ = 1.73 juste depuis u₂ = 0
		expect(statuses).toEqual(['incorrect', 'incorrect', 'correct']);
	});

	it('ce que l’écran envoie reste jugé pareil, termes non posés compris', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, RACINE) }));
		const full = ['1.73', '1.73;2.54', '1.73;2.54;2.84'];
		expect(validateAnswer(full, instance, full).status).toBe('correct');
		const partial = ['1.84', '1.84;', '1.84;;'];
		expect(
			validateAnswerDetailed(instance, { values: partial }).blanks.map((b) => b.status)
		).toEqual(['correct', 'incorrect', 'incorrect']);
	});

	it('variables : u₀ et la relation viennent du tirage', () => {
		const instance = generate(
			template({
				statement: courbe(
					...WINDOW,
					'u(0) = {{a}} ; u(n+1) = {{b}}*u(n)+3 pour n de 0 à 4 construire 4'
				),
				variables: [
					{ name: 'a', expression: '0' },
					{ name: 'b', expression: '-0.5' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe(
			'escalier k=1 ; u0=0 ; marge=0.12 ; f=-0.5*(x)+3'
		);
		expect(isBlankValueCorrect('3;1.5;2.25', instance.blanks![2], instance)).toBe(true);
	});

	it('termes trop proches : refusé au prof', () => {
		const result = generateInstance(
			template({
				statement: courbe(
					...WINDOW,
					'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 4 construire 4'
				)
			}),
			42
		);
		expect(result.success).toBe(false);
		expect(result.success ? '' : result.errors.join(' ; ')).toMatch(/trop proches/);
	});
});

describe('évaluation notée : rien à masquer, rien qui fuie', () => {
	const STATEMENT = `Construis u₁, u₂ et u₃.\n\n${courbe(...WINDOW, RACINE)}`;

	it('l’énoncé masqué est l’énoncé ; la garde se tait', () => {
		expect(maskGestureAnswers(STATEMENT)).toBe(STATEMENT);
		expect(findUnmaskedAnswers(STATEMENT)).toEqual([]);
	});

	it('la question publique ne porte aucune réponse attendue', () => {
		const instance = generate(template({ statement: STATEMENT }));
		const question = toPublicQuestion(instance, { position: 0, delaySeconds: 0 });
		expect(JSON.stringify(question)).not.toContain('escalier k=');
		expect(JSON.stringify(question)).not.toContain('marge=');
		expect(question.blanks).toHaveLength(3);
	});
});
