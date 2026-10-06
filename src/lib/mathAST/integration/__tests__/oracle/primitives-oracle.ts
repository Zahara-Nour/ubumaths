/**
 * Oracle numérique des PRIMITIVES : juge chaque entrée du corpus par la
 * VALEUR, jamais par la forme seule ni par le statut.
 *
 * Règles (voir le corpus pour les entrées) :
 * (a) F′ = f NUMÉRIQUEMENT : différence finie centrée de F comparée à f aux
 *     points de contrôle (ceux où f ou ses voisins ne sont pas définis sont
 *     écartés). Indépendant du moteur de dérivation : c'est l'arbitre.
 * (b) pas de résidu interdit dans l'écriture rendue (ln(e), `\euler`, C,
 *     `1·`, `+ -`, `- -`, `+ 0`, `^1`) ; un ln d'un négatif sans |·| se voit
 *     en (a) : F non définie là où f l'est.
 * (c) chemin latex : `toLatex(F)` relu par `parseLatex` vaut F à constante
 *     près (F(xᵢ) − F(x₀)). Chemin atelier : c'est le texte AFFICHÉ, relu par
 *     le parseur de l'atelier, qui est jugé en (a).
 * (d) intégrale définie : la valeur rendue = la valeur exacte attendue = une
 *     quadrature de Simpson composite fine.
 * (e) étapes (chemin latex, verbosité `detailed`) : une étape de règle de
 *     primitive (`power-rule`, `exp-rule`, `apply-parts-formula`…) qui change
 *     l'écriture doit vérifier after′ = before numériquement.
 * (f) FORME : l'écriture rendue est égale à l'une des écritures de classe à
 *     variations cosmétiques près — celles de `checkForm` (le comparateur de
 *     forme des réponses d'élèves : espaces, zéros, signes, facteur 1,
 *     parenthèses superflues, signe ×/·/implicite, ORDRE des termes et des
 *     facteurs). « + C » n'est jamais dans l'écriture comparée (le moteur ne
 *     le met pas dans F ; l'atelier l'ajoute en fin de ligne, il est ôté).
 *     Ce n'est PAS l'équivalence mathématique, déjà vérifiée par (a).
 */

import { parseLatex } from '$lib/mathAST/parser';
import { integrate, integrateDefinite } from '$lib/mathAST/integration';
import type { IntegrateStep } from '$lib/mathAST/integration';
import { toLatex } from '$lib/mathAST/latex-generator';
import { compile, type CompiledFn } from '$lib/mathAST/eval/compile';
import { findNodes, mapNode } from '$lib/mathAST/transforms';
import { isDivision, isVariable } from '$lib/mathAST/guards';
import { checkForm } from '$lib/mathAST/cosmetic-transforms';
import { parse as parseAtelierNotation } from '$lib/mathAST/cli/core/pipeline';
import { runInput, type CalcSession } from '$lib/atelier/calcul';
import type { MathNode } from '$lib/mathAST/types';
import {
	PARAMETER_SETS,
	DEFAULT_POINTS,
	type DefiniteCase,
	type PrimitiveCase
} from './primitives-corpus';

// =============================================================================
// Types
// =============================================================================

/** Verdict d'une entrée. */
export type Verdict =
	| { readonly status: 'juste'; readonly rendered: string; readonly formOk: boolean | null }
	| { readonly status: 'faux'; readonly rendered: string; readonly reason: string }
	| { readonly status: 'refus'; readonly reason: string }
	/** Corpus incohérent (forme attendue fausse, trop peu de points) : bug du TEST */
	| { readonly status: 'corpus'; readonly reason: string };

type Vars = Record<string, number>;

// =============================================================================
// Constantes
// =============================================================================

/** Tolérance relative de (a) */
const DERIVATIVE_TOLERANCE = 1e-5;

/** Tolérance relative de (d), quadrature comprise (√x en 0 converge lentement) */
const QUADRATURE_TOLERANCE = 1e-4;

/** Sous-intervalles de Simpson (pair) */
const SIMPSON_INTERVALS = 4000;

