/**
 * Défauts de conversion relevés sur le lot Fractions (#355-#388)
 * =============================================================
 *
 * - `pgcd(a;b)` dans un calcul `[_…_]` restait brut (« free variables: p, ; », #371, #373, #388) ;
 * - une variable mêlant texte et calcul (`&4/[_&3*&1_]`) devenait `d/eval:c*a` (#377) ;
 * - `10^$e[1;2]` (10 ou 100) devenait `{{eval:10^1}}..2` (#355, #359) ;
 * - `\dfrac{{{a}}\textcolor{…}{…}}` : l'accolade LaTeX était prise pour un marqueur (#385, #387).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertTinyCASToNew, rewriteTinyMathDraw } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function generatesAll(index: number, seeds = 15): string[] {
	const result = transformQuestion(questions[index], index);
	const template = { ...result.template!, id: 't' } as QuestionTemplate;
	const errors: string[] = [];
	template.variations.forEach((variation, v) => {
		for (let seed = 1; seed <= seeds; seed++) {
			const generated = generateInstance({ ...template, variations: [variation] }, seed);
			if (!generated.success) errors.push(`v${v} s${seed}: ${generated.errors[0].slice(0, 80)}`);
		}
	});
	return errors;
}

describe('conversion', () => {
	it('pgcd dans un calcul → gcd', () => {
		expect(convertTinyCASToNew('[_&3*pgcd(&1;&2)_]').converted).toBe('{{eval:c*gcd(a,b)}}');
	});

	it('puissance de 10 à exposant tiré → liste', () => {
		expect(rewriteTinyMathDraw('10^$e[1;2]')).toBe('$l{10;100}');
		expect(rewriteTinyMathDraw('10^$e[0;3]')).toBe('$l{1;10;100;1000}');
	});
});

describe('vraies questions : génèrent sur toutes leurs variations', () => {
	it.each([355, 359, 371, 373, 377, 385, 387, 388])('#%i', (index) => {
		expect(generatesAll(index)).toEqual([]);
	});
});

describe('#377 « Quelle est la plus petite de ces 2 fractions ? »', () => {
	it('le bon choix est bien la plus petite fraction', () => {
		const template = {
			...transformQuestion(questions[377], 377).template!,
			id: 't'
		} as QuestionTemplate;
		for (let seed = 1; seed <= 20; seed++) {
			const generated = generateInstance(
				{ ...template, variations: [template.variations[0]] },
				seed
			);
			if (!generated.success) throw new Error(generated.errors.join());
			const v = Object.fromEntries(
				generated.instance.resolvedVariables!.map((x) => [x.name, x.value])
			);
			const [fb, fc] = String(v.f).split('/').map(Number);
			const [gd, ge] = String(v.g).split('/').map(Number);
			const smaller = fb / fc < gd / ge ? '0' : '1';
			expect(generated.instance.correctChoiceIndex).toEqual([smaller]);
		}
	});
});
