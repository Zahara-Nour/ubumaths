/**
 * Question « texte à trous à étiquettes » (` ```trous `, chantier
 * `docs/wip/trous-etiquettes-progress.md`)
 *
 * Une case par trou (note partielle). Le prof écrit les bonnes étiquettes dans
 * les trous ; le tirage mélange la réserve et l'énoncé de l'instance ne garde ni
 * les étiquettes des trous ni l'ordre écrit. Réponse d'un trou = la position
 * affichée de sa bonne étiquette (`2`) ; une étiquette peut servir à plusieurs
 * trous ; jugée par l'étiquette, jamais par sa valeur.
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
import type { TrousNode } from '$lib/ubumark/types/trous';
import { findUnmaskedAnswers } from '../../masked-statement';

function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	options?: QuestionTemplate['options']
) {
	return {
		id: 'test-trous',
		title: 'Trous',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['1_SPE'],
		level: 1,
		...(options && { options })
	} as QuestionTemplate;
}

const trous = (...body: string[]) => ['```trous', ...body, '```'].join('\n');

const SUITES = [
	'Si $u_{n+1} = u_n + 3$, la suite est [arithmétique], de raison [$3$].',
	'Si $u_{n+1} = 2u_n$, la suite est [géométrique] ; et $v$ est [arithmétique].',
	'intrus: croissante ; $u_0$'
];
const RIGHT = ['arithmétique', '$3$', 'géométrique', 'arithmétique'];
const LABELS = ['arithmétique', '$3$', 'géométrique', 'croissante', '$u_0$'];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Le bloc trous de l'énoncé d'une instance */
function shownBlock(instance: QuestionInstance): TrousNode {
	const node = parseMarkdown(String(instance.statement)).children.find((c) => c.type === 'trous');
	if (!node || node.type !== 'trous') throw new Error('pas de bloc trous');
	return node;
}

const expectedOf = (instance: QuestionInstance) =>
	(instance.blanks ?? []).map((b) => b.expectedAnswer);

