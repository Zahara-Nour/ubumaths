/**
 * Grandeurs TinyMath → `{{eval}}` avec unités (lot 4 du chantier Grandeurs)
 * ==========================================================================
 *
 * Spécification : docs/wip/grandeurs-eval-progress.md (« Lot 4 »). TinyMath calcule avec
 * des grandeurs (`&1 mm`, `[_4*&1_mm_]`, `[_&1 h_min_]`, `_HMS_`) ; le moteur les sait
 * depuis #484 (`7[mm]`, `;[unité]`, `;hms`). Le convertisseur les traduit.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertTinyCASToNew } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstanceWithFixedVariables } from '$lib/questions/generator/test-instance-builder';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function instanceOf(
	index: number,
	variables: Record<string, string>,
	variation = 0
): QuestionInstance {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	const generated = generateInstanceWithFixedVariables(
		template as QuestionTemplate,
		variables,
		variation
	);
	if (!generated.success) throw new Error(generated.errors.join(' ; '));
	return generated.instance;
}

describe('calcul exprimé dans une unité : [_expr_unité_] → {{eval:expr;[unité]}}', () => {
	it.each([
		['[_4*&1_mm_]', '{{eval:4*a;[mm]}}'],
		['[_&3*&4_mm^2_]', '{{eval:c*d;[mm^2]}}'],
		// `[._` : une grandeur est déjà décimale, pas de `;d`
		['[._&3*&4/2_cm^2_]', '{{eval:c*d/2;[cm^2]}}'],
		['[._&3*&4:2_m^2_]', '{{eval:c*d:2;[m^2]}}'],
		['[_&2_km.h^{-1}_]', '{{eval:b;[km.h^{-1}]}}'],
		// grandeur écrite dans le calcul : `&1 h` → `a[h]`
		['[_&1 h_min_]', '{{eval:a[h];[min]}}']
	])('%s → %s', (source, expected) => {
		expect(convertTinyCASToNew(source).converted).toBe(expected);
	});

	it('[_x/(1 min)_] → un nombre : {{eval:b/(1[min])}}', () => {
		expect(convertTinyCASToNew('[_&2/(1 min)_]').converted).toBe('{{eval:b/(1[min])}}');
	});

	it('[._(&3+&4)/(1 m)_] garde le décimal ;d (le résultat est un nombre)', () => {
		expect(convertTinyCASToNew('[._(&3+&4)/(1 m)_]').converted).toBe('{{eval:(c+d)/(1[m]);d}}');
	});

	it('durée composée dans un calcul : &1 h &2 min → (a[h]+b[min])', () => {
		expect(convertTinyCASToNew('[_&1 h &2 min + &3 min_HMS_]').converted).toBe(
			'{{eval:(a[h]+b[min]) + c[min];hms}}'
		);
	});

	it('[°&1 cm°] affiche la grandeur', () => {
		expect(convertTinyCASToNew('$$[°&1 cm°]$$').converted).toContain('{{a}}~\\unit{cm}');
	});

	it.each([
		['[_&1*&1_]', '{{eval:a*a}}'],
		['[._&1*0.1_]', '{{eval:a*0.1;d}}'],
		['[_&1*60+&2_]', '{{eval:a*60+b}}']
	])('non-régression : %s → %s', (source, expected) => {
		expect(convertTinyCASToNew(source).converted).toBe(expected);
	});
});

describe('questions converties : énoncé, réponse attendue, correction', () => {
	it('#432 périmètre d’un carré : côté tiré en mm, réponse 28 mm', () => {
		const instance = instanceOf(432, { a1: '7' });
		expect(String(instance.statement)).toContain('7~\\unit{mm}');
		expect(instance.blanks?.[0].expectedAnswer).toBe('28[mm]');
		expect(validateAnswer(['28\\unit{mm}'], instance).isCorrect).toBe(true);
		expect(validateAnswer(['28'], instance).isCorrect).toBe(false);
	});

	it('#438 aire d’un rectangle : 7 mm × 5 mm = 35 mm²', () => {
		const instance = instanceOf(438, { a: '7', b: '5' });
		expect(instance.blanks?.[0].expectedAnswer).toBe('35[mm^2]');
		expect(validateAnswer(['35\\unit{mm^2}'], instance).isCorrect).toBe(true);
	});

	it('#437 côté d’un carré d’aire donnée : solution `&1 mm` → case à unité', () => {
		const instance = instanceOf(437, { a: '7' });
		expect(instance.blanks?.[0].expectedAnswer).toBe('7[mm]');
		expect(validateAnswer(['7\\unit{mm}'], instance).isCorrect).toBe(true);
	});

	it('#449 heures en minutes : 3 h = 180 min, réponse numérique', () => {
		const instance = instanceOf(449, { a: '3' });
		expect(instance.blanks?.[0].expectedAnswer).toBe('180');
		expect(instance.blanks?.[0].unit).toBeUndefined();
	});

	it('#453 1 h 30 min en minutes : 90', () => {
		const instance = instanceOf(453, { a: '1', b1: '3' });
		expect(instance.blanks?.[0].expectedAnswer).toBe('90');
	});

	it('#467 durée d’un épisode : énoncé en h min (;hms), réponse 20 min', () => {
		const instance = instanceOf(467, { a: '1', b: '50', c: '20' });
		const statement = String(instance.statement);
		expect(statement).toContain('1~\\unit{h} 50~\\unit{min}');
		expect(statement).toContain('2~\\unit{h} 10~\\unit{min}');
		expect(instance.blanks?.[0].expectedAnswer).toBe('20[min]');
		expect(validateAnswer(['20\\unit{min}'], instance).isCorrect).toBe(true);
	});

	it('#470 vitesse moyenne : 150 km en 3 h → 50 km/h', () => {
		const instance = instanceOf(470, { a1: '5', c1: '3' });
		const statement = String(instance.statement);
		expect(statement).toContain('150~\\unit{km}');
		expect(statement).toContain('3~\\unit{h}');
		expect(instance.blanks?.[0].expectedAnswer).toBe('50[km.h^{-1}]');
		expect(validateAnswer(['50\\unit{km/h}'], instance).isCorrect).toBe(true);
	});

	it('#508 unité imprimée après la case ($$... cm$$) : case numérique', () => {
		const instance = instanceOf(508, { b1: '4' }, 1);
		expect(instance.blanks?.[0].unit).toBeUndefined();
		expect(instance.blanks?.[0].expectedAnswer).toBe('4');
	});
});

// Relecture de #485 : une solution TinyMath terminée par une espace (`[_&1*&1_mm^2_] `)
describe('solution grandeur suivie d’une espace', () => {
	it('#436 aire d’un carré (v0) : case à unité, attendu sans espace', () => {
		const instance = instanceOf(436, { a1: '3' }, 0);
		expect(instance.blanks?.[0].expectedAnswer).toBe('9[mm^2]');
		expect(instance.blanks?.[0].unit).toEqual({ expected: true });
		expect(validateAnswer(['9\\unit{mm^2}'], instance).isCorrect).toBe(true);
	});

	it('#442 aire d’un triangle quelconque : case à unité', () => {
		const template = transformQuestion(questions[442], 442).template!;
		for (const variation of template.variations) {
			expect(variation.blanks?.[0].unit).toEqual({ expected: true });
			expect(variation.blanks?.[0].expectedAnswer).toBe(
				variation.blanks?.[0].expectedAnswer.trim()
			);
		}
	});
});
