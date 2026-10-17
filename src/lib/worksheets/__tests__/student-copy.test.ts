/**
 * La copie d'un élève (ADR 0023) : version choisie par le niveau de guidage,
 * graine de l'affectation — une seule fonction pour tous les chemins.
 */
import { describe, it, expect } from 'vitest';
import {
	copySeed,
	copyOrderSeed,
	guidanceVariationIndex,
	isGuidanceLevel,
	resolveCopyExercise
} from '../student-copy';
import type { Exercise } from '$lib/exercises/types';

describe('guidanceVariationIndex : la version d’après le niveau, jamais au hasard', () => {
	const GA = ['guided', 'autonomous'];
	const GIA = ['guided', 'intermediate', 'autonomous'];
	const GI = ['guided', 'intermediate'];

	it('le niveau demandé existe : sa version', () => {
		expect(guidanceVariationIndex(GIA, 'guided')).toBe(0);
		expect(guidanceVariationIndex(GIA, 'intermediate')).toBe(1);
		expect(guidanceVariationIndex(GIA, 'autonomous')).toBe(2);
		expect(guidanceVariationIndex(GA, 'autonomous')).toBe(1);
	});

	it('intermédiaire manquant → guidé (jamais moins d’aide que demandé)', () => {
		expect(guidanceVariationIndex(GA, 'intermediate')).toBe(0);
	});

	it('autonome manquant → intermédiaire, sinon guidé', () => {
		expect(guidanceVariationIndex(GI, 'autonomous')).toBe(1);
		expect(guidanceVariationIndex(['guided'], 'autonomous')).toBe(0);
	});

	it('guidé manquant → le plus proche (intermédiaire)', () => {
		expect(guidanceVariationIndex(['intermediate', 'autonomous'], 'guided')).toBe(0);
		expect(guidanceVariationIndex(['autonomous', 'intermediate'], 'guided')).toBe(1);
	});

	it('l’ordre des versions ne compte pas : on suit les étiquettes', () => {
		expect(guidanceVariationIndex(['autonomous', 'guided'], 'guided')).toBe(1);
	});

	it('une seule version, ou aucune étiquette connue : la première', () => {
		expect(guidanceVariationIndex(['default'], 'autonomous')).toBe(0);
		expect(guidanceVariationIndex([undefined, undefined], 'autonomous')).toBe(0);
		expect(guidanceVariationIndex([], 'guided')).toBe(0);
	});
});

describe('copySeed : la graine d’une copie', () => {
	const base = {
		assignmentId: 'a1',
		worksheetId: 'w1',
		worksheetExerciseId: 'we1',
		studentId: 's1'
	};

	it('déterministe, entier positif', () => {
		const seed = copySeed({ ...base, individualized: false });
		expect(seed).toBe(copySeed({ ...base, individualized: false }));
		// Entier positif sur 31 bits : tient dans une colonne `integer` Postgres
		expect(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 31).toBe(true);
	});

	it('non individualisée : la même pour tous les élèves de l’affectation', () => {
		expect(copySeed({ ...base, individualized: false })).toBe(
			copySeed({ ...base, studentId: 's2', individualized: false })
		);
	});

	it('individualisée : une par élève', () => {
		expect(copySeed({ ...base, individualized: true })).not.toBe(
			copySeed({ ...base, studentId: 's2', individualized: true })
		);
	});

	it('propre à l’affectation : réaffecter donne d’autres tirages', () => {
		expect(copySeed({ ...base, individualized: false })).not.toBe(
			copySeed({ ...base, assignmentId: 'a2', individualized: false })
		);
	});

	it('propre à l’exercice de la fiche, pas à sa position', () => {
		expect(copySeed({ ...base, individualized: false })).not.toBe(
			copySeed({ ...base, worksheetExerciseId: 'we2', individualized: false })
		);
	});

	it('hors affectation : graine de la fiche, sans élève', () => {
		const seed = copySeed({
			assignmentId: null,
			worksheetId: 'w1',
			worksheetExerciseId: 'we1',
			individualized: false
		});
		expect(seed).toBe(
			copySeed({
				assignmentId: null,
				worksheetId: 'w1',
				worksheetExerciseId: 'we1',
				studentId: 's9',
				individualized: false
			})
		);
	});
});

