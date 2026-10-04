import { describe, expect, it } from 'vitest';
import {
	FEASTS,
	MONTH_NAMES,
	civilToPataphysical,
	formatLong,
	formatMedium,
	formatShort,
	isGregorianLeapYear,
	monthGregorianRange,
	toPataphysicalDate,
	type PataphysicalDate
} from '../calendar';

/** Date à midi UTC : le même jour civil à Paris, quelle que soit la saison */
function noonUtc(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Résumé lisible d'une date pataphysique, pour des assertions compactes */
function label(p: PataphysicalDate): string {
	if (p.kind === 'extra-day') return `${p.extraDay} An ${p.year}`;
	return `${p.day} ${p.monthName} An ${p.year}`;
}

function at(year: number, month: number, day: number): string {
	return label(toPataphysicalDate(noonUtc(year, month, day)));
}

describe('toPataphysicalDate — repères du Compendium', () => {
	it('le 23 août ouvre l’An : 1 Ambraire', () => {
		expect(at(2025, 8, 23)).toBe('1 Ambraire An 130');
	});

	it('le 22 août 2026 est la Cloche de l’An 130', () => {
		const p = toPataphysicalDate(noonUtc(2026, 8, 22));
		expect(p).toMatchObject({ kind: 'extra-day', extraDay: 'cloche', year: 130 });
	});

	it('le 23 août 2026 ouvre l’An 131', () => {
		expect(at(2026, 8, 23)).toBe('1 Ambraire An 131');
	});

	it('le 22 mai 2026 est le 13 Lumenal An 130', () => {
		expect(at(2026, 5, 22)).toBe('13 Lumenal An 130');
	});

	it('le 8 septembre est le 17 Ambraire', () => {
		expect(at(2025, 9, 8)).toBe('17 Ambraire An 130');
		expect(at(2027, 9, 8)).toBe('17 Ambraire An 132');
	});

	it('l’An 1 commence le 23 août 1896', () => {
		expect(at(1896, 8, 23)).toBe('1 Ambraire An 1');
	});

	it('rend le mois par son index ET son nom', () => {
		const p = toPataphysicalDate(noonUtc(2026, 5, 22));
		expect(p).toMatchObject({ kind: 'month', monthIndex: 5, monthName: 'Lumenal', day: 13 });
	});
});

describe('toPataphysicalDate — premier et dernier jour de chaque mois', () => {
	// [mois, premier jour, dernier jour] en (mois grégorien, jour)
	const normal: [string, [number, number, number], [number, number, number]][] = [
		['Ambraire', [2026, 8, 23], [2026, 10, 13]],
		['Givraire', [2026, 10, 14], [2026, 12, 4]],
		['Glaglavose', [2026, 12, 5], [2027, 1, 25]],
		['Déglaçose', [2027, 1, 26], [2027, 3, 18]],
		['Auroral', [2027, 3, 19], [2027, 5, 9]],
		['Lumenal', [2027, 5, 10], [2027, 6, 30]],
		['Auguste', [2027, 7, 1], [2027, 8, 21]]
	];
	const leap: typeof normal = [
		['Ambraire', [2027, 8, 23], [2027, 10, 13]],
		['Givraire', [2027, 10, 14], [2027, 12, 4]],
		['Glaglavose', [2027, 12, 5], [2028, 1, 25]],
		['Déglaçose', [2028, 1, 26], [2028, 3, 17]],
		['Auroral', [2028, 3, 19], [2028, 5, 9]],
		['Lumenal', [2028, 5, 10], [2028, 6, 30]],
		['Auguste', [2028, 7, 1], [2028, 8, 21]]
	];

	it.each(normal)('année normale (An 131) — %s', (name, first, last) => {
		expect(at(...first)).toBe(`1 ${name} An 131`);
		expect(at(...last)).toBe(`52 ${name} An 131`);
	});

	it.each(leap)('année bissextile (An 132) — %s', (name, first, last) => {
		expect(at(...first)).toBe(`1 ${name} An 132`);
		expect(at(...last)).toBe(`52 ${name} An 132`);
	});
});

describe('toPataphysicalDate — Le Surnuméraire', () => {
	it('2028 : 29 février = 35 Déglaçose, 17 mars = 52, 18 mars hors-mois, 19 mars = 1 Auroral', () => {
		expect(at(2028, 2, 28)).toBe('34 Déglaçose An 132');
		expect(at(2028, 2, 29)).toBe('35 Déglaçose An 132');
		expect(at(2028, 3, 1)).toBe('36 Déglaçose An 132');
		expect(at(2028, 3, 17)).toBe('52 Déglaçose An 132');
		expect(at(2028, 3, 18)).toBe('surnumeraire An 132');
		expect(at(2028, 3, 19)).toBe('1 Auroral An 132');
		expect(at(2028, 8, 22)).toBe('cloche An 132');
	});

	it('2027 : le 18 mars est le 52 Déglaçose', () => {
		expect(at(2027, 3, 18)).toBe('52 Déglaçose An 131');
	});

	it('2100 n’est pas bissextile : pas de Surnuméraire', () => {
		expect(isGregorianLeapYear(2100)).toBe(false);
		expect(isGregorianLeapYear(2000)).toBe(true);
		expect(at(2100, 3, 18)).toBe('52 Déglaçose An 204');
		expect(at(2100, 3, 1)).toBe('35 Déglaçose An 204');
	});

	it('2000 est bissextile : Surnuméraire le 18 mars', () => {
		expect(at(2000, 3, 18)).toBe('surnumeraire An 104');
	});
});

describe('toPataphysicalDate — une année complète', () => {
	function wholeYear(startYear: number): string[] {
		const out: string[] = [];
		const end = Date.UTC(startYear + 1, 7, 22);
		for (let t = Date.UTC(startYear, 7, 23); t <= end; t += 86_400_000) {
			const d = new Date(t);
			out.push(at(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
		}
		return out;
	}

	it('année normale (An 131) : 365 jours, tous distincts', () => {
		const days = wholeYear(2026);
		expect(days).toHaveLength(365);
		expect(new Set(days).size).toBe(365);
		expect(days.filter((d) => d.startsWith('surnumeraire'))).toHaveLength(0);
		expect(days.filter((d) => d.startsWith('cloche'))).toHaveLength(1);
	});

	it('année bissextile (An 132) : 366 jours, tous distincts', () => {
		const days = wholeYear(2027);
		expect(days).toHaveLength(366);
		expect(new Set(days).size).toBe(366);
		expect(days.filter((d) => d.startsWith('surnumeraire'))).toHaveLength(1);
		expect(days.filter((d) => d.startsWith('cloche'))).toHaveLength(1);
		// Chaque mois compte 52 jours, toujours
		for (const name of MONTH_NAMES) {
			expect(days.filter((d) => d.split(' ')[1] === name)).toHaveLength(52);
		}
	});
});

describe('toPataphysicalDate — fuseau horaire', () => {
	it('23 h 30 UTC le 22 août 2026 est déjà le 23 août à Paris : 1 Ambraire An 131', () => {
		const instant = new Date('2026-08-22T23:30:00Z');
		expect(label(toPataphysicalDate(instant))).toBe('1 Ambraire An 131');
		expect(label(toPataphysicalDate(instant, 'UTC'))).toBe('cloche An 130');
	});

	it('23 h 30 UTC le 17 mars 2028 est le Surnuméraire à Paris', () => {
		const instant = new Date('2028-03-17T23:30:00Z');
		expect(label(toPataphysicalDate(instant))).toBe('surnumeraire An 132');
	});

	it('été (UTC+2) : 22 h 30 UTC le 22 août 2026 est déjà le 1 Ambraire An 131', () => {
		expect(label(toPataphysicalDate(new Date('2026-08-22T22:30:00Z')))).toBe('1 Ambraire An 131');
	});

	it('hiver (UTC+1) : 22 h 30 UTC le 1ᵉʳ janvier 2026 est encore le 1ᵉʳ janvier (28 Glaglavose)', () => {
		expect(label(toPataphysicalDate(new Date('2026-01-01T22:30:00Z')))).toBe(
			'28 Glaglavose An 130'
		);
	});

	// Passage à l'heure d'été le 29/03/2026 (02 h → 03 h) : minuit du 29 = 23 h UTC
	// le 28 (encore UTC+1), minuit du 30 = 22 h UTC le 29 (déjà UTC+2).
	it.each([
		['2026-03-28T22:59:00Z', '10 Auroral An 130'], // 23 h 59 le 28
		['2026-03-28T23:01:00Z', '11 Auroral An 130'], // 00 h 01 le 29
		['2026-03-29T21:59:00Z', '11 Auroral An 130'], // 23 h 59 le 29
		['2026-03-29T22:01:00Z', '12 Auroral An 130'], // 00 h 01 le 30
		// Retour à l'heure d'hiver le 25/10/2026 (03 h → 02 h) : minuit du 25 = 22 h UTC
		// le 24 (encore UTC+2), minuit du 26 = 23 h UTC le 25 (déjà UTC+1).
		['2026-10-24T21:59:00Z', '11 Givraire An 131'], // 23 h 59 le 24
		['2026-10-24T22:01:00Z', '12 Givraire An 131'], // 00 h 01 le 25
		['2026-10-25T22:59:00Z', '12 Givraire An 131'], // 23 h 59 le 25
		['2026-10-25T23:01:00Z', '13 Givraire An 131'] // 00 h 01 le 26
	])('changement d’heure : %s → %s à Paris', (iso, expected) => {
		expect(label(toPataphysicalDate(new Date(iso)))).toBe(expected);
	});

	it('refuse une date invalide', () => {
		expect(() => toPataphysicalDate(new Date('pas une date'))).toThrow(RangeError);
	});
});

describe('civilToPataphysical — dates hors de l’Almanach', () => {
	it.each([
		[2026, 2, 30],
		[2027, 2, 29],
		[2026, 13, 1],
		[2026, 0, 10],
		[2026, 4, 31],
		[2026, 5, 0],
		[2026, 5, 1.5]
	])('%i-%i-%s : RangeError (jour inexistant)', (y, m, d) => {
		expect(() => civilToPataphysical(y, m, d)).toThrow(RangeError);
	});

	it('avant le 23 août 1896 : RangeError ; le 23 août 1896 est le 1 Ambraire An 1', () => {
		expect(() => civilToPataphysical(1896, 8, 22)).toThrow(RangeError);
		expect(() => civilToPataphysical(1800, 1, 1)).toThrow(RangeError);
		expect(label(civilToPataphysical(1896, 8, 23))).toBe('1 Ambraire An 1');
	});
});

describe('fêtes', () => {
	function feastAt(year: number, month: number, day: number): string | null {
		const p = toPataphysicalDate(noonUtc(year, month, day));
		return p.kind === 'month' ? (p.feast?.id ?? null) : null;
	}

	it.each([
		['empochaille', 2025, 12, 22],
		['bougrelas', 2026, 3, 1],
		['phynanche', 2026, 4, 1],
		['cheval-a-phynances', 2026, 4, 4]
	])('%s tombe à sa date grégorienne', (id, y, m, d) => {
		expect(feastAt(y, m, d)).toBe(id);
	});

	it('la Restauration de Bougrelas est le 35 Déglaçose : 29 février en 2028, 1ᵉʳ mars en 2027', () => {
		expect(feastAt(2028, 2, 29)).toBe('bougrelas');
		expect(feastAt(2028, 3, 1)).toBeNull();
		expect(feastAt(2027, 3, 1)).toBe('bougrelas');
	});

	it('la table reprend les dates pataphysiques du Compendium', () => {
		const table = FEASTS.map((f) => `${f.id}:${f.day} ${MONTH_NAMES[f.monthIndex]}`);
		expect(table).toEqual([
			'empochaille:18 Glaglavose',
			'bougrelas:35 Déglaçose',
			'phynanche:14 Auroral',
			'cheval-a-phynances:17 Auroral'
		]);
	});

	it('un jour ordinaire n’a pas de fête', () => {
		expect(feastAt(2026, 5, 22)).toBeNull();
	});

	// Règle du lore (David, 2026-10-04) : rien n'est repris du calendrier du Collège de 'Pataphysique
	it('aucune fête reprise du Collège de ’Pataphysique', () => {
		const ids = FEASTS.map((f) => f.id);
		for (const id of ['nativite-jarry', 'bosse-de-nage', 'faustroll', 'polyedres']) {
			expect(ids).not.toContain(id);
		}
		for (const name of ['Nativité d’Alfred Jarry', 'Bosse-de-Nage', 'Faustroll', 'Polyèdres']) {
			expect(FEASTS.filter((f) => f.name.includes(name))).toEqual([]);
		}
	});

	it('les anciennes dates du Collège n’ont plus de fête', () => {
		expect(feastAt(2025, 9, 8)).toBeNull();
		expect(feastAt(2025, 10, 27)).toBeNull();
		expect(feastAt(2025, 11, 17)).toBeNull();
		expect(feastAt(2026, 4, 13)).toBeNull();
	});
});

describe('formateurs', () => {
	const lumenal = civilToPataphysical(2026, 5, 22);
	const cloche = civilToPataphysical(2026, 8, 22);
	const surnum = civilToPataphysical(2028, 3, 18);

	it('court', () => {
		expect(formatShort(lumenal)).toBe('13 Lumenal');
		expect(formatShort(cloche)).toBe('La Cloche du Grand Reset');
		expect(formatShort(surnum)).toBe('Le Surnuméraire');
	});

	it('moyen', () => {
		expect(formatMedium(lumenal)).toBe('13 Lumenal, An 130 E.R.');
		expect(formatMedium(cloche)).toBe('La Cloche du Grand Reset, An 130 E.R.');
		expect(formatMedium(surnum)).toBe('Le Surnuméraire, An 132 E.R.');
	});

	it('long, avec ordinal en toutes lettres et élision', () => {
		expect(formatLong(lumenal)).toBe(
			'Le treizième jour du mois de Lumenal, An 130 de l’Ère du Royaume'
		);
		expect(formatLong(civilToPataphysical(2025, 8, 23))).toBe(
			'Le premier jour du mois d’Ambraire, An 130 de l’Ère du Royaume'
		);
		expect(formatLong(civilToPataphysical(2027, 4, 8))).toBe(
			'Le vingt et unième jour du mois d’Auroral, An 131 de l’Ère du Royaume'
		);
		expect(formatLong(civilToPataphysical(2026, 8, 21))).toBe(
			'Le cinquante-deuxième jour du mois d’Auguste, An 130 de l’Ère du Royaume'
		);
		expect(formatLong(civilToPataphysical(2025, 10, 22))).toBe(
			'Le neuvième jour du mois de Givraire, An 130 de l’Ère du Royaume'
		);
		expect(formatLong(cloche)).toBe('La Cloche du Grand Reset, An 130 de l’Ère du Royaume');
	});
});

describe('monthGregorianRange', () => {
	it('Déglaçose finit le 18 mars en année normale, le 17 en bissextile', () => {
		expect(monthGregorianRange(3, 131)).toEqual({
			start: { year: 2027, month: 1, day: 26 },
			end: { year: 2027, month: 3, day: 18 }
		});
		expect(monthGregorianRange(3, 132).end).toEqual({ year: 2028, month: 3, day: 17 });
	});

	it('Auroral commence le 19 mars dans les deux cas', () => {
		expect(monthGregorianRange(4, 131).start).toEqual({ year: 2027, month: 3, day: 19 });
		expect(monthGregorianRange(4, 132).start).toEqual({ year: 2028, month: 3, day: 19 });
	});
});
