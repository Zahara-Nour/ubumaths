/**
 * Conversion des `testAnswerss` TinyMath
 * ======================================
 *
 * Fixtures : questions RÉELLES de `.claude/old-questions.json` (index 209, 216,
 * 481, 611), recopiées sans leur correction détaillée.
 *
 * Avant le correctif : variables écrites `d` au lieu de `{{d}}` (même la bonne
 * réponse était refusée), exclusions `&answer!=…` perdues, et une réponse juste
 * autre que celle tirée refusée faute de mode `rulesSuffice`.
 */

import { describe, it, expect } from 'vitest';
import { transformQuestion } from '../question-transformer';
import type { QuestionBase } from '../old-question-types';
import type { QuestionTemplate } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';

// ============================================================================
// FIXTURES (vraies questions)
// ============================================================================

const Q216 = {
	description: 'Trouver un diviseur',
	subdescription: 'Nombre à $$3$$ chiffres.',
	enounces: ['Trouve un diviseur de $$&4$$ (autre que $$1$$ et $$&4$$).'],
	variabless: [
		{ '&1': '$e[1;9]', '&2': '$e[1;9]', '&3': '$l{2;4;6;8}', '&4': '[_&1*100+&2*10+&3_]' },
		{ '&1': '$e[1;9]', '&2': '$e[1;9]', '&3': '$l{5;0}', '&4': '[_&1*100+&2*10+&3_]' },
		{
			'&1': '$e[1;9]',
			'&2': '$e[1;9]',
			'&3': '$l{1;4;7}+2-mod(&1+&2;3)',
			'&4': '[_&1*100+&2*10+&3_]'
		}
	],
	testAnswerss: [['&answer!=1 && &answer!=&4 && mod(&4; &answer)=0']],
	solutionss: [['2'], ['5'], ['3']],
	answerFields: ['$$...$$\\text{ est un diviseur de }$$[_&4_]$$\\text{.}'],
	defaultDelay: 15,
	grade: 'CM2',
	_migration: {
		theme: 'Entiers',
		domain: 'Diviser',
		subdomain: 'Divisibilité',
		level: 7,
		globalIndex: 216
	}
} as unknown as QuestionBase;

const Q209 = {
	description: 'Trouver un diviseur',
	enounces: [
		'Trouve un diviseur de $$[_&1*&2_]$$ (autre que $$1$$ et $$[_&1*&2_]$$), sachant que :'
	],
	expressions: ['[_&1*&2_]=&1 \\times &2'],
	variabless: [{ '&1': '$e[2;9]', '&2': '$e[2;9]\\{&1}' }],
	testAnswerss: [['&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0']],
	solutionss: [['&1']],
	answerFields: ['$$...$$\\text{ est un diviseur de }$$[_&1*&2_]$$\\text{.}'],
	defaultDelay: 20,
	grade: 'CM2',
	_migration: {
		theme: 'Entiers',
		domain: 'Diviser',
		subdomain: 'Divisibilité',
		level: 0,
		globalIndex: 209
	}
} as unknown as QuestionBase;

const Q611 = {
	description: "Trouver une racine évidente d'un polynôme",
	enounces: ['Trouve une racine évidente de ce polynôme :'],
	expressions: ['x^2[+_-(&1+(&2))x_][+_(&1)*(&2)_]'],
	answerFields: ['\\text{Une racine évidente est }$$...$$\\text{.}'],
	solutionss: [['&1']],
	variabless: [{ '&1': '$er[1;3]', '&2': '$er[1;3]\\{&1}' }],
	testAnswerss: [['(&answer)^2-(&1+(&2))*(&answer)+(&1)*(&2)=0']],
	defaultDelay: 20,
	grade: 'SPE_1',
	_migration: {
		theme: 'Fonctions',
		domain: 'Polynôme du second degré',
		subdomain: 'Racines',
		level: 1,
		globalIndex: 611
	}
} as unknown as QuestionBase;

const Q481 = {
	description: 'Probabilité',
	enounces: [
		"Quelle est la probabilité d'obtenir le nombre $$&2$$ quand on lance un dé à $$&1$$ faces ?"
	],
	variabless: [{ '&1': '$l{6;8;10;12;20}', '&2': '$e[1;&1]' }],
	testAnswerss: [['&answer=1/&1']],
	solutionss: [['1/&1']],
	defaultDelay: 20,
	grade: '6',
	_migration: {
		theme: 'Probabilités',
		domain: 'apprivoiser',
		subdomain: 'fréquences',
		level: 0,
		globalIndex: 481
	}
} as unknown as QuestionBase;

// ============================================================================
// HELPERS
// ============================================================================

