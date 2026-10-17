/**
 * Guides calculatrices : adresses des niveaux et filiation (copie de `grade_predecessors`).
 */
import { describe, expect, it } from 'vitest';
import { GRADE_CODES } from '$lib/types/grades';
import { GRADE_SLUGS, ancestorsOf, gradeFromSlug, isGuideGrade } from '../levels';

describe('adresses des niveaux', () => {
	it('donne une adresse distincte à chaque niveau', () => {
		const slugs = GRADE_CODES.map((code) => GRADE_SLUGS[code]);
		expect(new Set(slugs).size).toBe(GRADE_CODES.length);
	});

	it('retrouve le niveau depuis son adresse', () => {
		expect(gradeFromSlug('seconde')).toBe('2');
		expect(gradeFromSlug('maths-complementaires')).toBe('T_COMP');
		expect(gradeFromSlug('cm2')).toBe('CM2');
		expect(gradeFromSlug('inconnu')).toBeUndefined();
	});

	it('ne donne pas de guide avant la 6e ni en terminale générale', () => {
		expect(isGuideGrade('CM2')).toBe(false);
		expect(isGuideGrade('T_GEN')).toBe(false);
		expect(isGuideGrade('6')).toBe(true);
	});
});

describe('filiation', () => {
	it('la 6e n’hérite de rien (le CM n’a pas de guide)', () => {
		expect(ancestorsOf('6')).toEqual([]);
	});

	it('la seconde hérite de tout le collège, du plus proche au plus lointain', () => {
		expect(ancestorsOf('2')).toEqual(['3', '4', '5', '6']);
	});

	it('la Tle technologique passe par la 1re technologique', () => {
		expect(ancestorsOf('T_TECHNO')).toEqual(['1_TECHNO', '2', '3', '4', '5', '6']);
	});

	it('les maths expertes reprennent la Tle puis la 1re spécialité, du plus proche au plus lointain', () => {
		expect(ancestorsOf('T_EXP')).toEqual(['T_SPE', '1_SPE', '2', '3', '4', '5', '6']);
	});
});
