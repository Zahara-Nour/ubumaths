/**
 * Pedagogical Integration — French descriptions per rule × school level.
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
 * `primaire` and `college` fall back to `lycee` (integration is not on the
 * syllabus before Terminale). The renderer applies that bump before lookup ;
 * the tables below need not duplicate the lycee entries.
 *
 * Fallback chain :
 *   `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 *
 * @module mathAST/pedagogical-integration/descriptions-fr
 */

import type { SchoolLevel } from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';
import type { IntegrationBindings, PedagogicalIntegrationRule } from './types';

// =============================================================================
// Function signatures
// =============================================================================

export type TitleFn = (bindings: IntegrationBindings) => string;
export type ExplainFn = (bindings: IntegrationBindings) => string | undefined;

type RuleFnMap<F> = Partial<Record<PedagogicalIntegrationRule, F>>;

// =============================================================================
// Helpers (binding readers)
// =============================================================================

/**
 * Defensive read of a node-valued binding. Returns a placeholder LaTeX symbol
 * (`?`) when the binding is missing — keeps the renderer from crashing in dev
 * snapshots while making the bug obvious.
 */
function bind(bindings: IntegrationBindings, key: string): string {
	const node = bindings[key];
	if (!node) return '?';
	return toLatex(node);
}

// =============================================================================
// TITLES
// =============================================================================

const LYCEE_TITLES: RuleFnMap<TitleFn> = {
	// ---- Identification ----
	'identify-integrand': () => 'Identification de la primitive à calculer',
	'identify-definite-integral': () => "Identification de l'intégrale définie",
	// ---- Direct primitives ----
	'apply-power-rule': () => 'Règle de la puissance',
	'apply-constant-rule': () => "Primitive d'une constante",
	'apply-known-primitive': () => 'Primitive usuelle',
	// ---- Linearity ----
	'apply-linearity-sum': () => 'Linéarité de l’intégrale',
	'extract-constant': (b) => `On sort la constante ${bind(b, 'c')}`,
	// ---- Composite forms ----
	'apply-composite-power': () => "Forme u'·uⁿ",
	'apply-composite-ln': () => "Forme u'/u",
	'apply-composite-exp': () => "Forme u'·eᵘ",
	'apply-composite-sin': () => "Forme u'·sin(u)",
	'apply-composite-cos': () => "Forme u'·cos(u)",
	// ---- Definite integral ----
	'apply-fundamental-theorem': () => 'Théorème fondamental du calcul intégral',
	'substitute-bounds': () => 'Évaluation aux bornes',
	'simplify-bounds-result': () => 'Calcul de la valeur',
	// ---- u-substitution (sup, mais entrées présentes pour fallback) ----
	'identify-substitution': (b) => `Changement de variable : on pose u = ${bind(b, 'u')}`,
	'compute-du': () => 'Calcul de du',
	'apply-substitution': () => 'Application du changement de variable',
	'substitute-back': () => 'Retour à la variable initiale',
	// ---- IPP ----
	'identify-parts': () => 'Intégration par parties',
	'choose-u-dv': (b) => `Choix : u = ${bind(b, 'u')}, dv = ${bind(b, 'dv')}`,
	'apply-parts-formula': () => "Formule de l'IPP : ∫u dv = uv − ∫v du",
	'apply-cyclic-ipp': () =>
		"IPP cyclique : on retrouve l'intégrale de départ, on résout l'équation",
	'decompose-rational': (b) =>
		`Décomposition en éléments simples : on cherche A et B tels que la fraction se décompose en A/(x − ${bind(b, 'r1')}) + B/(x − ${bind(b, 'r2')})`,
	'apply-partial-fractions': () => 'Intégration de chaque terme : ∫A/(x − r) dx = A·ln|x − r|',
	// ---- Final ----
	'add-constant': () => "On ajoute la constante d'intégration C",
	'simplify-result': () => 'Simplification du résultat'
};

