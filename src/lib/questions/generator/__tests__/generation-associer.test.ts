/**
 * Question « associer deux colonnes » (` ```associer `, chantier
 * `docs/wip/associer-progress.md`)
 *
 * Une case par élément de gauche (note partielle). Le prof écrit les liens ; le
 * tirage mélange les étiquettes et l'énoncé de l'instance ne garde ni les liens
 * ni l'ordre écrit. Réponse d'un élément = la position affichée de sa bonne
 * étiquette (`2`) ; une étiquette peut servir à plusieurs éléments ; jugée par
 * l'étiquette, jamais par sa valeur.
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
import type { AssocierNode } from '$lib/ubumark/types/associer';
import { findUnmaskedAnswers } from '../../masked-statement';

function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	options?: QuestionTemplate['options']
) {
	return {
		id: 'test-associer',
		title: 'Associer',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['1_SPE'],
		level: 1,
		...(options && { options })
	} as QuestionTemplate;
}

const associer = (...body: string[]) => ['```associer', ...body, '```'].join('\n');

const SUITES = [
	'- $u_{n+1} = u_n + 3$ -> arithmétique',
	'- $u_{n+1} = 2u_n$ -> géométrique',
	'- $u_n = 5 + 2n$ -> arithmétique',
	'- -> ni l’une ni l’autre'
];
const ITEMS = ['$u_{n+1} = u_n + 3$', '$u_{n+1} = 2u_n$', '$u_n = 5 + 2n$'];
const RIGHT = ['arithmétique', 'géométrique', 'arithmétique'];
const LABELS = ['arithmétique', 'géométrique', 'ni l’une ni l’autre'];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Le bloc associer de l'énoncé d'une instance */
function shownBlock(instance: QuestionInstance): AssocierNode {
	const node = parseMarkdown(String(instance.statement)).children.find(
		(c) => c.type === 'associer'
	);
	if (!node || node.type !== 'associer') throw new Error('pas de bloc associer');
	return node;
}

const expectedOf = (instance: QuestionInstance) =>
	(instance.blanks ?? []).map((b) => b.expectedAnswer);

