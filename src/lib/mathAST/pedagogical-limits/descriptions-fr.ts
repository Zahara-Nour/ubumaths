/**
 * Pedagogical Limits — French descriptions per rule × school level.
 *
 * Centralised lookup tables used by the renderer:
 *
 * - `TITLES[level][rule](step)` — short rule title (always emitted)
 * - `EXPLANATIONS[level][rule](step)` — longer pedagogical commentary
 *   (emitted only when `verbosity === 'detailed'`)
 *
 * Two levels are populated:
 *
 * - `lycee`     : verbeux, identification structurelle explicite, vocab
 *                 « théorème des gendarmes »
 * - `superieur` : compact, notation maximale, vocab « théorème
 *                 d'encadrement (squeeze) »
 *
 * `primaire` and `college` throw `PedagogicalLimitNotImplemented` upstream
 * (limits not in syllabus before Tle), so they are intentionally absent here.
 *
 * Fallback chain :
 *   `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 *
 * Prose : toute formule entre `$…$` (LaTeX), jamais en Unicode (`+∞`, `x²`,
 * `0/0`) — `InlineMarkdown` affiche titres et explications (V25, 2026-10-14) ;
 * garde : `__tests__/prose-maths-delimitees.test.ts`.
 *
 * Coverage notes :
 *
 * - V1 emits : `identify-limit`, `detect-indeterminate-form`,
 *   `apply-direct-substitution`, `apply-known-limit`, `factor-numerator`,
 *   `factor-denominator`, `simplify-common-factor`, `conclude`,
 *   `conclude-infinite`, `conclude-does-not-exist` ; en ±∞, la factorisation
 *   du terme prépondérant (`expand`, `factor-dominant-term`,
 *   `limits-of-terms`, `apply-product`, `apply-quotient`) ; en un pôle,
 *   `analyze-left-limit` / `analyze-right-limit` / `compare-one-sided`, et la
 *   composée `apply-composition` (`e^{1/x}`). All have entries in both
 *   LYCEE_TITLES and SUPERIEUR_TITLES.
 * - V1.1+ rules (`multiply-by-conjugate`, `apply-squeeze`, `apply-lhopital`,
 *   `analyze-left-limit`, `apply-composition`, …) have lycée entries
 *   prepared so adding the corresponding pipeline strategy in a follow-up
 *   does not require touching descriptions-fr.
 *
 * @module mathAST/pedagogical-limits/descriptions-fr
 */

import type { MathNode } from '../types';
import { isAddition, isSubtraction } from '../guards';
import { toLatex } from '../latex-generator';
import { containsVariable } from '../common/contains-variable';
import type { LimitsSchoolLevel } from './types';
import type { PedagogicalLimitRule, PedagogicalLimitStep } from './types';
import { approachMath, formMath, inlineMath } from './helpers';

// =============================================================================
// Function signatures
// =============================================================================

export type TitleFn = (step: PedagogicalLimitStep) => string;
export type ExplainFn = (step: PedagogicalLimitStep) => string | undefined;

type RuleFnMap<F> = Partial<Record<PedagogicalLimitRule, F>>;

// =============================================================================
// Helpers
// =============================================================================

// Toute formule de la prose entre `$…$` (V25, 2026-10-14) : `InlineMarkdown`
// l'affiche en maths. Jamais d'Unicode (`+∞`, `x²`, `0/0`) hors des `$…$`.

/** Le point d'approche : `$0$`, `$+\\infty$` */
function approachLabel(step: PedagogicalLimitStep): string {
	return approachMath(step.approach);
}

function valueLabel(step: PedagogicalLimitStep): string {
	return inlineMath(step.after);
}

/** La variable : `$x$` */
function variableLabel(step: PedagogicalLimitStep): string {
	return `$${step.variable}$`;
}

/** Facteur d'un produit en LaTeX : `\\left(-\\infty\\right)`, `\\left(-2\\right)`, `\\dfrac{1}{3}` */
function factorLatex(node: MathNode): string {
	const latex = toLatex(node);
	return node.type === 'infinity' || latex.startsWith('-') ? `\\left(${latex}\\right)` : latex;
}

/** Simplification par x^k en ±∞ : la puissance est en liaison `dominant`. */
function simplifyTitle(s: PedagogicalLimitStep, fallback: string): string {
	const dominant = s.bindings?.dominant;
	return dominant ? `Simplification par ${inlineMath(dominant)}` : fallback;
}

