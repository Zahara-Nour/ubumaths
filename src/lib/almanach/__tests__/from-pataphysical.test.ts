import { describe, expect, it } from 'vitest';
import {
	civilToPataphysical,
	fromPataphysicalDate,
	type CivilDate,
	type PataphysicalDateInput
} from '../calendar';

const MS_PER_DAY = 86_400_000;

/** Tous les jours grégoriens d'un An (du 23 août au 22 août suivant) */
function daysOfEraYear(eraYear: number): CivilDate[] {
	const startYear = eraYear + 1895;
	const out: CivilDate[] = [];
	for (let t = Date.UTC(startYear, 7, 23); t <= Date.UTC(startYear + 1, 7, 22); t += MS_PER_DAY) {
		const d = new Date(t);
		out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
	}
	return out;
}

/** Toutes les dates pataphysiques valides d'un An */
function pataphysicalDatesOf(eraYear: number, leap: boolean): PataphysicalDateInput[] {
	const out: PataphysicalDateInput[] = [];
	for (let month = 1; month <= 7; month++) {
		for (let day = 1; day <= 52; day++) out.push({ year: eraYear, month, day });
	}
	out.push({ year: eraYear, extraDay: 'cloche' });
	if (leap) out.push({ year: eraYear, extraDay: 'surnumeraire' });
	return out;
}

/** Forme d'entrée d'une date pataphysique calculée (mois 1-based) */
function asInput(c: CivilDate): PataphysicalDateInput {
	const p = civilToPataphysical(c.year, c.month, c.day);
	return p.kind === 'month'
		? { year: p.year, month: p.monthIndex + 1, day: p.day }
		: { year: p.year, extraDay: p.extraDay };
}

describe('fromPataphysicalDate — allers-retours sur des Ans complets', () => {
	it.each([
		['An 130 (normal)', 130, false],
		['An 132 (bissextile, contient 2028)', 132, true],
		['An 204 (contient 2100, non bissextile)', 204, false]
	])('%s', (_label, eraYear, leap) => {
		const days = daysOfEraYear(eraYear);
		expect(days).toHaveLength(leap ? 366 : 365);
		// grégorien → pataphysique → grégorien
		for (const d of days) expect(fromPataphysicalDate(asInput(d))).toEqual(d);
		// pataphysique → grégorien → pataphysique
		const dates = pataphysicalDatesOf(eraYear, leap);
		expect(dates).toHaveLength(days.length);
		for (const p of dates) expect(asInput(fromPataphysicalDate(p))).toEqual(p);
	});
});

describe('fromPataphysicalDate — cas nommés', () => {
	it('13 Lumenal An 130 → 22 mai 2026', () => {
		expect(fromPataphysicalDate({ year: 130, month: 6, day: 13 })).toEqual({
			year: 2026,
			month: 5,
			day: 22
		});
	});

	it('Surnuméraire An 132 → 18 mars 2028', () => {
		expect(fromPataphysicalDate({ year: 132, extraDay: 'surnumeraire' })).toEqual({
			year: 2028,
			month: 3,
			day: 18
		});
	});

	it('Cloche An 130 → 22 août 2026', () => {
		expect(fromPataphysicalDate({ year: 130, extraDay: 'cloche' })).toEqual({
			year: 2026,
			month: 8,
			day: 22
		});
	});

	it('35 Déglaçose An 132 → 29 février 2028', () => {
		expect(fromPataphysicalDate({ year: 132, month: 4, day: 35 })).toEqual({
			year: 2028,
			month: 2,
			day: 29
		});
	});
});

describe('fromPataphysicalDate — erreurs', () => {
	it('An 131 n’a pas de Surnuméraire', () => {
		expect(() => fromPataphysicalDate({ year: 131, extraDay: 'surnumeraire' })).toThrow(
			new RangeError('L’An 131 n’a pas de Surnuméraire')
		);
	});

	it.each([
		['jour 53', { year: 130, month: 1, day: 53 }],
		['jour 0', { year: 130, month: 1, day: 0 }],
		['mois 8', { year: 130, month: 8, day: 1 }],
		['mois 0', { year: 130, month: 0, day: 1 }],
		['An 0', { year: 0, month: 1, day: 1 }],
		['An 0 (Cloche)', { year: 0, extraDay: 'cloche' }],
		['jour non entier', { year: 130, month: 1, day: 1.5 }]
	] as [string, PataphysicalDateInput][])('%s : RangeError', (_label, input) => {
		expect(() => fromPataphysicalDate(input)).toThrow(RangeError);
	});
});

describe('formatGregorianWithWeekday', () => {
	it('vendredi 22 mai 2026, samedi 1ᵉʳ janvier 2028, mardi 29 février 2028', async () => {
		const { formatGregorianWithWeekday } = await import('../calendar');
		expect(formatGregorianWithWeekday({ year: 2026, month: 5, day: 22 })).toBe(
			'vendredi 22 mai 2026'
		);
		expect(formatGregorianWithWeekday({ year: 2028, month: 1, day: 1 })).toBe(
			'samedi 1ᵉʳ janvier 2028'
		);
		expect(formatGregorianWithWeekday({ year: 2028, month: 2, day: 29 })).toBe(
			'mardi 29 février 2028'
		);
	});
});
