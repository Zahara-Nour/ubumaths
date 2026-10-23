/**
 * Cosmetic AST Transformers & Unified checkForm Pipeline
 * ======================================================
 *
 * Cosmetic transformers simplify the *appearance* of expressions
 * without changing their mathematical value. They're used to check
 * if a student's answer is in "proper form".
 *
 * The checkForm pipeline applies these transformers sequentially,
 * detecting constraint violations along the way, then compares
 * the simplified answer against the simplified expected form.
 *
 * @module mathAST/cosmetic-transforms
 */

import type { MathNode } from './types';
import {
	number,
	opposite,
	multiply,
	divide,
	parentheses,
	add,
	subtract,
	percentage,
	superscript,
	func,
	euler,
	imaginaryUnit
} from './factory';
import {
	isComplex,
	isDivision,
	isEulerConstant,
	isImaginaryUnit,
	isMultiplication,
	isNumber,
	isOpposite,
	isPercentage,
	isPiConstant,
	isPositive,
	isSegmentLength,
	isSymbol,
	isVariable
} from './guards';
import { areEquivalent } from './equivalence';
import { assumptionOracle, isPlainAlgebra, type AnswerAssumptions } from './assumptions';
import { extractRational } from './common/numeric';
import { MIN_DIGITS_FOR_GROUPING, SCHOOL_MIN_DIGITS_FOR_GROUPING } from './digit-grouping';
import { findNodes, mapNode, mapNodeTopDown } from './transforms';
import {
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct
} from './flatten';
import { parseLatexSafe, type CapitalPairs, type GenericFunctionConfig } from './parser';
import { separateSpacedCapitals } from './parser/latex/point-names';
import { canonicalSegment, figureNameRefusal } from './common/segment-names';
import { bareDecimalCommaToPoint } from './decimal-comma';
import { toLatex } from './latex-generator';
import { compareNodes } from './normal';
import { digitsWouldTouch } from './superflu/transforms';
import { SUPERFLU_AST_RULES, type SuperfluRuleId } from './superflu/rules';

// =============================================================================
// Re-exports from transforms.ts
// =============================================================================

export { removeNullTermsAST } from './transforms';
export { stripUnnecessaryBrackets as stripUnnecessaryBracketsAST } from './transforms';
// Transformations du superflu, déplacées dans `superflu/` (registre des règles)
export {
	reduceFractionsAST,
	reduceRadicalsAST,
	simplifyNullProductsAST,
	removeFactorsOneAST,
	removeSignsAST,
	removeMultOperatorAST
} from './superflu/transforms';

// =============================================================================
// String Transformers (LaTeX → LaTeX)
// =============================================================================

/**
 * Ce qui peut précéder des zéros de tête : le début, un opérateur ou un
 * délimiteur. Une virgule n'en est un QUE si elle sépare deux nombres : pas
 * celle de `\\,` (espace fine de groupement), ni celle de `{,}`, ni une
 * virgule décimale collée à un chiffre (`1,05`, telle que MathLive l'écrit).
 * Sans cette garde, `1\\,000\\,000` perdait un groupe et `1,05` devenait `1,5`.
 */
const ZERO_DELIMITER = String.raw`(^|(?<!\\)[+\-*/=({]|(?<![\\{\d]),)`;

/**
 * Remove unnecessary leading and trailing zeros from a LaTeX string.
 *
 * - Leading zeros: 01 → 1, 007 → 7 (but 0.5 stays)
 * - Trailing decimal zeros: 1.0 → 1, 1.20 → 1.2
 */
export function removeZeros(latex: string): string {
	// Strip LaTeX thin spaces for analysis, we'll work on the raw string
	let result = latex;

	// Replace leading zeros in integer parts: 01 → 1, 007 → 7
	// Handles negative: -01 → -1
	// But NOT 0.5 (zero before decimal is required)
	// Do NOT strip zeros after digit-grouping spaces (e.g., 6 020, 6\,020)
	// Match at start of string or after operators/delimiters (not after digits or spaces)
	// The (?<!\\) lookbehind prevents matching \, (LaTeX thin space) as a comma delimiter
	result = result.replace(new RegExp(`${ZERO_DELIMITER}0+(\\d)`, 'g'), '$1$2');

	// Leading zeros followed by digit-grouping thin space: 0\,565 → 565
	// A zero at a position where leading zeros are valid (start or after operator),
	// followed by \, and then digits, is a superfluous leading zero with grouping.
	result = result.replace(new RegExp(`${ZERO_DELIMITER}0+(?:\\\\,\\s?)+(\\d)`, 'g'), '$1$2');

	// Zéros de fin d'une partie décimale : 1.0 → 1, 1.20 → 1.2, 1{,}0 → 1, 1,20 → 1,2.
	// La partie décimale est lue EN ENTIER, groupes à l'espace fine compris
	// (`formatDecimalPart` écrit `141\,592\,65`) : `2,500\,0` → `2,5`, mais
	// `1,000\,5` (1,0005) garde ses zéros, qui ne sont pas de fin.
	result = result.replace(
		/(\d+)(\.|\{,\}|,)(\d+(?:\\,\s?\d+)*)/g,
		(_, intPart: string, separator: string, decimals: string) => {
			const kept = decimals.replace(/(?:0|\\,\s?)+$/, '');
			return kept === '' ? intPart : `${intPart}${separator}${kept}`;
		}
	);

	return result;
}

/**
 * Check integer part for spacing violations
 * Groups of 3 from right: 1 234 567. Règle du BIPM (`digit-grouping.ts`) :
 * espace facultative à 4 chiffres (`1024`, `1 024`), exigée dès 5 (`30 000`).
 */
function hasIntegerSpacingViolation(integerPart: string, minDigits: number): boolean {
	// Remove existing spaces to get pure digits
	const digits = integerPart.replace(/\s/g, '');

	// 3 or fewer digits: no spacing required (1, 12, 123)
	if (digits.length <= 3) {
		return false;
	}

	// Sans espace : faute dès le seuil seulement ; une espace écrite doit être bien placée
	if (!integerPart.includes(' ')) {
		return digits.length >= minDigits;
	}

	// Verify spacing is at correct positions
	return !isCorrectIntegerSpacing(integerPart);
}

/**
 * Check decimal part for spacing violations
 * Groups of 3 from left: 123 456. Même règle que la partie entière, comptée à
 * part : `0,1234` et `0,123 4` acceptés, `0,12345` reçoit une remarque.
 */
function hasDecimalSpacingViolation(decimalPart: string, minDigits: number): boolean {
	if (!decimalPart) {
		return false;
	}

	// Remove existing spaces to get pure digits
	const digits = decimalPart.replace(/\s/g, '');

	// 3 or fewer digits: no spacing required
	if (digits.length <= 3) {
		return false;
	}

	if (!decimalPart.includes(' ')) {
		return digits.length >= minDigits;
	}

	return !isCorrectDecimalSpacing(decimalPart);
}

/**
 * Verify integer spacing is correct (groups of 3 from right)
 */
