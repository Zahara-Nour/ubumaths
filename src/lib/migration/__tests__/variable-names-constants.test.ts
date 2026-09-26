/**
 * Noms de variables : jamais `e` ni `i`
 * =====================================
 *
 * L'évaluateur lit `e` comme la constante d'Euler et `i` comme l'unité
 * imaginaire. Avant : la 5ᵉ variable TinyMath (&5) s'appelait `e` → réponses
 * attendues fausses sans erreur (80 questions, dont 9 relues par David), et
 * `10^e` bouclait (#47).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { numberToLetterName, transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('numberToLetterName', () => {
	it.each([
		[1, 'a'],
		[4, 'd'],
		[5, 'f'],
		[8, 'j'],
		[24, 'z'],
		[25, 'aa']
	])('%i → %s', (num, name) => {
		expect(numberToLetterName(num)).toBe(name);
	});

	it('aucun nom n’est e ni i, ni n’en contient', () => {
		for (let n = 1; n <= 700; n++) expect(numberToLetterName(n)).not.toMatch(/[ei]/);
	});
});

describe('#47 `[_&1*1000+…_] + [_&6*10^&5_]` (5ᵉ variable en exposant)', () => {
	it('génère sans boucler et attend la bonne somme', () => {
		const result = transformQuestion(questions[47], 47);
		const template = { ...result.template!, id: 't' } as QuestionTemplate;
		for (let seed = 1; seed <= 20; seed++) {
			const generated = generateInstance(template, seed);
			expect(generated.success, JSON.stringify(generated)).toBe(true);
			if (!generated.success) continue;
			const v = Object.fromEntries(
				generated.instance.resolvedVariables!.map((x) => [x.name, Number(x.value)])
			);
			// a,b,c,d,f,g = &1..&6 : &1*1000+&2*100+&3*10+&4 + &6*10^&5
			const expected = v.a * 1000 + v.b * 100 + v.c * 10 + v.d + v.g * 10 ** v.f;
			expect(Number(generated.instance.blanks![0].expectedAnswer)).toBe(expected);
		}
	});
});
