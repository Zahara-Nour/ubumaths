/**
 * Droite à tracer dans un repère — équation, nœuds, réponse, juge, correction
 * ===========================================================================
 *
 * L'élève trace la droite d'un bloc ```courbe (`tracer: y = 2x - 1`, chantier
 * `docs/archive/wip/points-repere-progress.md` § 3, lot 2) en posant DEUX points sur les
 * nœuds de la grille ; la droite qui passe par eux se dessine d'un bord à l'autre.
 *
 * Équation : réduite (`y = 2x - 1`), verticale (`x = 3`) ou cartésienne
 * (`2x + 3y - 6 = 0`), en syntaxe mathAST (`1/2x`, `0.5x`, `2*(x - 1)`) ; elle est
 * lue en `ax + by + c = 0` par évaluation, puis vérifiée affine.
 *
 * Réponse de la case (une seule) : `x1;y1/x2;y2` (`pointAnswer` pour chaque point,
 * vide pour un point pas posé). Réponse attendue : l'équation, telle qu'écrite
 * (normalisée) ; juste si les deux points sont distincts et sur la droite — toute
 * paire convient, jamais comparée à des points choisis par le générateur.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/courbe-tracer
 */

import { parseCustom } from '$lib/mathAST/parser/custom';
import { compile } from '$lib/mathAST/eval/compile';
import { tidy } from '$lib/mathAST/tidy';
import { toLatex } from '$lib/mathAST/latex-generator';
import type { CourbeWindow } from '../types/courbe';
import {
	courbeGridSteps,
	gridNodeValues,
	isGridNode,
	isPlacedPointCorrect,
	pointAnswer,
	readPointAnswer,
	type CourbeGridSpec,
	type CourbePlacedPoint
} from './courbe-placer';
import { isTracedVectorCorrect } from './courbe-vecteur';

// Types

/** Droite `ax + by + c = 0` (a et b jamais nuls tous les deux) */
export interface LineCoefficients {
	a: number;
	b: number;
	c: number;
}

/** Phrase de la correction ; `latex` : l'équation à écrire en formule après le texte, puis « . » */
export interface TracedLineMistake {
	text: string;
	latex?: string;
}

// Constantes

/** Écart relatif toléré (calculs en virgule flottante) */
const RELATIVE_TOLERANCE = 1e-9;

/** Points où l'on vérifie que l'équation est affine (hors des trois de calcul) */
const PROBES: [number, number][] = [
	[2, 3],
	[-1.5, 0.7],
	[3.25, -2],
	[-4, -6]
];

const NOT_A_LINE = 'ce n’est pas l’équation d’une droite';
const TWO_POINTS = 'Il faut placer deux points.';
const SAME_POINT = 'Tes deux points sont au même endroit : ils ne font pas une droite.';

// Functions

/** Les variables libres d'un AST */
function variablesOf(node: unknown, found: Set<string> = new Set()): Set<string> {
	if (Array.isArray(node)) {
		for (const child of node) variablesOf(child, found);
		return found;
	}
	if (node === null || typeof node !== 'object') return found;
	const record = node as Record<string, unknown>;
	if (record.type === 'variable' && typeof record.name === 'string') {
		found.add(record.name);
		return found;
	}
	for (const value of Object.values(record)) variablesOf(value, found);
	return found;
}

function close(a: number, b: number, scale: number): boolean {
	return Math.abs(a - b) <= RELATIVE_TOLERANCE * Math.max(1, scale);
}

/**
 * L'équation lue en `ax + by + c = 0` ; un message (sans « tracer : ») si elle
 * est illisible ou n'est pas celle d'une droite
 */
