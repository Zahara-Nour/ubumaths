/**
 * Réécriture des renvois de numérotation (`fix-renvois-numerotation.ts`)
 * ======================================================================
 *
 * Logique pure : lecture d'un champ par son chemin (`variations[0].translations.en.solution_md`),
 * plan d'un exercice (refus si l'exercice a changé depuis la lecture, ou si une phrase
 * n'est pas trouvée exactement une fois), comparaison du contenu relu (jsonb réordonne
 * les clés).
 */

import { describe, it, expect } from 'vitest';
import {
	parseFieldPath,
	planExercise,
	sameContent,
	type Proposal
} from '../lib/renvois-numerotation';

const UPDATED_AT = '2026-10-13T08:11:29.231875+00:00';

function exercise(statement: string, solution = 'Corrigé.') {
	return {
		id: 'e1',
		updated_at: UPDATED_AT,
		variations: [
			{
				statement_md: statement,
				solution_md: solution,
				translations: { en: { statement_md: 'Compare with question b) 2).' } }
			}
		]
	};
}

const proposal = (field: string, avant: string, apres: string): Proposal => ({
	exerciseId: 'e1',
	field,
	avant,
	apres
});

describe('parseFieldPath', () => {
	it('lit un champ direct et un champ de traduction', () => {
		expect(parseFieldPath('variations[0].solution_md')).toEqual({
			variationIndex: 0,
			keys: ['solution_md']
		});
		expect(parseFieldPath('variations[1].translations.en.statement_md')).toEqual({
			variationIndex: 1,
			keys: ['translations', 'en', 'statement_md']
		});
	});

	it('refuse un chemin inattendu', () => {
		expect(() => parseFieldPath('title')).toThrow();
		expect(() => parseFieldPath('variations[0].hints[1]')).toThrow();
	});
});

describe('planExercise', () => {
	it('applique tous les remplacements d’un exercice, FR et EN', () => {
		const row = exercise('1. a. Calculer.\n2. Comparer avec la question a) 2).');
		const plan = planExercise(row, UPDATED_AT, [
			proposal(
				'variations[0].statement_md',
				'2. Comparer avec la question a) 2).',
				'2. Comparer avec la question 1) b).'
			),
			proposal(
				'variations[0].translations.en.statement_md',
				'Compare with question b) 2).',
				'Compare with question 2) b).'
			)
		]);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;
		expect(plan.variations[0].statement_md).toBe(
			'1. a. Calculer.\n2. Comparer avec la question 1) b).'
		);
		expect(plan.variations[0].translations).toEqual({
			en: { statement_md: 'Compare with question 2) b).' }
		});
		expect(plan.replacements).toBe(2);
		// La ligne lue n'est pas modifiée : elle sert de sauvegarde
		expect(row.variations[0].statement_md).toContain('a) 2)');
	});

	it('refuse un exercice modifié depuis la lecture', () => {
		const plan = planExercise(
			exercise('Comparer avec la question b).'),
			'2026-10-01T00:00:00+00:00',
			[proposal('variations[0].statement_md', 'question b).', 'question 2).')]
		);
		expect(plan).toEqual({ ok: false, reason: expect.stringContaining('modifié') });
	});

	it('refuse une phrase introuvable', () => {
		const plan = planExercise(exercise('Rien à voir.'), UPDATED_AT, [
			proposal('variations[0].statement_md', 'question b).', 'question 2).')
		]);
		expect(plan).toEqual({ ok: false, reason: expect.stringContaining('0 fois') });
	});

	it('refuse une phrase trouvée deux fois', () => {
		const plan = planExercise(
			exercise('Puis voir la question b). Et voir la question b).'),
			UPDATED_AT,
			[proposal('variations[0].statement_md', 'voir la question b).', 'voir la question 2).')]
		);
		expect(plan).toEqual({ ok: false, reason: expect.stringContaining('2 fois') });
	});

	it('n’écrit rien de l’exercice si une seule de ses phrases manque', () => {
		const plan = planExercise(exercise('Voir la question b).'), UPDATED_AT, [
			proposal('variations[0].statement_md', 'Voir la question b).', 'Voir la question 2).'),
			proposal('variations[0].solution_md', 'Absent du corrigé.', 'Rien.')
		]);
		expect(plan.ok).toBe(false);
	});

	it('refuse une variation absente', () => {
		const plan = planExercise(exercise('Voir la question b).'), UPDATED_AT, [
			proposal('variations[3].statement_md', 'Voir la question b).', 'Voir la question 2).')
		]);
		expect(plan).toEqual({ ok: false, reason: expect.stringContaining('variation') });
	});
});

describe('sameContent', () => {
	it('ignore l’ordre des clés (jsonb le change)', () => {
		expect(sameContent({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
		expect(sameContent([{ a: 1 }], [{ a: 2 }])).toBe(false);
	});
});
