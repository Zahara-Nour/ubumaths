/**
 * Règle des signes (N-SIGNES) : briques de rédaction
 * ==================================================
 *
 * Textes RÉDIGÉS (pas générés) : chaque modèle du lot les assemble à la main,
 * variation par variation. Couleurs (palette.ts) : les signes « − » regardés en
 * `transformed`, « même signe / signes contraires » et le compte de facteurs
 * négatifs en `intermediate`, le signe conclu en `conclusion`.
 */

import { alignBlock, colored, inline } from '../lib/palette';

// ============================================================================
// TYPES
// ============================================================================

export type SignOperation = 'product' | 'quotient';

// ============================================================================
// CONSTANTS
// ============================================================================

export const RULE_PRODUCT =
	'**Règle des signes.** Le produit de deux nombres de même signe est positif ; ' +
	'le produit de deux nombres de signes contraires est négatif.';

export const RULE_QUOTIENT =
	'**Règle des signes.** Le quotient de deux nombres de même signe est positif ; ' +
	'le quotient de deux nombres de signes contraires est négatif.';

export const RULE_MANY_FACTORS =
	'**Règle des signes.** Un produit est positif quand il a un nombre pair de facteurs ' +
	'négatifs, négatif quand ce nombre est impair.';

// ============================================================================
// FUNCTIONS
// ============================================================================

export function rule(operation: SignOperation): string {
	return operation === 'product' ? RULE_PRODUCT : RULE_QUOTIENT;
}

export function operatorLatex(operation: SignOperation): string {
	return operation === 'product' ? '\\times' : ':';
}

/** Mot coloré en rôle `intermediate` : même signe / signes contraires */
export function relation(sameSign: boolean): string {
	return inline(
		colored('intermediate', `\\text{${sameSign ? 'même signe' : 'signes contraires'}}`)
	);
}

/** Signe conclu, coloré : « positif » / « négatif » (mot) */
export function conclusionWord(negative: boolean): string {
	return inline(colored('conclusion', `\\text{${negative ? 'négatif' : 'positif'}}`));
}

/** La réponse du QCM, colorée comme une conclusion */
export const CONCLUSION_SOLUTION = inline(colored('conclusion', '\\text{{{solution}}}'));

/**
 * Nombre signé écrit à partir de sa distance à zéro : `−3` seul, `\left( −3 \right)`
 * dans une opération (`parenthesized`), `3` s'il est positif.
 */
export function signedFixed(distance: string, negative: boolean, parenthesized = true): string {
	if (!negative) return distance;
	const bare = `${colored('transformed', '-')}${distance}`;
	return parenthesized ? `\\left( ${bare} \\right)` : bare;
}

/**
 * Nombre signé tiré au hasard (variable `v`, positive ou négative) : le « − » est
 * coloré ; `parenthesized` met les parenthèses autour d'un négatif.
 */
export function signedVariable(name: string, parenthesized: boolean): string {
	const negative = `${colored('transformed', '-')}{{eval:abs(${name})}}`;
	return `{{if:${name}<0|${parenthesized ? `\\left( ${negative} \\right)` : negative}|{{${name}}}}}`;
}

/** Produit / quotient de variables signées, écrit comme l'énoncé (1ᵉʳ facteur sans parenthèses) */
export function signedChain(names: string[], operation: SignOperation): string {
	return names
		.map((name, index) => signedVariable(name, index > 0))
		.join(` ${operatorLatex(operation)} `);
}

/** « est positif / est négatif » d'un nombre au signe connu */
function signWord(negative: boolean): string {
	return negative ? 'négatif' : 'positif';
}

/**
 * Calcul à deux nombres de signes FIXES (variation par variation) :
 * règle → signe du résultat → distances à zéro.
 */
export function fixedSignCalculation(options: {
	operation: SignOperation;
	left: string;
	leftNegative: boolean;
	right: string;
	rightNegative: boolean;
}): string[] {
	const { operation, left, leftNegative, right, rightNegative } = options;
	const same = leftNegative === rightNegative;
	const resultNegative = !same;
	const word = operation === 'product' ? 'le produit' : 'le quotient';
	const L = signedFixed(left, leftNegative);
	const R = signedFixed(right, rightNegative);
	const op = operatorLatex(operation);
	return [
		rule(operation),
		`${inline(signedFixed(left, leftNegative, false))} est ${signWord(leftNegative)} et ` +
			`${inline(signedFixed(right, rightNegative, false))} est ${signWord(rightNegative)} : ` +
			`ils sont de ${relation(same)}, donc ${word} est ${conclusionWord(resultNegative)}. ` +
			`On ${operation === 'product' ? 'multiplie' : 'divise'} ensuite les distances à zéro.`,
		alignBlock([
			`${L} ${op} ${R} &= ${colored('conclusion', resultNegative ? '-' : '+')}\\left( ${left} ${op} ${right} \\right)`,
			'&= {{solution}}'
		])
	];
}

/**
 * Nombre manquant d'un produit ou d'un quotient, signes FIXES : le signe
 * cherché se déduit de la règle, puis sa distance à zéro par l'opération inverse.
 */
export function fixedSignHole(options: {
	operation: SignOperation;
	/** Rôle du nombre manquant */
	missing: 'factor' | 'divisor' | 'dividend';
	known: string;
	knownNegative: boolean;
	result: string;
	resultNegative: boolean;
	/** Distance à zéro du nombre manquant, en LaTeX (`12 : 3`, `3 \times 4`) */
	distance: string;
	/** QCM : conclure sur `{{solution}}` au lieu d'un calcul */
	choice?: boolean;
}): string[] {
	const { operation, missing, known, knownNegative, result, resultNegative, distance } = options;
	const same = !resultNegative;
	const missingNegative = knownNegative !== resultNegative;
	const whole = operation === 'product' ? 'Le produit' : 'Le quotient';
	const members = operation === 'product' ? 'les deux facteurs' : 'le dividende et le diviseur';
	const knownRole =
		missing === 'factor'
			? 'Le facteur connu'
			: missing === 'divisor'
				? 'Le dividende'
				: 'Le diviseur';
	const missingRole =
		missing === 'factor'
			? 'le facteur manquant'
			: missing === 'divisor'
				? 'le diviseur manquant'
				: 'le dividende manquant';
	const reasoning =
		`${whole} ${inline(signedFixed(result, resultNegative, false))} est ${signWord(resultNegative)} : ` +
		`${members} sont de ${relation(same)}. ` +
		`${knownRole} ${inline(signedFixed(known, knownNegative, false))} est ${signWord(knownNegative)}`;
	if (options.choice) {
		return [
			rule(operation),
			`${reasoning}.`,
			`${missingRole.charAt(0).toUpperCase()}${missingRole.slice(1)} est donc ${CONCLUSION_SOLUTION}.`
		];
	}
	return [
		rule(operation),
		`${reasoning}, donc ${missingRole} est ${conclusionWord(missingNegative)}. ` +
			`Sa distance à zéro s'obtient par l'opération inverse.`,
		alignBlock([
			`? &= ${colored('conclusion', missingNegative ? '-' : '+')}\\left( ${distance} \\right)`,
			'&= {{solution}}'
		])
	];
}
