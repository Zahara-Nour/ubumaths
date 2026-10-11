/**
 * La copie d'un élève (ADR 0023) : version choisie par le niveau de guidage,
 * graine de l'affectation — une seule fonction pour tous les chemins.
 */
import { describe, it, expect } from 'vitest';
import { copySeed, guidanceVariationIndex, isGuidanceLevel } from '../student-copy';

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
		expect(Number.isInteger(seed) && seed >= 0).toBe(true);
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
