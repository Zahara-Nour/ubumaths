/**
 * Tirage d'une série (chantier idees-format, idée 1) : variations réparties à
 * parts égales, doublons refusés, ligne raccourcie plutôt que répétée. Avec
 * le vrai générateur : la graine choisie doit redonner la question.
 */
import { describe, it, expect } from 'vitest';
import {
	allowedVariations,
	distinctQuestionCount,
	distinctLimit,
	drawLineQuestions,
	emptySeen,
	questionFingerprints,
	variationExample,
	variationOfSeed
} from '#lib/questions/series-draw.ts';
import { drawSeriesQuestions, seriesSeedSequence } from '#lib/questions/series-items.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionTemplate, QuestionVariation } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

const generate = (template: QuestionTemplate, seed: number) => generateInstance(template, seed);

function variation(statement: string, variables: QuestionVariation['variables'] = []) {
	return {
		statement: templateMarkdown(statement),
		variables,
		blanks: [{ expectedAnswer: '0' }]
	} as QuestionVariation;
}

function model(id: string, variations: QuestionVariation[]): QuestionTemplate {
	return { id, title: id, status: 'draft', variations, grades: ['6'], level: 1 };
}

/** Trois variations à beaucoup de nombres possibles */
const FACTORISER = model('factoriser', [
	variation('A : ${{a}}x = ?$', [{ name: 'a', expression: '{{random:1..500}}' }]),
	variation('B : ${{a}}y = ?$', [{ name: 'a', expression: '{{random:1..500}}' }]),
	variation('C : ${{a}}z = ?$', [{ name: 'a', expression: '{{random:1..500}}' }])
]);

/** Cinq questions possibles en tout */
const CINQ = model('cinq', [
	variation('Calcule ${{a}} + 1 = ?$', [{ name: 'a', expression: '{{random:1..5}}' }])
]);

/** Trois questions fixes, sans hasard */
const AIRES = model('aires', [
	variation('Aire du disque : $\\mathcal{A} = ?$'),
	variation('Aire du triangle : $\\mathcal{A} = ?$'),
	variation('Aire du rectangle : $\\mathcal{A} = ?$')
]);

function lettersOf(statements: string[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const statement of statements) {
		const letter = statement.trim()[0];
		counts[letter] = (counts[letter] ?? 0) + 1;
	}
	return counts;
}

function draw(template: QuestionTemplate, quantity: number, lineSeed = 7) {
	return drawLineQuestions(template, quantity, lineSeed, emptySeen(), generate);
}

describe('variationOfSeed : la variation se lit dans la graine, sans générer', () => {
	it('dit la variation que choisit generateInstance, pour chaque graine', () => {
		for (let seed = 0; seed < 300; seed++) {
			const result = generateInstance(FACTORISER, seed);
			if (!result.success) throw new Error('génération impossible');
			expect(variationOfSeed(FACTORISER, seed)).toBe(result.instance.selectedVariationIndex);
		}
	});

	it('un modèle à une variation rend 0', () => {
		expect(variationOfSeed(CINQ, 123)).toBe(0);
	});
});

describe('variations réparties à parts égales', () => {
	it('10 questions, 3 variations : 4 + 3 + 3', () => {
		const questions = draw(FACTORISER, 10);
		expect(questions).toHaveLength(10);
		const counts = Object.values(lettersOf(questions.map((q) => String(q.instance.statement))));
		expect(counts.sort()).toEqual([3, 3, 4]);
	});

	it('2 questions, 3 variations : deux variations différentes', () => {
		for (let lineSeed = 0; lineSeed < 20; lineSeed++) {
			const questions = draw(FACTORISER, 2, lineSeed);
			const variations = questions.map((q) => q.instance.selectedVariationIndex);
			expect(new Set(variations).size).toBe(2);
		}
	});

	it('6 questions : chaque variation deux fois, quelle que soit la graine de la ligne', () => {
		for (let lineSeed = 0; lineSeed < 20; lineSeed++) {
			const counts = lettersOf(
				draw(FACTORISER, 6, lineSeed).map((q) => String(q.instance.statement))
			);
			expect(counts).toEqual({ A: 2, B: 2, C: 2 });
		}
	});
});

