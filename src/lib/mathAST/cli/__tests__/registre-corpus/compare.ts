/**
 * Juge d'une entrée du corpus du registre (`tests/fixtures/mathast/registre-corpus.ts`).
 *
 * Ce qu'il compare : la réponse brute d'un outil (le champ `answer` du
 * registre, le `latex` affiché par l'Atelier) à l'attendu, écrit à l'avance.
 *
 * - **Expression** : `checkForm`, le comparateur de forme des réponses
 *   d'élèves (règle E1). Il TOLÈRE les espaces, le signe ×, l'ordre des
 *   termes et des facteurs (`1+x` passe pour `x+1`) : le corpus ne voit donc
 *   pas un ordre différent. Ce n'est pas l'équivalence : `e^x+xe^x` n'a pas
 *   la forme de `(x+1)e^x`.
 * - **Contrôle numérique** (Q6) : une forme refusée est recalculée en
 *   quelques points. Même valeur → `forme` (autre écriture) ; autre valeur →
 *   `valeur`. Une faute de frappe dans un attendu se voit ainsi comme un
 *   écart de valeur sur TOUS les outils à la fois, pas comme un moteur faux.
 * - **Ensemble** (`S = …`, `D = …`) : `checkForm` ne les lit pas. Ils sont
 *   découpés (réunion, intervalle, ℝ privé de, ensemble fini, vide) et chaque
 *   borne ou élément est jugé comme une expression ; l'ordre des éléments
 *   compte (rangés dans l'ordre croissant).
 * - **Verdict** (`\text{vrai}`) et **refus** (message) : texte exact.
 */

import { checkForm } from '$lib/mathAST/cosmetic-transforms';
import { parseLatex } from '$lib/mathAST/parser';
import { compile } from '$lib/mathAST/eval/compile';
import { findNodes } from '$lib/mathAST/transforms';
import { isVariable } from '$lib/mathAST/guards';
import type { RegistreCase } from '../../../../../../tests/fixtures/mathast/registre-corpus';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'un outil a rendu pour une ligne. */
export type Produced =
	| { readonly kind: 'reponse'; readonly latex: string }
	| { readonly kind: 'refus'; readonly message: string }
	/** Ni réponse brute lisible ni refus (sortie texte seule, champ absent) */
	| { readonly kind: 'sans-reponse'; readonly detail: string };

export type Verdict =
	| { readonly status: 'juste' }
	/** Même valeur, autre écriture */
	| { readonly status: 'forme'; readonly rendu: string }
	/** Autre valeur (ou valeur non comparable) */
	| { readonly status: 'valeur'; readonly rendu: string }
	/** Un ensemble attendu, autre chose rendu (`x = 3` pour `S = \{3\}`) */
	| { readonly status: 'structure'; readonly rendu: string }
	/** Refusé alors qu'une réponse est attendue */
	| { readonly status: 'refus'; readonly rendu: string }
	| { readonly status: 'sans-reponse'; readonly rendu: string }
	/** Refus attendu : autre message */
	| { readonly status: 'message'; readonly rendu: string }
	/** Refus attendu : une réponse a été rendue */
	| { readonly status: 'accepte'; readonly rendu: string }
	/** L'attendu lui-même ne se lit pas : bug du CORPUS */
	| { readonly status: 'corpus'; readonly rendu: string };

type Part =
	| { readonly kind: 'empty' }
	| { readonly kind: 'reals' }
	| { readonly kind: 'reals-minus'; readonly points: readonly string[] }
	| { readonly kind: 'finite'; readonly elements: readonly string[] }
	| {
			readonly kind: 'interval';
			readonly open: string;
			readonly lower: string;
			readonly upper: string;
			readonly close: string;
	  };

interface SetAnswer {
	readonly prefix: 'S' | 'D';
	readonly parts: readonly Part[];
}

// =============================================================================
// Constantes
// =============================================================================

/** Points de contrôle, communs à toutes les lettres (x, C…) */
const SAMPLE_POINTS: readonly number[] = [0.37, 1.3, 2.71, -0.6, 4.2, -1.9];

/** Tolérance relative du contrôle numérique */
const TOLERANCE = 1e-9;

/** Points comparés au minimum pour conclure « même valeur » */
const MIN_POINTS = 3;

// =============================================================================
// Fonctions
// =============================================================================