function isCorrectIntegerSpacing(integerPart: string): boolean {
	const digits = integerPart.replace(/\s/g, '');

	// Build expected format with spaces
	const groups: string[] = [];
	for (let i = digits.length; i > 0; i -= 3) {
		const start = Math.max(0, i - 3);
		groups.unshift(digits.slice(start, i));
	}
	const expected = groups.join(' ');

	// Normalize actual spacing (collapse multiple spaces)
	const actual = integerPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

/**
 * Verify decimal spacing is correct (groups of 3 from left)
 */
function isCorrectDecimalSpacing(decimalPart: string): boolean {
	const digits = decimalPart.replace(/\s/g, '');

	// Build expected format with spaces (groups of 3 from left)
	const groups: string[] = [];
	for (let i = 0; i < digits.length; i += 3) {
		groups.push(digits.slice(i, i + 3));
	}
	const expected = groups.join(' ');

	const actual = decimalPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

/**
 * Check if a LaTeX string has spacing issues (missing grouping spaces in numbers).
 * French format uses thin spaces to group digits in groups of 3.
 *
 * Returns true if there are spacing violations. `minDigits` : seuil à partir
 * duquel l'espace est exigée (5, BIPM ; 4 pour un modèle « Espaces dès 4 chiffres »).
 */
export function checkSpacesViolation(
	latex: string,
	minDigits: number = MIN_DIGITS_FOR_GROUPING
): boolean {
	// Un code couleur (`\textcolor{#123456}{…}`) n'est pas un nombre (même garde que
	// `toLocaleDecimal`) ; puis l'espace fine LaTeX (\,) devient une espace
	let normalized = latex.replace(/#[0-9A-Fa-f]{3,8}(?![0-9A-Za-z])/g, '#').replace(/\\,/g, ' ');
	// Replace {,} (French decimal comma) with a period
	normalized = normalized.replace(/\{,\}/g, '.');
	// Handle simple comma as decimal separator
	normalized = normalized.replace(/(\d),(\d)/g, '$1.$2');

	// Extract all number sequences
	const numberPattern = /-?\d[\d\s]*(?:\.\d[\d\s]*)?/g;
	const matches = normalized.match(numberPattern);
	if (!matches) return false;

	for (const match of matches) {
		const parts = match.replace(/^-/, '').split('.');
		const integerPart = parts[0] || '';
		const decimalPart = parts[1] || '';

		// Groupes de 3 : depuis la droite pour la partie entière (1 234 567),
		// depuis la virgule pour la partie décimale (0,123 4). Une espace mal
		// placée (34 56) est une faute, pas seulement une espace absente.
		if (hasIntegerSpacingViolation(integerPart, minDigits)) return true;
		if (hasDecimalSpacingViolation(decimalPart, minDigits)) return true;
	}

	return false;
}

/**
 * Remove grouping spaces from a LaTeX string (normalisation for comparison).
 * Removes regular spaces and LaTeX thin spaces (\,) that are used for digit grouping.
 */
export function removeSpaces(latex: string): string {
	// Deux majuscules séparées restent séparées : `A\,B` est un produit, pas la longueur AB
	// Remove LaTeX thin spaces
	let result = separateSpacedCapitals(latex).replace(/\\,/g, '');
	// Remove regular spaces between digits (grouping spaces)
	result = result.replace(/(\d)\s+(\d)/g, '$1$2');
	return result;
}

/**
 * Normalize a French decimal comma (`,`) between two digits into the parser's
 * decimal point. The LaTeX parser accepts `8.249` and `8{,}249` but NOT a raw
 * `8,249`; question data and student input may carry the raw comma form, so we
 * normalize it before parsing to avoid a spurious "Parse error".
 *
 * Scoped to `<digit>,<digit>` (no surrounding spaces) so it cannot touch
 * function-argument commas (`f(a,b)`) or spaced lists (`(1, 2)`), where a comma
 * is a separator rather than a decimal mark.
 */
export function normalizeDecimalComma(latex: string): string {
	return latex.replace(/(\d),(\d)/g, '$1.$2');
}

// =============================================================================
// AST Transformers (MathNode → MathNode)
// =============================================================================

/**
 * Le degré d'un terme dans ses variables — 0 pour une constante.
 *
 * Lu sur la STRUCTURE, sans analyse polynomiale : la plus grande puissance
 * portée par une variable du terme. `3x^2` vaut 2, `2x` vaut 1, `5` vaut 0,
 * `sin(x)` vaut 0 — une fonction n'a pas de degré, elle se range à
 * l'alphabétique comme avant.
 */
function termDegree(node: MathNode): number {
	if (node.type === 'variable') return 1;

	// ⚠️ Le champ s'appelle `superscript`, pas `exponent` — mesuré sur l'arbre
	// de `x^2`. Le nommer de travers rendait 0 pour toute puissance, et le
	// trinôme sortait dans le désordre.
	if (node.type === 'superscript') {
		if (node.base.type !== 'variable' || node.superscript.type !== 'number') return 0;
		const value = Number(node.superscript.value);
		return Number.isFinite(value) ? value : 0;
	}

	if (node.type === 'multiplication') {
		return Math.max(termDegree(node.left), termDegree(node.right));
	}

	if (node.type === 'opposite' || node.type === 'positive') {
		return termDegree(node.operand);
	}

	if (node.type === 'delimiter') return termDegree(node.content);

	return 0;
}

/**
 * L'ordre des FACTEURS d'un produit : le coefficient devant.
 *
 * ⚠️ **`compareNodes` ne convient pas ici, et c'est le défaut qu'on répare.**
 * Il a été écrit pour comparer les facteurs SYMBOLIQUES d'un monôme, où le
 * coefficient est stocké à part et n'entre donc jamais dans la liste ; sa table
 * de priorités range les nombres après tout le reste (`normal/monomial.ts`).
 * Appliqué à un produit brut, il envoyait le coefficient au bout : `2x`
 * devenait `x 2`, et `5 sin(x)` devenait `sin(x) 5`. Relevé par David — ça
 * n'avait jamais été voulu.
 */
function compareFactors(a: MathNode, b: MathNode): number {
	// ⚠️ **Un nombre négatif n'est pas un nœud `number`** : `-3` s'écrit
	// `opposite(number)`. Ne tester que `type === 'number'` laissait `-3`
	// derrière — `-sin(3x) × 3` devenait `sin(3x) × -3`, ce qui est pire que le
	// défaut qu'on répare. `extractRational` couvre les deux formes.
	const aNumber = extractRational(a) !== null;
	const bNumber = extractRational(b) !== null;
	if (aNumber !== bNumber) return aNumber ? -1 : 1;
	return compareNodes(a, b);
}

/**
 * L'ordre des TERMES d'une somme : degré décroissant.
 *
 * C'est l'ordre d'un polynôme au tableau — `3x² + 2x + 1`. L'ancien les rangeait
 * par le même comparateur que les facteurs, ce qui donnait `1 + 3x² + 2x` :
 * ni croissant, ni décroissant. À degré égal, on garde l'ordre alphabétique
 * d'avant, pour que `c+a+b` reste `a + b + c`.
 */
function compareTerms(a: MathNode, b: MathNode): number {
	const degreeA = termDegree(a);
	const degreeB = termDegree(b);
	if (degreeA !== degreeB) return degreeA > degreeB ? -1 : 1;
	return compareNodes(a, b);
}

/**
 * Sort terms in sums and factors in products into canonical order.
 *
 * `b + a → a + b`, `x × 2 → 2x`, `1 + 2x + 3x² → 3x² + 2x + 1`.
 *
 * ⚠️ **Cette fonction sert d'abord à COMPARER**, appliquée aux deux côtés avant
 * confrontation (`constraintId: null` dans le pipeline) : c'est ce qui fait que
 * `1+x` et `x+1` ne sont pas une faute de forme. N'importe quel ordre total y
 * conviendrait — celui-ci est en plus celui qu'on écrit au tableau, ce qui la
 * rend utilisable à l'affichage.
 */
export function sortTermsAndFactorsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// Sort terms in sums
		if (node.type === 'addition' || node.type === 'subtraction') {
			const terms = flattenSumShallow(node);
			if (terms.length <= 1) return node;

			const sorted = [...terms].sort((a, b) => compareTerms(a.term, b.term));

			// Check if already sorted
			const changed = sorted.some((t, i) => t.term !== terms[i].term || t.sign !== terms[i].sign);
			if (!changed) return node;

			return unflattenSum(sorted) ?? node;
		}

		// Sort factors in products
		if (node.type === 'multiplication') {
			const factors = flattenProductShallow(node);
			if (factors.length <= 1) return node;

			// ⚠️ **Le style de multiplication appartient à la POSITION, pas au
			// facteur.** Le premier porte `implicit` par convention, les suivants
			// l'opérateur qui les précède. Les déplacer avec leur facteur faisait
			// diverger `2*x` et `x*2` après tri — donc deux écritures
			// commutatives ne se rejoignaient plus, ce que cette fonction existe
			// précisément pour garantir.
			const reordered = [...factors].sort((a, b) => compareFactors(a.factor, b.factor));
			// Un facteur implicite rangé derrière un nombre (`2^n 3` → `3 2^n`) ne
			// doit pas s'y coller : `32^n`. Le × revient, comme à l'écriture.
			const sorted = reordered.map((f, i) => {
				const style = factors[i].style;
				const touching =
					i > 0 && style === 'implicit' && digitsWouldTouch(reordered[i - 1].factor, f.factor);
				return { factor: f.factor, style: touching ? ('cross' as const) : style };
			});

			const changed = sorted.some(
				(f, i) => f.factor !== factors[i].factor || f.style !== factors[i].style
			);
			if (!changed) return node;

			return unflattenProduct(sorted) ?? node;
		}

		return node;
	});
}

