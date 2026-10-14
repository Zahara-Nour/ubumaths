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
import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { isNegative, isZero } from '../normal/rational';
import type { PedagogicalSimplifyStep } from './types';
import {
	identityOfNode,
	readWrittenPolynomial,
	type PolynomialIdentity
} from './pedagogical-rules/polynomial-identities';
import { analyzeTrinomial, evidentRoot } from './factor-strategies';

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
	'common-factor-products': 'Factorisation par facteur commun : a·c + b·c = (a+b)·c',
	'common-factor-bare-term': 'Factorisation par facteur commun : c + b·c = (b+1)·c',
	// Le contenu : facteur numérique, monôme, ou non polynomial (eˣ, (x+1)…).
	'common-factor-content-add': 'Factorisation par facteur commun : k·a + k·b = k(a+b)',
	'common-factor-content-sub': 'Factorisation par facteur commun : k·a - k·b = k(a-b)',
	// Stratégies qui racontent (ADR 0024, `factor-strategies.ts`)
	'reduce-factors': 'Réduction de chaque facteur',
	'trinomial-roots': 'Factorisation par les racines du trinôme : a(x - x₁)(x - x₂)',
	'trinomial-integer-form': 'Factorisation à coefficients entiers',
	'evident-root': 'Factorisation par (x - r), r racine évidente',
	'develop-to-factor': 'Développement et réduction, pour faire apparaître une forme connue',

	// ---- valeur absolue -------------------------------------------------------
	'abs-negation': 'Simplification : |-x| = |x|',
	'abs-idempotent': 'Simplification : ||x|| = |x|',
	'abs-product': 'Distribution : |a·b| = |a|·|b|',
	'abs-quotient': 'Distribution : |a/b| = |a|/|b|',
	'abs-positive': 'Simplification : |x| = x (x positif)',
	'abs-negative': 'Simplification : |x| = -x (x négatif)',
	'length-radical': 'Une longueur est positive : √(AB²) = AB',
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
	'square-sqrt': '(√a)² = a (a positif)',

	// ---- règles de normalize dont le texte écrit `^` (V25) ---------------------
	// La prose est rendue par `InlineMarkdown` : un `^` hors des `$…$` s'afficherait
	// tel quel. Ces entrées passent devant `normal/rule-descriptions-fr.ts`.
	'euler-identities':
		"Propriétés de l'exponentielle : $\\ln(e^a) = a$, $e^{\\ln a} = a$, $e^a \\times e^b = e^{a+b}$, $(e^a)^n = e^{an}$",
	'radical-of-radical': 'Radical de radical : √(√a) = ⁴√a',
	'sqrt-to-half-power': 'Conversion en exposant fractionnaire : $\\sqrt{a} = a^{\\frac{1}{2}}$',
	'abs-even-power': 'Puissance paire et valeur absolue : |xⁿ| = xⁿ et |x|ⁿ = xⁿ pour n pair'
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

// =============================================================================
// Titres qui nomment a et b, Δ et les racines (stratégies de `factoriser`)
// =============================================================================

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

function superscriptText(n: number): string {
	return [...String(n)].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join('');
}

/** `−3/2`, `25` : signe moins typographique. */
function rationalText(r: Rational): string {
	const magnitude = `${r.n < 0n ? -r.n : r.n}${r.d === 1n ? '' : `/${r.d}`}`;
	return isNegative(r) ? `−${magnitude}` : magnitude;
}

/** `2x`, `x²`, `3x²`. */
function monomialText(coefficient: bigint, variable: string, degree: number): string {
	const power = degree === 1 ? '' : superscriptText(degree);
	return `${coefficient === 1n ? '' : coefficient}${variable}${power}`;
}

/** La phrase d'une identité lue par coefficients, ou `null` hors de ce domaine. */
function identityTitle(before: MathNode): string | null {
	const identity: PolynomialIdentity | null = identityOfNode(before);
	const variable = readWrittenPolynomial(before)?.variable;
	if (identity === null || variable === undefined) return null;
	const shapes = {
		'diff-squares': 'a² − b²',
		'perfect-square': identity.sign > 0 ? 'a² + 2ab + b²' : 'a² − 2ab + b²',
		'sum-cubes': 'a³ + b³',
		'diff-cubes': 'a³ − b³'
	};
	const monomial = monomialText(identity.alpha, variable, identity.degree);
	// Écrite constante devant (`9 − x²`) : a est la constante, b le monôme
	const [a, b] = identity.reversed
		? [`${identity.beta}`, monomial]
		: [monomial, `${identity.beta}`];
	return `On reconnaît ${shapes[identity.kind]} avec a = ${a} et b = ${b}`;
}