/** Juger ce qu'un outil a rendu pour une entrée du corpus. */
export function judge(c: RegistreCase, produced: Produced): Verdict {
	if (c.refus === true) {
		if (produced.kind === 'refus') {
			return produced.message.trim() === c.attendu
				? { status: 'juste' }
				: { status: 'message', rendu: produced.message.trim() };
		}
		return produced.kind === 'reponse'
			? { status: 'accepte', rendu: produced.latex }
			: { status: 'sans-reponse', rendu: produced.detail };
	}
	if (produced.kind === 'refus') return { status: 'refus', rendu: produced.message };
	if (produced.kind === 'sans-reponse') return { status: 'sans-reponse', rendu: produced.detail };

	const rendu = produced.latex;
	if (isText(c.attendu)) {
		return compact(rendu) === compact(c.attendu)
			? { status: 'juste' }
			: { status: 'valeur', rendu };
	}
	const expectedSet = readSet(c.attendu);
	if (expectedSet !== null) return judgeSet(expectedSet, rendu);
	if (/^[SD]\s*=/.test(c.attendu)) {
		return { status: 'corpus', rendu: `ensemble illisible : ${c.attendu}` };
	}
	if (compileLatex(c.attendu) === null) {
		return { status: 'corpus', rendu: `attendu illisible : ${c.attendu}` };
	}
	const verdict = compareExpressions(rendu, c.attendu);
	return verdict === 'juste' ? { status: 'juste' } : { status: verdict, rendu };
}

/** Vérifier que l'attendu d'une entrée se lit (test du corpus lui-même). */
export function expectedProblem(c: RegistreCase): string | null {
	if (c.refus === true || isText(c.attendu)) return null;
	if (/^[SD]\s*=/.test(c.attendu)) {
		const set = readSet(c.attendu);
		if (set === null) return `ensemble illisible : ${c.attendu}`;
		const bad = set.parts.flatMap(partExpressions).find((e) => compileLatex(e) === null);
		return bad === undefined ? null : `élément illisible : ${bad}`;
	}
	return compileLatex(c.attendu) === null ? `attendu illisible : ${c.attendu}` : null;
}

function isText(latex: string): boolean {
	return latex.trim().startsWith('\\text{');
}

/** Les écritures qui ne changent pas le sens : espaces, \left \right, `{,}`, `\dfrac` */
function compact(latex: string): string {
	return latex
		.replace(/\\left|\\right/g, '')
		.replace(/\\[,;:! ]/g, '')
		.replace(/\{,\}/g, ',')
		.replace(/\\dfrac|\\tfrac/g, '\\frac')
		.replace(/\\exponentialE/g, 'e')
		.replace(/\\varnothing/g, '\\emptyset')
		.replace(/\\geqslant/g, '\\geq')
		.replace(/\\leqslant/g, '\\leq')
		.replace(/\s+/g, '');
}

/** `0,75` / `0{,}75` → `0.75`, pour la lecture numérique seulement */
function withDecimalPoint(latex: string): string {
	return latex.replace(/\{,\}/g, '.').replace(/(\d),(\d)/g, '$1.$2');
}

function compileLatex(latex: string): ReturnType<typeof compile> | null {
	try {
		return compile(parseLatex(withDecimalPoint(latex)));
	} catch {
		return null;
	}
}

function variablesOf(latex: string): string[] {
	try {
		const names = findNodes(parseLatex(withDecimalPoint(latex)), isVariable).map((v) => v.name);
		return [...new Set(names)];
	} catch {
		return [];
	}
}

/** `juste` (même forme), `forme` (même valeur), `valeur` (autre valeur ou incomparable) */
function compareExpressions(rendered: string, expected: string): 'juste' | 'forme' | 'valeur' {
	if (compact(rendered) === compact(expected)) return 'juste';
	if (/\\infty/.test(rendered) || /\\infty/.test(expected)) return 'valeur';
	let form: ReturnType<typeof checkForm> | null;
	try {
		form = checkForm(rendered, expected, {});
	} catch {
		form = null;
	}
	if (form !== null && form.status === 'correct') return 'juste';
	return sameValue(rendered, expected) ? 'forme' : 'valeur';
}

function sameValue(a: string, b: string): boolean {
	const fa = compileLatex(a);
	const fb = compileLatex(b);
	if (fa === null || fb === null) return false;
	const names = [...new Set([...variablesOf(a), ...variablesOf(b)])];
	let compared = 0;
	for (const [i, x] of SAMPLE_POINTS.entries()) {
		// Chaque lettre a sa valeur (x et C ne se confondent pas)
		const vars = Object.fromEntries(names.map((n, k) => [n, x + 0.11 * k * (i + 1)]));
		const va = fa(vars);
		const vb = fb(vars);
		if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
		if (Math.abs(va - vb) > TOLERANCE * Math.max(1, Math.abs(vb))) return false;
		compared++;
	}
	return compared >= Math.min(MIN_POINTS, names.length === 0 ? 1 : MIN_POINTS);
}

// --- Ensembles ---------------------------------------------------------------

