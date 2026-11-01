/**
 * Question à étiquettes à ranger (` ```ranger `, chantier
 * `docs/wip/reponses-a-placer-progress.md` § 21, 22)
 *
 * Une case par place (note partielle). Le prof écrit les étiquettes dans le bon
 * ordre ; le tirage les mélange et l'énoncé de l'instance ne garde que l'ordre
 * AFFICHÉ (l'ordre écrit trahirait la réponse). Réponse d'une place = la position
 * affichée de l'étiquette qui y va (`2`) ; jugée par l'étiquette, jamais par sa
 * valeur.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { parseMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import type { RangerNode } from '$lib/ubumark/types/ranger';

function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	options?: QuestionTemplate['options']
) {
	return {
		id: 'test-ranger',
		title: 'Ranger des nombres',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...(options && { options })
	} as QuestionTemplate;
}

const ranger = (...body: string[]) => ['```ranger', ...body, '```'].join('\n');

const SEVENTHS = ['- $\\frac{2}{7}$', '- $\\frac{3}{7}$', '- $\\frac{6}{7}$'];
const WRITTEN = ['$\\frac{2}{7}$', '$\\frac{3}{7}$', '$\\frac{6}{7}$'];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Le bloc ranger de l'énoncé d'une instance */
function shownBlock(instance: QuestionInstance): RangerNode {
	const node = parseMarkdown(String(instance.statement)).children.find((c) => c.type === 'ranger');
	if (!node || node.type !== 'ranger') throw new Error('pas de bloc ranger');
	return node;
}

/** Les bonnes réponses d'une instance (positions affichées, place par place) */
const expectedOf = (instance: QuestionInstance) =>
	(instance.blanks ?? []).map((b) => b.expectedAnswer);

