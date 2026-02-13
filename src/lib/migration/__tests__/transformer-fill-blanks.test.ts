/**
 * Phase 5 Tests — Transformer fill-in-blanks migration
 *
 * Tests the transformer's ability to produce the new structure:
 * - Result/rewrite → fill_in_blanks with blanks[], expressions, answerFormats
 * - AnswerField → fill_in_blanks with statement $?$
 * - Unit in solutions → unit: { expected: true }
 * - expressions2 → expression2 variable for QCM
 * - type removed from output
 * - 8 pre-existing test failures fixed
 *
 * Uses concrete examples from .claude/old-questions.json
 */

import { describe, it, expect } from 'vitest';
import { transformQuestion } from '../question-transformer';
import { getQuestionType } from '$lib/questions/types';
import type { QuestionBase } from '../old-question-types';

// ============================================================================
// A. Result/rewrite reclassification → fill_in_blanks
// ============================================================================

describe('Result/rewrite → fill_in_blanks', () => {
	it('should reclassify simple result (globalIndex 10) with blanks and expression', () => {
		// Décomposition décimale → nombre entier
		// expressions: ["(&1*100) + (&2*10) + &3"], no answerFormats, no choicess
		const oldQuestion: QuestionBase = {
			description: "Décomposition décimale -> nombre entier (jusqu'aux centaines)",
			enounces: ["Réécris cette expression sous la forme d'un nombre entier."],
			expressions: ['(&1*100) +  (&2*10) + &3'],
			variabless: [{ '&1': '$e[0;9]', '&2': '$e[0;9]', '&3': '$e[0;9]' }],
			conditions: ['&2*&3!=0'],
			options: ['remove-null-terms'],
			defaultDelay: 20,
			grade: 'CE1'
		};

		const result = transformQuestion(oldQuestion, 10);

		expect(result.success).toBe(true);
		const template = result.template!;

		// No type field on template
		expect('type' in template).toBe(false);
		// Inferred type should be fill_in_blanks (has no choices)
		expect(getQuestionType(template.variations[0])).toBe('fill_in_blanks');

		// Should have expression variable and statement referencing it
		const variation = template.variations[0];
		expect(variation.variables?.some((v) => v.name.startsWith('expression'))).toBe(true);
		expect(String(variation.statement)).toContain('{{expression');

		// Should have blanks (from solutionss fallback: eval of expression)
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks!.length).toBeGreaterThanOrEqual(1);
		// expectedAnswer should be an eval expression
		expect(variation.blanks![0].expectedAnswer).toContain('eval:');

		// Should NOT have solution (fill_in_blanks uses blanks, not solution)
		expect(variation.solution).toBeUndefined();

		// No answerFormats (no answerFormats in source)
		expect(variation.answerFormats).toBeUndefined();
		expect(template.shared?.answerFormats).toBeUndefined();
	});

	it('should reclassify result with answerFormat 10^? (globalIndex 413)', () => {
		// 10^&2 * 10^&3, answerFormat "10^?", solution [_&2+&3_]
		const oldQuestion: QuestionBase = {
			description: 'Multiplier 2 puissances de 10.',
			subdescription: 'Exposants positifs',
			enounces: ["Simplifie en écrivant sous la forme d'une seule puissance de 10."],
			expressions: ['10^&2*10^&3'],
			answerFormats: ['10^?'],
			variabless: [{ '&2': '$e[1;9]', '&3': '$e[1;9]' }],
			solutionss: [['[_&2+&3_]']],
			defaultDelay: 20,
			grade: '4'
		};

		const result = transformQuestion(oldQuestion, 413);

		expect(result.success).toBe(true);
		const template = result.template!;

		expect('type' in template).toBe(false);
		expect(getQuestionType(template.variations[0])).toBe('fill_in_blanks');

		const variation = template.variations[0];

		// Should have exactly 1 blank (1 ? in answerFormat "10^?")
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(1);
		// expectedAnswer should be the converted solution (eval:b+c)
		expect(variation.blanks![0].expectedAnswer).toMatch(/eval:/);

		// answerFormats should be on shared or variation
		const answerFormats = variation.answerFormats ?? template.shared?.answerFormats;
		expect(answerFormats).toBeDefined();
		expect(answerFormats!['expression1']).toBe('10^?');

		expect(variation.solution).toBeUndefined();
	});

	it('should reclassify result with multi-blank answerFormat ?*10^? (globalIndex 411)', () => {
		// Expression with answerFormat "?*10^?", 2 solutions: "&1,&3" and "&4"
		const oldQuestion: QuestionBase = {
			description: "Ecrire un nombre décimal à l'aide de la notation scientifique",
			enounces: ['Ecris ce nombre en notation scientifique.'],
			expressions: ['[._&1,&3*10^{&4}_]'],
			answerFormats: ['?*10^?'],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;3]', '&3': '$e{&2;&2}', '&4': '$er[2;4]' }],
			solutionss: [['&1,&3', '&4']],
			defaultDelay: 20,
			grade: '4'
		};

		const result = transformQuestion(oldQuestion, 411);

		expect(result.success).toBe(true);
		const template = result.template!;

		expect('type' in template).toBe(false);
		expect(getQuestionType(template.variations[0])).toBe('fill_in_blanks');

		const variation = template.variations[0];

		// Should have 2 blanks (2 ? in answerFormat "?*10^?")
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(2);

		// answerFormats should contain "?*10^?"
		const answerFormats = variation.answerFormats ?? template.shared?.answerFormats;
		expect(answerFormats).toBeDefined();
		expect(answerFormats!['expression1']).toBe('?*10^?');

		expect(variation.solution).toBeUndefined();
	});

	it('should generate default blank with eval when no solutionss (behavior 4)', () => {
		// Result question without explicit solutionss
		const oldQuestion: QuestionBase = {
			description: 'Calcul simple',
			enounces: ['Calculer :'],
			expressions: ['&1 + &2'],
			variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]' }],
			defaultDelay: 30,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 100);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];

		// Should have 1 blank with eval of expression
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(1);
		expect(variation.blanks![0].expectedAnswer).toContain('eval:');

		expect(variation.solution).toBeUndefined();
	});

	it('should NOT reclassify when choicess present (behavior 5)', () => {
		// QCM with expressions AND choicess → stays multiple_choice
		const oldQuestion: QuestionBase = {
			description: 'QCM avec expression',
			enounces: ['Quelle est la valeur ?'],
			expressions: ['&1 + &2'],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
			choicess: [[{ text: 'A' }, { text: 'B' }]],
			solutionss: [[0]],
			defaultDelay: 20,
			grade: 'CE1'
		};

		const result = transformQuestion(oldQuestion, 200);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];

		// Should be multiple_choice
		expect(getQuestionType(variation)).toBe('multiple_choice');
		expect(variation.choices).toBeDefined();
		// Should NOT have blanks
		expect(variation.blanks).toBeUndefined();
	});
});

