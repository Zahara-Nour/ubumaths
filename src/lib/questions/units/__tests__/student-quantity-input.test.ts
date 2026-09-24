/**
 * Saisie d'une grandeur par un élève (champ MathLive)
 * ===================================================
 *
 * Les chaînes ci-dessous ont été MESURÉES le 2026-09-24 : c'est ce que MathLive
 * produit réellement pour les frappes indiquées (math-field par défaut). Aucun
 * champ élève ne sait produire `\unit{...}` : sans normalisation, toute unité
 * tapée par un élève était perdue en silence (`5km` → 5, sans dimension).
 *
 * `normalizeStudentQuantity` ramène la saisie à la forme canonique
 * `valeur\unit{écriture}` ; c'est ensuite `parseLatexQuantity` qui décide.
 */

import { describe, it, expect } from 'vitest';
import { normalizeStudentQuantity } from '../student-input';
import { parseLatexQuantity } from '../parser';
import { validateQuantityAnswer } from '../validator';
import { checkUnit } from '../../constraint-validators';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance, InstanceBlank } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Vérifie que la saisie élève se lit exactement comme la forme canonique :
 * même valeur, mêmes composantes, même coefficient.
 */
function expectReadsAs(studentLatex: string, canonical: string, value: number): void {
	const normalized = normalizeStudentQuantity(studentLatex);
	expect(normalized).toBe(canonical);

	const parsed = parseLatexQuantity(normalized);
	const reference = parseLatexQuantity(canonical);
	expect(reference).not.toBeNull();
	expect(parsed).not.toBeNull();
	expect(parsed?.value).toBeCloseTo(value, 10);
	expect(parsed?.unit.coefficient).toBeCloseTo(reference?.unit.coefficient ?? NaN, 12);
	expect(Object.fromEntries(parsed?.unit.components ?? [])).toEqual(
		Object.fromEntries(reference?.unit.components ?? [])
	);
	// La grandeur lue n'est jamais sans dimension quand une unité a été tapée
	expect(parsed?.unit.components.size).toBeGreaterThan(0);
}

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-student-quantity',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

// ============================================================================
// 1. CHAÎNES MESURÉES DANS MATHLIVE
// ============================================================================

describe('normalizeStudentQuantity — chaînes MathLive mesurées', () => {
	it('5 km → 5\\operatorname{\\mathrm{km}}', () => {
		expectReadsAs('5\\operatorname{\\mathrm{km}}', '5\\unit{km}', 5);
	});

	it('90 km/h → \\frac{90\\operatorname{\\mathrm{km}}}{h} (le nombre est DANS le numérateur)', () => {
		expectReadsAs('\\frac{90\\operatorname{\\mathrm{km}}}{h}', '90\\unit{km/h}', 90);
	});

	it('3 m/s → \\frac{3m}{s}', () => {
		expectReadsAs('\\frac{3m}{s}', '3\\unit{m/s}', 3);
	});

	it('20 °C → 20\\degree C', () => {
		expectReadsAs('20\\degree C', '20\\unit{°C}', 20);
	});

	it('12,5 kg → 12,5\\operatorname{\\mathrm{kg}}', () => {
		expectReadsAs('12,5\\operatorname{\\mathrm{kg}}', '12,5\\unit{kg}', 12.5);
	});

	it('5 min → 5\\min (fonction min de MathLive)', () => {
		expectReadsAs('5\\min', '5\\unit{min}', 5);
	});

	it.each([
		['2h', '2\\unit{h}', 2],
		['4L', '4\\unit{L}', 4],
		['8mL', '8\\unit{mL}', 8],
		['3m', '3\\unit{m}', 3],
		['7g', '7\\unit{g}', 7]
	])('lettres collées : %s', (student, canonical, value) => {
		expectReadsAs(student, canonical, value);
	});

	it('5ms reste la MILLISECONDE (jamais m·s)', () => {
		expectReadsAs('5ms', '5\\unit{ms}', 5);
		const parsed = parseLatexQuantity(normalizeStudentQuantity('5ms'));
		expect(Object.fromEntries(parsed?.unit.components ?? [])).toEqual({ s: 1 });
		expect(parsed?.unit.coefficient).toBeCloseTo(0.001, 12);
	});

	it('5 cm^2 → 5\\operatorname{\\mathrm{cm}}^2', () => {
		expectReadsAs('5\\operatorname{\\mathrm{cm}}^2', '5\\unit{cm^2}', 5);
	});

	it('3 m.s^-1 → 3m.s^{-1}', () => {
		expectReadsAs('3m.s^{-1}', '3\\unit{m.s^{-1}}', 3);
	});

	it('km/h lu comme m·s⁻¹ avec le coefficient 1000/3600', () => {
		const parsed = parseLatexQuantity(
			normalizeStudentQuantity('\\frac{90\\operatorname{\\mathrm{km}}}{h}')
		);
		expect(Object.fromEntries(parsed?.unit.components ?? [])).toEqual({ m: 1, s: -1 });
		expect(parsed?.unit.coefficient).toBeCloseTo(1000 / 3600, 10);
	});
});

