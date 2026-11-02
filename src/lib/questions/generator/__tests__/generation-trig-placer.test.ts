/**
 * Question à point(s) à placer sur le cercle trigonométrique (` ```trig ` +
 * `placer:`, chantier `docs/wip/cercle-trotteuse-progress.md` § 4 et § 6)
 *
 * Même patron que le repère à placer : une case par point, réponse attendue =
 * la mesure principale du point (`\frac{2\pi}{3}`), jamais écrite dans le
 * modèle ; la réponse de l'élève (le cran où il a posé le point, `'8'`) passe
 * par un juge à part, modulo 2π.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-trig-placer',
		title: 'Placer un point sur le cercle',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['1_SPE'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const trig = (...body: string[]) => ['```trig', ...body, '```'].join('\n');
const PLACER_2 = 'placer: M = 2*pi/3 ; N = -pi/4';

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

describe('assignBlankIndices — points à placer sur le cercle', () => {
	it('une case texte par point, `case:` = la première, posée dans le bloc', () => {
		const result = assignBlankIndices(trig(PLACER_2));
		expect(result.totalBlanks).toBe(2);
		expect(result.blankTypes).toEqual(['text', 'text']);
		expect(result.statement).toBe(trig('case: 0', PLACER_2));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'trig', source: PLACER_2, point: 0 },
			1: { kind: 'trig', source: PLACER_2, point: 1 }
		});
	});

	it('cercle sans placer: : aucune case, bloc inchangé', () => {
		const statement = trig('preset: sixths');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(statement);
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = ['- Place M :', '', '  ```trig', '  placer: M = pi/3', '  ```'].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(/premier niveau/);
	});

	it('cercle à placer comme option d’un bloc choix : refusé', () => {
		const option = ['- ```trig', '  placer: M = pi/3', '  ```'];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('points à placer sur le cercle : les cases et leurs réponses', () => {
	it('une case par point, réponse = sa mesure principale, juge modulo 2π', () => {
		const instance = generate(template({ statement: `Place les points.\n\n${trig(PLACER_2)}` }));
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.type, b.construire])).toEqual([
			['\\frac{2\\pi}{3}', 'text', 'trig'],
			['-\\frac{\\pi}{4}', 'text', 'trig']
		]);
		expect(validateAnswer(['8', '21'], instance, ['8', '21']).status).toBe('correct');
		expect(validateAnswer(['9', '21'], instance, ['9', '21']).isCorrect).toBe(false);
		expect(validateAnswer(['8', ''], instance, ['8', '']).isCorrect).toBe(false);
		expect(isBlankValueCorrect('8', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('9', instance.blanks![0], instance)).toBe(false);
	});

	it('angle au-delà d’un tour : mesure principale attendue', () => {
		const instance = generate(template({ statement: trig('placer: M = 13*pi/6') }));
		expect(instance.blanks?.[0].expectedAnswer).toBe('\\frac{\\pi}{6}');
		expect(isBlankValueCorrect('2', instance.blanks![0], instance)).toBe(true);
	});

	it('variables : réponse attendue sur l’énoncé résolu', () => {
		const instance = generate(
			template({
				statement: trig('placer: M = {{k}}*pi/4'),
				variables: [{ name: 'k', expression: '3' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('\\frac{3\\pi}{4}');
	});

	it('angle hors des crans : refusé au prof', () => {
		expect(generationErrors(template({ statement: trig('placer: M = pi/5') }))).toMatch(
			/Case 1 \(cercle trigonométrique\).*multiple de π\/12/
		);
	});

	it('`case:` écrite par le prof : refusée', () => {
		expect(generationErrors(template({ statement: trig('case: 0', 'placer: M = pi/3') }))).toMatch(
			/case: est posée automatiquement/
		);
	});

	it('`?` écrit par le prof : refusé', () => {
		expect(generationErrors(template({ statement: trig('placer: M = ?') }))).toMatch(
			/réservé à l’énoncé envoyé pendant une évaluation/
		);
	});

	it('réponse écrite dans blanks[] pour une case du cercle : refusée', () => {
		expect(
			generationErrors(
				template({ statement: trig('placer: M = pi/3'), blanks: [{ expectedAnswer: '4' }] })
			)
		).toMatch(/case 1.*cercle/i);
	});

	it('blanks[] sans les cases du cercle : alignées', () => {
		const instance = generate(
			template({
				statement: [trig(PLACER_2), '', 'Écris $5+1=?$.'].join('\n'),
				blanks: [{ expectedAnswer: '6' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual([
			'\\frac{2\\pi}{3}',
			'-\\frac{\\pi}{4}',
			'6'
		]);
	});

	it('bloc non fermé : refusé', () => {
		expect(
			generationErrors(
				template({ statement: ['Place M.', '```trig', 'placer: M = pi/3', '', 'Fin.'].join('\n') })
			)
		).toMatch(/Case 1 \(cercle trigonométrique\).*non fermé/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à point à placer', () => {
		const errors = validateTemplate(template({ statement: trig('placer: M = pi/3') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : UNE ligne pour le cercle, la réponse de chaque point', () => {
		const instance = generate(template({ statement: trig(PLACER_2) }));
		const { lines } = buildExpectedResult(instance, { values: ['9', '21'] });
		const builds = lines.filter((l) => l.kind === 'build');
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({
			kind: 'build',
			buildKind: 'trig',
			source: PLACER_2,
			status: 'incorrect',
			answers: [
				{ answer: '9', status: 'incorrect' },
				{ answer: '21', status: 'correct' }
			]
		});
	});
});

describe('évaluation notée : l’énoncé envoyé ne dit pas l’angle du bloc', () => {
	const META = { position: 0, delaySeconds: 20 };

	it('placer: M=? ; N=?, le bloc se lit encore, mêmes noms', () => {
		const full = generate(template({ statement: `Place M et N.\n\n${trig(PLACER_2)}` }));
		const { statement } = toPublicQuestion(full, META);
		const body = statement.split('```trig\n')[1].split('\n```')[0];
		expect(body).toContain('placer: M=? ; N=?');
		expect(body).not.toContain('pi');
		const node = parseTrigCircleContent(body).node!;
		expect(node.errors).toEqual([]);
		expect(node.placer?.map((p) => p.name)).toEqual(['M', 'N']);
		expect(node.caseIndex).toBe(0);
	});

	it('la garde voit un cercle à placer non masqué', () => {
		expect(findUnmaskedAnswers(trig('placer: M = pi/3'))).toEqual(['trig']);
		expect(findUnmaskedAnswers(maskGestureAnswers(trig('placer: M = pi/3')))).toEqual([]);
	});
});
