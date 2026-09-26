/**
 * Tirage composé TinyMath : `$e[1;9]*10+$e[1;9]`, `$e[1;5]*10`, `2*$e{3}`
 * ======================================================================
 *
 * Converti tel quel, `1..9*10+1..9` tirait des décimaux (#354 : `\dfrac{1.1}{100}`),
 * `$e[1;5]*10` devenait `1..50` et `2*$e{3}` ne générait plus. Chaque tirage devient
 * une variable auxiliaire, la variable d'origine le calcul qui les combine.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

/** Valeurs tirées d'une variable sur `seeds` graines (première variation) */
function drawn(index: number, name: string, seeds = 40): string[] {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	const single = { ...template, variations: [template.variations[0]] } as QuestionTemplate;
	return Array.from({ length: seeds }, (_, seed) => {
		const generated = generateInstance(single, seed + 1);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		return generated.instance.resolvedVariables.find((v) => v.name === name)!.value;
	});
}

describe('tirage composé', () => {
	it('#354 : $e[1;9]*10+$e[1;9] → entier de 11 à 99 sans zéro', () => {
		for (const value of drawn(354, 'a')) {
			expect(value).toMatch(/^[1-9][1-9]$/);
		}
	});

	it('#358 : $e[1;9]*100+$e[0;9]*10+$e[1;9] → entier à 3 chiffres', () => {
		for (const value of drawn(358, 'a')) {
			expect(value).toMatch(/^[1-9][0-9][1-9]$/);
		}
	});

	it('#75 : $e[1;5]*10 → 10, 20, 30, 40 ou 50', () => {
		const values = new Set(drawn(75, 'a'));
		expect([...values].every((v) => ['10', '20', '30', '40', '50'].includes(v))).toBe(true);
		expect(values.size).toBeGreaterThan(2);
	});

	it('#211 : 2*$e{3} → le double d’un nombre à 3 chiffres', () => {
		for (const value of drawn(211, 'a')) {
			const n = Number(value);
			expect(n % 2).toBe(0);
			expect(n).toBeGreaterThanOrEqual(200);
			expect(n).toBeLessThanOrEqual(1998);
		}
	});

	it('#23 : &1*1000+&2*100+&3*10+$e[0;9] génère un entier', () => {
		for (const value of drawn(23, 'h', 15)) {
			expect(value).toMatch(/^\d+$/);
		}
	});
});