describe('assignBlankIndices — trous', () => {
	it('une case par trou, numéro du premier posé dans le bloc', () => {
		const result = assignBlankIndices(trous(...SUITES));
		expect(result.totalBlanks).toBe(4);
		expect(result.blankTypes).toEqual(['text', 'text', 'text', 'text']);
		expect(result.statement).toBe(trous('case: 0', ...SUITES));
		const source = SUITES.join('\n');
		expect(result.buildBlanks?.[0]).toEqual({ kind: 'trous', source, point: 0 });
		expect(result.buildBlanks?.[3]).toEqual({ kind: 'trous', source, point: 3 });
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(['> ```trous', '> A [x].', '> ```'].join('\n'));
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un texte à trous doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('trous : les cases et leurs réponses', () => {
	it('l’énoncé ne montre ni les étiquettes des trous ni l’ordre écrit ; chaque trou attend la sienne', () => {
		const instance = generate(template({ statement: `Complète.\n\n${trous(...SUITES)}` }));
		expect(instance.blanks).toHaveLength(4);
		instance.blanks?.forEach((b) => expect(b).toMatchObject({ construire: 'trous' }));
		const shown = shownBlock(instance);
		expect(shown.errors).toEqual([]);
		expect(shown.caseIndex).toBe(0);
		expect(shown.answers).toEqual([null, null, null, null]);
		expect([...shown.labels].sort()).toEqual([...LABELS].sort());
		expect(shown.labels).not.toEqual(LABELS);
		// Aucun trou rempli dans l'énoncé : seuls des « [] »
		expect(String(instance.statement)).not.toMatch(/\[(?!\])[^\]]*\]/);
		expectedOf(instance).forEach((position, k) => {
			expect(shown.labels[Number(position)]).toBe(RIGHT[k]);
		});
		// Étiquette partagée : la même réponse pour les trous 1 et 4
		expect(expectedOf(instance)[0]).toBe(expectedOf(instance)[3]);
	});

	it('jamais dans l’ordre écrit, sur de nombreuses graines', () => {
		const t = template({ statement: trous(...SUITES) });
		for (let seed = 1; seed <= 40; seed++) {
			expect(shownBlock(generate(t, seed)).labels).not.toEqual(LABELS);
		}
	});

	it('juste : tout ; une étiquette posée deux fois compte ; note partielle sinon', () => {
		const instance = generate(template({ statement: trous(...SUITES) }));
		const right = expectedOf(instance);
		expect(validateAnswer(right, instance, right).status).toBe('correct');
		const wrong = [right[2], right[1], right[2], right[3]];
		const verdict = validateAnswer(wrong, instance, wrong);
		expect(verdict.isCorrect).toBe(false);
	});

	it('variables résolues avant le mélange, dans le texte comme dans les étiquettes', () => {
		const instance = generate(
			template({
				statement: trous('$u_0 = {{a}}$ : $u_0$ est [{{a}}], pas [{{b}}].', 'intrus: 0'),
				variables: [
					{ name: 'a', expression: '4' },
					{ name: 'b', expression: '9' }
				]
			})
		);
		const shown = shownBlock(instance);
		expect([...shown.labels].sort()).toEqual(['0', '4', '9']);
		expect(String(instance.statement)).toContain('$u_0 = 4$');
	});

	it('deux étiquettes identiques après tirage : tirage refait, puis refusé avec son message', () => {
		const result = generateInstance(
			template({
				statement: trous('A [{{a}}], B [{{b}}].', 'intrus: 0'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '3' }
				]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Texte à trous : deux étiquettes identiques/);
	});

	it('case: écrite à la main : refusée', () => {
		const result = generateInstance(
			template({ statement: trous('case: 0', 'A [x], B [y].', 'intrus: z') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case: est posée automatiquement/);
	});

	it('bloc mal écrit : refusé avec le message du parseur', () => {
		const result = generateInstance(template({ statement: trous('A [x], B [y].') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/au moins 3 étiquettes différentes/);
	});

	it('trous vides écrits par le prof (étiquettes:) : refusé dans une question', () => {
		const result = generateInstance(
			template({ statement: trous('A [], B [].', 'étiquettes: x ; y ; z') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/le trou 1 est vide/);
	});

	it('[_] dans le bloc : refusé (une autre case)', () => {
		const result = generateInstance(
			template({ statement: trous('A [x], B [_].', 'intrus: y ; z') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/pas de case \[_\]/);
	});

	it('ordre indifférent : refusé', () => {
		const result = generateInstance(
			template({ statement: trous(...SUITES) }, { orderIndependent: true }),
			42
		);
		expect(result.success).toBe(false);
	});

	it('avec une autre case : les cases se suivent', () => {
		const instance = generate(
			template({
				statement: `Calcule $1 + 1 = ?$.\n\n${trous(...SUITES)}`,
				blanks: [{ expectedAnswer: '2' }]
			})
		);
		expect(instance.blanks).toHaveLength(5);
		expect(instance.blanks?.[0].expectedAnswer).toBe('2');
		expect(shownBlock(instance).caseIndex).toBe(1);
	});

	it('le validateur de modèle accepte une question sans blanks[] à trous', () => {
		const errors = validateTemplate(template({ statement: trous(...SUITES) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : UN bloc, la réponse de chaque trou et les bonnes', () => {
		const instance = generate(template({ statement: `Complète.\n\n${trous(...SUITES)}` }));
		const right = expectedOf(instance);
		const sent = [right[2], right[1], right[2], right[3]];
		const { lines } = buildExpectedResult(instance, { values: sent });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			kind: 'build',
			buildKind: 'trous',
			status: 'incorrect',
			answers: [
				{ answer: sent[0], status: 'incorrect' },
				{ answer: sent[1], status: 'correct' },
				{ answer: sent[2], status: 'correct' },
				{ answer: sent[3], status: 'correct' }
			],
			expected: right
		});
	});

	it('garde anti-fuite : un bloc qui garde ses étiquettes dans les trous est signalé', () => {
		expect(findUnmaskedAnswers(trous('case: 0', ...SUITES))).toEqual(['trous']);
		// Revue : un trou rempli trahit la réponse, même avec la réserve écrite (`étiquettes:`)
		expect(
			findUnmaskedAnswers(trous('case: 0', 'A [x] et B [].', 'étiquettes: x ; y ; z'))
		).toEqual(['trous']);
		expect(findUnmaskedAnswers(trous('case: 0', 'A [] et B [].', 'étiquettes: x ; y ; z'))).toEqual(
			[]
		);
	});

	it('version publique (évaluation notée) : ni réponse, ni trou rempli', () => {
		const instance = generate(template({ statement: `Complète.\n\n${trous(...SUITES)}` }));
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		expect(JSON.stringify(sent)).not.toContain('expectedAnswer');
		expect(sent.blanks?.every((blank) => blank.construire === 'trous')).toBe(true);
		const published = parseMarkdown(sent.statement).children.find((c) => c.type === 'trous');
		expect(published && published.type === 'trous' && published.answers).toEqual([
			null,
			null,
			null,
			null
		]);
		expect(findUnmaskedAnswers(sent.statement)).toEqual([]);
		expect(published && published.type === 'trous' && published.labels).toEqual(
			shownBlock(instance).labels
		);
	});
});