// =============================================================================
// Unified checkForm Pipeline
// =============================================================================

/** Constraint severity */
export type ConstraintSeverity = 'strict' | 'warn' | 'off';

/** Result of the checkForm pipeline */
/**
 * Une écriture en pourcentage : `20 %`, `-20 %`, `(20 %)` — le symbole porte sur
 * toute la réponse, pas sur un morceau (`10 % × 50` n'en est pas une).
 */
export function isPercentWriting(node: MathNode): boolean {
	let current = node;
	while (
		current.type === 'delimiter' ||
		current.type === 'opposite' ||
		current.type === 'positive'
	) {
		current = current.type === 'delimiter' ? current.content : current.operand;
	}
	return isPercentage(current);
}

/**
 * Une écriture finale de nombre, signe compris : un nombre (`0,2`, `-3`) ou une
 * fraction de deux nombres (`\frac{1}{5}`). Ni calcul, ni pourcentage.
 */
function isFinalNumberWriting(node: MathNode): boolean {
	let current = node;
	while (current.type === 'delimiter') current = current.content;
	if (current.type === 'opposite' || current.type === 'positive') current = current.operand;
	if (current.type === 'number') return true;
	return (
		current.type === 'division' &&
		current.numerator.type === 'number' &&
		current.denominator.type === 'number'
	);
}

/**
 * La réponse est la valeur d'un pourcentage attendu, symbole oublié : `20` pour
 * `20 %`, `12,5` pour `12,5 %`. Sert au message « N'oublie pas le symbole % ».
 */
export function forgotPercentSign(answerLatex: string, expectedLatex: string): boolean {
	const answer = parseLatexSafe(normalizeDecimalComma(removeSpaces(answerLatex)));
	const expected = parseLatexSafe(normalizeDecimalComma(removeSpaces(expectedLatex)));
	if (!answer.ast || answer.errors.length > 0) return false;
	if (!expected.ast || expected.errors.length > 0) return false;
	if (!isPercentWriting(expected.ast) || !isFinalNumberWriting(answer.ast)) return false;
	return areEquivalent(percentage(answer.ast), expected.ast, { timeoutMs: 500 });
}

export interface CheckFormResult {
	valid: boolean;
	status: 'correct' | 'bad_form' | 'unoptimal_form';
	violations: Array<{ id: string; severity: 'strict' | 'warn' }>;
	messages: string[];
}

/** AST transformer step definition */
export interface TransformerStep {
	transform: (ast: MathNode) => MathNode;
	/** La règle de superflu que l'étape juge ; `null` pour une notation ou le tri */
	constraintId: SuperfluRuleId | null;
}

/** Options influencing the cosmetic pipeline behaviour */
export interface CheckFormOptions {
	/**
	 * When true, brackets around a leading negative term are preserved (not
	 * flagged as a `brackets` violation). Example: `(-5)+3` keeps its brackets.
	 * Maps to `ConstraintOptions.allowBracketsInFirstNegativeTerm`.
	 */
	allowFirstNegative?: boolean;
	/**
	 * Règle de l'école pour les espaces de groupement : exigées dès 4 chiffres au
	 * lieu de 5 (BIPM). Maps to `ConstraintOptions.spacesFromFourDigits`.
	 */
	spacesFromFourDigits?: boolean;
	/**
	 * Fonctions génériques à reconnaître en relisant la réponse et l'attendu (`P'(2)`
	 * déclaré par un modèle de question). Absent : défauts du parseur, rien ne change.
	 */
	genericFunctions?: GenericFunctionConfig;
	/**
	 * Hypothèses de l'énoncé (ADR 0012), `x > 0` : `|x|` et `x` y sont la même écriture.
	 * Absent ou vide : rien ne change.
	 */
	assumptions?: AnswerAssumptions;
	/**
	 * Sens de deux majuscules collées pour relire la réponse et l'attendu (`AB` :
	 * longueur ou produit). Absent : défaut du parseur (produit).
	 */
	capitalPairs?: CapitalPairs;
}

/**
 * Ordered AST transformer pipeline — single pass, acyclic dependency graph.
 *
 * The order is carefully chosen so that each transformer only creates patterns
 * that are handled by a LATER transformer (never an earlier one). This ensures
 * a single pass is sufficient — no fixed-point loop needed.
 *
 * Dependency analysis (A → B means "A can create work for B"):
 *
 *   reduceFractions → nullProducts, nullTerms, factorOne
 *     Can produce 0 (e.g. 0/3 → 0), 1 (e.g. 3/3 → 1), or -1
 *
 *   nullProducts → nullTerms
 *     Replaces product with 0, which may create a null term (a + 0*b → a + 0)
 *
 *   nullTerms → signs
 *     Removing null terms can create opposites (0 - x → -x)
 *
 *   brackets → signs, factorOne
 *     Exposes content hidden by double parentheses: ((-a)) → (-a)
 *     Revealed content may need sign or factor-one cleanup
 *
 *   signs → factorOne
 *     (-1)*x → -(1*x) creates a factor-1 pattern.
 *     This is why factorOne MUST come AFTER signs.
 *     A dedicated removeFactorsMinusOneAST is NOT needed: signs + factorOne
 *     together handle (-1)*x: signs → -(1*x) → factorOne → -x
 *
 *   factorOne → (terminal: removes factors, doesn't create new patterns)
 *   multOperator → (only changes display style, no structural effect)
 *   sort → (normalisation only, no constraint)
 *
 * Dependency graph (all arrows point downward → acyclic):
 *
 *   reduceFractions → nullProducts → nullTerms → signs → factorOne
 *                                                  ↑
 *                                             brackets
 *
 * Verification traces:
 *   (-1)*x         : brackets→rien, signs→-(1*x), factorOne→-x ✓
 *   ((-a))*b       : brackets→(-a)*b, signs→-(a*b), factorOne→rien ✓
 *   (-a)*(-1)      : brackets→rien, signs→a*1, factorOne→a ✓
 *   (3/3)*x        : reduceFractions→1*x, ..., factorOne→x ✓
 *   a+0*b          : nullProducts→a+0, nullTerms→a ✓
 *   2+(-5)         : brackets→keeps parens (negative), signs→2-5 ✓
 */
/**
 * Build the ordered AST transformer pipeline, binding bracket-stripping to the
 * supplied options (e.g. `allowFirstNegative`).
 */
/** Le dernier facteur d'un produit (`2AN` → `AN`), l'expression elle-même sinon. */
function rightmostFactor(node: MathNode): MathNode {
	return node.type === 'multiplication' ? rightmostFactor(node.right) : node;
}

/** Le premier facteur d'un produit, ou la base d'une puissance (`AB^2` → `AB`). */
function leftmostFactor(node: MathNode): MathNode {
	if (node.type === 'multiplication') return leftmostFactor(node.left);
	if (node.type === 'superscript') return leftmostFactor(node.base);
	return node;
}

/**
 * Longueurs : l'ordre des points est libre (`BA` a la forme de `AB`, décision Q2 du
 * 2026-10-11) et des parenthèses autour d'une longueur seule (`(AB)^2`) ne sont pas une
 * faute — l'élève groupe les deux lettres pour dire « une longueur » ; un `×` ou un `·`
 * entre deux longueurs (`AN×AB`) non plus. Notation, pas forme : aucune pénalité.
 */