// ============================================================================
// B. AnswerField conversion → fill_in_blanks
// ============================================================================

describe('AnswerField → fill_in_blanks', () => {
	it('should convert mono-trou answerField (globalIndex 0, variation 0)', () => {
		// answerField: "\\text{Le chiffre des dizaines est }$$...$$\\text{.}"
		// → statement: "Le chiffre des dizaines est $?$."
		const oldQuestion: QuestionBase = {
			description: 'Connaître la position décimale',
			subdescription: "Jusqu'aux dizaines.",
			enounces: [
				'Dans le nombre $$&3$$, quel est le chiffre des dizaines ?',
				'Dans le nombre $$&3$$, quel est le chiffre des unités ?'
			],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[0;9]\\{&1}', '&3': '[_&1*10+&2_]' }],
			solutionss: [['&1'], ['&2']],
			answerFields: [
				'\\text{Le chiffre des dizaines est }$$...$$\\text{.}',
				'\\text{Le chiffre des unités est }$$...$$\\text{.}'
			],
			options: [
				'require-no-extraneous-zeros',
				'require-no-extraneous-brackets',
				'require-no-extraneous-signs'
			],
			defaultDelay: 10,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 0);

		expect(result.success).toBe(true);
		const template = result.template!;

		// Type inferred as fill_in_blanks
		expect('type' in template).toBe(false);

		// Variation 0: answerField with $$...$$ → statement with $?$
		const variation0 = template.variations[0];
		const statement0 = String(variation0.statement);
		// Should contain $?$ (the converted trou)
		expect(statement0).toContain('$?$');
		// Should NOT contain $$...$$ or \text{}
		expect(statement0).not.toContain('$$...$$');
		expect(statement0).not.toContain('\\text{');
		// Should contain the plain text
		expect(statement0).toContain('dizaines');

		// Should have 1 blank
		expect(variation0.blanks).toBeDefined();
		expect(variation0.blanks).toHaveLength(1);
		// expectedAnswer from solutionss[0][0] = "&1" → converted to "a"
		expect(variation0.blanks![0].expectedAnswer).toBeDefined();

		// No solution for fill_in_blanks
		expect(variation0.solution).toBeUndefined();
	});

	it('should convert answerField with variables in text (behavior 8)', () => {
		// $$&1$$ in text → ${{a}}$ (variable display, not a blank)
		// $$...$$ → $?$ (blank)
		const oldQuestion: QuestionBase = {
			description: 'Test variable in answerField',
			enounces: ['Complète.'],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
			solutionss: [['[_&1+&2_]']],
			answerFields: ['\\text{Le double de }$$&1$$\\text{ est }$$...$$\\text{.}'],
			defaultDelay: 10,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 300);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];
		const statement = String(variation.statement);

		// Should have the variable reference (not a blank)
		expect(statement).toContain('{{a}}');
		// Should have the blank
		expect(statement).toContain('$?$');
		// Should have 1 blank (only the $$...$$ is a blank, $$&1$$ is a variable)
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(1);
	});

	it('should convert answerField multi-trous (behavior 7)', () => {
		// Multiple $$...$$ in same answerField → multiple $?$
		const oldQuestion: QuestionBase = {
			description: 'Multi-trous',
			enounces: ['Complète.'],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
			solutionss: [['&1', '&2']],
			answerFields: ['\\text{A = }$$...$$\\text{ et B = }$$...$$\\text{.}'],
			defaultDelay: 10,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 301);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];
		const statement = String(variation.statement);

		// Should have 2 blanks
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(2);

		// Statement should contain 2 $?$
		const matches = statement.match(/\$\?\$/g);
		expect(matches).toHaveLength(2);
	});
});