export function lineCoefficients(equation: string): LineCoefficients | string {
	const sides = equation.split('=');
	if (sides.length !== 2 || sides.some((side) => side.trim() === '')) {
		return 'une équation avec un seul « = » attendue (ex. y = 2x - 1, x = 3, 2x + 3y - 6 = 0)';
	}
	let evaluate: (x: number, y: number) => number;
	try {
		const left = parseCustom(sides[0].trim());
		const right = parseCustom(sides[1].trim());
		const unknown = [...variablesOf([left, right])].filter((v) => v !== 'x' && v !== 'y');
		if (unknown.length > 0) {
			return `inconnue « ${unknown[0]} » : x et y seulement`;
		}
		const l = compile(left);
		const r = compile(right);
		evaluate = (x, y) => l({ x, y }) - r({ x, y });
	} catch (error) {
		const detail = error instanceof Error ? ` (${error.message})` : '';
		return `équation illisible « ${equation} »${detail}`;
	}
	const c = evaluate(0, 0);
	const a = evaluate(1, 0) - c;
	const b = evaluate(0, 1) - c;
	if (![a, b, c].every(Number.isFinite) || (a === 0 && b === 0)) return NOT_A_LINE;
	const scale = Math.abs(a) + Math.abs(b) + Math.abs(c);
	const affine = PROBES.every(([x, y]) => {
		const value = evaluate(x, y);
		return Number.isFinite(value) && close(value, a * x + b * y + c, scale * 10);
	});
	if (!affine || (close(a, 0, scale) && close(b, 0, scale))) return NOT_A_LINE;
	return { a, b, c };
}

/**
 * Le point est-il sur la droite (au bruit flottant près) ? L'écart est rapporté à
 * la taille des termes (`|ax| + |by| + |c|`), pas à celle des coefficients : une
 * droite très raide n'élargit pas la tolérance
 */
function onLine(line: LineCoefficients, p: CourbePlacedPoint): boolean {
	const scale = Math.abs(line.a * p.x) + Math.abs(line.b * p.y) + Math.abs(line.c);
	return Math.abs(line.a * p.x + line.b * p.y + line.c) <= RELATIVE_TOLERANCE * Math.max(1, scale);
}

/** Les nœuds de la grille, dans la fenêtre, par où passe la droite (abscisses croissantes) */
export function lineNodes(spec: CourbeGridSpec, line: LineCoefficients): CourbePlacedPoint[] {
	const { xs, ys } = gridNodeValues(spec);
	const candidates: CourbePlacedPoint[] =
		Math.abs(line.b) >= Math.abs(line.a)
			? xs.map((x) => ({ x, y: -(line.a * x + line.c) / line.b }))
			: ys.map((y) => ({ x: -(line.b * y + line.c) / line.a, y }));
	const steps = courbeGridSteps(spec);
	return candidates
		.filter((p) => isGridNode(spec, p.x, p.y) && onLine(line, p))
		.map((p) => ({
			x: Math.round(p.x / steps.x) * steps.x + 0,
			y: Math.round(p.y / steps.y) * steps.y + 0
		}))
		.map((p) => ({ x: Number(p.x.toPrecision(12)), y: Number(p.y.toPrecision(12)) }))
		.sort((p, q) => p.x - q.x || p.y - q.y);
}

/**
 * Les deux nœuds de la droite à montrer dans la correction : les plus proches
 * de l'origine (en crans de grille), à égalité l'abscisse la plus petite ;
 * vide si l'équation ne se lit pas
 */
export function correctionPoints(spec: CourbeGridSpec, equation: string): CourbePlacedPoint[] {
	const line = lineCoefficients(equation);
	if (typeof line === 'string') return [];
	const steps = courbeGridSteps(spec);
	const distance = (p: CourbePlacedPoint) => (p.x / steps.x) ** 2 + (p.y / steps.y) ** 2;
	return lineNodes(spec, line)
		.map((p) => ({ p, d: distance(p) }))
		.sort((u, v) => u.d - v.d || u.p.x - v.p.x)
		.slice(0, 2)
		.map(({ p }) => p);
}

/** Réponse de la case : `x1;y1/x2;y2`, un côté vide pour un point pas posé, '' sans point */
export function tracedAnswer(points: (CourbePlacedPoint | null)[]): string {
	const [p, q] = points;
	if (!p && !q) return '';
	const side = (point: CourbePlacedPoint | null | undefined) =>
		point ? pointAnswer(point.x, point.y) : '';
	return `${side(p)}/${side(q)}`;
}

/** Les deux points d'une réponse écrite par `tracedAnswer` (null : pas posé) */
export function readTracedAnswer(
	answer: string
): [CourbePlacedPoint | null, CourbePlacedPoint | null] {
	const [first = '', second = ''] = answer.split('/');
	return [readPointAnswer(first), readPointAnswer(second)];
}

/** La droite par deux points distincts ; null s'ils sont confondus */
export function lineThrough(p: CourbePlacedPoint, q: CourbePlacedPoint): LineCoefficients | null {
	const a = q.y - p.y;
	const b = p.x - q.x;
	if (a === 0 && b === 0) return null;
	return { a, b, c: -(a * p.x + b * p.y) };
}

