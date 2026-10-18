/**
 * Constance Royale hebdomadaire — logique pure
 * =============================================
 *
 * Spécification validée par David le 2026-10-18 (docs/wip/palotin-boucle-progress.md, PR 4) :
 *
 * - semaine du lundi au dimanche, jour UTC (celui du plafond de `add_buddy_xp`) ;
 * - jour travaillé = jour où l'élève a gagné des pansées par le travail ;
 * - semaine TENUE au 3e jour travaillé (`CONSTANCE_DAYS_PER_WEEK`) ;
 * - Constance = semaines tenues d'affilée (`current_streak` / `longest_streak`,
 *   comptées en semaines) ;
 * - la semaine en cours ne casse rien avant sa fin ; une semaine finie sous
 *   3 jours remet la Constance à 0.
 *
 * Colonnes : `constance_week_start` (lundi de la semaine enregistrée),
 * `constance_days_this_week` (jours travaillés de cette semaine, 0 à 7) et
 * `last_activity_date` (dernier jour compté : un jour n'est compté qu'une fois).
 *
 * Une ligne sans `constance_week_start` porte une ANCIENNE série, comptée en
 * jours : elle repart de 0 (record compris), ces jours ne sont pas des semaines.
 *
 * Fonctions pures (aucune base, aucune horloge) : partagées par le serveur et
 * l'affichage. Les dates sont des jours `YYYY-MM-DD`.
 */

// Types
/** Ce que la Constance lit et écrit dans `student_buddies`. */
export interface ConstanceState {
	current_streak: number;
	longest_streak: number;
	last_activity_date: string | null;
	constance_week_start: string | null;
	constance_days_this_week: number;
}

/** Les cinq colonnes écrites en une fois pour un jour travaillé. */
export type ConstancePatch = ConstanceState & {
	constance_week_start: string;
	last_activity_date: string;
};

/** Un jour travaillé compté. */
export interface WorkedDayStep {
	patch: ConstancePatch;
	/** Vrai le jour où la semaine devient tenue (3e jour), une seule fois par semaine */
	weekHeld: boolean;
}

/** Remise à zéro au chargement : semaine manquée (`lost`, avec réplique) ou ancienne série. */
export type ConstanceReset =
	| { kind: 'lost'; patch: { current_streak: 0 } }
	| { kind: 'legacy'; patch: { current_streak: 0; longest_streak: 0 } };

// Constantes
/** Jours travaillés qui tiennent une semaine. */
export const CONSTANCE_DAYS_PER_WEEK = 3;

/** Maximum de `constance_days_this_week` (contrainte de la colonne). */
const MAX_DAYS_PER_WEEK = 7;

const DAY_MS = 86_400_000;

// Functions

/** Jour UTC d'un instant (`YYYY-MM-DD`). */
export function utcDay(date: Date = new Date()): string {
	return date.toISOString().split('T')[0];
}

/** Jour décalé de `days` jours (UTC). */
function addDays(day: string, days: number): string {
	return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

/** Lundi de la semaine (ISO, UTC) qui contient ce jour. */
export function weekStartOf(day: string): string {
	const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = dimanche
	return addDays(day, -((weekday + 6) % 7));
}

/** Ancienne série (en jours) : aucune semaine enregistrée. */
function isLegacy(state: ConstanceState): boolean {
	return state.constance_week_start === null;
}

/**
 * La Constance enregistrée tient-elle encore pour la semaine de `today` ?
 * Oui si la semaine enregistrée EST celle de `today` (en cours, rien ne casse),
 * ou si c'est la semaine précédente et qu'elle a été tenue.
 */
function constanceStillHolds(state: ConstanceState, today: string): boolean {
	const thisWeek = weekStartOf(today);
	if (state.constance_week_start === thisWeek) return true;
	return (
		state.constance_week_start === addDays(thisWeek, -7) &&
		state.constance_days_this_week >= CONSTANCE_DAYS_PER_WEEK
	);
}

/** `today` est-il déjà compté comme jour travaillé ? */
export function isDayCounted(state: ConstanceState, today: string): boolean {
	// Une ancienne série a pu marquer ce jour sans le compter
	return !isLegacy(state) && state.last_activity_date === today;
}

/**
 * Compte `today` comme jour travaillé. Rend null si ce jour est déjà compté
 * (deuxième crédit du même jour). Le patch porte les cinq colonnes, à écrire
 * en une seule fois.
 */
export function applyWorkedDay(state: ConstanceState, today: string): WorkedDayStep | null {
	if (isDayCounted(state, today)) return null;
	const legacy = isLegacy(state);

	const thisWeek = weekStartOf(today);
	const sameWeek = state.constance_week_start === thisWeek;
	const baseStreak = !legacy && constanceStillHolds(state, today) ? state.current_streak : 0;
	const baseLongest = legacy ? 0 : state.longest_streak;
	const days = Math.min(MAX_DAYS_PER_WEEK, (sameWeek ? state.constance_days_this_week : 0) + 1);

	const weekHeld = days === CONSTANCE_DAYS_PER_WEEK;
	const currentStreak = weekHeld ? baseStreak + 1 : baseStreak;

	return {
		patch: {
			constance_week_start: thisWeek,
			constance_days_this_week: days,
			current_streak: currentStreak,
			longest_streak: Math.max(baseLongest, currentStreak),
			last_activity_date: today
		},
		weekHeld
	};
}

/**
 * Remise à zéro au chargement du tableau de bord, ou null s'il n'y a rien à
 * écrire. `lost` : la dernière semaine enregistrée est finie sans être tenue
 * (ou une semaine a été sautée). `legacy` : ancienne série en jours.
 */
export function constanceReset(state: ConstanceState, today: string): ConstanceReset | null {
	if (isLegacy(state)) {
		return state.current_streak > 0 || state.longest_streak > 0
			? { kind: 'legacy', patch: { current_streak: 0, longest_streak: 0 } }
			: null;
	}
	if (state.current_streak <= 0 || constanceStillHolds(state, today)) return null;
	return { kind: 'lost', patch: { current_streak: 0 } };
}

/** Constance affichée : 0 si elle est perdue mais pas encore remise à zéro. */
export function displayedConstance(state: ConstanceState, today: string): number {
	return !isLegacy(state) && constanceStillHolds(state, today) ? state.current_streak : 0;
}

/** Jours travaillés de la semaine de `today`, plafonnés à 3 (« x jours sur 3 »). */
export function displayedDaysThisWeek(state: ConstanceState, today: string): number {
	if (state.constance_week_start !== weekStartOf(today)) return 0;
	return Math.min(CONSTANCE_DAYS_PER_WEEK, state.constance_days_this_week);
}