// ============================================================================
// C. Unit in solutions
// ============================================================================

describe('Unit in solutions', () => {
	it('should add unit: { expected: true } for answerField with unit in solution (globalIndex 470)', () => {
		// solution: [_&2_km.h^{-1}_] → unit in solution → unit: { expected: true }
		const oldQuestion: QuestionBase = {
			description: 'Calculer une vitesse moyenne.',
			enounces: [
				"Quelle est la vitesse moyenne d'une voiture parcourant $$[_{&2}*{&3}_km_]$$ en $$&3$$ ? (n'oublie pas l'unité)"
			],
			variabless: [{ '&1': '$e[2;9]*10 ', '&2': '[_&1_] km.h^{-1}', '&3': '$e[2;9] h' }],
			solutionss: [['[_&2_km.h^{-1}_]']],
			answerFields: ['\\text{La vitesse est de }$$...$$\\text{.}'],
			'result-type': 'decimal',
			defaultDelay: 20,
			grade: '4'
		};

		const result = transformQuestion(oldQuestion, 470);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];

		// Should have 1 blank with unit
		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(1);
		expect(variation.blanks![0].unit).toEqual({ expected: true });
	});

	it('should NOT add unit for fill-in expressions with visible units (globalIndex 426 pattern)', () => {
		// "&1 km = ? m" → unit is visible, student types a number, no unit field
		const oldQuestion: QuestionBase = {
			description: 'Convertir dans une autre unité',
			enounces: ['Complète.'],
			expressions: ['&1 km = ? m'],
			variabless: [{ '&1': '$e[1;9]' }],
			solutionss: [['[._&1*1000_]']],
			defaultDelay: 20,
			grade: '6'
		};

		const result = transformQuestion(oldQuestion, 426);

		expect(result.success).toBe(true);
		const variation = result.template!.variations[0];

		expect(variation.blanks).toBeDefined();
		expect(variation.blanks).toHaveLength(1);
		// No unit field — the unit is visible in the expression
		expect(variation.blanks![0].unit).toBeUndefined();
	});
});

// ============================================================================
// D. expressions2 (QCM)
// ============================================================================