function samePoint(p: CourbePlacedPoint, q: CourbePlacedPoint): boolean {
	return isPlacedPointCorrect(pointAnswer(p.x, p.y), pointAnswer(q.x, q.y));
}

/** La droite de l'élève (`x1;y1/x2;y2`) est-elle celle de l'équation attendue ? */
export function isTracedLineCorrect(answer: string, equation: string): boolean {
	const line = lineCoefficients(equation);
	const [p, q] = readTracedAnswer(answer);
	if (typeof line === 'string' || !p || !q || samePoint(p, q)) return false;
	return onLine(line, p) && onLine(line, q);
}

/**
 * Juge d'une case de repère : un point à placer (attendu `2;3`), un vecteur à
 * tracer (attendu `vecteur 3;-2`, lot 3) ou une droite à tracer (attendu : une
 * équation, reconnue à son « = »)
 */
export function isCourbeAnswerCorrect(answer: string, expected: string): boolean {
	if (expected.startsWith('vecteur')) return isTracedVectorCorrect(answer, expected);
	return expected.includes('=')
		? isTracedLineCorrect(answer, expected)
		: isPlacedPointCorrect(answer, expected);
}

/**
 * L'équation en LaTeX, mise au propre côté par côté (`tidy` : `1x + 0` → `x`,
 * `0x + 2` → `2`, `2*-x` → `-2x`), pour l'écrire à l'élève ; l'équation telle
 * quelle si un côté ne se lit pas
 */
export function equationLatex(equation: string): string {
	try {
		return equation
			.split('=')
			.map((side) => toLatex(tidy(parseCustom(side.trim()))))
			.join(' = ');
	} catch {
		return equation;
	}
}

/** La phrase de la correction ; null si la droite est juste */
export function tracedLineMistake(answer: string, equation: string): TracedLineMistake | null {
	if (isTracedLineCorrect(answer, equation)) return null;
	const [p, q] = readTracedAnswer(answer);
	if (!p || !q) return { text: TWO_POINTS };
	if (samePoint(p, q)) return { text: SAME_POINT };
	return { text: 'Ta droite n’est pas celle d’équation', latex: equationLatex(equation) };
}

/**
 * Le segment de la droite visible dans la fenêtre (d'un bord à l'autre) ; null
 * si elle ne la traverse pas
 */
export function lineSegmentInWindow(
	line: LineCoefficients,
	w: CourbeWindow
): [CourbePlacedPoint, CourbePlacedPoint] | null {
	const tx = RELATIVE_TOLERANCE * Math.max(1, w.xMax - w.xMin);
	const ty = RELATIVE_TOLERANCE * Math.max(1, w.yMax - w.yMin);
	const inside = (p: CourbePlacedPoint) =>
		p.x >= w.xMin - tx && p.x <= w.xMax + tx && p.y >= w.yMin - ty && p.y <= w.yMax + ty;
	const found: CourbePlacedPoint[] = [];
	if (line.b !== 0) {
		for (const x of [w.xMin, w.xMax]) found.push({ x, y: -(line.a * x + line.c) / line.b });
	}
	if (line.a !== 0) {
		for (const y of [w.yMin, w.yMax]) found.push({ x: -(line.b * y + line.c) / line.a, y });
	}
	const points = found.filter(inside).map((p) => ({ x: p.x + 0, y: p.y + 0 }));
	let best: [CourbePlacedPoint, CourbePlacedPoint] | null = null;
	let longest = 0;
	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
			if (d > longest) {
				longest = d;
				best = [points[i], points[j]];
			}
		}
	}
	if (best === null) return null;
	// De gauche à droite (de bas en haut pour une verticale)
	const [p, q] = best;
	return p.x < q.x || (p.x === q.x && p.y < q.y) ? [p, q] : [q, p];
}

/**
 * La droite juste, telle que la correction la dessine : son segment dans la
 * fenêtre et ses deux nœuds les plus proches de l'origine ; null si l'équation
 * ne se lit pas (masquée)
 */
export function solutionLine(
	spec: CourbeGridSpec,
	equation: string
): { segment: [CourbePlacedPoint, CourbePlacedPoint]; points: CourbePlacedPoint[] } | null {
	const line = lineCoefficients(equation);
	if (typeof line === 'string') return null;
	const segment = lineSegmentInWindow(line, spec.window);
	return segment === null ? null : { segment, points: correctionPoints(spec, equation) };
}
