/**
 * Longue absence de l'élève : son Palotin est triste au retour
 * =============================================================
 *
 * Décidé par David le 2026-10-21 (docs/wip/palotins-absence-progress.md) :
 * « triste » quand l'élève revient sur son tableau de bord 21 jours ou plus
 * après son dernier passage (14 attraperait les petites vacances). Jour UTC,
 * comme la Constance Royale.
 */

// Constantes

/** Écart minimal, en jours, entre deux passages pour que le Palotin soit triste. */
export const LONG_ABSENCE_DAYS = 21;

const DAY_MS = 86_400_000;

// Functions

/**
 * Vrai si `today` (jour UTC `YYYY-MM-DD`) arrive au moins `LONG_ABSENCE_DAYS`
 * jours après `previousVisit`. Faux au tout premier passage (`null`), ou si
 * l'un des deux jours est illisible.
 */
export function isLongAbsence(previousVisit: string | null, today: string): boolean {
	if (previousVisit === null) return false;
	const previous = Date.parse(`${previousVisit}T00:00:00Z`);
	const current = Date.parse(`${today}T00:00:00Z`);
	if (Number.isNaN(previous) || Number.isNaN(current)) return false;
	return current - previous >= LONG_ABSENCE_DAYS * DAY_MS;
}