/** Le titre d'identité avec a et b, sinon le titre d'origine (motif symbolique, plusieurs lettres). */
function withIdentityTitle(fallback: string): TitleFn {
	return (step) => identityTitle(step.before) ?? fallback;
}

/** Δ et les racines, lus sur le trinôme de l'étape. */
function trinomialTitle(step: PedagogicalSimplifyStep): string {
	const written = readWrittenPolynomial(step.before);
	if (written?.coefficients?.length !== 3) return step.description;
	const { delta, parts, roots } = analyzeTrinomial(written.coefficients);
	const deltaText = `On calcule Δ = ${rationalText(delta)}`;
	if (parts.kind === 'surd') {
		const center = isZero(parts.center) ? '' : `${rationalText(parts.center)} `;
		const offset = `${parts.offset.n === 1n ? '' : parts.offset.n}√${parts.radicand}${parts.offset.d === 1n ? '' : `/${parts.offset.d}`}`;
		const root = (sign: string) =>
			center === '' ? `${sign === '+' ? '' : '−'}${offset}` : `${center}${sign} ${offset}`;
		return `${deltaText} : deux racines, x₁ = ${root('+')} et x₂ = ${root('−')}`;
	}
	if (parts.kind === 'double')
		return `${deltaText} : une racine double, x₀ = ${rationalText(roots[0])}`;
	return `${deltaText} : deux racines, x₁ = ${rationalText(roots[0])} et x₂ = ${rationalText(roots[1])}`;
}

