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
import { areEquivalent } from '../../equivalence';
import { withUnit, number } from '../../factory';
import { dimensionless } from '../../units/factory';

const t = (s: string) => toCustom(tidy(parseCustom(s)));
const simp = (s: string) => toCustom(simplify(parseCustom(s)).result);

describe('grandeurs numériques — l’unité adaptée, en décimal', () => {
	it.each([
		['12000[m]', '12[km]'],
		// Écart avec l'exemple du §D.3 (« 0,5 cm ») : on préfère une valeur ≥ 1 dans
		// une unité scolaire — 5 mm. L'exemple venait du parcours glouton du mode
		// `best`, qui rend aussi 5 m → 0,5 dam (revue du 2026-09-20, B1).
		['0.005[m]', '5[mm]'],
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

// =============================================================================
// Revue du 2026-09-20 — findings reproduits, chacun un test rouge avant correction
// =============================================================================

describe('B1 — unités scolaires seulement, valeur ≥ 1 préférée', () => {
	it.each([
		['5[m]', '5[m]'],
		['6[m]', '6[m]'],
		['15[m]', '15[m]'],
		['25[m]', '25[m]'],
		['300[m]', '300[m]'],
		['600[m]', '600[m]'],
		['999[m]', '999[m]'],
		['0.3[kg]', '300[g]'],
		['5[cm]', '5[cm]'],
		['30[s]', '30[s]'],
		['90[s]', '1.5[min]'],
		['2[mm]', '2[mm]'],
		['1/3[km]', '1/3[km]'],
		['7[j]', '7[j]'],
		['1[an]', '1[an]'],
		['48[h]', '2[j]'],
		['36[h]', '1.5[j]'],
		['400[j]', '400[j]']
	])('%s → %s (jamais dam, hm, dm, hg, dag, dg)', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('simplify rend la même chose', () => {
		expect(simp('5[m]')).toBe('5[m]');
		expect(simp('0.3[kg]')).toBe('300[g]');
	});
});

describe('I2 — volumes et aires : leurs familles', () => {
	it.each([
		['2500[mL]', '2.5[L]'],
		['1000[mL]', '1[L]'],
		['0.5[L]', '500[mL]'],
		['30000[cm^2]', '3[m^2]'],
		['2[m]*3[m]*4[m]', '24[m^3]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('simplify ne retombe pas en unité de base', () => {
		expect(simp('2500[mL]')).toBe('2.5[L]');
	});
});

describe('I3 — simplify garde l’unité écrite d’une température', () => {
	it('20[°C] reste 20[°C]', () => {
		expect(simp('20[°C]')).toBe('20[°C]');
	});

	it('30[°C]-20[°C] → 10[K] (différence de deux absolues)', () => {
		expect(simp('30[°C]-20[°C]')).toBe('10[K]');
	});

	it('tidy conserve la valeur d’une différence de températures', () => {
		const node = parseCustom('30[°C]-20[°C]');
		expect(areEquivalent(tidy(node), node)).toBe(true);
	});
});

describe('I4 — ce que tidy écrit se relit', () => {
	it('15[min] se relit en syntaxe maison', () => {
		const written = t('0.25[h]');
		expect(written).toBe('15[min]');
		expect(() => parseCustom(written)).not.toThrow();
		expect(toCustom(parseCustom(written))).toBe('15[min]');
	});
});

describe('I5 — une somme garde une seule unité par dimension', () => {
	it.each([
		['x[m]+2000[m]', 'x[m]+2000[m]'],
		['x[km]+500[m]', 'x[km]+0.5[km]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('I1 — une unité sans composant ne fait pas lever', () => {
	it('tidy et simplify rendent quelque chose', () => {
		const node = withUnit(number('5'), dimensionless());
		expect(() => tidy(node)).not.toThrow();
		expect(() => simplify(node)).not.toThrow();
	});
});
