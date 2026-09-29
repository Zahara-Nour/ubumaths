/**
 * Lecture de la structure d'une expression de modèle
 * ==================================================
 *
 * Une stratégie R est GÉNÉRÉE depuis la structure du modèle : la variable
 * d'expression (`expression`, `expression1`…) porte l'opération posée, sous forme
 * de gabarit (`{{eval:a*10 + b}} + {{c}}`). On en tire les deux opérandes, sous
 * deux formes :
 * - forme d'affichage : le gabarit tel quel (`{{eval:a*10 + b}}`), résolu en nombre ;
 * - forme de calcul : utilisable DANS un `{{eval:…}}` ou une condition `{{if:…}}`
 *   (`(a*10 + b)`), car un `{{eval}}` imbriqué dans un `{{eval}}` ne se résout pas.
 */

import type { QuestionTemplate, QuestionVariable } from '../../../src/lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

export type BinaryOperator = '+' | '-';

export interface BinaryOperation {
	operator: BinaryOperator;
	/** Gabarit d'affichage de l'opérande gauche */
	left: string;
	/** Gabarit d'affichage de l'opérande droit */
	right: string;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Coupe `gauche op droite` sur l'UNIQUE opérateur + ou − de premier niveau
 * (hors `{{…}}` et parenthèses). Rend `null` s'il n'y en a pas exactement un.
 */
export function splitBinaryOperation(expression: string): BinaryOperation | null {
	let braces = 0;
	let parens = 0;
	const positions: { index: number; operator: BinaryOperator }[] = [];
	for (let i = 0; i < expression.length; i++) {
		const char = expression[i];
		if (char === '{') braces++;
		else if (char === '}') braces--;
		else if (char === '(') parens++;
		else if (char === ')') parens--;
		else if ((char === '+' || char === '-') && braces === 0 && parens === 0) {
			// Un signe en tête est un signe unaire, pas une opération
			if (expression.slice(0, i).trim() !== '') positions.push({ index: i, operator: char });
		}
	}
	if (positions.length !== 1) return null;
	const { index, operator } = positions[0];
	const left = expression.slice(0, index).trim();
	const right = expression.slice(index + 1).trim();
	if (left === '' || right === '') return null;
	return { operator, left, right };
}

/**
 * Forme de calcul d'un opérande : `{{eval:X}}` → `(X)`, `{{a}}` → `a`, `12` → `12`.
 * Lève une erreur sur un opérande que la stratégie ne sait pas lire.
 */
export function toEvalForm(operand: string): string {
	const trimmed = operand.trim();
	const evalMatch = trimmed.match(/^\{\{eval:([^{}]+)\}\}$/);
	if (evalMatch) {
		const inner = evalMatch[1].trim();
		return /^[a-zA-Z_]\w*$|^\d+$/.test(inner) ? inner : `(${inner})`;
	}
	const variableMatch = trimmed.match(/^\{\{([a-zA-Z_]\w*)\}\}$/);
	if (variableMatch) return variableMatch[1];
	if (/^[a-zA-Z_]\w*$|^\d+$/.test(trimmed)) return trimmed;
	throw new Error(`opérande illisible pour une stratégie : « ${operand} »`);
}

/** Forme d'affichage : une variable nue (`a`) devient `{{a}}` */
export function toDisplayForm(operand: string): string {
	const trimmed = operand.trim();
	return /^[a-zA-Z_]\w*$/.test(trimmed) ? `{{${trimmed}}}` : trimmed;
}

/** Variables de la variation, fusionnées avec celles de `shared` (la variation l'emporte) */
export function mergedVariables(
	template: QuestionTemplate,
	variationIndex: number
): QuestionVariable[] {
	const shared = template.shared?.variables ?? [];
	const own = template.variations[variationIndex]?.variables ?? [];
	const ownNames = new Set(own.map((v) => v.name));
	return [...shared.filter((v) => !ownNames.has(v.name)), ...own];
}

/** La variable d'expression de la variation (`expression`, `expression1`…) */
export function findExpressionVariable(
	template: QuestionTemplate,
	variationIndex: number
): QuestionVariable | undefined {
	return mergedVariables(template, variationIndex).find((v) => v.name.startsWith('expression'));
}
