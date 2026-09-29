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

import { isGreek, isVariable } from './guards';
import type { NumericType, TypeContext, VariableAssumption } from './numtype';
import { isIntegerType, isNonNegativeType, isPositiveType } from './numtype';
import { findNodes } from './transforms';
import type { MathNode } from './types';

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
 * Traduit les hypothèses en `TypeContext`. `undefined` quand il n'y en a
 * aucune : l'appelant retombe alors EXACTEMENT sur le comportement sans
 * hypothèse (aucun contexte transmis).
 */
export function answerAssumptionsToTypeContext(
	assumptions: AnswerAssumptions | undefined
): TypeContext | undefined {
	if (!assumptions) return undefined;
	const entries = Object.entries(assumptions);
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

/** L'hypothèse s'applique : le nœud mentionne une variable déclarée, et aucune de ses indicées. */
function assumptionApplies(node: MathNode, names: ReadonlySet<string>): boolean {
	return mentionsAnyVariable(node, names) && !mentionsIndexedDeclaredVariable(node, names);
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
	const names: ReadonlySet<string> = new Set(Object.keys(assumptions));
	return {
		isPositive: (node) => assumptionApplies(node, names) && isPositiveType(node, ctx),
		isNonNegative: (node) => assumptionApplies(node, names) && isNonNegativeType(node, ctx),
		isInteger: (node) => assumptionApplies(node, names) && isIntegerType(node, ctx)
	};
}
