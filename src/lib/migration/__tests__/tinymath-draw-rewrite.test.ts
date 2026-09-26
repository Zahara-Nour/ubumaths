/**
 * Tirages TinyMath particuliers, réécrits en tirages ordinaires
 * =============================================================
 *
 * - `-$e[1;9]` : un entier de -9 à -1 (devenait la plage -1..9, #342) ;
 * - `$er{1}` : un relatif à 1 chiffre, ±1..±9 (devenait ±1 seulement, #315) ;
 * - `$e{5}\{m(10)}` : 5 chiffres, pas multiple de 10 (l'exclusion était
 *   IGNORÉE en silence).
 */

import { describe, it, expect } from 'vitest';
import { rewriteTinyMathDraw } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionBase } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

describe('rewriteTinyMathDraw', () => {
	it.each([
		['-$e[1;9]', '$e[-9;-1]'],
		['-$e[2;&1]', '$e[-(&1);-2]'],
		['$er{1}', '$er[1;9]'],
		['$er{2}', '$er[10;99]'],
		['$e{5}\\{m(10)}', '$e[10000;99999]\\{m(10)}'],
		['$e{2}\\{&1}', '$e[10;99]\\{&1}'],
		// Inchangés
		['$e[1;9]', '$e[1;9]'],
		['$e{2}', '$e{2}'],
		['$e{&1;&2}\\{m(10)}', '$e{&1;&2}\\{m(10)}'],
		['&1-$e[1;9]', '&1-$e[1;9]']
	])('%s → %s', (input, expected) => {
		expect(rewriteTinyMathDraw(input)).toBe(expected);
	});
});

function valuesOf(variables: Record<string, string>): number[] {
	const question = {
		description: 'Tirage',
		enounces: ['Calcule.'],
		expressions: ['&1'],
		variabless: [variables],
		defaultDelay: 10,
		grade: '5',
		_migration: { theme: 'T', domain: 'D', subdomain: 'S', level: 0, globalIndex: 0 }
	} as unknown as QuestionBase;
	const template = { ...transformQuestion(question, 0).template!, id: 't' } as QuestionTemplate;
	return Array.from({ length: 200 }, (_, i) => {
		const generated = generateInstance(template, i + 1);
		if (!generated.success) throw new Error(generated.errors.join());
		return Number(generated.instance.resolvedVariables![0].value);
	});
}

describe('de bout en bout (200 tirages)', () => {
	it('-$e[1;9] : toujours entre -9 et -1', () => {
		const values = valuesOf({ '&1': '-$e[1;9]' });
		expect(values.every((v) => v >= -9 && v <= -1)).toBe(true);
		expect(new Set(values).size).toBeGreaterThan(5);
	});

	it('$er{1} : relatif à un chiffre non nul, des deux signes', () => {
		const values = valuesOf({ '&1': '$er{1}' });
		expect(values.every((v) => Math.abs(v) >= 1 && Math.abs(v) <= 9)).toBe(true);
		expect(values.some((v) => Math.abs(v) > 1)).toBe(true);
		expect(values.some((v) => v < 0) && values.some((v) => v > 0)).toBe(true);
	});

	it('$e{3}\\{m(10)} : trois chiffres, jamais multiple de 10', () => {
		const values = valuesOf({ '&1': '$e{3}\\{m(10)}' });
		expect(values.every((v) => v >= 100 && v <= 999 && v % 10 !== 0)).toBe(true);
	});
});
