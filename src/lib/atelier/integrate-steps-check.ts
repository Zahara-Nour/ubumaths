/**
 * Atelier — le garde-fou des étapes d'intégration
 *
 * Deux vérifications avant de montrer les étapes de `pedagogical-integration`
 * sous une ligne `.intégrer` (décision de David, 2026-10-13) :
 *
 * 1. **Concordance avec le moteur** : la valeur d'une intégrale définie est
 *    numériquement celle du moteur ; une primitive ne diffère de celle du
 *    moteur que d'une constante.
 * 2. **Aucun coefficient caché** : une forme composée (u′e^u, u′/u,
 *    u′sin(u), u′cos(u), u′uⁿ) ne s'applique telle quelle que si l'intégrande
 *    EST u′·f(u). Pour `e^{2x}`, le pipeline rééquilibre par 1/u′ = ½ sans le
 *    dire : le titre annonce « e^u », la ligne écrit « ½e^{2x} ». Le calcul
 *    est juste, la rédaction trompe — refusée.
 *
 * @module atelier/integrate-steps-check
 */

import type { MathNode } from '$lib/mathAST/types';
import {
	generatePedagogicalIntegrationSteps,
	type PedagogicalIntegrationRule,
	type PedagogicalIntegrationStep
} from '$lib/mathAST/pedagogical-integration';
import { compile } from '$lib/mathAST/eval/compile';
import { getVariables } from '$lib/mathAST/eval/substitute';

// =============================================================================
// Constantes
// =============================================================================

/** Tolérance relative des comparaisons numériques. */
const EPS = 1e-7;

/**
 * Les points où comparer deux fonctions : pas de 0 ni d'entier, où tombent
 * les valeurs interdites usuelles (1/x, ln x, 1/(x−1)).
 */
const SAMPLE_POINTS: readonly number[] = [-2.7, -1.3, -0.45, 0.35, 0.8, 1.55, 2.4, 3.1];

/** Il faut au moins ce nombre de points où les deux membres existent. */
const MIN_VALID_POINTS = 2;

/** Profondeur maximale pour vérifier le v d'une IPP (v vient d'une intégration). */
const MAX_DEPTH = 3;

/**
 * La primitive « nue » G(u) de chaque forme composée : celle que le titre
 * annonce, et que la ligne doit écrire si l'intégrande est exactement u′·f(u).
 */
const COMPOSITE_PRIMITIVES: Partial<
	Record<PedagogicalIntegrationRule, (u: number, n: number) => number>
> = {
	'apply-composite-exp': (u) => Math.exp(u),
	'apply-composite-ln': (u) => Math.log(Math.abs(u)),
	'apply-composite-sin': (u) => -Math.cos(u),
	'apply-composite-cos': (u) => Math.sin(u),
	'apply-composite-power': (u, n) => Math.pow(u, n + 1) / (n + 1)
};

// =============================================================================
// Évaluation numérique
// =============================================================================

type Bindings = Readonly<Record<string, number>>;

function evalAt(node: MathNode, bindings: Bindings): number {
	try {
		return compile(node)(bindings);
	} catch {
		return NaN;
	}
}

/**
 * Une valeur fixe pour chaque lettre autre que la variable (`a` dans `ax^2`) :
 * les deux membres comparés la reçoivent, la comparaison reste juste.
 */
function parameterBindings(nodes: readonly MathNode[], variable: string): Record<string, number> {
	const bindings: Record<string, number> = {};
	let next = 1.37;
	for (const node of nodes) {
		for (const name of getVariables(node)) {
			if (name === variable || name in bindings) continue;
			bindings[name] = next;
			next += 0.41;
		}
	}
	return bindings;
}

