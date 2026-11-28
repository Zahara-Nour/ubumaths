/**
 * Réponse « droite paramétrique » : une représentation paramétrique jugée « même droite »
 * ====================================================================================
 *
 * Case marquée `answerKind: 'droite-parametrique'` (outil 64, spécification validée par
 * David le 2026-11-28, journal `docs/wip/outil-espace-progress.md`). L'élève écrit
 * `x = …`, `y = …`, `z = …` en fonction d'un paramètre ; l'auteur donne UNE
 * représentation de la droite (`x=1+2t\\y=2\\z=-1+3t`). Juste si c'est la même droite :
 *
 * - chaque ligne s'écrit a + b·p (p : le paramètre ; a, b constants), vérifié EXACTEMENT
 *   par mathAST : f(p) − (f(0) + (f(1) − f(0))·p) vaut 0 ;
 * - une seule lettre pour le paramètre, la même sur les trois lignes, ni x, ni y, ni z
 *   (t, k, s, λ… acceptées, décision de David) ;
 * - le point (valeurs pour p = 0) est sur la droite attendue, et le vecteur (coefficients
 *   de p) non nul et colinéaire au vecteur attendu (déterminants 2×2 nuls) ;
 * - seule la droite est jugée, jamais l'écriture (`1+2t-0`, `\frac{6}{2}t` justes,
 *   décision de David) ;
 * - illisible, une ligne vide, deux lettres → `incorrect` avec un message ; rien
 *   d'écrit → `empty` ; jamais d'exception.
 *
 * @module questions/parametric/parametric-line-answer
 */

import type { MathNode } from '#lib/mathAST/types.ts';
import { parseLatexSafe } from '#lib/mathAST/parser/index.ts';
import { add, multiply, number, subtract } from '#lib/mathAST/factory.ts';
import { mapNode } from '#lib/mathAST/transforms.ts';
import { getVariables } from '#lib/mathAST/eval/substitute.ts';
import { stripLatexSpacing } from '#lib/math/index.ts';
import { isAnswerTooComplex } from '#lib/questions/answer-complexity.ts';
import { isExactlyZero } from '#lib/questions/vectors/vector-answer.ts';
import { PARAMETRIC_COORDINATES, parseParametricAnswer } from './parametric-lines.ts';

export {
	formatParametricAnswer,
	parseParametricAnswer,
	PARAMETRIC_COORDINATES
} from './parametric-lines.ts';

// Types

export interface ParametricLineVerdict {
	status: 'correct' | 'incorrect' | 'empty';
	/** Message montré à l'élève */
	feedback?: string;
}

/** Droite lue : un point et un vecteur directeur (nœuds exacts), le paramètre */
interface ReadLineOk {
	ok: true;
	point: MathNode[];
	direction: MathNode[];
	parameter: string;
}

type ReadLine = ReadLineOk | { ok: false; feedback: string; empty?: boolean };

// Constantes

/** Lettre affichée dans un message : `t`, ou « le paramètre » pour `\lambda` */
function parameterLabel(name: string): string {
	return name.length === 1 ? name : 'le paramètre';
}

/** Messages figés (français, tutoiement) */
export const PARAMETRIC_FEEDBACK = {
	incomplete: 'Remplis les trois lignes : x, y et z.',
	unreadable: (name: string) => `Je ne peux pas lire la ligne de ${name}.`,
	letters:
		'Utilise une seule lettre pour le paramètre (par exemple t), la même sur les trois lignes, ni x, ni y, ni z.',
	notAffine: (name: string) =>
		`La ligne de ${name} doit s'écrire a + b t : un nombre, plus un nombre fois le paramètre.`,
	zero: 'Ton vecteur directeur est nul : ces lignes ne décrivent pas une droite.',
	pointOff: (parameter: string) =>
		`Le point obtenu pour ${parameterLabel(parameter)} = 0 n'est pas sur la droite.`,
	notCollinear: "Ton vecteur directeur n'est pas colinéaire à celui de la droite."
} as const;

/** Plus grand exposant entier écrit (garde contre `(1+t)^{999}`, comme la case vecteur) */
const MAX_WRITTEN_EXPONENT = 20;

/** Lettres qui ne servent pas de paramètre */
const FORBIDDEN_PARAMETERS = new Set<string>(PARAMETRIC_COORDINATES);

// Functions

/** Un exposant entier écrit au-delà de MAX_WRITTEN_EXPONENT, ou un exposant non entier */
function hasHugeExponent(node: MathNode): boolean {
	let huge = false;
	mapNode(node, (n) => {
		if (n.type !== 'superscript') return n;
		const exponent = n.superscript.type === 'delimiter' ? n.superscript.content : n.superscript;
		if (exponent.type === 'number' && Number(exponent.value) > MAX_WRITTEN_EXPONENT) huge = true;
		return n;
	});
	return huge;
}

/** Une ligne : expression lisible sans égalité, `null` sinon */
function parseLine(text: string): MathNode | null {
	if (isAnswerTooComplex(text)) return null;
	try {
		const { ast, errors } = parseLatexSafe(stripLatexSpacing(text, 'decimal'));
		if (!ast || (errors && errors.length > 0)) return null;
		if (ast.type === 'relation' || hasHugeExponent(ast)) return null;
		return ast;
	} catch {
		return null;
	}
}

/** Le nœud est le paramètre : une lettre (`t`) ou une lettre grecque (`\\lambda`) */
function isParameter(node: MathNode, parameter: string): boolean {
	return (
		(node.type === 'variable' && node.name === parameter) ||
		(node.type === 'greek' && node.letter === parameter)
	);
}

