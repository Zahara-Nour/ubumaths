/**
 * Réponse « résolution » : une équation résolue ligne par ligne
 * ============================================================
 *
 * Case marquée `answerKind: 'resolution'` (outil 55, spécification validée par
 * David le 2026-11-28, journal `docs/wip/outil-equation-lignes-progress.md`).
 * L'élève écrit les équations successives (3x − 5 = 7, puis 3x = 12, puis x = 4) :
 *
 * - chaque ligne doit avoir LES MÊMES SOLUTIONS que la précédente, la première
 *   que l'équation de l'énoncé (`equation`) ; ensembles comparés par le solveur
 *   de mathAST (`solveEquation`), valeurs exactes ;
 * - la dernière ligne doit être « x = valeur », sans x à droite ; son écriture
 *   (fraction à simplifier…) est jugée ensuite par `answer-validator.ts`, comme
 *   une case ordinaire comparée à elle-même ;
 * - une seule ligne fausse rend la réponse fausse, même si la dernière est juste
 *   (deux erreurs qui se compensent) ;
 * - `minLines` (défaut 1) : nombre de lignes exigé ; `x = 4` seul est juste sinon ;
 * - ligne illisible, sans « = », avec une autre lettre → marquée illisible,
 *   réponse fausse ; rien d'écrit → `empty` ; jamais d'exception.
 *
 * Les lignes voyagent dans UNE valeur de case, séparées par `\\` (LaTeX) :
 * `formatResolutionAnswer` / `parseResolutionAnswer` (`resolution-lines.ts`).
 *
 * @module questions/resolution/resolution-answer
 */

import type { MathNode } from '#lib/mathAST/types.ts';
import type { SolveResult } from '#lib/mathAST/solve/types.ts';
import { parseLatexSafe } from '#lib/mathAST/parser/index.ts';
import { solveEquation } from '#lib/mathAST/solve/solve.ts';
import { isSolverFailure } from '#lib/mathAST/solve/types.ts';
import { areEquivalent } from '#lib/mathAST/equivalence.ts';
import { getVariables } from '#lib/mathAST/eval/substitute.ts';
import { stripLatexSpacing } from '#lib/math/index.ts';
import { isAnswerTooComplex } from '#lib/questions/answer-complexity.ts';
import { parseResolutionAnswer, RESOLUTION_MAX_LINES } from './resolution-lines.ts';

export {
	formatResolutionAnswer,
	parseResolutionAnswer,
	RESOLUTION_MAX_LINES
} from './resolution-lines.ts';

// Types

/**
 * Verdict d'une ligne : juste, pas les mêmes solutions que la précédente, illisible.
 * Les lignes après la première fausse ou illisible n'ont pas de marque.
 */
export type ResolutionLineMark = 'ok' | 'not-equivalent' | 'unreadable';

export interface ResolutionVerdict {
	status: 'correct' | 'incorrect' | 'empty';
	/** Message montré à l'élève (première ligne fausse, conclusion manquante…) */
	feedback?: string;
	/** Une marque par ligne écrite, dans l'ordre */
	lines: ResolutionLineMark[];
	/** Valeur de la dernière ligne « x = valeur » (LaTeX), quand toutes les lignes sont justes */
	finalValue?: string;
}

export interface ResolutionBlankFields {
	/** Équation de l'énoncé (`3x-5=7`), variables tirées déjà résolues */
	equation?: string;
	/** Inconnue (défaut `x`) */
	variable?: string;
	/** Nombre de lignes exigé (défaut 1) */
	minLines?: number;
}

/** Ensemble des solutions d'une ligne, lu par le solveur */
interface SolutionSet {
	status: SolveResult['status'];
	values: readonly MathNode[];
}

// Constantes

const DEFAULT_VARIABLE = 'x';

/**
 * Gardes de coût du solveur (revue de l'outil 55) : `(x+1)^{999}=(x+2)^{999}` passe la
 * garde de complexité mais coûte des secondes, `((((x+1)^{10})^{10})^{10})^{10}=1`
 * épuise la mémoire. Une ligne est lue si chaque exposant est un entier écrit d'au plus
 * 10 et si son degré écrit (produit : somme, puissance : multiple) ne dépasse pas 20.
 * Au collège, une résolution reste au premier ou au second degré.
 */
