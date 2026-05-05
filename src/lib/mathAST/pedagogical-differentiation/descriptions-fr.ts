/**
 * Pedagogical Differentiation — French descriptions per rule × school level.
 *
 * Centralised lookup tables used by the renderer:
 *
 * - `TITLES[level][rule](bindings)` — short rule title (always emitted)
 * - `EXPLANATIONS[level][rule](bindings)` — longer pedagogical commentary
 *   (emitted only when `verbosity === 'detailed'`)
 *
 * Two levels are populated:
 *
 * - `lycee`     : verbeux, identification structurelle explicite, formule
 *                 générale en explanation
 * - `superieur` : compact, notation maximale, pas de formule générale
 *
 * `primaire` and `college` fall back to `lycee` (differentiation is not on the
 * syllabus before 1ère). The renderer applies that bump before lookup; the
 * tables below need not duplicate the lycee entries.
 *
 * Fallback chain :
 *   `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 *
 * @module mathAST/pedagogical-differentiation/descriptions-fr
 */

import type { SchoolLevel } from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';
import type { DifferentiationBindings, PedagogicalDifferentiationRule } from './types';

// =============================================================================
// Function signatures
// =============================================================================

export type TitleFn = (bindings: DifferentiationBindings) => string;
export type ExplainFn = (bindings: DifferentiationBindings) => string | undefined;

type RuleFnMap<F> = Partial<Record<PedagogicalDifferentiationRule, F>>;

// =============================================================================
// Helpers (binding readers)
// =============================================================================

/**
 * Defensive read of a node-valued binding. Returns a placeholder LaTeX symbol
 * (`?`) when the binding is missing — keeps the renderer from crashing in dev
 * snapshots while making the bug obvious.
 */
function bind(bindings: DifferentiationBindings, key: string): string {
	const node = bindings[key];
	if (!node) return '?';
	return toLatex(node);
}

// =============================================================================
// TITLES
// =============================================================================

const LYCEE_TITLES: RuleFnMap<TitleFn> = {
	// ---- Triviae ----
	constant: () => "Dérivée d'une constante",
	variable: () => 'Dérivée de la variable',
	'greek-letter': () => "Dérivée d'une lettre (constante)",
	// ---- Linearity ----
	sum: () => 'On dérive chaque terme',
	difference: () => 'On dérive chaque terme',
	negation: () => "Dérivée de l'opposé",
	'linear-coefficient': (b) => `On sort la constante ${bind(b, 'c')}`,
	'sum-with-constant': () => 'La constante a une dérivée nulle',
	'diff-with-constant': () => 'La constante a une dérivée nulle',
	// ---- Powers ----
	'power-natural': (b) => `Règle de la puissance (${bind(b, 'n')})`,
	'power-constant-exp': () => 'Règle de la puissance (exposant constant)',
	'power-constant-base': () => "Règle de l'exponentielle généralisée",
	'general-power': () => 'Règle générale de la puissance',
	// ---- Product / Quotient ----
	product: () => 'Règle du produit',
	quotient: () => 'Règle du quotient',
	inverse: () => "Dérivée de l'inverse",
	'derivative-of-inverse': () => 'Dérivée de 1/x',
	// ---- Trigonometric ----
	sin: () => 'Dérivée de sinus',
	cos: () => 'Dérivée de cosinus',
	tan: () => 'Dérivée de tangente',
	arcsin: () => "Dérivée de l'arcsinus",
	arccos: () => "Dérivée de l'arccosinus",
	arctan: () => "Dérivée de l'arctangente",
	// ---- Exponential / Logarithm ----
	exp: () => "Dérivée de l'exponentielle",
	ln: () => 'Dérivée du logarithme népérien',
	log: () => 'Dérivée du logarithme',
	// ---- Radical ----
	sqrt: () => 'Dérivée de la racine carrée',
	'derivative-of-sqrt': () => 'Dérivée de √x',
	// ---- Hyperbolic ----
	sinh: () => 'Dérivée de sinus hyperbolique',
	cosh: () => 'Dérivée de cosinus hyperbolique',
	tanh: () => 'Dérivée de tangente hyperbolique',
	asinh: () => "Dérivée de l'arcsinus hyperbolique",
	acosh: () => "Dérivée de l'arccosinus hyperbolique",
	atanh: () => "Dérivée de l'arctangente hyperbolique"
};

