/**
 * Marquage « Espaces dès 4 chiffres » (lib/marquage-espaces.ts) : sélection par la
 * règle, marquage de la colonne `options`, specs des brouillons de lycée corrigées
 * à la règle du BIPM.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { QuestionTemplate, TestSpec } from '../../../src/lib/questions/types';
import { checkTemplate } from '../../../src/lib/questions/review/check-template';
import {
	alreadyDone,
	bipmTestSpecs,
	LYCEE_DRAFT_IDS,
	markSchoolRule,
	needsSchoolRule,
	SCHOOL_RULE_IDS,
	selectionGap,
	specNeedsSchoolRule
} from '../lib/marquage-espaces';

// ============================================================================
// HELPERS
// ============================================================================

function spec(answers: string[], expected: TestSpec['expected']): TestSpec {
	return { description: 'spec', variables: {}, answers, expected };
}

const SPACES = { status: 'unoptimal_form', constraintViolations: ['spaces'] } as const;

function template(testSpecs: TestSpec[], options?: QuestionTemplate['options']): QuestionTemplate {
	return {
		id: 'id',
		title: 'modèle',
		variations: [{ question: 'q' }],
		testSpecs,
		options
	} as QuestionTemplate;
}

// ============================================================================
// TESTS
// ============================================================================

describe('sélection : specs que seule la règle de l’école rend vraies', () => {
	it('4 chiffres sans espace, remarque attendue → règle de l’école nécessaire', () => {
		expect(specNeedsSchoolRule(spec(['7900'], { ...SPACES }))).toBe(true);
		expect(specNeedsSchoolRule(spec(['1159{,}27'], { ...SPACES }))).toBe(true);
	});

	it('5 chiffres ou plus : le BIPM remarque déjà, rien à marquer', () => {
		expect(specNeedsSchoolRule(spec(['30000'], { ...SPACES }))).toBe(false);
	});

	it('spec qui n’attend pas la remarque, ou réponse déjà espacée : rien à marquer', () => {
		expect(specNeedsSchoolRule(spec(['7900'], { status: 'correct' }))).toBe(false);
		expect(specNeedsSchoolRule(spec(['7 900'], { ...SPACES }))).toBe(false);
	});

	it('un modèle en a besoin dès qu’une de ses specs en a besoin', () => {
		const specs = [spec(['30000'], { ...SPACES }), spec(['7900'], { ...SPACES })];
		expect(needsSchoolRule(template(specs))).toBe(true);
		expect(needsSchoolRule(template([specs[0]]))).toBe(false);
	});

	it('écart entre la liste figée et la sélection', () => {
		expect(selectionGap(['a', 'b'], ['b', 'c'])).toEqual({ missing: ['a'], unexpected: ['c'] });
		expect(selectionGap(['a'], ['a'])).toEqual({ missing: [], unexpected: [] });
	});

	it('listes figées : 51 modèles à marquer, 5 brouillons de lycée, sans doublon ni recouvrement', () => {
		expect(SCHOOL_RULE_IDS).toHaveLength(51);
		expect(LYCEE_DRAFT_IDS).toHaveLength(5);
		const all = [...SCHOOL_RULE_IDS, ...LYCEE_DRAFT_IDS];
		expect(new Set(all).size).toBe(all.length);
	});
});

describe('marquage (colonne options)', () => {
	it('preuve sur un modèle réel : specs rouges sans le réglage, vertes avec', () => {
		// Modèle du corpus relu, marqué au lot 4d PR 1 : on retire le réglage
		const file = JSON.parse(readFileSync('data/relecture/grandeurs/426.json', 'utf-8')) as {
			template: QuestionTemplate;
		};
		const { spacesFromFourDigits: _s, ...constraints } = file.template.options?.constraints ?? {};
		const bare = { ...file.template, options: { ...file.template.options, constraints } };
		expect(needsSchoolRule(bare)).toBe(true);
		expect(checkTemplate(bare, { instances: 2 }).passed).toBe(false);
		expect(checkTemplate(markSchoolRule(bare), { instances: 2 }).reasons).toEqual([]);
	});

	it('ajoute le réglage sans toucher aux autres contraintes ni aux specs', () => {
		const before = template([spec(['7900'], { ...SPACES })], {
			constraints: { allowBracketsInFirstNegativeTerm: true }
		});
		const after = markSchoolRule(before);
		expect(after.options?.constraints).toEqual({
			allowBracketsInFirstNegativeTerm: true,
			spacesFromFourDigits: true
		});
		expect(after.testSpecs).toBe(before.testSpecs);
	});

	it('un modèle déjà marqué est refusé, et compte comme déjà traité à la relance', () => {
		const marked = template([spec(['7900'], { ...SPACES })], {
			constraints: { spacesFromFourDigits: true }
		});
		expect(() => markSchoolRule(marked)).toThrow(/déjà marqué/);
		expect(alreadyDone(marked, 'marquage')).toBe(true);
		expect(alreadyDone(template([spec(['7900'], { ...SPACES })]), 'marquage')).toBe(false);
	});
});

describe('specs des brouillons de lycée (règle du BIPM)', () => {
	it('la réponse de 4 chiffres devient juste ; les autres specs restent intactes', () => {
		const other = spec(['30000'], { ...SPACES });
		const after = bipmTestSpecs(template([spec(['1159{,}27'], { ...SPACES }), other]));
		expect(after.testSpecs?.[0].expected).toEqual({ status: 'correct' });
		expect(after.testSpecs?.[0].description).toBe(
			'1159,27 sans espace : accepté (espace exigée dès 5 chiffres)'
		);
		expect(after.testSpecs?.[1]).toBe(other);
	});

	it('une autre remarque attendue est gardée, avec son statut', () => {
		const after = bipmTestSpecs(
			template([
				spec(['7900'], { status: 'unoptimal_form', constraintViolations: ['spaces', 'zeros'] })
			])
		);
		expect(after.testSpecs?.[0].expected).toEqual({
			status: 'unoptimal_form',
			constraintViolations: ['zeros']
		});
	});

	it('une spec dont une autre réponse reste remarquée au BIPM est refusée', () => {
		const mixed = template([spec(['7900', '30000'], { ...SPACES })]);
		expect(() => bipmTestSpecs(mixed)).toThrow(/reste remarquée au BIPM/);
	});

	it('la description ne cite que les réponses concernées', () => {
		const after = bipmTestSpecs(template([spec(['7 900', '7900'], { ...SPACES })]));
		expect(after.testSpecs?.[0].description).toBe(
			'7900 sans espace : accepté (espace exigée dès 5 chiffres)'
		);
	});

	it('un brouillon corrigé compte comme déjà traité à la relance', () => {
		const before = template([spec(['5050'], { ...SPACES })]);
		expect(alreadyDone(before, 'specs')).toBe(false);
		expect(alreadyDone(bipmTestSpecs(before), 'specs')).toBe(true);
	});

	it('un modèle sans spec à corriger est refusé', () => {
		expect(() => bipmTestSpecs(template([spec(['30000'], { ...SPACES })]))).toThrow();
	});
});
