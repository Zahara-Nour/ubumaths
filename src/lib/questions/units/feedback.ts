/**
 * Unit System - Student Feedback Messages
 * ========================================
 *
 * Les messages montrés à l'élève quand la réponse d'un trou à unité est
 * fausse À CAUSE DE L'UNITÉ. Textes figés par la spécification validée
 * (saisie des unités, phase 3) : ne pas les reformuler sans accord produit.
 *
 * Règles d'écriture des unités : `docs/ref/notation-unites.md`.
 *
 * @module questions/units/feedback
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Messages fixes (apostrophe typographique ’, point médian ·) */
export const UNIT_FEEDBACK = {
	wrongMagnitude:
		'Cette unité ne mesure pas la bonne grandeur. Pour un produit d’unités, écris m·s.',
	missingUnit: 'N’oublie pas l’unité.'
} as const;

/** Chiffres et signe moins en exposant Unicode */
const SUPERSCRIPTS: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'-': '⁻'
};

/** Un facteur d'unité : symbole, puis exposant éventuel `^2`, `^{-1}` */
const FACTOR_PATTERN = /^([^^]+)(?:\^\{?([+-]?\d+)\}?)?$/;

// ============================================================================
// HELPERS
// ============================================================================

interface UnitFactor {
	symbol: string;
	exponent: number;
}

function toSuperscript(exponent: number): string {
	return String(exponent)
		.split('')
		.map((char) => SUPERSCRIPTS[char] ?? char)
		.join('');
}

function formatFactor({ symbol, exponent }: UnitFactor): string {
	return exponent === 1 ? symbol : `${symbol}${toSuperscript(exponent)}`;
}

/** Découpe un produit `m.s^2` (séparateurs `.`, `*`, `·`) en facteurs ; null si illisible */
function splitFactors(product: string): UnitFactor[] | null {
	const factors: UnitFactor[] = [];
	for (const part of product.split(/[.*·]/)) {
		const match = part.trim().match(FACTOR_PATTERN);
		if (!match) return null;
		factors.push({ symbol: match[1], exponent: match[2] ? Number(match[2]) : 1 });
	}
	return factors;
}

// ============================================================================
// MESSAGES CONSTRUITS
// ============================================================================

/** Unité imposée non utilisée : « Donne ta réponse en km. » */
export function requiredUnitMessage(requiredUnit: string): string {
	return `Donne ta réponse en ${requiredUnit}.`;
}

/** Lettres qui ne forment pas une unité : « Unité inconnue : xyz. » */
export function unknownUnitMessage(writing: string): string {
	return `Unité inconnue : ${writing}.`;
}

/**
 * Écriture ambiguë (`kg/m.s`) : propose les deux écritures correctes, bâties
 * sur celle de l'élève — dénominateur entre parenthèses avec `·`, puis la forme
 * à exposants négatifs.
 *
 * Le dénominateur est lu comme tout ce qui suit la première barre (lecture
 * « kg/(m·s) ») : c'est l'intention la plus probable, et le message la
 * montre explicitement pour que l'élève corrige s'il voulait autre chose.
 *
 * @example
 * ambiguousUnitMessage('kg/m.s')   // 'Écris kg/(m·s) ou kg·m⁻¹·s⁻¹.'
 * ambiguousUnitMessage('kg/m.s^2') // 'Écris kg/(m·s²) ou kg·m⁻¹·s⁻².'
 */
export function ambiguousUnitMessage(writing: string): string {
	const slash = writing.indexOf('/');
	const numerator = splitFactors(writing.slice(0, slash));
	// Une barre de plus au dénominateur (`a/b/c`) se lit aussi comme un facteur
	const denominator = splitFactors(writing.slice(slash + 1).replace(/\//g, '.'));

	// Écriture illisible pour ce découpage : on retombe sur « unité inconnue »
	if (slash <= 0 || !numerator || !denominator) return unknownUnitMessage(writing);

	const fractionForm = `${numerator.map(formatFactor).join('·')}/(${denominator.map(formatFactor).join('·')})`;
	const negativeForm = [
		...numerator,
		...denominator.map((factor) => ({ symbol: factor.symbol, exponent: -factor.exponent }))
	]
		.map(formatFactor)
		.join('·');

	return `Écris ${fractionForm} ou ${negativeForm}.`;
}
