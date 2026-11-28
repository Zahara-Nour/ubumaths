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

/** Verdict d'une ligne : juste, pas les mêmes solutions que la précédente, illisible */
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

// Functions

/** Lecture LaTeX tolérante, comme les autres cases (virgule décimale, espaces) */
function parseLine(text: string): MathNode | null {
	if (isAnswerTooComplex(text)) return null;
	try {
		const { ast } = parseLatexSafe(stripLatexSpacing(text.trim(), 'decimal'));
		return ast ?? null;
	} catch {
		return null;
	}
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

	// Chaque ligne est comparée à la précédente ; une ligne illisible ne sert pas de
	// référence : la suivante est comparée à la dernière ligne lue
	const marks: ResolutionLineMark[] = [];
	for (const line of lines) {
		const equation = readEquation(line, variable);
		const solutions = equation ? solutionSet(equation, variable) : null;
		if (!solutions) {
			marks.push('unreadable');
			continue;
		}
		marks.push(sameSolutions(previous, solutions) ? 'ok' : 'not-equivalent');
		previous = solutions;
	}

	const firstWrong = marks.findIndex((mark) => mark !== 'ok');
	if (firstWrong >= 0) {
		return {
			status: 'incorrect',
			feedback:
				marks[firstWrong] === 'unreadable'
					? `Je ne peux pas lire la ligne ${firstWrong + 1} : écris une équation en ${variable}.`
					: `La ligne ${firstWrong + 1} n'a pas les mêmes solutions que la précédente.`,
			lines: marks
		};
	}

	const minLines = Math.max(1, Math.floor(fields.minLines ?? 1));
	if (lines.length < minLines) {
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
