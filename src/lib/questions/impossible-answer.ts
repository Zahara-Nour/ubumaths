/**
 * Case « expression, ou bien : impossible » (chantier `reponse-impossible`, outil n° 51).
 *
 * Une case ordinaire qui porte `impossibleLabel` affiche, à côté d'elle, un bouton
 * (« pas factorisable »). L'élève tape une expression, ou clique le bouton quand la réponse
 * n'existe pas.
 * - Attendue : le prof écrit `impossible` (`IMPOSSIBLE_EXPECTED`) dans `expectedAnswer` sur les
 *   tirages sans réponse (souvent `{{if:delta<0|impossible|…}}`).
 * - Réponse de l'élève : le bouton cliqué écrit dans la case le LaTeX `\text{<texte du bouton>}`
 *   (`impossibleAnswerLatex`). C'est cette chaîne qui est enregistrée, et le prof la voit telle
 *   quelle dans ses résultats (« pas factorisable »).
 */

// ============================================================================
// Constantes
// ============================================================================

/** Réponse attendue d'un tirage sans réponse, écrite par le prof dans `expectedAnswer` */
export const IMPOSSIBLE_EXPECTED = 'impossible';

/** Texte du bouton proposé par défaut dans le formulaire du prof */
export const DEFAULT_IMPOSSIBLE_LABEL = 'impossible';

/** Longueur maximale du texte du bouton */
export const IMPOSSIBLE_LABEL_MAX = 40;

/**
 * Texte du bouton autorisé : lettres (accents compris), espaces, apostrophes, traits d'union.
 * Rien qui casse le `\text{…}` (ni accolade, ni barre oblique inverse).
 */
export const IMPOSSIBLE_LABEL_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u;

// ============================================================================
// Functions
// ============================================================================

/** LaTeX écrit dans la case quand l'élève clique le bouton (`\text{pas factorisable}`) */
export function impossibleAnswerLatex(label: string): string {
	return `\\text{${label.trim()}}`;
}

/** L'attendue de ce tirage dit-elle « pas de réponse » ? */
export function isImpossibleExpected(expected: string | undefined): boolean {
	return expected?.trim() === IMPOSSIBLE_EXPECTED;
}

/**
 * La réponse de l'élève est-elle le bouton ? Espaces de MathLive ignorés
 * (`\text{pas factorisable}`, `\text{pas\ factorisable}`, espaces autour).
 */
export function isImpossibleAnswer(answer: string | undefined, label: string): boolean {
	if (answer === undefined) return false;
	const normaliser = (latex: string) => latex.replace(/\\ /g, ' ').replace(/\s+/g, ' ').trim();
	return normaliser(answer) === normaliser(impossibleAnswerLatex(label));
}
