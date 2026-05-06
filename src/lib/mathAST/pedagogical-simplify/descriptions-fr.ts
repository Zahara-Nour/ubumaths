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
 * Two output spaces are populated :
 *
 *  - `getPedagogicalSimplifyRuleDescription(name)` — neutral pedagogical
 *    sentence stamped on every emitted `PedagogicalSimplifyStep`. Used by
 *    the pipeline (Phase 2). Single dictionary, no school-level adaptation.
 *
 *  - `TITLES[level][rule]` and `EXPLANATIONS[level][rule]` — school-level-
 *    adapted strings consumed by the Phase 3 renderer. Populated only for
 *    rules that materially benefit from a level-specific phrasing ; the
 *    renderer falls back through `lycee → step.description` for the rest.
 *
 * @module mathAST/pedagogical-simplify/descriptions-fr
 */

import type { SchoolLevel } from '../common/step-renderer-base';
import { getRuleDescription as getNormalizeRuleDescription } from '../normal/step-recorder';
import type { PedagogicalSimplifyStep } from './types';

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

// =============================================================================
// School-level adapted titles & explanations (Phase 3 renderer)
// =============================================================================

export type TitleFn = (step: PedagogicalSimplifyStep) => string;
export type ExplainFn = (step: PedagogicalSimplifyStep) => string | undefined;

type RuleFnMap<F> = Partial<Record<string, F>>;

/**
 * `lycee` is the default level-vocabulary anchor : every other level
 * references it via fallback. Aim for a teacher-correct French sentence
 * that reads well in the corresponding `EXPLANATIONS` table.
 */
const LYCEE_TITLES: RuleFnMap<TitleFn> = {
	// distribution
	'expand-sum-squared': () => 'On développe (a+b)² avec l’identité remarquable',
	'expand-diff-squared': () => 'On développe (a-b)² avec l’identité remarquable',
	'product-to-diff-squares': () => 'On reconnaît (a+b)(a-b) = a² - b²',
	'distribute-binomial-product': () => 'On distribue le produit des deux binômes',
	// factorisation
	'diff-squares-symbolic': () => 'On factorise avec a² - b² = (a+b)(a-b)',
	'diff-squares-numeric': () => 'On factorise avec a² - b² = (a+b)(a-b)',
	'perfect-square-trinomial': () => 'On reconnaît un trinôme carré parfait',
	'sum-cubes-symbolic': () => 'On factorise a³ + b³',
	'diff-cubes-symbolic': () => 'On factorise a³ - b³',
	// trig
	pythagorean: () => 'On utilise sin²(x) + cos²(x) = 1',
	'sin-negative': () => 'sin est impaire : sin(-x) = -sin(x)',
	'cos-negative': () => 'cos est paire : cos(-x) = cos(x)',
	'sin-period-2pi': () => 'sin est 2π-périodique',
	'cos-period-2pi': () => 'cos est 2π-périodique',
	'sin-over-cos': () => 'sin(x)/cos(x) = tan(x)',
	// log/exp
	'ln-exp': () => 'ln et exp sont réciproques : ln(eˣ) = x',
	'exp-ln': () => 'ln et exp sont réciproques : exp(ln(x)) = x',
	'ln-product': () => 'ln(a·b) = ln(a) + ln(b)',
	'ln-quotient': () => 'ln(a/b) = ln(a) - ln(b)',
	'ln-pow': () => 'ln(aⁿ) = n·ln(a)',
	// abs
	'abs-negation': () => '|-x| = |x|',
	'abs-product': () => '|a·b| = |a|·|b|',
	// puissances
	'same-base-mul': () => 'aᵐ · aⁿ = aᵐ⁺ⁿ',
	'pow-of-pow': () => '(aᵐ)ⁿ = aᵐⁿ',
	// radicaux
	'sqrt-product': () => '√(a·b) = √a · √b',
	'sqrt-square': () => '√(a²) = |a|',
	// normalize-side (frequent)
	'combine-like-terms': () => 'On regroupe les termes semblables',
	'simplify-fraction': () => 'On réduit la fraction',
	'radical-simplify': () => 'On simplifie le radical',
	'sqrt-extract-perfect-square': () => 'On extrait le carré parfait du radical',
	'expand-power': () => 'On développe la puissance',
	'trig-known-value': () => 'On évalue la valeur trigonométrique connue',
	'trig-pi-shift': () => 'On utilise la périodicité π'
};

const COLLEGE_TITLES: RuleFnMap<TitleFn> = {
	'expand-sum-squared': () => 'On utilise (a+b)² = a² + 2ab + b²',
	'expand-diff-squared': () => 'On utilise (a-b)² = a² - 2ab + b²',
	'product-to-diff-squares': () => 'On utilise (a+b)(a-b) = a² - b²',
	'distribute-binomial-product': () => 'On distribue chaque terme',
	'diff-squares-numeric': () => 'On factorise avec l’identité a² - b²',
	'perfect-square-trinomial': () => 'On reconnaît a² ± 2ab + b² = (a±b)²',
	'combine-like-terms': () => 'On regroupe les termes en x',
	'simplify-fraction': () => 'On simplifie la fraction'
};

const PRIMAIRE_TITLES: RuleFnMap<TitleFn> = {
	'combine-like-terms': () => 'On regroupe les nombres',
	'simplify-fraction': () => 'On rend la fraction plus simple',
	'abs-negation': () => 'L’opposé d’un nombre a la même distance à zéro',
	'additive-identity-left': () => 'Ajouter zéro ne change rien',
	'multiplicative-identity-left': () => 'Multiplier par 1 ne change rien'
};

