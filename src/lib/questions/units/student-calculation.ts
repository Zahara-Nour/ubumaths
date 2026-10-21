/**
 * Unit System - Student Calculation
 * =================================
 *
 * Seconde lecture d'une saisie d'élève dans un trou À UNITÉ, quand le découpage
 * « nombre | unité » (`normalizeStudentQuantity`) échoue : l'élève a écrit un
 * calcul (`2\times3\operatorname{\mathrm{m}}`, `3m+2m`, `10^{3}\,\mathrm{m}`).
 *
 * Les unités écrites sont marquées `\unit{…}`, puis le parseur de mathAST lit le
 * calcul selon l'ADR 0031 (`2×3 m` = (2×3) m, `3+2 m` = 3 + (2 m)) ; `tidy` le
 * réduit à UNE grandeur, que la correction compare comme toute autre réponse.
 *
 * La forme, elle, est jugée sur la partie numérique (la saisie sans ses unités)
 * comme dans une case sans unité en mode « nombre simple » : un calcul non
 * effectué y est de mauvaise forme (décision de David du 2026-10-21, journal
 * `docs/wip/correction-cases-unite-progress.md`).
 *
 * @module questions/units/student-calculation
 */

import type { MathNode } from '$lib/mathAST/types';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { tidy } from '$lib/mathAST/tidy';
import { toLatex } from '$lib/mathAST/latex-generator';
import { rationalOf } from '$lib/mathAST/eval/evaluate-with-modifiers';
import { isOpposite, isUnit, isVariable } from '$lib/mathAST/guards';
import { findNodes } from '$lib/mathAST/transforms';
import { quantityProblem } from '$lib/mathAST/cli/quantities';
import { parseLatexQuantity, parseUnitExpression } from './parser';
import { degreeSymbolLatex, normalizeStudentQuantity, studentNumericLatex } from './student-input';
import { readCompositeDuration } from './composite-duration';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que la seconde lecture tire d'un calcul d'élève */
export type StudentCalculation =
	/** Le calcul réduit à une grandeur (`6~\unit{m}`), à comparer à l'attendu */
	| { kind: 'quantity'; latex: string }
	/** Un calcul qui ne donne pas une grandeur lisible */
	| { kind: 'refused'; reason: 'dimensions'; feedback: string }
	| { kind: 'refused'; reason: 'irrational' | 'unreadable' };

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Unité habillée par MathLive (`\operatorname{\mathrm{km}}`) ou par une touche du
 * clavier d'unités (`\mathrm{km}`), avec un exposant éventuel (`\mathrm{cm}^{2}`)
 */
const WRAPPED_UNIT =
	/\\operatorname\{\\mathrm\{([^{}]*)\}\}(\^\{-?\d+\}|\^-?\d)?|\\mathrm\{([^{}]*)\}(\^\{-?\d+\}|\^-?\d)?/g;

/**
 * Lettres nues collées à un nombre ou à une parenthèse (`3m`, `(3+2)\,m`,
 * `\frac{1}{2}h`) : une unité tapée au clavier ordinaire. Le découpage lit
 * déjà `6m` = 6 mètres ; ici dans un calcul.
 */
