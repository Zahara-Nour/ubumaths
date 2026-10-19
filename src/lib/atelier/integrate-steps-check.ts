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
 *    u′sin(u), u′cos(u), u′uⁿ) écrit exactement G(u) — e^u, ln|u|… — ou k·G(u)
 *    avec un coefficient k déclaré (½ pour `e^{2x}`), accepté seulement s'il est EXPLIQUÉ : une
 *    étape « On fait apparaître u′ » (`reveal-derivative`) la précède, écrit
 *    f = k × u′·g(u) (vérifié en valeurs), et la forme composée reprend ce
 *    même k (PR 2, décisions de David du 2026-10-13). Un ½ glissé dans la
 *    primitive sans cette étape — titre « e^u », ligne « ½e^{2x} » — reste
 *    refusé. Même contrôle pour les éléments simples : A·ln|x − r| promis,
 *    A·ln|x − r| écrit.
 *
 * @module atelier/integrate-steps-check
 */

import type { MathNode } from '$lib/mathAST/types';
import type {
	PedagogicalIntegrationRule,
	PedagogicalIntegrationStep
} from '$lib/mathAST/pedagogical-integration';
import { compile } from '$lib/mathAST/eval/compile';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { hideIndexedNames } from '$lib/mathAST/common/indexed-names';

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

/**
 * La valeur que cite un refus rédigé (« f n'est pas définie en x = p, qui
 * appartient à [a ; b] ») est-elle vraie ? Trois vérifications, sans faire
 * confiance au pipeline (décision de David, 2026-10-13) :
 * - p est un nombre, et f n'a pas d'autre lettre que la variable (sinon f
 *   ne s'évalue nulle part, et « interdite » ne prouverait rien) ;
 * - p appartient à [min(a, b) ; max(a, b)], bornes comprises ;
 * - f n'a pas de valeur finie en p.
 */
export function citesForbiddenPoint(
	integrand: MathNode,
	variable: string,
	point: MathNode,
	lower: MathNode,
	upper: MathNode
): boolean {
	if (!isNumericBound(point) || !isNumericBound(lower) || !isNumericBound(upper)) return false;
	// `x_1` est une autre lettre que x : nommée en entier (`hideIndexedNames`)
	if ([...getVariables(hideIndexedNames(integrand).node)].some((name) => name !== variable)) {
		return false;
	}
	const p = evalAt(point, {});
	const [a, b] = [evalAt(lower, {}), evalAt(upper, {})];
	const [low, high] = a <= b ? [a, b] : [b, a];
	const inside = (p > low || near(p, low)) && (p < high || near(p, high));
	return inside && !Number.isFinite(evalAt(integrand, { [variable]: p }));
}

// =============================================================================
// Coefficients cachés
// =============================================================================

/**
 * Une étape composée écrit-elle autre chose que G(u) ? Oui dès qu'un facteur
 * de rééquilibrage (½ pour `e^{2x}`, −1 pour `e^{-x}`, 3 pour `\frac3x`) s'y
 * glisse : c'est exactement le cas où l'intégrande n'est pas u′·f(u). Un
 * coefficient déclaré (`bindings.k`) n'est accepté que si l'étape qui précède
 * le fait apparaître (`revealExplains`).
 */
function compositeHidesCoefficient(
	step: PedagogicalIntegrationStep,
	previous: PedagogicalIntegrationStep | undefined
): boolean {
	const primitive = COMPOSITE_PRIMITIVES[step.rule];
	if (primitive === undefined) return false;
	const u = step.bindings?.u;
	if (u === undefined) return true;
	const n = step.bindings?.n;
	const parameters = parameterBindings([step.after, u, ...(n ? [n] : [])], step.variable);
	const exponent = n === undefined ? 0 : evalAt(n, parameters);
	if (n !== undefined && !Number.isFinite(exponent)) return true;
	// Un coefficient déclaré multiplie G(u) ; il doit venir de la réécriture
	const k = step.bindings?.k;
	if (k !== undefined && !revealExplains(previous, step)) return true;
	const factor = k === undefined ? 1 : evalAt(k, parameters);
	let valid = 0;
	for (const x of SAMPLE_POINTS) {
		const bindings = { ...parameters, [step.variable]: x };
		const written = evalAt(step.after, bindings);
		const expected = factor * primitive(evalAt(u, bindings), exponent);
		if (!Number.isFinite(written) || !Number.isFinite(expected)) continue;
		if (!near(written, expected)) return true;
		valid++;
	}
	return valid < MIN_VALID_POINTS;
}

