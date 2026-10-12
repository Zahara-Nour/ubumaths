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
 * Coverage notes :
 *
 * - V1 emits : `identify-limit`, `detect-indeterminate-form`,
 *   `apply-direct-substitution`, `apply-known-limit`, `factor-numerator`,
 *   `factor-denominator`, `simplify-common-factor`, `conclude`,
 *   `conclude-infinite`, `conclude-does-not-exist` ; en ±∞, la factorisation
 *   du terme prépondérant (`expand`, `factor-dominant-term`,
 *   `limits-of-terms`, `apply-product`, `apply-quotient`). All have entries
 *   in both LYCEE_TITLES and SUPERIEUR_TITLES.
 * - V1.1+ rules (`multiply-by-conjugate`, `apply-squeeze`, `apply-lhopital`,
 *   `analyze-left-limit`, `apply-composition`, …) have lycée entries
 *   prepared so adding the corresponding pipeline strategy in a follow-up
 *   does not require touching descriptions-fr.
 *
 * @module mathAST/pedagogical-limits/descriptions-fr
 */

import type { MathNode } from '../types';
import type { IndeterminateForm } from '../limits/types';
import { isNumber, isSuperscript, isVariable } from '../guards';
import { containsVariable } from '../common/contains-variable';
import type { LimitsSchoolLevel } from './types';
import type { PedagogicalLimitRule, PedagogicalLimitStep } from './types';
import { formatValueShort } from './helpers';

// =============================================================================
// Function signatures
// =============================================================================

export type TitleFn = (step: PedagogicalLimitStep) => string;
export type ExplainFn = (step: PedagogicalLimitStep) => string | undefined;

type RuleFnMap<F> = Partial<Record<PedagogicalLimitRule, F>>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Render an approach point as plain text suitable for prose titles.
 * (LaTeX-flavoured rendering is handled by the renderer's
 * `formatExpressionLatex`.)
 */
function approachLabel(step: PedagogicalLimitStep): string {
	return formatValueShort(step.approach);
}

function valueLabel(step: PedagogicalLimitStep): string {
	return formatValueShort(step.after);
}