export function unifySegmentNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (isSegmentLength(node)) return canonicalSegment(node);
		// `AN×AB`, `AN·AB` : le signe entre deux longueurs est une notation (l'élève
		// sépare deux noms de segments), écrit comme le produit implicite `AN AB`
		if (
			node.type === 'multiplication' &&
			node.displayStyle !== 'implicit' &&
			isSegmentLength(rightmostFactor(node.left)) &&
			isSegmentLength(leftmostFactor(node.right))
		) {
			return multiply(node.left, node.right, 'implicit', { metadata: node.metadata });
		}
		if (
			node.type === 'delimiter' &&
			node.delimiters === 'parentheses' &&
			isSegmentLength(node.content)
		) {
			return canonicalSegment(node.content);
		}
		return node;
	});
}

/**
 * Une seule écriture du nombre e pour comparer les formes : la constante
 * `euler()` (les parseurs y lisent la lettre `e` comme `\exponentialE`), et
 * `\exp(u)` (notation du programme) devient `e^{u}`. Ce sont des notations, pas
 * des formes : aucune pénalité (décision de David du 2026-10-02).
 *
 * L'unité imaginaire n'a plus rien à unifier : les parseurs lisent la lettre `i`,
 * `\mathrm{i}` et `\imaginaryI` (MathLive) en un seul nœud, `complex(0, 1)`
 * (décisions de David du 2026-10-05 et du 2026-10-11).
 */
export function unifyEulerNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type === 'function' && node.name === 'exp' && node.args.length === 1) {
			return superscript(euler(), node.args[0]);
		}
		return node;
	});
}

/**
 * `+\infty` et `\infty` sont la même écriture : le `+` devant l'infini est la
 * notation standard du lycée, pas un signe superflu (sonde du 2026-10-04 :
 * `+\infty` valait « signes superflus »). Parcours DESCENDANT : seul le `+`
 * collé à `\infty` disparaît, `++\infty` garde un `+` que `signs` signale.
 */
function unifyInfinityNotationAST(ast: MathNode): MathNode {
	return mapNodeTopDown(ast, (node) =>
		isPositive(node) && isSymbol(node.operand) && node.operand.symbol === 'infinity'
			? node.operand
			: node
	);
}

/**
 * Une seule écriture d'un angle en π pour comparer les formes : `\frac{a}{b}\pi`,
 * `a\frac{\pi}{b}`, `\pi/b` et `\frac{-\pi}{b}` deviennent `\frac{a\pi}{b}` (ou
 * son opposé). Ce sont des notations, pas des calculs inachevés : aucune pénalité
 * (décision de David du 2026-10-02). Limité à π et aux produits IMPLICITES de
 * nombres : `\frac{1}{3}x` et `\frac{\pi}{6}\times2` gardent leur jugement.
 */
function unifyPiAngleNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (isMultiplication(node) && node.displayStyle === 'implicit' && isPiConstant(node.right)) {
			// \frac{a}{b}\pi → \frac{a\pi}{b}, et -\frac{a}{b}\pi → -\frac{a\pi}{b}
			const left = node.left;
			const negated = isOpposite(left);
			const coef = isOpposite(left) ? left.operand : left;
			if (
				isDivision(coef) &&
				coef.displayStyle === 'fraction' &&
				isNumber(coef.numerator) &&
				isNumber(coef.denominator)
			) {
				const numerator =
					coef.numerator.value === '1'
						? node.right
						: multiply(coef.numerator, node.right, 'implicit');
				const fraction = divide(numerator, coef.denominator, 'fraction');
				return negated ? opposite(fraction) : fraction;
			}
		}
		if (
			isMultiplication(node) &&
			node.displayStyle === 'implicit' &&
			isNumber(node.left) &&
			isDivision(node.right) &&
			isPiConstant(node.right.numerator) &&
			isNumber(node.right.denominator)
		) {
			// a\frac{\pi}{b} → \frac{a\pi}{b}
			return divide(
				multiply(node.left, node.right.numerator, 'implicit'),
				node.right.denominator,
				'fraction'
			);
		}
		if (isDivision(node) && isNumber(node.denominator)) {
			const num = node.numerator;
			const isPiTerm = (n: MathNode): boolean =>
				isPiConstant(n) ||
				(isMultiplication(n) &&
					n.displayStyle === 'implicit' &&
					isNumber(n.left) &&
					isPiConstant(n.right));
			// \frac{-\pi}{b} → -\frac{\pi}{b}
			if (isOpposite(num) && isPiTerm(num.operand)) {
				return opposite(divide(num.operand, node.denominator, 'fraction'));
			}
			// \pi/b → \frac{\pi}{b}
			if (node.displayStyle !== 'fraction' && isPiTerm(num)) {
				return divide(num, node.denominator, 'fraction');
			}
		}
		return node;
	});
}

/** Constante réelle écrite : aucune lettre (ni variable, ni unité imaginaire `i`) */
function isLetterFree(node: MathNode): boolean {
	return findNodes(node, (n) => isVariable(n) || isComplex(n)).length === 0;
}

/**
 * Produit dont UN facteur est `i` et les autres des constantes réelles (`i`, `3i`,
 * `i\sqrt{3}`, `\pi i`) : les autres facteurs (`null` pour `i` seul), sinon `undefined`.
 */
export function imaginaryProductRest(node: MathNode): MathNode | null | undefined {
	const factors = flattenProductShallow(node);
	const imaginary = factors.filter((f) => isImaginaryUnit(f.factor));
	if (imaginary.length !== 1) return undefined;
	const rest = factors.filter((f) => !isImaginaryUnit(f.factor));
	if (!rest.every((f) => isLetterFree(f.factor))) return undefined;
	return unflattenProduct(rest.map((f, k) => (k === 0 ? { ...f, style: 'implicit' } : f)));
}

/** `\frac{R}{d}i` (`\frac{1}{d}i` pour `R` absent) */
function imaginaryOverDenominator(rest: MathNode | null, denominator: MathNode): MathNode {
	return multiply(
		divide(rest ?? number('1'), denominator, 'fraction'),
		imaginaryUnit(),
		'implicit'
	);
}

/**
 * Une seule écriture d'un complexe sous forme algébrique pour comparer les formes
 * (décision de David du 2026-10-05, même famille que `\frac{x^3}{3}` / `\frac13x^3`) :
 * sur un dénominateur NOMBRE, `\frac{a+bi}{d}` devient `\frac{a}{d}+\frac{b}{d}i`, et
 * `\frac{bi}{d}`, `\frac{ib}{d}` deviennent `\frac{b}{d}i` (`\frac{i\pi}{3}` dans un
 * exposant compris). `a`, `b` : constantes réelles sans lettre. Ce sont des notations,
 * pas des formes : aucune pénalité. Exclus, jugés comme avant : un dénominateur qui
 * n'est pas un nombre (`\frac{1}{1+i}`, calcul non fait), plus de deux termes, une
 * lettre autre que `i` (`\frac{x+1}{2}` garde son jugement) ; une fraction simplifiable
 * (`\frac{2-2i}{4}`) reste signalée par `reducedFractions`.
 */
export function unifyComplexAlgebraicNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (!isDivision(node) || node.displayStyle !== 'fraction' || !isNumber(node.denominator)) {
			return node;
		}
		const terms = flattenSumShallow(node.numerator);
		if (terms.length === 1) {
			const rest = imaginaryProductRest(terms[0].term);
			if (rest === undefined) return node;
			const imaginary = imaginaryOverDenominator(rest, node.denominator);
			return terms[0].sign === '-' ? opposite(imaginary) : imaginary;
		}
		if (terms.length !== 2) return node;
		const imaginaryIndex = terms.findIndex((t) => imaginaryProductRest(t.term) !== undefined);
		if (imaginaryIndex === -1) return node;
		const real = terms[1 - imaginaryIndex];
		if (!isLetterFree(real.term)) return node;
		const imaginaryTerm = terms[imaginaryIndex];
		const imaginary = imaginaryOverDenominator(
			imaginaryProductRest(imaginaryTerm.term) ?? null,
			node.denominator
		);
		const realPart = divide(real.term, node.denominator, 'fraction');
		const first = real.sign === '-' ? opposite(realPart) : realPart;
		return imaginaryTerm.sign === '-' ? subtract(first, imaginary) : add(first, imaginary);
	});
}

/** Facteur littéral d'un monôme : lettre, constante, ou puissance de l'une d'elles (`x^3`, `e^{2x}`) */
function isLiteralFactor(node: MathNode): boolean {
	const letter = (n: MathNode): boolean =>
		n.type === 'variable' || n.type === 'greek' || n.type === 'constant';
	return letter(node) || (node.type === 'superscript' && letter(node.base));
}

