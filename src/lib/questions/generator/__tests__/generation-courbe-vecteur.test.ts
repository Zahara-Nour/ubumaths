/**
 * Question à vecteur à tracer dans un repère (` ```courbe ` + `tracer: vecteur …`,
 * chantier `docs/wip/points-repere-progress.md` § 3 et § 10, lot 3)
 *
 * Une case pour le vecteur ; réponse attendue = `vecteur 3;-2` (origine imposée :
 * `vecteur 3;-2 depuis -1;2`), jamais écrite dans le modèle ; la réponse de
 * l'élève (`x1;y1/x2;y2`, origine puis extrémité) est juste si l'extrémité moins
 * l'origine donne le vecteur.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { hasMaskedValue } from '$lib/ubumark/utils/masked-value';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-courbe-vecteur',
		title: 'Tracer un vecteur',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['2'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const courbe = (...body: string[]) => ['```courbe', ...body, '```'].join('\n');
const WINDOW = ['x: -5 ; 5', 'y: -5 ; 5', 'grille: 1'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	expect(result.success).toBe(false);
	return result.success ? '' : result.errors.join(' ; ');
}

describe('vecteur à tracer : la case et sa réponse', () => {
	it('une case texte, posée dans le bloc', () => {
		const result = assignBlankIndices(courbe(...WINDOW, 'tracer: vecteur (3 ; -2)'));
		expect(result.totalBlanks).toBe(1);
		expect(result.statement).toBe(courbe('case: 0', ...WINDOW, 'tracer: vecteur (3 ; -2)'));
	});

	it('origine libre : toute flèche du bon vecteur est juste', () => {
		const instance = generate(
			template({ statement: courbe(...WINDOW, 'tracer: vecteur u = (3 ; -2)') })
		);
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.construire])).toEqual([
			['vecteur 3;-2', 'courbe']
		]);
		expect(validateAnswer(['0;0/3;-2'], instance, ['0;0/3;-2']).status).toBe('correct');
		expect(isBlankValueCorrect('-4;3/-1;1', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('3;-2/0;0', instance.blanks![0], instance)).toBe(false);
	});

	it('origine imposée et variables', () => {
		const instance = generate(
			template({
				statement: courbe(
					...WINDOW,
					'points: A({{a}};2)',
					'tracer: vecteur ({{b}} ; {{c}}) depuis A'
				),
				variables: [
					{ name: 'a', expression: '-1' },
					{ name: 'b', expression: '3' },
					{ name: 'c', expression: '-2' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('vecteur 3;-2 depuis -1;2');
		expect(isBlankValueCorrect('-1;2/2;0', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('0;0/3;-2', instance.blanks![0], instance)).toBe(false);
	});

	it('vecteur qui ne tient pas : refusé au prof', () => {
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'tracer: vecteur (11 ; 0)') }))
		).toMatch(/ne tient pas/);
	});

	it('`tracer: vecteur ?` écrit dans un modèle : refusé', () => {
		expect(hasMaskedValue('tracer: vecteur u = ? depuis A')).toBe(true);
		expect(hasMaskedValue('tracer: vecteur (3 ; -2) depuis A')).toBe(false);
		expect(hasMaskedValue('tracer: vecteur?')).toBe(true);
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'tracer: vecteur ?') }))
		).toMatch(/« \? » à la place d’une valeur/);
	});
});

describe('évaluation notée : l’énoncé envoyé ne dit pas le vecteur', () => {
	const STATEMENT = `Trace le vecteur.\n\n${courbe(
		...WINDOW,
		'points: A(-1;2)',
		'tracer: vecteur u = (3 ; -2) depuis A'
	)}`;

	it('coordonnées masquées, nom et origine gardés ; le bloc masqué se lit', () => {
		const masked = maskGestureAnswers(STATEMENT);
		expect(masked).toContain('tracer: vecteur u = ? depuis A');
		expect(masked).not.toContain('-2)');
		const body = masked.split('\n').slice(3, -1).join('\n');
		const node = parseCourbeContent(body);
		expect(node.errors).toEqual([]);
		expect(node.spec!.vecteur).toMatchObject({ name: 'u', coords: null, from: 'A' });
	});

	it('garde : un vecteur non masqué est signalé, masqué il ne l’est plus', () => {
		expect(findUnmaskedAnswers(STATEMENT)).toEqual(['courbe']);
		expect(findUnmaskedAnswers(maskGestureAnswers(STATEMENT))).toEqual([]);
	});

	it('écrit sans espace (`vecteur(3;-2)`) : masqué en `vecteur ?`, la garde se tait', () => {
		const statement = courbe(...WINDOW, 'tracer: vecteur(3;-2)');
		const masked = maskGestureAnswers(statement);
		expect(masked).toContain('tracer: vecteur ?');
		expect(findUnmaskedAnswers(masked)).toEqual([]);
	});

	it('la droite à tracer se masque toujours en entier', () => {
		expect(maskGestureAnswers(courbe(...WINDOW, 'tracer: y = 2x - 1'))).toContain('tracer: ?');
	});
});