/**
 * Le facteur restant nommé en mots : « le quotient restant », « la parenthèse ».
 */
function restLabel(node: MathNode): string {
	if (node.type === 'division') return 'le quotient restant';
	if (isAddition(node) || isSubtraction(node)) return 'la parenthèse';
	return "l'autre facteur";
}

/**
 * « Le facteur $x^{3}$ tend vers $-\\infty$ et le quotient restant tend vers
 * $1$ : par produit, $\\left(-\\infty\\right) \\times 1 = -\\infty$ » ; un facteur
 * constant : « … et est multiplié par $\\dfrac{1}{2}$ ».
 */
function productExplanation(s: PedagogicalLimitStep): string | undefined {
	const { power, powerLimit, rest, restLimit } = s.bindings ?? {};
	if (!power || !powerLimit || !rest || !restLimit) return undefined;
	const other = containsVariable(rest, s.variable)
		? `${restLabel(rest)} tend vers ${inlineMath(restLimit)}`
		: `est multiplié par ${inlineMath(restLimit)}`;
	return (
		`Le facteur ${inlineMath(power)} tend vers ${inlineMath(powerLimit)} et ${other} : ` +
		`par produit, $${factorLatex(powerLimit)} \\times ${factorLatex(restLimit)} = ${toLatex(s.after)}$.`
	);
}

/** « Le numérateur tend vers $3$ et le dénominateur vers $2$ : … », « $2$ divisé par … » */
function quotientExplanation(s: PedagogicalLimitStep): string | undefined {
	const { numerator, numeratorLimit, denominatorLimit, denominatorAbsLimit } = s.bindings ?? {};
	if (!numerator || !numeratorLimit) return undefined;
	// Signe du dénominateur illisible ((π − 4)x²) : on raisonne en valeur absolue.
	if (denominatorAbsLimit) {
		return containsVariable(numerator, s.variable)
			? `Le numérateur tend vers ${inlineMath(numeratorLimit)} et le dénominateur, en valeur absolue, vers $+\\infty$ : par quotient, la limite vaut ${valueLabel(s)}.`
			: `${inlineMath(numeratorLimit)} divisé par une quantité dont la valeur absolue tend vers $+\\infty$ : la limite vaut ${valueLabel(s)}.`;
	}
	if (!denominatorLimit) return undefined;
	if (denominatorLimit.type === 'infinity' && !containsVariable(numerator, s.variable)) {
		return `${inlineMath(numeratorLimit)} divisé par une quantité qui tend vers ${inlineMath(denominatorLimit)} : la limite vaut ${valueLabel(s)}.`;
	}
	return `Le numérateur tend vers ${inlineMath(numeratorLimit)} et le dénominateur vers ${inlineMath(denominatorLimit)} : par quotient, la limite vaut ${valueLabel(s)}.`;
}

/**
 * Étude d'un côté :
 * - pôle d'un quotient : « Le numérateur tend vers $1$ et $x - 2 \\to 0^+$ : par
 *   quotient, la limite à droite vaut $+\\infty$. » ;
 * - domaine d'un seul côté (`\\ln x` en 0) : « L'expression n'est définie qu'à
 *   droite de $0$ : la limite en $0$ est la limite à droite. »
 */
function sideExplanation(s: PedagogicalLimitStep): string | undefined {
	const name = s.direction === 'left' ? 'gauche' : 'droite';
	const { numeratorLimit, denominator, denominatorSign, domainBoundary } = s.bindings ?? {};
	if (domainBoundary) {
		return `L'expression n'est définie qu'à ${name} de ${inlineMath(domainBoundary)} : la limite en ${inlineMath(domainBoundary)} est la limite à ${name}.`;
	}
	if (!numeratorLimit || !denominator || denominatorSign?.type !== 'infinity') return undefined;
	const side = denominatorSign.sign === 'positive' ? '+' : '-';
	return (
		`Le numérateur tend vers ${inlineMath(numeratorLimit)} et $${toLatex(denominator)} \\to 0^${side}$ : ` +
		`par quotient, la limite à ${name} vaut ${valueLabel(s)}.`
	);
}

/** Le côté en exposant : `^+`, `^-`, rien sans côté */
function sideMark(s: PedagogicalLimitStep): string {
	if (s.direction === 'left') return '^-';
	if (s.direction === 'right') return '^+';
	return '';
}

