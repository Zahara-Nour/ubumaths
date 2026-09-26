/**
 * Défauts de conversion relevés en préparant le lot Entiers
 * ========================================================
 *
 * - `mod(a+b;3)` hors calcul `[_…_]` gardait le `;` TinyMath (#214, #215) ;
 * - exclusion calculée après un nombre à 1 chiffre (`$e{1}\{&1;[_10-&1_]}`) mal convertie (#90) ;
 * - liste tirée dans un calcul (`$l{1;4;7}+2-mod(…)`) non éclatée (#216) ;
 * - expression à plusieurs cases sans format de réponse (`(&1*?)+?`) : une seule case comptée (#219).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

/** Instances de chaque variation sur `seeds` graines ; échec = erreur */
function instances(index: number, seeds = 20): QuestionInstance[] {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	return template.variations.flatMap((variation) =>
		Array.from({ length: seeds }, (_, seed) => {
			const single = { ...template, variations: [variation] } as QuestionTemplate;
			const generated = generateInstance(single, seed + 1);
			if (!generated.success) throw new Error(generated.errors.join(' ; '));
			return generated.instance;
		})
	);
}

const valuesOf = (instance: QuestionInstance) =>
	Object.fromEntries(instance.resolvedVariables.map((v) => [v.name, Number(v.value)]));

describe('lot Entiers', () => {
	it('#214 : le dernier chiffre rend le nombre divisible par 3 ou non (mod converti)', () => {
		for (const instance of instances(214)) {
			const v = valuesOf(instance);
			expect(Number.isInteger(v.f)).toBe(true);
		}
	});

	it('#90 : c différent de a, 10-a, b et 10-b', () => {
		for (const instance of instances(90)) {
			const v = valuesOf(instance);
			expect([v.a, 10 - v.a, v.b, 10 - v.b]).not.toContain(v.c);
		}
	});

	it('#216 : nombre à trois chiffres dans toutes les variations', () => {
		for (const instance of instances(216)) {
			expect(String(valuesOf(instance).d)).toMatch(/^[1-9]\d\d$/);
		}
	});

	it('#219 : deux cases, quotient et reste', () => {
		for (const instance of instances(219)) {
			expect(instance.blanks).toHaveLength(2);
		}
	});
});