// ============================================================================
// 2. AUTRES ÉCRITURES ADMISES
// ============================================================================

describe('normalizeStudentQuantity — autres écritures', () => {
	it('la forme canonique 5\\unit{km} est laissée telle quelle', () => {
		expect(normalizeStudentQuantity('5\\unit{km}')).toBe('5\\unit{km}');
	});

	it.each([
		['5\\,\\mathrm{km}'],
		['5\\text{ km}'],
		['5\\text{km}'],
		['5~km'],
		['5\\ km'],
		['5 km']
	])('espacements et habillages : %s', (student) => {
		expectReadsAs(student, '5\\unit{km}', 5);
	});

	it('notation scientifique : 5\\cdot10^{3}m', () => {
		expectReadsAs('5\\cdot10^{3}m', '5\\cdot10^{3}\\unit{m}', 5000);
	});

	it('produit en \\cdot : 3m\\cdot s^{-1}', () => {
		expectReadsAs('3m\\cdot s^{-1}', '3\\unit{m.s^{-1}}', 3);
	});

	it('produit en \\times : 3m\\times s^{-1}', () => {
		expectReadsAs('3m\\times s^{-1}', '3\\unit{m.s^{-1}}', 3);
	});

	it.each([['20^{\\circ}C'], ['20^\\circ C'], ['20°C'], ['20\\degree C']])(
		'degré Celsius : %s',
		(student) => {
			expectReadsAs(student, '20\\unit{°C}', 20);
		}
	);

	it('virgule décimale en accolades : 12{,}5\\operatorname{\\mathrm{kg}}', () => {
		expectReadsAs('12{,}5\\operatorname{\\mathrm{kg}}', '12,5\\unit{kg}', 12.5);
	});

	it('signe moins : -5\\operatorname{\\mathrm{km}}', () => {
		expectReadsAs('-5\\operatorname{\\mathrm{km}}', '-5\\unit{km}', -5);
	});

	it('nombre suivi d’une fraction d’unités : 3\\frac{m}{s}', () => {
		expectReadsAs('3\\frac{m}{s}', '3\\unit{m/s}', 3);
	});

	it('sans unité : 5 reste sans dimension', () => {
		expect(normalizeStudentQuantity('5')).toBe('5');
		const parsed = parseLatexQuantity(normalizeStudentQuantity('5'));
		expect(parsed?.value).toBe(5);
		expect(parsed?.unit.components.size).toBe(0);
	});

	it('lettres qui ne forment pas une unité connue : 5xyz → null (rien n’est deviné)', () => {
		expect(parseLatexQuantity(normalizeStudentQuantity('5xyz'))).toBeNull();
	});

	it('espace à l’intérieur de l’unité : 5\\text{m s} → null (règle de notation)', () => {
		expect(parseLatexQuantity(normalizeStudentQuantity('5\\text{m s}'))).toBeNull();
	});
});

