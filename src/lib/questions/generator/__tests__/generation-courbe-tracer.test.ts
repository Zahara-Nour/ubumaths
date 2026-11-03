/**
 * Question à droite à tracer dans un repère (` ```courbe ` + `tracer:`, chantier
 * `docs/archive/wip/points-repere-progress.md` § 3, lot 2)
 *
 * Une case pour la droite ; réponse attendue = l'équation (normalisée), jamais
 * écrite dans le modèle ; la réponse de l'élève (`x1;y1/x2;y2`, deux nœuds) est
 * juste si les deux points sont distincts et sur la droite.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-courbe-tracer',
		title: 'Tracer une droite',
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
const TRACER = 'tracer: y = 2x - 1';

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

describe('assignBlankIndices — droite à tracer', () => {
	it('une case texte, posée dans le bloc', () => {
		const result = assignBlankIndices(courbe(...WINDOW, TRACER));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(courbe('case: 0', ...WINDOW, TRACER));
	});
});

describe('droite à tracer : la case et sa réponse', () => {
	it('réponse attendue = l’équation ; toute paire de points de la droite est juste', () => {
		const instance = generate(
			template({
				statement: `Trace la droite d’équation $y = 2x - 1$.\n\n${courbe(...WINDOW, TRACER)}`
			})
		);
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.type, b.construire])).toEqual([
			['y = 2x - 1', 'text', 'courbe']
		]);
		expect(validateAnswer(['0;-1/1;1'], instance, ['0;-1/1;1']).status).toBe('correct');
		expect(validateAnswer(['3;5/-2;-5'], instance, ['3;5/-2;-5']).status).toBe('correct');
		expect(validateAnswer(['0;-1/1;2'], instance, ['0;-1/1;2']).isCorrect).toBe(false);
		expect(validateAnswer(['1;1/1;1'], instance, ['1;1/1;1']).isCorrect).toBe(false);
		expect(validateAnswer(['0;-1/'], instance, ['0;-1/']).isCorrect).toBe(false);
		expect(isBlankValueCorrect('0;-1/1;1', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('0;-1/1;2', instance.blanks![0], instance)).toBe(false);
	});

	it('variables : équation résolue, signes normalisés', () => {
		const instance = generate(
			template({
				statement: courbe(...WINDOW, 'tracer: y = {{m}}x + {{p}}'),
				variables: [
					{ name: 'm', expression: '-2' },
					{ name: 'p', expression: '-3' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('y = -2x - 3');
		expect(isBlankValueCorrect('0;-3/-1;-1', instance.blanks![0], instance)).toBe(true);
	});

	it('cartésienne et verticale', () => {
		const cartesian = generate(
			template({ statement: courbe(...WINDOW, 'tracer: 2x + 3y - 6 = 0') })
		);
		expect(isBlankValueCorrect('3;0/0;2', cartesian.blanks![0], cartesian)).toBe(true);
		const vertical = generate(template({ statement: courbe(...WINDOW, 'tracer: x = 3') }));
		expect(isBlankValueCorrect('3;-4/3;1', vertical.blanks![0], vertical)).toBe(true);
		expect(isBlankValueCorrect('3;-4/2;1', vertical.blanks![0], vertical)).toBe(false);
	});

	it('droite sans deux nœuds dans la fenêtre : refusée au prof', () => {
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'tracer: y = 0.5x + 0.25') }))
		).toMatch(/Case 1 \(repère\).*moins de deux nœuds/);
	});

	it('avec placer: : refusé', () => {
		expect(
			generationErrors(template({ statement: courbe(...WINDOW, 'placer: A=(1 ; 1)', TRACER) }))
		).toMatch(/tracer: et placer: ne vont pas ensemble/);
	});

	it('`tracer: ?` écrit dans un modèle : refusé', () => {
		expect(generationErrors(template({ statement: courbe(...WINDOW, 'tracer: ?') }))).toMatch(
			/« \? » à la place d’une valeur/
		);
	});

	it('le validateur de modèle accepte une question sans blanks[] à droite à tracer', () => {
		const errors = validateTemplate(template({ statement: courbe(...WINDOW, TRACER) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le repère, la réponse de l’élève (une case : `answer`)', () => {
		const instance = generate(template({ statement: courbe(...WINDOW, TRACER) }));
		const { lines } = buildExpectedResult(instance, { values: ['0;-1/1;2'] });
		const builds = lines.filter((l) => l.kind === 'build');
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({
			kind: 'build',
			buildKind: 'courbe',
			status: 'incorrect',
			answer: '0;-1/1;2'
		});
	});
});

describe('évaluation notée : l’énoncé envoyé ne dit pas la droite', () => {
	const STATEMENT = `Trace la droite.\n\n${courbe(...WINDOW, TRACER)}`;

	it('`tracer: ?`, le bloc masqué se lit', () => {
		const masked = maskGestureAnswers(STATEMENT);
		expect(masked).toContain('tracer: ?');
		expect(masked).not.toContain('2x - 1');
		const body = masked.split('\n').slice(3, -1).join('\n');
		const node = parseCourbeContent(body);
		expect(node.errors).toEqual([]);
		expect(node.spec!.tracer!.equation).toBe('?');
	});

	it('garde : un tracer: non masqué est signalé, masqué il ne l’est plus', () => {
		expect(findUnmaskedAnswers(STATEMENT)).toEqual(['courbe']);
		expect(findUnmaskedAnswers(maskGestureAnswers(STATEMENT))).toEqual([]);
	});
});
