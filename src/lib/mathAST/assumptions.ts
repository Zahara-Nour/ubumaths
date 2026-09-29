/**
 * Hypothèses de l'énoncé (ADR 0012) : « Soit x > 0 », « n entier ».
 *
 * Une question peut déclarer, sur les variables libres de la réponse, l'une de
 * cinq hypothèses. Le décideur (`areEquivalent`) compare alors sur
 * l'intersection des domaines ∩ le domaine déclaré. Sans hypothèse, rien ne
 * change.
 *
 * Ce module est le contrat public que consomment les modèles de questions : un
 * vocabulaire fermé, et sa traduction en `TypeContext` de `numtype`, que les
 * règles conditionnelles interrogent par ses prédicats (`isPositiveType`…).
 */

import { isFunction, isGreek, isVariable } from './guards';
import type { NumericType, TypeContext, VariableAssumption } from './numtype';
import { isIntegerType, isNonNegativeType, isPositiveType } from './numtype';
import { isKnownFunctionName } from './numtype/rules/functions';
import { findNodes } from './transforms';
import type { FunctionNode, MathNode } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Le vocabulaire des hypothèses :
 * - `positive` : strictement positif (x > 0) ;
 * - `nonnegative` : positif ou nul (x ≥ 0) ;
 * - `nonzero` : non nul (x ≠ 0) ;
 * - `integer` : entier relatif (n ∈ ℤ) ;
 * - `natural` : entier naturel (n ∈ ℕ).
 */
export type AnswerAssumptionKind = 'positive' | 'nonnegative' | 'nonzero' | 'integer' | 'natural';

/** Une hypothèse au plus par variable, indexée par le nom de la variable (`x`, `n`). */
export type AnswerAssumptions = Readonly<Record<string, AnswerAssumptionKind>>;

/**
 * Ce que les règles conditionnelles de la normalisation demandent aux
 * hypothèses. Passé en rappels dans `NormalizeContext` plutôt que le
 * `TypeContext` brut : `normalize.ts` ne peut pas importer `numtype` sans
 * cycle d'imports (mesuré : 17 fichiers de test cassés, `UNIVERSAL_SET`
 * lu avant initialisation).
 *
 * Chaque prédicat rend `false` pour une expression qui ne mentionne aucune
 * variable déclarée : une hypothèse sur `y` ne change rien au reste.
 */