/**
 * L'étape `reveal` explique-t-elle le coefficient k de `composite` ? Elle doit
 * être une réécriture « On fait apparaître u′ » au même k, et juste en valeurs :
 * f = k × u′g(u) (`before` = k × `revealed`), et la forme composée intègre
 * exactement `revealed`.
 */
function revealExplains(
	reveal: PedagogicalIntegrationStep | undefined,
	composite: PedagogicalIntegrationStep
): boolean {
	if (reveal?.rule !== 'reveal-derivative') return false;
	const k = reveal.bindings?.k;
	const revealed = reveal.bindings?.revealed;
	const compositeK = composite.bindings?.k;
	if (!k || !revealed || !compositeK) return false;
	const nodes = [reveal.before, revealed, composite.before];
	const parameters = parameterBindings([k, ...nodes], composite.variable);
	const kValue = evalAt(k, parameters);
	if (!Number.isFinite(kValue) || !near(kValue, evalAt(compositeK, parameters))) return false;
	let valid = 0;
	for (const x of SAMPLE_POINTS) {
		const bindings = { ...parameters, [composite.variable]: x };
		const [f, g, integrated] = nodes.map((node) => evalAt(node, bindings));
		if (![f, g, integrated].every(Number.isFinite)) continue;
		if (!near(f, kValue * g) || !near(integrated, g)) return false;
		valid++;
	}
	return valid >= MIN_VALID_POINTS;
}

/**
 * Les éléments simples écrivent-ils autre chose que A·ln|x − r₁| + B·ln|x − r₂|
 * (à une constante près) ? C'est ce qu'annonce le titre « ∫A/(x−r) = A ln|x−r| ».
 * Avec un facteur non unitaire, le pipeline intègre A/(2x − 1) en
 * (A/2)·ln|2x − 1| sans le dire : `\frac{1}{(2x-1)(x+1)}` écrit ⅓ là où le
 * titre promet A = ⅔ (revue du 2026-10-13).
 */
function partialFractionsHideCoefficient(step: PedagogicalIntegrationStep): boolean {
	if (step.rule !== 'apply-partial-fractions') return false;
	const { A, B, r1, r2 } = step.bindings ?? {};
	if (A === undefined || B === undefined || r1 === undefined || r2 === undefined) return true;
	const [a, b, root1, root2] = [A, B, r1, r2].map((node) => evalAt(node, {}));
	const differences: number[] = [];
	for (const x of SAMPLE_POINTS) {
		const written = evalAt(step.after, { [step.variable]: x });
		const expected = a * Math.log(Math.abs(x - root1)) + b * Math.log(Math.abs(x - root2));
		if (!Number.isFinite(written) || !Number.isFinite(expected)) continue;
		differences.push(written - expected);
	}
	if (differences.length < MIN_VALID_POINTS) return true;
	return !differences.every((d) => near(d, differences[0]));
}

function walk(steps: readonly PedagogicalIntegrationStep[]): boolean {
	return steps.some(
		(step, index) =>
			compositeHidesCoefficient(step, steps[index - 1]) ||
			partialFractionsHideCoefficient(step) ||
			walk(step.subSteps ?? [])
	);
}

/**
 * Une étape (sous-étapes comprises) applique-t-elle une forme composée ou des
 * éléments simples avec un coefficient qu'elle n'explique pas ? Détection par
 * les RÈGLES appliquées et leurs `bindings` (une forme composée et la
 * réécriture `reveal-derivative` qui la précède), jamais par une liste d'exemples.
 */
export function hasUnexplainedCoefficient(steps: readonly PedagogicalIntegrationStep[]): boolean {
	return walk(steps);
}