/** `∞/∞`, `∞ − ∞`, `0 × ∞` : la forme écrite comme au tableau */
function formLabel(form: IndeterminateForm | undefined): string {
	if (form === '∞-∞') return '∞ − ∞';
	if (form === '0*∞') return '0 × ∞';
	return form ?? '?';
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Une puissance de la variable en texte : `x`, `x²`, `x¹⁰` */
function powerLabel(node: MathNode): string {
	if (isVariable(node)) return node.name;
	if (isSuperscript(node) && isVariable(node.base) && isNumber(node.superscript)) {
		const digits = [...node.superscript.value].map((d) => SUPERSCRIPT_DIGITS[Number(d)]);
		return `${node.base.name}${digits.join('')}`;
	}
	return formatValueShort(node);
}

/** Facteur d'un produit écrit en texte : `(−∞)`, `(−2)`, `1/3` */
function factorLabel(node: MathNode): string {
	const text = formatValueShort(node);
	return node.type === 'infinity' || text.startsWith('−') ? `(${text})` : text;
}

/** Simplification par x^k en ±∞ : la puissance est en liaison `dominant`. */
function simplifyTitle(s: PedagogicalLimitStep, fallback: string): string {
	const dominant = s.bindings?.dominant;
	return dominant ? `Simplification par ${powerLabel(dominant)}` : fallback;
}

/** « Le facteur x³ tend vers −∞ et l'autre facteur tend vers −2 : par produit, … » */
function productExplanation(s: PedagogicalLimitStep): string | undefined {
	const { power, powerLimit, restLimit } = s.bindings ?? {};
	if (!power || !powerLimit || !restLimit) return undefined;
	return (
		`Le facteur ${powerLabel(power)} tend vers ${formatValueShort(powerLimit)} et l'autre facteur ` +
		`tend vers ${formatValueShort(restLimit)} : par produit, ${factorLabel(powerLimit)} × ` +
		`${factorLabel(restLimit)} = ${valueLabel(s)}.`
	);
}

/** « Le numérateur tend vers 3 et le dénominateur vers 2 : … », « 2 divisé par … » */
function quotientExplanation(s: PedagogicalLimitStep): string | undefined {
	const { numerator, numeratorLimit, denominatorLimit } = s.bindings ?? {};
	if (!numerator || !numeratorLimit || !denominatorLimit) return undefined;
	if (denominatorLimit.type === 'infinity' && !containsVariable(numerator, s.variable)) {
		return `${formatValueShort(numeratorLimit)} divisé par une quantité qui tend vers ${formatValueShort(denominatorLimit)} : la limite vaut ${valueLabel(s)}.`;
	}
	return `Le numérateur tend vers ${formatValueShort(numeratorLimit)} et le dénominateur vers ${formatValueShort(denominatorLimit)} : par quotient, la limite vaut ${valueLabel(s)}.`;
}

// =============================================================================
// TITLES
// =============================================================================

const LYCEE_TITLES: RuleFnMap<TitleFn> = {
	// ---- Identification ----
	'identify-limit': (s) =>
		`On veut calculer la limite de l'expression quand ${s.variable} tend vers ${approachLabel(s)}`,
	'detect-indeterminate-form': (s) =>
		`Forme indéterminée ${formLabel(s.indeterminateForm)} reconnue`,
	// ---- Direct techniques ----
	'apply-direct-substitution': (s) =>
		`Substitution directe : on remplace ${s.variable} par ${approachLabel(s)}`,
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
	'identify-limit': (s) => `Calcul de \\lim_{${s.variable} \\to ${approachLabel(s)}}`,
	'detect-indeterminate-form': (s) => `Forme indéterminée ${formLabel(s.indeterminateForm)}`,
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
	'analyze-left-limit': (s) => `\\lim_{${s.variable} \\to ${approachLabel(s)}^-}`,
	'analyze-right-limit': (s) => `\\lim_{${s.variable} \\to ${approachLabel(s)}^+}`,
	'compare-one-sided': () => `Comparaison gauche/droite`,
	'identify-bounds': () => `Encadrement`,
	// Vocab : « théorème d'encadrement (squeeze) » au sup, pas « gendarmes »
	'apply-squeeze': () => `Théorème d'encadrement (squeeze)`,
	// Keep titles plain-text — LaTeX formulae go to `expressionLatex` (and
	// to EXPLANATIONS at sup, where they appear in markdown).
	'apply-lhopital': () => `Règle de L'Hôpital`,
	'identify-composition': () => `Composée f \\circ g`,
	'apply-composition': () => `Limite d'une composée`,
	'apply-linearity': () => `Linéarité`,
	'apply-product': () => `Produit`,
	'apply-quotient': () => `Quotient`,
	conclude: (s) => `= ${valueLabel(s)}`,
	'conclude-does-not-exist': () => `La limite n'existe pas`,
	'conclude-infinite': (s) => `= ${valueLabel(s)}`
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
			return `Numérateur et dénominateur tendent vers 0. Une simplification (factorisation, rationalisation) est nécessaire.`;
		}
		if (form === '∞/∞') {
			return `Numérateur et dénominateur tendent vers l'infini : on ne peut pas conclure directement. On factorise par le terme prépondérant.`;
		}
		if (form === '∞-∞') {
			return `On a une différence d'infinis : on ne peut pas conclure directement. On factorise par le terme prépondérant.`;
		}
		if (form === '0*∞') {
			return `On a un produit indéterminé 0 × ∞ : on transforme en quotient.`;
		}
		return `Forme indéterminée — il faut transformer l'expression pour conclure.`;
	},
	'apply-direct-substitution': () =>
		`L'expression est continue au point étudié, donc la limite vaut la valeur de l'expression en ce point.`,
	'apply-known-limit': () => `On reconnaît une limite de référence du cours.`,
	'factor-numerator': () =>
		`Si le numérateur s'annule au point étudié, alors (x − a) en est un facteur. On factorise pour préparer la simplification.`,
	'factor-denominator': () =>
		`Si le dénominateur s'annule au point étudié, alors (x − a) en est un facteur. On factorise pour préparer la simplification.`,
	'simplify-common-factor': (s) =>
		s.bindings?.dominant
			? `${powerLabel(s.bindings.dominant)} est un facteur commun au numérateur et au dénominateur : on simplifie.`
			: `Numérateur et dénominateur partagent un facteur commun. On le simplifie pour lever la forme indéterminée.`,
	expand: () =>
		`L'expression n'est pas développée : on la développe pour faire apparaître chaque puissance de la variable.`,
	'factor-dominant-term': (s) =>
		`Dans chaque somme, on met en facteur la plus grande puissance de ${s.variable} : les autres termes deviennent des quotients qui tendent vers 0.`,
	'limits-of-terms': (s) =>
		`Un nombre divisé par une puissance de ${s.variable} tend vers 0 : chaque parenthèse tend vers son premier terme.`,
	'apply-product': productExplanation,
	'apply-quotient': quotientExplanation,
	'apply-squeeze': () => `Si f ≤ g ≤ h et f, h tendent vers la même limite ℓ, alors g aussi.`,
	conclude: () => `On peut maintenant conclure.`,
	'conclude-infinite': () => `Le résultat est une limite infinie.`,
	'conclude-does-not-exist': () =>
		`Comme les limites à gauche et à droite sont distinctes, la limite n'existe pas en ce point.`
};

const SUPERIEUR_EXPLANATIONS: RuleFnMap<ExplainFn> = {
	'detect-indeterminate-form': (s) => {
		// En ±∞ sur un polynôme ou un quotient de polynômes : terme prépondérant
		if (s.bindings?.dominant) return `On factorise par le terme prépondérant.`;
		const form = s.indeterminateForm;
		if (form === '0/0' || form === '∞/∞')
			return `On peut tenter L'Hôpital ou un développement asymptotique.`;
		return undefined;
	},
	'apply-lhopital': () =>
		`Sous les hypothèses de L'Hôpital, la limite du quotient est égale à la limite du quotient des dérivées.`,
	'apply-squeeze': () =>
		`Théorème d'encadrement : si f ≤ g ≤ h et lim f = lim h = ℓ, alors lim g = ℓ.`
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
