/**
 * Oracle numérique des dérivées — test PERMANENT (décision de David, 2026-10-06)
 *
 * Des dérivées fausses ont été vues à l'écran par David et pas par les tests
 * (`3·3x²`, `(e^u)'` avec ln(e), `\sin^2 x` dont la puissance était ignorée,
 * `f(2x)` lu comme un produit) : les tests assertaient la FORME, ou passaient
 * par un autre chemin que l'élève. Ici, chaque entrée du corpus
 * (`derivatives-corpus.ts`) est saisie comme un élève, par chaque chemin réel :
 *
 * | chemin         | ce que fait l'élève                                         |
 * | -------------- | ----------------------------------------------------------- |
 * | `latex-moteur` | rien de visible : `parseLatex` puis `differentiate` (brut)  |
 * | `latex-péda`   | correction d'une question : étapes + `withTidyStep`         |
 * | `étapes`       | chaque étape (et sous-étape) de `pedagogical-differentiation` |
 * | `commande`     | atelier, vue Calcul : `.dériver …` (`runInput`)             |
 * | `bouton`       | atelier, bouton « Dériver » sur `f` (`runAction`)           |
 * | `carte`        | atelier, carte `f′` (`createDerivative`, rendu d'`ObjectCard`) |
 *
 * Règles :
 * - (a) VALEUR : la dérivée coïncide avec la différence finie centrée (5 points)
 *   de la référence JavaScript `f`, en chaque point du domaine, pour chaque jeu
 *   de paramètres ;
 * - (b) RÉSIDUS : le LaTeX rendu ne contient ni ln(e), ni `\euler`, ni `1·`,
 *   ni `+ -`, ni `- -`, ni nombres juxtaposés (`3 3 x^2`), ni notation de terminal ;
 * - (c) AFFICHÉ = CALCULÉ : c'est le LaTeX AFFICHÉ, relu par `parseLatex`, qui
 *   est évalué (calculé juste ≠ affiché juste) ;
 * - (d) ÉTAPES : chaque étape `before → after` vérifie `after ≈ (before)′` ;
 * - (f) FORME : la forme rendue est celle qu'on écrit en classe (`expected`), à
 *   des variations d'écriture triviales près — voir `sameForm`.
 *
 * « Non supporté / refus » n'est pas un échec : c'est compté (couverture).
 * Les écarts connus sont listés dans `derivatives-known.ts` : le test échoue si
 * une entrée listée devient juste (la retirer) ou si une nouvelle devient fausse.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { MathNode } from '$lib/mathAST/types';
import { parseLatex } from '$lib/mathAST/parser';
import { differentiate } from '$lib/mathAST/differentiation';
import {
	generatePedagogicalDifferentiationSteps,
	withTidyStep,
	type PedagogicalDifferentiationStep
} from '$lib/mathAST/pedagogical-differentiation';
import { toLatex } from '$lib/mathAST/latex-generator';
import { compile, type CompiledFn } from '$lib/mathAST/eval';
import { checkForm } from '$lib/mathAST/cosmetic-transforms';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '$lib/atelier/calcul';
import { derivativeAstOf } from '$lib/atelier/engine';
import {
	CORPUS,
	PARAM_SETS,
	POINTS_R,
	type DerivativeCase,
	type Family,
	type Params
} from './derivatives-corpus';
import { KNOWN_WRONG, KNOWN_RESIDUE, KNOWN_FORM_DIFF } from './derivatives-known';

// =============================================================================
// Types
// =============================================================================

type Path = 'latex-moteur' | 'latex-péda' | 'étapes' | 'commande' | 'bouton' | 'carte';

/** Ce qu'un chemin a fait d'une entrée. */
interface Verdict {
	readonly status: 'absent' | 'refus' | 'ok' | 'faux';
	/** Pour `faux` : où, attendu numérique, obtenu. */
	readonly detail?: string;
	/** Règle (b) : les résidus interdits trouvés dans le LaTeX rendu. */
	readonly residues: readonly string[];
	/** Règle (f) : le LaTeX rendu quand sa forme diffère de `expected`. */
	readonly formDiff?: string;
}

/** Une réponse à évaluer : l'arbre, et le LaTeX montré à l'élève. */
interface Answer {
	readonly node: MathNode;
	readonly latex: string;
}

