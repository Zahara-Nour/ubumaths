import { describe, expect, it } from 'vitest';

import {
	ecrireEssais,
	ESSAIS_PAR_DEFAUT,
	jugerProgrammeCalcul,
	lireEssais,
	lireProgrammeCalcul,
	memesAffichages,
	PROGRAMME_CONSTANT
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

describe('jugerProgrammeCalcul : un programme qui ne dépend pas du nombre', () => {
	// 6-210 : « pour 3, affiche 10 », un seul essai
	const POUR_3 = 'afficher nombre + 7';

	it('afficher le résultat directement est faux, avec un message', () => {
		expect(jugerProgrammeCalcul('afficher 10', POUR_3, [3])).toEqual({
			juste: false,
			message: PROGRAMME_CONSTANT
		});
	});

	it('un nombre choisi posé mais sans effet ne suffit pas', () => {
		expect(jugerProgrammeCalcul('afficher nombre × 0 + 10', POUR_3, [3])).toEqual({
			juste: false,
			message: PROGRAMME_CONSTANT
		});
		expect(jugerProgrammeCalcul('mettre résultat à nombre ; afficher 10', POUR_3, [3])).toEqual({
			juste: false,
			message: PROGRAMME_CONSTANT
		});
	});

	it('tout programme qui utilise le nombre et affiche 10 pour 3 reste juste', () => {
		for (const reponse of [POUR_3, 'afficher nombre × 3 + 1', 'afficher 13 − nombre']) {
			expect(jugerProgrammeCalcul(reponse, POUR_3, [3])).toEqual({ juste: true });
		}
	});

	it('un nombre témoin qui fait planter le programme est ignoré', () => {
		// 1 ÷ (nombre − 2) plante en 2 (témoin), pas en 3 (l'essai) : il dépend bien du nombre
		expect(
			jugerProgrammeCalcul('afficher 10 × (nombre − 2) ÷ (nombre − 2) + nombre − 3', POUR_3, [3])
		).toEqual({ juste: true });
	});

	it('attendu qui affiche toujours la même chose : la règle ne joue pas', () => {
		expect(jugerProgrammeCalcul('afficher 0,1 + 0,2', 'afficher 0,3', [0])).toEqual({
			juste: true
		});
	});

	it('faux de toute façon : verdict et message inchangés (plusieurs essais)', () => {
		expect(jugerProgrammeCalcul('afficher 8', BO, ESSAIS_PAR_DEFAUT)).toEqual({ juste: false });
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
		// Sous 1, la marge reste relative : un petit nombre n'est pas 0 (revue PR 5a)
		expect(memesAffichages([1e-11], [0])).toBe(false);
		expect(memesAffichages([0.1 + 0.2 - 0.3], [0])).toBe(true);
	});
});

describe('lireEssais / ecrireEssais', () => {
	it('lit et réécrit', () => {
		expect(lireEssais('-3 ; 0 ; 2,5 ; −1 ; 0.5')).toEqual({
			ok: true,
			essais: [-3, 0, 2.5, -1, 0.5]
		});
		expect(ecrireEssais([-3, 0, 2.5])).toBe('−3 ; 0 ; 2,5');
		expect(lireEssais(ecrireEssais(ESSAIS_PAR_DEFAUT))).toEqual({
			ok: true,
			essais: [...ESSAIS_PAR_DEFAUT]
		});
	});

	it('refuse vide, illisible, doublon, trop de nombres', () => {
		expect(lireEssais('')).toMatchObject({ ok: false });
		expect(lireEssais('1 ; deux')).toMatchObject({
			ok: false,
			message: expect.stringMatching(/deux/)
		});
		expect(lireEssais('1 ; 1,0')).toMatchObject({
			ok: false,
			message: expect.stringMatching(/deux fois/)
		});
		expect(lireEssais(Array.from({ length: 21 }, (_, i) => i).join(' ; '))).toMatchObject({
			ok: false
		});
	});
});