function transform(q: QuestionBase): QuestionTemplate {
	const result = transformQuestion(q, 0);
	expect(result.success, JSON.stringify(result.errors)).toBe(true);
	return result.template!;
}

function divisorsOf(n: number): number[] {
	return Array.from({ length: n }, (_, k) => k + 1).filter((k) => n % k === 0);
}

// ============================================================================
// STRUCTURE PRODUITE
// ============================================================================

describe('testAnswerss — règles produites', () => {
	it('#216 : divisibilité + deux exclusions, variables entre accolades', () => {
		const template = transform(Q216);
		expect(template.shared?.validationRules).toEqual([
			expect.objectContaining({ type: 'custom', expression: 'answer != 1' }),
			expect.objectContaining({ type: 'custom', expression: 'answer != {{d}}' }),
			{ type: 'divisor', dividend: '{{d}}' }
		]);
	});

	it('#209 : dividende composé', () => {
		const template = transform(Q209);
		const rules = template.shared?.validationRules ?? template.variations[0].validationRules;
		expect(rules).toContainEqual({ type: 'divisor', dividend: '{{a}}*{{b}}' });
		expect(rules).toContainEqual(
			expect.objectContaining({ type: 'custom', expression: 'answer != {{a}}*{{b}}' })
		);
	});

	it('#611 : racine d’une équation', () => {
		const template = transform(Q611);
		const rules = template.shared?.validationRules ?? template.variations[0].validationRules;
		expect(rules).toEqual([
			{
				type: 'equation_root',
				equation: '(x)^2-({{a}}+({{b}}))*(x)+({{a}})*({{b}})=0',
				variable: 'x'
			}
		]);
	});

	it('#216 et #611 : chaque case passe en rulesSuffice', () => {
		for (const template of [transform(Q216), transform(Q611)]) {
			const blanks = template.variations.flatMap((v) => v.blanks ?? []);
			expect(blanks.length).toBeGreaterThan(0);
			expect(blanks.every((b) => b.rulesSuffice === true)).toBe(true);
		}
	});

	it('#481 : une égalité seule redit la solution → ni règle ni rulesSuffice', () => {
		const template = transform(Q481);
		expect(template.shared?.validationRules).toBeUndefined();
		expect(template.variations[0].validationRules).toBeUndefined();
		const blanks = template.variations.flatMap((v) => v.blanks ?? []);
		expect(blanks.some((b) => b.rulesSuffice)).toBe(false);
	});
});

// ============================================================================
// DE BOUT EN BOUT : transformation → génération → correction
// ============================================================================

describe('testAnswerss — de bout en bout (#216)', () => {
	const template = transform(Q216);

	// Variantes 1 et 2 seulement : la 3e (`$l{1;4;7}+2-mod(&1+&2;3)`) est mal
	// convertie par ailleurs — cf. le test `it.fails` ci-dessous.
	it.each([0, 1])(
		'variante %i, 30 tirages : tout diviseur autre que 1 et n est juste, le reste est faux',
		(variationIndex) => {
			const single = { ...template, variations: [template.variations[variationIndex]] };
			let checked = 0;
			for (let seed = 1; seed <= 30; seed++) {
				const generated = generateInstance(single, seed);
				expect(generated.success, JSON.stringify(generated)).toBe(true);
				if (!generated.success) continue;
				const instance = generated.instance;
				const n = Number(instance.resolvedVariables!.find((v) => v.name === 'd')!.value);

				const divisors = divisorsOf(n);
				for (const k of divisors) {
					const verdict = validateAnswer([String(k)], instance, [String(k)]);
					expect(verdict.isCorrect, `n=${n}, réponse ${k}`).toBe(k !== 1 && k !== n);
					checked++;
				}
				const notDivisor = [7, 11, 13].find((k) => n % k !== 0)!;
				expect(
					validateAnswer([String(notDivisor)], instance, [String(notDivisor)]).isCorrect,
					`n=${n}, réponse ${notDivisor}`
				).toBe(false);
				checked++;
			}
			// Preuve que le test a bien jugé des réponses, pas zéro
			expect(checked).toBeGreaterThan(90);
		}
	);

	// La liste suivie d'un calcul `$l{1;4;7}+2-mod(&1+&2;3)` devenait `1|4|7+2-mod(a+b;3)`,
	// que le générateur ne savait pas tirer : tirage composé depuis le lot Entiers
	it('variante 3 : génère sur 20 tirages', () => {
		const single = { ...template, variations: [template.variations[2]] };
		for (let seed = 1; seed <= 20; seed++) {
			expect(generateInstance(single, seed).success).toBe(true);
		}
	});
});
