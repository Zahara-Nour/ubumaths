/**
 * Arrondis demandés à l'élève (`precision` decimal / significant)
 * ===============================================================
 *
 * La réponse de l'élève n'est PAS arrondie avant comparaison (sinon 3,14159
 * passait pour « arrondis au centième ») :
 *
 * - plus de décimales (resp. de chiffres significatifs) que demandé → faux,
 *   avec un message qui dit quoi faire (« Arrondis au centième. ») ;
 * - moins de décimales → accepté si la valeur est EXACTEMENT l'arrondi de la
 *   valeur attendue (3,1 pour 3,10).
 *
 * Le nombre de décimales se lit sur l'ÉCRITURE de l'élève (LaTeX MathLive :
 * `3{,}14`, `12\,345{,}6`) : la valeur seule ne distingue pas 3,1 de 3,10.
 *
 * @module questions/rounding
 */

// ============================================================================
// TYPES
// ============================================================================

/** Précision d'arrondi jugée ici */
export type RoundingPrecision = { type: 'decimal' | 'significant'; digits: number };

/** Écriture décimale lue : décimales et chiffres significatifs tapés */
interface DecimalWriting {
	decimals: number;
	significant: number;
}

/** Verdict d'arrondi ; `feedback` seulement quand l'élève a trop de chiffres */
export interface RoundingVerdict {
	isCorrect: boolean;
	feedback?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Nom des premiers rangs décimaux : « Arrondis au centième. » */
const DECIMAL_RANK_MESSAGES: Record<number, string> = {
	0: "Arrondis à l'unité.",
	1: 'Arrondis au dixième.',
	2: 'Arrondis au centième.',
	3: 'Arrondis au millième.'
};

/** Écart relatif sous lequel deux flottants sont le même arrondi */
const SAME_ROUNDED_VALUE = 1e-9;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Message d'un arrondi trop précis */
export function roundingFeedback(precision: RoundingPrecision): string {
	const { type, digits } = precision;
	if (type === 'decimal') {
		return DECIMAL_RANK_MESSAGES[digits] ?? `Arrondis à ${digits} décimales.`;
	}
	return digits === 1 ? 'Donne 1 chiffre significatif.' : `Donne ${digits} chiffres significatifs.`;
}

/**
 * Lit une écriture décimale simple (signe, séparateurs de milliers, virgule ou
 * point décimal, éventuellement `× 10^{k}`). `null` pour toute autre écriture
 * (fraction, expression…) : seule la valeur sera alors jugée.
 */
function readDecimalWriting(latex: string): DecimalWriting | null {
	const compact = latex
		.replace(/\\[,;:! ]|~|\s/g, '')
		.replace(/\{,\}|\{\.\}|,/g, '.')
		.replace(/^[+-]/, '');

	const scientific =
		/^(\d+(?:\.\d*)?)(?:(?:\\times|\\cdot)10\^(?:\{([+-]?\d+)\}|([+-]?\d)))?$/.exec(compact);
	if (!scientific) return null;

	const [, mantissa, bracedExponent, bareExponent] = scientific;
	const exponent = Number(bracedExponent ?? bareExponent ?? '0');
	const [integerPart, fractionalPart = ''] = mantissa.split('.');

	const digits = (integerPart + fractionalPart).replace(/^0+/, '');
	// Zéros finaux d'un entier (1 200) : ambigus, comptés comme non significatifs
	const significant = fractionalPart === '' ? digits.replace(/0+$/, '').length : digits.length;

	return {
		decimals: Math.max(0, fractionalPart.length - exponent),
		significant: Math.max(significant, 1)
	};
}

/**
 * Arrondi « moitié loin de zéro » à `decimals` décimales (négatif : dizaines,
 * centaines…). Passe par l'écriture décimale pour éviter `2.345 → 2.34`.
 */
function roundHalfAwayFromZero(value: number, decimals: number): number {
	const sign = value < 0 ? -1 : 1;
	const magnitude = Math.abs(value);
	const text = String(magnitude);
	const shifted = text.includes('e')
		? Math.round(magnitude * 10 ** decimals)
		: Math.round(Number(`${text}e${decimals}`));
	return sign * Number(`${shifted}e${-decimals}`);
}

/** Arrondi de la valeur attendue à la précision demandée */
export function roundToPrecision(value: number, precision: RoundingPrecision): number {
	if (precision.type === 'decimal') return roundHalfAwayFromZero(value, precision.digits);
	if (value === 0) return 0;
	const magnitude = Math.floor(Math.log10(Math.abs(value)));
	return roundHalfAwayFromZero(value, precision.digits - 1 - magnitude);
}

/**
 * Verdict sur un arrondi demandé.
 *
 * @param studentLatex - écriture de l'élève (sert à compter ses chiffres)
 * @param studentValue - valeur de cette écriture
 * @param expectedValue - valeur attendue, NON arrondie (ou déjà arrondie)
 */
export function judgeRounding(
	studentLatex: string,
	studentValue: number,
	expectedValue: number,
	precision: RoundingPrecision
): RoundingVerdict {
	const writing = readDecimalWriting(studentLatex);
	if (writing) {
		const typed = precision.type === 'decimal' ? writing.decimals : writing.significant;
		if (typed > precision.digits) {
			return { isCorrect: false, feedback: roundingFeedback(precision) };
		}
	}

	const rounded = roundToPrecision(expectedValue, precision);
	const scale = Math.max(Math.abs(rounded), Math.abs(studentValue));
	const isCorrect =
		studentValue === rounded || Math.abs(studentValue - rounded) <= SAME_ROUNDED_VALUE * scale;
	return { isCorrect };
}