/** Partie littérale d'un monôme : produit IMPLICITE de facteurs littéraux (`x`, `x^2y`) */
function isLiteralPart(node: MathNode): boolean {
	if (isMultiplication(node)) {
		return (
			node.displayStyle === 'implicit' && isLiteralPart(node.left) && isLiteralPart(node.right)
		);
	}
	return isLiteralFactor(node);
}

/** Fraction de deux nombres écrite `\frac{a}{b}` */
function isNumberFraction(node: MathNode): node is MathNode & { type: 'division' } {
	return (
		isDivision(node) &&
		node.displayStyle === 'fraction' &&
		isNumber(node.numerator) &&
		isNumber(node.denominator)
	);
}

/**
 * Numérateur négatif d'un monôme (`-x^2`, `-3x`, lu `(-3)·x`) : le monôme sans son
 * signe, ou `null`.
 */
function negatedMonomial(node: MathNode): MathNode | null {
	if (
		isOpposite(node) &&
		(isLiteralPart(node.operand) || isMonomialWithCoefficient(node.operand))
	) {
		return node.operand;
	}
	if (
		isMultiplication(node) &&
		node.displayStyle === 'implicit' &&
		isOpposite(node.left) &&
		isNumber(node.left.operand) &&
		isLiteralPart(node.right)
	) {
		return multiply(node.left.operand, node.right, 'implicit');
	}
	return null;
}

/** `3x`, `2e^{x}` : un nombre suivi (implicitement) d'une partie littérale */
function isMonomialWithCoefficient(node: MathNode): boolean {
	return (
		isMultiplication(node) &&
		node.displayStyle === 'implicit' &&
		isNumber(node.left) &&
		isLiteralPart(node.right)
	);
}

/**
 * Une seule écriture d'un monôme à coefficient fractionnaire pour comparer les formes :
 * `\frac{1}{3}x^3` devient `\frac{x^3}{3}`, `\frac{2}{5}x` devient `\frac{2x}{5}`, et le
 * signe d'un numérateur sort de la fraction (`\frac{-x^2}{4}` → `-\frac{x^2}{4}`). Ce sont
 * des notations, pas des formes : aucune pénalité (défaut validé par David le 2026-10-04,
 * sœur de la règle des angles en π). Limité aux produits IMPLICITES d'une partie
 * littérale : une somme (`\frac{x}{3}+\frac{x}{3}`), une parenthèse (`\frac{1}{3}(x+1)`),
 * un produit explicite (`\frac{1}{3}\times x`) ou une fraction de nombres seuls
 * (`\frac{-10}{10}`) gardent leur jugement ; une fraction simplifiable (`\frac{2x}{4}`)
 * reste signalée par `reducedFractions`.
 */
function unifyMonomialFractionNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// \frac{a}{b}M → \frac{aM}{b} (a = 1 : \frac{M}{b}) ; -\frac{a}{b}M → -\frac{aM}{b}
		if (isMultiplication(node) && node.displayStyle === 'implicit' && isLiteralPart(node.right)) {
			const negated = isOpposite(node.left);
			const coef = isOpposite(node.left) ? node.left.operand : node.left;
			if (isNumberFraction(coef) && isNumber(coef.numerator) && isNumber(coef.denominator)) {
				const numerator =
					coef.numerator.value === '1'
						? node.right
						: multiply(coef.numerator, node.right, 'implicit');
				const fraction = divide(numerator, coef.denominator, 'fraction');
				return negated ? opposite(fraction) : fraction;
			}
		}
		// \frac{-M}{b} → -\frac{M}{b}
		if (isDivision(node) && node.displayStyle === 'fraction' && isNumber(node.denominator)) {
			const positive = negatedMonomial(node.numerator);
			if (positive) return opposite(divide(positive, node.denominator, 'fraction'));
		}
		return node;
	});
}

/** `|u|` : la valeur absolue (lue `abs(u)`) */
function isAbsolute(node: MathNode): node is MathNode & { type: 'function' } {
	return node.type === 'function' && node.name === 'abs' && node.args.length === 1;
}

/**
 * Sous l'hypothèse de l'énoncé `u ≥ 0` (ADR 0012), `|u|` et `u` sont la même écriture :
 * `\ln|x|` pour `\ln(x)` avec x > 0 (défaut validé par David le 2026-10-04). Même
 * oracle que la normalisation (`|u| → u`, normalize.ts), et même garde que
 * `areEquivalent` : algèbre simple seulement, variable déclarée mentionnée. Argument
 * d'une fonction (`\ln|x+1|`) : la barre disparaît ; ailleurs, une somme garde ses
 * parenthèses (`2|x+1|` → `2(x+1)`).
 */
function absoluteUnderAssumptionsAST(assumptions: AnswerAssumptions | undefined) {
	const oracle = assumptionOracle(assumptions);
	return (ast: MathNode): MathNode => {
		if (!oracle || !isPlainAlgebra(ast)) return ast;
		const unsigned = (node: MathNode): MathNode | null =>
			isAbsolute(node) && oracle.isNonNegative(node.args[0]) ? node.args[0] : null;
		return mapNodeTopDown(ast, (node) => {
			if (node.type === 'function' && !isAbsolute(node)) {
				const args = node.args.map((arg) => unsigned(arg) ?? arg);
				return args.some((arg, i) => arg !== node.args[i]) ? { ...node, args } : node;
			}
			const content = unsigned(node);
			if (content === null) return node;
			const atomic =
				content.type !== 'addition' &&
				content.type !== 'subtraction' &&
				content.type !== 'opposite';
			return atomic ? content : parentheses(content);
		});
	};
}

/** Plus grand entier écrit en argument d'un ln que la règle des puissances lit */
const MAX_LOG_ARGUMENT = 1e12;

/** Multiple rationnel `num/den` (den > 0, irréductible) de `\ln base` */
interface LogMultiple {
	num: number;
	den: number;
	base: number;
}

function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function logMultiple(num: number, den: number, base: number): LogMultiple {
	const g = gcd(num, den) || 1;
	const sign = den < 0 ? -1 : 1;
	return { num: (sign * num) / g, den: (sign * den) / g, base };
}

/** Entier positif écrit en chiffres (`9`), sinon null */
function writtenInteger(node: MathNode): number | null {
	if (!isNumber(node) || !/^\d+$/.test(node.value)) return null;
	const value = Number(node.value);
	return Number.isSafeInteger(value) && value <= MAX_LOG_ARGUMENT ? value : null;
}

/** `n = b^k` avec `b` qui n'est pas lui-même une puissance : `[b, k]` (`8` → `[2, 3]`) */
function perfectPower(n: number): [number, number] {
	for (let k = Math.floor(Math.log2(n)); k >= 2; k--) {
		const b = Math.round(n ** (1 / k));
		if (b >= 2 && b ** k === n) return [b, k];
	}
	return [n, 1];
}

/**
 * Argument d'un ln lu comme `b^r` (b entier ≥ 2 qui n'est pas une puissance, r
 * rationnel) : entier (`9`), puissance entière d'un entier (`3^2`), inverse
 * d'un entier (`\frac{1}{2}`), racine d'un entier (`\sqrt{3}`, `\sqrt[3]{2}`),
 * sinon null.
 */
function logArgument(node: MathNode): LogMultiple | null {
	const integer = writtenInteger(node);
	if (integer !== null) {
		if (integer < 2) return null;
		const [base, k] = perfectPower(integer);
		return logMultiple(k, 1, base);
	}
	if (node.type === 'superscript') {
		const exponent = writtenInteger(node.superscript);
		const inner = writtenInteger(node.base) !== null ? logArgument(node.base) : null;
		return exponent !== null && exponent > 0 && inner
			? logMultiple(inner.num * exponent, inner.den, inner.base)
			: null;
	}
	if (
		isDivision(node) &&
		node.displayStyle === 'fraction' &&
		writtenInteger(node.numerator) === 1
	) {
		const inner = writtenInteger(node.denominator) !== null ? logArgument(node.denominator) : null;
		return inner ? logMultiple(-inner.num, inner.den, inner.base) : null;
	}
	if (node.type === 'function' && node.name === 'sqrt' && node.args.length === 1) {
		const index = node.base ? writtenInteger(node.base) : 2;
		const inner = writtenInteger(node.args[0]) !== null ? logArgument(node.args[0]) : null;
		return index !== null && index >= 2 && inner
			? logMultiple(inner.num, inner.den * index, inner.base)
			: null;
	}
	return null;
}

