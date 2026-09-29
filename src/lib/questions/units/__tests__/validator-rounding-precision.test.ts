/**
 * Grandeurs avec unité + `precision` decimal / significant / magnitude : la
 * précision était ignorée (comparaison exacte). Elle s'applique désormais,
 * avec la règle d'arrondi des nombres (cf. questions/rounding) : trop de
 * décimales → faux avec un message ; arrondi juste → juste.
 */

import { describe, it, expect } from 'vitest';
import { validateQuantityAnswer } from '../validator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { PrecisionType, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

const HUNDREDTH: PrecisionType = { type: 'decimal', digits: 2 };

describe('Grandeur arrondie au centième', () => {
	it('arrondi juste (3,14 m pour 3,14159 m) → juste', () => {
		expect(validateQuantityAnswer('3{,}14\\unit{m}', '3.14159\\unit{m}', HUNDREDTH).isCorrect).toBe(
			true
		);
	});

	it('valeur non arrondie → faux, « Arrondis au centième. »', () => {
		const result = validateQuantityAnswer('3{,}14159\\unit{m}', '3.14159\\unit{m}', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
	});

	it('mauvais arrondi (3,15 m) → faux, sans message d’arrondi', () => {
		const result = validateQuantityAnswer('3{,}15\\unit{m}', '3.14159\\unit{m}', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).not.toBe('Arrondis au centième.');
	});

	it('autre unité compatible : 314 cm pour 3,14159 m arrondi au centième → juste', () => {
		expect(validateQuantityAnswer('314\\unit{cm}', '3.14159\\unit{m}', HUNDREDTH).isCorrect).toBe(
			true
		);
	});

	it('moins de décimales, valeur exacte : 3,1 m pour 3,10 m → juste', () => {
		expect(validateQuantityAnswer('3{,}1\\unit{m}', '3.1\\unit{m}', HUNDREDTH).isCorrect).toBe(
			true
		);
	});
});

describe('Grandeur : chiffres significatifs et ordre de grandeur', () => {
	const TWO: PrecisionType = { type: 'significant', digits: 2 };

	it('1,2 km pour 1,234 km à 2 c.s. → juste ; 1,23 km → « Donne 2 chiffres significatifs. »', () => {
		expect(validateQuantityAnswer('1{,}2\\unit{km}', '1.234\\unit{km}', TWO).isCorrect).toBe(true);
		const result = validateQuantityAnswer('1{,}23\\unit{km}', '1.234\\unit{km}', TWO);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Donne 2 chiffres significatifs.');
	});

	it('ordre de grandeur (centaine) : 1 200 m pour 1 234 m → juste ; 1 300 m → faux', () => {
		const HUNDRED: PrecisionType = { type: 'magnitude', digits: 2 };
		expect(validateQuantityAnswer('1200\\unit{m}', '1234\\unit{m}', HUNDRED).isCorrect).toBe(true);
		expect(validateQuantityAnswer('1300\\unit{m}', '1234\\unit{m}', HUNDRED).isCorrect).toBe(false);
	});
});

describe('Case à unité + arrondi : le message arrive à l’élève', () => {
	it('validateAnswer rend « Arrondis au centième. »', () => {
		const instance: QuestionInstance = {
			templateId: 'test-unit-rounding',
			statement: 'Test' as ResolvedMarkdown,
			blanks: [
				{
					expectedAnswer: '3.14159\\unit{m}',
					type: 'math',
					unit: { expected: true },
					precision: HUNDREDTH
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			generatedAt: new Date().toISOString()
		};
		const result = validateAnswer(['3{,}14159\\unit{m}'], instance, ['3{,}14159\\unit{m}']);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
		expect(validateAnswer(['3{,}14\\unit{m}'], instance, ['3{,}14\\unit{m}']).isCorrect).toBe(true);
	});
});

// Autre unité : une valeur plus précise que l'arrondi demandé est refusée comme
// dans l'unité attendue, mais avec le message d'arrondi, pas « Valeur incorrecte ».
describe('Grandeur dans une autre unité, plus précise que demandé', () => {
	it.each([['3141{,}59\\unit{mm}'], ['314{,}2\\unit{cm}'], ['314{,}159\\unit{cm}']])(
		'%s pour 3,14159 m au centième → faux, « Arrondis au centième. »',
		(answer) => {
			const result = validateQuantityAnswer(answer, '3.14159\\unit{m}', HUNDREDTH);
			expect(result.isCorrect).toBe(false);
			expect(result.feedback).toBe('Arrondis au centième.');
		}
	);

	it('valeur fausse dans une autre unité (3150 mm) → faux, sans message d’arrondi', () => {
		const result = validateQuantityAnswer('3150\\unit{mm}', '3.14159\\unit{m}', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).not.toBe('Arrondis au centième.');
	});
});