export interface AssumptionOracle {
	/** L'expression est strictement positive sur le domaine déclaré. */
	readonly isPositive: (node: MathNode) => boolean;
	/** L'expression est positive ou nulle sur le domaine déclaré. */
	readonly isNonNegative: (node: MathNode) => boolean;
	/** L'expression est entière sur le domaine déclaré. */
	readonly isInteger: (node: MathNode) => boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Ce que chaque hypothèse dit du signe et du type de la variable. */
const KIND_TRANSLATION: Readonly<
	Record<AnswerAssumptionKind, { sign?: VariableAssumption['sign']; type?: NumericType }>
> = {
	positive: { sign: 'positive' },
	nonnegative: { sign: 'nonnegative' },
	nonzero: { sign: 'nonzero' },
	integer: { type: 'integer' },
	natural: { type: 'integer', sign: 'nonnegative' }
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Les hypothèses dont la valeur appartient au vocabulaire. Elles viennent d'un
 * jsonb (`options.answerAssumptions`) : une valeur inconnue est ignorée — pas
 * d'hypothèse, donc comportement sûr — au lieu de faire planter la correction.
 */
function validEntries(
	assumptions: AnswerAssumptions | undefined
): [string, AnswerAssumptionKind][] {
	if (!assumptions) return [];
	return Object.entries(assumptions).filter(([, kind]) => Object.hasOwn(KIND_TRANSLATION, kind));
}

/**
 * Traduit les hypothèses en `TypeContext`. `undefined` quand il n'y en a
 * aucune : l'appelant retombe alors EXACTEMENT sur le comportement sans
 * hypothèse (aucun contexte transmis).
 */
export function answerAssumptionsToTypeContext(
	assumptions: AnswerAssumptions | undefined
): TypeContext | undefined {
	const entries = validEntries(assumptions);
	if (entries.length === 0) return undefined;

	const variables = new Map<string, NumericType>();
	const signs = new Map<string, VariableAssumption>();
	for (const [name, kind] of entries) {
		const { sign, type } = KIND_TRANSLATION[kind];
		if (type !== undefined) variables.set(name, type);
		if (sign !== undefined) signs.set(name, { sign });
	}

	return {
		...(variables.size > 0 && { variables }),
		...(signs.size > 0 && { assumptions: signs })
	};
}

/**
 * Vrai si le nœud mentionne l'une des variables nommées. Garde des règles
 * conditionnelles : une hypothèse sur `y` ne doit rien changer à une
 * expression qui ne mentionne pas `y`.
 */
function mentionsAnyVariable(node: MathNode, names: ReadonlySet<string>): boolean {
	return (
		findNodes(
			node,
			(candidate) =>
				(isVariable(candidate) && names.has(candidate.name)) ||
				(isGreek(candidate) && names.has(candidate.letter))
		).length > 0
	);
}

/**
 * Vrai si le nœud contient une variable INDICÉE dont la base est déclarée
 * (`x_1`, `u_n` pour une hypothèse sur `x` ou `u`). `numtype` donne à `x_1` le
 * type de `x` : sans cette garde, « Soit x > 0 » rendait `|x_1| ≡ x_1` vrai,
 * alors que x₁ est une autre variable (faux positif trouvé en revue, #522).
 */
function mentionsIndexedDeclaredVariable(node: MathNode, names: ReadonlySet<string>): boolean {
	return (
		findNodes(
			node,
			(candidate) => candidate.type === 'subscript' && mentionsAnyVariable(candidate.base, names)
		).length > 0
	);
}

/**
 * Vrai si le nœud applique une fonction que l'énoncé ne définit pas (f, g, u)
 * à une variable déclarée : `numtype` donne à f(n) le type de n, si bien que
 * « n entier » rendait `(-1)^{2f(n)} ≡ 1` vrai (faux en f(n) = n/2, #522).
 */
function mentionsUnknownFunctionOfDeclaredVariable(
	node: MathNode,
	names: ReadonlySet<string>
): boolean {
	return (
		findNodes(
			node,
			(candidate) =>
				isFunction(candidate) &&
				!isKnownFunctionName(candidate.name) &&
				candidate.args.some((arg) => mentionsAnyVariable(arg, names))
		).length > 0
	);
}

/**
 * L'hypothèse s'applique : le nœud mentionne une variable déclarée, sans passer
 * par une de ses indicées ni par une fonction inconnue.
 */
function assumptionApplies(node: MathNode, names: ReadonlySet<string>): boolean {
	return (
		mentionsAnyVariable(node, names) &&
		!mentionsIndexedDeclaredVariable(node, names) &&
		!mentionsUnknownFunctionOfDeclaredVariable(node, names)
	);
}

/**
 * Nœuds de l'algèbre simple, dont `numtype` transmet le type sans surprise.
 * LISTE BLANCHE : tout autre nœud (limite, indice, relation, matrice, unité,
 * composition, piecewise… et tout nœud qu'un parseur ajoutera plus tard) coupe
 * les hypothèses. Trois faux positifs trouvés en revue (#522) venaient de nœuds
 * qui lient ou renomment une variable (x_1, f(n), lim_{x→−1} x).
 */
const PLAIN_ALGEBRA_NODE_TYPES: ReadonlySet<MathNode['type']> = new Set([
	'number',
	'variable',
	'greek',
	'constant',
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'opposite',
	'positive',
	'percentage',
	'delimiter',
	'superscript',
	'function'
]);

/**
 * Fonction connue NUE : ni réciproque (`\exp^{-1}` est ln, pas exp), ni
 * puissance, ni dérivée, ni base de logarithme. `numtype` type la fonction par
 * son nom seul et ignorerait ces décorations (faux positif en revue, #522).
 */
function isPlainKnownFunction(node: FunctionNode): boolean {
	return (
		isKnownFunctionName(node.name) &&
		node.power === undefined &&
		node.base === undefined &&
		node.derivativeOrder === undefined &&
		!node.isInverse
	);
}

/**
 * L'expression n'est-elle faite que d'algèbre simple (fonctions connues
 * comprises) ? Sinon, les hypothèses de l'énoncé sont ignorées pour TOUTE la
 * comparaison : on retombe sur le verdict sans hypothèse, qui est sûr.
 */
export function isPlainAlgebra(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(candidate) =>
				!PLAIN_ALGEBRA_NODE_TYPES.has(candidate.type) ||
				(isFunction(candidate) && !isPlainKnownFunction(candidate))
		).length === 0
	);
}

/**
 * Les prédicats de `numtype` sur le contexte des hypothèses, gardés par
 * `assumptionApplies`. `undefined` sans hypothèse.
 */
export function assumptionOracle(
	assumptions: AnswerAssumptions | undefined
): AssumptionOracle | undefined {
	const ctx = answerAssumptionsToTypeContext(assumptions);
	if (!assumptions || !ctx) return undefined;
	const names: ReadonlySet<string> = new Set(validEntries(assumptions).map(([name]) => name));
	return {
		isPositive: (node) => assumptionApplies(node, names) && isPositiveType(node, ctx),
		isNonNegative: (node) => assumptionApplies(node, names) && isNonNegativeType(node, ctx),
		isInteger: (node) => assumptionApplies(node, names) && isIntegerType(node, ctx)
	};
}
