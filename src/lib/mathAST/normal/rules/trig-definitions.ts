/**
 * MathAST Normal Form — Règles de préparation trigonométrique (Phase 1)
 *
 * `tan`, `cot`, `sec`, `csc` (et leurs cousines hyperboliques `tanh`, `coth`,
 * `sech`, `csch`) ne sont pas des atomes : ce sont des **définitions** à partir
 * de `sin`/`cos` (resp. `sinh`/`cosh`). Tant qu'on les laisse opaques, la
 * normalisation en fait des variables indépendantes et `tan(x) ≢ sin(x)/cos(x)`.
 *
 * On les élimine donc AVANT la normalisation polynomiale (Phase 2), dans le
 * préprocessing : la Phase 2 ne voit plus que `sin`/`cos` (et `sinh`/`cosh`), et
 * la réduction de Pythagore n'a qu'une seule famille d'atomes à traiter.
 *
 * Ne sont PAS réécrites : la notation de réciproque (`\tan^{-1}` = arctan, que
 * ce soit via `isInverse` ou via `power = -1`) et les dérivées (`\tan'`), qui
 * restent opaques.
 */

import type { MathNode } from '../../types';
import { isFunction } from '../../guards';
import { mapNode } from '../../transforms';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les définitions, en quotient de deux fonctions primitives.
 * `numeratorName: null` signifie un numérateur constant égal à 1.
 */
const TRIG_DEFINITIONS: Readonly<
	Record<string, { readonly numeratorName: string | null; readonly denominatorName: string }>
> = {
	tan: { numeratorName: 'sin', denominatorName: 'cos' },
	cot: { numeratorName: 'cos', denominatorName: 'sin' },
	sec: { numeratorName: null, denominatorName: 'cos' },
	csc: { numeratorName: null, denominatorName: 'sin' },
	tanh: { numeratorName: 'sinh', denominatorName: 'cosh' },
	coth: { numeratorName: 'cosh', denominatorName: 'sinh' },
	sech: { numeratorName: null, denominatorName: 'cosh' },
	csch: { numeratorName: null, denominatorName: 'sinh' }
};

const ONE_NODE: MathNode = { type: 'number', value: '1' };

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Reconnaît la notation de réciproque `f^{-1}`, qui n'est pas une puissance.
 */
function isInverseNotation(power: MathNode): boolean {
	if (power.type === 'opposite') {
		return power.operand.type === 'number' && power.operand.value === '1';
	}
	return power.type === 'number' && power.value === '-1';
}

/**
 * Construit l'appel `name(arg)`.
 */
function primitiveCall(name: string, arg: MathNode): MathNode {
	return { type: 'function', name, args: [arg] };
}

/**
 * Réécrit UN nœud en sa définition, ou rend `null` si la règle ne s'applique pas.
 *
 * `tan(u)` → `sin(u)/cos(u)`, `sec(u)` → `1/cos(u)`, etc. Une puissance portée
 * par le nœud fonction (`\tan^2 u`) est reportée sur le quotient.
 */
function expandTrigDefinitionAt(node: MathNode): MathNode | null {
	if (!isFunction(node)) {
		return null;
	}

	const definition = TRIG_DEFINITIONS[node.name];
	if (!definition || node.args.length !== 1) {
		return null;
	}

	// Réciproque et dérivée : ce ne sont pas les fonctions qu'on définit ici.
	if (node.isInverse === true || node.derivativeOrder !== undefined) {
		return null;
	}
	if (node.power !== undefined && isInverseNotation(node.power)) {
		return null;
	}

	const arg = node.args[0];
	const quotient: MathNode = {
		type: 'division',
		numerator:
			definition.numeratorName === null ? ONE_NODE : primitiveCall(definition.numeratorName, arg),
		denominator: primitiveCall(definition.denominatorName, arg),
		displayStyle: 'fraction'
	};

	if (node.power === undefined) {
		return quotient;
	}

	return { type: 'superscript', base: quotient, superscript: node.power };
}

/**
 * Élimine toutes les définitions trigonométriques d'un arbre, de bas en haut.
 *
 * Idempotente : le résultat ne contient plus aucun des huit noms réécrits, donc
 * un second passage ne change rien (ce que `preprocess` exploite pour atteindre
 * son point fixe en une itération).
 */
export function expandTrigDefinitions(node: MathNode): MathNode {
	return mapNode(node, (current) => expandTrigDefinitionAt(current) ?? current);
}
