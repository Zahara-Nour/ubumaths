/**
 * Longue absence de l'élève : son Palotin est triste au retour
 * =============================================================
 *
 * Décidé par David le 2026-10-21 (docs/wip/palotins-absence-progress.md) :
 * « triste » quand l'élève revient 21 jours ou plus après son dernier passage
 * (14 attraperait les petites vacances). Jour UTC, comme la Constance Royale.
 *
 * Présence notée sur toute page vue (docs/wip/palotins-presence-progress.md) :
 * le retour est souvent détecté loin du Palotin ; il est fêté à la première
 * apparition du Palotin dans les 7 jours, puis oublié.
 */

// Constantes

/** Écart minimal, en jours, entre deux passages pour que le Palotin soit triste. */
export const LONG_ABSENCE_DAYS = 21;

/** Jours pendant lesquels un retour reste à fêter (jour du retour compris). */
export const WELCOME_BACK_DAYS = 7;

const DAY_MS = 86_400_000;

// Functions

/** Jours UTC de `from` à `to` (`YYYY-MM-DD`) ; null si l'un est illisible. */
function daysBetween(from: string, to: string): number | null {
	const start = Date.parse(`${from}T00:00:00Z`);
	const end = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(start) || Number.isNaN(end)) return null;
	return Math.round((end - start) / DAY_MS);
}

/**
 * Vrai si `today` (jour UTC `YYYY-MM-DD`) arrive au moins `LONG_ABSENCE_DAYS`
 * jours après `previousVisit`. Faux au tout premier passage (`null`), ou si
 * l'un des deux jours est illisible.
 */
export function isLongAbsence(previousVisit: string | null, today: string): boolean {
	if (previousVisit === null) return false;
	const days = daysBetween(previousVisit, today);
	return days !== null && days >= LONG_ABSENCE_DAYS;
}

/**
 * Vrai si le retour du jour `welcomeBackOn` est encore à fêter `today` : du
 * jour du retour aux `WELCOME_BACK_DAYS - 1` jours suivants. Faux sans retour
 * (`null`), au-delà, pour un jour à venir ou illisible.
 */
export function isWelcomeBackDue(welcomeBackOn: string | null, today: string): boolean {
	if (welcomeBackOn === null) return false;
	const days = daysBetween(welcomeBackOn, today);
	return days !== null && days >= 0 && days < WELCOME_BACK_DAYS;
}