describe('assignBlankIndices — étiquettes à ranger', () => {
	it('une case par étiquette, numéro de la première posé dans le bloc', () => {
		const result = assignBlankIndices(ranger(...SEVENTHS));
		expect(result.totalBlanks).toBe(3);
		expect(result.blankTypes).toEqual(['text', 'text', 'text']);
		expect(result.statement).toBe(ranger('case: 0', ...SEVENTHS));
		const source = SEVENTHS.join('\n');
		expect(result.buildBlanks).toEqual({
			0: { kind: 'ranger', source, point: 0 },
			1: { kind: 'ranger', source, point: 1 },
			2: { kind: 'ranger', source, point: 2 }
		});
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(['> ```ranger', '> - 1', '> - 2', '> ```'].join('\n'));
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Des étiquettes à ranger doivent être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('étiquettes à ranger : les cases et leurs réponses', () => {
	it('l’énoncé montre les étiquettes mélangées ; chaque place attend la bonne', () => {
		const instance = generate(template({ statement: `Range.\n\n${ranger(...SEVENTHS)}` }));
		expect(instance.blanks).toHaveLength(3);
		instance.blanks?.forEach((b) => expect(b).toMatchObject({ construire: 'ranger' }));
		const shown = shownBlock(instance);
		expect(shown.caseIndex).toBe(0);
		expect([...shown.labels].sort()).toEqual([...WRITTEN].sort());
		expect(shown.labels).not.toEqual(WRITTEN);
		// Place k : l'étiquette affichée à la position attendue est la k-ième écrite
		expectedOf(instance).forEach((position, k) => {
			expect(shown.labels[Number(position)]).toBe(WRITTEN[k]);
		});
	});

	it('jamais rangées ni à l’envers, sur de nombreuses graines', () => {
		const t = template({ statement: ranger(...SEVENTHS) });
		for (let seed = 1; seed <= 60; seed++) {
			const shown = shownBlock(generate(t, seed)).labels;
			expect(shown).not.toEqual(WRITTEN);
			expect(shown).not.toEqual([...WRITTEN].reverse());
		}
	});

	it('juste : toutes les places ; note partielle : une place fausse', () => {
		const instance = generate(template({ statement: ranger(...SEVENTHS) }));
		const right = expectedOf(instance);
		expect(validateAnswer(right, instance, right).status).toBe('correct');
		const swapped = [right[1], right[0], right[2]];
		const verdict = validateAnswer(swapped, instance, swapped);
		expect(verdict.isCorrect).toBe(false);
	});

	it('jugée par l’étiquette, jamais par sa valeur (deux écritures d’un même nombre)', () => {
		const instance = generate(
			template({ statement: ranger('- $1$', '- $\\frac{7}{4}$', '- $1+\\frac{3}{4}$ ') })
		);
		// Les étiquettes 2 et 3 ont des textes différents : seule la bonne étiquette compte
		const right = expectedOf(instance);
		const swapped = [right[0], right[2], right[1]];
		expect(validateAnswer(swapped, instance, swapped).isCorrect).toBe(false);
	});

	it('signe: > gardé dans le bloc affiché', () => {
		const instance = generate(template({ statement: ranger('signe: >', '- 9', '- 5', '- 1') }));
		expect(shownBlock(instance).sign).toBe('>');
	});

	it('variables résolues avant le mélange', () => {
		const instance = generate(
			template({
				statement: ranger('- {{a}}', '- {{b}}', '- 10'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '7' }
				]
			})
		);
		expect([...shownBlock(instance).labels].sort()).toEqual(['10', '3', '7']);
	});

	it('deux étiquettes identiques après tirage : refusé avec son message', () => {
		const result = generateInstance(
			template({
				statement: ranger('- {{a}}', '- {{b}}', '- 10'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '3' }
				]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Étiquettes à ranger : deux étiquettes identiques/);
	});

	it('case: écrite à la main : refusée', () => {
		const result = generateInstance(
			template({ statement: ranger('case: 0', '- 1', '- 2', '- 3') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case: est posée automatiquement/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: ranger('- 1', '- 2', '- 3'),
				blanks: [{ expectedAnswer: '0' }, { expectedAnswer: '1' }, { expectedAnswer: '2' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*l’étiquette à sa place/i);
	});

	it('ordre indifférent : refusé', () => {
		const result = generateInstance(
			template({ statement: ranger('- 1', '- 2', '- 3') }, { orderIndependent: true }),
			42
		);
		expect(result.success).toBe(false);
	});

	it('le validateur de modèle accepte une question sans blanks[] à étiquettes à ranger', () => {
		const errors = validateTemplate(template({ statement: ranger('- 1', '- 2', '- 3') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : UN rangement, la réponse de chaque place et les bonnes', () => {
		const instance = generate(template({ statement: `Range.\n\n${ranger(...SEVENTHS)}` }));
		const right = expectedOf(instance);
		const sent = [right[1], right[0], right[2]];
		const { lines } = buildExpectedResult(instance, { values: sent });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			kind: 'build',
			buildKind: 'ranger',
			status: 'incorrect',
			answers: [
				{ answer: sent[0], status: 'incorrect' },
				{ answer: sent[1], status: 'incorrect' },
				{ answer: sent[2], status: 'correct' }
			],
			expected: right
		});
	});

	it('version publique (évaluation notée) : ni réponse, ni ordre écrit ; même graine, même énoncé', () => {
		const t = template({ statement: `Range.\n\n${ranger(...SEVENTHS)}` });
		const instance = generate(t);
		const shown = shownBlock(instance).labels;
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const json = JSON.stringify(sent);
		expect(json).not.toContain('expectedAnswer');
		// La case ne porte que le genre du bloc (fuite-enonce : même écran qu'hors évaluation)
		expect(sent.blanks?.map((blank) => Object.keys(blank).sort())).toEqual([
			['construire', 'type'],
			['construire', 'type'],
			['construire', 'type']
		]);
		expect(sent.blanks?.every((blank) => blank.construire === 'ranger')).toBe(true);
		expect(sent.statement.match(/```ranger/g)).toHaveLength(1);
		const published = parseMarkdown(sent.statement).children.find((c) => c.type === 'ranger');
		expect(published && published.type === 'ranger' && published.labels).toEqual(shown);
		expect(String(generate(t).statement)).toBe(String(instance.statement));
	});

	it('2 étiquettes dans une question : refusé (l’affichage serait toujours l’inverse)', () => {
		const result = generateInstance(template({ statement: ranger('- 1', '- 2') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/au moins 3 étiquettes/);
	});

	it('étiquettes identiques au tirage : nouveau tirage, comme une condition', () => {
		const t = template({
			statement: ranger('- {{a}}', '- {{b}}', '- 100'),
			variables: [
				{ name: 'a', expression: '{{random:1..3}}' },
				{ name: 'b', expression: '{{random:1..3}}' }
			]
		});
		for (let seed = 0; seed < 40; seed++) {
			const labels = shownBlock(generate(t, seed)).labels;
			expect(new Set(labels).size).toBe(3);
		}
	});
});
