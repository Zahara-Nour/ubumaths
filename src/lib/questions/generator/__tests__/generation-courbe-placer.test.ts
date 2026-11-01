/**
 * Question à points à placer dans un repère (` ```courbe ` + `placer:`, chantier
 * `docs/wip/points-repere-progress.md` § 3, lot 1)
 *
 * Même patron que la droite à placer : une case par point, réponse attendue =
 * les coordonnées du point (`2;3`), jamais écrite dans le modèle ; la réponse
 * de l'élève (le nœud où il a posé le point) passe par un juge à part, sur les
 * nombres exacts.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-courbe-placer',
		title: 'Placer des points',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['5'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const courbe = (...body: string[]) => ['```courbe', ...body, '```'].join('\n');
const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4', 'grille: 1'];
const PLACER_2 = 'placer: A=(2 ; 3) ; B=(-1 ; 2)';

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

describe('assignBlankIndices — points à placer dans un repère', () => {
	it('une case texte par point, `case:` = la première, posée dans le bloc', () => {
		const result = assignBlankIndices(courbe(...WINDOW, PLACER_2));
		expect(result.totalBlanks).toBe(2);
		expect(result.blankTypes).toEqual(['text', 'text']);
		expect(result.statement).toBe(courbe('case: 0', ...WINDOW, PLACER_2));
		const source = [...WINDOW, PLACER_2].join('\n');
		expect(result.buildBlanks).toEqual({
			0: { kind: 'courbe', source, point: 0 },
			1: { kind: 'courbe', source, point: 1 }
		});
	});

	it('repère sans placer: : aucune case, bloc inchangé', () => {
		const statement = courbe(...WINDOW, 'f(x) = x');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(statement);
	});

	it('dans l’ordre du texte avec les autres cases', () => {
		const statement = ['Calcule $2+3=?$.', '', courbe(...WINDOW, PLACER_2), '', 'Et $1+1=?$.'].join(
			'\n'
		);
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(4);
		expect(result.statement).toContain('case: 1');
		expect(result.statement).toContain('\\placeholder[3]');
		expect(Object.keys(result.buildBlanks ?? {})).toEqual(['1', '2']);
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = [
			'- Place A :',
			'',
			'  ```courbe',
			...WINDOW.map((l) => `  ${l}`),
			'  placer: A=(2 ; 3)',
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(/premier niveau/);
	});

	it('bloc cité : pas de case, signalé', () => {
		const statement = courbe(...WINDOW, 'placer: A=(2 ; 3)')
			.split('\n')
			.map((l) => `> ${l}`)
			.join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(/premier niveau/);
	});

	it('repère à placer comme option d’un bloc choix : refusé', () => {
		const option = [
			'- ```courbe',
			...[...WINDOW, 'placer: A=(2 ; 3)'].map((l) => `  ${l}`),
			'  ```'
		];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('points à placer : les cases et leurs réponses', () => {
	it('une case par point, réponse = ses coordonnées, juge à part', () => {
		const instance = generate(
			template({ statement: `Place les points.\n\n${courbe(...WINDOW, PLACER_2)}` })
		);
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.type, b.construire])).toEqual([
			['2;3', 'text', 'courbe'],
			['-1;2', 'text', 'courbe']
		]);
		expect(validateAnswer(['2;3', '-1;2'], instance, ['2;3', '-1;2']).status).toBe('correct');
		const swapped = validateAnswer(['3;2', '-1;2'], instance, ['3;2', '-1;2']);
		expect(swapped.isCorrect).toBe(false);
		expect(validateAnswer(['2;3', ''], instance, ['2;3', '']).isCorrect).toBe(false);
		expect(isBlankValueCorrect('2;3', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('2.0;3', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('3;2', instance.blanks![0], instance)).toBe(false);
	});

	it('un point seul sans nom : une case', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, 'placer: (0 ; -3)') }));
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['0;-3']);
	});

	it('grille: 0,5 : réponse en point décimal', () => {
		const instance = generate(
			template({
				statement: courbe('x: -5 ; 5', 'y: -4 ; 4', 'grille: 0,5', 'placer: A=(1,5 ; -0,5)')
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('1.5;-0.5');
		expect(isBlankValueCorrect('1.5;-0.5', instance.blanks![0], instance)).toBe(true);
	});

	it('variables : réponse attendue sur l’énoncé résolu', () => {
		const instance = generate(
			template({
				statement: courbe(...WINDOW, 'placer: A=({{a}} ; {{b}})'),
				variables: [
					{ name: 'a', expression: '-2' },
					{ name: 'b', expression: '4' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('-2;4');
	});

	it('cible hors d’un nœud de la grille : refusée au prof', () => {
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'placer: A=(1,3 ; 2)') }))
		).toMatch(/Case 1 \(repère\).*A n['’]est pas sur un nœud de la grille/);
	});

	it('cible hors de la fenêtre : refusée au prof', () => {
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'placer: A=(9 ; 2)') }))
		).toMatch(/Case 1 \(repère\).*hors de la fenêtre/);
	});

	it('nom déjà pris par un point donné : refusé', () => {
		expect(
			generationErrors(
				template({ statement: courbe(...WINDOW, 'points: A(1 ; 1)', 'placer: A=(2 ; 3)') })
			)
		).toMatch(/A est déjà un point donné/);
	});

	it('`case:` écrite par le prof : refusée', () => {
		expect(
			generationErrors(template({ statement: courbe('case: 0', ...WINDOW, 'placer: A=(2 ; 3)') }))
		).toMatch(/case: est posée automatiquement/);
	});

	it('réponse écrite dans blanks[] pour une case du repère : refusée', () => {
		expect(
			generationErrors(
				template({
					statement: courbe(...WINDOW, 'placer: A=(2 ; 3)'),
					blanks: [{ expectedAnswer: '2;3' }]
				})
			)
		).toMatch(/case 1.*coordonnées/i);
	});

	it('blanks[] sans les cases du repère : alignées', () => {
		const instance = generate(
			template({
				statement: [courbe(...WINDOW, PLACER_2), '', 'Écris $5+1=?$.'].join('\n'),
				blanks: [{ expectedAnswer: '6' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['2;3', '-1;2', '6']);
	});

	it('bloc non fermé : refusé', () => {
		expect(
			generationErrors(
				template({
					statement: ['Place A.', '```courbe', ...WINDOW, 'placer: A=(2 ; 3)', '', 'Fin.'].join(
						'\n'
					)
				})
			)
		).toMatch(/Case 1 \(repère\).*non fermé/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à points à placer', () => {
		const errors = validateTemplate(
			template({ statement: courbe(...WINDOW, 'placer: A=(2 ; 3)') })
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : UNE ligne pour le repère, la réponse de chaque point', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, PLACER_2) }));
		const { lines } = buildExpectedResult(instance, { values: ['3;2', '-1;2'] });
		const builds = lines.filter((l) => l.kind === 'build');
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({
			kind: 'build',
			buildKind: 'courbe',
			source: [...WINDOW, PLACER_2].join('\n'),
			status: 'incorrect',
			answers: [
				{ answer: '3;2', status: 'incorrect' },
				{ answer: '-1;2', status: 'correct' }
			]
		});
	});

	it('copie corrigée sans réponse : « Tu n’as rien placé. »', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, 'placer: A=(2 ; 3)') }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(lines.some((l) => l.kind === 'empty' && /rien placé/.test(l.text))).toBe(true);
	});
});