describe('la graine choisie redonne la question (évaluation, statistiques)', () => {
	it('generateInstance(modèle, graine) rend le même énoncé que le tirage', () => {
		for (const { seed, instance } of draw(FACTORISER, 10)) {
			const replay = generateInstance(FACTORISER, seed);
			if (!replay.success) throw new Error('génération impossible');
			expect(replay.instance.statement).toBe(instance.statement);
			expect(replay.instance.selectedVariationIndex).toBe(instance.selectedVariationIndex);
		}
	});
});

describe('doublons refusés', () => {
	it('5 questions possibles, 5 demandées : 5 questions différentes', () => {
		const statements = draw(CINQ, 5).map((q) => String(q.instance.statement));
		expect(new Set(statements).size).toBe(5);
	});

	it('5 questions possibles, 8 demandées : la ligne est raccourcie à 5, sans répétition', () => {
		const statements = draw(CINQ, 8).map((q) => String(q.instance.statement));
		expect(statements).toHaveLength(5);
		expect(new Set(statements).size).toBe(5);
	});

	it('questions fixes : chacune une fois, puis la ligne s’arrête', () => {
		const shapes = draw(AIRES, 10).map((q) => String(q.instance.statement).split(' ')[2]);
		expect([...shapes].sort()).toEqual(['disque', 'rectangle', 'triangle']);
	});

	it('même réponse, calculs différents : pas un doublon (12 × 5 et 15 × 4)', () => {
		const produit = model('produit', [
			variation('Calcule ${{a}} \\times {{b}} = ?$', [
				{ name: 'a', expression: '{{12|15}}' },
				{ name: 'b', expression: '{{eval:60/{{a}}}}' }
			])
		]);
		const statements = draw(produit, 5).map((q) => String(q.instance.statement));
		expect(statements).toHaveLength(2);
	});

	it('choix d’un QCM seulement mélangés : la même question', () => {
		const qcm = model('qcm', [
			{
				statement: templateMarkdown(
					'Le plus grand ?\n\n```choix\n- $0{,}7$\n- $0{,}65$\n- $0{,}8$\n```'
				),
				blanks: [{ expectedAnswer: '2' }]
			} as QuestionVariation
		]);
		expect(draw(qcm, 4)).toHaveLength(1);
	});

	it('tirage dans le texte de l’énoncé : les questions diffèrent malgré les mêmes variables', () => {
		const cotes = model('cotes', [
			variation('Un {{carré|rectangle}} de côté {{a}} a combien de côtés ? $n = ?$', [
				{ name: 'a', expression: '{{random:2..2}}' }
			])
		]);
		const statements = draw(cotes, 4).map((q) => String(q.instance.statement));
		expect(statements).toHaveLength(2);
		expect(new Set(statements).size).toBe(2);
	});

	it('le même modèle sur deux lignes : pas de doublon entre les lignes', () => {
		const series = [
			{ templateId: 'cinq', quantity: 3, delay: 10 },
			{ templateId: 'cinq', quantity: 3, delay: 10 }
		];
		const draws = drawSeriesQuestions(series, [CINQ], { nextSeed: seriesSeedSequence(1) });
		const statements = draws.map((d) => String(d.instance.statement));
		expect(statements).toHaveLength(5);
		expect(new Set(statements).size).toBe(5);
	});
});

describe('coût : une variation épuisée ne se cherche plus', () => {
	it('deuxième ligne d’un modèle épuisé : aucune génération', () => {
		const seen = emptySeen();
		let calls = 0;
		const counting = (template: QuestionTemplate, seed: number) => {
			calls++;
			return generate(template, seed);
		};
		expect(drawLineQuestions(AIRES, 5, 1, seen, counting)).toHaveLength(3);
		calls = 0;
		expect(drawLineQuestions(AIRES, 5, 2, seen, counting)).toHaveLength(0);
		expect(calls).toBe(0);
	});
});

