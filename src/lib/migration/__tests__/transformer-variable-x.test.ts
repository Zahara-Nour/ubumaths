/**
 * La variable de fonction `x` dans un calcul TinyMath (`[_&1x_][+_&2_]`)
 * =====================================================================
 *
 * `{{eval:…}}` n'accepte une lettre que si elle est TIRÉE par une variable (protection contre
 * les fautes de frappe, #480) : `{{eval:a*x}}` échouait (« free variables: x ») dans 8
 * questions du lot Fonctions. Le convertisseur déclare `x` = « x » quand un calcul la cite.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { transformQuestion } from '../question-transformer';
import { convertTinyCASToNew } from '../syntax-converter';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import type { QuestionWithMigration } from '../old-question-types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), 'data/tinymath/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function variationsGenerate(index: number): boolean[] {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	return template.variations.map((variation) =>
		[1, 2, 3, 4, 5].every(
			(seed) =>
				generateInstance({ ...template, variations: [variation] } as QuestionTemplate, seed).success
		)
	);
}

describe('un calcul qui cite x : x est déclarée', () => {
	it.each([579, 591, 598, 601, 602, 603])('#%i : toutes les variations génèrent', (index) => {
		expect(variationsGenerate(index).every(Boolean)).toBe(true);
	});

	it('#579 : f(x) = 3x+2 — le calcul littéral rend « 3x »', () => {
		const template = transformQuestion(questions[579], 579).template!;
		const variation = template.variations[0];
		expect(variation.variables?.some((v) => v.name === 'x' && v.expression === 'x|x')).toBe(true);
	});
});

it('forme abrégée d’une variable (`eval:1x`, #592) : x déclarée', () => {
	const template = transformQuestion(questions[592], 592).template!;
	expect(template.variations[0].variables?.some((v) => v.name === 'x')).toBe(true);
});

describe('non-régression', () => {
	it('une question sans x ne reçoit pas de variable x (#1)', () => {
		const template = transformQuestion(questions[1], 1).template!;
		for (const variation of template.variations) {
			expect(variation.variables?.some((v) => v.name === 'x') ?? false).toBe(false);
		}
	});
});

// `&(\w+)` lisait `&1x` comme le nom « 1x » : le coefficient tiré était perdu (`{{eval:1x}}`)
describe('référence collée à une lettre : &1x', () => {
	it.each([
		['[_&1x_]', '{{eval:ax}}'],
		['[_&1x^2_]', '{{eval:ax^2}}'],
		['[_&2*&3x_]', '{{eval:b*cx}}']
	])('%s → %s', (source, expected) => {
		expect(convertTinyCASToNew(source).converted).toBe(expected);
	});

	it('#603 : l’énoncé affiche le coefficient tiré qui est la réponse', () => {
		const template = { ...transformQuestion(questions[603], 603).template!, id: 't' };
		for (let seed = 1; seed <= 5; seed++) {
			const g = generateInstance(
				{ ...template, variations: [template.variations[0]] } as QuestionTemplate,
				seed
			);
			if (!g.success) throw new Error(g.errors.join(';'));
			const answer = g.instance.blanks?.[0].expectedAnswer ?? '';
			const statement = String(g.instance.statement);
			// « a x^2 » : le coefficient attendu précède x^2 dans l'énoncé (1 s'écrit x^2, -1 s'écrit -x^2)
			const coefficient = statement.match(/\$\$([^$]*?)x\^2/)?.[1].trim() ?? '';
			const shown =
				coefficient === '' ? '1' : coefficient === '-' ? '-1' : coefficient.replace(/\s/g, '');
			expect(shown).toBe(answer);
		}
	});
});
