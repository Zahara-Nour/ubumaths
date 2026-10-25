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
 * ⚠️ Prose et maths (V25) : titres et explications sont rendus par
 * `InlineMarkdown` (ubumark). Toute formule va entre `$…$` (LaTeX) ; hors des
 * `$`, ni `\`, `^`, `_`, `{`, `*` ni `~`. Garde-fou :
 * `__tests__/prose-maths-delimitees.test.ts` (dans `mathAST/`). Les
 * descriptions par défaut, elles, restent du texte simple.
 *
 * @module mathAST/pedagogical-integration/descriptions-fr
 */

import type { SchoolLevel } from '../common/step-renderer-base';
import type { MathNode } from '../types';
import { extractExactRational } from '../common/numeric';
import { getVariables } from '../eval/substitute';
import { numericValueOrNaN } from '../integration/forbidden-value';
import { integrationLatex as toLatex } from './latex';
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

/** Une formule LaTeX dans la prose : entre `$…$`, rendue en maths par ubumark (V25) */
function math(latex: string): string {
	return `$${latex}$`;
}

/** Un binding en formule dans la prose : `$\\dfrac{1}{2}$` */
function bindMath(bindings: IntegrationBindings, key: string): string {
	return math(bind(bindings, key));
}

/**
 * Une différentielle `f dx` (LaTeX) : `dx` pour f = 1, `-dx` pour f = −1, une
 * somme entre parenthèses (`(2x + 1) dx`) — jamais « 1 dx » (V24).
 */
function differential(bindings: IntegrationBindings, key: string): string {
	const node = bindings[key];
	if (!node) return '?';
	if (node.type === 'number' && node.value === '1') return 'dx';
	if (node.type === 'opposite' && node.operand.type === 'number' && node.operand.value === '1') {
		return '-dx';
	}
	const isSum = node.type === 'addition' || node.type === 'subtraction';
	return isSum ? `\\left( ${toLatex(node)} \\right)\\,dx` : `${toLatex(node)}\\,dx`;
}

/** `cx` (LaTeX) sans le facteur 1 : `x`, `-x`, `3 x` (jamais « 1 x ») */
function constantTimesX(bindings: IntegrationBindings): string {
	const dx = differential(bindings, 'c');
	if (dx === 'dx') return 'x';
	if (dx === '-dx') return '-x';
	return `${bind(bindings, 'c')} x`;
}

/**
 * Une constante écrite juste après `\\int` : entre parenthèses si elle est
 * négative (`\\int \\left( -3 \\right) f(x)\\,dx`, jamais `\\int -3 …`, revue V25).
 */
function constantUnderIntegral(bindings: IntegrationBindings): string {
	const c = bind(bindings, 'c');
	return c.startsWith('-') ? `\\left( ${c} \\right)` : c;
}

/** `\\int c\\,dx` (LaTeX), la constante négative entre parenthèses */
function constantIntegral(bindings: IntegrationBindings): string {
	const dx = differential(bindings, 'c');
	if (dx === 'dx' || dx === '-dx') return `\\int ${dx}`;
	return `\\int ${constantUnderIntegral(bindings)}\\,dx`;
}

/** Une expression écrite comme facteur après `\\times` : entre parenthèses si elle commence par `-` ou est une somme */
function factorLatex(bindings: IntegrationBindings, key: string): string {
	const node = bindings[key];
	if (!node) return '?';
	const latex = toLatex(node);
	const isSum = node.type === 'addition' || node.type === 'subtraction';
	return isSum || latex.startsWith('-') ? `\\left( ${latex} \\right)` : latex;
}

/**
 * `k × u′g(u)` (LaTeX) : `\\dfrac{1}{2} \\times 2e^{2x}`, `3 \\times \\dfrac{1}{x}` ;
 * k = −1 s'écrit avec le seul signe : `-\\left( -e^{-x} \\right)`.
 */
export function revealedProduct(bindings: IntegrationBindings): string {
	if (isMinusOneCoefficient(bindings)) return `-${factorLatex(bindings, 'revealed')}`;
	return `${bind(bindings, 'k')} \\times ${factorLatex(bindings, 'revealed')}`;
}

/**
 * k = −1 : le seul signe s'écrit (`-\\int …`, « On sort le signe − »). La
 * constante s'appelle `k` dans `reveal-derivative`, `c` dans `extract-constant` :
 * une seule définition pour les deux étapes (décision de David du 2026-10-13).
 */
export function isMinusOneCoefficient(
	bindings: IntegrationBindings,
	key: 'k' | 'c' = 'k'
): boolean {
	// La VALEUR, pas le LaTeX : `(-1)x^2` lie `\\left( -1 \\right)` (revue du 2026-10-13)
	const node = bindings[key];
	const value = node ? extractExactRational(node) : null;
	return value !== null && value.n === -value.d;
}

/**
 * u′ = 1 (`\\frac3x`, `3(x+1)^2`) : la réécriture ne fait apparaître aucun u′,
 * elle sort seulement la constante k (décision de David du 2026-10-13)
 */
export function onlyConstantOut(bindings: IntegrationBindings): boolean {
	const du = bindings.du;
	return du?.type === 'number' && du.value === '1';
}

/** « On sort la constante $3$ », « On sort le signe $-$ » pour k = −1 */
function constantOutTitle(bindings: IntegrationBindings, key: 'k' | 'c' = 'k'): string {
	return isMinusOneCoefficient(bindings, key)
		? 'On sort le signe $-$'
		: `On sort la constante ${bindMath(bindings, key)}`;
}

/** `∫ -f(x) dx = -∫ f(x) dx`, l'intégrande négatif entre parenthèses (jamais `\\int -`) */
const SIGN_OUT_EXPLANATION =
	"Le signe $-$ sort de l'intégrale : $\\int \\left( -f(x) \\right)\\,dx = -\\int f(x)\\,dx$.";

/** Un intégrande écrit juste après `\\int` : entre parenthèses s'il commence par un signe ou est une somme */
function underIntegral(bindings: IntegrationBindings, key: string): string {
	const node = bindings[key];
	if (!node) return '?';
	const latex = toLatex(node);
	const wrap = node.type === 'addition' || node.type === 'subtraction' || node.type === 'opposite';
	return wrap || latex.startsWith('-') ? `\\left( ${latex} \\right)` : latex;
}

/** `\\int \\dfrac{3}{x}\\,dx = 3 \\int \\dfrac{1}{x}\\,dx` */
function constantOutEquality(bindings: IntegrationBindings): string {
	const dx = `\\,d${bindings.variable ? bind(bindings, 'variable') : 'x'}`;
	return `\\int ${underIntegral(bindings, 'integrand')}${dx} = ${coefficientPrefix(bindings)}\\int ${underIntegral(bindings, 'revealed')}${dx}`;
}

/** L'explication de « On sort la constante k » (u′ = 1) */
function constantOutExplanation(bindings: IntegrationBindings): string {
	const subject = isMinusOneCoefficient(bindings) ? 'Le signe $-$' : 'Une constante multiplicative';
	return `${subject} sort de l'intégrale : ${math(constantOutEquality(bindings))}.`;
}