const MAX_WRITTEN_EXPONENT = 10;
const MAX_WRITTEN_DEGREE = 20;

// Functions

/** Nœuds enfants d'un nœud quelconque (champs qui sont des nœuds ou des listes de nœuds) */
function childNodes(node: MathNode): MathNode[] {
	const isNode = (value: unknown): value is MathNode =>
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { type?: unknown }).type === 'string';
	return Object.values(node).flatMap((value: unknown) =>
		Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []
	);
}

/**
 * Majorant du degré écrit d'une expression ; `Infinity` pour un exposant qui n'est pas un
 * entier écrit d'au plus MAX_WRITTEN_EXPONENT (`x^{999}`, `x^{x}`)
 */
function writtenDegree(node: MathNode): number {
	switch (node.type) {
		case 'number':
		case 'constant':
			return 0;
		case 'variable':
			return 1;
		case 'superscript': {
			let exponent = node.superscript;
			while (exponent.type === 'delimiter') exponent = exponent.content;
			const value = exponent.type === 'number' ? Number(exponent.value) : Number.NaN;
			if (!(Math.abs(value) <= MAX_WRITTEN_EXPONENT)) return Infinity;
			return writtenDegree(node.base) * Math.max(1, Math.abs(value));
		}
		case 'addition':
		case 'subtraction':
		case 'relation':
			return Math.max(writtenDegree(node.left), writtenDegree(node.right));
		default:
			// Produit, quotient, fonction… : la somme des degrés de ses parties
			return childNodes(node).reduce((sum, child) => sum + writtenDegree(child), 0);
	}
}

/** Lecture LaTeX tolérante, comme les autres cases (virgule décimale, espaces) */
function parseLine(text: string): MathNode | null {
	if (isAnswerTooComplex(text)) return null;
	try {
		const { ast } = parseLatexSafe(stripLatexSpacing(text.trim(), 'decimal'));
		return ast && writtenDegree(ast) <= MAX_WRITTEN_DEGREE ? ast : null;
	} catch {
		return null;
	}
}

/** Plusieurs égalités sur une ligne (`x=\frac{12}{3}=4`) */
function hasSeveralEquals(text: string): boolean {
	return text.split('=').length > 2;
}

/** Ligne écrite comme l'équation de l'énoncé (espaces ignorés) */
function sameWriting(a: string, b: string): boolean {
	const compact = (text: string) => stripLatexSpacing(text, 'decimal').replace(/\s+/g, '');
	return compact(a) === compact(b);
}

/** Équation « = » dont la seule lettre est l'inconnue, sinon null */
function readEquation(text: string, variable: string): MathNode | null {
	const ast = parseLine(text);
	if (!ast || ast.type !== 'relation' || ast.relation !== '=') return null;
	for (const name of getVariables(ast)) if (name !== variable) return null;
	return ast;
}

/** Solutions d'une équation lue ; null quand le solveur ne sait pas conclure */
function solutionSet(equation: MathNode, variable: string): SolutionSet | null {
	try {
		const result = solveEquation(equation, { variable });
		if (isSolverFailure(result) || result.status === 'approximate') return null;
		return { status: result.status, values: result.solutions.map((s) => s.value) };
	} catch {
		return null;
	}
}

/** Mêmes solutions : même statut, et chaque valeur de l'une est dans l'autre */
function sameSolutions(a: SolutionSet, b: SolutionSet): boolean {
	if (a.status !== b.status || a.values.length !== b.values.length) return false;
	const contains = (set: readonly MathNode[], value: MathNode) =>
		set.some((other) => areEquivalent(other, value));
	return (
		a.values.every((v) => contains(b.values, v)) && b.values.every((v) => contains(a.values, v))
	);
}

/** Valeur d'une conclusion « x = valeur » (sans x à droite), sinon null */
function conclusionValue(text: string, variable: string): string | null {
	const ast = readEquation(text, variable);
	if (!ast || ast.type !== 'relation') return null;
	if (ast.left.type !== 'variable' || ast.left.name !== variable) return null;
	if (getVariables(ast.right).has(variable)) return null;
	const sign = text.indexOf('=');
	return sign < 0 ? null : text.slice(sign + 1).trim();
}