/** Le facteur `$x - a$` de la liaison `factor`, sinon « $x - a$ » en mots */
function factorOf(s: PedagogicalLimitStep): string {
	const factor = s.bindings?.factor;
	return factor ? inlineMath(factor) : `$${s.variable} - a$`;
}

/** « La limite à gauche vaut $-\\infty$ et la limite à droite $+\\infty$. » */
function compareExplanation(s: PedagogicalLimitStep): string | undefined {
	const { left, right } = s.bindings ?? {};
	if (!left || !right) return undefined;
	return `La limite à gauche vaut ${inlineMath(left)} et la limite à droite ${inlineMath(right)}.`;
}

/** « $\\lim_{X \\to +\\infty} e^{X} = +\\infty$ » : la limite de l'exponentielle en la limite de l'exposant */
function compositionExplanation(s: PedagogicalLimitStep): string | undefined {
	const innerLimit = s.bindings?.innerLimit;
	if (!innerLimit) return undefined;
	return `L'exposant tend vers ${inlineMath(innerLimit)}, et $\\lim_{X \\to ${toLatex(innerLimit)}} \\exponentialE^{X} = ${toLatex(s.after)}$ : par composition, la limite vaut ${valueLabel(s)}.`;
}

// =============================================================================
// TITLES
// =============================================================================

const LYCEE_TITLES: RuleFnMap<TitleFn> = {
	// ---- Identification ----
	'identify-limit': (s) =>
		`On veut calculer la limite de l'expression quand ${variableLabel(s)} tend vers ${approachMath(s.approach, s.direction)}`,
	'detect-indeterminate-form': (s) =>
		`Forme indéterminée ${formMath(s.indeterminateForm)} reconnue`,
	// ---- Direct techniques ----
	'apply-direct-substitution': (s) =>
		`Substitution directe : on remplace ${variableLabel(s)} par ${approachLabel(s)}`,
	'apply-known-limit': (s) => s.description, // re-uses KnownLimitEntry.descriptionFr
	'algebraic-simplification': () => 'Simplification algébrique',
	'abs-simplification': () => 'Résolution du signe de la valeur absolue',
	// ---- Factorisation ----
	'factor-numerator': () => `Factorisation du numérateur`,
	'factor-denominator': () => `Factorisation du dénominateur`,
	'simplify-common-factor': (s) => simplifyTitle(s, `Simplification du facteur commun`),
	// ---- Rationalisation (V1.1) ----
	'multiply-by-conjugate': () => `Rationalisation : on multiplie par le conjugué`,
	'simplify-after-rationalization': () => `Simplification après rationalisation`,
	// ---- Comportement à l'infini : factorisation du terme prépondérant ----
	expand: () => `On développe`,
	'factor-dominant-term': () => `On factorise par le terme prépondérant`,
	'limits-of-terms': () => `Limites des termes`,
	'apply-growth-comparison': () => `Comparaison des croissances`,
	'compute-asymptotic-equivalent': () => `Équivalent asymptotique`,
	// ---- Limites unilatérales (V1.1) ----
	'analyze-left-limit': (s) => `Étude de la limite à gauche en ${approachLabel(s)}`,
	'analyze-right-limit': (s) => `Étude de la limite à droite en ${approachLabel(s)}`,
	'compare-one-sided': () => `Comparaison des limites à gauche et à droite`,
	// ---- Squeeze / gendarmes (V1.1, lycée vocab) ----
	'identify-bounds': () => `Encadrement de l'expression`,
	'apply-squeeze': () => `Application du théorème des gendarmes`,
	// ---- L'Hôpital (sup uniquement, V1.1) ----
	'apply-lhopital': () => `Application de la règle de L'Hôpital`,
	// ---- Composition / opérations (V1.1) ----
	'identify-composition': () => `Identification de la composée`,
	'apply-composition': () => `Application de la limite d'une composée`,
	'apply-linearity': () => `Linéarité de la limite`,
	'apply-sum': () => `Limite d'une somme`,
	'apply-product': () => `Limite d'un produit`,
	'apply-quotient': () => `Limite d'un quotient`,
	// ---- Conclusion ----
	conclude: (s) => `La limite vaut ${valueLabel(s)}`,
	'conclude-does-not-exist': () =>
		`La limite n'existe pas (limites à gauche et à droite distinctes)`,
	'conclude-infinite': (s) => `La limite vaut ${valueLabel(s)}`
};

