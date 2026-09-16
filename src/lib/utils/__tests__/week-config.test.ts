import { describe, test, expect } from 'vitest';
import {
	DEFAULT_WEEK_CONFIG,
	getLastDayOfWeek,
	isSchoolDay,
	getSchoolDays,
	getOrderedSchoolDays,
	getWeekendDays,
	isValidWeekConfig,
	type WeekConfig
} from '../week-config';

describe('DEFAULT_WEEK_CONFIG', () => {
	// Le défaut décrit la semaine FRANÇAISE : c'est le repli d'une école sans
	// configuration, et un défaut dimanche→jeudi rendait le vendredi chômé
	// partout où il servait de secours.
	test('décrit la semaine française', () => {
		expect(DEFAULT_WEEK_CONFIG.first_day).toBe(1); // lundi
		expect(DEFAULT_WEEK_CONFIG.last_day).toBe(0); // dimanche (fin de semaine)
		expect(DEFAULT_WEEK_CONFIG.school_days).toEqual([1, 2, 3, 4, 5]); // lun-ven
		expect(DEFAULT_WEEK_CONFIG.weekend_days).toEqual([0, 6]); // dim + sam
	});

	test('le vendredi est un jour de classe', () => {
		expect(isSchoolDay(5, DEFAULT_WEEK_CONFIG)).toBe(true);
	});

	test('passes validation', () => {
		expect(isValidWeekConfig(DEFAULT_WEEK_CONFIG)).toBe(true);
	});
});

describe('getLastDayOfWeek', () => {
	test('returns last day from config', () => {
		expect(getLastDayOfWeek(DEFAULT_WEEK_CONFIG)).toBe(0);
	});

	test('works with custom week config', () => {
		const westernConfig: WeekConfig = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(getLastDayOfWeek(westernConfig)).toBe(0);
	});
});

describe('isSchoolDay', () => {
	test('returns true for school days (Mon-Fri)', () => {
		expect(isSchoolDay(1, DEFAULT_WEEK_CONFIG)).toBe(true); // lundi
		expect(isSchoolDay(2, DEFAULT_WEEK_CONFIG)).toBe(true); // mardi
		expect(isSchoolDay(3, DEFAULT_WEEK_CONFIG)).toBe(true); // mercredi
		expect(isSchoolDay(4, DEFAULT_WEEK_CONFIG)).toBe(true); // jeudi
		expect(isSchoolDay(5, DEFAULT_WEEK_CONFIG)).toBe(true); // vendredi
	});

	test('returns false for weekend days (Sat-Sun)', () => {
		expect(isSchoolDay(6, DEFAULT_WEEK_CONFIG)).toBe(false); // samedi
		expect(isSchoolDay(0, DEFAULT_WEEK_CONFIG)).toBe(false); // dimanche
	});

	test('works with Western week (Mon-Fri)', () => {
		const westernConfig: WeekConfig = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(isSchoolDay(0, westernConfig)).toBe(false); // Sunday (weekend)
		expect(isSchoolDay(1, westernConfig)).toBe(true); // Monday
		expect(isSchoolDay(5, westernConfig)).toBe(true); // Friday
		expect(isSchoolDay(6, westernConfig)).toBe(false); // Saturday (weekend)
	});
});

describe('getSchoolDays', () => {
	test('returns array of school days', () => {
		expect(getSchoolDays(DEFAULT_WEEK_CONFIG)).toEqual([1, 2, 3, 4, 5]);
	});

	test('returns reference to school_days array', () => {
		const days = getSchoolDays(DEFAULT_WEEK_CONFIG);
		expect(days).toBe(DEFAULT_WEEK_CONFIG.school_days);
	});
});

describe('getWeekendDays', () => {
	test('returns array of weekend days', () => {
		expect(getWeekendDays(DEFAULT_WEEK_CONFIG)).toEqual([0, 6]);
	});

	test('returns reference to weekend_days array', () => {
		const days = getWeekendDays(DEFAULT_WEEK_CONFIG);
		expect(days).toBe(DEFAULT_WEEK_CONFIG.weekend_days);
	});
});

describe('isValidWeekConfig', () => {
	test('validates correct Israeli config', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(true);
	});

	test('validates correct Western config', () => {
		const config = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(isValidWeekConfig(config)).toBe(true);
	});

	test('rejects null', () => {
		expect(isValidWeekConfig(null)).toBe(false);
	});

	test('rejects undefined', () => {
		expect(isValidWeekConfig(undefined)).toBe(false);
	});

	test('rejects non-object', () => {
		expect(isValidWeekConfig('invalid')).toBe(false);
		expect(isValidWeekConfig(42)).toBe(false);
		expect(isValidWeekConfig(true)).toBe(false);
	});

	test('rejects missing first_day', () => {
		const config = {
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing last_day', () => {
		const config = {
			first_day: 0,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing school_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid first_day (< 0)', () => {
		const config = {
			first_day: -1,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid first_day (> 6)', () => {
		const config = {
			first_day: 7,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid last_day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: -1,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid last_day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 7,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects non-array school_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: 'invalid',
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects non-array weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: 'invalid'
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid school day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [-1, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid school day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 7],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid weekend day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [-1, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid weekend day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 7]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects overlapping school_days and weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 5], // Friday in both
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects incomplete week (missing days)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [6] // Missing day 5
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects week with duplicate days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 4], // Duplicate 4
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects config with extra days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 5],
			weekend_days: [5, 6] // 5 appears twice
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});
});

describe('getOrderedSchoolDays()', () => {
	test('orders the school days from the first day of the week', () => {
		// Occidental : la semaine commence lundi, les colonnes vont donc de lundi à vendredi.
		expect(
			getOrderedSchoolDays({
				first_day: 1,
				last_day: 0,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			})
		).toEqual([1, 2, 3, 4, 5]);
	});

	test('wraps around when the week starts late in the numbering', () => {
		// Moyen-Orient : samedi ouvre la semaine, donc Sam, Dim, Lun, Mar, Mer.
		expect(
			getOrderedSchoolDays({
				first_day: 6,
				last_day: 5,
				school_days: [6, 0, 1, 2, 3],
				weekend_days: [4, 5]
			})
		).toEqual([6, 0, 1, 2, 3]);
	});

	test('reorders a school_days array given out of order', () => {
		// La saisie par cases à cocher trie par numéro de jour, pas par ordre de semaine.
		expect(
			getOrderedSchoolDays({
				first_day: 6,
				last_day: 5,
				school_days: [0, 1, 2, 3, 6],
				weekend_days: [4, 5]
			})
		).toEqual([6, 0, 1, 2, 3]);
	});

	test('falls back to the default configuration when there is none', () => {
		expect(getOrderedSchoolDays(undefined)).toEqual([1, 2, 3, 4, 5]);
		expect(getOrderedSchoolDays(null)).toEqual([1, 2, 3, 4, 5]);
	});

	test('falls back to the default when the configuration lists no school day', () => {
		// Une config vide ne doit pas produire une grille sans colonne.
		expect(
			getOrderedSchoolDays({ first_day: 1, last_day: 0, school_days: [], weekend_days: [] })
		).toEqual([1, 2, 3, 4, 5]);
	});

	// Le repli sert à des écrans qui décident si « aujourd'hui » est travaillé :
	// il ne doit jamais rendre le vendredi chômé par défaut.
	test('le repli tient le vendredi pour travaillé', () => {
		expect(getOrderedSchoolDays(null)).toContain(5);
	});
});
