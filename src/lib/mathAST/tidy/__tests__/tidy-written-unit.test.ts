/**
 * `tidy` avec `unitChoice: 'written'` : l'unité écrite d'abord.
 *
 * Spécification : docs/wip/grandeurs-eval-progress.md, lot 1 (décision 3 de
 * David, 2026-09-27). Pour une grandeur numérique :
 * 1. l'unité écrite (premier terme d'une somme ; pour un produit, chaque
 *    dimension de base prend la première unité écrite) si la valeur y a une
 *    écriture décimale finie ;
 * 2. sinon le choix scolaire (§D.3 de tidy-phase0.md) ;
 * 3. sinon inchangé (fraction dans l'unité écrite) — l'appelant décide.
 *
 * Et dans les deux modes : un quotient de grandeurs de même dimension est un
 * nombre (`3[h]/1[min]` → 180).
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import type { TidyOptions } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { nodesEqual } from '../../normal/hash';

const WRITTEN: TidyOptions = { unitChoice: 'written' };

const latexWritten = (s: string) => toLatex(tidy(parseCustom(s), WRITTEN));
const customWritten = (s: string) => toCustom(tidy(parseCustom(s), WRITTEN));
const customSchool = (s: string) => toCustom(tidy(parseCustom(s)));

// La table validée par David (LaTeX : le séparateur décimal est celui du générateur).
const TABLE: ReadonlyArray<readonly [string, string]> = [
	['4*7[mm]', '28~\\unit{mm}'],
	['7[mm]*5[mm]', '35~\\unit{mm^2}'],
	['7[mm]*5[cm]', '350~\\unit{mm^2}'],
	['3[h]+20[min]', '200~\\unit{min}'],
	['20[min]+3[h]', '200~\\unit{min}'],
	['1[h]+45[min]+30[min]', '2.25~\\unit{h}'],
	['5[km]+3[m]', '5.003~\\unit{km}'],
	['120[km]/2[h]', '60~\\unit{km/h}'],
	['3[h]/1[min]', '180'],
	['10[km]/3', '\\dfrac{10}{3}~\\unit{km}']
];

describe("unitChoice: 'written' — la table du lot 1", () => {
	it.each(TABLE)('%s → %s', (input, expected) => {
		expect(latexWritten(input)).toBe(expected);
	});
});

describe("unitChoice: 'written' — l'unité écrite d'abord", () => {
	it.each([
		// L'ordre écrit décide, pas l'ordre de grandeur.
		['0.5[km]', '0.5[km]'],
		['7[cm]*5[mm]', '3.5[cm^2]'],
		['2[km]*500[m]', '1[km^2]'],
		['500[m]+2[km]', '2500[m]'],
		// Une dimension absente du premier terme prend la première unité écrite.
		['90[km/h]*2[h]', '180[km]'],
		// Pas d'écriture décimale finie dans l'unité écrite : repli scolaire.
		['1[h]+20[min]', '80[min]'],
		// Ni dans l'unité écrite ni en unité scolaire : inchangé.
		['100[km]/3[h]', '(100/3)[km/h]']
	])('%s → %s', (input, expected) => {
		expect(customWritten(input)).toBe(expected);
	});
});

describe("unitChoice: 'written' — cas limites", () => {
	it('valeur nulle : 0, sans unité, comme en mode scolaire', () => {
		expect(customWritten('0[mm]*5[cm]')).toBe('0');
		expect(customWritten('3[m]-3[m]')).toBe('0');
	});

	it('grandeur symbolique non concernée : unité composée mise au propre', () => {
		expect(customWritten('x[m]')).toBe('x[m]');
		expect(customWritten('x[m]+2000[m]')).toBe(customSchool('x[m]+2000[m]'));
		expect(customWritten('v[km/h]*t[h]')).toBe(customSchool('v[km/h]*t[h]'));
	});

	it('température non concernée : unité écrite, différence en K', () => {
		expect(customWritten('20[°C]')).toBe('20[°C]');
		expect(customWritten('30[°C]-20[°C]')).toBe(customSchool('30[°C]-20[°C]'));
	});

	it('dimensions incompatibles : laissées telles quelles', () => {
		expect(customWritten('5[m]+3[s]')).toBe('5[m]+3[s]');
	});

	it('une grandeur imbriquée (argument, parenthèses) suit la même option', () => {
		expect(customWritten('2*(3[h]+30[min])')).toBe('7[h]');
	});

	it.each([...TABLE.map(([input]) => input), '0.5[km]', '7[cm]*5[mm]', '1[h]+20[min]'])(
		'idempotent et équivalent : %s',
		(input) => {
			const once = tidy(parseCustom(input), WRITTEN);
			const twice = tidy(once, WRITTEN);
			expect(nodesEqual(twice, once)).toBe(true);
			expect(areEquivalent(once, parseCustom(input))).toBe(true);
		}
	);
});

describe('mode scolaire (défaut) — inchangé, sauf le quotient de même dimension', () => {
	it.each([
		['4*7[mm]', '2.8[cm]'],
		['7[mm]*5[cm]', '3.5[cm^2]'],
		['0.5[km]', '500[m]'],
		['1[h]+45[min]+30[min]', '2.25[h]']
	])('%s → %s (choix scolaire)', (input, expected) => {
		expect(customSchool(input)).toBe(expected);
		expect(toCustom(tidy(parseCustom(input), { unitChoice: 'school' }))).toBe(expected);
	});

	it.each([
		['3[h]/1[min]', '180'],
		['3[km]/1[m]', '3000'],
		['2[L]/4[mL]', '500'],
		['x[h]/y[min]', '{60x}/y']
	])('quotient de même dimension : %s → %s', (input, expected) => {
		expect(customSchool(input)).toBe(expected);
	});

	it('une unité sans dimension écrite seule reste écrite (pas de conversion)', () => {
		expect(customSchool('2[rad]')).toBe('2[rad]');
	});
});

// Relecture de #483 (écart A) : une somme regroupée passe par l'unité de base ;
// sans écriture décimale finie, la fraction revient dans l'unité ÉCRITE.
describe("unitChoice: 'written' — fraction dans l'unité écrite", () => {
	it.each([
		['3[h]*1[km/h]+20[min]*1[km/h]', '(10/3)[km]'],
		['1[km]+1[km]/3', '(4/3)[km]']
	])('%s → %s', (input, expected) => {
		expect(customWritten(input)).toBe(expected);
	});
});

// Relecture de #483 (écart B) : une même dimension au numérateur et au
// dénominateur (`min·km/h`) se convertit et se simplifie, dans les deux modes.
describe('unités de même dimension en haut et en bas — simplifiées (écart B)', () => {
	const SIMPLIFIED: ReadonlyArray<readonly [string, string]> = [
		['(1[h]+30[min])*60[km/h]', '90[km]'],
		['90[min]*60[km/h]', '90[km]'],
		['(3[h]+20[min])*1[km/h]', '(10/3)[km]'],
		['20[min]*1[km/h]', '(1/3)[km]'],
		['2[h]*3[km/min]', '360[km]']
	];

	it.each(SIMPLIFIED)('mode scolaire : %s → %s', (input, expected) => {
		expect(customSchool(input)).toBe(expected);
	});

	it.each(SIMPLIFIED)("mode 'written' : %s → %s", (input, expected) => {
		expect(customWritten(input)).toBe(expected);
	});

	it.each(SIMPLIFIED.map(([input]) => input))('idempotent et équivalent : %s', (input) => {
		for (const options of [undefined, WRITTEN]) {
			const once = tidy(parseCustom(input), options);
			expect(nodesEqual(tidy(once, options), once)).toBe(true);
			expect(areEquivalent(once, parseCustom(input))).toBe(true);
		}
	});
});