const SUPERIEUR_TITLES: RuleFnMap<TitleFn> = {
	// At supérieur the audience is assumed familiar — keep it tight.
	// Formule entre `$…$` : la prose est rendue par `InlineMarkdown` (V25)
	'identify-limit': (s) =>
		`Calcul de $\\lim_{${s.variable} \\to ${toLatex(s.approach)}${sideMark(s)}}$`,
	'detect-indeterminate-form': (s) => `Forme indéterminée ${formMath(s.indeterminateForm)}`,
	'apply-direct-substitution': () => `Continuité : substitution directe`,
	'apply-known-limit': (s) => s.description,
	'algebraic-simplification': () => `Simplification algébrique`,
	'abs-simplification': () => `Décomposition de la valeur absolue`,
	'factor-numerator': () => `Factorisation du numérateur`,
	'factor-denominator': () => `Factorisation du dénominateur`,
	'simplify-common-factor': (s) => simplifyTitle(s, `Simplification du facteur commun`),
	'multiply-by-conjugate': () => `Multiplication par le conjugué`,
	'simplify-after-rationalization': () => `Simplification post-rationalisation`,
	expand: () => `Développement`,
	'factor-dominant-term': () => `Factorisation par le terme prépondérant`,
	'limits-of-terms': () => `Limites des termes`,
	'apply-growth-comparison': () => `Croissances comparées`,
	'compute-asymptotic-equivalent': () => `Équivalent asymptotique`,
	'analyze-left-limit': (s) => `$\\lim_{${s.variable} \\to ${toLatex(s.approach)}^-}$`,
	'analyze-right-limit': (s) => `$\\lim_{${s.variable} \\to ${toLatex(s.approach)}^+}$`,
	'compare-one-sided': () => `Comparaison gauche/droite`,
	'identify-bounds': () => `Encadrement`,
	// Vocab : « théorème d'encadrement (squeeze) » au sup, pas « gendarmes »
	'apply-squeeze': () => `Théorème d'encadrement (squeeze)`,
	// Keep titles plain-text — LaTeX formulae go to `expressionLatex` (and
	// to EXPLANATIONS at sup, where they appear in markdown).
	'apply-lhopital': () => `Règle de L'Hôpital`,
	'identify-composition': () => `Composée $f \\circ g$`,
	'apply-composition': () => `Limite d'une composée`,
	'apply-linearity': () => `Linéarité`,
	'apply-sum': () => `Somme`,
	'apply-product': () => `Produit`,
	'apply-quotient': () => `Quotient`,
	conclude: (s) => `$= ${toLatex(s.after)}$`,
	'conclude-does-not-exist': () => `La limite n'existe pas`,
	'conclude-infinite': (s) => `$= ${toLatex(s.after)}$`
};

// =============================================================================
// EXPLANATIONS
// =============================================================================

