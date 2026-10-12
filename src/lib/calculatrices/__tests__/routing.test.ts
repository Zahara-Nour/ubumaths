/**
 * Guides calculatrices : ce que donne une adresse /calculatrices/<modele>/<niveau>
 * (phase 0, points 10, 11 et 12).
 */
import { describe, expect, it } from 'vitest';
import { resolveGuideAddress } from '../routing';

describe('resolveGuideAddress', () => {
	it('un modèle et un niveau à guide : le guide', () => {
		const result = resolveGuideAddress('numworks', 'seconde');
		expect(result.kind).toBe('guide');
		if (result.kind === 'guide') {
			expect(result.model.slug).toBe('numworks');
			expect(result.grade).toBe('2');
		}
	});

	it('un niveau du cycle 2 : l’explication du programme, pas une page vide (point 11)', () => {
		const result = resolveGuideAddress('numworks', 'ce1');
		expect(result).toMatchObject({ kind: 'grade-without-guide', grade: 'CE1' });
		if (result.kind === 'grade-without-guide') expect(result.reason).toMatch(/cycle 2/);
	});

	it('le CM : guide pas encore écrit (point 11)', () => {
		expect(resolveGuideAddress('numworks', 'cm2')).toMatchObject({
			kind: 'grade-without-guide',
			grade: 'CM2'
		});
	});

	it('un modèle de collège au lycée : renvoi vers ses niveaux (point 10)', () => {
		const result = resolveGuideAddress('casio-fx-92', 'seconde');
		expect(result.kind).toBe('grade-not-covered');
		if (result.kind === 'grade-not-covered')
			expect(result.model.grades).toEqual(['6', '5', '4', '3']);
	});

	it('un modèle inconnu : introuvable, la page répond 404 (point 12)', () => {
		expect(resolveGuideAddress('casio-inconnue', 'seconde').kind).toBe('not-found');
	});

	it('un niveau inconnu : introuvable (point 12)', () => {
		expect(resolveGuideAddress('numworks', 'sixieme').kind).toBe('not-found');
	});
});