/** `k` devant une intégrale ou une primitive : `\\dfrac{1}{2} `, `-` pour −1 */
export function coefficientPrefix(bindings: IntegrationBindings): string {
	return isMinusOneCoefficient(bindings) ? '-' : `${bind(bindings, 'k')} `;
}

/**
 * `\\left[ a ; b \\right]`, bornes dans l'ordre croissant (∫ₑ¹ porte sur
 * [1 ; e]) ; ordre d'écriture gardé si une borne n'est pas un nombre.
 */
function sortedInterval(lower: MathNode, upper: MathNode): string {
	const reversed = numericValueOrNaN(lower) > numericValueOrNaN(upper);
	const [lo, hi] = reversed ? [upper, lower] : [lower, upper];
	return `\\left[ ${toLatex(lo)} ; ${toLatex(hi)} \\right]`;
}

/** La phrase « u > 0 » d'une primitive ln u sans valeur absolue, ou '' */
function positivitySentence(bindings: IntegrationBindings, lnLatex: string): string {
	if (!bindings.positive) return '';
	const where =
		bindings.lower && bindings.upper
			? `sur ${math(sortedInterval(bindings.lower, bindings.upper))}`
			: 'pour tout réel';
	return ` Comme ${math(`${bind(bindings, 'positive')} > 0`)} ${where}, on écrit ${math(lnLatex)} sans valeur absolue.`;
}

