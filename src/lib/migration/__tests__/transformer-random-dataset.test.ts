/**
 * Tirages de vraies questions TinyMath, de bout en bout
 * =====================================================
 *
 * Transformation puis 30 tirages : chaque tirage doit réussir ET respecter la
 * contrainte d'origine (ce que TinyMath garantissait).
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

function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Valeurs des variables sur 30 tirages de la première variation */
function drawVariables(index: number): Record<string, number>[] {
	const result = transformQuestion(questions[index], index);
	expect(result.success).toBe(true);
	const template = { ...result.template!, id: 't' } as QuestionTemplate;
	const single = { ...template, variations: [template.variations[0]] };
	return Array.from({ length: 30 }, (_, i) => {
		const generated = generateInstance(single, i + 1);
		expect(generated.success, JSON.stringify(generated)).toBe(true);
		if (!generated.success) return {};
		return Object.fromEntries(
			(generated.instance.resolvedVariables ?? []).map((v) => [v.name, Number(v.value)])
		);
	});
}

describe('tirages TinyMath réels', () => {
	it('#378 `$e[2;19]\\{cd(&1);cd(&2)}` : c premier avec a et avec b', () => {
		const draws = drawVariables(378);
		expect(draws.every(({ a, b, c }) => gcd(a, c) === 1 && gcd(b, c) === 1)).toBe(true);
	});

	it('#372 `$e[2;9]\\{cd&1}` (sans parenthèses) : b premier avec a', () => {
		const draws = drawVariables(372);
		expect(draws.every(({ a, b }) => gcd(a, b) === 1)).toBe(true);
	});

	it('#107 `$e[1;9-&1]` : 1 ≤ b ≤ 9 − a', () => {
		const draws = drawVariables(107);
		expect(draws.every(({ a, b }) => b >= 1 && b <= 9 - a)).toBe(true);
		expect(new Set(draws.map(({ b }) => b)).size).toBeGreaterThan(3);
	});

	it('#100 `$e[&2+1;9]` : b + 1 ≤ c ≤ 9', () => {
		const draws = drawVariables(100);
		expect(draws.every(({ b, c }) => c >= b + 1 && c <= 9)).toBe(true);
	});
});
