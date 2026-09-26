/**
 * Exclusions TinyMath `\{…}` après un tirage relatif, une liste ou un nombre à n chiffres
 * ======================================================================================
 *
 * `$er[2;9]\{cd(&1);cd(&2)}` restait `2..9;+-\{cd(a);cd(b)}` : le générateur ignorait
 * l'exclusion (#381 : 6/4 apparaissait). Même perte pour `$l{x;y;z}\{&3}` et
 * `$e{&1;&1}\{m10}`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { resolveVariables } from '$lib/ubumark/parameterization/resolver/variable-resolver';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

/** Variables tirées sur `seeds` graines (première variation) */
function draws(index: number, seeds = 40): Record<string, string>[] {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	const single = { ...template, variations: [template.variations[0]] } as QuestionTemplate;
	return Array.from({ length: seeds }, (_, seed) => {
		const generated = generateInstance(single, seed + 1);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		return Object.fromEntries(generated.instance.resolvedVariables.map((v) => [v.name, v.value]));
	});
}

const gcd = (x: number, y: number): number => (y === 0 ? Math.abs(x) : gcd(y, x % y));

describe('exclusions', () => {
	it('#381 : relatif sans diviseur commun avec a et b', () => {
		for (const v of draws(381)) {
			const [a, b, c, d] = [v.a, v.b, v.c, v.d].map(Number);
			expect(gcd(c, a)).toBe(1);
			expect(gcd(c, b)).toBe(1);
			expect(gcd(d, a)).toBe(1);
			expect(Math.abs(c)).toBeGreaterThanOrEqual(2);
		}
	});

	it('#532 : relatif différent de a et de -a (variables seules)', () => {
		// La question entière dépend d'un autre défaut (calcul avec une lettre tirée)
		const template = transformQuestion(questions[532], 532).template!;
		const variables = (template.shared?.variables ?? []).filter((v) =>
			['a', 'b', 'c'].includes(v.name)
		);
		for (let seed = 1; seed <= 40; seed++) {
			const v = Object.fromEntries(
				resolveVariables(variables, seed).map((r) => [r.name, Number(r.value)])
			);
			expect(Math.abs(v.b)).not.toBe(v.a);
			expect(Math.abs(v.c)).not.toBe(v.a);
			expect(Math.abs(v.c)).not.toBe(Math.abs(v.b));
		}
	});

	it('#537 : liste x|y|z privée de la lettre déjà tirée', () => {
		for (const v of draws(537)) {
			expect(['x', 'y', 'z']).toContain(v.d);
			expect(v.d).not.toBe(v.c);
		}
	});

	it('#266 : nombre à a chiffres, pas multiple de 10', () => {
		for (const v of draws(266)) {
			expect(v.c).toHaveLength(Number(v.a));
			expect(Number(v.c) % 10).not.toBe(0);
		}
	});
});
