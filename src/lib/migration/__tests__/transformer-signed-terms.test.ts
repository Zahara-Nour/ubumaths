/**
 * Termes signés TinyMath : `[+_x_]` et `[(_x_]`
 * =============================================
 *
 * `[+_x_]` affiche x AVEC son signe (+7 / -7) ; `[(_x_]` met un négatif entre
 * parenthèses. Le nouveau format a les modificateurs `{{eval:x;+}}` et
 * `{{eval:x;()}}`. Avant : `{{eval:+x}}` perdait le signe → « 994-6 » au lieu
 * de « 9+9+4-6 » (#335), « f(x)=7x9 » (#586). ~400 occurrences dans le jeu.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertTinyCASToNew } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function convert(input: string): string {
	return convertTinyCASToNew(input).converted ?? '';
}

describe('conversion', () => {
	it.each([
		['[+_&2_]', '{{eval:b;+}}'],
		['[+_(&1)*(&2)_]', '{{eval:(a)*(b);+}}'],
		['[(_&1_]', '{{eval:a;()}}'],
		// Coefficient d'une inconnue : seul le coefficient est évalué
		['[+_-(&1+(&2))x_]', '{{eval:-(a+(b));+}}x'],
		['[+_&1x^2_]', '{{eval:a;+}}x^2']
	])('%s → %s', (input, expected) => {
		expect(convert(input)).toBe(expected);
	});
});

function draws(index: number, count = 20) {
	const result = transformQuestion(questions[index], index);
	expect(result.success).toBe(true);
	const template = { ...result.template!, id: 't' } as QuestionTemplate;
	return Array.from({ length: count }, (_, i) => {
		const generated = generateInstance(template, i + 1);
		if (!generated.success) throw new Error(`#${index} : ${generated.errors.join('; ')}`);
		const values = Object.fromEntries(
			generated.instance.resolvedVariables!.map((v) => [v.name, Number(v.value)])
		);
		const shown = String(generated.instance.statement).split('>>')[1]?.split('$$')[0] ?? '';
		return { instance: generated.instance, values, shown: shown.replace(/\s/g, '') };
	});
}

const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

describe('#335 somme algébrique « écriture simplifiée »', () => {
	it('affiche chaque terme avec son signe, attend la somme', () => {
		for (const { instance, values, shown } of draws(335)) {
			const { a, b, c, d } = values;
			expect(shown).toBe(`${a}${signed(b)}${signed(c)}${signed(d)}`);
			expect(Number(instance.blanks![0].expectedAnswer)).toBe(a + b + c + d);
		}
	});
});

describe('#611 racine évidente d’un polynôme', () => {
	it('génère et affiche le polynôme x² ± … x ± …', () => {
		for (const { instance, values } of draws(611, 10)) {
			const { a, b } = values;
			const statement = String(instance.statement).replace(/\s/g, '');
			// x² − (a+b)x + ab, chaque coefficient avec son signe
			expect(statement).toContain(`x^2${signed(-(a + b))}x${signed(a * b)}`);
		}
	});
});