/** Découpe `S = ]-\infty ; 3[ \cup \{5\}`, `D = \mathbb{R} \setminus \{0\}` ; `null` sinon. */
function readSet(latex: string): SetAnswer | null {
	const text = compact(latex);
	const head = /^([SD])=(.*)$/.exec(text);
	if (head === null) return null;
	const pieces = splitTop(head[2], '\\cup');
	const parts: Part[] = [];
	for (const piece of pieces) {
		const part = readPart(piece);
		if (part === null) return null;
		parts.push(part);
	}
	return { prefix: head[1] as 'S' | 'D', parts };
}

function readPart(piece: string): Part | null {
	if (piece === '\\emptyset') return { kind: 'empty' };
	if (piece === '\\mathbb{R}') return { kind: 'reals' };
	const minus = /^\\mathbb\{R\}\\setminus\\\{(.*)\\\}$/.exec(piece);
	if (minus !== null) return { kind: 'reals-minus', points: splitTop(minus[1], ';') };
	const finite = /^\\\{(.*)\\\}$/.exec(piece);
	if (finite !== null) return { kind: 'finite', elements: splitTop(finite[1], ';') };
	const interval = /^([[\]])(.*)([[\]])$/.exec(piece);
	if (interval !== null) {
		const bounds = splitTop(interval[2], ';');
		if (bounds.length !== 2) return null;
		return {
			kind: 'interval',
			open: interval[1],
			lower: bounds[0],
			upper: bounds[1],
			close: interval[3]
		};
	}
	return null;
}

/** Couper au séparateur hors de toute accolade ou parenthèse */
function splitTop(text: string, separator: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '{' || ch === '(') depth++;
		else if (ch === '}' || ch === ')') depth--;
		else if (depth === 0 && text.startsWith(separator, i)) {
			out.push(text.slice(start, i));
			start = i + separator.length;
			i += separator.length - 1;
		}
	}
	out.push(text.slice(start));
	return out.map((s) => s.trim()).filter((s) => s !== '');
}

function partExpressions(part: Part): string[] {
	switch (part.kind) {
		case 'empty':
		case 'reals':
			return [];
		case 'reals-minus':
			return [...part.points];
		case 'finite':
			return [...part.elements];
		case 'interval':
			return [part.lower, part.upper].filter((b) => !/\\infty/.test(b));
	}
}

function judgeSet(expected: SetAnswer, rendered: string): Verdict {
	const got = readSet(rendered);
	if (got === null || got.prefix !== expected.prefix)
		return { status: 'structure', rendu: rendered };
	if (got.parts.length !== expected.parts.length) return { status: 'valeur', rendu: rendered };
	let onlyForm = false;
	for (const [i, part] of expected.parts.entries()) {
		const verdict = comparePart(got.parts[i], part);
		if (verdict === 'valeur') return { status: 'valeur', rendu: rendered };
		if (verdict === 'forme') onlyForm = true;
	}
	return onlyForm ? { status: 'forme', rendu: rendered } : { status: 'juste' };
}

function comparePart(got: Part, expected: Part): 'juste' | 'forme' | 'valeur' {
	if (got.kind !== expected.kind) return 'valeur';
	if (got.kind === 'interval' && expected.kind === 'interval') {
		if (got.open !== expected.open || got.close !== expected.close) return 'valeur';
		return worst([
			compareBound(got.lower, expected.lower),
			compareBound(got.upper, expected.upper)
		]);
	}
	const a = partExpressions(got);
	const b = partExpressions(expected);
	if (a.length !== b.length) return 'valeur';
	const inOrder = worst(a.map((e, i) => compareExpressions(e, b[i])));
	// Les bons éléments dans le désordre (`\{1 ; -2\}`) : une affaire d'écriture
	return inOrder === 'valeur' && sameElements(a, b) ? 'forme' : inOrder;
}

/** Chaque élément rendu vaut un élément attendu distinct */
function sameElements(got: readonly string[], expected: readonly string[]): boolean {
	const left = [...expected];
	for (const element of got) {
		const index = left.findIndex((e) => compareExpressions(element, e) !== 'valeur');
		if (index === -1) return false;
		left.splice(index, 1);
	}
	return true;
}

function compareBound(got: string, expected: string): 'juste' | 'forme' | 'valeur' {
	if (/\\infty/.test(got) || /\\infty/.test(expected)) {
		return got.replace(/^\+/, '') === expected.replace(/^\+/, '') ? 'juste' : 'valeur';
	}
	return compareExpressions(got, expected);
}

function worst(verdicts: readonly ('juste' | 'forme' | 'valeur')[]): 'juste' | 'forme' | 'valeur' {
	if (verdicts.includes('valeur')) return 'valeur';
	return verdicts.includes('forme') ? 'forme' : 'juste';
}