/** Règles d'étape qui produisent une primitive de leur `before` */
const PRIMITIVE_RULES: ReadonlySet<string> = new Set([
	'power-rule',
	'constant-rule',
	'constant-multiple',
	'exp-rule',
	'ln-rule',
	'sin-rule',
	'cos-rule',
	'tan-rule',
	'sec-squared-rule',
	'csc-squared-rule',
	'arctan-rule',
	'arcsin-rule',
	'apply-parts-formula',
	'linearity-sum',
	'linearity-opposite',
	'sum-rule',
	'integrate-partial'
]);

/** Résidus interdits dans l'écriture rendue (LaTeX ou texte de l'atelier) */
const RESIDUES: readonly (readonly [RegExp, string])[] = [
	[/\\ln\\left\(\s*e\s*\\right\)|\bln\(e\)|\\ln\s*e\b/, 'ln(e)'],
	[/euler/, '\\euler brut'],
	[/(^|[^A-Za-z\\])C($|[^A-Za-z])/, 'constante C dans F'],
	[/(^|[^0-9.])1\s*(\\cdot|\*|·|\\times)/, '1·'],
	[/\+\s*-/, '+ -'],
	[/-\s*-/, '- -'],
	[/\+\s*0(?![0-9.,])/, '+ 0'],
	[/\^\{?1\}?(?![0-9.])/, 'exposant 1'],
	// 5/3 rendu 16666666666666667/10000000000000000 : un flottant dans un résultat exact
	[/\d{12,}/, 'nombre à 12 chiffres ou plus (flottant)']
];

/** Nombre d'étapes réellement contrôlées par (e) — affiché par le rapport */
export const stepChecks = { count: 0 };

// =============================================================================
// Outils numériques
// =============================================================================

function compileSafe(node: MathNode): CompiledFn | null {
	try {
		return compile(node);
	} catch {
		return null;
	}
}

/** Une écriture du CORPUS compilée, ou null (bug du corpus) */
function compileLatex(latex: string): CompiledFn | null {
	try {
		return compile(parseLatex(latex));
	} catch {
		return null;
	}
}

function at(fn: CompiledFn, vars: Vars, variable: string, x: number): number {
	return fn({ ...vars, [variable]: x });
}

/** Les points où f et ses voisins immédiats sont définis */
function usablePoints(f: CompiledFn, vars: Vars, variable: string, points: readonly number[]) {
	return points.filter((x) => {
		const delta = 1e-3 * Math.max(1, Math.abs(x));
		return [x - delta, x, x + delta].every((p) => {
			const value = at(f, vars, variable, p);
			return Number.isFinite(value) && Math.abs(value) < 1e8;
		});
	});
}

/** (a) F′(x) = f(x) aux points ; rend le premier écart, ou null */
function derivativeMismatch(
	F: CompiledFn,
	f: CompiledFn,
	vars: Vars,
	variable: string,
	points: readonly number[]
): string | null {
	for (const x of points) {
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const expected = at(f, vars, variable, x);
		const Fx = at(F, vars, variable, x);
		if (!Number.isFinite(Fx))
			return `F non définie en ${variable} = ${x} (f y vaut ${round(expected)})`;
		const slope = (at(F, vars, variable, x + h) - at(F, vars, variable, x - h)) / (2 * h);
		if (Math.abs(slope - expected) > DERIVATIVE_TOLERANCE * Math.max(1, Math.abs(expected))) {
			return `F′(${x}) ≈ ${round(slope)} ≠ f(${x}) = ${round(expected)}`;
		}
	}
	return null;
}

/** (c) G = F à constante près */
function constantMismatch(
	F: CompiledFn,
	G: CompiledFn,
	vars: Vars,
	variable: string,
	points: readonly number[]
): string | null {
	const [x0, ...others] = points;
	for (const x of others) {
		const dF = at(F, vars, variable, x) - at(F, vars, variable, x0);
		const dG = at(G, vars, variable, x) - at(G, vars, variable, x0);
		if (!(Math.abs(dF - dG) <= 1e-7 * Math.max(1, Math.abs(dF)))) {
			return `affichage relu ≠ F : écart ${round(dG - dF)} entre ${x0} et ${x}`;
		}
	}
	return null;
}

