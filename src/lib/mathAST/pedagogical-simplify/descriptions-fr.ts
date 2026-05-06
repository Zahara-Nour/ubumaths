/**
 * Pedagogical Simplify — French rule descriptions.
 *
 * Two source spaces feed `PedagogicalSimplifyStep.rule` :
 *
 *  1. Pattern rule names (from `pattern/rule-sets/*`) — short identifiers
 *     like `'pythagorean'`, `'expand-sum-squared'`, `'distribute-binomial-product'`.
 *
 *  2. Normalize step names (from `normal/normalize.ts`) — already documented
 *     in `normal/rule-descriptions-fr.ts`.
 *
 * The Phase 3 pedagogical renderer will rewrite these per `SchoolLevel`. This
 * module provides a default neutral French sentence used as the
 * `step.description` field when steps are emitted by the pipeline (Phase 2),
 * so consumers reading the raw recorder output do not see the generic
 * `"Règle: <name>"` fallback.
 *
 * @module mathAST/pedagogical-simplify/descriptions-fr
 */

import { getRuleDescription as getNormalizeRuleDescription } from '../normal/step-recorder';

/**
 * Default French descriptions for the pattern rules used by the pedagogical
 * pipeline. Keys are pattern rule names ; values are level-neutral sentences
 * suitable for the raw step recorder. The renderer (Phase 3) supplies
 * level-adapted titles and explanations on top.
 */
const PATTERN_RULE_DESCRIPTIONS: Readonly<Record<string, string>> = {
	// ---- distribution / expansion ---------------------------------------------
	'expand-sum-squared': 'Identité remarquable : (a+b)² = a² + 2ab + b²',
	'expand-diff-squared': 'Identité remarquable : (a-b)² = a² - 2ab + b²',
	'product-to-diff-squares': 'Identité remarquable : (a+b)(a-b) = a² - b²',
	'distribute-binomial-product': "Distribution d'un produit de deux binômes",

	// ---- factorisation --------------------------------------------------------
	'diff-squares-symbolic': 'Factorisation : a² - b² = (a+b)(a-b)',
	'diff-squares-numeric': 'Factorisation par identité remarquable : a² - b² = (a+b)(a-b)',
	'perfect-square-trinomial': 'Factorisation par identité remarquable : a² ± 2ab + b² = (a±b)²',
	'sum-cubes-symbolic': 'Factorisation : a³ + b³ = (a+b)(a² - ab + b²)',
	'sum-cubes-numeric': 'Factorisation : a³ + b³ = (a+b)(a² - ab + b²)',
	'diff-cubes-symbolic': 'Factorisation : a³ - b³ = (a-b)(a² + ab + b²)',
	'diff-cubes-numeric': 'Factorisation : a³ - b³ = (a-b)(a² + ab + b²)',

	// ---- valeur absolue -------------------------------------------------------
	'abs-negation': 'Simplification : |-x| = |x|',
	'abs-idempotent': 'Simplification : ||x|| = |x|',
	'abs-product': 'Distribution : |a·b| = |a|·|b|',
	'abs-quotient': 'Distribution : |a/b| = |a|/|b|',
	'abs-positive': 'Simplification : |x| = x (x positif)',
	'abs-negative': 'Simplification : |x| = -x (x négatif)',
	'abs-even-pow': 'Simplification : |xⁿ| = xⁿ (n pair)',
	'abs-pow-even': 'Simplification : |x|ⁿ = xⁿ (n pair)',

	// ---- identités trig (rules pattern) ---------------------------------------
	pythagorean: 'Identité de Pythagore : sin²(x) + cos²(x) = 1',
	'one-minus-sin-squared': '1 - sin²(x) = cos²(x)',
	'one-minus-cos-squared': '1 - cos²(x) = sin²(x)',
	'tan-squared-plus-one': 'tan²(x) + 1 = 1/cos²(x)',
	'sin-squared': 'Linéarisation : sin²(x) = (1 - cos(2x))/2',
	'cos-squared': 'Linéarisation : cos²(x) = (1 + cos(2x))/2',
	'sin-negative': 'Parité : sin(-x) = -sin(x)',
	'cos-negative': 'Parité : cos(-x) = cos(x)',
	'tan-negative': 'Parité : tan(-x) = -tan(x)',
	'sin-period-2pi': 'Périodicité : sin(x + 2π) = sin(x)',
	'cos-period-2pi': 'Périodicité : cos(x + 2π) = cos(x)',
	'sin-over-cos': 'Définition : sin(x)/cos(x) = tan(x)',
	'cos-over-sin': 'Définition : cos(x)/sin(x) = 1/tan(x)',
	'double-angle-sin': "Formule de l'angle double : sin(2x) = 2 sin(x) cos(x)",
	'sin-cos-product': 'Formule produit-somme : 2 sin(x) cos(x) = sin(2x)',

	// ---- identités log/exp (rules pattern) ------------------------------------
	'ln-exp': 'Inverses : ln(eˣ) = x',
	'exp-ln': 'Inverses : exp(ln(x)) = x',
	'ln-one': 'ln(1) = 0',
	'ln-e': 'ln(e) = 1',
	'ln-pow': 'Propriété du logarithme : ln(aⁿ) = n·ln(a)',
	'ln-product': 'Propriété du logarithme : ln(a·b) = ln(a) + ln(b)',
	'ln-quotient': 'Propriété du logarithme : ln(a/b) = ln(a) - ln(b)',

	// ---- puissances (rules pattern) -------------------------------------------
	'pow-one': 'a¹ = a',
	'pow-zero': 'a⁰ = 1',
	'one-pow': '1ⁿ = 1',
	'zero-pow': '0ⁿ = 0',
	'pow-of-pow': 'Puissance de puissance : (aᵐ)ⁿ = aᵐⁿ',
	'same-base-mul': 'Produit de puissances : aᵐ · aⁿ = aᵐ⁺ⁿ',
	'pow-of-quotient': "Puissance d'un quotient : (a/b)ⁿ = aⁿ/bⁿ",

	// ---- radicaux (rules pattern) ---------------------------------------------
	'sqrt-product': 'Propriété du radical : √(a·b) = √a · √b',
	'sqrt-quotient': 'Propriété du radical : √(a/b) = √a / √b',
	'sqrt-one': '√1 = 1',
	'sqrt-zero': '√0 = 0',
	'sqrt-square': '√(a²) = |a|',
	'square-sqrt': '(√a)² = a (a positif)'
};

/**
 * Resolve a French description for a pattern rule by name. Returns the
 * neutral pedagogical sentence if known, otherwise undefined (callers
 * should fall through to the normalize-side dictionary).
 */
function getPatternRuleDescription(name: string): string | undefined {
	return PATTERN_RULE_DESCRIPTIONS[name];
}

/**
 * Public default-description resolver consulted by `pipeline.ts`.
 *
 * Lookup order :
 *  1. Pattern rules (`PATTERN_RULE_DESCRIPTIONS` above)
 *  2. Normalize rules (`normal/rule-descriptions-fr.ts`)
 *  3. Generic fallback `"Règle : <name>"`
 *
 * The Phase 3 renderer overrides this with level-adapted titles ; this is
 * only the raw description embedded on every `PedagogicalSimplifyStep`.
 */
export function getPedagogicalSimplifyRuleDescription(name: string): string {
	const pattern = getPatternRuleDescription(name);
	if (pattern !== undefined) return pattern;
	// Falls back to the normalize-side dictionary, which itself returns
	// `"Règle : <name>"` for truly unknown names.
	return getNormalizeRuleDescription(name);
}