const SUPERIEUR_TITLES: RuleFnMap<TitleFn> = {
	'identify-integrand': () => 'Intégrande',
	'identify-definite-integral': () => 'Intégrale définie',
	'apply-power-rule': () => '\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1}',
	'apply-constant-rule': () => '\\int c\\,dx = cx',
	'apply-known-primitive': () => 'Primitive',
	'apply-linearity-sum': () => '\\int(f+g)\\,dx = \\int f\\,dx + \\int g\\,dx',
	'extract-constant': () => '\\int cf\\,dx = c\\int f\\,dx',
	'apply-composite-power': () => "\\int u'u^n\\,dx = \\dfrac{u^{n+1}}{n+1}",
	'apply-composite-ln': () => "\\int \\dfrac{u'}{u}\\,dx = \\ln|u|",
	'apply-composite-exp': () => "\\int u'e^u\\,dx = e^u",
	'apply-composite-sin': () => "\\int u'\\sin(u)\\,dx = -\\cos(u)",
	'apply-composite-cos': () => "\\int u'\\cos(u)\\,dx = \\sin(u)",
	'apply-fundamental-theorem': () => '\\int_a^b f\\,dx = \\left[F\\right]_a^b',
	'substitute-bounds': () => '\\left[F\\right]_a^b = F(b) - F(a)',
	'simplify-bounds-result': () => 'Valeur',
	'identify-substitution': (b) => `u = ${bind(b, 'u')}`,
	'compute-du': (b) => `du = ${bind(b, 'du')}\\,dx`,
	'apply-substitution': () => "\\int f(g(x))g'(x)\\,dx = \\int f(u)\\,du",
	'substitute-back': (b) => `u \\to ${bind(b, 'u')}`,
	'identify-parts': () => '\\int u\\,dv',
	'choose-u-dv': (b) => `u = ${bind(b, 'u')},\\ dv = ${bind(b, 'dv')}`,
	'apply-parts-formula': () => '\\int u\\,dv = uv - \\int v\\,du',
	'apply-cyclic-ipp': () => 'I\\,(1 - k) = u_0 v_0 - u_1 v_1',
	'decompose-rational': () => '\\dfrac{P(x)}{Q(x)} = \\dfrac{A}{x-r_1} + \\dfrac{B}{x-r_2}',
	'apply-partial-fractions': () => '\\int \\dfrac{A}{x-r}\\,dx = A\\ln|x-r|',
	'add-constant': () => '+ C',
	'simplify-result': () => 'Simplification'
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
	'identify-integrand': () =>
		"Pour intégrer une fonction, on cherche une primitive : une fonction dont la dérivée est égale à l'intégrande.",
	'identify-definite-integral': () =>
		'Une intégrale définie ∫_a^b f(x) dx se calcule via une primitive F : on évalue [F(x)]_a^b = F(b) − F(a).',
	'apply-power-rule': (b) =>
		`(x^n)' = n·x^(n-1), donc ∫x^n dx = \\dfrac{x^{n+1}}{n+1} avec n = ${bind(b, 'n')} (et n ≠ -1).`,
	'apply-constant-rule': (b) =>
		`Une constante c admet la primitive c·x : ∫${bind(b, 'c')} dx = ${bind(b, 'c')}·x.`,
	'apply-known-primitive': () =>
		'On reconnaît une primitive de référence (table des primitives usuelles).',
	'apply-linearity-sum': () =>
		"L'intégrale est linéaire : ∫(f+g) dx = ∫f dx + ∫g dx. On intègre chaque terme séparément.",
	'extract-constant': (b) =>
		`Une constante multiplicative sort de l'intégrale : ∫${bind(b, 'c')}·f(x) dx = ${bind(b, 'c')}·∫f(x) dx.`,
	'apply-composite-power': (b) =>
		`On reconnaît la forme u'·u^n avec u = ${bind(b, 'u')} et n = ${bind(b, 'n')}, dont une primitive est \\dfrac{u^{n+1}}{n+1}.`,
	'apply-composite-ln': (b) =>
		`On reconnaît la forme u'/u avec u = ${bind(b, 'u')}, dont une primitive est ln|u|.`,
	'apply-composite-exp': (b) =>
		`On reconnaît la forme u'·e^u avec u = ${bind(b, 'u')}, dont une primitive est e^u.`,
	'apply-composite-sin': (b) =>
		`On reconnaît la forme u'·sin(u) avec u = ${bind(b, 'u')}, dont une primitive est -cos(u).`,
	'apply-composite-cos': (b) =>
		`On reconnaît la forme u'·cos(u) avec u = ${bind(b, 'u')}, dont une primitive est sin(u).`,
	'apply-fundamental-theorem': (b) =>
		`On note F la primitive trouvée : F(x) = ${bind(b, 'primitive')}. L'intégrale vaut [F(x)]_a^b.`,
	'substitute-bounds': (b) =>
		`On évalue F aux bornes : F(borne haute) − F(borne basse), avec F(x) = ${bind(b, 'primitive')}.`,
	'simplify-bounds-result': () =>
		'On simplifie l’expression obtenue pour obtenir la valeur exacte (et numérique si possible).',
	'identify-parts': () =>
		"L'intégration par parties s'utilise pour intégrer un produit : ∫u dv = uv − ∫v du.",
	'choose-u-dv': (b) =>
		`On pose u = ${bind(b, 'u')} et dv = ${bind(b, 'dv')}, d'où du = ${bind(b, 'du')} dx et v = ${bind(b, 'v')}.`,
	'apply-parts-formula': () =>
		"On applique la formule ∫u dv = uv − ∫v du, puis on calcule l'intégrale restante.",
	'apply-cyclic-ipp': () =>
		"Après deux IPP successives, l'intégrale de départ I réapparaît dans le second membre. On obtient une équation du type I = expression − k·I, qu'on résout pour I : I = expression / (1 − k).",
	'decompose-rational': (b) =>
		`On factorise le dénominateur : Q(x) = (x − ${bind(b, 'r1')})(x − ${bind(b, 'r2')}). Puis on décompose P(x)/Q(x) = A/(x − ${bind(b, 'r1')}) + B/(x − ${bind(b, 'r2')}). On trouve A = ${bind(b, 'A')} et B = ${bind(b, 'B')} (méthode des racines : substituer x = ${bind(b, 'r1')} et x = ${bind(b, 'r2')}).`,
	'apply-partial-fractions': () =>
		"Chaque terme A/(x − r) s'intègre en A·ln|x − r|. La somme des deux logarithmes donne la primitive cherchée.",
	'add-constant': () =>
		'Une primitive est définie à une constante près : on ajoute toujours « + C » pour une intégrale indéfinie.'
};