/** Le nœud du paramètre, tel que l'élève l'a écrit */
function parameterNode(node: MathNode, parameter: string): MathNode {
	let found: MathNode = { type: 'variable', name: parameter };
	mapNode(node, (n) => {
		if (isParameter(n, parameter)) found = n;
		return n;
	});
	return found;
}

/** L'expression où le paramètre vaut `value` */
function at(node: MathNode, parameter: string, value: number): MathNode {
	return mapNode(node, (n) => (isParameter(n, parameter) ? number(value) : n));
}

/** Vaut exactement 0 ; faux si la réduction échoue (division par zéro, non réel, budget) */
function isZero(node: MathNode): boolean {
	try {
		return isExactlyZero(node);
	} catch {
		return false;
	}
}

/** Colinéaires : tous les déterminants 2×2 a_i·b_j − a_j·b_i sont nuls */
function areCollinear(a: readonly MathNode[], b: readonly MathNode[]): boolean {
	for (let i = 0; i < a.length; i++) {
		for (let j = i + 1; j < a.length; j++) {
			const determinant = subtract(multiply(a[i], b[j], 'cross'), multiply(a[j], b[i], 'cross'));
			if (!isZero(determinant)) return false;
		}
	}
	return true;
}

/** Les lignes d'une représentation : point, vecteur, paramètre ; jamais d'exception */
function readLine(text: string): ReadLine {
	const lines = parseParametricAnswer(text);
	if (lines.every((line) => !line)) return { ok: false, feedback: '', empty: true };
	const dimension = PARAMETRIC_COORDINATES.length;
	if (lines.length !== dimension || lines.some((line) => !line)) {
		return { ok: false, feedback: PARAMETRIC_FEEDBACK.incomplete };
	}

	const nodes: MathNode[] = [];
	for (const [k, line] of lines.entries()) {
		const node = parseLine(line);
		if (!node)
			return { ok: false, feedback: PARAMETRIC_FEEDBACK.unreadable(PARAMETRIC_COORDINATES[k]) };
		nodes.push(node);
	}

	const letters = new Set(nodes.flatMap((node) => [...getVariables(node)]));
	if (letters.size === 0) return { ok: false, feedback: PARAMETRIC_FEEDBACK.zero };
	const [parameter] = letters;
	if (letters.size > 1 || FORBIDDEN_PARAMETERS.has(parameter)) {
		return { ok: false, feedback: PARAMETRIC_FEEDBACK.letters };
	}

	const point: MathNode[] = [];
	const direction: MathNode[] = [];
	for (const [k, node] of nodes.entries()) {
		const constant = at(node, parameter, 0);
		const coefficient = subtract(at(node, parameter, 1), constant);
		// Affine : f(p) − (f(0) + (f(1) − f(0))·p) = 0, et f(0), f(1) définis
		const rest = subtract(
			node,
			add(constant, multiply(coefficient, parameterNode(node, parameter), 'implicit'))
		);
		if (!isZero(subtract(constant, constant)) || !isZero(rest)) {
			return { ok: false, feedback: PARAMETRIC_FEEDBACK.notAffine(PARAMETRIC_COORDINATES[k]) };
		}
		point.push(constant);
		direction.push(coefficient);
	}
	if (direction.every(isZero)) return { ok: false, feedback: PARAMETRIC_FEEDBACK.zero };
	return { ok: true, point, direction, parameter };
}

/** Juge une représentation paramétrique contre celle de l'auteur */
export function judgeParametricLineAnswer(answer: string, expected: string): ParametricLineVerdict {
	const student = readLine(answer);
	if (!student.ok) {
		return student.empty
			? { status: 'empty' }
			: { status: 'incorrect', feedback: student.feedback };
	}
	const line = readLine(expected);
	// Attendue illisible : faute d'auteur (le lanceur de specs l'arrête avant la prod)
	if (!line.ok)
		return { status: 'incorrect', feedback: 'Cette question ne peut pas être corrigée.' };

	const offset = student.point.map((value, k) => subtract(value, line.point[k]));
	if (!areCollinear(offset, line.direction)) {
		return { status: 'incorrect', feedback: PARAMETRIC_FEEDBACK.pointOff(student.parameter) };
	}
	if (!areCollinear(student.direction, line.direction)) {
		return { status: 'incorrect', feedback: PARAMETRIC_FEEDBACK.notCollinear };
	}
	return { status: 'correct' };
}

/**
 * Réponse attendue écrite par l'auteur : trois lignes lisibles, affines en un seul
 * paramètre, vecteur non nul. Sert aux specs de test (une attendue illisible est une
 * erreur du MODÈLE, pas de l'élève).
 */
export function readExpectedParametricLine(
	expected: string
): { ok: true } | { ok: false; error: string } {
	const line = readLine(expected);
	if (line.ok) return { ok: true };
	return { ok: false, error: line.empty ? 'vide' : line.feedback };
}

/** Attendue rendue en système : `\begin{cases}x=…\\y=…\\z=…\end{cases}\quad(t\in\mathbb{R})` */
export function expectedParametricLatex(expected: string): string {
	const lines = parseParametricAnswer(expected);
	const body = lines.map((line, k) => `${PARAMETRIC_COORDINATES[k] ?? ''}=${line}`).join('\\\\');
	const read = readLine(expected);
	const parameter = read.ok ? read.parameter : 't';
	const symbol = parameter.length === 1 ? parameter : `\\${parameter}`;
	return `\\begin{cases}${body}\\end{cases}\\quad(${symbol}\\in\\mathbb{R})`;
}