function simpson(f: CompiledFn, vars: Vars, variable: string, a: number, b: number): number {
	const h = (b - a) / SIMPSON_INTERVALS;
	let sum = at(f, vars, variable, a) + at(f, vars, variable, b);
	for (let i = 1; i < SIMPSON_INTERVALS; i++) {
		sum += (i % 2 === 0 ? 2 : 4) * at(f, vars, variable, a + i * h);
	}
	return (sum * h) / 3;
}

function round(value: number): string {
	return Number.isFinite(value) ? String(Number(value.toPrecision(6))) : String(value);
}

/** Les jeux de paramètres ; x vaut 1.3 quand il est un paramètre (`x t^2 ; t`) */
function parameterSets(literal: boolean): readonly Vars[] {
	return (literal ? PARAMETER_SETS : [PARAMETER_SETS[0]]).map((set) => ({ x: 1.3, ...set }));
}

/**
 * L'atelier écrit `{1/3}x^3` : relu, c'est une division « en ligne ». Le style
 * d'affichage d'une division n'est pas une forme : on la remet en fraction.
 */
function asFractions(node: MathNode): MathNode {
	return mapNode(node, (n) => (isDivision(n) ? { ...n, displayStyle: 'fraction' } : n));
}

/** Les noms de variables libres d'un arbre, hors paramètres et e */
function freeVariables(node: MathNode): Set<string> {
	const names = new Set(findNodes(node, isVariable).map((v) => v.name));
	names.delete('e');
	for (const name of Object.keys(PARAMETER_SETS[0])) names.delete(name);
	return names;
}

// =============================================================================
// (b) et (f)
// =============================================================================

function residuesOf(text: string): string[] {
	return RESIDUES.filter(([pattern]) => pattern.test(text)).map(([, name]) => name);
}

/** (f) : l'écriture rendue a-t-elle la forme d'une écriture de classe ? */
function sameFormAsOneOf(renderedLatex: string, expected: readonly string[]): boolean {
	return expected.some((form) => checkForm(renderedLatex, form, {}).status !== 'bad_form');
}

/** Une forme attendue fausse est un bug du corpus, pas du moteur */
function wrongExpectedForm(c: PrimitiveCase, f: CompiledFn): string | null {
	for (const form of c.expected) {
		const G = compileLatex(form);
		if (G === null) return `forme attendue non compilable : ${form}`;
		for (const vars of parameterSets(c.literal)) {
			const points = usablePoints(f, vars, c.variable, c.points);
			const mismatch = derivativeMismatch(G, f, vars, c.variable, points);
			if (mismatch !== null) return `forme attendue fausse « ${form} » : ${mismatch}`;
		}
	}
	return null;
}

// =============================================================================
// (e) Étapes
// =============================================================================

function stepMismatch(steps: readonly IntegrateStep[], vars: Vars): string | null {
	for (const step of steps) {
		if (!PRIMITIVE_RULES.has(step.rule)) continue;
		if (toLatex(step.before) === toLatex(step.after)) continue;
		const names = new Set([...freeVariables(step.before), ...freeVariables(step.after)]);
		if (names.size !== 1) continue;
		const [variable] = names;
		const before = compileSafe(step.before);
		const after = compileSafe(step.after);
		if (before === null || after === null) continue;
		const points = usablePoints(before, vars, variable, DEFAULT_POINTS);
		stepChecks.count++;
		const mismatch = derivativeMismatch(after, before, vars, variable, points);
		if (mismatch !== null) {
			return `étape ${step.rule} « ${toLatex(step.before)} → ${toLatex(step.after)} » : ${mismatch}`;
		}
	}
	return null;
}

// =============================================================================
// Primitives
// =============================================================================

/** Ce que rend un chemin : l'arbre de F (relu de l'affichage pour l'atelier) */
type Produced =
	| {
			readonly ok: true;
			readonly F: MathNode;
			readonly shown: string;
			readonly displayCheck: MathNode | null;
			readonly steps: readonly IntegrateStep[];
	  }
	| { readonly ok: false; readonly verdict: Verdict };

