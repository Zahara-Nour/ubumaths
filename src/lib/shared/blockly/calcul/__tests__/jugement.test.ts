import { describe, expect, it } from 'vitest';

import {
	ESSAIS_PAR_DEFAUT,
	jugerProgrammeCalcul,
	lireProgrammeCalcul,
	memesAffichages
} from '../jugement';

const BO = 'afficher (nombre + 2) × 4';

describe('jugerProgrammeCalcul', () => {
	it('le même calcul écrit autrement est juste', () => {
		for (const reponse of [
			BO,
			'afficher nombre × 4 + 8',
			'résultat = nombre + 2 ; résultat = résultat × 4 ; afficher résultat',
			'afficher 4 × (2 + nombre)'
		]) {
			expect(jugerProgrammeCalcul(reponse, BO, ESSAIS_PAR_DEFAUT)).toEqual({ juste: true });
		}
	});

	it('un calcul qui ne coïncide que sur un nombre est faux', () => {
		// × 2 et + 2 donnent 4 en partant de 2
		expect(
			jugerProgrammeCalcul('afficher nombre × 2', 'afficher nombre + 2', ESSAIS_PAR_DEFAUT)
		).toEqual({
			juste: false
		});
		expect(jugerProgrammeCalcul('afficher nombre × 2', 'afficher nombre + 2', [2])).toEqual({
			juste: true
		});
	});

	it('décimaux : 0,1 + 0,2 = 0,3', () => {
		expect(jugerProgrammeCalcul('afficher 0,1 + 0,2', 'afficher 0,3', [0])).toEqual({
			juste: true
		});
		expect(
			jugerProgrammeCalcul('afficher nombre ÷ 3 × 3', 'afficher nombre', ESSAIS_PAR_DEFAUT)
		).toEqual({
			juste: true
		});
		expect(jugerProgrammeCalcul('afficher 0,3001', 'afficher 0,3', [0])).toEqual({ juste: false });
	});

	it('mêmes affichages dans le même ordre, ni plus ni moins', () => {
		const attendu = 'afficher nombre ; afficher nombre × 2';
		expect(jugerProgrammeCalcul('afficher nombre × 2 ; afficher nombre', attendu, [3])).toEqual({
			juste: false
		});
		expect(jugerProgrammeCalcul('afficher nombre', attendu, [3])).toEqual({ juste: false });
		expect(jugerProgrammeCalcul(`${attendu} ; afficher 1`, attendu, [3])).toEqual({ juste: false });
	});

	it('rien d’affiché : faux, avec un message', () => {
		expect(jugerProgrammeCalcul('résultat = nombre + 2', BO, ESSAIS_PAR_DEFAUT)).toEqual({
			juste: false,
			message: 'Ton programme n’affiche rien.'
		});
	});

	it('division par zéro sur un essai : faux, le nombre dit', () => {
		const verdict = jugerProgrammeCalcul('afficher 1 ÷ nombre', 'afficher nombre', [2, 0]);
		expect(verdict.juste).toBe(false);
		expect(verdict.message).toMatch(/Avec le nombre 0 : .*division par zéro/i);
	});

	it('programme illisible ou vide', () => {
		expect(jugerProgrammeCalcul('', BO, ESSAIS_PAR_DEFAUT)).toEqual({ juste: false });
		expect(jugerProgrammeCalcul('afficher (', BO, ESSAIS_PAR_DEFAUT)).toMatchObject({
			juste: false,
			message: expect.any(String)
		});
	});

	it('une référence qui ne marche pas n’est jamais juste', () => {
		expect(jugerProgrammeCalcul('afficher 1', 'afficher (', [0])).toEqual({ juste: false });
		expect(jugerProgrammeCalcul('afficher 1 ÷ nombre', 'afficher 1 ÷ nombre', [0])).toEqual({
			juste: false
		});
		expect(jugerProgrammeCalcul('résultat = 1', 'résultat = 1', [0])).toEqual({ juste: false });
		expect(jugerProgrammeCalcul(BO, BO, [])).toEqual({ juste: false });
	});
});

describe('lireProgrammeCalcul', () => {
	it('rend les affichages pour chaque essai', () => {
		expect(lireProgrammeCalcul(BO, [0, 1])).toEqual({ ok: true, sorties: [[8], [12]] });
	});

	it('dit l’essai où le programme échoue', () => {
		expect(lireProgrammeCalcul('afficher 1 ÷ nombre', [1, 0])).toMatchObject({
			ok: false,
			essai: 0
		});
	});
});

describe('memesAffichages', () => {
	it('marge relative minuscule, grands nombres compris', () => {
		expect(memesAffichages([1e15 + 1], [1e15 + 1.0000001])).toBe(true);
		expect(memesAffichages([1], [1.001])).toBe(false);
		expect(memesAffichages([0], [1e-15])).toBe(true);
		expect(memesAffichages([1, 2], [1])).toBe(false);
	});
});