/** `\ln(u)` d'argument lisible par `logArgument`, sinon null */
function lnOfPower(node: MathNode): LogMultiple | null {
	if (node.type !== 'function' || node.name !== 'ln' || node.args.length !== 1) return null;
	if (node.power || node.base) return null;
	return logArgument(node.args[0]);
}

/** Coefficient d'un ln : entier non nul, fraction de deux entiers, ou leur opposé */
function logCoefficient(node: MathNode): [number, number] | null {
	if (isOpposite(node)) {
		const inner = logCoefficient(node.operand);
		return inner && [-inner[0], inner[1]];
	}
	const integer = writtenInteger(node);
	if (integer !== null) return integer === 0 ? null : [integer, 1];
	if (isDivision(node) && node.displayStyle === 'fraction') {
		const num = writtenInteger(node.numerator);
		const den = writtenInteger(node.denominator);
		return num !== null && den !== null && num !== 0 && den !== 0 ? [num, den] : null;
	}
	return null;
}

/** `\ln(u)`, `-\ln(u)`, `k\ln(u)` (produit IMPLICITE) : multiple de `\ln b`, sinon null */
function logTerm(node: MathNode): LogMultiple | null {
	if (isOpposite(node)) {
		const inner = logTerm(node.operand);
		return inner && { ...inner, num: -inner.num };
	}
	if (isMultiplication(node) && node.displayStyle === 'implicit') {
		const coefficient = logCoefficient(node.left);
		const log = coefficient && lnOfPower(node.right);
		return coefficient && log
			? logMultiple(coefficient[0] * log.num, coefficient[1] * log.den, log.base)
			: null;
	}
	return lnOfPower(node);
}

/** Écriture unique de `|num/den|·\ln base` : `\ln 3`, `2\ln 3`, `\frac{1}{2}\ln 3` */
function logTermNode({ num, den, base }: LogMultiple): MathNode {
	const ln = func('ln', [number(base)]);
	const abs = Math.abs(num);
	if (den === 1 && abs === 1) return ln;
	const coefficient = den === 1 ? number(abs) : divide(number(abs), number(den), 'fraction');
	return multiply(coefficient, ln, 'implicit');
}

/**
 * Une seule écriture du logarithme d'une puissance pour comparer les formes :
 * `\ln 9`, `\ln(3^2)` et `2\ln 3` deviennent `2\ln 3` ; `\ln\frac{1}{2}` devient
 * `-\ln 2` ; `\ln\sqrt{3}` devient `\frac{1}{2}\ln 3` ; `3\ln 4` et `\ln 64`
 * deviennent `6\ln 2`. Ce sont des notations, pas des formes (défaut validé par
 * David le 2026-10-04, sœur des règles du monôme fractionnaire et des angles en π).
 * Placée APRÈS les contraintes : `\frac{2}{4}\ln 3` reste signalé par
 * `reducedFractions`. Exclus (gardent leur jugement) : `\ln(ab)` / `\ln a+\ln b`,
 * `\ln\frac{a}{b}` (a ≠ 1) / `\ln a-\ln b`, `\frac{\ln 3}{2}`, `\ln e^{2}`, un
 * produit explicite. Une forme imposée (`requiredForm`) ne passe pas par ici.
 */
function unifyLogPowerNotationAST(ast: MathNode): MathNode {
	return mapNodeTopDown(ast, (node) => {
		// a + (−k\ln b) → a − k\ln b ; a − (−k\ln b) → a + k\ln b
		if (node.type === 'addition' || node.type === 'subtraction') {
			const term = logTerm(node.right);
			if (!term || term.num > 0) return node;
			const positive = logTermNode(term);
			return node.type === 'addition' ? subtract(node.left, positive) : add(node.left, positive);
		}
		const term = logTerm(node);
		if (!term) return node;
		return term.num < 0 ? opposite(logTermNode(term)) : logTermNode(term);
	});
}

/**
 * Opposé d'un exposant « simple », écrit comme le parseur lit `e^{-a}` : nombre
 * (`2` → `-2`), fraction de nombres, partie littérale (`x`), monôme (`2x` → `(-2)·x`,
 * lu ainsi par le parseur), monôme sur un nombre (`\frac{x}{2}`). Sinon null : une
 * somme (`x+1`) ou un exposant déjà négatif gardent leur jugement.
 */
function negatedSimpleExponent(exponent: MathNode): MathNode | null {
	if (isNumber(exponent) || isNumberFraction(exponent) || isLiteralPart(exponent)) {
		return opposite(exponent);
	}
	if (isMultiplication(exponent) && isMonomialWithCoefficient(exponent)) {
		return multiply(opposite(exponent.left), exponent.right, 'implicit');
	}
	if (
		isDivision(exponent) &&
		exponent.displayStyle === 'fraction' &&
		isNumber(exponent.denominator) &&
		(isLiteralPart(exponent.numerator) || isMonomialWithCoefficient(exponent.numerator))
	) {
		return opposite(exponent);
	}
	return null;
}

/**
 * Une seule écriture de l'inverse d'une exponentielle pour comparer les formes :
 * `\frac{1}{e^a}` devient `e^{-a}`, `\frac{k}{e^a}` devient `ke^{-a}`, `\frac{1}{e}`
 * devient `e^{-1}` (a entier, fraction ou monôme : `\frac{1}{e^{2x}}` → `e^{-2x}`). Ce
 * sont des notations, pas des formes (décision de David du 2026-10-04, sœur de la règle
 * du logarithme d'une puissance). Placée APRÈS les contraintes, comme elle. Exclus
 * (gardent leur jugement) : numérateur autre qu'un nombre (`\frac{e^3}{e^5}` / `e^{-2}`,
 * calcul non fait), dénominateur produit (`\frac{1}{2e^3}`), exposant somme ou déjà
 * négatif, développé / combiné (`\frac{e^3}{2}-\frac12` / `\frac{e^3-1}{2}`). Une forme
 * imposée (`requiredForm`) ne passe pas par ici.
 */
function unifyNegativeExponentialNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (!isDivision(node) || node.displayStyle !== 'fraction' || !isNumber(node.numerator)) {
			return node;
		}
		const denominator = node.denominator;
		let negated: MathNode | null = null;
		if (isEulerConstant(denominator)) {
			negated = opposite(number('1'));
		} else if (denominator.type === 'superscript' && isEulerConstant(denominator.base)) {
			negated = negatedSimpleExponent(denominator.superscript);
		}
		if (negated === null) return node;
		const power = superscript(euler(), negated);
		return node.numerator.value === '1' ? power : multiply(node.numerator, power, 'implicit');
	});
}

function buildASTPipeline(options: CheckFormOptions = {}): TransformerStep[] {
	return [
		{ transform: unifySegmentNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyEulerNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyInfinityNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyPiAngleNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyComplexAlgebraicNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyMonomialFractionNotationAST, constraintId: null }, // notation, pas forme
		{ transform: absoluteUnderAssumptionsAST(options.assumptions), constraintId: null }, // hypothèse, pas forme
		// Le superflu : une étape par règle du registre, dans son ordre
		...SUPERFLU_AST_RULES.map((rule) => ({
			transform: (ast: MathNode) => rule.transform(ast, options),
			constraintId: rule.id
		})),
		{ transform: unifyLogPowerNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyNegativeExponentialNotationAST, constraintId: null }, // notation, pas forme
		{ transform: sortTermsAndFactorsAST, constraintId: null } // normalisation only
	];
}

