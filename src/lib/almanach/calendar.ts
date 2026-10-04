/**
 * Almanach des Chiphres : conversion grégorien → date pataphysique.
 *
 * Source de vérité : docs/Chiphres/lore-pataphysique.md, section VIII
 * (corrigée le 2026-10-04).
 *
 * - L'An commence le 23 août ; An 1 = 23 août 1896 (An 130 = 23/08/2025 → 22/08/2026).
 * - 7 mois de 52 jours, toujours.
 * - La Cloche du Grand Reset : jour hors-mois, le 22 août, chaque année.
 * - Années bissextiles (règle grégorienne complète) : Le Surnuméraire, jour
 *   hors-mois le 18 mars, entre le 52 Déglaçose (17 mars) et le 1 Auroral.
 *   Le 29 février est alors le 35 Déglaçose.
 *
 * Fonctions pures, sans dépendance : utilisées par l'accueil et par /almanach.
 *
 * @module almanach/calendar
 */

// =============================================================================
// Types
// =============================================================================

export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ExtraDay = 'cloche' | 'surnumeraire';

/** Jour civil grégorien (mois de 1 à 12) */
export interface CivilDate {
	year: number;
	month: number;
	day: number;
}

export interface Feast {
	id: string;
	name: string;
	monthIndex: MonthIndex;
	day: number;
	/** Date grégorienne telle que le Compendium l'écrit */
	gregorian: string;
	/** Province qui la célèbre, ou null pour une fête du Royaume entier */
	province: string | null;
	/** Fête canon Jarry (personnage strictement canonique) ou invention Chiphre */
	canon: boolean;
}

export type PataphysicalDate =
	| {
			kind: 'month';
			/** An de l'Ère du Royaume (An 130 = 2025-2026) */
			year: number;
			monthIndex: MonthIndex;
			monthName: MonthName;
			day: number;
			feast: Feast | null;
	  }
	| {
			kind: 'extra-day';
			/** An de l'Ère du Royaume */
			year: number;
			extraDay: ExtraDay;
			feast: null;
	  };

/** Date pataphysique à convertir vers le grégorien (mois de 1 à 7) */
export type PataphysicalDateInput =
	| { year: number; month: number; day: number }
	| { year: number; extraDay: ExtraDay };

// =============================================================================
// Constantes
// =============================================================================