function near(a: number, b: number): boolean {
	return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

// =============================================================================
// Bornes et concordance
// =============================================================================

/** Une borne est-elle un nombre (`2`, `-0.5`, `\pi`), sans aucune lettre ? */
export function isNumericBound(node: MathNode): boolean {
	return getVariables(node).size === 0 && Number.isFinite(evalAt(node, {}));
}

/** Deux valeurs d'intégrale définie sont-elles égales (paramètres compris) ? */
export function valuesAgree(steps: MathNode, engine: MathNode): boolean {
	const bindings = parameterBindings([steps, engine], '');
	const a = evalAt(steps, bindings);
	const b = evalAt(engine, bindings);
	return Number.isFinite(a) && Number.isFinite(b) && near(a, b);
}

/**
 * Les deux primitives ne diffèrent-elles que d'une constante ? Comparé là où
 * les deux existent ; trop peu de points communs → `false` (dans le doute,
 * pas d'étapes).
 */
export function primitivesAgree(steps: MathNode, engine: MathNode, variable: string): boolean {
	const parameters = parameterBindings([steps, engine], variable);
	const differences: number[] = [];
	for (const x of SAMPLE_POINTS) {
		const bindings = { ...parameters, [variable]: x };
		const a = evalAt(steps, bindings);
		const b = evalAt(engine, bindings);
		if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
		differences.push(a - b);
	}
	if (differences.length < MIN_VALID_POINTS) return false;
	return differences.every((d) => near(d, differences[0]));
}

// =============================================================================
// Coefficients cachés
// =============================================================================

/**
 * Une étape composée écrit-elle autre chose que G(u) ? Oui dès qu'un facteur
 * de rééquilibrage (½ pour `e^{2x}`, −1 pour `e^{-x}`, 3 pour `\frac3x`) s'y
 * glisse : c'est exactement le cas où l'intégrande n'est pas u′·f(u).
 */
function compositeHidesCoefficient(step: PedagogicalIntegrationStep): boolean {
	const primitive = COMPOSITE_PRIMITIVES[step.rule];
	if (primitive === undefined) return false;
	const u = step.bindings?.u;
	if (u === undefined) return true;
	const n = step.bindings?.n;
	const parameters = parameterBindings([step.after, u, ...(n ? [n] : [])], step.variable);
	const exponent = n === undefined ? 0 : evalAt(n, parameters);
	if (n !== undefined && !Number.isFinite(exponent)) return true;
	let valid = 0;
	for (const x of SAMPLE_POINTS) {
		const bindings = { ...parameters, [step.variable]: x };
		const written = evalAt(step.after, bindings);
		const expected = primitive(evalAt(u, bindings), exponent);
		if (!Number.isFinite(written) || !Number.isFinite(expected)) continue;
		if (!near(written, expected)) return true;
		valid++;
	}
	return valid < MIN_VALID_POINTS;
}

/**
 * Le v d'une IPP est une primitive de v′, calculée sans étape : il faut que
 * sa rédaction, elle aussi, se passe de coefficient caché (`x e^{2x}` :
 * v = ½e^{2x} tombe du ciel).
 */
function partsHidesCoefficient(step: PedagogicalIntegrationStep, depth: number): boolean {
	if (step.rule !== 'choose-u-dv') return false;
	const dv = step.bindings?.dv;
	if (dv === undefined) return true;
	if (depth >= MAX_DEPTH) return true;
	try {
		const own = generatePedagogicalIntegrationSteps(dv, {
			level: 'lycee',
			variable: step.variable
		});
		return walk(own.steps, depth + 1);
	} catch {
		return true;
	}
}

function walk(steps: readonly PedagogicalIntegrationStep[], depth: number): boolean {
	return steps.some(
		(step) =>
			compositeHidesCoefficient(step) ||
			partsHidesCoefficient(step, depth) ||
			walk(step.subSteps ?? [], depth)
	);
}

/**
 * Une étape (sous-étapes comprises) applique-t-elle une forme composée avec
 * un coefficient qu'elle n'explique pas ? Détection par les RÈGLES appliquées
 * et leurs `bindings`, jamais par une liste d'exemples.
 */
export function hasUnexplainedCoefficient(steps: readonly PedagogicalIntegrationStep[]): boolean {
	return walk(steps, 0);
}
