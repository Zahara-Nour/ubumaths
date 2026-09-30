/**
 * Génération à graine : une seule source pseudo-aléatoire par instance
 * ====================================================================
 *
 * Avec une graine, chaque tirage était recalculé depuis la graine seule : deux
 * tirages qui recevaient la même graine étaient égaux (`{{1..9}}+{{1..9}}` → 7+7),
 * l'indice de branche et la valeur d'une liste à plages étaient corrélés (la moitié
 * des valeurs ne sortaient jamais), le mélange des choix ne dépendait que de la graine
 * et du nombre de choix, et la graine 0 n'était pas reproductible.
 *
 * Contrat : une graine crée UNE source, consommée dans l'ordre pendant toute la
 * génération ; même graine → même instance ; sans graine, même chemin sur Math.random.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// Aides
// ============================================================================

function makeTemplate(id: string, variations: QuestionVariation[]): QuestionTemplate {
	return {
		id,
		title: 'Test',
		status: 'draft' as const,
		variations,
		grades: ['6'],
		theme: 'Arithmétique',
		domain: 'Calcul',
		level: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		created_by: 'test-user'
	};
}

/** Un seul nombre tiré, lu dans la variable `n` */
function singleDrawTemplate(expression: string): QuestionTemplate {
	return makeTemplate('single-draw', [
		{
			statement: templateMarkdown('Écrire ${{n}} = ?$'),
			variables: [{ name: 'n', expression }],
			blanks: [{ expectedAnswer: '{{n}}' }]
		}
	]);
}

function generate(template: QuestionTemplate, seed?: number): QuestionInstance {
	const result = generateInstance(template, seed);
	if (!result.success) throw new Error(result.errors.join('\n'));
	return result.instance;
}

function variable(instance: QuestionInstance, name: string): string {
	const found = instance.resolvedVariables?.find((v) => v.name === name);
	if (!found) throw new Error(`variable ${name} absente`);
	return found.value;
}

/** L'instance sans son horodatage (seul champ légitimement différent d'un appel à l'autre) */
function withoutTimestamp(instance: QuestionInstance): Omit<QuestionInstance, 'generatedAt'> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { generatedAt, ...rest } = instance;
	return rest;
}

const SEEDS = (count: number) => Array.from({ length: count }, (_, i) => i * 37 + 1);

/** Modèle riche : variations, variables, tirages en ligne, décimaux, couleurs, mélange d'affichage, QCM */
const richTemplate = makeTemplate('rich', [
	{
		statement: templateMarkdown(
			'Calcule ${{expr}}$ avec {{1..9}} et {{digits:1.2}} en \\textcolor{{{color:primary}}}{rouge}'
		),
		variables: [
			{ name: 'a', expression: '{{1..9}}' },
			{ name: 'b', expression: '{{1..20!a}}' },
			{ name: 'c', expression: '{{0|1..9}}' },
			{
				name: 'expr',
				expression: '{{a}}+{{b}}+{{c}}+{{1..9}}',
				displayOptions: { shuffleTerms: true }
			}
		],
		correctChoiceIndex: '0',
		choices: [
			{ content: templateMarkdown('{{eval:a+b}}'), isCorrect: true },
			{ content: templateMarkdown('{{eval:a+b+1}}'), isCorrect: false },
			{ content: templateMarkdown('{{eval:a+b+2}}'), isCorrect: false },
			{ content: templateMarkdown('{{eval:a+b+3}}'), isCorrect: false }
		]
	},
	{
		statement: templateMarkdown('Autre variation ${{a}}$'),
		variables: [{ name: 'a', expression: '{{2..5}}' }],
		correctChoiceIndex: '0',
		choices: [
			{ content: templateMarkdown('{{a}}'), isCorrect: true },
			{ content: templateMarkdown('{{eval:a+1}}'), isCorrect: false }
		]
	}
]);

// ============================================================================
// (a) Indépendance des tirages
// ============================================================================

describe('génération à graine : indépendance des tirages', () => {
	it('deux tirages en ligne de la même expression ne sont pas égaux à chaque graine', () => {
		const template = singleDrawTemplate('{{1..9}}+{{1..9}}');
		const seeds = SEEDS(300);
		const equal = seeds.filter((seed) => {
			const [left, right] = variable(generate(template, seed), 'n').split('+');
			return left.trim() === right.trim();
		}).length;
		// Indépendants : P(égaux) = 1/9 ≈ 11 % → 33 attendus sur 300
		expect(equal / seeds.length).toBeGreaterThan(0.04);
		expect(equal / seeds.length).toBeLessThan(0.2);
	});
});

// ============================================================================
// (b) Couverture des listes à plages
// ============================================================================