/**
 * Étapes du pipeline qui nettoient les COEFFICIENTS d'une formule (0·x → 0, x + 0 → x,
 * signes, 1·x → x), pour l'option de modèle `shared.cleanCoefficients`.
 * Sélection dans `buildASTPipeline` (source unique), dans son ordre. Exclues : les
 * parenthèses (`P(x)` → « P x »), la réduction des fractions, le signe × et le tri,
 * qui changent l'écriture de l'auteur au-delà des coefficients.
 */
const COEFFICIENT_CLEANUP_IDS: ReadonlySet<SuperfluRuleId> = new Set<SuperfluRuleId>([
	'factorZero',
	'nullTerms',
	'signs',
	'factorOne'
]);

export function coefficientCleanupSteps(): TransformerStep[] {
	return buildASTPipeline().filter(
		(step) => step.constraintId !== null && COEFFICIENT_CLEANUP_IDS.has(step.constraintId)
	);
}

/**
 * Apply the full AST pipeline and return the final AST.
 */
function applyFullASTPipeline(ast: MathNode, options: CheckFormOptions = {}): MathNode {
	let current = ast;
	for (const step of buildASTPipeline(options)) {
		current = step.transform(current);
	}
	return current;
}

/**
 * Check whether a LaTeX string represents a "simple number": a single numeric
 * literal, optionally negated. After parsing, the AST root must be a `number`
 * node (e.g. `5`, `3.14`) or an `opposite` wrapping a `number` (e.g. `-5`).
 *
 * A leading explicit `+` (positive node) wrapping a number is also accepted.
 *
 * Des parenthèses de groupement autour du nombre ou de son signe (`(-3)`,
 * `-(3)`) n'en font pas un calcul : la contrainte `brackets` les juge ensuite
 * (« parenthèses inutiles »). Un séparateur décimal sans chiffre d'un côté
 * (`.5`, `5{,}`) est refusé (BIPM § 5.4.4, décision de David du 2026-10-21).
 *
 * Rejects fractions, sums, products, scientific notation, variables, etc.
 * Those must go through `requiredForm` to be accepted in a non-simple shape.
 *
 * @param latex - The LaTeX to test
 * @returns true if the answer is a simple (possibly negative) number
 */
export function isSimpleNumberLatex(latex: string): boolean {
	// Virgule décimale nue (`3,14`) lue comme `3{,}14`
	const trimmed = latex.trim();
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(trimmed));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	// Un seul signe, entre des parenthèses inutiles : `((-3))`, `-(3)` ; pas `-(-3)`
	const node = withoutParentheses(withoutSign(withoutParentheses(parsed.ast)));
	// Un couple `(3,14)` reste refusé : entre parenthèses, la virgule nue sépare
	// (les espaces `\,` de `(1\,000)` ne sont pas des virgules)
	const withoutSpaces = trimmed.replace(/\\[,;:! ]/g, ' ');
	if (trimmed.includes('(') && /(^|[^{]),/.test(withoutSpaces)) return false;
	return isWrittenNumber(node);
}

/** Nœud débarrassé des parenthèses de groupement qui l'entourent (`((x))` → `x`) */
function withoutParentheses(node: MathNode): MathNode {
	let current = node;
	while (
		current.type === 'delimiter' &&
		current.delimiters === 'parentheses' &&
		current.semantic === 'grouping'
	) {
		current = current.content;
	}
	return current;
}

/**
 * Un nombre écrit avec un chiffre de chaque côté du séparateur décimal :
 * `.5` et `5{,}` (lus `.5` et `5.`) ne sont pas des écritures de nombre (BIPM § 5.4.4)
 */
function isWrittenNumber(node: MathNode): boolean {
	return node.type === 'number' && !node.value.startsWith('.') && !node.value.endsWith('.');
}

/**
 * Un seul terme, signe compris (`-\frac{7\pi}{4}`, `3\pi`) : ni somme ni différence
 * (`\frac{\pi}{4}+2\pi`). Illisible : `false`.
 */
export function isSingleTermLatex(latex: string): boolean {
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;
	return flattenSumShallow(parsed.ast).length === 1;
}

/**
 * Un complexe écrit en décimaux, `a+bi` (`0.5-0.5i`, `-0{,}5i+2`, `3i`, `1-i`) : au plus
 * un nombre réel et un terme imaginaire `b i` / `i b` / `i`, `b` nombre. Sert à l'option
 * de case `acceptDecimal`, comme `isSimpleNumberLatex` pour un réel.
 */
export function isDecimalComplexLatex(latex: string): boolean {
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;
	const terms = flattenSumShallow(unifyEulerNotationAST(parsed.ast));
	if (terms.length === 0 || terms.length > 2) return false;
	const isImaginary = (term: MathNode): boolean => {
		const rest = imaginaryProductRest(term);
		// `-0.5i` est lu `(-0.5)·i` (moins unaire du parseur)
		const unsigned = rest && isOpposite(rest) ? rest.operand : rest;
		return unsigned === null || (unsigned !== undefined && isNumber(unsigned));
	};
	const imaginary = terms.filter((t) => isImaginary(t.term));
	const real = terms.filter((t) => isNumber(t.term));
	return imaginary.length === 1 && imaginary.length + real.length === terms.length;
}

/**
 * Un nombre écrit simplement OU en fraction de nombres (`\\frac{1}{2}`,
 * `-\\frac{3}{4}`), signe compris — y compris sur le numérateur ou le
 * dénominateur (`\\frac{-3}{4}`) : c'est une écriture de nombre, que les
 * contraintes cosmétiques jugent ensuite (`reducedFractions`), comme en case
 * positionnelle. Un calcul non effectué (`1-1`, `\\frac{1}{2}+0`) est refusé.
 * Sert aux cases « la règle suffit » (décision de David, 2026-10-03).
 */
export function isNumberOrNumberFractionLatex(latex: string): boolean {
	if (isSimpleNumberLatex(latex)) return true;
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	const node = withoutSign(parsed.ast);
	return (
		node.type === 'division' &&
		isWrittenNumber(withoutSign(node.numerator)) &&
		isWrittenNumber(withoutSign(node.denominator))
	);
}

/** Nœud débarrassé d'un signe unique en tête (`-x` / `+x`) */
function withoutSign(node: MathNode): MathNode {
	return node.type === 'opposite' || node.type === 'positive' ? node.operand : node;
}

/**
 * La valeur d'une grandeur (partie numérique d'un blanc à unité) : un nombre
 * simple, une fraction de nombres (`\frac{1}{3}`) ou une notation scientifique
 * (`2{,}5\times10^{3}`), signe compris. Une fraction est parfois la SEULE
 * écriture exacte : `\frac{1}{3}\unit{km}` attendu ne pouvait pas être donné
 * juste quand seul un nombre simple était admis. Un calcul non effectué
 * (`2+3`) reste refusé.
 */
export function isQuantityValueLatex(latex: string): boolean {
	if (isSimpleNumberLatex(latex)) return true;
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	let node: MathNode = parsed.ast;
	if (node.type === 'opposite' || node.type === 'positive') {
		node = node.operand;
	}

	// Une fraction écrite `\frac` : `6\div2` ou `6/2` est un calcul non effectué
	if (node.type === 'division') {
		return (
			node.displayStyle === 'fraction' &&
			isWrittenNumber(node.numerator) &&
			isWrittenNumber(node.denominator)
		);
	}

	if (node.type === 'multiplication' && node.right.type === 'superscript') {
		const { base, superscript: exponent } = node.right;
		const exponentValue = exponent.type === 'opposite' ? exponent.operand : exponent;
		return (
			isWrittenNumber(node.left) &&
			base.type === 'number' &&
			base.value === '10' &&
			isWrittenNumber(exponentValue)
		);
	}

	return false;
}

/**
 * Detect cosmetic constraint violations on a single LaTeX answer using the AST
 * pipeline (zeros / spaces / fractions / nullTerms / factorZero / brackets /
 * signs / factorOne / products), WITHOUT comparing against any expected form.
 *
 * This is the "violations only" half of {@link checkForm}: it answers
 * "is the answer written cleanly?" but NOT "is it the expected expression?".
 *
 * Use it for blanks whose form is already validated elsewhere (requiredForm,
 * precision, unit) but which should still surface cosmetic issues such as
 * unreduced fractions or superfluous brackets.
 *
 * @param answerLatex - Student's answer in LaTeX
 * @param constraints - Constraint configuration (id → 'strict' | 'warn' | 'off')
 * @param options - Pipeline options (e.g. allowFirstNegative)
 * @returns List of detected violations. Empty array if the answer cannot be
 *          parsed (we don't surface a "bad_form" here — parse failures are the
 *          caller's concern via the value-correctness stage).
 */