export const MONTH_NAMES = [
	'Ambraire',
	'Givraire',
	'Glaglavose',
	'Déglaçose',
	'Auroral',
	'Lumenal',
	'Auguste'
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

export const DAYS_PER_MONTH = 52;

/** Année grégorienne dont le 23 août ouvre l'An 1 E.R. */
const EPOCH_YEAR = 1896;

/** Rang (0-based depuis le 23 août) du Surnuméraire les années bissextiles */
const SURNUMERAIRE_RANK = 4 * DAYS_PER_MONTH; // 208 : le jour après le 52 Déglaçose

/** Rang de la Cloche, une fois le Surnuméraire retiré */
const CLOCHE_RANK = 7 * DAYS_PER_MONTH; // 364

const MS_PER_DAY = 86_400_000;

export const EXTRA_DAY_NAMES: Record<ExtraDay, string> = {
	cloche: 'La Cloche du Grand Reset',
	surnumeraire: 'Le Surnuméraire'
};

/** Fêtes datées de l'Almanach (section VIII), dans l'ordre de l'An */
export const FEASTS: readonly Feast[] = [
	{
		id: 'empochaille',
		name: 'La Grande Empochaille',
		monthIndex: 2,
		day: 18,
		gregorian: '22 décembre',
		province: 'Nombrilie',
		canon: false
	},
	{
		id: 'bougrelas',
		name: 'La Restauration de Bougrelas',
		monthIndex: 3,
		day: 35,
		gregorian: '1ᵉʳ mars (29 février les années bissextiles)',
		province: 'Yoyolande',
		canon: false
	},
	{
		id: 'phynanche',
		name: 'La Phynanche Pataphysique',
		monthIndex: 4,
		day: 14,
		gregorian: '1ᵉʳ avril',
		province: null,
		canon: false
	},
	{
		id: 'cheval-a-phynances',
		name: 'Le Jubilé du Cheval à Phynances',
		monthIndex: 4,
		day: 17,
		gregorian: '4 avril',
		province: 'Pifométrie',
		canon: false
	}
];

const UNITS = [
	'',
	'un',
	'deux',
	'trois',
	'quatre',
	'cinq',
	'six',
	'sept',
	'huit',
	'neuf',
	'dix',
	'onze',
	'douze',
	'treize',
	'quatorze',
	'quinze',
	'seize'
];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante'];

// =============================================================================
// Calendrier grégorien
// =============================================================================

/** Règle grégorienne complète : 2000 bissextile, 2100 non */
export function isGregorianLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Numéro de jour absolu d'un jour civil (indépendant de tout fuseau) */
function dayNumber({ year, month, day }: CivilDate): number {
	return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function fromDayNumber(n: number): CivilDate {
	const d = new Date(n * MS_PER_DAY);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Jour civil d'un instant dans un fuseau donné */
export function civilDateIn(date: Date, timeZone: string): CivilDate {
	if (Number.isNaN(date.getTime())) throw new RangeError('Date invalide');
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((p) => p.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
}

/** Année grégorienne dont le 23 août ouvre l'An donné */
function eraStartYear(eraYear: number): number {
	return eraYear + EPOCH_YEAR - 1;
}

// =============================================================================
// Conversion
// =============================================================================

function feastOn(monthIndex: MonthIndex, day: number): Feast | null {
	return FEASTS.find((f) => f.monthIndex === monthIndex && f.day === day) ?? null;
}

/**
 * Date pataphysique d'un jour civil grégorien.
 *
 * @throws RangeError si le jour n'existe pas (30 février, mois 13…) ou s'il
 *   précède l'Ère du Royaume (avant le 23 août 1896).
 */
export function civilToPataphysical(year: number, month: number, day: number): PataphysicalDate {
	const civil = { year, month, day };
	if (![year, month, day].every(Number.isInteger)) throw new RangeError('Date invalide');
	// Date.UTC normalise un jour inexistant (30/02 → 02/03) : on le détecte au retour
	const roundTrip = fromDayNumber(dayNumber(civil));
	if (roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day) {
		throw new RangeError(`Date invalide : ${year}-${month}-${day}`);
	}
	if (dayNumber(civil) < dayNumber({ year: EPOCH_YEAR, month: 8, day: 23 })) {
		throw new RangeError('Date antérieure à l’Ère du Royaume (23 août 1896)');
	}

	const startYear = month > 8 || (month === 8 && day >= 23) ? year : year - 1;
	const eraYear = startYear - EPOCH_YEAR + 1;
	// Le 29 février de l'An tombe dans l'année grégorienne qui suit son 23 août
	const leap = isGregorianLeapYear(startYear + 1);

	let rank = dayNumber(civil) - dayNumber({ year: startYear, month: 8, day: 23 });
	if (leap) {
		if (rank === SURNUMERAIRE_RANK) {
			return { kind: 'extra-day', year: eraYear, extraDay: 'surnumeraire', feast: null };
		}
		if (rank > SURNUMERAIRE_RANK) rank -= 1;
	}
	if (rank === CLOCHE_RANK) {
		return { kind: 'extra-day', year: eraYear, extraDay: 'cloche', feast: null };
	}

	const monthIndex = Math.floor(rank / DAYS_PER_MONTH) as MonthIndex;
	const dayInMonth = (rank % DAYS_PER_MONTH) + 1;
	return {
		kind: 'month',
		year: eraYear,
		monthIndex,
		monthName: MONTH_NAMES[monthIndex],
		day: dayInMonth,
		feast: feastOn(monthIndex, dayInMonth)
	};
}

/**
 * Date pataphysique d'un instant, lue dans le fuseau donné (Paris par défaut :
 * à 23 h 30 UTC le 22 août, Paris est déjà au 1 Ambraire).
 */
export function toPataphysicalDate(date: Date, timeZone = 'Europe/Paris'): PataphysicalDate {
	const { year, month, day } = civilDateIn(date, timeZone);
	return civilToPataphysical(year, month, day);
}

/** Premier et dernier jour grégoriens d'un mois de l'An donné */
export function monthGregorianRange(
	monthIndex: MonthIndex,
	eraYear: number
): { start: CivilDate; end: CivilDate } {
	const startYear = eraStartYear(eraYear);
	const origin = dayNumber({ year: startYear, month: 8, day: 23 });
	// Après le Surnuméraire, les rangs grégoriens sont décalés d'un jour
	const shift = isGregorianLeapYear(startYear + 1) && monthIndex >= 4 ? 1 : 0;
	const first = origin + monthIndex * DAYS_PER_MONTH + shift;
	return { start: fromDayNumber(first), end: fromDayNumber(first + DAYS_PER_MONTH - 1) };
}

/** Jour grégorien de la Cloche et, les années bissextiles, du Surnuméraire de l'An donné */
export function extraDayGregorian(day: ExtraDay, eraYear: number): CivilDate | null {
	const endYear = eraStartYear(eraYear) + 1;
	if (day === 'cloche') return { year: endYear, month: 8, day: 22 };
	return isGregorianLeapYear(endYear) ? { year: endYear, month: 3, day: 18 } : null;
}

/**
 * Conversion inverse : date pataphysique → jour civil grégorien.
 *
 * @throws RangeError si l'An est < 1, le mois hors de 1..7, le jour hors de
 *   1..52, ou si l'on demande le Surnuméraire d'un An qui n'en a pas.
 */
export function fromPataphysicalDate(input: PataphysicalDateInput): CivilDate {
	const { year } = input;
	if (!Number.isInteger(year) || year < 1) {
		throw new RangeError(`L’An ${year} n’existe pas : l’Ère du Royaume commence à l’An 1`);
	}
	if ('extraDay' in input) {
		const date = extraDayGregorian(input.extraDay, year);
		if (!date) throw new RangeError(`L’An ${year} n’a pas de Surnuméraire`);
		return date;
	}
	const { month, day } = input;
	if (!Number.isInteger(month) || month < 1 || month > MONTH_NAMES.length) {
		throw new RangeError(`Mois ${month} invalide : l’Almanach compte 7 mois`);
	}
	if (!Number.isInteger(day) || day < 1 || day > DAYS_PER_MONTH) {
		throw new RangeError(`Jour ${day} invalide : un mois compte ${DAYS_PER_MONTH} jours`);
	}
	const { start } = monthGregorianRange((month - 1) as MonthIndex, year);
	return fromDayNumber(dayNumber(start) + day - 1);
}

// =============================================================================
// Formateurs
// =============================================================================

/** Nombre de 1 à 59 en toutes lettres (orthographe traditionnelle) */
function cardinal(n: number): string {
	if (n <= 16) return UNITS[n];
	if (n < 20) return `dix-${UNITS[n - 10]}`;
	const tens = TENS[Math.floor(n / 10)];
	const unit = n % 10;
	if (unit === 0) return tens;
	if (unit === 1) return `${tens} et un`;
	return `${tens}-${UNITS[unit]}`;
}

/** Ordinal en toutes lettres : premier, deuxième, vingt et unième… */
export function ordinal(n: number): string {
	if (n === 1) return 'premier';
	const word = cardinal(n);
	if (word.endsWith('cinq')) return `${word}uième`;
	if (word.endsWith('neuf')) return `${word.slice(0, -1)}vième`;
	if (word.endsWith('e')) return `${word.slice(0, -1)}ième`;
	return `${word}ième`;
}

/** « de Lumenal », « d’Ambraire » */
function monthWithPreposition(name: MonthName): string {
	return /^[AEIOUYÉ]/i.test(name) ? `d’${name}` : `de ${name}`;
}

/** Format court (en-tête, tableau de bord) : « 13 Lumenal » */
export function formatShort(p: PataphysicalDate): string {
	return p.kind === 'extra-day' ? EXTRA_DAY_NAMES[p.extraDay] : `${p.day} ${p.monthName}`;
}

/** Format moyen (accueil, profil) : « 13 Lumenal, An 130 E.R. » */
export function formatMedium(p: PataphysicalDate): string {
	return `${formatShort(p)}, An ${p.year} E.R.`;
}

/** Format long (cérémonies) : « Le treizième jour du mois de Lumenal, An 130 de l’Ère du Royaume » */
export function formatLong(p: PataphysicalDate): string {
	const era = `An ${p.year} de l’Ère du Royaume`;
	if (p.kind === 'extra-day') return `${EXTRA_DAY_NAMES[p.extraDay]}, ${era}`;
	return `Le ${ordinal(p.day)} jour du mois ${monthWithPreposition(p.monthName)}, ${era}`;
}

/** Jour grégorien en français : « 1ᵉʳ juillet 2026 », ou sans l'année */
export function formatGregorian(date: CivilDate, withYear = true): string {
	const months = [
		'janvier',
		'février',
		'mars',
		'avril',
		'mai',
		'juin',
		'juillet',
		'août',
		'septembre',
		'octobre',
		'novembre',
		'décembre'
	];
	const day = date.day === 1 ? '1ᵉʳ' : String(date.day);
	const base = `${day} ${months[date.month - 1]}`;
	return withYear ? `${base} ${date.year}` : base;
}

/** Jour grégorien avec son jour de la semaine : « vendredi 22 mai 2026 » */
export function formatGregorianWithWeekday(date: CivilDate): string {
	const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
	const weekday = weekdays[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()];
	return `${weekday} ${formatGregorian(date)}`;
}