/** La phrase de la constante sortie de l'intégrale par « On fait apparaître u′ » (ou « On sort la constante k »), ou '' */
function constantSentence(bindings: IntegrationBindings): string {
	if (!bindings.k || !bindings.scaled) return '';
	const out = isMinusOneCoefficient(bindings)
		? 'le signe $-$ sorti'
		: `la constante ${bindMath(bindings, 'k')} sortie`;
	return ` Avec ${out} de l'intégrale : ${bindMath(bindings, 'scaled')}.`;
}

/**
 * `F(b) - F(a)`, ou les bornes elles-mêmes quand l'une s'appelle a ou b
 * (`\\int_0^a` : « F(b) − F(a) » y serait faux)
 */
function boundsDifference(bindings: IntegrationBindings): string {
	const { lower, upper } = bindings;
	if (!lower || !upper) return 'F(b) - F(a)';
	const names = new Set([...getVariables(lower), ...getVariables(upper)]);
	if (!names.has('a') && !names.has('b')) return 'F(b) - F(a)';
	return `F(${toLatex(upper)}) - F(${toLatex(lower)})`;
}

/**
 * La formule d'IPP de terminale, en u et v′ (décision de David du 2026-10-13) :
 * version primitive, et version avec bornes pour une intégrale définie
 */
const PARTS_FORMULA_PRIMITIVE = "$\\int u(x)v'(x)\\,dx = u(x)v(x) - \\int u'(x)v(x)\\,dx$";
const PARTS_FORMULA_BOUNDED =
	"$\\int_a^b u(x)v'(x)\\,dx = \\left[u(x)v(x)\\right]_a^b - \\int_a^b u'(x)v(x)\\,dx$";

/**
 * La formule du lycée qu'annonce l'IPP : avec bornes dans une intégrale
 * définie (bindings `lower`/`upper`), puis la version primitive, celle des
 * lignes de calcul (le pipeline cherche une primitive avant le théorème
 * fondamental)
 */
function partsFormulaSentence(bindings: IntegrationBindings): string {
	const head = "L'intégration par parties s'utilise pour intégrer un produit $u(x)v'(x)$ : ";
	if (!bindings.lower || !bindings.upper) return `${head}${PARTS_FORMULA_PRIMITIVE}.`;
	return `${head}${PARTS_FORMULA_BOUNDED}. On cherche d'abord une primitive, avec la même formule sans bornes : ${PARTS_FORMULA_PRIMITIVE}.`;
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
	'extract-constant': (b) => constantOutTitle(b, 'c'),
	// ---- Composite forms ----
	'reveal-derivative': (b) =>
		onlyConstantOut(b) ? constantOutTitle(b) : "On fait apparaître $u'$",
	'apply-composite-power': () => "Forme $u'u^n$",
	'apply-composite-ln': () => "Forme $\\dfrac{u'}{u}$",
	'apply-composite-exp': () => "Forme $u'e^u$",
	'apply-composite-sin': () => "Forme $u'\\sin(u)$",
	'apply-composite-cos': () => "Forme $u'\\cos(u)$",
	// ---- Definite integral ----
	'apply-fundamental-theorem': () => 'Théorème fondamental du calcul intégral',
	'substitute-bounds': () => 'Évaluation aux bornes',
	'simplify-bounds-result': () => 'Calcul de la valeur',
	'integrand-undefined-on-interval': () => 'Intégrale non définie sur l’intervalle',
	// ---- u-substitution (sup, mais entrées présentes pour fallback) ----
	'identify-substitution': (b) => `Changement de variable : on pose ${math(`u = ${bind(b, 'u')}`)}`,
	'compute-du': () => 'Calcul de du',
	'apply-substitution': () => 'Application du changement de variable',
	'substitute-back': () => 'Retour à la variable initiale',
	// ---- IPP ----
	'identify-parts': () => 'Intégration par parties',
	'choose-u-dv': (b) =>
		`Choix : ${math(`u(x) = ${bind(b, 'u')}`)}, ${math(`v'(x) = ${bind(b, 'dv')}`)}`,
	'apply-parts-formula': () => `Formule de l'IPP : ${PARTS_FORMULA_PRIMITIVE}`,
	'apply-cyclic-ipp': () =>
		"IPP cyclique : on retrouve l'intégrale de départ, on résout l'équation",
	'decompose-rational': (b) =>
		`Décomposition en éléments simples : on cherche A et B tels que la fraction se décompose en ${math(`\\dfrac{A}{${bind(b, 'factor1')}} + \\dfrac{B}{${bind(b, 'factor2')}}`)}`,
	'apply-partial-fractions': (b) =>
		b.p
			? 'Intégration de chaque terme : $\\int \\dfrac{A}{px+q}\\,dx = \\dfrac{A}{p}\\ln|px+q|$'
			: 'Intégration de chaque terme : $\\int \\dfrac{A}{x-r}\\,dx = A\\ln|x-r|$',
	// ---- Final ----
	'add-constant': () => "On ajoute la constante d'intégration C",
	'simplify-result': () => 'On simplifie',
	'factor-result': () => 'On factorise',
	'expand-result': () => 'On développe'
};

