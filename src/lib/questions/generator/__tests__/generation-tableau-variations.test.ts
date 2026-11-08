/**
 * Tableau de variations à compléter (chantier `variations-a-completer`)
 *
 * Dans une ligne `variation:`, `?4, top` cache une valeur (case math, juge ordinaire)
 * et `?flèche` cache la flèche d'un intervalle (case choix ↗ / ↘, réponse tirée des
 * positions). Évaluation notée : l'énoncé envoyé ne dit ni la valeur, ni la flèche
 * (les valeurs qui encadrent une flèche cachée passent au milieu).
 */

import { beforeAll, describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown, parseMarkdown } from '$lib/ubumark';
import { variationRowForDisplay } from '$lib/ubumark/parser/variation-table-parser';
import { validateAnswer } from '$lib/utils/answer-validator';
import { toPublicQuestion, gestureAnswerLeaks } from '../../public-question';
import { findUnmaskedAnswers } from '../../masked-statement';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-tableau-variations',
		title: 'Tableau de variations',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['1_SPE'],
		level: 1
	} as QuestionTemplate;
}

const variation = (...body: string[]) => ['```variation', ...body, '```'].join('\n');

/** Cubique : ↗ jusqu'à 4 en -2, ↘ jusqu'à -4 en 2, ↗ ; deux flèches et une valeur cachées */
const CUBIQUE = [
	'variable: x',
	'domain: -inf, -2, 2, +inf',
	'',
	'variation: f(x)',
	'  -inf: -inf, bottom',
	'  -2: ?4, top',
	'  2: -4, bottom',
	'  +inf: +inf, top',
	'  -inf,-2: ?flèche',
	'  -2,2: ?flèche'
];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function tableOf(statement: string): VariationTableNode {
	const node = parseMarkdown(statement).children.find((c) => c.type === 'variation-table');
	if (!node || node.type !== 'variation-table') throw new Error('pas de tableau');
	return node;
}

function judgeCase(instance: QuestionInstance, index: number, answer: string) {
	const answers = (instance.blanks ?? []).map((b) => b.expectedAnswer);
	answers[index] = answer;
	return validateAnswer(answers, instance, answers).isCorrect;
}

describe('assignBlankIndices — ligne variation: à compléter', () => {
	it('une case par cellule cachée : flèche en texte, valeur en formule', () => {
		const result = assignBlankIndices(variation(...CUBIQUE));
		expect(result.totalBlanks).toBe(3);
		// Colonnes : -inf,-2 (flèche), -2 (valeur), -2,2 (flèche)
		expect(result.blankTypes).toEqual(['text', 'math', 'text']);
	});
});

describe('tableau de variations : les cases et leurs réponses', () => {
	it('réponses tirées du bloc, flèche affichée en LaTeX', () => {
		const instance = generate(template({ statement: `Complète.\n\n${variation(...CUBIQUE)}` }));
		expect(
			instance.blanks?.map((b) => [b.type, b.cellule, b.expectedAnswer, b.expectedAnswerLatex])
		).toEqual([
			['text', 'fleche', '↗', '\\nearrow'],
			['math', 'valeur', '4', '4'],
			['text', 'fleche', '↘', '\\searrow']
		]);
	});

	it('flèche : égalité exacte, case vide fausse', () => {
		const instance = generate(template({ statement: variation(...CUBIQUE) }));
		expect(judgeCase(instance, 0, '↗')).toBe(true);
		expect(judgeCase(instance, 0, '↘')).toBe(false);
		expect(judgeCase(instance, 0, '')).toBe(false);
		expect(judgeCase(instance, 2, '↘')).toBe(true);
	});

	it('valeur de la ligne variation: : juge ordinaire (8/2 = 4)', () => {
		const instance = generate(template({ statement: variation(...CUBIQUE) }));
		expect(judgeCase(instance, 1, '\\frac{8}{2}')).toBe(true);
		expect(judgeCase(instance, 1, '-4')).toBe(false);
	});

	it('flèche sans flèche à dessiner : échec situé', () => {
		const t = template({
			statement: variation(
				'variable: x',
				'domain: -inf, 1, +inf',
				'',
				'variation: f(x)',
				'  -inf: 2, center',
				'  1: 3, top',
				'  -inf,1: ?flèche'
			)
		});
		const result = generateInstance(t, 42);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.errors.join(' ; ')).toMatch(/flèche/);
	});
});

describe('tableau de variations : évaluation notée, énoncé masqué', () => {
	let instance: QuestionInstance;
	beforeAll(() => {
		instance = generate(template({ statement: `Complète.\n\n${variation(...CUBIQUE)}` }));
	});

	it('l’énoncé de l’instance dit les réponses (garde)', () => {
		expect(findUnmaskedAnswers(String(instance.statement))).toEqual(['variation']);
	});

	it('l’énoncé envoyé ne dit ni la valeur ni les flèches', () => {
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const block = sent.statement.slice(sent.statement.indexOf('```variation'));
		expect(block).not.toMatch(/\b4, top/);
		expect(block).not.toMatch(/flèche/);
		expect(block).toContain('  -inf,-2: ?');
		expect(block).toContain('  -2,2: ?');
		// Valeurs qui encadrent une flèche cachée : au milieu
		expect(block).toContain('  -inf: -inf, center');
		expect(block).toContain('  -2: ?, center');
		expect(block).toContain('  2: -4, center');
		// Hors de toute flèche cachée : inchangé
		expect(block).toContain('  +inf: +inf, top');
		expect(findUnmaskedAnswers(sent.statement)).toEqual([]);
		expect(gestureAnswerLeaks(instance)).toEqual([]);
	});

	it('le tableau envoyé garde ses cases, sans réponse', () => {
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const table = tableOf(sent.statement);
		expect(table.cases?.map((c) => [c.kind, c.answer])).toEqual([
			['fleche', ''],
			['valeur', ''],
			['fleche', '']
		]);
		expect(sent.blanks?.map((b) => b.cellule)).toEqual(['fleche', 'valeur', 'fleche']);
	});

	it('borne implicite : la flèche donnée reste dessinée, la cachée non', () => {
		const trinome = generate(
			template({
				statement: variation(
					'variable: x',
					'domain: -inf, 1, +inf',
					'',
					'variation: f(x)',
					'  1: -3, bottom',
					'  1,+inf: ?flèche'
				)
			})
		);
		const sent = toPublicQuestion(trinome, { position: 0, delaySeconds: 30 });
		expect(sent.statement).not.toMatch(/bottom/);
		expect(findUnmaskedAnswers(sent.statement)).toEqual([]);
		const shown = variationRowForDisplay(tableOf(sent.statement), 0);
		expect(shown.values.get('-inf')?.position).toBe('top');
		expect(shown.values.get('1')?.position).toBe('center');
		expect(shown.values.get('+inf')?.position ?? 'center').toBe('center');
	});

	it('garde : une hauteur écrite à côté d’une flèche masquée est une fuite', () => {
		const leaky = variation(
			'case: 0',
			'variable: x',
			'domain: -inf, -2, +inf',
			'',
			'variation: f(x)',
			'  -inf: -inf, bottom',
			'  -2: 4, top',
			'  -inf,-2: ?'
		);
		expect(findUnmaskedAnswers(leaky)).toEqual(['variation']);
	});
});