// =============================================================================
// Constantes
// =============================================================================

const PATHS: readonly Path[] = [
	'latex-moteur',
	'latex-péda',
	'étapes',
	'commande',
	'bouton',
	'carte'
];

/** Chemins dont la réponse s'affiche telle quelle : règles (b) et (f). */
const SHOWN_PATHS: ReadonlySet<Path> = new Set(['latex-péda', 'commande', 'bouton', 'carte']);

/** Tolérance relative de la règle (a). */
const TOLERANCE = 1e-6;

/** Au-delà, la valeur est trop proche d'un pôle pour être comparée. */
const HUGE = 1e8;

/** Nombre minimal de points comparables par jeu de paramètres. */
const MIN_POINTS = 3;

/**
 * Règle (b) — chaque résidu interdit, cherché dans le LaTeX RENDU.
 *
 * ⚠️ `\right` et `\end` sont exclus du « coefficient 1 » : `+ 1 \right)` est
 * une parenthèse fermée après 1, pas un `1·`.
 */
const RESIDUES: readonly { readonly name: string; readonly pattern: RegExp }[] = [
	{ name: 'ln(e)', pattern: /\\ln\s*(?:\\left\(\s*)?(?:\\exponentialE|\\euler|e)(?![a-zA-Z])/ },
	{ name: '\\euler brut', pattern: /\\euler/ },
	{ name: '1·', pattern: /(?<![\d.])1\s*\\(?:cdot|times)/ },
	{ name: '·1', pattern: /\\(?:cdot|times)\s*1(?![\d.])/ },
	{ name: 'coefficient 1', pattern: /(?<![\d.{^_\w])1\s+(?=[a-zA-Z(]|\\(?!right|end|\\))/ },
	{ name: '+ -', pattern: /\+\s*-/ },
	{ name: '- -', pattern: /-\s*-/ },
	{ name: 'nombres juxtaposés', pattern: /(?<![\d.\\a-zA-Z^_{])\d+(?:\.\d+)?\s+\d/ },
	{ name: 'notation de terminal', pattern: /d\/dx|:\// }
];

// =============================================================================
// Outils numériques
// =============================================================================

/** L'environnement d'évaluation : la variable, les paramètres, ω et φ tapés en Unicode. */
function envOf(variable: string, value: number, params: Params): Record<string, number> {
	const env: Record<string, number> = { ...params, [variable]: value };
	if (params.omega !== undefined) env['ω'] = params.omega;
	if (params.phi !== undefined) env['φ'] = params.phi;
	return env;
}

/** La dérivée numérique (différence centrée à 5 points) — `NaN` si une valeur manque. */
function numericDerivative(g: (x: number) => number, x: number): number {
	const h = 1e-4 * Math.max(1, Math.abs(x));
	const values = [g(x - 2 * h), g(x - h), g(x + h), g(x + 2 * h)];
	if (values.some((v) => !Number.isFinite(v) || Math.abs(v) > HUGE)) return Number.NaN;
	const [m2, m1, p1, p2] = values;
	return (m2 - 8 * m1 + 8 * p1 - p2) / (12 * h);
}

function close(got: number, expected: number): boolean {
	return Math.abs(got - expected) <= TOLERANCE * Math.max(1, Math.abs(expected));
}

function compileSafe(node: MathNode): CompiledFn | string {
	try {
		return compile(node);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

function fmt(n: number): string {
	return Number.isFinite(n) ? Number(n.toPrecision(8)).toString() : String(n);
}

function paramsText(params: Params, names: readonly string[] | undefined): string {
	if (names === undefined || names.length === 0) return '';
	return ` [${names.map((n) => `${n}=${params[n]}`).join(', ')}]`;
}

/**
 * Règle (a) : `null` si la réponse est juste en tout point comparable, sinon
 * la première discordance (point, attendu, obtenu).
 *
 * ⚠️ Lève si le CORPUS est mal choisi (moins de `MIN_POINTS` comparables) :
 * c'est une erreur de données, pas un verdict sur le moteur.
 */
function checkValue(entry: DerivativeCase, node: MathNode, params: Params): string | null {
	const variable = entry.variable ?? 'x';
	const compiled = compileSafe(node);
	if (typeof compiled === 'string') return `non évaluable (${compiled})`;
	let compared = 0;
	for (const x of entry.points ?? POINTS_R) {
		const expected = numericDerivative((v) => entry.f(v, params), x);
		if (!Number.isFinite(expected) || Math.abs(expected) > HUGE) continue;
		compared++;
		const got = compiled(envOf(variable, x, params));
		if (!close(got, expected)) {
			return `${variable}=${x}${paramsText(params, entry.params)} : attendu ${fmt(expected)}, obtenu ${fmt(got)}`;
		}
	}
	if (compared < MIN_POINTS) {
		throw new Error(`Corpus : « ${entry.id} » n'a que ${compared} point(s) comparable(s)`);
	}
	return null;
}

/** Règle (a) sur tous les jeux de paramètres de l'entrée. */
function checkAllSets(entry: DerivativeCase, node: MathNode): string | null {
	for (const params of setsOf(entry)) {
		const failure = checkValue(entry, node, params);
		if (failure !== null) return failure;
	}
	return null;
}

function setsOf(entry: DerivativeCase): readonly Params[] {
	if (entry.params === undefined) return [{}];
	return entry.paramSets ?? PARAM_SETS;
}

// =============================================================================
// Règles (b), (c), (f)
// =============================================================================

function residuesOf(latex: string): string[] {
	return RESIDUES.filter(({ pattern }) => pattern.test(latex)).map(({ name }) => name);
}

/**
 * Règle (f) — l'équivalence de FORME (pas l'équivalence mathématique, déjà
 * vérifiée par la règle (a)).
 *
 * C'est celle qui note les élèves : `checkForm` de `cosmetic-transforms.ts`,
 * toutes contraintes en `warn`. Elle retire les espaces, les zéros inutiles,
 * les facteurs 1 et termes nuls, place les signes (`\frac{-1}{x^2}` =
 * `-\frac{1}{x^2}`), retire les parenthèses superflues et le signe × implicite,
 * puis TRIE termes et facteurs (`2\cos x\sin x` = `2\sin x\cos x`). `\dfrac`
 * et `\frac`, `\exponentialE` et `e` se valent. Ne se valent PAS : `x^{-1}` et
 * `\frac{1}{x}`, `3 3 x^2` et `9x^2`, un numérateur non développé.
 *
 * Les résidus que ces transformations effacent (`1·`) sont attrapés à part,
 * par la règle (b).
 */
function sameForm(rendered: string, expected: string): boolean {
	return checkForm(rendered, expected, {}).valid;
}

/**
 * Règle (c) : le LaTeX AFFICHÉ, relu par le parseur des questions, puis
 * évalué. Un affichage illisible est une erreur.
 */
function displayed(latex: string): MathNode | string {
	try {
		return parseLatex(latex);
	} catch (error) {
		return `affiché illisible : ${latex} (${error instanceof Error ? error.message : String(error)})`;
	}
}

/** Le verdict d'une réponse symbolique (les paramètres restent des lettres). */
function judge(entry: DerivativeCase, path: Path, answer: Answer, formChecked: boolean): Verdict {
	const residues = SHOWN_PATHS.has(path) ? residuesOf(answer.latex) : [];
	// Calculé, puis affiché
	const computed = checkAllSets(entry, answer.node);
	if (computed !== null)
		return { status: 'faux', detail: `« ${answer.latex} » — ${computed}`, residues };
	if (SHOWN_PATHS.has(path)) {
		const reread = displayed(answer.latex);
		if (typeof reread === 'string') return { status: 'faux', detail: reread, residues };
		const shown = checkAllSets(entry, reread);
		if (shown !== null) {
			return { status: 'faux', detail: `affiché « ${answer.latex} » — ${shown}`, residues };
		}
	}
	const formDiff =
		formChecked && entry.expected !== undefined && !sameForm(answer.latex, entry.expected)
			? answer.latex
			: undefined;
	return { status: 'ok', residues, ...(formDiff !== undefined && { formDiff }) };
}

// =============================================================================
// Les chemins
// =============================================================================

const ABSENT: Verdict = { status: 'absent', residues: [] };
const REFUS: Verdict = { status: 'refus', residues: [] };

function latexAst(entry: DerivativeCase): MathNode | null {
	if (entry.latex === undefined) return null;
	try {
		return parseLatex(entry.latex);
	} catch {
		return null;
	}
}

function engineLatex(entry: DerivativeCase): Verdict {
	if (entry.latex === undefined) return ABSENT;
	const ast = latexAst(entry);
	if (ast === null) return REFUS;
	let derivative: MathNode;
	try {
		derivative = differentiate(ast, { variable: entry.variable ?? 'x' });
	} catch {
		return REFUS;
	}
	return judge(entry, 'latex-moteur', { node: derivative, latex: toLatex(derivative) }, false);
}

function pedagogicalSteps(
	ast: MathNode,
	variable: string
): {
	readonly derivative: MathNode;
	readonly steps: readonly PedagogicalDifferentiationStep[];
} | null {
	try {
		const result = generatePedagogicalDifferentiationSteps(ast, {
			variable,
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		return result.steps.length === 0 ? null : result;
	} catch {
		return null;
	}
}

function pedagogicalLatex(entry: DerivativeCase): Verdict {
	if (entry.latex === undefined) return ABSENT;
	const ast = latexAst(entry);
	if (ast === null) return REFUS;
	const result = pedagogicalSteps(ast, entry.variable ?? 'x');
	if (result === null) return REFUS;
	// La réponse de la correction : la dérivée MISE AU PROPRE, comme `deriveSteps`
	const tidied = withTidyStep([], result.derivative);
	return judge(
		entry,
		'latex-péda',
		{ node: tidied.derivative, latex: tidied.derivativeLatex },
		true
	);
}

/**
 * Règle (d) : chaque étape `before → after` vérifie `after ≈ (before)′`,
 * sous-étapes comprises. Une étape fausse est une erreur, même si la réponse
 * finale est juste.
 */
function stepsVerdict(entry: DerivativeCase): Verdict {
	const ast = latexAst(entry);
	if (ast === null) return entry.latex === undefined ? ABSENT : REFUS;
	const variable = entry.variable ?? 'x';
	const result = pedagogicalSteps(ast, variable);
	if (result === null) return REFUS;

	const residues = new Set<string>();
	const failures: string[] = [];
	const visit = (step: PedagogicalDifferentiationStep): void => {
		const afterLatex = toLatex(step.after);
		for (const residue of residuesOf(afterLatex)) residues.add(residue);
		const failure = checkStep(entry, step, variable);
		if (failure !== null)
			failures.push(`${step.rule} : (${toLatex(step.before)})′ → ${afterLatex} — ${failure}`);
		for (const sub of step.subSteps ?? []) visit(sub);
	};
	for (const step of result.steps) visit(step);

	// La DERNIÈRE ligne porte sur toute la fonction : elle doit valoir f′
	const last = result.steps.at(-1);
	if (last !== undefined && failures.length === 0) {
		const whole = checkAllSets(entry, last.after);
		const coversAll = toLatex(last.before) === toLatex(ast);
		if (coversAll && whole !== null) failures.push(`dernière ligne — ${whole}`);
	}

	return failures.length > 0
		? { status: 'faux', detail: failures[0], residues: [...residues] }
		: { status: 'ok', residues: [...residues] };
}

function checkStep(
	entry: DerivativeCase,
	step: PedagogicalDifferentiationStep,
	variable: string
): string | null {
	const before = compileSafe(step.before);
	const after = compileSafe(step.after);
	if (typeof before === 'string') return null; // rien à dériver numériquement
	if (typeof after === 'string') return `non évaluable (${after})`;
	for (const params of setsOf(entry)) {
		for (const x of entry.points ?? POINTS_R) {
			const expected = numericDerivative((v) => before(envOf(variable, v, params)), x);
			if (!Number.isFinite(expected) || Math.abs(expected) > HUGE) continue;
			const got = after(envOf(variable, x, params));
			if (!close(got, expected)) {
				return `${variable}=${x}${paramsText(params, entry.params)} : attendu ${fmt(expected)}, obtenu ${fmt(got)}`;
			}
		}
	}
	return null;
}

function newSession(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Taper les lignes de décor ; `false` si l'une est refusée. */
function typeLines(session: CalcSession, lines: readonly string[]): boolean {
	return lines.every((line) => runInput(session, line).kind === 'definition');
}

/** Les définitions des paramètres, tapées comme un élève (`a = 3`). */
function parameterLines(entry: DerivativeCase, params: Params): string[] {
	return (entry.params ?? []).map((name) => {
		const typed = name === 'omega' ? 'ω' : name === 'phi' ? 'φ' : name;
		return `${typed} = ${params[name]}`;
	});
}

/** `.dériver …` : les paramètres restent des LETTRES (symbolique). */
function command(entry: DerivativeCase): Verdict {
	if (entry.custom === undefined) return ABSENT;
	const session = newSession();
	if (!typeLines(session, entry.setup ?? [])) return REFUS;
	const suffix = entry.variable === undefined ? '' : ` ; ${entry.variable}`;
	const result = runInput(session, `.dériver ${entry.custom}${suffix}`);
	if (result.kind !== 'commande' || result.latex === undefined) return REFUS;
	const reread = displayed(result.latex);
	if (typeof reread === 'string') {
		return { status: 'faux', detail: reread, residues: residuesOf(result.latex) };
	}
	return judge(entry, 'commande', { node: reread, latex: result.latex }, true);
}

/**
 * Le bouton « Dériver » et la carte `f′` : la fonction est DÉFINIE dans
 * l'atelier, ses paramètres aussi (`a = 3`) — un jeu de valeurs par session.
 */
function definedPaths(entry: DerivativeCase): {
	readonly bouton: Verdict;
	readonly carte: Verdict;
} {
	if (entry.custom === undefined || entry.variable !== undefined) {
		return { bouton: ABSENT, carte: ABSENT };
	}
	let bouton: Verdict = { status: 'ok', residues: [] };
	let carte: Verdict = { status: 'ok', residues: [] };
	// Sans paramètre, la réponse est la forme finale : (f) s'applique
	const formChecked = entry.params === undefined;
	for (const params of setsOf(entry)) {
		const session = newSession();
		const lines = [
			...(entry.setup ?? []),
			...parameterLines(entry, params),
			`f(x) = ${entry.custom}`
		];
		if (!typeLines(session, lines)) return { bouton: REFUS, carte: REFUS };
		const single: DerivativeCase = { ...entry, paramSets: [params] };

		if (bouton.status === 'ok') {
			const outcome = runAction(session, 'derive', 'f');
			const latex = outcome.ok ? outcome.latex?.replace(/^f'\(x\)\s*=\s*/, '') : undefined;
			bouton =
				latex === undefined ? REFUS : judgeTyped(single, 'bouton', latex, formChecked, bouton);
		}
		if (carte.status === 'ok') {
			const created = session.atelier.createDerivative('f');
			const derived = created.ok ? derivativeAstOf(session.atelier, "f'") : null;
			// Exactement le rendu d'`ObjectCard` : l'arbre de `derivativeAstOf`, régénéré par `toLatex`
			const ast = derived?.ok === true ? derived.ast : null;
			carte = ast === null ? REFUS : judgeTyped(single, 'carte', toLatex(ast), formChecked, carte);
		}
	}
	return { bouton, carte };
}

/** Le verdict d'un LaTeX affiché ; garde les résidus et l'écart de forme déjà vus. */
function judgeTyped(
	entry: DerivativeCase,
	path: Path,
	latex: string,
	formChecked: boolean,
	previous: Verdict
): Verdict {
	const reread = displayed(latex);
	if (typeof reread === 'string')
		return { status: 'faux', detail: reread, residues: residuesOf(latex) };
	const verdict = judge(entry, path, { node: reread, latex }, formChecked);
	const residues = [...new Set([...previous.residues, ...verdict.residues])];
	const formDiff = verdict.formDiff ?? previous.formDiff;
	return { ...verdict, residues, ...(formDiff !== undefined && { formDiff }) };
}

// =============================================================================
// Le tableau des verdicts
// =============================================================================

const verdicts = new Map<string, Verdict>();
const keyOf = (id: string, path: Path): string => `${id} @ ${path}`;

function computeAll(): void {
	for (const entry of CORPUS) {
		const defined = definedPaths(entry);
		const byPath: Record<Path, Verdict> = {
			'latex-moteur': engineLatex(entry),
			'latex-péda': pedagogicalLatex(entry),
			étapes: stepsVerdict(entry),
			commande: command(entry),
			bouton: defined.bouton,
			carte: defined.carte
		};
		for (const path of PATHS) verdicts.set(keyOf(entry.id, path), byPath[path]);
	}
}

/** Les clés d'une famille qui vérifient `keep`, avec leur description. */
function collect(family: Family, keep: (v: Verdict) => string | null): Record<string, string> {
	const found: Record<string, string> = {};
	for (const entry of CORPUS) {
		if (entry.family !== family) continue;
		for (const path of PATHS) {
			const key = keyOf(entry.id, path);
			const verdict = verdicts.get(key);
			const description = verdict === undefined ? null : keep(verdict);
			if (description !== null) found[key] = description;
		}
	}
	return found;
}

function knownFor(known: Readonly<Record<string, string>>, family: Family): Record<string, string> {
	const ids = new Set(CORPUS.filter((e) => e.family === family).map((e) => e.id));
	return Object.fromEntries(Object.entries(known).filter(([key]) => ids.has(key.split(' @ ')[0])));
}

/** Compare les CLÉS seulement : la description est une aide à la lecture. */
function keysOf(record: Readonly<Record<string, string>>): string[] {
	return Object.keys(record).sort();
}

// =============================================================================
// Tests
// =============================================================================

const FAMILIES: readonly Family[] = [...new Set(CORPUS.map((e) => e.family))];

describe('oracle numérique des dérivées', () => {
	beforeAll(() => {
		computeAll();
	});

	it('le corpus a des identifiants uniques', () => {
		const ids = CORPUS.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(CORPUS.length).toBeGreaterThanOrEqual(300);
	});

	it('les listes KNOWN_* ne citent que des entrées du corpus', () => {
		const ids = new Set(CORPUS.map((e) => e.id));
		const keys = [...keysOf(KNOWN_WRONG), ...keysOf(KNOWN_RESIDUE), ...keysOf(KNOWN_FORM_DIFF)];
		expect(keys.filter((key) => !ids.has(key.split(' @ ')[0]))).toEqual([]);
	});

	describe.each(FAMILIES)('%s', (family) => {
		it('(a)(c)(d) valeur : seules les entrées de KNOWN_WRONG sont fausses', () => {
			const wrong = collect(family, (v) => (v.status === 'faux' ? (v.detail ?? '') : null));
			expect(keysOf(wrong)).toEqual(keysOf(knownFor(KNOWN_WRONG, family)));
		});

		it('(b) résidus : seules les entrées de KNOWN_RESIDUE en ont', () => {
			const found = collect(family, (v) => (v.residues.length > 0 ? v.residues.join(', ') : null));
			expect(keysOf(found)).toEqual(keysOf(knownFor(KNOWN_RESIDUE, family)));
		});

		it('(f) forme : seules les entrées de KNOWN_FORM_DIFF s’écartent de la forme de classe', () => {
			const found = collect(family, (v) => v.formDiff ?? null);
			expect(keysOf(found)).toEqual(keysOf(knownFor(KNOWN_FORM_DIFF, family)));
		});
	});

	afterAll(() => {
		// La couverture : ce que chaque chemin a su traiter
		const lines = PATHS.map((path) => {
			const all = CORPUS.map((e) => verdicts.get(keyOf(e.id, path))).filter(
				(v): v is Verdict => v !== undefined && v.status !== 'absent'
			);
			const count = (s: Verdict['status']) => all.filter((v) => v.status === s).length;
			const treated = all.length - count('refus');
			return `${path.padEnd(13)} ${treated}/${all.length} traitées (${count('faux')} fausses, ${count('refus')} refus)`;
		});
		if (process.env.ORACLE_DUMP === '1') {
			const dump = (title: string, keep: (v: Verdict) => string | null): void => {
				process.stdout.write(`\n=== ${title}\n`);
				for (const [key, v] of verdicts) {
					const d = keep(v);
					if (d !== null) process.stdout.write(`\t${JSON.stringify(key)}: ${JSON.stringify(d)},\n`);
				}
			};
			dump('WRONG', (v) => (v.status === 'faux' ? (v.detail ?? '') : null));
			dump('RESIDUE', (v) => (v.residues.length > 0 ? v.residues.join(', ') : null));
			dump('FORM', (v) => v.formDiff ?? null);
			dump('REFUS', (v) => (v.status === 'refus' ? 'refus' : null));
		}
		// `process.stdout` : la couverture s'affiche même quand tout est vert
		process.stdout.write(
			`Couverture de l'oracle des dérivées (${CORPUS.length} entrées)\n${lines.join('\n')}\n`
		);
	});
});