describe('expressions2 QCM', () => {
	it('should create expression2 variable for QCM with expressions2 (globalIndex 478)', () => {
		const oldQuestion: QuestionBase = {
			description: "Vérifier l'égalité de deux expressions comportant des racines carrées",
			enounces: ['Ces 2 expressions sont-elles égales ?'],
			expressions: ['sqrt([_&1*&1*&2_])', 'sqrt([_&1*&1*&2_])'],
			expressions2: ['&1sqrt(&2)', '&1sqrt([_&2+(&3)_])'],
			variabless: [{ '&1': '$e[2;5]', '&2': '$e[2;4]', '&3': '$er[1;1]' }],
			choicess: [[{ text: 'Oui' }, { text: 'Non' }]],
			conditions: ['true', '&2+(&3) !=1'],
			solutionss: [[0], [1]],
			options: ['no-shuffle-choices'],
			defaultDelay: 20,
			grade: '2'
		};

		const result = transformQuestion(oldQuestion, 478);

		expect(result.success).toBe(true);
		const template = result.template!;

		// Should remain multiple_choice (choices are shared, so check shared)
		expect(template.shared?.choices).toBeDefined();
		expect(getQuestionType(template.shared!)).toBe('multiple_choice');

		// Each variation should have expression2 variable (from expressions2)
		for (const variation of template.variations) {
			const varNames = variation.variables?.map((v) => v.name) ?? [];
			expect(varNames).toContain('expression2');
		}

		// Statement of first variation should reference expression2
		const variation0 = template.variations[0];
		const statement = String(variation0.statement ?? template.shared?.statement ?? '');
		expect(statement).toContain('expression2');
	});

	it('should create expression2 for function parallels QCM (globalIndex 587)', () => {
		const oldQuestion: QuestionBase = {
			description:
				'Déterminer si deux fonctions affines ont des droites représentatives parallèles',
			enounces: ['Les droites représentatives de ces 2 fonctions affines sont-elles parallèles?'],
			expressions: ['f(x)=&1x[+_&2_]'],
			expressions2: [
				'g(x)=&1x[+_&3_]',
				'g(x)=&3[+_&1_]x',
				'g(x)=&3x[+_&2_]',
				'g(x)=&2[+_&3_]x',
				'g(x)=[_-(&1)_]x[+_&3_]',
				'g(x)=&3[+_-(&1)_]x'
			],
			variabless: [{ '&1': '$er[2;9]', '&2': '$e[1;9]\\{&1}', '&3': '$er[2;9]' }],
			choicess: [[{ text: 'parallèles' }, { text: '<b>non</b> parallèles' }]],
			options: ['no-shuffle-choices'],
			solutionss: [[0], [0], [1], [1], [1], [1]],
			defaultDelay: 10,
			grade: '3'
		};

		const result = transformQuestion(oldQuestion, 587);

		expect(result.success).toBe(true);
		const template = result.template!;

		// Should remain multiple_choice (choices are shared, so check shared)
		expect(template.shared?.choices).toBeDefined();
		expect(getQuestionType(template.shared!)).toBe('multiple_choice');

		// Should have expression2 variables (from expressions2)
		const allVars: string[] = [];
		for (const v of template.variations) {
			if (v.variables) allVars.push(...v.variables.map((vv) => vv.name));
		}
		if (template.shared?.variables) {
			allVars.push(...template.shared.variables.map((v) => v.name));
		}
		expect(allVars.some((n) => n.includes('expression') && n.includes('2'))).toBe(true);
	});
});

// ============================================================================
// E. Type removed from output
// ============================================================================

describe('Type removed from output', () => {
	it('should not include type field on template (behavior 12)', () => {
		const oldQuestion: QuestionBase = {
			description: 'Simple test',
			enounces: ['Calculer :'],
			expressions: ['&1 + &2'],
			variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]' }],
			solutionss: [['[_&1+&2_]']],
			defaultDelay: 30,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 500);
		expect(result.success).toBe(true);

		// Template should NOT have a type field
		expect('type' in result.template!).toBe(false);
	});

	it('should not include type for multiple_choice either', () => {
		const oldQuestion: QuestionBase = {
			description: 'QCM test',
			enounces: ['Choisis.'],
			expressions: ['&1 + &2'],
			variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
			choicess: [[{ text: 'A' }, { text: 'B' }]],
			solutionss: [[0]],
			defaultDelay: 20,
			grade: 'CE1'
		};

		const result = transformQuestion(oldQuestion, 501);
		expect(result.success).toBe(true);

		expect('type' in result.template!).toBe(false);
	});
});

// ============================================================================
// F. Fill-in with ? in expression (existing behavior, verify preserved)
// ============================================================================

describe('Fill-in with ? in expression', () => {
	it('should handle fill-in with ? in expression (globalIndex 51)', () => {
		// expressions: ["?+&1=10", "&1+?=10"], solutionss: [["[_10-&1_]"]]
		const oldQuestion: QuestionBase = {
			description: 'Trouver le complément',
			subdescription: 'Complément à 10',
			enounces: ['Complète.'],
			expressions: ['?+&1=10', '&1+?=10'],
			solutionss: [['[_10-&1_]']],
			variabless: [{ '&1': '$e[1;9]' }],
			defaultDelay: 20,
			grade: 'CP'
		};

		const result = transformQuestion(oldQuestion, 51);

		expect(result.success).toBe(true);
		const template = result.template!;

		expect('type' in template).toBe(false);
		expect(getQuestionType(template.variations[0])).toBe('fill_in_blanks');

		// Each variation should have 1 blank (1 ? per expression)
		for (const variation of template.variations) {
			expect(variation.blanks).toBeDefined();
			expect(variation.blanks).toHaveLength(1);
		}
	});
});