/** « 1 est racine évidente : on factorise par (x − 1) ». */
function evidentRootTitle(step: PedagogicalSimplifyStep): string {
	const written = readWrittenPolynomial(step.before);
	const r = written?.coefficients ? evidentRoot(written.coefficients) : null;
	if (written === null || r === null) return step.description;
	const factor = `(${written.variable} ${r > 0n ? '−' : '+'} ${r > 0n ? r : -r})`;
	return `${r < 0n ? `−${-r}` : r} est racine évidente : on factorise par ${factor}`;
}

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
	'diff-squares-numeric': withIdentityTitle('On factorise avec a² - b² = (a+b)(a-b)'),
	'perfect-square-trinomial': withIdentityTitle('On reconnaît un trinôme carré parfait'),
	'sum-cubes-symbolic': () => 'On factorise a³ + b³',
	'diff-cubes-symbolic': () => 'On factorise a³ - b³',
	'sum-cubes-numeric': withIdentityTitle('On factorise a³ + b³'),
	'diff-cubes-numeric': withIdentityTitle('On factorise a³ - b³'),
	'reduce-factors': () => 'On réduit chaque facteur',
	'trinomial-roots': trinomialTitle,
	'trinomial-integer-form': () => 'On écrit les facteurs avec des coefficients entiers',
	'evident-root': evidentRootTitle,
	'develop-to-factor': () => 'On développe et on réduit',
	'common-factor-products': () => 'On met le facteur commun en évidence',
	'common-factor-bare-term': () => 'On met le facteur commun en évidence',
	'common-factor-content-add': () => 'On met le facteur commun en évidence',
	'common-factor-content-sub': () => 'On met le facteur commun en évidence',
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
	'diff-squares-numeric': withIdentityTitle('On factorise avec l’identité a² - b²'),
	'perfect-square-trinomial': withIdentityTitle('On reconnaît a² ± 2ab + b² = (a±b)²'),
	'common-factor-products': () => 'On met en facteur ce qui est commun',
	'common-factor-bare-term': () => 'On met en facteur ce qui est commun',
	'common-factor-content-add': () => 'On met en facteur ce qui est commun',
	'common-factor-content-sub': () => 'On met en facteur ce qui est commun',
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
	'common-factor-products': () => 'Facteur commun',
	'common-factor-bare-term': () => 'Facteur commun',
	'common-factor-content-add': () => 'Facteur commun',
	'common-factor-content-sub': () => 'Facteur commun',
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
	'reduce-factors': () =>
		'Dans chaque facteur, on supprime les parenthèses et on regroupe les termes semblables.',
	'trinomial-roots': () =>
		'Quand Δ = b² − 4ac est positif ou nul, le trinôme ax² + bx + c s’écrit a(x − x₁)(x − x₂), où x₁ et x₂ sont ses racines.',
	'trinomial-integer-form': () =>
		'On multiplie un facteur par a, ou par un diviseur de a, pour que ses coefficients soient entiers.',
	'develop-to-factor': () =>
		'Aucun facteur commun ni identité n’apparaît tel quel : on développe pour faire apparaître une forme connue.',
	'evident-root': () =>
		'Si P(r) = 0, alors P(x) se factorise par (x − r) : le second facteur s’obtient par division (ou par identification).',
	'common-factor-products': () =>
		'Les deux termes ont un facteur commun : on l’écrit une seule fois, devant la somme de ce qui reste — a·c + b·c = (a+b)·c.',
	'common-factor-bare-term': () =>
		'Le facteur commun est écrit seul dans l’un des termes : il y compte donc pour 1, et c’est de là que vient le 1 de la parenthèse — c + b·c = (b+1)·c.',
	'common-factor-content-add': () =>
		'Tous les termes ont un facteur commun : on l’écrit une seule fois, et la parenthèse garde ce qui reste de chaque terme — k·a + k·b = k(a+b).',
	'common-factor-content-sub': () =>
		'Tous les termes ont un facteur commun : on l’écrit une seule fois, et la parenthèse garde ce qui reste de chaque terme — k·a - k·b = k(a-b).',
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
		'On extrait du radical les facteurs qui sont des carrés parfaits.',
	// « développer » rédigé (`expand-steps.ts`) : le titre est dans la description
	'expand-whole-power': () =>
		'Au-delà du cube, distribuer à la main serait trop long : le développement est donné d’un coup.',
	'expand-split-power': () =>
		'Une puissance est un produit de facteurs égaux, qu’on développe un produit après l’autre.',
	'expand-identity': () =>
		'Une identité remarquable donne le développement d’un coup : on remplace a et b dans le membre de droite.',
	'expand-compute': () =>
		'On multiplie les nombres entre eux et les lettres entre elles, avec la règle des signes : 2x × 3 = 6x, x × x = x².',
	'expand-reduce-inside': () =>
		'On regroupe les termes semblables de la parenthèse avant de distribuer : il y aura moins de produits.',
	'expand-distribute': () =>
		'Chaque terme d’une parenthèse multiplie chaque terme de l’autre ; le signe de chaque produit suit la règle des signes.',
	'expand-distribute-factor': () =>
		'k(a + b) = ka + kb : le facteur multiplie chaque terme de la parenthèse.',
	'expand-remove-parentheses': () =>
		'−(a + b) = −a − b : enlever une parenthèse précédée d’un −, c’est changer le signe de chacun de ses termes.',
	'expand-unwrap': () => 'Une parenthèse précédée d’un + s’enlève sans rien changer.',
	'expand-double-minus': () => '−(−a) = a : l’opposé de l’opposé d’un nombre, c’est ce nombre.',
	'expand-reduce': () =>
		'On additionne (ou soustrait) les coefficients des termes ayant la même partie variable.',
	'expand-coefficients': () => 'Le coefficient s’écrit devant les lettres : y/2 = ½ y, x × 3 = 3x.',
	'expand-order': () => 'On range les termes par puissances décroissantes de x.',
	'expand-order-alphabetical': () => 'On range les termes dans l’ordre alphabétique des lettres.'
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
	'simplify-fraction': () => 'On divise le numérateur et le dénominateur par un même nombre.',
	'common-factor-products': () =>
		'Le même facteur se trouve dans les deux termes : on l’écrit une fois devant la parenthèse.',
	'common-factor-bare-term': () =>
		'Le facteur commun est seul dans l’un des termes : il compte pour 1 dans la parenthèse.',
	'common-factor-content-add': () =>
		'Le même facteur se trouve dans tous les termes : on l’écrit une fois, à côté de la parenthèse.',
	'common-factor-content-sub': () =>
		'Le même facteur se trouve dans tous les termes : on l’écrit une fois, à côté de la parenthèse.',
	'reduce-factors': () =>
		'Dans chaque parenthèse, on enlève les parenthèses intérieures et on regroupe les termes en x.'
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
