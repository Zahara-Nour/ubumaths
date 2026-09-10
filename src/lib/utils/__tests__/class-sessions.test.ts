/**
 * Tests — dates de séance d'une classe
 *
 * Le calendrier de référence est celui de la classe `1SPE 1` en prod : cours le
 * jeudi (deux heures consécutives, donc deux lignes d'emploi du temps pour le
 * même jour), vacances de Toussaint du 17 octobre au 1er novembre 2026.
 */

import { describe, it, expect } from 'vitest';
import {
	computeSessionDates,
	isSessionDate,
	isWithinHoliday,
	parseIsoDate,
	toIsoDate,
	type HolidayPeriod
} from '../class-sessions';

// Jeudi = 4 (convention JS, 0 = dimanche).
const JEUDI = 4;
const LUNDI = 1;

const TOUSSAINT: HolidayPeriod = { startDate: '2026-10-17', endDate: '2026-11-01' };

const finAnnee = '2027-07-15';

describe('parseIsoDate', () => {
	it('lit une date ISO en UTC', () => {
		expect(parseIsoDate('2026-09-10')).toBe(Date.UTC(2026, 8, 10));
	});

	it('fait un aller-retour sans décalage de fuseau', () => {
		// Le piège qui décale d'un jour : `new Date('...')` parse en UTC, mais
		// `getDate()` lit en heure locale. L'aller-retour doit être stable.
		const ts = parseIsoDate('2026-09-10');
		expect(ts).not.toBeNull();
		expect(toIsoDate(ts as number)).toBe('2026-09-10');
	});

	it('refuse un jour qui n’existe pas', () => {
		// `Date.UTC(2026, 1, 30)` ne échoue pas : il bascule au 2 mars.
		expect(parseIsoDate('2026-02-30')).toBeNull();
	});

	it('refuse un format non ISO', () => {
		expect(parseIsoDate('10/09/2026')).toBeNull();
	});
});

describe('isWithinHoliday', () => {
	it('inclut le premier et le dernier jour de vacances', () => {
		expect(isWithinHoliday(Date.UTC(2026, 9, 17), [TOUSSAINT])).toBe(true);
		expect(isWithinHoliday(Date.UTC(2026, 10, 1), [TOUSSAINT])).toBe(true);
	});

	it('exclut la veille et le lendemain', () => {
		expect(isWithinHoliday(Date.UTC(2026, 9, 16), [TOUSSAINT])).toBe(false);
		expect(isWithinHoliday(Date.UTC(2026, 10, 2), [TOUSSAINT])).toBe(false);
	});

	it('ignore une période illisible au lieu de tout effacer', () => {
		const cassee: HolidayPeriod = { startDate: 'pas-une-date', endDate: '2026-11-01' };
		expect(isWithinHoliday(Date.UTC(2026, 9, 20), [cassee])).toBe(false);
	});
});