describe('empreintes', () => {
	it('mêmes nombres tirés : même empreinte de valeurs ; autres nombres : autre empreinte', () => {
		const a = generateInstance(CINQ, 1);
		const b = generateInstance(CINQ, 2);
		if (!a.success || !b.success) throw new Error('génération impossible');
		const fa = questionFingerprints(CINQ, a.instance);
		const fb = questionFingerprints(CINQ, b.instance);
		expect(fa.values).toBeDefined();
		expect(fa.values === fb.values).toBe(fa.display === fb.display);
	});
});

describe('mêmes nombres pour tous', () => {
	it('même graine de série : mêmes questions, même répartition', () => {
		const series = [{ templateId: 'factoriser', quantity: 7, delay: 10 }];
		const run = () =>
			drawSeriesQuestions(series, [FACTORISER], { nextSeed: seriesSeedSequence(42) }).map(
				(d) => d.seed
			);
		expect(run()).toEqual(run());
	});
});

describe('distinctQuestionCount (panier : proposer d’abaisser la quantité)', () => {
	it('compte les questions différentes, plafonné à la quantité demandée', () => {
		expect(distinctQuestionCount(CINQ, 10, generate)).toBe(5);
		expect(distinctQuestionCount(AIRES, 10, generate)).toBe(3);
		expect(distinctQuestionCount(FACTORISER, 10, generate)).toBe(10);
	});

	it('rend toujours le même nombre', () => {
		expect(distinctQuestionCount(CINQ, 10, generate)).toBe(
			distinctQuestionCount(CINQ, 10, generate)
		);
	});
});

describe('distinctLimit (avertissement du panier)', () => {
	it('rend le nombre de questions différentes quand la quantité le dépasse', () => {
		expect(distinctLimit(CINQ, 8, generate)).toBe(5);
		expect(distinctLimit(AIRES, 4, generate)).toBe(3);
	});

	it('rend null quand la quantité est atteignable', () => {
		expect(distinctLimit(CINQ, 5, generate)).toBeNull();
		expect(distinctLimit(CINQ, 2, generate)).toBeNull();
		expect(distinctLimit(FACTORISER, 20, generate)).toBeNull();
	});

	it('ne recompte pas un modèle déjà épuisé, et ne recompte pas en deçà du déjà vu', () => {
		let calls = 0;
		const counting = (template: QuestionTemplate, seed: number) => {
			calls++;
			return generateInstance(template, seed);
		};
		const cinq = model('cinq-compte', CINQ.variations);
		expect(distinctLimit(cinq, 9, counting)).toBe(5);
		const afterFirst = calls;
		expect(distinctLimit(cinq, 12, counting)).toBe(5);
		expect(distinctLimit(cinq, 3, counting)).toBeNull();
		expect(calls).toBe(afterFirst);

		const large = model('large-compte', FACTORISER.variations);
		expect(distinctLimit(large, 10, counting)).toBeNull();
		const afterLarge = calls;
		expect(distinctLimit(large, 6, counting)).toBeNull();
		expect(calls).toBe(afterLarge);
	});
});

describe('distinctLimit : génération en échec', () => {
	it('ne dit rien et ne retient rien quand une génération échoue', () => {
		let fail = true;
		const flaky = (template: QuestionTemplate, seed: number) =>
			fail
				? ({ success: false, errors: ['panne'] } as ReturnType<typeof generateInstance>)
				: generateInstance(template, seed);
		const cinq = model('cinq-panne', CINQ.variations);

		expect(distinctLimit(cinq, 8, flaky)).toBeNull();
		fail = false;
		expect(distinctLimit(cinq, 8, flaky)).toBe(5);
	});

	it('monter de 1 en 1 ne recompte pas à chaque pas', () => {
		let calls = 0;
		const counting = (template: QuestionTemplate, seed: number) => {
			calls++;
			return generateInstance(template, seed);
		};
		const large = model('large-montee', FACTORISER.variations);
		let recounts = 0;
		for (let quantity = 1; quantity <= 99; quantity++) {
			const before = calls;
			expect(distinctLimit(large, quantity, counting)).toBeNull();
			if (calls > before) recounts++;
		}
		expect(recounts).toBeLessThanOrEqual(8);
	});
});