function produceLatex(c: PrimitiveCase): Produced {
	let integrand: MathNode;
	try {
		integrand = parseLatex(c.input);
	} catch (error) {
		return { ok: false, verdict: { status: 'refus', reason: `parseLatex : ${String(error)}` } };
	}
	try {
		const result = integrate(integrand, { variable: c.variable, verbosity: 'detailed' });
		if (result.status !== 'exact' || result.antiderivative === null) {
			return { ok: false, verdict: { status: 'refus', reason: `statut ${result.status}` } };
		}
		const shown = toLatex(result.antiderivative);
		let displayCheck: MathNode | null;
		try {
			displayCheck = parseLatex(shown);
		} catch {
			displayCheck = null;
		}
		return { ok: true, F: result.antiderivative, shown, displayCheck, steps: result.steps };
	} catch (error) {
		return { ok: false, verdict: { status: 'refus', reason: `exception : ${String(error)}` } };
	}
}

/** `∫ x^2 dx = {1/3}x^3 + C` → `{1/3}x^3` */
function produceAtelier(c: PrimitiveCase, session: CalcSession): Produced {
	const outcome = runInput(session, `.intégrer ${c.input}`);
	if (outcome.kind === 'refus') {
		return { ok: false, verdict: { status: 'refus', reason: outcome.message } };
	}
	if (outcome.kind !== 'commande') {
		return { ok: false, verdict: { status: 'refus', reason: `ligne ${outcome.kind}` } };
	}
	const firstLine = outcome.output.split('\n')[0];
	if (firstLine.includes('Non résolu')) {
		return { ok: false, verdict: { status: 'refus', reason: firstLine } };
	}
	const match = /^∫ .* d([A-Za-z]+) = (.*?)(?: \+ C)?$/.exec(firstLine);
	if (match === null) {
		return {
			ok: false,
			verdict: { status: 'faux', rendered: firstLine, reason: 'sortie sans primitive lisible' }
		};
	}
	if (match[1] !== c.variable) {
		return {
			ok: false,
			verdict: { status: 'faux', rendered: firstLine, reason: `intégré en ${match[1]}` }
		};
	}
	const parsed = parseAtelierNotation(match[2]);
	if (parsed.ast === undefined || parsed.errors.length > 0) {
		return {
			ok: false,
			verdict: { status: 'faux', rendered: match[2], reason: 'affichage illisible par le parseur' }
		};
	}
	return { ok: true, F: parsed.ast, shown: match[2], displayCheck: null, steps: [] };
}

export function judgePrimitive(c: PrimitiveCase, session: CalcSession): Verdict {
	const f = compileLatex(c.f);
	if (f === null) return { status: 'corpus', reason: `f non compilable : ${c.f}` };
	const corpusError = wrongExpectedForm(c, f);
	if (corpusError !== null) return { status: 'corpus', reason: corpusError };

	const produced = c.path === 'latex' ? produceLatex(c) : produceAtelier(c, session);
	if (!produced.ok) return produced.verdict;
	const { F: tree, shown, displayCheck, steps } = produced;
	const rendered = c.path === 'latex' ? shown : toLatex(asFractions(tree));
	const fail = (reason: string): Verdict => ({ status: 'faux', rendered: shown, reason });

	const F = compileSafe(tree);
	if (F === null) return fail('F non compilable');
	const G = displayCheck === null ? null : compileSafe(displayCheck);
	if (c.path === 'latex' && G === null) return fail('LaTeX rendu illisible par parseLatex');

	for (const [index, vars] of parameterSets(c.literal).entries()) {
		const points = usablePoints(f, vars, c.variable, c.points);
		if (points.length < 3) return { status: 'corpus', reason: `moins de 3 points (jeu ${index})` };
		const label = c.literal ? ` (jeu ${index + 1})` : '';
		const mismatch = derivativeMismatch(F, f, vars, c.variable, points);
		if (mismatch !== null) return fail(`(a) ${mismatch}${label}`);
		if (G !== null) {
			const display = constantMismatch(F, G, vars, c.variable, points);
			if (display !== null) return fail(`(c) ${display}${label}`);
		}
		const step = stepMismatch(steps, vars);
		if (step !== null) return fail(`(e) ${step}${label}`);
	}

	const residues = residuesOf(shown);
	if (residues.length > 0) return fail(`(b) résidu : ${residues.join(', ')}`);

	const formOk = c.expected.length === 0 ? null : sameFormAsOneOf(rendered, c.expected);
	return { status: 'juste', rendered, formOk };
}