const SUPERIEUR_TITLES: RuleFnMap<TitleFn> = {
	sum: () => "(f+g)' = f' + g'",
	difference: () => "(f-g)' = f' - g'",
	negation: () => "(-f)' = -f'",
	'linear-coefficient': () => "(cf)' = cf'",
	'sum-with-constant': () => "(f+c)' = f'",
	'diff-with-constant': () => "(f-c)' = f'",
	'power-natural': () => "(x^n)' = nx^{n-1}",
	'power-constant-exp': () => "(f^c)' = cf^{c-1}f'",
	'power-constant-base': () => "(c^f)' = c^f \\ln(c) f'",
	'general-power': () => "(f^g)' = f^g(g'\\ln f + gf'/f)",
	product: () => "(uv)' = u'v + uv'",
	quotient: () => "(u/v)' = (u'v - uv')/v^2",
	inverse: () => "(1/f)' = -f'/f^2",
	'derivative-of-inverse': () => "(1/x)' = -1/x^2",
	sin: () => "(\\sin u)' = \\cos(u)\\,u'",
	cos: () => "(\\cos u)' = -\\sin(u)\\,u'",
	tan: () => "(\\tan u)' = u'/\\cos^2(u)",
	arcsin: () => "(\\arcsin u)' = u'/\\sqrt{1-u^2}",
	arccos: () => "(\\arccos u)' = -u'/\\sqrt{1-u^2}",
	arctan: () => "(\\arctan u)' = u'/(1+u^2)",
	exp: () => "(e^u)' = e^u\\,u'",
	ln: () => "(\\ln u)' = u'/u",
	log: () => "(\\log_b u)' = u'/(u\\ln b)",
	sqrt: () => "(\\sqrt u)' = u'/(2\\sqrt u)",
	'derivative-of-sqrt': () => "(\\sqrt x)' = 1/(2\\sqrt x)",
	sinh: () => "(\\sinh u)' = \\cosh(u)\\,u'",
	cosh: () => "(\\cosh u)' = \\sinh(u)\\,u'",
	tanh: () => "(\\tanh u)' = u'/\\cosh^2(u)",
	asinh: () => "(\\operatorname{argsh} u)' = u'/\\sqrt{u^2+1}",
	acosh: () => "(\\operatorname{argch} u)' = u'/\\sqrt{u^2-1}",
	atanh: () => "(\\operatorname{argth} u)' = u'/(1-u^2)"
};

export const TITLES: Record<SchoolLevel, RuleFnMap<TitleFn>> = {
	primaire: {}, // bumped to lycee by renderer
	college: {}, // bumped to lycee by renderer
	lycee: LYCEE_TITLES,
	superieur: SUPERIEUR_TITLES
};

// =============================================================================
// EXPLANATIONS (verbosity: 'detailed' only)
// =============================================================================