describe('génération impossible', () => {
	it('la question est omise, les autres restent', () => {
		let calls = 0;
		const flaky = (template: QuestionTemplate, seed: number) => {
			calls++;
			return calls === 2
				? { success: false as const, errors: ['échec'] }
				: generate(template, seed);
		};
		const failures: unknown[] = [];
		const questions = drawLineQuestions(FACTORISER, 4, 3, emptySeen(), flaky, (errors) =>
			failures.push(errors)
		);
		expect(questions).toHaveLength(3);
		expect(failures).toEqual([['échec']]);
	});
});

describe('idée 2 : variations choisies par le prof', () => {
	it('ne tire que dans les variations choisies, réparties à parts égales', () => {
		const questions = drawLineQuestions(
			FACTORISER,
			10,
			7,
			emptySeen(),
			generate,
			undefined,
			[0, 2]
		);
		const counts = lettersOf(questions.map((q) => String(q.instance.statement)));
		expect(counts).toEqual({ A: 5, C: 5 });
	});

	it('la graine redonne la variation choisie (évaluation régénérée)', () => {
		const questions = drawLineQuestions(FACTORISER, 6, 11, emptySeen(), generate, undefined, [1]);
		for (const { seed, instance } of questions) {
			expect(instance.selectedVariationIndex).toBe(1);
			expect(variationOfSeed(FACTORISER, seed)).toBe(1);
		}
	});

	it('Q3 : un numéro qui n’existe plus est ignoré', () => {
		const questions = drawLineQuestions(FACTORISER, 4, 7, emptySeen(), generate, undefined, [2, 9]);
		expect(lettersOf(questions.map((q) => String(q.instance.statement)))).toEqual({ C: 4 });
	});

	it('Q3 : plus aucun numéro valable → toutes les variations', () => {
		const questions = drawLineQuestions(FACTORISER, 9, 7, emptySeen(), generate, undefined, [5, 9]);
		expect(lettersOf(questions.map((q) => String(q.instance.statement)))).toEqual({
			A: 3,
			B: 3,
			C: 3
		});
	});

	it('allowedVariations : choix filtré, vide ou absent = toutes', () => {
		expect(allowedVariations(FACTORISER, [2, 0])).toEqual([0, 2]);
		expect(allowedVariations(FACTORISER, [7])).toEqual([0, 1, 2]);
		expect(allowedVariations(FACTORISER, undefined)).toEqual([0, 1, 2]);
		expect(allowedVariations(CINQ, [0])).toEqual([0]);
	});

	it('le compte du panier ne compte que les variations choisies', () => {
		expect(distinctQuestionCount(AIRES, 10, generate, [0, 2])).toBe(2);
		expect(distinctLimit(AIRES, 3, generate, [1])).toBe(1);
		// Le même modèle, toutes variations : son propre compte, pas celui du choix
		expect(distinctLimit(AIRES, 3, generate)).toBeNull();
		expect(distinctLimit(AIRES, 4, generate)).toBe(3);
	});

	it('variationExample : un exemple de chaque variation, toujours le même', () => {
		const examples = [0, 1, 2].map((index) => variationExample(AIRES, index, generate));
		expect(examples.map((instance) => instance?.selectedVariationIndex)).toEqual([0, 1, 2]);
		expect(String(examples[1]?.statement)).toContain('triangle');
		expect(variationExample(FACTORISER, 1, generate)?.statement).toBe(
			variationExample(FACTORISER, 1, generate)?.statement
		);
	});
});

