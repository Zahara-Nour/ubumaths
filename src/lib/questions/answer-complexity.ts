/**
 * Garde de complexité d'une réponse d'élève (décision Q58 de David, 2026-10-01)
 * =============================================================================
 *
 * Une réponse hostile peut coûter cher à corriger sans rapporter un point :
 * radicaux imbriqués (×12 → ~200 ms, plafonné vers 500 ms), exposant géant
 * (`2^{9999999}` → ~760 ms). Une évaluation notée de 20 questions hostiles
 * occupait ~15 s de serveur par envoi.
 *
 * La garde mesure l'ÉCRITURE (aucun parse, aucune évaluation) et refuse avant
 * toute correction ce qui dépasse des limites LARGES : ×3 au moins le maximum
 * observé dans tout le corpus (réponses attendues et réponses de specs), cf.
 * `__tests__/answer-complexity-corpus.test.ts`. Statut `incorrect` (0 point),
 * pas `empty` : une case vide vaut ½ quand elle est minoritaire, et « tu n'as
 * rien répondu » serait faux.
 *
 * Limite connue : elle ne voit pas le coût d'un CALCUL d'écriture modeste
 * (`(x+y+z+1)^{30}`, `\left(1.0001^{99}\right)^{99}` : ~500-800 ms), borné
 * seulement par le budget de 500 ms de la comparaison d'expressions.
 *
 * Les cases « intervalles » gardent leur propre garde, plus serrée (une borne
 * est un nombre) : `isBoundTooComplex` de mathAST.
 */

// Types
export interface AnswerComplexity {
	/** Nombre de caractères */
	length: number;
	/**
	 * Profondeur d'imbrication : accolades, parenthèses, arguments de `\sqrt`,
	 * `\frac`, puissances et indices (écrits avec ou sans accolades :
	 * `\sqrt\sqrt2` vaut `\sqrt{\sqrt{2}}`)
	 */
	depth: number;
	/** Plus grand nombre de chiffres d'un entier écrit dans un exposant (zéros de tête exclus) */
	exponentDigits: number;
}

// Constantes
/** Message unique, quel que soit le dépassement */
export const ANSWER_TOO_COMPLEX_FEEDBACK =
	'Réponse trop complexe pour être corrigée : simplifie ton écriture.';

/**
 * Limites, mesurées le 2026-10-01 sur 18 609 réponses du corpus (attendues et de
 * specs) :
 * - longueur 400 : 103 au plus observé (×3,9) ;
 * - profondeur 9 : 3 au plus (×3) ; 9 radicaux imbriqués se corrigent en ~17 ms,
 *   12 en ~110 ms ;
 * - chiffres d'exposant 4 : 2 au plus (`10^{16}`), soit une VALEUR ×600. Garde
 *   `7^{2024}` et `10^{1000}` ; `2^{9999999}` coûtait ~760 ms.
 */
export const ANSWER_COMPLEXITY_LIMITS = {
	length: 400,
	depth: 9,
	exponentDigits: 4
} as const satisfies AnswerComplexity;

/** Commandes à deux arguments */
const TWO_ARGUMENT_COMMANDS = new Set([
	'\\frac',
	'\\dfrac',
	'\\tfrac',
	'\\cfrac',
	'\\binom',
	'\\dbinom',
	'\\tbinom'
]);

// Functions
/** Jetons : commande, symbole échappé, entier, caractère (espaces ignorés) */
function tokenize(text: string): string[] {
	return text.match(/\\[a-zA-Z]+|\\.|\d+|\S/g) ?? [];
}

/**
 * Mesure une réponse sans la lire mathématiquement : linéaire en sa longueur,
 * jamais d'exception (une écriture déséquilibrée est mesurée telle quelle).
 */
export function measureAnswerComplexity(text: string): AnswerComplexity {
	const tokens = tokenize(text);
	let index = 0;
	let maxDepth = 0;
	let exponentDigits = 0;

	function reach(depth: number): void {
		if (depth > maxDepth) maxDepth = depth;
	}

	/** Suite de jetons jusqu'au fermant `closer` (consommé s'il est trouvé) */
	function sequence(depth: number, inExponent: boolean, closer: string | null): void {
		reach(depth);
		while (index < tokens.length) {
			const token = tokens[index];
			if (token === closer) {
				index++;
				return;
			}
			// Fermant d'un niveau englobant : on remonte sans le consommer
			if (closer !== null && (token === '}' || (token === ')' && closer !== '}'))) return;
			atom(depth, inExponent);
		}
	}

	/** Argument d'un opérateur : groupe `{…}` ou atome unique, un niveau plus bas */
	function argument(depth: number, inExponent: boolean): void {
		if (tokens[index] === '{') {
			index++;
			sequence(depth + 1, inExponent, '}');
			return;
		}
		reach(depth + 1);
		if (index < tokens.length) atom(depth + 1, inExponent);
	}

	function atom(depth: number, inExponent: boolean): void {
		const token = tokens[index++];
		if (/^\d+$/.test(token)) {
			if (inExponent) {
				const digits = token.replace(/^0+/, '').length;
				if (digits > exponentDigits) exponentDigits = digits;
			}
			return;
		}
		switch (token) {
			case '{':
				sequence(depth + 1, inExponent, '}');
				return;
			case '(':
				sequence(depth + 1, inExponent, ')');
				return;
			case '^':
				argument(depth, true);
				return;
			case '_':
				argument(depth, inExponent);
				return;
			case '\\sqrt':
				// Indice facultatif : `\sqrt[3]{x}`
				if (tokens[index] === '[') {
					index++;
					sequence(depth + 1, inExponent, ']');
				}
				argument(depth, inExponent);
				return;
			default:
				if (TWO_ARGUMENT_COMMANDS.has(token)) {
					argument(depth, inExponent);
					argument(depth, inExponent);
				}
		}
	}

	// Fermants orphelins : ignorés, la mesure continue
	while (index < tokens.length) {
		sequence(0, false, null);
		if (index < tokens.length) index++;
	}

	return { length: text.length, depth: maxDepth, exponentDigits };
}

/**
 * Réponse à refuser avant toute correction. La longueur est vérifiée d'abord :
 * la mesure (récursive) ne parcourt jamais une réponse démesurée.
 */
export function isAnswerTooComplex(text: string): boolean {
	if (text.length > ANSWER_COMPLEXITY_LIMITS.length) return true;
	const { depth, exponentDigits } = measureAnswerComplexity(text);
	return (
		depth > ANSWER_COMPLEXITY_LIMITS.depth ||
		exponentDigits > ANSWER_COMPLEXITY_LIMITS.exponentDigits
	);
}
