/**
 * Les grandeurs dans `tidy` : l'unité adaptée à l'ordre de grandeur, en décimal.
 *
 * Contrat : docs/wip/tidy-phase0.md §D.3 (décision 3 de David, 2026-09-20).
 * Une grandeur NUMÉRIQUE est écrite dans l'unité qui place sa valeur entre
 * 0,1 et 1000 ; une grandeur symbolique garde une unité composée mise au propre ;
 * une température garde l'unité écrite.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { simplify } from '../../simplify';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';

const t = (s: string) => toCustom(tidy(parseCustom(s)));
const simp = (s: string) => toCustom(simplify(parseCustom(s)).result);

describe('grandeurs numériques — l’unité adaptée, en décimal', () => {
	it.each([
		['12000[m]', '12[km]'],
		['0.005[m]', '0.5[cm]'],
		['12[km]+500[m]', '12.5[km]'],
		['3600[s]', '1[h]'],
		['1500[g]', '1.5[kg]'],
		['90[km/h]*2[h]', '180[km]'],
		['2[km]*3[km]', '6[km^2]'],
		['12[km]', '12[km]'],
		['12[km]+3[km]', '15[km]'],
		['1[km]-999[m]', '1[m]'],
		['0.25[h]', '15[min]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('idempotent', () => {
		for (const input of ['12000[m]', '12[km]+500[m]', '90[km/h]*2[h]']) {
			const once = tidy(parseCustom(input));
			expect(toCustom(tidy(once))).toBe(toCustom(once));
		}
	});

	it('simplify rend la même écriture', () => {
		expect(simp('12[km]+500[m]')).toBe('12.5[km]');
		expect(simp('12000[m]')).toBe('12[km]');
	});
});

describe('grandeurs symboliques — unité composée mise au propre, pas de choix d’unité', () => {
	it.each([
		['x[m]', 'x[m]'],
		['v[km/h]*t[h]', 'tv[km]'],
		['2*x[m]', '2x[m]'],
		['x[m]+x[m]', '2x[m]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('températures — jamais de meilleure unité, l’écriture est conservée', () => {
	it.each([
		['20[°C]', '20[°C]'],
		['300[K]', '300[K]'],
		['20[°C]+5[°C]', '20[°C]+5[°C]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('unités composées sans famille — l’unité dérivée reconnue', () => {
	it('2[kg]*3[m/s^2] → 6[N]', () => {
		expect(t('2[kg]*3[m/s^2]')).toBe('6[N]');
	});
});