const BARE_UNIT =
	/([\d)}])((?:\s|\\[,;: ]|~)*)([A-Za-z°€Ωμ]+(?:\^\{-?\d+\}|\^-?\d)?)(?![A-Za-z{])/g;

/** Unité marquée, pour la retirer de la partie numérique */
const MARKED_UNIT = /\\unit\{[^{}]*\}/g;

// ============================================================================
// MARQUAGE DES UNITÉS
// ============================================================================

/** `^{2}` / `^2` → `^2` (écriture des unités) */
function exponentWriting(exponent: string | undefined): string {
	return exponent ? `^${exponent.replace(/[\^{}]/g, '')}` : '';
}

/** `\unit{u}` si `u` est une unité connue, sinon null */
function unitMark(writing: string): string | null {
	return parseUnitExpression(writing) === null ? null : `\\unit{${writing}}`;
}

/**
 * Marque `\unit{…}` les unités écrites dans la saisie ; null si aucune ne l'est
 * (`5xyz`, `2\times3` : la seconde lecture n'a rien à dire).
 */
export function markStudentUnits(latex: string): string | null {
	let found = false;
	const mark = (writing: string, whole: string): string => {
		const marked = unitMark(writing);
		if (marked === null) return whole;
		found = true;
		return marked;
	};
	// Le degré d'abord (`20^{\circ}C` → `20°C`) : sinon `C` serait lu le coulomb
	const marked = degreeSymbolLatex(latex)
		.replace(
			WRAPPED_UNIT,
			(whole, typed?: string, typedExponent?: string, key?: string, keyExponent?: string) =>
				mark(`${typed ?? key ?? ''}${exponentWriting(typedExponent ?? keyExponent)}`, whole)
		)
		// MathLive écrit toujours « min » en opérateur `\min`
		.replace(/\\min(?![A-Za-z])/g, (whole) => mark('min', whole))
		.replace(BARE_UNIT, (whole, before: string, space: string, writing: string) => {
			const unit = mark(writing.replace(/\^\{(-?\d+)\}/, '^$1'), '');
			return unit === '' ? whole : `${before}${space}${unit}`;
		});
	return found ? marked : null;
}

// ============================================================================
// LECTURE DU CALCUL
// ============================================================================

/** La grandeur réduite, signe mis à part : `-3~\unit{m}` est `−(3 m)` */
function unsignedQuantity(node: MathNode): MathNode {
	return isOpposite(node) ? node.operand : node;
}

/**
 * Lit le calcul d'un élève dans un trou à unité ; null quand la seconde lecture
 * ne s'applique pas (aucune unité marquée, LaTeX illisible) : la correction
 * garde alors ses messages habituels.
 */
export function readStudentCalculation(latex: string): StudentCalculation | null {
	const marked = markStudentUnits(latex);
	if (marked === null) return null;
	// Virgule finale (`5{,}\,m`) : le nombre 5, comme dans une case sans unité
	const parsed = parseLatexSafe(marked.replace(/\{,\}(?!\d)/g, ''));
	if (!parsed.ast || parsed.errors.length > 0) return null;

	// Une lettre hors des unités (`3x\,m`) : pas une grandeur
	if (findNodes(parsed.ast, isVariable).length > 0)
		return { kind: 'refused', reason: 'unreadable' };
	// `3+2\unit{m}` : un nombre et une longueur ne s'ajoutent pas
	const problem = quantityProblem(parsed.ast);
	if (problem !== null) return { kind: 'refused', reason: 'dimensions', feedback: problem };

	const reduced = tidy(parsed.ast, { unitChoice: 'written' });
	const quantity = unsignedQuantity(reduced);
	if (!isUnit(quantity)) return { kind: 'refused', reason: 'unreadable' };
	// `2\sqrt{2}\,m` : une valeur qui n'est pas un nombre décimal ou rationnel
	if (rationalOf(quantity.expression) === null) return { kind: 'refused', reason: 'irrational' };

	const reducedLatex = toLatex(reduced);
	return parseLatexQuantity(reducedLatex) === null
		? { kind: 'refused', reason: 'unreadable' }
		: { kind: 'quantity', latex: reducedLatex };
}

// ============================================================================
// PARTIE NUMÉRIQUE
// ============================================================================

/**
 * La partie numérique de la saisie d'un élève (trou à unité), en LaTeX, pour le
 * contrôle de FORME :
 * - un nombre suivi d'une unité que le découpage lit (`2{,}5\,km`) → le nombre
 *   tel que tapé (`studentNumericLatex`) ;
 * - sinon, un calcul avec des unités → la saisie sans ses unités
 *   (`2\times3\,m` → `2\times3`, `3\,m+2\,m` → `3+2`), qu'un contrôle de nombre
 *   simple refuse comme dans une case sans unité.
 * Null si ni l'un ni l'autre (l'appelant garde son propre découpage).
 */
export function studentValueLatex(latex: string): string | null {
	if (typeof latex !== 'string' || latex.includes('\\unit{')) return null;
	if (parseLatexQuantity(normalizeStudentQuantity(latex)) !== null) {
		return studentNumericLatex(latex);
	}
	// Une durée composée (`2\,h\,15\,\min`) n'est pas un calcul : sa forme est jugée à part
	if (readCompositeDuration(latex) !== null) return studentNumericLatex(latex);
	const marked = markStudentUnits(latex.trim());
	if (marked === null) return studentNumericLatex(latex);
	return marked
		.replace(MARKED_UNIT, '')
		.replace(/(?:\s|\\[,;: ]|~)+$/, '')
		.trim();
}