const SUPERIEUR_TITLES: RuleFnMap<TitleFn> = {
	'identify-integrand': () => 'Intégrande',
	'identify-definite-integral': () => 'Intégrale définie',
	'apply-power-rule': () => '$\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1}$',
	'apply-constant-rule': () => '$\\int c\\,dx = cx$',
	'apply-known-primitive': () => 'Primitive',
	'apply-linearity-sum': () => '$\\int(f+g)\\,dx = \\int f\\,dx + \\int g\\,dx$',
	'extract-constant': (b) =>
		isMinusOneCoefficient(b, 'c') ? constantOutTitle(b, 'c') : '$\\int cf\\,dx = c\\int f\\,dx$',
	'reveal-derivative': (b) =>
		onlyConstantOut(b)
			? constantOutTitle(b)
			: math(`${bind(b, 'integrand')} = ${revealedProduct(b)}`),
	'apply-composite-power': () => "$\\int u'u^n\\,dx = \\dfrac{u^{n+1}}{n+1}$",
	'apply-composite-ln': () => "$\\int \\dfrac{u'}{u}\\,dx = \\ln|u|$",
	'apply-composite-exp': () => "$\\int u'e^u\\,dx = e^u$",
	'apply-composite-sin': () => "$\\int u'\\sin(u)\\,dx = -\\cos(u)$",
	'apply-composite-cos': () => "$\\int u'\\cos(u)\\,dx = \\sin(u)$",
	'apply-fundamental-theorem': () => '$\\int_a^b f\\,dx = \\left[F\\right]_a^b$',
	'substitute-bounds': () => '$\\left[F\\right]_a^b = F(b) - F(a)$',
	'simplify-bounds-result': () => 'Valeur',
	// Prose, pas de formule : le titre s'affiche en texte (V25)
	'integrand-undefined-on-interval': () => 'Intégrale non définie sur l’intervalle',
	'identify-substitution': (b) => math(`u = ${bind(b, 'u')}`),
	'compute-du': (b) => math(`du = ${bind(b, 'du')}\\,dx`),
	'apply-substitution': () => "$\\int f(g(x))g'(x)\\,dx = \\int f(u)\\,du$",
	'substitute-back': (b) => math(`u \\to ${bind(b, 'u')}`),
	'identify-parts': () => '$\\int u\\,dv$',
	'choose-u-dv': (b) => math(`u = ${bind(b, 'u')},\\ dv = ${bind(b, 'dv')}`),
	'apply-parts-formula': () => '$\\int u\\,dv = uv - \\int v\\,du$',
	'apply-cyclic-ipp': () => '$I\\,(1 - k) = u_0 v_0 - u_1 v_1$',
	'decompose-rational': (b) =>
		b.p
			? '$\\dfrac{P(x)}{Q(x)} = \\dfrac{A}{p_1x+q_1} + \\dfrac{B}{p_2x+q_2}$'
			: '$\\dfrac{P(x)}{Q(x)} = \\dfrac{A}{x-r_1} + \\dfrac{B}{x-r_2}$',
	'apply-partial-fractions': (b) =>
		b.p
			? '$\\int \\dfrac{A}{px+q}\\,dx = \\dfrac{A}{p}\\ln|px+q|$'
			: '$\\int \\dfrac{A}{x-r}\\,dx = A\\ln|x-r|$',
	'add-constant': () => '$+ C$',
	'simplify-result': () => 'Simplification',
	'factor-result': () => 'Forme factorisée',
	'expand-result': () => 'Forme développée'
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
		'Une intégrale définie $\\int_a^b f(x)\\,dx$ se calcule via une primitive F : on évalue $\\left[F(x)\\right]_a^b = F(b) - F(a)$.',
	'apply-power-rule': (b) =>
		`$(x^n)' = n x^{n-1}$, donc $\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1}$ avec ${math(`n = ${bind(b, 'n')}`)} (et $n \\neq -1$).`,
	'apply-constant-rule': (b) =>
		`Une constante c admet la primitive $cx$ : ${math(`${constantIntegral(b)} = ${constantTimesX(b)}`)}.`,
	'apply-known-primitive': (b) =>
		`On reconnaît une primitive de référence (table des primitives usuelles).${positivitySentence(b, `\\ln\\left( ${bind(b, 'positive')} \\right)`)}`,
	'apply-linearity-sum': () =>
		"L'intégrale est linéaire : $\\int (f+g)\\,dx = \\int f\\,dx + \\int g\\,dx$. On intègre chaque terme séparément.",
	'extract-constant': (b) =>
		isMinusOneCoefficient(b, 'c')
			? SIGN_OUT_EXPLANATION
			: `Une constante multiplicative sort de l'intégrale : ${math(`\\int ${constantUnderIntegral(b)} f(x)\\,dx = ${bind(b, 'c')} \\int f(x)\\,dx`)}.`,
	'reveal-derivative': (b) =>
		onlyConstantOut(b)
			? constantOutExplanation(b)
			: `Avec ${math(`u = ${bind(b, 'u')}`)}, on a ${math(`u' = ${bind(b, 'du')}`)}. On écrit ${math(`${bind(b, 'integrand')} = ${revealedProduct(b)}`)} pour faire apparaître $u'$, puis on sort ${isMinusOneCoefficient(b) ? 'le signe $-$' : `la constante ${bindMath(b, 'k')}`} de l'intégrale.`,
	'apply-composite-power': (b) =>
		`On reconnaît la forme $u'u^n$ avec ${math(`u = ${bind(b, 'u')}`)} et ${math(`n = ${bind(b, 'n')}`)}, dont une primitive est $\\dfrac{u^{n+1}}{n+1}$.${constantSentence(b)}`,
	'apply-composite-ln': (b) =>
		`On reconnaît la forme $\\dfrac{u'}{u}$ avec ${math(`u = ${bind(b, 'u')}`)}, dont une primitive est $\\ln|u|$.${positivitySentence(b, `\\ln\\left( ${bind(b, 'u')} \\right)`)}${constantSentence(b)}`,
	'apply-composite-exp': (b) =>
		`On reconnaît la forme $u'e^u$ avec ${math(`u = ${bind(b, 'u')}`)}, dont une primitive est $e^u$.${constantSentence(b)}`,
	'apply-composite-sin': (b) =>
		`On reconnaît la forme $u'\\sin(u)$ avec ${math(`u = ${bind(b, 'u')}`)}, dont une primitive est $-\\cos(u)$.${constantSentence(b)}`,
	'apply-composite-cos': (b) =>
		`On reconnaît la forme $u'\\cos(u)$ avec ${math(`u = ${bind(b, 'u')}`)}, dont une primitive est $\\sin(u)$.${constantSentence(b)}`,
	'apply-fundamental-theorem': (b) =>
		`On note F la primitive trouvée : ${math(`F(x) = ${bind(b, 'primitive')}`)}. L'intégrale vaut $\\left[F(x)\\right]_a^b$.`,
	'substitute-bounds': (b) =>
		`On évalue F aux bornes : ${math(boundsDifference(b))}, avec ${math(`F(x) = ${bind(b, 'primitive')}`)}.`,
	'simplify-bounds-result': () =>
		'On simplifie l’expression obtenue pour obtenir la valeur exacte (et numérique si possible).',
	'integrand-undefined-on-interval': () =>
		'Le théorème fondamental ne s’applique qu’à une fonction définie et continue sur tout l’intervalle d’intégration, bornes comprises. Ici la fonction a une valeur interdite dans l’intervalle : on ne calcule pas de valeur.',
	'identify-parts': partsFormulaSentence,
	'choose-u-dv': (b) =>
		`On pose ${math(`u(x) = ${bind(b, 'u')}`)} et ${math(`v'(x) = ${bind(b, 'dv')}`)}, donc ${math(`u'(x) = ${bind(b, 'du')}`)} et ${math(`v(x) = ${bind(b, 'v')}`)}.`,
	'apply-parts-formula': () =>
		`On applique la formule ${PARTS_FORMULA_PRIMITIVE}, puis on calcule l'intégrale restante.`,
	'apply-cyclic-ipp': () =>
		"Après deux IPP successives, l'intégrale de départ I réapparaît dans le second membre. On obtient une équation du type I = expression − k·I, qu'on résout pour I : I = expression / (1 − k).",
	'decompose-rational': (b) =>
		`On factorise le dénominateur : ${math(`${bind(b, 'denominator')} = ${bind(b, 'factoredDenominator')}`)}. Puis on décompose ${math(`\\dfrac{P(x)}{Q(x)} = \\dfrac{A}{${bind(b, 'factor1')}} + \\dfrac{B}{${bind(b, 'factor2')}}`)}. On trouve ${math(`A = ${bind(b, 'A')}`)} et ${math(`B = ${bind(b, 'B')}`)} (méthode des racines : substituer ${math(`x = ${bind(b, 'r1')}`)} et ${math(`x = ${bind(b, 'r2')}`)}).`,
	'apply-partial-fractions': (b) =>
		`${
			b.p
				? "Chaque terme $\\dfrac{A}{px+q}$ s'intègre en $\\dfrac{A}{p}\\ln|px+q|$."
				: "Chaque terme $\\dfrac{A}{x-r}$ s'intègre en $A\\ln|x-r|$."
		} ${
			bind(b, 'A') === '0' || bind(b, 'B') === '0'
				? 'Le seul terme non nul donne la primitive cherchée.'
				: 'La somme des deux logarithmes donne la primitive cherchée.'
		}`,
	'simplify-result': (b) =>
		b.exponential
			? b.developed
				? `On développe, puis on met ${bindMath(b, 'exponential')} en facteur.`
				: `On met ${bindMath(b, 'exponential')} en facteur.`
			: 'On écrit le résultat sous une forme simplifiée.',
	'factor-result': () => 'On écrit la primitive sous forme factorisée.',
	'expand-result': () => 'On écrit la primitive sous forme développée.',
	'add-constant': () =>
		'Une primitive est définie à une constante près : on ajoute toujours « + C » pour une intégrale indéfinie.'
};