const LYCEE_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'identify-limit': () =>
		`On commence par observer la forme de l'expression pour choisir une technique adaptée.`,
	'detect-indeterminate-form': (s) => {
		const form = s.indeterminateForm;
		if (form === '0/0') {
			return `Numérateur et dénominateur tendent vers $0$. Une simplification (factorisation, rationalisation) est nécessaire.`;
		}
		if (form === '∞/∞') {
			const simplifyBy = s.bindings?.simplifyBy;
			const next = simplifyBy
				? `On simplifie par ${inlineMath(simplifyBy)}.`
				: `On factorise par le terme prépondérant.`;
			return `Numérateur et dénominateur tendent vers l'infini : on ne peut pas conclure directement. ${next}`;
		}
		if (form === '∞-∞') {
			const next = s.bindings?.expandsTo
				? `On développe.`
				: `On factorise par le terme prépondérant.`;
			return `On a une différence d'infinis : on ne peut pas conclure directement. ${next}`;
		}
		if (form === '0*∞') {
			return `On a un produit indéterminé ${formMath(form)} : on transforme en quotient.`;
		}
		return `Forme indéterminée — il faut transformer l'expression pour conclure.`;
	},
	'apply-direct-substitution': () =>
		`L'expression est continue au point étudié, donc la limite vaut la valeur de l'expression en ce point.`,
	'apply-known-limit': () => `On reconnaît une limite de référence du cours.`,
	'factor-numerator': (s) =>
		`Le numérateur s'annule en ${approachLabel(s)}, donc ${factorOf(s)} en est un facteur. On factorise pour préparer la simplification.`,
	'factor-denominator': (s) =>
		`Le dénominateur s'annule en ${approachLabel(s)}, donc ${factorOf(s)} en est un facteur. On factorise pour préparer la simplification.`,
	'simplify-common-factor': (s) =>
		s.bindings?.dominant
			? `${inlineMath(s.bindings.dominant)} est un facteur commun au numérateur et au dénominateur : on simplifie.`
			: `Numérateur et dénominateur partagent un facteur commun. On le simplifie pour lever la forme indéterminée.`,
	expand: () =>
		`L'expression n'est pas développée : on la développe pour faire apparaître chaque puissance de la variable.`,
	'factor-dominant-term': (s) =>
		`Dans chaque somme, on met en facteur la plus grande puissance de ${variableLabel(s)} : les autres termes deviennent des quotients qui tendent vers $0$.`,
	'limits-of-terms': (s) =>
		`Un nombre divisé par une puissance de ${variableLabel(s)} tend vers $0$ : chaque parenthèse tend vers son premier terme.`,
	'apply-sum': () => `Pas de forme indéterminée : on conclut par somme des limites.`,
	'apply-product': (s) =>
		s.termLimits
			? `Pas de forme indéterminée : on conclut par produit des limites.`
			: productExplanation(s),
	'apply-quotient': (s) =>
		s.termLimits
			? `Pas de forme indéterminée : on conclut par quotient des limites.`
			: quotientExplanation(s),
	'analyze-left-limit': sideExplanation,
	'analyze-right-limit': sideExplanation,
	'compare-one-sided': compareExplanation,
	'apply-composition': compositionExplanation,
	'apply-squeeze': () =>
		`Si $f \\leq g \\leq h$ et si $f$ et $h$ tendent vers la même limite $\\ell$, alors $g$ aussi.`,
	conclude: () => `On peut maintenant conclure.`,
	'conclude-infinite': () => `Le résultat est une limite infinie.`,
	'conclude-does-not-exist': () =>
		`Comme les limites à gauche et à droite sont distinctes, la limite n'existe pas en ce point.`
};

const SUPERIEUR_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'detect-indeterminate-form': (s) => {
		// En ±∞ sur un polynôme ou un quotient de polynômes : terme prépondérant
		if (s.bindings?.expandsTo) return `On développe.`;
		if (s.bindings?.simplifyBy) return `On simplifie par ${inlineMath(s.bindings.simplifyBy)}.`;
		if (s.bindings?.dominant) return `On factorise par le terme prépondérant.`;
		const form = s.indeterminateForm;
		if (form === '0/0' || form === '∞/∞')
			return `On peut tenter L'Hôpital ou un développement asymptotique.`;
		return undefined;
	},
	'apply-lhopital': () =>
		`Sous les hypothèses de L'Hôpital, la limite du quotient est égale à la limite du quotient des dérivées.`,
	'apply-squeeze': () =>
		`Théorème d'encadrement : si $f \\leq g \\leq h$ et $\\lim f = \\lim h = \\ell$, alors $\\lim g = \\ell$.`,
	'analyze-left-limit': sideExplanation,
	'analyze-right-limit': sideExplanation,
	'apply-composition': compositionExplanation
};

// =============================================================================
// Public lookup tables
// =============================================================================

/**
 * Title lookup table indexed by school level then rule.
 *
 * Renderer should use the chain :
 *   `TITLES[level][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 */
export const TITLES: Readonly<Record<LimitsSchoolLevel, RuleFnMap<TitleFn>>> = {
	lycee: LYCEE_TITLES,
	superieur: SUPERIEUR_TITLES
};

/**
 * Explanation lookup table — only consulted when `verbosity === 'detailed'`.
 *
 * Sparse on purpose : not every rule warrants a long-form explanation. Sup
 * is even sparser (audience already knows the result).
 */
export const EXPLANATIONS: Readonly<Record<LimitsSchoolLevel, RuleFnMap<ExplainFn>>> = {
	lycee: LYCEE_EXPLANATIONS,
	superieur: SUPERIEUR_EXPLANATIONS
};

/**
 * Default fallback : returns the raw `step.description` recorded by the
 * pipeline. Renderer uses this when neither the level-specific table nor the
 * lycée table has an entry.
 */
export function getDefaultDescription(step: PedagogicalLimitStep): string {
	return step.description;
}
