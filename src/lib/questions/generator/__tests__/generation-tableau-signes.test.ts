/**
 * Tableau de signes à compléter (` ```variation ` à `?`, chantier
 * `docs/archive/wip/tableau-signes-progress.md`, PR 2)
 *
 * L'auteur écrit le tableau JUSTE et préfixe d'un `?` chaque cellule cachée ; la
 * réponse attendue est tirée du bloc, jamais écrite dans `blanks`. Une case par
 * cellule cachée, numérotée dans l'ordre de lecture (domaine, puis lignes `sign:`
 * par colonne). Valeur de x : case mathématique, juge ordinaire ; signe et marque :
 * égalité exacte. Évaluation notée : l'énoncé envoyé ne dit aucune réponse.
 */

import { beforeAll, describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown, parseMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { toPublicQuestion, gestureAnswerLeaks } from '../../public-question';
import { findUnmaskedAnswers } from '../../masked-statement';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	options?: QuestionTemplate['options']
) {
	return {
		id: 'test-tableau-signes',
		title: 'Tableau de signes',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['2'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...(options && { options })
	} as QuestionTemplate;
}

const variation = (...body: string[]) => ['```variation', ...body, '```'].join('\n');

/** Signe de (x+3)(x-2) : la racine -3 cachée, deux signes et une marque cachés */
const PRODUIT = [
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+'
];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function failure(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	if (result.success) throw new Error('génération réussie, échec attendu');
	return result.errors.join(' ; ');
}

/** Le tableau de l'énoncé (texte donné) */
function tableOf(statement: string): VariationTableNode {
	const node = parseMarkdown(statement).children.find((c) => c.type === 'variation-table');
	if (!node || node.type !== 'variation-table') throw new Error('pas de tableau');
	return node;
}

const verdict = (instance: QuestionInstance, answers: string[]) =>
	validateAnswer(answers, instance, answers);

/** Juge une seule case (les autres réponses justes) */
function judgeCase(instance: QuestionInstance, index: number, answer: string) {
	const answers = (instance.blanks ?? []).map((b) => b.expectedAnswer);
	answers[index] = answer;
	// Les autres cases justes : le verdict global est celui de la case
	return verdict(instance, answers).isCorrect;
}

describe('assignBlankIndices — tableau de signes à compléter', () => {
	it('une case par cellule cachée, numéro de la première posé dans le bloc', () => {
		const result = assignBlankIndices(variation(...PRODUIT));
		expect(result.totalBlanks).toBe(4);
		// Valeur de x : formule ; signe, marque : texte
		expect(result.blankTypes).toEqual(['math', 'text', 'text', 'text']);
		expect(result.statement).toBe(variation('case: 0', ...PRODUIT));
		const source = PRODUIT.join('\n');
		expect(result.variationBlanks).toEqual({
			0: { source, cell: 0 },
			1: { source, cell: 1 },
			2: { source, cell: 2 },
			3: { source, cell: 3 }
		});
	});

	it('numérotées avec les autres cases, dans l’ordre du texte', () => {
		const result = assignBlankIndices(`$x = ?$\n\n${variation(...PRODUIT)}\n\n[_]`);
		expect(result.totalBlanks).toBe(6);
		expect(result.blankTypes).toEqual(['math', 'math', 'text', 'text', 'text', 'text']);
		expect(result.statement).toContain('```variation\ncase: 1\n');
		expect(Object.keys(result.variationBlanks ?? {})).toEqual(['1', '2', '3', '4']);
	});

	it('tableau sans ? : aucune case, texte inchangé', () => {
		const plain = variation('variable: x', 'domain: -inf, 2, +inf', '', 'sign: x-2', '  2: z');
		const result = assignBlankIndices(plain);
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(plain);
		expect(result.variationBlanks).toBeUndefined();
	});

	it('tableau cité : pas de case, signalé', () => {
		const cited = variation(...PRODUIT)
			.split('\n')
			.map((line) => `> ${line}`)
			.join('\n');
		const result = assignBlankIndices(cited);
		expect(result.totalBlanks).toBe(0);
		expect(result.variationErrors).toEqual([
			'Un tableau de signes à compléter doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});

	it('tableau à compléter dans un choix : refusé', () => {
		const statement = ['```choix', '- oui', '- non', '```', '', variation(...PRODUIT)].join('\n');
		expect(assignBlankIndices(statement).choiceErrors).toBeUndefined();
		const inChoice = ['```choix', '- oui', `- ${variation(...PRODUIT)}`, '```'].join('\n');
		expect(assignBlankIndices(inChoice).choiceErrors?.join(' ')).toMatch(/tableau de signes/);
	});
});

describe('tableau de signes : les cases et leurs réponses', () => {
	it('réponses tirées du bloc, sans blanks dans le modèle', () => {
		const instance = generate(template({ statement: `Complète.\n\n${variation(...PRODUIT)}` }));
		expect(instance.blanks?.map((b) => [b.type, b.cellule, b.expectedAnswer])).toEqual([
			['math', 'valeur', '-3'],
			['text', 'signe', '+'],
			['text', 'marque', 'z'],
			['text', 'signe', '+']
		]);
		// L'énoncé de l'instance garde le tableau juste, numéroté
		const table = tableOf(String(instance.statement));
		expect(table.caseIndex).toBe(0);
		expect(table.cases).toHaveLength(4);
	});

	it('valeur tirée de variables (?{{r}})', () => {
		const instance = generate(
			template({
				variables: [{ name: 'r', expression: '-5' }],
				statement: variation(
					'variable: x',
					'domain: -inf, ?{{r}}, +inf',
					'',
					'sign: x+5',
					'  -inf,{{r}}: -',
					'  {{r}}: ?z',
					'  {{r}},+inf: +'
				)
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['-5', 'z']);
	});

	it('marque « rien » et double barre', () => {
		const instance = generate(
			template({
				statement: variation(
					'variable: x',
					'domain: -inf, -1, 1, +inf',
					'',
					'sign: x+1',
					'  -1: ?z',
					'  1: ?rien',
					'',
					'sign: \\frac{1}{x-1}',
					'  -1: ?rien',
					'  1: ?||'
				)
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['z', 'rien', 'rien', '||']);
	});

	it('cases de bloc omises de blanks[] : les autres gardent leur sens', () => {
		const instance = generate(
			template({
				statement: `$x_0 = ?$\n\n${variation(...PRODUIT)}`,
				blanks: [{ expectedAnswer: '2' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['2', '-3', '+', 'z', '+']);
	});

	it('réponse écrite dans blanks pour une cellule du tableau : refusée', () => {
		const errors = failure(
			template({
				statement: variation(...PRODUIT),
				blanks: [
					{ expectedAnswer: '-3' },
					{ expectedAnswer: '' },
					{ expectedAnswer: '' },
					{ expectedAnswer: '' }
				]
			})
		);
		expect(errors).toMatch(
			/Case 1 : sa réponse vient du tableau de signes ; laisser expectedAnswer vide/
		);
	});

	it('case: écrite par l’auteur : refusée', () => {
		expect(failure(template({ statement: variation('case: 0', ...PRODUIT) }))).toMatch(
			/Case 1 \(tableau de signes\) : case: est posée automatiquement/
		);
	});

	it('?? et ? seul (formes de l’évaluation) : refusés dans un modèle', () => {
		const masked = PRODUIT.map((line) => line.replace('?-3', '??1').replace('-3', '??1'));
		expect(failure(template({ statement: variation(...masked) }))).toMatch(
			/Case 1 \(tableau de signes\) : .*évaluation/
		);
		const bare = PRODUIT.map((line) => line.replace('?z', '?'));
		expect(failure(template({ statement: variation(...bare) }))).toMatch(
			/Case 3 \(tableau de signes\) : .*évaluation/
		);
	});

	it('? refusé par le parseur (infini caché) : échec situé', () => {
		const errors = failure(
			template({
				statement: variation('variable: x', 'domain: ?-inf, 2, +inf', '', 'sign: x-2', '  2: z')
			})
		);
		expect(errors).toMatch(/Case 1 \(tableau de signes\) : Ligne 2 : on ne peut pas cacher -inf/);
	});

	it('valeur cachée écrite f(-3) dans une ligne variation: : refusée (elle partirait en évaluation)', () => {
		const errors = failure(
			template({
				statement: variation(...PRODUIT, '', 'variation: f(x)', '  -3: f(-3), bottom')
			})
		);
		expect(errors).toMatch(/Case 1 \(tableau de signes\) : .*-3.*ligne variation/);
		const frac = [
			'variable: x',
			'domain: -inf, ?\\frac{3}{2}, +inf',
			'',
			'sign: 2x-3',
			'  \\frac{3}{2}: z',
			'',
			'variation: f(x)',
			'  \\frac{3}{2}: f(\\frac{3}{2}), bottom'
		];
		expect(failure(template({ statement: variation(...frac) }))).toMatch(/ligne variation/);
	});

	it('bloc à cases avec une erreur (domaine répété, ligne libre) : refusé', () => {
		expect(
			failure(template({ statement: variation('domain: -inf, -3, 2, +inf', ...PRODUIT) }))
		).toMatch(/Case 1 \(tableau de signes\) : .*[Dd]omain/);
		expect(failure(template({ statement: variation(...PRODUIT, 'racine -3') }))).toMatch(
			/Case 1 \(tableau de signes\)/
		);
	});

	it('cellule écrite deux fois, l’une cachée : refusée', () => {
		const twice = [...PRODUIT.slice(0, 4), '  -inf,-3: +', ...PRODUIT.slice(4)];
		expect(failure(template({ statement: variation(...twice) }))).toMatch(/deux fois/);
	});

	it('ordre indifférent : refusé', () => {
		expect(
			failure(template({ statement: variation(...PRODUIT) }, { orderIndependent: true }))
		).toMatch(/tableau de signes.*ordre indifférent/);
	});
});

describe('tableau de signes : jugement', () => {
	let instance: QuestionInstance;
	beforeAll(() => {
		instance = generate(template({ statement: variation(...PRODUIT) }));
	});

	it('toutes les cases justes : correct', () => {
		expect(verdict(instance, ['-3', '+', 'z', '+']).status).toBe('correct');
	});

	it('signe : égalité exacte', () => {
		expect(judgeCase(instance, 1, '+')).toBe(true);
		expect(judgeCase(instance, 1, '-')).toBe(false);
		expect(judgeCase(instance, 1, 'z')).toBe(false);
	});

	it('marque : 0 vaut z, « rien » ≠ case vide', () => {
		expect(judgeCase(instance, 2, '0')).toBe(true);
		expect(judgeCase(instance, 2, 'z')).toBe(true);
		expect(judgeCase(instance, 2, '||')).toBe(false);
		expect(judgeCase(instance, 2, 'rien')).toBe(false);
	});

	it('valeur de x : juge ordinaire', () => {
		expect(judgeCase(instance, 0, '-3')).toBe(true);
		expect(judgeCase(instance, 0, '3')).toBe(false);
	});

	it('les cases du tableau n’héritent pas des réglages de la variation (answerKind, unité…)', () => {
		const mixed = generate(
			template({
				statement: `${variation(...PRODUIT)}\n\nRésous $f(x) < 0$ : $S = ?$`,
				blankDefaults: { answerKind: 'intervalles', precision: 'tenth', unit: { expected: true } },
				blanks: [{ expectedAnswer: ']-3;2[' }]
			} as never)
		);
		const value = mixed.blanks?.[0];
		expect(value?.answerKind).toBeUndefined();
		expect(value?.unit).toBeUndefined();
		expect(value?.precision).toBeUndefined();
		expect(mixed.blanks?.[4].answerKind).toBe('intervalles');
		const answers = (mixed.blanks ?? []).map((b) => b.expectedAnswer);
		expect(verdict(mixed, answers).blankFeedback?.[0]).toBeUndefined();
		answers[4] = ']-3;2[';
		const result = validateAnswer(answers, mixed, answers);
		expect(result.message ?? '').not.toMatch(/: 1\b/);
	});

	it('valeur fractionnaire : 1,5 = 3/2 = \\frac{3}{2}', () => {
		const half = generate(
			template({
				statement: variation(
					'variable: x',
					'domain: -inf, ?\\frac{3}{2}, +inf',
					'',
					'sign: 2x-3',
					'  -inf,\\frac{3}{2}: -',
					'  \\frac{3}{2}: z',
					'  \\frac{3}{2},+inf: +'
				)
			})
		);
		expect(judgeCase(half, 0, '\\frac{3}{2}')).toBe(true);
		expect(judgeCase(half, 0, '1,5')).toBe(true);
		expect(judgeCase(half, 0, '1.5')).toBe(true);
		expect(judgeCase(half, 0, '\\frac{2}{3}')).toBe(false);
	});
});

describe('tableau de signes : évaluation notée, énoncé masqué', () => {
	const TABLE = [
		'variable: x',
		'domain: -inf, ?-3, 2, +inf',
		'',
		'sign: x+3',
		'  -inf,-3: ?-',
		'  -3: ?z',
		'  -3,+inf: +',
		'',
		'sign: x-2',
		'  -inf, -3: -',
		'  -3,2: ?-',
		'  2: z',
		'  2,+inf: +',
		'',
		'variation: f(x)',
		'  -inf: +inf, top',
		'  -3: 0, bottom',
		'  +inf: +inf, top'
	];
	let instance: QuestionInstance;
	beforeAll(() => {
		instance = generate(template({ statement: `Complète.\n\n${variation(...TABLE)}` }));
	});

	it('l’énoncé de l’instance dit les réponses (garde)', () => {
		expect(findUnmaskedAnswers(String(instance.statement))).toEqual(['variation']);
	});

	it('l’énoncé envoyé : ??1 pour la valeur, ? seul pour signe et marque, clés renommées', () => {
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const block = sent.statement.slice(sent.statement.indexOf('```variation'));
		expect(block).not.toMatch(/-3/);
		expect(block).toContain('domain: -inf, ??1, 2, +inf');
		expect(block).toContain('  -inf,??1: ?');
		expect(block).toContain('  ??1: ?');
		expect(block).toContain('  ??1,2: ?');
		// Ligne de variations : la clé renommée aussi
		expect(block).toContain('  ??1: 0, bottom');
		expect(findUnmaskedAnswers(sent.statement)).toEqual([]);
		expect(gestureAnswerLeaks(instance)).toEqual([]);
	});

	it('le tableau envoyé garde ses cases, sans réponse', () => {
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const table = tableOf(sent.statement);
		expect(table.caseIndex).toBe(0);
		expect(table.cases?.map((c) => [c.kind, c.answer])).toEqual([
			['valeur', ''],
			['signe', ''],
			['marque', ''],
			['signe', '']
		]);
		expect(sent.blanks?.map((b) => b.cellule)).toEqual(['valeur', 'signe', 'marque', 'signe']);
		expect(JSON.stringify(sent)).not.toContain('expectedAnswer');
	});

	it('garde : une clé qui dit encore la valeur cachée est une fuite', () => {
		const leaky = variation(
			'case: 0',
			'variable: x',
			'domain: -inf, ??1, +inf',
			'',
			'sign: x+3',
			'  -3: z'
		);
		expect(findUnmaskedAnswers(leaky)).toEqual(['variation']);
	});

	it('tableau sans ? : envoyé tel quel', () => {
		const plain = variation('variable: x', 'domain: -inf, 2, +inf', '', 'sign: x-2', '  2: z');
		const t = template({ statement: `$x = ?$\n\n${plain}`, blanks: [{ expectedAnswer: '2' }] });
		const sent = toPublicQuestion(generate(t), { position: 0, delaySeconds: 30 });
		expect(sent.statement).toContain(plain);
	});
});
