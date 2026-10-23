/**
 * Groupement des chiffres par trois : UNE règle pour le juge de forme
 * (`checkSpacesViolation`), l'affichage des formules (`toLocaleDecimal`) et
 * les textes de l'Atelier (Calcul, simulations, tableur).
 *
 * Usage du BIPM (brochure SI) : « lorsqu'il n'y a que quatre chiffres avant ou
 * après le séparateur décimal, il est d'usage de ne pas isoler un chiffre par
 * une espace ». À 4 chiffres l'espace est facultative et on ne l'écrit pas ;
 * dès 5 chiffres on l'écrit. Chaque côté de la virgule est compté à part.
 * Décision E2, docs/wip/simplify-carte-progress.md § 15.
 *
 * @module mathAST/digit-grouping
 */

/** Nombre de chiffres (d'un côté de la virgule) à partir duquel on groupe. */
export const MIN_DIGITS_FOR_GROUPING = 5;

/** Partie entière groupée depuis la droite : `30000` → `30 000`, `1024` inchangé. */
export function groupIntegerDigits(digits: string, separator: string): string {
	if (digits.length < MIN_DIGITS_FOR_GROUPING) return digits;
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Partie décimale groupée depuis la virgule : `12345` → `123 45`, `1234` inchangé. */
export function groupDecimalDigits(digits: string, separator: string): string {
	if (digits.length < MIN_DIGITS_FOR_GROUPING) return digits;
	return digits.replace(/(\d{3})(?=\d)/g, `$1${separator}`);
}

/**
 * Les nombres d'un texte en français, écrits sans groupement (`12345,6 %`,
 * `-1048576`), groupés selon la règle : `12 345,6 %`, `-1 048 576`.
 */
export function groupNumberText(text: string, separator: string): string {
	return text.replace(
		/(\d+)(?:,(\d+))?/g,
		(_, integer: string, decimals: string | undefined) =>
			groupIntegerDigits(integer, separator) +
			(decimals === undefined ? '' : `,${groupDecimalDigits(decimals, separator)}`)
	);
}