describe('computeSessionDates', () => {
	it('rend les jours de cours à venir', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-09-10',
			until: '2026-10-15'
		});
		expect(dates).toEqual(['2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08', '2026-10-15']);
	});

	it('exclut la date de la séance elle-même', () => {
		// Un devoir donné le jeudi n'est pas à rendre le jeudi même : les
		// échéances sont STRICTEMENT postérieures à la séance.
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-09-17',
			until: '2026-10-01'
		});
		expect(dates).toEqual(['2026-09-24', '2026-10-01']);
	});

	it('retire les jours de cours tombant en vacances', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-10-08',
			until: '2026-11-12',
			holidays: [TOUSSAINT]
		});
		// Les jeudis 22 et 29 octobre tombent dans les vacances de Toussaint.
		expect(dates).toEqual(['2026-10-15', '2026-11-05', '2026-11-12']);
	});

	it('gère plusieurs jours de cours par semaine', () => {
		const dates = computeSessionDates({
			weekdays: [LUNDI, JEUDI],
			after: '2026-09-10',
			until: '2026-09-24'
		});
		expect(dates).toEqual(['2026-09-14', '2026-09-17', '2026-09-21', '2026-09-24']);
	});

	it('ne compte qu’une fois un jour présent deux fois dans l’emploi du temps', () => {
		// Cas réel : `1SPE 1` a deux heures consécutives le jeudi, donc deux
		// lignes `class_schedules` pour le jour 4.
		const dates = computeSessionDates({
			weekdays: [JEUDI, JEUDI],
			after: '2026-09-10',
			until: '2026-09-24'
		});
		expect(dates).toEqual(['2026-09-17', '2026-09-24']);
	});

	it('rend une liste vide sans emploi du temps', () => {
		// Cas majoritaire en prod : trois classes actives sur quatre n'ont aucune
		// ligne d'emploi du temps. La page doit pouvoir le détecter.
		const dates = computeSessionDates({ weekdays: [], after: '2026-09-10', until: finAnnee });
		expect(dates).toEqual([]);
	});

	it('ignore un jour de semaine hors 0-6', () => {
		const dates = computeSessionDates({ weekdays: [9, -1], after: '2026-09-10', until: finAnnee });
		expect(dates).toEqual([]);
	});

	it('rend une liste vide quand la fin précède le début', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-09-10',
			until: '2026-09-01'
		});
		expect(dates).toEqual([]);
	});

	it('rend une liste vide sur une date illisible', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: 'la semaine prochaine',
			until: finAnnee
		});
		expect(dates).toEqual([]);
	});

	it('respecte la limite demandée', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-09-10',
			until: finAnnee,
			limit: 3
		});
		expect(dates).toEqual(['2026-09-17', '2026-09-24', '2026-10-01']);
	});

	it('plafonne par défaut sans parcourir toute l’année', () => {
		const dates = computeSessionDates({
			weekdays: [JEUDI],
			after: '2026-09-10',
			until: finAnnee
		});
		expect(dates).toHaveLength(30);
	});
});

describe('isSessionDate', () => {
	const emploiDuTemps = {
		weekdays: [JEUDI],
		after: '2026-09-10',
		until: finAnnee,
		holidays: [TOUSSAINT]
	};

	it('accepte un jour de cours', () => {
		expect(isSessionDate('2026-09-17', emploiDuTemps)).toBe(true);
	});

	it('refuse un jour sans cours', () => {
		expect(isSessionDate('2026-09-16', emploiDuTemps)).toBe(false);
	});

	it('refuse un jour de cours tombant en vacances', () => {
		expect(isSessionDate('2026-10-22', emploiDuTemps)).toBe(false);
	});

	it('refuse la date de la séance elle-même', () => {
		expect(isSessionDate('2026-09-10', emploiDuTemps)).toBe(false);
	});

	it('accepte une date valide au-delà de la limite d’affichage', () => {
		// Le menu est tronqué à 30 dates ; la RÈGLE, elle, ne l'est pas. Sinon un
		// devoir posé loin dans l'année serait refusé à l'enregistrement alors
		// qu'il tombe bien un jour de cours.
		const loin = computeSessionDates({ ...emploiDuTemps, limit: 40 })[39];
		expect(loin).toBeDefined();
		expect(isSessionDate(loin, emploiDuTemps)).toBe(true);
	});

	it('refuse une date au-delà de la fin d’année', () => {
		expect(isSessionDate('2027-07-22', emploiDuTemps)).toBe(false);
	});

	it('répond instantanément sur une fin d’année aberrante', () => {
		// `until` vient de `school_years.end_date`, saisi à la main : une faute de
		// frappe suffit. Énumérer jour par jour jusqu'en 9999 ferait quelques
		// millions de tours à CHAQUE échéance enregistrée — la vérification doit
		// décider, pas parcourir.
		const debut = performance.now();
		const verdict = isSessionDate('2026-09-17', { ...emploiDuTemps, until: '9999-06-30' });
		expect(verdict).toBe(true);
		expect(performance.now() - debut).toBeLessThan(50);
	});
});