export function cosmeticViolations(
	answerLatex: string,
	constraints: Record<string, ConstraintSeverity>,
	options: CheckFormOptions = {}
): Array<{ id: string; severity: 'strict' | 'warn' }> {
	const violations: Array<{ id: string; severity: 'strict' | 'warn' }> = [];

	// === Phase string (pre-AST) ===

	const answerNoZeros = removeZeros(answerLatex);
	if (answerNoZeros !== answerLatex && (constraints['zeros'] ?? 'warn') !== 'off') {
		const severity = (constraints['zeros'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'zeros', severity });
	}

	if (
		checkSpacesViolation(answerLatex, spacesThreshold(options)) &&
		(constraints['spaces'] ?? 'warn') !== 'off'
	) {
		const severity = (constraints['spaces'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'spaces', severity });
	}

	const answerStr = normalizeDecimalComma(removeSpaces(answerNoZeros));

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr, {
		genericFunctions: options.genericFunctions,
		capitalPairs: options.capitalPairs
	});
	if (!answerParse.ast || answerParse.errors.length > 0) {
		// Can't parse → no cosmetic verdict to give.
		return violations;
	}

	let answerAST = answerParse.ast;

	// === Phase AST: apply transformers sequentially, detecting violations ===
	for (const step of buildASTPipeline(options)) {
		const before = toLatex(answerAST);
		answerAST = step.transform(answerAST);
		const after = toLatex(answerAST);

		if (
			before !== after &&
			step.constraintId &&
			(constraints[step.constraintId] ?? 'warn') !== 'off'
		) {
			const severity = (constraints[step.constraintId] ?? 'warn') as 'strict' | 'warn';
			violations.push({ id: step.constraintId, severity });
		}
	}

	return violations;
}

/**
 * Multiplication « * » (style `star`) ou « · » (style `dot`) réécrite en « × »
 * (style `cross`). Le point ne disparaissait jusqu'ici qu'avec le retrait du
 * signe (`products`) ; devant un facteur qui commence par un chiffre, le signe
 * reste (`3\cdot2^n`) et doit valoir `3\times2^n`.
 */
function withCrossMultiplication(ast: MathNode): MathNode {
	return mapNode(ast, (node) =>
		node.type === 'multiplication' && (node.displayStyle === 'star' || node.displayStyle === 'dot')
			? { ...node, displayStyle: 'cross' }
			: node
	);
}

/** Seuil des espaces de groupement selon le réglage du modèle (BIPM par défaut). */
function spacesThreshold(options: CheckFormOptions): number {
	return options.spacesFromFourDigits ? SCHOOL_MIN_DIGITS_FOR_GROUPING : MIN_DIGITS_FOR_GROUPING;
}

/**
 * Unified checkForm: applies cosmetic transformers to both answer and expected,
 * detects constraint violations, and compares final forms.
 *
 * @param answerLatex - Student's answer in LaTeX
 * @param expectedLatex - Expected answer in LaTeX
 * @param constraints - Constraint configuration (id → 'strict' | 'warn' | 'off')
 * @returns CheckFormResult with validity, status, and violations
 */
export function checkForm(
	answerLatex: string,
	expectedLatex: string,
	constraints: Record<string, ConstraintSeverity>,
	options: CheckFormOptions = {}
): CheckFormResult {
	const violations: Array<{ id: string; severity: 'strict' | 'warn' }> = [];
	const messages: string[] = [];

	// === Phase string (pre-AST) ===

	// removeZeros
	const answerNoZeros = removeZeros(answerLatex);
	if (answerNoZeros !== answerLatex && (constraints['zeros'] ?? 'warn') !== 'off') {
		const severity = (constraints['zeros'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'zeros', severity });
	}

	// Espaces des milliers (détection seule)
	if (
		checkSpacesViolation(answerLatex, spacesThreshold(options)) &&
		(constraints['spaces'] ?? 'warn') !== 'off'
	) {
		const severity = (constraints['spaces'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'spaces', severity });
	}

	// removeSpaces (normalisation for comparison)
	const answerStr = normalizeDecimalComma(removeSpaces(answerNoZeros));

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr, {
		genericFunctions: options.genericFunctions,
		capitalPairs: options.capitalPairs
	});
	if (!answerParse.ast || answerParse.errors.length > 0) {
		// Can't parse, can't check form — treat as bad_form
		return {
			valid: false,
			status: 'bad_form',
			violations: [],
			messages: ['Parse error on answer']
		};
	}

	// Un nom de figure (`ABC`) n'est pas une réponse : refusé, avec le message (Q-A)
	const figureRefusal = figureNameRefusal(answerParse.ast);
	if (figureRefusal !== null) {
		return { valid: false, status: 'bad_form', violations: [], messages: [figureRefusal] };
	}

	let answerAST = answerParse.ast;

	// === Phase AST: apply transformers sequentially, detecting violations ===
	for (const step of buildASTPipeline(options)) {
		const before = toLatex(answerAST);
		answerAST = step.transform(answerAST);
		const after = toLatex(answerAST);

		if (
			before !== after &&
			step.constraintId &&
			(constraints[step.constraintId] ?? 'warn') !== 'off'
		) {
			const severity = (constraints[step.constraintId] ?? 'warn') as 'strict' | 'warn';
			violations.push({ id: step.constraintId, severity });
		}
	}

	// === Same pipeline for expected ===
	const expectedStr = normalizeDecimalComma(removeSpaces(removeZeros(expectedLatex)));
	const expectedParse = parseLatexSafe(expectedStr, {
		genericFunctions: options.genericFunctions,
		capitalPairs: options.capitalPairs
	});
	if (!expectedParse.ast || expectedParse.errors.length > 0) {
		return {
			valid: false,
			status: 'bad_form',
			violations: [],
			messages: ['Parse error on expected']
		};
	}

	const expectedAST = applyFullASTPipeline(expectedParse.ast, options);

	// === Pourcentage (décisions du 2026-09-27) ===
	// Attendu `20 %`, réponse de même valeur sans le symbole : perfectible, mais
	// SEULEMENT pour une écriture finale (`0,2`, `1/5`). Un calcul non effectué
	// (`0,1+0,1`, `2 × 10 %`) suit la comparaison de forme : mauvaise forme.
	// L'inverse (`710 %` pour 7,1) échoue aussi à la comparaison finale.
	if (isPercentWriting(expectedAST) && isFinalNumberWriting(answerParse.ast)) {
		const severity = constraints['percent'] ?? 'warn';
		const withPercent =
			severity === 'off' ? violations : [...violations, { id: 'percent', severity }];
		return verdictOf(withPercent, messages);
	}

	// === Final comparison ===
	// « * » (réponses attendues écrites en syntaxe simple) et « × » (clavier de
	// l'élève) sont le même signe : le style d'affichage n'est pas une forme.
	const answerFinal = toLatex(withCrossMultiplication(answerAST));
	const expectedFinal = toLatex(withCrossMultiplication(expectedAST));

	if (answerFinal !== expectedFinal) {
		return { valid: false, status: 'bad_form', violations, messages };
	}

	// Form OK — check constraint violations
	return verdictOf(violations, messages);
}

/** Verdict d'une forme conforme : les violations strictes refusent, les autres avertissent */
function verdictOf(
	violations: Array<{ id: string; severity: 'strict' | 'warn' }>,
	messages: string[]
): CheckFormResult {
	const strictViolations = violations.filter((v) => v.severity === 'strict');
	const warnViolations = violations.filter((v) => v.severity === 'warn');

	if (strictViolations.length > 0) {
		return { valid: false, status: 'bad_form', violations: strictViolations, messages };
	}

	if (warnViolations.length > 0) {
		return { valid: true, status: 'unoptimal_form', violations: warnViolations, messages };
	}

	return { valid: true, status: 'correct', violations: [], messages };
}