// =============================================================================
// Intégrales définies
// =============================================================================

function produceDefiniteLatex(c: DefiniteCase): { node: MathNode; approximate: boolean } | Verdict {
	try {
		const result = integrateDefinite(
			parseLatex(c.input),
			parseLatex(c.lower),
			parseLatex(c.upper),
			{
				variable: c.variable
			}
		);
		if (result.value === null) {
			return {
				status: 'refus',
				reason: `statut ${result.status} sans valeur ${result.error ?? ''}`
			};
		}
		return { node: result.value, approximate: result.status !== 'exact' };
	} catch (error) {
		return { status: 'refus', reason: `exception : ${String(error)}` };
	}
}

function produceDefiniteAtelier(
	c: DefiniteCase,
	session: CalcSession
): { node: MathNode; approximate: boolean } | Verdict {
	const outcome = runInput(session, `.intégrer ${c.input}`);
	if (outcome.kind === 'refus') return { status: 'refus', reason: outcome.message };
	if (outcome.kind !== 'commande') return { status: 'refus', reason: `ligne ${outcome.kind}` };
	const firstLine = outcome.output.split('\n')[0];
	if (firstLine.includes('Non résolu')) return { status: 'refus', reason: firstLine };
	const match = /^∫\[[^\]]*\] .* d[A-Za-z]+ (=|≈) (.*?)(?: \(numérique\))?$/.exec(firstLine);
	if (match === null) {
		return {
			status: 'faux',
			rendered: firstLine,
			reason: 'pas une intégrale définie (bornes non lues)'
		};
	}
	const parsed = parseAtelierNotation(match[2]);
	if (parsed.ast === undefined || parsed.errors.length > 0) {
		return { status: 'faux', rendered: match[2], reason: 'valeur illisible' };
	}
	return { node: parsed.ast, approximate: match[1] === '≈' };
}

export function judgeDefinite(c: DefiniteCase, session: CalcSession): Verdict {
	const f = compileLatex(c.f);
	const exact = compileLatex(c.exact);
	const lower = compileLatex(c.lower);
	const upper = compileLatex(c.upper);
	if (f === null || exact === null || lower === null || upper === null) {
		return { status: 'corpus', reason: 'entrée non compilable' };
	}
	const produced =
		c.path === 'latex' ? produceDefiniteLatex(c) : produceDefiniteAtelier(c, session);
	if ('status' in produced) return produced;
	const shown = toLatex(produced.node);
	const value = compileSafe(produced.node);
	if (value === null) return { status: 'faux', rendered: shown, reason: 'valeur non compilable' };

	for (const [index, vars] of parameterSets(c.literal).entries()) {
		const label = c.literal ? ` (jeu ${index + 1})` : '';
		const a = lower(vars);
		const b = upper(vars);
		const quadrature = simpson(f, vars, c.variable, a, b);
		const expected = exact(vars);
		const scale = Math.max(1, Math.abs(quadrature));
		if (Math.abs(expected - quadrature) > QUADRATURE_TOLERANCE * scale) {
			return { status: 'corpus', reason: `valeur exacte du corpus ≠ Simpson${label}` };
		}
		const got = value(vars);
		if (!(Math.abs(got - expected) <= QUADRATURE_TOLERANCE * scale)) {
			return {
				status: 'faux',
				rendered: shown,
				reason: `(d) ${round(got)} ≠ ${round(expected)} (Simpson ${round(quadrature)})${label}`
			};
		}
	}
	// Une approximation numérique DÉCLARÉE (statut `approximate`) a ses décimales
	const residues = produced.approximate ? [] : residuesOf(shown);
	if (residues.length > 0) {
		return { status: 'faux', rendered: shown, reason: `(b) résidu : ${residues.join(', ')}` };
	}
	// Valeur seulement numérique : juste, mais pas sous forme exacte (écart de forme)
	return { status: 'juste', rendered: shown, formOk: produced.approximate ? false : null };
}
