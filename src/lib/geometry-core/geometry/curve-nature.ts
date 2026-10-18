/**
 * La classification d'une courbe donnée par son équation — PURE, sans `Figure`.
 *
 * Extraite de `courbe()` (`dsl/builtins.ts`) pour être partagée avec l'atelier
 * (géométrie v2, lot 1, PR 2) : la même équation choisit le même objet de la
 * figure (`curveShapeOf`) et la carte dit la même nature (`curveNatureOf`).
 *
 * Exact d'abord (geometry-core/CLAUDE.md, règle 10) : la FORME se lit sur
 * l'arbre, sans un nombre ; seule la nature d'une conique passe aux flottants,
 * au dernier moment, pour `classifyConic`.
 *
 * @module geometry/curve-nature
 */

import { compile, getVariables, isRelation, subtract } from '$lib/mathAST';
import type { MathNode } from '$lib/mathAST';
import { extractAffineCombination, extractQuadraticCombination } from '$lib/mathAST/analysis';
import { normalize } from '$lib/mathAST/normal/normalize';
import { denormalize } from '$lib/mathAST/normal/denormalize';
import { classifyConic, degenerateConicKind } from './conic-classify';

// =============================================================================
// Types
// =============================================================================

/**
 * L'objet que l'équation F(x, y) = 0 demande, dans l'ordre de `courbe()` :
 *
 * 1. affine en x ET y → droite a·x + b·y + c = 0 ;
 * 2. affine en y seul → courbe y = f(x), de g·y + h = 0 (g peut être nul : à
 *    l'appelant de le refuser ou de passer à la suite, `quadraticOrImplicit`) ;
 * 3. du second degré en (x, y) → conique ;
 * 4. sinon → courbe implicite (marching squares).
 *
 * Une lettre autre que x et y (un curseur) reste un COEFFICIENT.
 */
export type CurveShape =
	| { readonly kind: 'line'; readonly a: MathNode; readonly b: MathNode; readonly c: MathNode }
	| { readonly kind: 'function'; readonly g: MathNode; readonly h: MathNode }
	| QuadraticShape
	| { readonly kind: 'implicit' };

export interface QuadraticShape {
	readonly kind: 'quadratic';
	/** Clés `x^2`, `xy`, `y^2`, `x`, `y` (celles d'`extractQuadraticCombination`). */
	readonly coefficients: ReadonlyMap<string, MathNode>;
	readonly constant: MathNode;
}

/**
 * Ce qu'est la courbe, une fois les coefficients connus : `empty` (aucun point,
 * C6), `point` (un point isolé), `lines` (deux droites) ; `curve` pour tout ce
 * qui n'est pas du second degré.
 */
export type CurveNature =
	'line' | 'circle' | 'ellipse' | 'parabola' | 'hyperbola' | 'point' | 'lines' | 'empty' | 'curve';

// =============================================================================
// Constantes
// =============================================================================

const CURVE_VARIABLES = ['x', 'y'] as const;

/** Les cinq premiers coefficients de A·x² + B·xy + C·y² + D·x + E·y + F, dans cet ordre. */
const CONIC_KEYS = ['x^2', 'xy', 'y^2', 'x', 'y'] as const;

// =============================================================================
// Fonctions
// =============================================================================

/** F tel que la courbe soit F(x, y) = 0 : `gauche − droite` d'une équation, sinon l'expression. */
export function equationExpression(equation: MathNode): MathNode {
	return isRelation(equation) && equation.relation === '='
		? subtract(equation.left, equation.right)
		: equation;
}

/**
 * F développé et réduit (`(x − 1)² + (y − 2)² − 4` → `x² + y² − 2x − 4y + 1`) :
 * la lecture des coefficients ne développe rien elle-même, et un cercle écrit
 * avec son centre passait en courbe implicite. F tel quel si la réduction
 * échoue.
 */
export function expandedEquation(F: MathNode): MathNode {
	try {
		return denormalize(normalize(F));
	} catch {
		return F;
	}
}

/** La forme de F(x, y) = 0 — voir `CurveShape`. `allowLine: false` : pas de droite (restriction « sur »). */
export function curveShapeOf(
	F: MathNode,
	options: { readonly allowLine?: boolean } = {}
): CurveShape {
	if (options.allowLine !== false) {
		const affineXY = extractAffineCombination(F, [...CURVE_VARIABLES]);
		if (affineXY.isAffine) {
			return {
				kind: 'line',
				a: affineXY.coefficients.get('x')!,
				b: affineXY.coefficients.get('y')!,
				c: affineXY.constant
			};
		}
	}
	const affineY = extractAffineCombination(F, ['y']);
	if (affineY.isAffine) {
		return { kind: 'function', g: affineY.coefficients.get('y')!, h: affineY.constant };
	}
	return quadraticOrImplicit(F);
}

/** Les deux dernières étapes de `curveShapeOf` : conique, sinon implicite. */
export function quadraticOrImplicit(F: MathNode): QuadraticShape | { readonly kind: 'implicit' } {
	const quadratic = extractQuadraticCombination(F, CURVE_VARIABLES);
	if (quadratic.isQuadratic) {
		return {
			kind: 'quadratic',
			coefficients: quadratic.coefficients,
			constant: quadratic.constant
		};
	}
	return { kind: 'implicit' };
}

/** Les six nœuds A, B, C, D, E, F d'une conique (absent = 0). */
export function conicCoefficientNodes(shape: QuadraticShape): readonly (MathNode | undefined)[] {
	return [...CONIC_KEYS.map((key) => shape.coefficients.get(key)), shape.constant];
}

/**
 * Les six coefficients numériques d'une conique, ou `null` si l'un ne se
 * calcule pas (une lettre sans valeur).
 */
export function conicCoefficients(
	shape: QuadraticShape
): [number, number, number, number, number, number] | null {
	const values = conicCoefficientNodes(shape).map((node) =>
		node === undefined ? 0 : numberOf(node)
	);
	const [A, B, C, D, E, F] = values;
	if (A === null || B === null || C === null || D === null || E === null || F === null) {
		return null;
	}
	return [A, B, C, D, E, F];
}

/**
 * La nature de la courbe d'équation `equation` (une égalité, ou F seul pour
 * F = 0). `null` quand elle cite une autre lettre que x et y : sans sa
 * valeur, la nature ne se décide pas (x² + y² = a² est un point pour a = 0).
 */
export function curveNatureOf(equation: MathNode): CurveNature | null {
	const F = expandedEquation(equationExpression(equation));
	for (const name of getVariables(F)) {
		if (name !== 'x' && name !== 'y') return null;
	}
	const shape = quadraticOrImplicit(F);
	if (shape.kind !== 'quadratic') return 'curve';
	const coefficients = conicCoefficients(shape);
	if (coefficients === null) return 'curve';
	const [A, B, C, D, E, cst] = coefficients;

	// Tout du premier degré : une droite, ou rien (0 = 3), ou tout le plan (0 = 0)
	if (A === 0 && B === 0 && C === 0) {
		if (D !== 0 || E !== 0) return 'line';
		return cst !== 0 ? 'empty' : 'curve';
	}

	const degenerate = degenerateConicKind(A, B, C, D, E, cst);
	if (degenerate !== null) return degenerate;
	const { type } = classifyConic(A, B, C, D, E, cst);
	return type === 'degenerate' ? 'curve' : type;
}

/** Un coefficient sans lettre, en nombre, ou `null` s'il ne se calcule pas. */
function numberOf(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}