describe('assignBlankIndices — associer', () => {
	it('une case par élément, numéro du premier posé dans le bloc', () => {
		const result = assignBlankIndices(associer(...SUITES));
		expect(result.totalBlanks).toBe(3);
		expect(result.blankTypes).toEqual(['text', 'text', 'text']);
		expect(result.statement).toBe(associer('case: 0', ...SUITES));
		const source = SUITES.join('\n');
		expect(result.buildBlanks).toEqual({
			0: { kind: 'associer', source, point: 0 },
			1: { kind: 'associer', source, point: 1 },
			2: { kind: 'associer', source, point: 2 }
		});
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(['> ```associer', '> - a -> 1', '> ```'].join('\n'));
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Des éléments à associer doivent être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('associer : les cases et leurs réponses', () => {
	it('l’énoncé ne montre ni les liens ni l’ordre écrit ; chaque élément attend sa bonne étiquette', () => {
		const instance = generate(template({ statement: `Associe.\n\n${associer(...SUITES)}` }));
		expect(instance.blanks).toHaveLength(3);
		instance.blanks?.forEach((b) => expect(b).toMatchObject({ construire: 'associer' }));
		const shown = shownBlock(instance);
		expect(shown.caseIndex).toBe(0);
		// Formules résolues (espaces normalisés), dans l'ordre écrit
		expect(shown.items.map((item) => item.replace(/\s/g, ''))).toEqual(
			ITEMS.map((item) => item.replace(/\s/g, ''))
		);
		expect(shown.answers).toEqual([null, null, null]);
		expect([...shown.labels].sort()).toEqual([...LABELS].sort());
		expect(shown.labels).not.toEqual(LABELS);
		// Aucun lien « élément -> étiquette » : seuls les intrus « - -> … » portent une étiquette
		expect(String(instance.statement)).not.toMatch(/^- [^-\s].*->[ \t]*\S/m);
		expectedOf(instance).forEach((position, k) => {
			expect(shown.labels[Number(position)]).toBe(RIGHT[k]);
		});
		// Étiquette partagée : la même réponse pour les éléments 1 et 3
		expect(expectedOf(instance)[0]).toBe(expectedOf(instance)[2]);
	});

	it('jamais dans l’ordre écrit, sur de nombreuses graines', () => {
		const t = template({ statement: associer(...SUITES) });
		for (let seed = 1; seed <= 40; seed++) {
			expect(shownBlock(generate(t, seed)).labels).not.toEqual(LABELS);
		}
	});

	it('juste : tout ; une étiquette posée deux fois compte ; note partielle sinon', () => {
		const instance = generate(template({ statement: associer(...SUITES) }));
		const right = expectedOf(instance);
		expect(validateAnswer(right, instance, right).status).toBe('correct');
		const wrong = [right[1], right[1], right[2]];
		expect(validateAnswer(wrong, instance, wrong).isCorrect).toBe(false);
	});

	it('variables résolues avant le mélange', () => {
		const instance = generate(
			template({
				statement: associer('- {{a}} -> pair', '- {{b}} -> impair', '- -> premier'),
				variables: [
					{ name: 'a', expression: '4' },
					{ name: 'b', expression: '9' }
				]
			})
		);
		expect(shownBlock(instance).items).toEqual(['4', '9']);
	});

	it('deux éléments identiques après tirage : refusé avec son message', () => {
		const result = generateInstance(
			template({
				statement: associer('- {{a}} -> pair', '- {{b}} -> impair', '- -> premier'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '3' }
				]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Éléments à associer : deux éléments identiques/);
	});

	it('deux éléments écrits identiques, sans variable : le message du parseur', () => {
		const result = generateInstance(
			template({ statement: associer('- 3 -> impair', '- 3 -> premier', '- -> pair') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/les éléments 1 et 2 sont identiques/);
		expect(result.errors.join(' ')).not.toMatch(/tirages/);
	});

	it('case: écrite à la main : refusée', () => {
		const result = generateInstance(
			template({ statement: associer('case: 0', '- a -> 1', '- b -> 2', '- -> 3') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case: est posée automatiquement/);
	});

	it('bloc mal écrit : refusé avec le message du parseur', () => {
		const result = generateInstance(template({ statement: associer('- a -> 1', '- b -> 2') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/au moins 3 étiquettes différentes/);
	});

	it('ordre indifférent : refusé', () => {
		const result = generateInstance(
			template({ statement: associer(...SUITES) }, { orderIndependent: true }),
			42
		);
		expect(result.success).toBe(false);
	});

	it('le validateur de modèle accepte une question sans blanks[] à associer', () => {
		const errors = validateTemplate(template({ statement: associer(...SUITES) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : UN bloc, la réponse de chaque élément et les bonnes', () => {
		const instance = generate(template({ statement: `Associe.\n\n${associer(...SUITES)}` }));
		const right = expectedOf(instance);
		const sent = [right[1], right[1], right[2]];
		const { lines } = buildExpectedResult(instance, { values: sent });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			kind: 'build',
			buildKind: 'associer',
			status: 'incorrect',
			answers: [
				{ answer: sent[0], status: 'incorrect' },
				{ answer: sent[1], status: 'correct' },
				{ answer: sent[2], status: 'correct' }
			],
			expected: right
		});
	});

	it('garde anti-fuite : un bloc qui garde ses liens est signalé', () => {
		expect(findUnmaskedAnswers(associer('case: 0', ...SUITES))).toEqual(['associer']);
	});

	it('version publique (évaluation notée) : ni réponse, ni lien', () => {
		const instance = generate(template({ statement: `Associe.\n\n${associer(...SUITES)}` }));
		const sent = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		const json = JSON.stringify(sent);
		expect(json).not.toContain('expectedAnswer');
		expect(sent.blanks?.every((blank) => blank.construire === 'associer')).toBe(true);
		expect(sent.statement).not.toMatch(/^- [^-\s].*->[ \t]*\S/m);
		const published = parseMarkdown(sent.statement).children.find((c) => c.type === 'associer');
		// Structure : aucun lien dans l'énoncé publié
		expect(published && published.type === 'associer' && published.answers).toEqual([
			null,
			null,
			null
		]);
		expect(findUnmaskedAnswers(sent.statement)).toEqual([]);
		expect(published && published.type === 'associer' && published.labels).toEqual(
			shownBlock(instance).labels
		);
	});
});

describe('associer : le geste', () => {
	it('relier par défaut : rien d’écrit ; geste: étiquettes gardé dans l’énoncé de l’instance', () => {
		expect(shownBlock(generate(template({ statement: associer(...SUITES) }))).gesture).toBe(
			'relier'
		);
		const etiquettes = generate(template({ statement: associer('geste: étiquettes', ...SUITES) }));
		expect(shownBlock(etiquettes).gesture).toBe('etiquettes');
		expect(String(etiquettes.statement)).toContain('geste: étiquettes');
	});
});

describe('lot 2 — une courbe dans un élément', () => {
	const courbe = (expr: string) => [
		'- ```courbe',
		'  x: -3 ; 3',
		'  y: -5 ; 5',
		`  f(x) = ${expr}`,
		'  ```',
		`  -> $x \\mapsto ${expr}$`
	];
	const COURBES = [
		'````associer',
		...courbe('{{a}}*x'),
		...courbe('x+{{b}}'),
		'- -> $x \\mapsto x^2$',
		'````'
	];

	it('une case par courbe ; l’énoncé garde les courbes (variables résolues), sans lien', () => {
		const instance = generate(
			template({
				statement: `Associe chaque courbe à sa fonction.\n\n${COURBES.join('\n')}`,
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '1' }
				]
			})
		);
		expect(instance.blanks).toHaveLength(2);
		const shown = shownBlock(instance);
		expect(shown.errors).toEqual([]);
		expect(shown.items).toHaveLength(2);
		expect(shown.items[0]).toMatch(/^```courbe\n[\s\S]*f\(x\) = 2\*x\n```$/);
		expect(shown.items[1]).toMatch(/f\(x\) = x\+1/);
		expect(shown.answers).toEqual([null, null]);
		expect(String(instance.statement)).toMatch(/^````associer$/m);
		expectedOf(instance).forEach((position, k) => {
			expect(shown.labels[Number(position)].replace(/\s/g, '')).toBe(
				['$x\\mapsto2*x$', '$x\\mapstox+1$'][k]
			);
		});
		expect(findUnmaskedAnswers(String(instance.statement))).toEqual([]);
		// Le bloc du prof (liens en fin d'élément) est signalé par la garde anti-fuite
		expect(
			findUnmaskedAnswers(COURBES.join('\n').replace('````associer', '````associer\ncase: 0'))
		).toEqual(['associer']);
	});

	it('deux courbes identiques après tirage : refusé', () => {
		const result = generateInstance(
			template({
				statement: [
					'````associer',
					...courbe('{{a}}*x'),
					...courbe('{{b}}*x'),
					'- -> $0$',
					'````'
				].join('\n'),
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '2' }
				]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/deux éléments identiques/);
	});

	it('courbe à placer dans un élément : refusée', () => {
		const result = generateInstance(
			template({
				statement: [
					'````associer',
					'- ```courbe',
					'  x: -3 ; 3',
					'  y: -3 ; 3',
					'  placer: A=(1 ; 2)',
					'  ```',
					'  -> a',
					'- b -> b',
					'- -> c',
					'````'
				].join('\n')
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/pas de placer: ni de tracer:/);
	});
});
