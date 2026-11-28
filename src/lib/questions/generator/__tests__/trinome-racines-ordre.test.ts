/**
 * « Factoriser un trinôme à l'aide de ses racines » (604f83b7), variation « calculer les racines »
 * ==============================================================================================
 *
 * E34 (#1636) : la correction calcule x₁ = (−b − √Δ)/(2a) et x₂ = (−b + √Δ)/(2a), puis écrit
 * a(x − x₁)(x − x₂). Les facteurs suivent CET ordre : pour a < 0, x₁ est la plus grande racine.
 * Lit le fichier du dernier lot de ce modèle (celui de la prod).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { generateInstanceWithFixedVariables } from '../test-instance-builder';
import type { QuestionTemplate } from '../../types';

const LOT = join(process.cwd(), 'scripts/questions/1spe-factoriser-impossible/604f83b7.json');

function lastStep(variables: Record<string, string>): string {
	const template = JSON.parse(readFileSync(LOT, 'utf8')) as QuestionTemplate;
	const result = generateInstanceWithFixedVariables(template, variables, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return String(result.instance.correction?.steps?.at(-1) ?? '');
}

describe('604f83b7 variation 1 : a(x − x₁)(x − x₂) dans l’ordre de x₁, x₂', () => {
	it('a < 0 (−2x² + 2x + 24) : x₁ = 4, x₂ = −3, donc −2(x − 4)(x + 3)', () => {
		const step = lastStep({ a: '-2', r: '-3', s: '4', b: '2', c: '24' });
		expect(step).toMatch(/x - 4 \\right\) \\left\( x \+ 3/);
	});

	it('a > 0 (2x² − 6x − 20) : x₁ = −2, x₂ = 5, donc 2(x + 2)(x − 5)', () => {
		const step = lastStep({ a: '2', r: '-2', s: '5', b: '-6', c: '-20' });
		expect(step).toMatch(/x \+ 2 \\right\) \\left\( x - 5/);
	});
});