export const EXPLANATIONS: Record<SchoolLevel, RuleFnMap<ExplainFn>> = {
	primaire: {},
	college: {},
	lycee: LYCEE_EXPLANATIONS,
	superieur: {} // supérieur : titles already carry the formula, no extra explanation
};

// =============================================================================
// Default descriptions (used by step.description at recording time)
// =============================================================================

const DEFAULT_DESCRIPTIONS: Record<PedagogicalIntegrationRule, string> = {
	'identify-integrand': 'Identification de la primitive à calculer',
	'identify-definite-integral': "Identification de l'intégrale définie",
	'apply-power-rule': 'Règle de la puissance',
	'apply-constant-rule': "Primitive d'une constante",
	'apply-known-primitive': 'Primitive usuelle',
	'apply-linearity-sum': 'Linéarité (somme)',
	'extract-constant': 'Extraction de la constante',
	'apply-composite-power': "Forme u'·uⁿ",
	'apply-composite-ln': "Forme u'/u",
	'apply-composite-exp': "Forme u'·eᵘ",
	'apply-composite-sin': "Forme u'·sin(u)",
	'apply-composite-cos': "Forme u'·cos(u)",
	'apply-fundamental-theorem': 'Théorème fondamental du calcul intégral',
	'substitute-bounds': 'Substitution des bornes',
	'simplify-bounds-result': 'Calcul de la valeur',
	'identify-substitution': 'Identification de la substitution',
	'compute-du': 'Calcul de du',
	'apply-substitution': 'Substitution',
	'substitute-back': 'Retour à la variable initiale',
	'identify-parts': 'Identification des parties',
	'choose-u-dv': 'Choix de u et dv',
	'apply-parts-formula': "Formule de l'intégration par parties",
	'apply-cyclic-ipp': 'Résolution algébrique (IPP cyclique)',
	'decompose-rational': 'Décomposition en éléments simples',
	'apply-partial-fractions': 'Intégration des éléments simples',
	'add-constant': "Constante d'intégration",
	'simplify-result': 'Simplification'
};

export function getDefaultDescription(rule: PedagogicalIntegrationRule): string {
	return DEFAULT_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}