const LYCEE_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	// ---- Triviae (only emitted at top level) ----
	constant: () => "La dérivée d'une constante est nulle.",
	variable: () => 'La dérivée de la variable par rapport à elle-même vaut 1.',
	'greek-letter': () => 'Cette lettre représente une constante (paramètre), sa dérivée est nulle.',
	// ---- Linearity ----
	sum: (b) => `Avec f = ${bind(b, 'f')} et g = ${bind(b, 'g')}, ` + `on a (f+g)' = f' + g'.`,
	difference: (b) => `Avec f = ${bind(b, 'f')} et g = ${bind(b, 'g')}, ` + `on a (f-g)' = f' - g'.`,
	negation: (b) => `Avec f = ${bind(b, 'f')}, on a (-f)' = -f'.`,
	'linear-coefficient': (b) =>
		`La constante ${bind(b, 'c')} sort de la dérivation : ` +
		`(${bind(b, 'c')} \\cdot f)' = ${bind(b, 'c')} \\cdot f'.`,
	'sum-with-constant': (b) =>
		`La constante ${bind(b, 'c')} a une dérivée nulle, ` +
		`donc seule la dérivée de ${bind(b, 'f')} contribue.`,
	'diff-with-constant': (b) =>
		`La constante ${bind(b, 'c')} a une dérivée nulle, ` +
		`donc seule la dérivée de ${bind(b, 'f')} contribue (au signe près).`,
	// ---- Powers ----
	'power-natural': (b) => `(x^n)' = n x^{n-1} avec n = ${bind(b, 'n')}.`,
	'power-constant-exp': (b) =>
		`Avec f = ${bind(b, 'base')} et l'exposant constant ${bind(b, 'exp')}, ` +
		`on a (f^c)' = c \\cdot f^{c-1} \\cdot f'.`,
	'power-constant-base': (b) =>
		`Avec la base constante ${bind(b, 'base')}, on a ` +
		`(${bind(b, 'base')}^g)' = ${bind(b, 'base')}^g \\cdot \\ln(${bind(b, 'base')}) \\cdot g'.`,
	'general-power': (b) =>
		`Avec f = ${bind(b, 'base')} et g = ${bind(b, 'exp')} dépendant tous deux de la variable, ` +
		`on applique (f^g)' = f^g \\cdot (g' \\ln(f) + g f' / f).`,
	// ---- Product / Quotient ----
	product: (b) =>
		`Avec u = ${bind(b, 'u')} et v = ${bind(b, 'v')}, ` + `on applique (uv)' = u'v + uv'.`,
	quotient: (b) =>
		`Avec u = ${bind(b, 'u')} et v = ${bind(b, 'v')}, ` + `on applique (u/v)' = (u'v - uv') / v^2.`,
	inverse: (b) => `Avec f = ${bind(b, 'f')}, on a (1/f)' = -f'/f^2.`,
	'derivative-of-inverse': () => `(1/x)' = -1/x^2.`,
	// ---- Trigonometric ----
	sin: (b) => `Avec u = ${bind(b, 'u')}, on a (\\sin u)' = \\cos(u) \\cdot u'.`,
	cos: (b) => `Avec u = ${bind(b, 'u')}, on a (\\cos u)' = -\\sin(u) \\cdot u'.`,
	tan: (b) => `Avec u = ${bind(b, 'u')}, on a (\\tan u)' = u' / \\cos^2(u).`,
	arcsin: (b) => `Avec u = ${bind(b, 'u')}, on a (\\arcsin u)' = u' / \\sqrt{1 - u^2}.`,
	arccos: (b) => `Avec u = ${bind(b, 'u')}, on a (\\arccos u)' = -u' / \\sqrt{1 - u^2}.`,
	arctan: (b) => `Avec u = ${bind(b, 'u')}, on a (\\arctan u)' = u' / (1 + u^2).`,
	// ---- Exponential / Logarithm ----
	exp: (b) => `Avec u = ${bind(b, 'u')}, on a (e^u)' = e^u \\cdot u'.`,
	ln: (b) => `Avec u = ${bind(b, 'u')}, on a (\\ln u)' = u'/u.`,
	log: (b) =>
		`Avec u = ${bind(b, 'u')} et base ${bind(b, 'base')}, ` +
		`on a (\\log_b u)' = u' / (u \\ln(b)).`,
	// ---- Radical ----
	sqrt: (b) => `Avec u = ${bind(b, 'u')}, on a (\\sqrt u)' = u'/(2\\sqrt u).`,
	'derivative-of-sqrt': () => `(\\sqrt x)' = 1/(2\\sqrt x).`,
	// ---- Hyperbolic ----
	sinh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\sinh u)' = \\cosh(u) \\cdot u'.`,
	cosh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\cosh u)' = \\sinh(u) \\cdot u'.`,
	tanh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\tanh u)' = u' / \\cosh^2(u).`,
	asinh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\operatorname{argsh} u)' = u'/\\sqrt{u^2 + 1}.`,
	acosh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\operatorname{argch} u)' = u'/\\sqrt{u^2 - 1}.`,
	atanh: (b) => `Avec u = ${bind(b, 'u')}, on a (\\operatorname{argth} u)' = u'/(1 - u^2).`
};

export const EXPLANATIONS: Record<SchoolLevel, RuleFnMap<ExplainFn>> = {
	primaire: {},
	college: {},
	lycee: LYCEE_EXPLANATIONS,
	superieur: {} // supérieur: titles already carry the formula, no extra explanation
};

// =============================================================================
// Default descriptions (used by step.description at recording time)
// =============================================================================

/**
 * Plain-text default descriptions used as the `description` field on a recorded
 * step. The renderer overrides this with `TITLES[level][rule](bindings)` for
 * pedagogical output, but the default is kept so technical / debug rendering
 * remains informative.
 */
const DEFAULT_DESCRIPTIONS: Record<PedagogicalDifferentiationRule, string> = {
	constant: "Dérivée d'une constante",
	variable: 'Dérivée de la variable',
	'greek-letter': "Dérivée d'une lettre",
	sum: 'Règle de la somme',
	difference: 'Règle de la différence',
	negation: "Dérivée de l'opposé",
	'linear-coefficient': 'Constante multiplicative',
	'sum-with-constant': 'Somme avec constante',
	'diff-with-constant': 'Différence avec constante',
	'power-natural': 'Règle de la puissance (entier)',
	'power-constant-exp': 'Règle de la puissance (exposant constant)',
	'power-constant-base': 'Règle de la base constante',
	'general-power': 'Règle générale de la puissance',
	product: 'Règle du produit',
	quotient: 'Règle du quotient',
	inverse: "Dérivée de l'inverse",
	'derivative-of-inverse': 'Dérivée de 1/x',
	sin: 'Dérivée de sin',
	cos: 'Dérivée de cos',
	tan: 'Dérivée de tan',
	arcsin: "Dérivée d'arcsin",
	arccos: "Dérivée d'arccos",
	arctan: "Dérivée d'arctan",
	exp: "Dérivée de l'exponentielle",
	ln: 'Dérivée de ln',
	log: 'Dérivée de log',
	sqrt: 'Dérivée de la racine',
	'derivative-of-sqrt': 'Dérivée de √x',
	sinh: 'Dérivée de sinh',
	cosh: 'Dérivée de cosh',
	tanh: 'Dérivée de tanh',
	asinh: "Dérivée d'arcsinh",
	acosh: "Dérivée d'arccosh",
	atanh: "Dérivée d'arctanh"
};

export function getDefaultDescription(rule: PedagogicalDifferentiationRule): string {
	return DEFAULT_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}
