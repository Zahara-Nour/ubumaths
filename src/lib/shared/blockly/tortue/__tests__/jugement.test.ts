import { describe, expect, it } from 'vitest';

import { jugerProgrammeTortue, lireProgrammeTortue } from '../jugement';

const CARRE_DROITE = 'répéter 4 [ avancer 3 ; tourner à droite 90 ]';

describe('jugerProgrammeTortue — comparer: position', () => {
	it('le même programme : juste', () => {
		expect(jugerProgrammeTortue(CARRE_DROITE, CARRE_DROITE, 'position')).toEqual({ juste: true });
	});

	it('un autre chemin pour la même figure : juste', () => {
		const autreChemin =
			'tourner à droite 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3';
		expect(jugerProgrammeTortue(autreChemin, CARRE_DROITE, 'position').juste).toBe(true);
	});

	it('côtés faits en plusieurs fois : juste', () => {
		const morceaux = 'répéter 4 [ avancer 1 ; avancer 2 ; tourner à droite 90 ]';
		expect(jugerProgrammeTortue(morceaux, CARRE_DROITE, 'position').juste).toBe(true);
	});

	it('le carré de l’autre côté (à gauche) : faux, la figure n’est pas au même endroit', () => {
		const gauche = 'répéter 4 [ avancer 3 ; tourner à gauche 90 ]';
		expect(jugerProgrammeTortue(gauche, CARRE_DROITE, 'position').juste).toBe(false);
	});

	it('un côté de moins, ou un carré plus grand : faux', () => {
		expect(
			jugerProgrammeTortue(
				'répéter 3 [ avancer 3 ; tourner à droite 90 ]',
				CARRE_DROITE,
				'position'
			).juste
		).toBe(false);
		expect(
			jugerProgrammeTortue(
				'répéter 4 [ avancer 4 ; tourner à droite 90 ]',
				CARRE_DROITE,
				'position'
			).juste
		).toBe(false);
	});

	it('figure qui sort du quadrillage : jugée sur tout son tracé', () => {
		const grand = 'répéter 4 [ avancer 15 ; tourner à droite 90 ]';
		expect(jugerProgrammeTortue(grand, grand, 'position').juste).toBe(true);
	});
});

describe('jugerProgrammeTortue — comparer: forme', () => {
	it('le carré tourné à gauche : juste', () => {
		const gauche = 'répéter 4 [ avancer 3 ; tourner à gauche 90 ]';
		expect(jugerProgrammeTortue(gauche, CARRE_DROITE, 'forme').juste).toBe(true);
	});

	it('déplacé (stylo levé avant) : juste', () => {
		const deplace = `lever le stylo ; avancer 2 ; baisser le stylo ; ${CARRE_DROITE}`;
		expect(jugerProgrammeTortue(deplace, CARRE_DROITE, 'forme').juste).toBe(true);
		expect(jugerProgrammeTortue(deplace, CARRE_DROITE, 'position').juste).toBe(false);
	});

	it('figure tournée d’un quart de tour ou retournée : juste', () => {
		const L = 'avancer 4 ; tourner à gauche 90 ; avancer 2';
		const quartDeTour = 'tourner à gauche 90 ; avancer 4 ; tourner à gauche 90 ; avancer 2';
		const retourne = 'avancer 4 ; tourner à droite 90 ; avancer 2';
		expect(jugerProgrammeTortue(quartDeTour, L, 'forme').juste).toBe(true);
		expect(jugerProgrammeTortue(retourne, L, 'forme').juste).toBe(true);
	});

	it('triangle équilatéral pointe en haut ou en bas : juste', () => {
		const haut = 'répéter 3 [ avancer 4 ; tourner à gauche 120 ]';
		const bas = 'répéter 3 [ avancer 4 ; tourner à droite 120 ]';
		expect(jugerProgrammeTortue(bas, haut, 'forme').juste).toBe(true);
	});

	it('même nombre de côtés mais autre figure : faux', () => {
		const rectangle =
			'répéter 2 [ avancer 4 ; tourner à droite 90 ; avancer 2 ; tourner à droite 90 ]';
		expect(jugerProgrammeTortue(rectangle, CARRE_DROITE, 'forme').juste).toBe(false);
	});
});

describe('jugerProgrammeTortue — réponses à part', () => {
	it('programme vide : faux, sans message d’erreur', () => {
		expect(jugerProgrammeTortue('', CARRE_DROITE, 'position')).toEqual({ juste: false });
	});

	it('programme illisible : faux, avec le message', () => {
		const verdict = jugerProgrammeTortue('sauter 3', CARRE_DROITE, 'position');
		expect(verdict.juste).toBe(false);
		expect(verdict.message).toBeTruthy();
	});

	it('programme qui ne s’arrête pas : faux, avec le message de la tortue', () => {
		const verdict = jugerProgrammeTortue(
			'répéter 1000 [ répéter 1000 [ avancer 1 ] ]',
			CARRE_DROITE,
			'position'
		);
		expect(verdict.juste).toBe(false);
		expect(verdict.message).toContain('arrêté');
	});

	it('attendu illisible : jamais juste', () => {
		expect(jugerProgrammeTortue('avancer 1', 'sauter', 'position').juste).toBe(false);
	});
});

describe('lireProgrammeTortue', () => {
	it('rend les segments d’un programme lisible', () => {
		const lu = lireProgrammeTortue(CARRE_DROITE);
		expect(lu.ok).toBe(true);
		if (lu.ok) expect(lu.segments).toHaveLength(4);
	});

	it('message pour un programme illisible ou en erreur', () => {
		expect(lireProgrammeTortue('sauter')).toMatchObject({ ok: false });
		expect(lireProgrammeTortue('répéter 100000 [ avancer 1 ]')).toMatchObject({ ok: false });
	});
});