/**
 * Supérieur : les autres règles reprennent l'explication du lycée (repli) ;
 * l'IPP garde la notation du supérieur, u et dv (décision de David du
 * 2026-10-13 : seul le lycée passe à u et v′).
 */
const SUPERIEUR_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'identify-parts': () =>
		"L'intégration par parties s'utilise pour intégrer un produit : $\\int u\\,dv = uv - \\int v\\,du$.",
	'choose-u-dv': (b) =>
		`On pose ${math(`u = ${bind(b, 'u')}`)} et ${math(`dv = ${bind(b, 'dv')}`)}, d'où ${math(`du = ${differential(b, 'du')}`)} et ${math(`v = ${bind(b, 'v')}`)}.`,
	'apply-parts-formula': () =>
		"On applique la formule $\\int u\\,dv = uv - \\int v\\,du$, puis on calcule l'intégrale restante."
};

export const EXPLANATIONS: Record<SchoolLevel, RuleFnMap<ExplainFn>> = {
	primaire: {},
	college: {},
	lycee: LYCEE_EXPLANATIONS,
	superieur: SUPERIEUR_EXPLANATIONS
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
	'reveal-derivative': "On fait apparaître u'",
	'apply-composite-power': "Forme u'·uⁿ",
	'apply-composite-ln': "Forme u'/u",
	'apply-composite-exp': "Forme u'·eᵘ",
	'apply-composite-sin': "Forme u'·sin(u)",
	'apply-composite-cos': "Forme u'·cos(u)",
	'apply-fundamental-theorem': 'Théorème fondamental du calcul intégral',
	'substitute-bounds': 'Substitution des bornes',
	'simplify-bounds-result': 'Calcul de la valeur',
	'integrand-undefined-on-interval': 'Intégrale non définie sur l’intervalle',
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
	'simplify-result': 'Simplification',
	'factor-result': 'Forme factorisée',
	'expand-result': 'Forme développée'
};

export function getDefaultDescription(rule: PedagogicalIntegrationRule): string {
	return DEFAULT_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}