/**
 * Juge les lignes d'une résolution. Le statut `correct` dit que les lignes sont
 * justes et que la dernière est « x = valeur » : l'écriture de la valeur reste à
 * juger (`finalValue`).
 */
export function judgeResolutionAnswer(
	answer: string,
	fields: ResolutionBlankFields
): ResolutionVerdict {
	const lines = parseResolutionAnswer(answer);
	if (lines.length === 0) return { status: 'empty', lines: [] };
	if (lines.length > RESOLUTION_MAX_LINES) {
		return {
			status: 'incorrect',
			feedback: `Écris ta résolution en ${RESOLUTION_MAX_LINES} lignes au plus.`,
			lines: lines.map(() => 'unreadable')
		};
	}

	const variable = fields.variable?.trim() || DEFAULT_VARIABLE;
	const start = fields.equation ? readEquation(fields.equation, variable) : null;
	let previous = start ? solutionSet(start, variable) : null;
	// Équation de l'énoncé illisible : faute d'auteur, aucune ligne ne peut être jugée
	if (!previous) {
		return {
			status: 'incorrect',
			feedback: 'Cette question ne peut pas être corrigée.',
			lines: lines.map(() => 'unreadable')
		};
	}

	// Chaque ligne est comparée à la précédente. Le jugement s'arrête à la première ligne
	// fausse ou illisible (la réponse est déjà fausse ; le solveur ne tourne pas pour rien) :
	// les lignes suivantes restent sans marque
	const marks: ResolutionLineMark[] = [];
	for (const line of lines) {
		const equation = readEquation(line, variable);
		const solutions = equation ? solutionSet(equation, variable) : null;
		if (!solutions) {
			marks.push('unreadable');
			const k = marks.length;
			return {
				status: 'incorrect',
				feedback: hasSeveralEquals(line)
					? `Ligne ${k} : écris une seule égalité par ligne.`
					: `Je ne peux pas lire la ligne ${k} : écris une équation en ${variable}.`,
				lines: marks
			};
		}
		if (!sameSolutions(previous, solutions)) {
			marks.push('not-equivalent');
			return {
				status: 'incorrect',
				feedback: `La ligne ${marks.length} n'a pas les mêmes solutions que la précédente.`,
				lines: marks
			};
		}
		marks.push('ok');
		previous = solutions;
	}

	// Lignes exigées : la conclusion, plus les étapes avant elle qui ne sont ni une autre
	// conclusion « x = … » (recopiée) ni l'équation de l'énoncé recopiée
	const minLines = Math.max(1, Math.floor(fields.minLines ?? 1));
	const steps = lines
		.slice(0, -1)
		.filter(
			(line) =>
				conclusionValue(line, variable) === null &&
				!(fields.equation && sameWriting(line, fields.equation))
		).length;
	if (steps + 1 < minLines) {
		return {
			status: 'incorrect',
			feedback: `Écris les étapes de ta résolution : au moins ${minLines} lignes.`,
			lines: marks
		};
	}

	const finalValue = conclusionValue(lines[lines.length - 1], variable);
	if (finalValue === null) {
		return {
			status: 'incorrect',
			feedback: `Termine ta résolution par « ${variable} = … ».`,
			lines: marks
		};
	}
	return { status: 'correct', lines: marks, finalValue };
}

/**
 * Réponse attendue d'une case « résolution » (`x={{s}}`), vérifiée par le juge lui-même
 * comme une résolution d'UNE ligne : sinon toute réponse de l'élève serait fausse sans
 * le dire (équation de l'énoncé illisible, attendue qui n'est pas sa solution).
 */
export function readExpectedResolution(
	expected: string,
	fields: ResolutionBlankFields
): { ok: true } | { ok: false; error: string } {
	const verdict = judgeResolutionAnswer(expected, { ...fields, minLines: 1 });
	if (verdict.status === 'correct') return { ok: true };
	return {
		ok: false,
		error: `pas la solution de « ${fields.equation ?? ''} » écrite « ${fields.variable?.trim() || DEFAULT_VARIABLE} = … » (${verdict.feedback ?? 'vide'})`
	};
}
