/**
 * Case « expression, ou bien : impossible » (chantier `reponse-impossible`, outil n° 51).
 *
 * Une case ordinaire qui porte `impossibleLabel` affiche, à côté d'elle, un bouton
 * (« pas factorisable »). L'élève tape une expression, ou clique le bouton quand la réponse
 * n'existe pas.
 * - Attendue : le prof écrit `impossible` (`IMPOSSIBLE_EXPECTED`) dans `expectedAnswer` sur les
 *   tirages sans réponse (souvent `{{if:delta<0|impossible|…}}`).
 * - Réponse de l'élève : le bouton a son état à part (décision de David, 2026-11-23). Enfoncé, il
 *   vide la case et la verrouille ; la valeur enregistrée est alors la marque réservée
 *   `IMPOSSIBLE_ANSWER`, impossible à taper. Le juge la regarde avant de lire la case.
 * - Affichage (correction, résultats du prof) : la marque se montre en texte du bouton,
 *   `\text{<texte du bouton>}` (`impossibleAnswerLatex`), jamais telle quelle.
 */

// ============================================================================
// Constantes
// ============================================================================

/** Réponse attendue d'un tirage sans réponse, écrite par le prof dans `expectedAnswer` */
export const IMPOSSIBLE_EXPECTED = 'impossible';

/**
 * Valeur de la case quand le bouton est enfoncé : un caractère de contrôle (U+001F) qu'aucun
 * clavier ni MathLive ne produit, suivi d'un mot lisible en base. Jamais du LaTeX : le texte du
 * bouton tapé dans la case n'est pas le bouton.
 */
export const IMPOSSIBLE_ANSWER = '\u001Fimpossible';

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

/** Texte du bouton en LaTeX, pour l'affichage (`\text{pas factorisable}`) */
export function impossibleAnswerLatex(label: string): string {
	return `\\text{${label.trim()}}`;
}

/**
 * L'attendue de ce tirage dit-elle « pas de réponse » ? Casse ignorée : `Impossible` écrit par
 * le prof ne doit pas devenir le produit de lettres i·m·p·o·s·s·i·b·l·e (revue de la PR).
 */
export function isImpossibleExpected(expected: string | undefined): boolean {
	return expected?.trim().toLowerCase() === IMPOSSIBLE_EXPECTED;
}

/** La réponse de l'élève est-elle le bouton enfoncé ? (la marque seule, rien de tapé) */
export function isImpossibleAnswer(answer: string | undefined): boolean {
	return answer === IMPOSSIBLE_ANSWER;
}