const SUPERIEUR_TITLES: RuleFnMap<TitleFn> = {
	'expand-sum-squared': () => 'Identité (a+b)²',
	'expand-diff-squared': () => 'Identité (a-b)²',
	'product-to-diff-squares': () => 'Identité a² - b²',
	'distribute-binomial-product': () => 'Distribution',
	'diff-squares-symbolic': () => 'Factorisation a² - b²',
	'perfect-square-trinomial': () => 'Trinôme carré parfait',
	pythagorean: () => 'Pythagore',
	'sin-negative': () => 'Imparité de sin',
	'cos-negative': () => 'Parité de cos',
	'ln-product': () => 'ln additif',
	'ln-quotient': () => 'ln soustractif',
	'ln-pow': () => 'ln·n',
	'abs-negation': () => '|-x| = |x|',
	'same-base-mul': () => 'aᵐ⁺ⁿ',
	'sqrt-product': () => '√(ab)',
	'combine-like-terms': () => 'Termes semblables',
	'simplify-fraction': () => 'Réduction',
	'radical-simplify': () => 'Radical'
};

const TITLES: Record<SchoolLevel, RuleFnMap<TitleFn>> = {
	primaire: PRIMAIRE_TITLES,
	college: COLLEGE_TITLES,
	lycee: LYCEE_TITLES,
	superieur: SUPERIEUR_TITLES
};

const LYCEE_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'expand-sum-squared': () => 'Le carré d’une somme : (a+b)² = a² + 2ab + b².',
	'expand-diff-squared': () => 'Le carré d’une différence : (a-b)² = a² - 2ab + b².',
	'product-to-diff-squares': () => 'Le produit (a+b)(a-b) est la différence des carrés a² - b².',
	'distribute-binomial-product': () =>
		'On multiplie chaque terme du premier binôme par chaque terme du second.',
	'diff-squares-numeric': () =>
		'On reconnaît une différence de deux carrés : a² - b² = (a+b)(a-b).',
	'perfect-square-trinomial': () =>
		'On reconnaît un trinôme du second degré qui est le carré parfait d’un binôme.',
	pythagorean: () => 'L’identité fondamentale : pour tout x réel, sin²(x) + cos²(x) = 1.',
	'sin-negative': () => 'La fonction sinus est impaire : sin(-x) = -sin(x).',
	'cos-negative': () => 'La fonction cosinus est paire : cos(-x) = cos(x).',
	'ln-product': () => 'Le logarithme transforme un produit en somme : ln(a·b) = ln(a) + ln(b).',
	'ln-pow': () => 'Le logarithme d’une puissance : ln(aⁿ) = n·ln(a).',
	'abs-negation': () => 'La valeur absolue d’un nombre et de son opposé sont égales.',
	'combine-like-terms': () =>
		'On additionne (ou soustrait) les coefficients des termes ayant la même partie variable.',
	'simplify-fraction': () => 'On divise numérateur et dénominateur par leur PGCD.',
	'radical-simplify': () => 'On extrait du radical les facteurs qui sont des carrés parfaits.',
	'sqrt-extract-perfect-square': () =>
		'On extrait du radical les facteurs qui sont des carrés parfaits.'
};

const COLLEGE_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'expand-sum-squared': () =>
		'On utilise la première identité remarquable : (a+b)² = a² + 2ab + b².',
	'expand-diff-squared': () =>
		'On utilise la deuxième identité remarquable : (a-b)² = a² - 2ab + b².',
	'product-to-diff-squares': () =>
		'On utilise la troisième identité remarquable : (a+b)(a-b) = a² - b².',
	'distribute-binomial-product': () =>
		'On distribue : chaque terme du premier facteur multiplie chaque terme du second.',
	'combine-like-terms': () => 'Les termes en x se regroupent entre eux, ceux en x² entre eux, etc.',
	'simplify-fraction': () => 'On divise le numérateur et le dénominateur par un même nombre.'
};

const PRIMAIRE_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'combine-like-terms': () =>
		'On regroupe les nombres et les lettres pour avoir une expression plus courte.',
	'simplify-fraction': () =>
		'Une fraction peut s’écrire avec des nombres plus petits si on divise le haut et le bas par le même nombre.'
};

const EXPLANATIONS: Record<SchoolLevel, RuleFnMap<ExplainFn>> = {
	primaire: PRIMAIRE_EXPLANATIONS,
	college: COLLEGE_EXPLANATIONS,
	lycee: LYCEE_EXPLANATIONS,
	superieur: {} // sup is intentionally terse — title only, no explanation
};

/**
 * Resolve the school-level-adapted title for a step, with fallback :
 *   `TITLES[level][rule]` → `TITLES.lycee[rule]` → `step.description`
 *
 * Returns the title as a string ; the renderer wraps it into a
 * `RenderedStep`.
 */
export function lookupTitle(level: SchoolLevel, step: PedagogicalSimplifyStep): string {
	const fn =
		TITLES[level]?.[step.rule] ??
		TITLES.lycee?.[step.rule] ??
		((s: PedagogicalSimplifyStep) => s.description);
	return fn(step);
}

/**
 * Resolve the school-level-adapted explanation for a step. Returns
 * `undefined` when no entry exists (e.g. always at `superieur`, often at
 * other levels for less-pedagogical rules) so the renderer can omit the
 * field rather than fall back to the title.
 */
export function lookupExplanation(
	level: SchoolLevel,
	step: PedagogicalSimplifyStep
): string | undefined {
	const fn = EXPLANATIONS[level]?.[step.rule] ?? EXPLANATIONS.lycee?.[step.rule];
	return fn ? fn(step) : undefined;
}