describe('idée 2 : la série suit le choix de chaque ligne', () => {
	it('drawSeriesQuestions passe les variations de la ligne au tirage', () => {
		const draws = drawSeriesQuestions(
			[{ templateId: 'factoriser', quantity: 4, delay: 20, variations: [1] }],
			[FACTORISER],
			{ generate, nextSeed: seriesSeedSequence(5) }
		);
		expect(draws.map((d) => d.instance.selectedVariationIndex)).toEqual([1, 1, 1, 1]);
	});

	it('deux lignes du même modèle, choix différents : chacune les siennes, sans doublon', () => {
		const draws = drawSeriesQuestions(
			[
				{ templateId: 'aires', quantity: 1, delay: 20, variations: [1] },
				{ templateId: 'aires', quantity: 2, delay: 20, variations: [0, 1] }
			],
			[AIRES],
			{ generate, nextSeed: seriesSeedSequence(5) }
		);
		// La 2e ligne n'a plus que le disque : le triangle est déjà sorti, jamais répété
		expect(draws.map((d) => d.instance.selectedVariationIndex)).toEqual([1, 0]);
	});
});

describe('idée 4 : variations « en QCM » de la ligne', () => {
	/** Deux variations à erreurs prévues : A (addition), B (soustraction) */
	const QCM = model('qcm', [
		{
			statement: templateMarkdown('A : ${{a}} + 3 = ?$'),
			variables: [{ name: 'a', expression: '{{random:10..400}}' }],
			blanks: [
				{
					expectedAnswer: '{{eval:{{a}}+3}}',
					expectedErrors: [{ answer: '{{eval:{{a}}-3}}', message: 'Tu as soustrait.' }]
				}
			]
		} as QuestionVariation,
		{
			statement: templateMarkdown('B : ${{a}} - 3 = ?$'),
			variables: [{ name: 'a', expression: '{{random:10..400}}' }],
			blanks: [
				{
					expectedAnswer: '{{eval:{{a}}-3}}',
					expectedErrors: [{ answer: '{{eval:{{a}}+3}}', message: 'Tu as additionné.' }]
				}
			]
		} as QuestionVariation
	]);

	const isChoice = (instance: { blanks?: { type: string }[] }) =>
		instance.blanks?.[0]?.type === 'choice';

	it('seules les variations cochées « en QCM » deviennent des QCM', () => {
		const questions = drawLineQuestions(
			QCM,
			6,
			7,
			emptySeen(),
			generate,
			undefined,
			undefined,
			[1]
		);
		expect(questions.length).toBe(6);
		for (const { instance } of questions) {
			expect(isChoice(instance)).toBe(instance.selectedVariationIndex === 1);
		}
	});

	it('la graine de la question en QCM redonne ses nombres en saisie', () => {
		const [question] = drawLineQuestions(QCM, 1, 7, emptySeen(), generate, undefined, [0], [0]);
		const typed = generateInstance(QCM, question.seed);
		if (!typed.success) throw new Error('génération impossible');
		expect(typed.instance.resolvedVariables?.length).toBe(1);
		expect(question.instance.blanks?.[0].type).toBe('choice');
		expect(typed.instance.resolvedVariables).toEqual(question.instance.resolvedVariables);
	});

	it('drawSeriesQuestions : la ligne en QCM, sauf quand la forme l’exclut (flash-cards)', () => {
		const items = [{ templateId: 'qcm', quantity: 2, delay: 20, choiceVariations: [0, 1] }];
		const withChoices = drawSeriesQuestions(items, [QCM], {
			generate,
			nextSeed: seriesSeedSequence(5),
			choiceCases: true
		});
		expect(withChoices.every((d) => isChoice(d.instance))).toBe(true);
		const flash = drawSeriesQuestions(items, [QCM], { generate, nextSeed: seriesSeedSequence(5) });
		expect(flash.some((d) => isChoice(d.instance))).toBe(false);
		// Mêmes questions, seule la forme de la case change
		expect(flash.map((d) => d.seed)).toEqual(withChoices.map((d) => d.seed));
	});
});