describe('isGuidanceLevel', () => {
	it('les trois niveaux, rien d’autre', () => {
		expect(['guided', 'intermediate', 'autonomous'].every(isGuidanceLevel)).toBe(true);
		expect(isGuidanceLevel('expert')).toBe(false);
		expect(isGuidanceLevel(undefined)).toBe(false);
	});
});

/** Exercice de la forme réelle : deux niveaux de guidage, une variable tirée */
function twoLevels(variables = true): Exercise {
	return {
		id: 'ex',
		title: 'Proportionnalité',
		category: 'application',
		tags: [],
		shared: variables
			? {
					variables: [
						{ name: 'a', expression: '{{2..9}}' },
						{ name: 't', expression: '{{eval:3*{{a}}}}' }
					]
				}
			: undefined,
		variations: [
			{
				label: 'guided',
				statement_md: 'Guidé : calcule {{a}} fois 3.',
				solution_md: 'Guidé : {{t}}'
			},
			{
				label: 'autonomous',
				statement_md: 'Autonome : triple de {{a}} ?',
				solution_md: 'Autonome : {{t}}'
			}
		],
		created_at: '',
		updated_at: '',
		created_by: 'test'
	} as unknown as Exercise;
}

describe('resolveCopyExercise : un exercice de la copie', () => {
	it('la version suit le niveau', () => {
		expect(resolveCopyExercise(twoLevels(), { level: 'guided', seed: 1 }).statement).toMatch(
			/^Guidé/
		);
		expect(resolveCopyExercise(twoLevels(), { level: 'autonomous', seed: 1 }).statement).toMatch(
			/^Autonome/
		);
		expect(
			resolveCopyExercise(twoLevels(), { level: 'intermediate', seed: 1 }).variationIndex
		).toBe(0);
	});

	it('la version imposée par la fiche prime sur le niveau', () => {
		const copy = resolveCopyExercise(twoLevels(), {
			level: 'guided',
			seed: 1,
			forcedVariationIndex: 1
		});
		expect(copy.statement).toMatch(/^Autonome/);
	});

	it('les variables sont tirées : énoncé et corrigé cohérents, plus de {{…}}', () => {
		const copy = resolveCopyExercise(twoLevels(), { level: 'guided', seed: 7 });
		const a = Number(/calcule (\d) fois/.exec(copy.statement)?.[1]);
		expect(a).toBeGreaterThanOrEqual(2);
		expect(copy.solution).toBe(`Guidé : ${3 * a}`);
		expect(copy.statement + copy.solution).not.toContain('{{');
	});

	it('même graine, même copie ; même graine, même valeur aux deux niveaux', () => {
		const one = resolveCopyExercise(twoLevels(), { level: 'guided', seed: 42 });
		expect(resolveCopyExercise(twoLevels(), { level: 'guided', seed: 42 })).toEqual(one);
	});

	it('génération en échec : le texte brut de la version choisie, pas de la première', () => {
		const broken = twoLevels(false);
		// Variable non déclarée : la génération échoue
		const copy = resolveCopyExercise(
			{
				...broken,
				variations: broken.variations!.map((v) => ({
					...v,
					statement_md: v.statement_md + ' {{inconnue}}'
				}))
			} as Exercise,
			{ level: 'autonomous', seed: 1 }
		);
		expect(copy.variationIndex).toBe(1);
		expect(copy.statement).toMatch(/^Autonome/);
	});
});

describe('copyOrderSeed : la graine de l’ordre (option « mélanger »)', () => {
	const base = { assignmentId: 'a1', worksheetId: 'w1', studentId: 's1', sectionId: 'sec1' };

	it('même portée que les valeurs : classe ou élève', () => {
		expect(copyOrderSeed({ ...base, individualized: false })).toBe(
			copyOrderSeed({ ...base, studentId: 's2', individualized: false })
		);
		expect(copyOrderSeed({ ...base, individualized: true })).not.toBe(
			copyOrderSeed({ ...base, studentId: 's2', individualized: true })
		);
		expect(copyOrderSeed({ ...base, individualized: false })).not.toBe(
			copyOrderSeed({ ...base, assignmentId: 'a2', individualized: false })
		);
	});

	it('dédiée : différente de la graine des valeurs d’un exercice de même identifiant', () => {
		expect(copyOrderSeed({ ...base, individualized: true })).not.toBe(
			copySeed({ ...base, worksheetExerciseId: 'sec1', individualized: true })
		);
	});
});