describe('génération à graine : couverture des listes à plages', () => {
	function distinctValues(expression: string, seedCount: number): Set<string> {
		const template = singleDrawTemplate(expression);
		return new Set(SEEDS(seedCount).map((seed) => variable(generate(template, seed), 'n')));
	}

	it('1..9|11..15|25|30|40|50|100 produit ses 19 valeurs', () => {
		const values = distinctValues('{{1..9|11..15|25|30|40|50|100}}', 2000);
		const expected = [
			...Array.from({ length: 9 }, (_, i) => String(i + 1)),
			...Array.from({ length: 5 }, (_, i) => String(i + 11)),
			'25',
			'30',
			'40',
			'50',
			'100'
		];
		expect([...values].sort()).toEqual(expected.sort());
	});

	it('0|1..9 produit ses 10 valeurs', () => {
		const values = distinctValues('{{0|1..9}}', 2000);
		expect([...values].sort()).toEqual(Array.from({ length: 10 }, (_, i) => String(i)).sort());
	});
});

// ============================================================================
// (c) Reproductibilité
// ============================================================================

describe('génération à graine : reproductibilité', () => {
	it.each([0, 1, 42, 123456789, -7])('la graine %i redonne la même instance', (seed) => {
		const first = generate(richTemplate, seed);
		const second = generate(richTemplate, seed);
		expect(withoutTimestamp(second)).toEqual(withoutTimestamp(first));
		expect(first.seed).toBe(seed);
	});

	it('des graines différentes donnent le plus souvent des instances différentes', () => {
		const seeds = SEEDS(50);
		const distinct = new Set(
			seeds.map((seed) => JSON.stringify(withoutTimestamp(generate(richTemplate, seed))))
		);
		expect(distinct.size).toBeGreaterThan(40);
	});

	it('le choix de variation suit la source : les deux variations sortent', () => {
		const indexes = new Set(
			SEEDS(50).map((seed) => generate(richTemplate, seed).selectedVariationIndex)
		);
		expect(indexes).toEqual(new Set([0, 1]));
	});

	it('les nouveaux essais des conditions restent reproductibles', () => {
		const template = makeTemplate('conditions', [
			{
				statement: templateMarkdown('${{a}}-{{b}} = ?$'),
				variables: [
					{ name: 'a', expression: '{{1..20}}' },
					{ name: 'b', expression: '{{1..20}}' }
				],
				conditions: ['a > b + 5'],
				blanks: [{ expectedAnswer: '{{eval:a-b}}' }]
			}
		]);
		for (const seed of SEEDS(30)) {
			const first = generate(template, seed);
			expect(Number(variable(first, 'a'))).toBeGreaterThan(Number(variable(first, 'b')) + 5);
			expect(withoutTimestamp(generate(template, seed))).toEqual(withoutTimestamp(first));
		}
	});
});

// ============================================================================
// (d) Mélange des choix QCM
// ============================================================================

describe('génération à graine : mélange des choix', () => {
	const fourChoices = (id: string, variables: QuestionVariation['variables']) =>
		makeTemplate(id, [
			{
				statement: templateMarkdown('Choisir'),
				variables,
				correctChoiceIndex: '0',
				choices: [
					{ content: templateMarkdown('A'), isCorrect: true },
					{ content: templateMarkdown('B'), isCorrect: false },
					{ content: templateMarkdown('C'), isCorrect: false },
					{ content: templateMarkdown('D'), isCorrect: false }
				]
			}
		]);

	function correctPosition(instance: QuestionInstance): number {
		return instance.shuffledChoices?.findIndex((choice) => choice.originalIndex === 0) ?? -1;
	}

	it('sur 200 graines, la bonne réponse occupe chacune des 4 positions', () => {
		const template = fourChoices('qcm-a', undefined);
		const positions = new Set(SEEDS(200).map((seed) => correctPosition(generate(template, seed))));
		expect(positions).toEqual(new Set([0, 1, 2, 3]));
	});

	it('deux modèles différents à même graine n’ont pas toujours la même permutation', () => {
		const plain = fourChoices('qcm-plain', undefined);
		const withDraws = fourChoices('qcm-draws', [
			{ name: 'a', expression: '{{1..9}}' },
			{ name: 'b', expression: '{{1..9}}' }
		]);
		const permutation = (instance: QuestionInstance) =>
			instance.shuffledChoices?.map((choice) => choice.originalIndex).join(',');
		const differing = SEEDS(50).filter(
			(seed) => permutation(generate(plain, seed)) !== permutation(generate(withDraws, seed))
		).length;
		expect(differing).toBeGreaterThan(10);
	});
});

// ============================================================================
// (e) Sans graine
// ============================================================================

describe('génération sans graine', () => {
	it('génère et varie', () => {
		const template = singleDrawTemplate('{{1..1000}}');
		const values = new Set(
			Array.from({ length: 20 }, () => {
				const instance = generate(template);
				expect(instance.seed).toBeUndefined();
				return variable(instance, 'n');
			})
		);
		expect(values.size).toBeGreaterThan(10);
	});

	it('mélange les choix d’un QCM', () => {
		const positions = new Set(
			Array.from({ length: 60 }, () => {
				const instance = generate(richTemplate);
				return instance.shuffledChoices?.map((c) => c.originalIndex).join(',');
			})
		);
		expect(positions.size).toBeGreaterThan(2);
	});
});
