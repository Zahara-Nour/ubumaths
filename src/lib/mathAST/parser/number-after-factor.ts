/**
 * Nombre collé APRÈS un facteur (`x2`, `(a)2`, `\sqrt{2}3`) — refusé (2026-10-08)
 *
 * Partagé par les deux parseurs LaTeX (Pratt et RD). `x2` est ambigu : x·2,
 * x² (exposant oublié) ou x₂ (indice oublié) ? Le lire comme 2x accepterait en
 * silence la réponse d'un élève qui voulait écrire x². Le refus dit quoi écrire.
 *
 * @module mathAST/parser/number-after-factor
 */

/** Message d'erreur d'un nombre écrit juste après un facteur */
export function numberAfterFactorMessage(num: string): string {
	return `Nombre « ${num} » écrit après un facteur : écris le nombre devant (${num}x) ou utilise \\cdot (x\\cdot ${num})`;
}

/** Début commun à tous ces refus, lu par `numberAfterFactorIn` */
const NUMBER_AFTER_FACTOR = /^Nombre « (.+?) » écrit après un facteur/;

/** Le nombre mis en cause si `message` est ce refus, `null` pour tout autre message */
export function numberAfterFactorIn(message: string): string | null {
	return NUMBER_AFTER_FACTOR.exec(message)?.[1] ?? null;
}
