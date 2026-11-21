/**
 * Tirage d'une série (chantier idees-format, idée 1) : variations réparties à
 * parts égales, doublons refusés, ligne raccourcie plutôt que répétée. Avec
 * le vrai générateur : la graine choisie doit redonner la question.
 */
import { describe, it, expect } from 'vitest';
import {
	distinctQuestionCount,
	drawLineQuestions,
	emptySeen,
	questionFingerprints,
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
