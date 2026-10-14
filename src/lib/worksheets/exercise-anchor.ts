/**
 * L'ancre d'un exercice de fiche dans une page (décision D6, 2026-10-13)
 * ====================================================================
 *
 * Une notification de signalement (côté élève) et la page de traitement du
 * signalement (côté prof) pointent vers UN exercice d'une fiche. L'ancre est
 * fondée sur `worksheet_exercises.id`, jamais sur le numéro : le numéro change
 * d'une copie à l'autre quand la fiche mélange ses exercices.
 *
 * @module worksheets/exercise-anchor
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const ANCHOR_PREFIX = 'exercice-';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Durée de la mise en évidence de l'exercice visé, en millisecondes */
export const ANCHOR_HIGHLIGHT_MS = 2500;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** L'attribut `id` de l'élément qui porte l'exercice de fiche */
export function exerciseAnchorId(worksheetExerciseId: string): string {
	return `${ANCHOR_PREFIX}${worksheetExerciseId}`;
}

/** Le fragment d'adresse (`#exercice-<id>`) qui vise l'exercice de fiche */
export function exerciseAnchorHash(worksheetExerciseId: string): string {
	return `#${exerciseAnchorId(worksheetExerciseId)}`;
}

/**
 * L'exercice de fiche visé par un fragment d'adresse, ou `null` si le
 * fragment n'est pas une ancre d'exercice (un identifiant, jamais un numéro).
 */
export function worksheetExerciseIdFromHash(hash: string): string | null {
	const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
	if (!fragment.startsWith(ANCHOR_PREFIX)) return null;
	const id = fragment.slice(ANCHOR_PREFIX.length);
	return UUID_PATTERN.test(id) ? id : null;
}

/**
 * Fait défiler la page jusqu'à l'exercice visé par le fragment, s'il est
 * affiché. Rend son identifiant (à mettre en évidence), sinon `null`.
 */
export function scrollToAnchoredExercise(hash: string): string | null {
	const id = worksheetExerciseIdFromHash(hash);
	if (!id) return null;
	const element = document.getElementById(exerciseAnchorId(id));
	if (!element) return null;
	element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	return id;
}
