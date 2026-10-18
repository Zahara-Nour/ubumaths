// Ébauche (TDD) : remplacée par l'implémentation
import type { MathNode } from '$lib/mathAST';
export type CurveShape = { readonly kind: 'line' | 'function' | 'quadratic' | 'implicit' };
export type CurveNature = string;
export function equationExpression(equation: MathNode): MathNode {
	return equation;
}
export function curveShapeOf(_F: MathNode, _options?: { allowLine?: boolean }): CurveShape {
	throw new Error('à faire');
}
export function curveNatureOf(_equation: MathNode): CurveNature | null {
	throw new Error('à faire');
}
