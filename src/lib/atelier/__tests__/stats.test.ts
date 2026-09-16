/**
 * Les statistiques d'une liste, et l'ajustement affine de deux listes.
 *
 * ⚠️ Calculés **côté atelier** (décision Q2) et non repris de `.stats` : la
 * commande rend du TEXTE — « Moyenne (mean): 12 », sans accent et à moitié en
 * anglais — et le relire est interdit depuis le lot 3. Elle ne rend pas non plus
 * l'étendue, que le §4 N2 promet.
 *
 * ⚠️ **Diviseur `n`, pas `n − 1`** (tranché par David le 2026-09-16) : c'est la
 * variance descriptive du programme français, celle de la touche σₓ des
 * calculatrices. Le moteur, lui, rend l'estimateur d'échantillon.
 */

import { describe, it, expect } from 'vitest';
import { describeList, fitAffine } from '../stats';

describe('décrire une série', () => {
	it('donne tout ce que le §4 N2 promet', () => {
		const s = describeList([12, 15, 9, 20, 15]);

		expect(s).not.toBeNull();
		expect(s!.count).toBe(5);
		expect(s!.mean).toBeCloseTo(14.2, 6);
		expect(s!.median).toBe(15);
		expect(s!.min).toBe(9);
		expect(s!.max).toBe(20);
		expect(s!.range).toBe(11);
	});

	// ⚠️ Le diviseur, c'est LE point : 12 ; 15 ; 9 donne 6 et non 9
	it('calcule la variance de population, pas celle d’échantillon', () => {
		const s = describeList([12, 15, 9]);

		expect(s!.variance).toBeCloseTo(6, 6);
		expect(s!.deviation).toBeCloseTo(Math.sqrt(6), 6);
	});

	it('prend la médiane entre les deux valeurs centrales quand l’effectif est pair', () => {
		expect(describeList([1, 2, 3, 4])!.median).toBe(2.5);
	});

	it('ne suppose pas la série triée', () => {
		const s = describeList([20, 9, 15]);

		expect(s!.median).toBe(15);
		expect(s!.min).toBe(9);
		expect(s!.max).toBe(20);
	});

	// §4 L3
	it('accepte une série d’une seule valeur', () => {
		const s = describeList([7]);

		expect(s!.mean).toBe(7);
		expect(s!.median).toBe(7);
		expect(s!.range).toBe(0);
		expect(s!.deviation).toBe(0);
	});

	// §4 L2 : pas d'erreur, une absence
	it('ne décrit pas une série vide', () => {
		expect(describeList([])).toBeNull();
	});

	it('supporte les décimaux', () => {
		expect(describeList([1.5, 2.5])!.mean).toBeCloseTo(2, 6);
	});
});

describe('ajuster une droite sur deux séries', () => {
	it('trouve la droite exacte quand les points sont alignés', () => {
		const fit = fitAffine([1, 2, 3, 4], [2, 4, 6, 8]);

		expect(fit.ok).toBe(true);
		expect(fit.ok && fit.slope).toBeCloseTo(2, 6);
		expect(fit.ok && fit.intercept).toBeCloseTo(0, 6);
		expect(fit.ok && fit.r2).toBeCloseTo(1, 6);
	});

	it('ajuste un nuage approximatif et mesure la qualité', () => {
		const fit = fitAffine([1, 2, 3], [2, 5, 7]);

		expect(fit.ok).toBe(true);
		expect(fit.ok && fit.slope).toBeCloseTo(2.5, 4);
		expect(fit.ok && fit.r2).toBeLessThan(1);
		expect(fit.ok && fit.r2).toBeGreaterThan(0.9);
	});

	// §4 L1 : seules les paires complètes comptent, et on le dit
	it('n’utilise que les paires complètes, et compte ce qu’elle écarte', () => {
		const fit = fitAffine([1, 2, 3, 4, 5], [2, 4, 6]);

		expect(fit.ok).toBe(true);
		expect(fit.ok && fit.used).toBe(3);
		expect(fit.ok && fit.ignored).toBe(2);
	});

	// §4 L3
	it('refuse avec moins de deux points', () => {
		const fit = fitAffine([1], [2]);

		expect(fit.ok).toBe(false);
		expect(fit.ok === false && fit.message).toMatch(/deux/i);
	});

	// §3 L2 de la vue Données : pente infinie
	it('refuse des points alignés verticalement, en français', () => {
		const fit = fitAffine([2, 2, 2], [1, 5, 9]);

		expect(fit.ok).toBe(false);
		expect(fit.ok === false && fit.message).not.toMatch(/NaN|Infinity/);
	});

	it('refuse deux séries vides', () => {
		expect(fitAffine([], []).ok).toBe(false);
	});

	// Une donnée légitime, pas une erreur (§3 E1 du nuage)
	it('accepte des ordonnées toutes identiques', () => {
		const fit = fitAffine([1, 2, 3], [4, 4, 4]);

		expect(fit.ok).toBe(true);
		expect(fit.ok && fit.slope).toBeCloseTo(0, 6);
	});
});