// ============================================================================
// 3. VALIDATION DE BOUT EN BOUT
// ============================================================================

describe('validateQuantityAnswer — saisie élève réelle', () => {
	it('\\frac{90\\operatorname{\\mathrm{km}}}{h} est correct pour 90 km/h', () => {
		const result = validateQuantityAnswer(
			'\\frac{90\\operatorname{\\mathrm{km}}}{h}',
			'90\\unit{km/h}'
		);
		expect(result.isCorrect).toBe(true);
	});

	it('5\\operatorname{\\mathrm{km}} est correct pour 5000 m (conversion)', () => {
		const result = validateQuantityAnswer('5\\operatorname{\\mathrm{km}}', '5000\\unit{m}');
		expect(result.isCorrect).toBe(true);
	});

	it('5ms contre 5 m/s : unités incompatibles (la milliseconde reste une milliseconde)', () => {
		const result = validateQuantityAnswer('5ms', '5\\unit{m/s}');
		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units');
		// Une durée a bien été lue (et non une grandeur sans dimension)
		expect(result.parsed?.unit).toBe('s');
	});

	it('5xyz : réponse invalide', () => {
		const result = validateQuantityAnswer('5xyz', '5\\unit{km}');
		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	it('requiredUnit : 5\\operatorname{\\mathrm{km}} refusé quand m est exigé', () => {
		const result = validateQuantityAnswer(
			'5\\operatorname{\\mathrm{km}}',
			'5000\\unit{m}',
			undefined,
			'm'
		);
		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});
});

describe('checkUnit — saisie élève réelle', () => {
	it('5\\operatorname{\\mathrm{m}} contre 5\\unit{m} : même unité, aucune violation', () => {
		expect(checkUnit(['5\\operatorname{\\mathrm{m}}'], ['5\\unit{m}'])).toEqual([]);
	});

	it('5\\operatorname{\\mathrm{km}} contre 5000\\unit{m} : unité différente signalée', () => {
		expect(checkUnit(['5\\operatorname{\\mathrm{km}}'], ['5000\\unit{m}'])).toEqual([0]);
	});

	it('5\\operatorname{\\mathrm{km}} contre 5\\unit{km} : même unité, aucune violation', () => {
		expect(checkUnit(['5\\operatorname{\\mathrm{km}}'], ['5\\unit{km}'])).toEqual([]);
	});

	it('attendu sans unité : la saisie n’est pas réinterprétée (5km contre 5)', () => {
		expect(checkUnit(['5km'], ['5'])).toEqual([]);
	});
});

describe('validateAnswer — trou à unité (pipeline complet)', () => {
	it('\\frac{90\\operatorname{\\mathrm{km}}}{h} correct pour 90 km/h', () => {
		const instance = createInstance([
			{ expectedAnswer: '90\\unit{km/h}', type: 'math', unit: { expected: true } }
		]);
		const latex = '\\frac{90\\operatorname{\\mathrm{km}}}{h}';
		const result = validateAnswer([latex], instance, [latex]);
		expect(result.isCorrect).toBe(true);
	});

	it('3m.s^{-1} correct pour 3 m·s⁻¹ (exposant en accolades)', () => {
		const instance = createInstance([
			{ expectedAnswer: '3\\unit{m.s^{-1}}', type: 'math', unit: { expected: true } }
		]);
		const latex = '3m.s^{-1}';
		const result = validateAnswer([latex], instance, [latex]);
		expect(result.isCorrect).toBe(true);
	});

	it('trou algébrique (sans unité) : 5km reste le produit 5·k·m', () => {
		// Chemin non-unité inchangé : 5km n'est pas la grandeur 5 km, donc ≠ 5
		const instance = createInstance([{ expectedAnswer: '5', type: 'math' }]);
		const result = validateAnswer(['5km'], instance, ['5km']);
		expect(result.isCorrect).toBe(false);
	});
});
