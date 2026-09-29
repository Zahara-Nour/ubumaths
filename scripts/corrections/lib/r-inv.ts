/**
 * Stratégie R-INV : opération à trou → opération inverse
 * ======================================================
 *
 * Générée depuis l'opération posée par le modèle (`L op R = S`, un des deux
 * opérandes valant `?`) :
 * - a + ? = s, ? + a = s  → ? = s − a ;
 * - ? − a = s             → ? = s + a ;
 * - a − ? = s             → ? = a − s ;
 * - a × ? = s, ? × a = s  → ? = s : a ;
 * - ? : a = s             → ? = s × a ;
 * - a : ? = s             → ? = a : s.
 *
 * Deux étapes : l'explication (le nombre cherché, l'opération inverse), puis le
 * calcul aligné `? = … = {{solution}}`. Couleurs (palette.ts) : l'opérande connu
 * que l'on « fait passer » en `transformed`, l'opération inverse en
 * `intermediate`. Aucun `{{if:…}}` : le texte est le même pour tous les tirages
 * (les décimaux s'affichent tels que l'énoncé les écrit, `;d` compris).
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { alignBlock, colored, inline } from './palette';
import { findExpressionVariable, toDisplayForm } from './operation';

// ============================================================================
// TYPES
// ============================================================================

export type HoleOperator = '+' | '-' | '*' | ':';

export interface HoleOperation {
	operator: HoleOperator;
	/** Position du `?` dans l'opération */
	missing: 'left' | 'right';
	/** Gabarit d'affichage de l'opérande connu */
	known: string;
	/** Gabarit d'affichage du résultat (membre de droite) */
	result: string;
}

// ============================================================================
// PARSING
// ============================================================================

/** Positions d'un caractère de `chars` hors `{{…}}` et parenthèses */
function topLevelPositions(text: string, chars: string): { index: number; char: string }[] {
	const found: { index: number; char: string }[] = [];
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '{' || char === '(') depth++;
		else if (char === '}' || char === ')') depth--;
		else if (depth === 0 && chars.includes(char)) found.push({ index: i, char });
	}
	return found;
}

/**
 * Lit `L op R = S` où L ou R vaut `?`. Rend `null` si l'expression n'a pas cette
 * forme exacte (une seule égalité, une seule opération, un seul trou).
 */
export function parseHoleOperation(expression: string): HoleOperation | null {
	const equals = topLevelPositions(expression, '=');
	if (equals.length !== 1) return null;
	const lhs = expression.slice(0, equals[0].index).trim();
	const result = expression.slice(equals[0].index + 1).trim();
	if (result === '' || result.includes('?')) return null;
	const operators = topLevelPositions(lhs, '+-*:').filter(
		({ index }) => lhs.slice(0, index).trim() !== ''
	);
	if (operators.length !== 1) return null;
	const { index, char } = operators[0];
	const left = lhs.slice(0, index).trim();
	const right = lhs.slice(index + 1).trim();
	const leftHole = left === '?';
	const rightHole = right === '?';
	if (leftHole === rightHole) return null;
	const known = leftHole ? right : left;
	if (known.includes('?') || known === '') return null;
	return {
		operator: char as HoleOperator,
		missing: leftHole ? 'left' : 'right',
		known: toDisplayForm(known),
		result: toDisplayForm(result)
	};
}

// ============================================================================
// STEPS
// ============================================================================

const LATEX_OPERATOR: Record<HoleOperator, string> = {
	'+': '+',
	'-': '-',
	'*': '\\times',
	':': ':'
};

/** L'opération posée, écrite en LaTeX, le connu en `transformed` */
function posedLatex(op: HoleOperation): string {
	const known = colored('transformed', op.known);
	const sign = LATEX_OPERATOR[op.operator];
	const lhs = op.missing === 'left' ? `? ${sign} ${known}` : `${known} ${sign} ?`;
	return `${lhs} = ${op.result}`;
}

/** Explication, calcul inverse (LaTeX, sans le `? =`) */
function inverse(op: HoleOperation): { prose: string; calculation: string } {
	const S = op.result;
	const K = colored('transformed', op.known);
	const k = inline(K);
	const s = inline(S);
	const verb = (word: string) => inline(colored('intermediate', `\\text{${word}}`));
	const opSign = (sign: string) => colored('intermediate', sign);
	switch (op.operator) {
		case '+':
			return {
				prose:
					`On cherche le nombre qui, ajouté à ${k}, donne ${s}. ` +
					`L'addition et la soustraction sont des opérations inverses : on ${verb('soustrait')} ${k} de ${s}.`,
				calculation: `${S} ${opSign('-')} ${K}`
			};
		case '-':
			return op.missing === 'left'
				? {
						prose:
							`On cherche le nombre auquel on retranche ${k} pour obtenir ${s}. ` +
							`La soustraction et l'addition sont des opérations inverses : on ${verb('ajoute')} ${k} à ${s}.`,
						calculation: `${S} ${opSign('+')} ${K}`
					}
				: {
						prose:
							`On cherche le nombre qu'il faut retrancher à ${k} pour obtenir ${s} : ` +
							`c'est l'écart entre ${k} et ${s}, on ${verb('soustrait')} ${s} de ${k}.`,
						calculation: `${K} ${opSign('-')} ${S}`
					};
		case '*':
			return {
				prose:
					`On cherche le nombre qui, multiplié par ${k}, donne ${s}. ` +
					`La multiplication et la division sont des opérations inverses : on ${verb('divise')} ${s} par ${k}.`,
				calculation: `${S} ${opSign(':')} ${K}`
			};
		case ':':
			return op.missing === 'left'
				? {
						prose:
							`On cherche le nombre qui, divisé par ${k}, donne ${s}. ` +
							`La division et la multiplication sont des opérations inverses : on ${verb('multiplie')} ${s} par ${k}.`,
						calculation: `${S} ${opSign('\\times')} ${K}`
					}
				: {
						prose:
							`On cherche par quel nombre diviser ${k} pour obtenir ${s} : ` +
							`on ${verb('divise')} ${k} par ${s}.`,
						calculation: `${K} ${opSign(':')} ${S}`
					};
	}
}

/** Les deux étapes R-INV d'une opération à trou */
export function buildRInvSteps(op: HoleOperation): [string, string] {
	const { prose, calculation } = inverse(op);
	return [
		`${inline(posedLatex(op))}. ${prose}`,
		alignBlock([`? &= ${calculation}`, '&= {{solution}}'])
	];
}

/** Étapes R-INV de chaque variation (lève une erreur si la structure est illisible) */
export function generateRInv(template: QuestionTemplate): {
	byVariation: string[][];
	notes: string[];
} {
	const notes: string[] = [];
	const byVariation = template.variations.map((_, index) => {
		const variable = findExpressionVariable(template, index);
		if (!variable) throw new Error(`variation ${index} : aucune variable d'expression`);
		const op = parseHoleOperation(variable.expression);
		if (!op) {
			throw new Error(
				`variation ${index} : « ${variable.expression} » n'est pas une opération à un seul trou`
			);
		}
		notes.push(
			`variation ${index} : ${variable.name} = « ${variable.expression} » ; ` +
				`trou à ${op.missing === 'left' ? 'gauche' : 'droite'} de « ${op.operator} »`
		);
		return buildRInvSteps(op);
	});
	return { byVariation, notes };
}
