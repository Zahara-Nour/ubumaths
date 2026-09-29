/**
 * Stratégies de calcul réfléchi de la vague 1 (générées)
 * ======================================================
 *
 * Une stratégie par code du classement (docs/wip/corrections-manquantes-frontiere.md) :
 * - `R-COMPL`       : compléter par bonds jusqu'aux nombres ronds (29 → 30 ; 7900 → 8000 → 10 000) ;
 * - `R-ECART`, `R-POSE` : une différence est un écart, on avance du petit au grand par bonds ;
 * - `R-RANGPARRANG` : décomposer le 2ᵉ terme selon ses rangs et l'ajouter morceau par morceau ;
 * - `R-RANG`        : ajouter / retrancher des dizaines (centaines…) entières, les unités de côté ;
 * - `R-DISTRIB`     : décomposer un facteur selon ses rangs (distributivité) ;
 * - `R-XDIZ`        : × 20, × 30… = × 2, × 3… puis × 10 ;
 * - `R-DIV-DIZ`     : diviser des dizaines (120 = 12 dizaines ; 12 : 3 = 4 → 4 dizaines) ;
 * - `R-PETIT-DIV`   : chercher un petit diviseur dans les tables.
 *
 * Première étape : la stratégie nommée, en prose ; deuxième : le calcul aligné.
 * Couleurs (palette.ts) : les morceaux / bonds en `transformed`, les nombres ronds
 * et résultats partiels en `intermediate`, la réponse en noir.
 *
 * Les morceaux nuls (dizaines absentes, bond vide…) ne sont écrits que par
 * `{{if:…}}`, et seulement s'ils SURVIENNENT sur le domaine des variables
 * (`sampling.ts`) : pas de branche morte, pas de « + 0 ». Les conditions n'utilisent
 * que l'arithmétique (`and` / `or` ne sont pas évalués à la génération) : pour des
 * valeurs positives, « x et y non nuls » s'écrit `(x)*(y)>0`.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { resolveExpression } from '../../../src/lib/questions/generator/content-resolver';
import { colored, inline } from './palette';
import { planDraws, type Sampling } from './sampling';
import { findExpressionVariable, splitBinaryOperation, toDisplayForm } from './operation';
import { parseHoleOperation } from './r-inv';
import { describeSampling } from './r-pass';

// ============================================================================
// TYPES
// ============================================================================

interface Operands {
	operator: string;
	/** Gabarits d'affichage */
	L: string;
	R: string;
	/** Formes de calcul */
	l: string;
	r: string;
}

interface Term {
	/** Texte LaTeX du morceau */
	text: string;
	/** Forme de calcul de sa valeur (≥ 0) */
	value: string;
	/** Jamais nul sur le domaine : écrit sans condition */
	always: boolean;
}

type Generated = { byVariation: string[][]; notes: string[] };

type VariationBuilder = (
	template: QuestionTemplate,
	index: number
) => { steps: string[]; note: string };

// ============================================================================
// CONSTANTS
// ============================================================================

const RANK_NAMES: Record<number, string> = {
	1: 'unités',
	10: 'dizaines',
	100: 'centaines',
	1000: 'milliers'
};

// ============================================================================
// HELPERS
// ============================================================================

const T = (latex: string) => colored('transformed', latex);
const I = (latex: string) => colored('intermediate', latex);
const E = (form: string, decimal = false) => `{{eval:${form}${decimal ? ';d' : ''}}}`;

/** Forme de calcul d'un opérande : `{{eval:X;d}}` → `(X)`, `{{a}}` → `a`, `12` → `12` */
function evalOf(operand: string): string {
	const trimmed = operand.trim();
	const evalMatch = trimmed.match(/^\{\{eval:([^{}]+?)(;\w+)?\}\}$/);
	if (evalMatch) {
		const inner = evalMatch[1].trim();
		return /^[a-zA-Z_]\w*$|^\d+(\.\d+)?$/.test(inner) ? inner : `(${inner})`;
	}
	const variableMatch = trimmed.match(/^\{\{([a-zA-Z_]\w*)\}\}$/);
	if (variableMatch) return variableMatch[1];
	if (/^[a-zA-Z_]\w*$|^\d+(\.\d+)?$/.test(trimmed)) return trimmed;
	throw new Error(`opérande illisible pour une stratégie : « ${operand} »`);
}

/** Coupe `gauche op droite` sur l'unique opérateur de `chars` de premier niveau */
function splitTop(expression: string, chars: string): Operands | null {
	let depth = 0;
	const found: { index: number; char: string }[] = [];
	for (let i = 0; i < expression.length; i++) {
		const char = expression[i];
		if (char === '{' || char === '(') depth++;
		else if (char === '}' || char === ')') depth--;
		else if (depth === 0 && chars.includes(char) && expression.slice(0, i).trim() !== '') {
			found.push({ index: i, char });
		}
	}
	if (found.length !== 1) return null;
	const left = expression.slice(0, found[0].index).trim();
	const right = expression.slice(found[0].index + 1).trim();
	if (left === '' || right === '') return null;
	return {
		operator: found[0].char,
		L: toDisplayForm(left),
		R: toDisplayForm(right),
		l: evalOf(left),
		r: evalOf(right)
	};
}

function expressionOf(template: QuestionTemplate, index: number): string {
	const variable = findExpressionVariable(template, index);
	if (!variable) throw new Error(`variation ${index} : aucune variable d'expression`);
	return variable.expression;
}

/** Valeurs numériques de formes de calcul, pour chaque tirage du domaine */
function sampleValues(
	template: QuestionTemplate,
	index: number,
	forms: string[]
): { rows: number[][]; sampling: Sampling } {
	const { sampling, draws } = planDraws(template, index);
	const rows: number[][] = [];
	for (const { label, result } of draws) {
		if (!result.success)
			throw new Error(`tirage ${label} impossible : ${result.errors.join(' ; ')}`);
		const variables = result.instance.resolvedVariables ?? [];
		rows.push(forms.map((form) => Number(resolveExpression(`{{eval:${form}}}`, variables))));
	}
	return { rows, sampling };
}

/** Somme des morceaux non nuls : `a + b + c`, sans « + 0 » (lead : un terme précède) */
function conditionalSum(terms: Term[], lead: boolean, sep = ' + '): string {
	return terms
		.map((term, j) => {
			const earlier = terms.slice(0, j);
			let prefix: string;
			if (lead || earlier.some((t) => t.always)) prefix = sep;
			else if (j === 0) prefix = '';
			else prefix = `{{if:${earlier.map((t) => `(${t.value})`).join('+')}>0|${sep}|}}`;
			const body = `${prefix}${term.text}`;
			return term.always ? body : `{{if:(${term.value})>0|${body}|}}`;
		})
		.join('');
}

/** Condition « au moins deux morceaux non nuls » (valeurs ≥ 0) */
function twoOrMore(terms: Term[]): string {
	const pairs: string[] = [];
	for (let i = 0; i < terms.length; i++) {
		for (let j = i + 1; j < terms.length; j++)
			pairs.push(`(${terms[i].value})*(${terms[j].value})`);
	}
	return `${pairs.join('+')}>0`;
}

function align(rows: string): string {
	return `$$\\begin{align} ${rows} \\end{align}$$`;
}

/** Un morceau gardé s'il est non nul sur au moins un tirage ; `always` s'il ne l'est jamais */
function keepTerms(
	candidates: { text: string; value: string }[],
	rows: number[][],
	offset: number
): Term[] {
	return candidates.flatMap((candidate, k) => {
		const values = rows.map((row) => row[offset + k]);
		if (values.every((v) => Math.abs(v) < 1e-9)) return [];
		return [{ ...candidate, always: values.every((v) => Math.abs(v) >= 1e-9) }];
	});
}

// ============================================================================
// BONDS (R-COMPL, R-ECART, R-POSE)
// ============================================================================

interface Bonds {
	terms: Term[];
	/** Nombres ronds du chemin, chacun avec la condition qui le montre (null : toujours) */
	path: { text: string; condition: string | null }[];
}

/**
 * Bonds de `k` jusqu'à `t` en passant par les nombres ronds `ranks` (dizaine,
 * centaine…) ; `scale` = 100 pour des centièmes (les calculs se font en entiers).
 */
function buildBonds(
	template: QuestionTemplate,
	index: number,
	k: string,
	t: string,
	ranks: number[],
	scale = 1,
	floorTarget = false
): Bonds & { sampling: Sampling } {
	const decimal = scale !== 1;
	const scaled = (form: string) => (decimal ? `round((${form})*${scale})` : `(${form})`);
	const waypoints = ranks.map((u) => `ceil(${scaled(k)}/${u})*${u}`);
	// Écart : un dernier nombre rond, la dizaine / centaine juste sous la cible (22 → 30 → 31)
	const top = ranks[ranks.length - 1];
	if (floorTarget && top) waypoints.push(`floor(${scaled(t)}/${top})*${top}`);
	const points = [scaled(k), ...waypoints, scaled(t)];
	const unscale = (form: string) => (decimal ? `(${form})/${scale}` : form);
	const steps = points.slice(1).map((p, i) => unscale(`${p}-${points[i]}`));
	const pointValues = waypoints.map((_, i) => unscale(points[i + 1]));
	const toTarget = waypoints.map((_, i) => unscale(`${scaled(t)}-${points[i + 1]}`));
	const { rows, sampling } = sampleValues(template, index, [...steps, ...toTarget]);
	for (const row of rows) {
		if (row.slice(0, steps.length).some((v) => v < -1e-9)) {
			throw new Error(`variation ${index} : un nombre rond dépasse la cible (${row.join(', ')})`);
		}
	}
	const terms = keepTerms(
		steps.map((value) => ({ text: T(E(value, decimal)), value })),
		rows,
		0
	);
	const path = waypoints.flatMap((_, i) => {
		const stepValues = rows.map((row) => row[i]);
		const targetValues = rows.map((row) => row[steps.length + i]);
		const shown = stepValues.map((v, n) => v > 1e-9 && targetValues[n] > 1e-9);
		if (!shown.some(Boolean)) return [];
		return [
			{
				text: I(E(pointValues[i], decimal)),
				condition: shown.every(Boolean) ? null : `(${steps[i]})*(${toTarget[i]})>0`
			}
		];
	});
	return { terms, path, sampling };
}

function pathLatex(from: string, bonds: Bonds, to: string): string {
	const middle = bonds.path
		.map((p) => (p.condition ? `{{if:${p.condition}| \\to ${p.text}|}}` : ` \\to ${p.text}`))
		.join('');
	return `${from}${middle} \\to ${to}`;
}

/** Bonds possibles : de la dizaine jusqu'au rang juste sous la cible */
function ranksBelow(maxTarget: number): number[] {
	const ranks: number[] = [];
	for (let u = 10; u < maxTarget; u *= 10) ranks.push(u);
	return ranks;
}

function maxOf(template: QuestionTemplate, index: number, form: string): number {
	return Math.max(...sampleValues(template, index, [form]).rows.map((row) => row[0]));
}

/** R-COMPL, trou : `K + ? = T` ou `? + K = T` */
const complementHole: VariationBuilder = (template, index) => {
	const expression = expressionOf(template, index);
	const hole = parseHoleOperation(expression);
	if (hole && hole.operator === '+') {
		const k = evalOf(hole.known);
		const t = evalOf(hole.result);
		const decimal = /;d/.test(expression) || /\./.test(String(maxOf(template, index, k)));
		const scale = decimal ? 100 : 1;
		const ranks = decimal ? [10] : ranksBelow(maxOf(template, index, t));
		const bonds = buildBonds(template, index, k, t, ranks, scale);
		const direct = `${T(hole.result)} - ${T(hole.known)}`;
		const several = twoOrMore(bonds.terms);
		const sum = conditionalSum(bonds.terms, false);
		const body =
			bonds.terms.length < 2
				? direct
				: bonds.terms.every((term) => term.always)
					? sum
					: `{{if:${several}|${sum}|${direct}}}`;
		const manyText =
			`On avance de ${inline(hole.known)} jusqu'à ${inline(hole.result)} en passant par les nombres ronds : ` +
			`${inline(pathLatex(hole.known, bonds, hole.result))}. Le nombre cherché est la somme des bonds.`;
		const oneText =
			`On avance de ${inline(hole.known)} jusqu'à ${inline(hole.result)} d'un seul bond : ` +
			`le nombre cherché est l'écart ${inline(`${T(hole.result)} - ${T(hole.known)}`)}.`;
		const prose =
			bonds.terms.length < 2
				? oneText
				: bonds.terms.every((term) => term.always)
					? manyText
					: `{{if:${several}|${manyText}|${oneText}}}`;
		return {
			steps: [`**Compléter par bonds.** ${prose}`, align(`? &= ${body} \\\\ &= {{solution}}`)],
			note: `bonds de ${hole.known} à ${hole.result}, rangs ${ranks.join(', ')}${decimal ? ' (centièmes)' : ''} (${describeSampling(bonds.sampling)})`
		};
	}
	// Somme posée : `b + (100 − b)` → on complète b à la dizaine, puis à la centaine
	const op = splitBinaryOperation(expression);
	if (!op || op.operator !== '+') throw new Error(`« ${expression} » : ni trou ni somme`);
	const L = toDisplayForm(op.left);
	const R = toDisplayForm(op.right);
	const l = evalOf(op.left);
	const r = evalOf(op.right);
	const bonds = buildBonds(template, index, l, `${l}+${r}`, [10]);
	const [first, second] = bonds.terms;
	if (!first || !second || !second.always) {
		throw new Error(`variation ${index} : complément à la centaine illisible`);
	}
	const p1 = `ceil((${l})/10)*10`;
	const long = `${L} + ${first.text} + ${second.text} \\\\ &= ${I(E(p1))} + ${second.text}`;
	const rows = first.always ? long : `{{if:(${first.value})>0|${long}|${L} + ${R}}}`;
	return {
		steps: [
			`**Compléter jusqu'au nombre rond.** ` +
				(first.always ? '' : `{{if:(${first.value})>0|`) +
				`On décompose ${inline(R)} en deux bonds : ` +
				`le premier complète ${inline(L)} à la dizaine, le second va jusqu'à ${inline(E(`${l}+${r}`))} : ` +
				`${inline(pathLatex(L, bonds, E(`${l}+${r}`)))}.` +
				(first.always
					? ''
					: `|${inline(L)} et ${inline(R)} sont des nombres ronds de dizaines : on compte en dizaines.}}`),
			align(`${L} + ${R} &= ${rows} \\\\ &= {{solution}}`)
		],
		note: `somme ${L} + ${R} : bonds par la dizaine (${describeSampling(bonds.sampling)})`
	};
};

/** R-ECART / R-POSE : `L − R` = écart de R à L, par bonds */
const gapByBonds: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), '-');
	if (!op) throw new Error(`variation ${index} : pas une différence`);
	const ranks = ranksBelow(maxOf(template, index, op.r) + 1);
	const bonds = buildBonds(template, index, op.r, op.l, ranks, 1, true);
	if (bonds.terms.length < 2) throw new Error(`variation ${index} : moins de deux bonds`);
	return {
		steps: [
			`**Calculer un écart.** ${inline(`${op.L} - ${op.R}`)}, c'est l'écart entre ${inline(op.R)} et ${inline(op.L)} : ` +
				`on avance de ${inline(op.R)} jusqu'à ${inline(op.L)} par bonds, en passant par les nombres ronds : ` +
				`${inline(pathLatex(op.R, bonds, op.L))}. L'écart est la somme des bonds.`,
			align(`${op.L} - ${op.R} &= ${conditionalSum(bonds.terms, false)} \\\\ &= {{solution}}`)
		],
		note: `écart de ${op.R} à ${op.L}, rangs ${ranks.join(', ')} (${describeSampling(bonds.sampling)})`
	};
};

// ============================================================================
// RANGS (R-RANGPARRANG, R-RANG)
// ============================================================================

/** `L ± R` avec R < 10 : on décompose L en dizaines + unités, on calcule les unités */
function unitsRows(op: Operands): { rows: string; prose: string; condition: string } {
	const u = `mod((${op.l}),10)`;
	const high = `${op.l}-${u}`;
	const sign = op.operator === '-' ? '-' : '+';
	return {
		rows:
			`${T(E(high))} + ${T(E(u))} ${sign} ${op.R} \\\\ ` +
			`&= ${E(high)} + ${I(E(`${u}${sign}${op.r}`))}`,
		prose:
			`On décompose ${inline(op.L)} en ${inline(`${T(E(high))} + ${T(E(u))}`)} ` +
			`et on calcule les unités : ${inline(`${E(u)} ${sign} ${op.R} = ${I(E(`${u}${sign}${op.r}`))}`)}.`,
		condition: `(${u})*(${high})>0`
	};
}

/** R-RANGPARRANG : décomposer R selon ses rangs, puis l'ajouter morceau par morceau */
const rankByRank: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), '+-');
	if (!op) throw new Error(`variation ${index} : ni somme ni différence`);
	const sign = op.operator === '-' ? '-' : '+';
	const maxR = maxOf(template, index, op.r);
	if (maxR < 10) {
		const units = unitsRows(op);
		const { rows, sampling } = sampleValues(template, index, [
			`mod((${op.l}),10)*(${op.l}-mod((${op.l}),10))`
		]);
		if (rows.some((row) => row[0] <= 0)) throw new Error(`variation ${index} : unités nulles`);
		return {
			steps: [
				`**Calculer rang par rang.** ${inline(op.R)} n'a que des unités. ${units.prose}`,
				align(`${op.L} ${sign} ${op.R} &= ${units.rows} \\\\ &= {{solution}}`)
			],
			note: `${op.L} ${sign} ${op.R} : unités seulement (${describeSampling(sampling)})`
		};
	}
	if (maxR >= 1000) throw new Error(`variation ${index} : R ≥ 1000 non traité`);
	const candidates = [
		{ value: `floor((${op.r})/100)*100` },
		{ value: `floor(mod((${op.r}),100)/10)*10` },
		{ value: `mod((${op.r}),10)` }
	].map((c) => ({ ...c, text: T(E(c.value)) }));
	const { rows, sampling } = sampleValues(
		template,
		index,
		candidates.map((c) => c.value)
	);
	const named = candidates.map((c, k) => ({ ...c, name: ['centaines', 'dizaines', 'unités'][k] }));
	const terms = keepTerms(named, rows, 0);
	const rankList = conditionalSum(
		terms.map((t) => ({ ...t, text: named.find((c) => c.value === t.value)?.name ?? '' })),
		false,
		', puis '
	);
	const sep = ` ${sign} `;
	// Une ligne par morceau ajouté, tant qu'il en reste un après lui
	const partial = terms
		.slice(0, -1)
		.map((term, k) => {
			const done = terms.slice(0, k + 1).map((t) => `(${t.value})`);
			const rest = terms.slice(k + 1);
			const line = ` \\\\ &= ${I(E(`${op.l}${sign}(${done.join('+')})`))}${conditionalSum(rest, true, sep)}`;
			const condition = `(${term.value})*(${rest.map((t) => `(${t.value})`).join('+')})>0`;
			return `{{if:${condition}|${line}|}}`;
		})
		.join('');
	const decomposition = conditionalSum(terms, false);
	const firstRow = terms.every((t) => t.always)
		? `&= ${op.L}${conditionalSum(terms, true, sep)}`
		: `{{if:${twoOrMore(terms)}|&= ${op.L}${conditionalSum(terms, true, sep)}|}}`;
	return {
		steps: [
			`**Calculer rang par rang.** On décompose ${inline(op.R)} selon ses rangs : ` +
				`${inline(`${op.R} = ${decomposition}`)}. ` +
				`On ${sign === '+' ? 'ajoute' : 'retranche'} les morceaux un par un : ${rankList}.`,
			align(`${op.L} ${sign} ${op.R} ${firstRow}${partial} \\\\ &= {{solution}}`)
		],
		note: `${op.L} ${sign} ${op.R} : ${terms.length} rang(s) (${describeSampling(sampling)})`
	};
};

/** R-RANG : ajouter / retrancher g dizaines (centaines…) entières */
const wholeRank: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), '+-');
	if (!op) throw new Error(`variation ${index} : ni somme ni différence`);
	const sign = op.operator === '-' ? '-' : '+';
	const verb = sign === '+' ? 'ajoute' : 'retranche';
	const { rows, sampling } = sampleValues(template, index, [op.r, op.l]);
	const ranks = new Set<number>();
	for (const [r] of rows) {
		const rank = [1000, 100, 10, 1].find((m) => r % m === 0 && r / m >= 1 && r / m <= 9);
		if (!rank) throw new Error(`variation ${index} : ${r} n'est pas un nombre entier de rangs`);
		ranks.add(rank);
	}
	const branch = (m: number): [string, string] => {
		if (m === 1) {
			const units = unitsRows(op);
			return [
				`**${sign === '+' ? 'Ajouter' : 'Retrancher'} des unités.** {{if:${units.condition}|${units.prose}|On calcule directement.}}`,
				`{{if:${units.condition}|${units.rows} \\\\ &= |}}`
			];
		}
		const low = `mod((${op.l}),${m})`;
		const high = `${op.l}-${low}`;
		const condition = `(${low})*(${high})>0`;
		const name = RANK_NAMES[m];
		const singular = name.slice(0, -1);
		const whole = m === 1000 ? 'entiers' : 'entières';
		const prose =
			`**${sign === '+' ? 'Ajouter' : 'Retrancher'} des ${name} ${whole}.** ` +
			`On ${verb} ${inline(op.R)}, c'est-à-dire ${inline(E(`(${op.r})/${m}`))} ` +
			`{{if:(${op.r})=${m}|${singular}|${name}}} : ` +
			`{{if:${condition}|on met de côté ${inline(T(E(low)))} et on calcule ` +
			`${inline(`${T(E(high))} ${sign} ${op.R} = ${I(E(`${high}${sign}${op.r}`))}`)}.|on compte en ${name}.}}`;
		const calc = `{{if:${condition}|${T(E(high))} ${sign} ${op.R} + ${T(E(low))} \\\\ &= ${I(E(`${high}${sign}${op.r}`))} + ${E(low)} \\\\ &= |}}`;
		return [prose, calc];
	};
	const sorted = [...ranks].sort((a, b) => a - b);
	const pick = (part: 0 | 1): string =>
		sorted
			.slice(0, -1)
			.reduceRight(
				(otherwise, m) => `{{if:(${op.r})<${m * 10}|${branch(m)[part]}|${otherwise}}}`,
				branch(sorted[sorted.length - 1])[part]
			);
	return {
		steps: [pick(0), align(`${op.L} ${sign} ${op.R} &= ${pick(1)}{{solution}}`)],
		note: `${op.L} ${sign} ${op.R} : rang(s) ${sorted.join(', ')} (${describeSampling(sampling)})`
	};
};

// ============================================================================
// PRODUITS ET QUOTIENTS (R-DISTRIB, R-XDIZ, R-DIV-DIZ, R-PETIT-DIV)
// ============================================================================

/** L'opérande « simple » (entier de 1 à 9) et l'autre ; `simpleFirst` : ordre posé */
function productSides(template: QuestionTemplate, index: number, op: Operands) {
	const { rows, sampling } = sampleValues(template, index, [op.l, op.r]);
	const simple = (col: number) =>
		rows.every((row) => Number.isInteger(row[col]) && row[col] >= 0 && row[col] <= 9);
	const leftSimple = simple(0);
	const rightSimple = simple(1);
	if (!leftSimple && !rightSimple)
		throw new Error(`variation ${index} : aucun facteur à un chiffre`);
	// Deux facteurs à un chiffre : on décompose le plus grand (le droit à égalité)
	const decomposeLeft = !leftSimple;
	return {
		A: decomposeLeft ? op.R : op.L,
		a: decomposeLeft ? op.r : op.l,
		B: decomposeLeft ? op.L : op.R,
		b: decomposeLeft ? op.l : op.r,
		bFirst: decomposeLeft,
		rows,
		bColumn: decomposeLeft ? 0 : 1,
		sampling
	};
}

/** R-DISTRIB : décomposer le grand facteur selon ses rangs */
const distributive: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), '*');
	if (!op) throw new Error(`variation ${index} : pas un produit`);
	const side = productSides(template, index, op);
	const bValues = side.rows.map((row) => row[side.bColumn]);
	const decimal = bValues.some((v) => !Number.isInteger(v));
	const candidates = decimal
		? [
				{ value: `floor(${side.b})`, decimal: false },
				{ value: `round(((${side.b})-floor(${side.b}))*10)/10`, decimal: true }
			]
		: [
				{ value: `floor((${side.b})/100)*100`, decimal: false },
				{ value: `floor(mod((${side.b}),100)/10)*10`, decimal: false },
				{ value: `mod((${side.b}),10)`, decimal: false }
			];
	if (!decimal && bValues.some((v) => v >= 1000)) throw new Error(`variation ${index} : ≥ 1000`);
	const { rows } = sampleValues(
		template,
		index,
		candidates.map((c) => c.value)
	);
	const product = (part: string) =>
		side.bFirst ? `${part} \\times ${side.A}` : `${side.A} \\times ${part}`;
	const terms = keepTerms(
		candidates.map((c) => ({ text: product(T(E(c.value, c.decimal))), value: c.value })),
		rows,
		0
	);
	const productTerms: Term[] = terms.map((t) => {
		const isDecimal = candidates.find((c) => c.value === t.value)?.decimal ?? false;
		return { ...t, text: I(E(`(${side.a})*(${t.value})`, decimal || isDecimal)) };
	});
	const partsTerms: Term[] = terms.map((t) => {
		const isDecimal = candidates.find((c) => c.value === t.value)?.decimal ?? false;
		return { ...t, text: T(E(t.value, isDecimal)) };
	});
	const posed = `${op.L} \\times ${op.R}`;
	const long = `${conditionalSum(terms, false)} \\\\ &= ${conditionalSum(productTerms, false)}`;
	// Un seul rang non nul (20, 50, 300) : × chiffre, puis × 10 ou × 100
	const single = (m: number) =>
		`${side.bFirst ? `${T(E(`(${side.b})/${m}`))} \\times ${side.A}` : `${side.A} \\times ${T(E(`(${side.b})/${m}`))}`} \\times ${m} \\\\ &= ${I(E(`(${side.a})*(${side.b})/${m}`))} \\times ${m}`;
	const singleRows = `{{if:mod((${side.b}),100)=0|${single(100)}|${single(10)}}}`;
	const allSeveral =
		terms.length >= 2 && rows.every((row) => row.filter((v) => Math.abs(v) > 1e-9).length >= 2);
	const noneSeveral = rows.every((row) => row.filter((v) => Math.abs(v) > 1e-9).length < 2);
	const rowsText = allSeveral
		? long
		: noneSeveral
			? singleRows
			: `{{if:${twoOrMore(terms)}|${long}|${singleRows}}}`;
	const longProse =
		`**Décomposer un facteur.** On décompose ${inline(side.B)} selon ses rangs, ` +
		`${inline(`${side.B} = ${conditionalSum(partsTerms, false)}`)}, ` +
		`puis on multiplie chaque morceau par ${inline(side.A)} et on ajoute les résultats.`;
	const singleProseFor = (m: number) =>
		`**Décomposer un facteur.** ${inline(`${side.B} = ${T(E(`(${side.b})/${m}`))} \\times ${m}`)} : ` +
		`on multiplie par ${inline(T(E(`(${side.b})/${m}`)))}, puis par ${inline(String(m))}.`;
	const singleProse = `{{if:mod((${side.b}),100)=0|${singleProseFor(100)}|${singleProseFor(10)}}}`;
	const proseText = allSeveral
		? longProse
		: noneSeveral
			? singleProse
			: `{{if:${twoOrMore(terms)}|${longProse}|${singleProse}}}`;
	return {
		steps: [proseText, align(`${posed} &= ${rowsText} \\\\ &= {{solution}}`)],
		note: `${posed} : ${side.B} décomposé${decimal ? ' (unités + dixièmes)' : ''}, ${terms.length} morceau(x) (${describeSampling(side.sampling)})`
	};
};

/** R-XDIZ : × 20, × 30… = × 2, × 3… puis × 10 */
const timesTens: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), '*');
	if (!op) throw new Error(`variation ${index} : pas un produit`);
	const { rows, sampling } = sampleValues(template, index, [op.l, op.r]);
	const tens = (col: number) =>
		rows.every((row) => row[col] % 10 === 0 && row[col] >= 20 && row[col] <= 90);
	const leftTens = tens(0);
	if (!leftTens && !tens(1)) throw new Error(`variation ${index} : aucun facteur 20…90`);
	const D = leftTens ? op.L : op.R;
	const d = leftTens ? op.l : op.r;
	const X = leftTens ? op.R : op.L;
	const x = leftTens ? op.r : op.l;
	return {
		steps: [
			`**Multiplier par un nombre de dizaines.** Multiplier par ${inline(D)}, c'est multiplier par ` +
				`${inline(T(E(`(${d})/10`)))}, puis par ${inline(T('10'))}.`,
			align(
				`${op.L} \\times ${op.R} &= ${X} \\times ${T(E(`(${d})/10`))} \\times ${T('10')} \\\\ ` +
					`&= ${I(E(`(${x})*(${d})/10`))} \\times 10 \\\\ &= {{solution}}`
			)
		],
		note: `${op.L} × ${op.R} : ${D} = dizaines (${describeSampling(sampling)})`
	};
};

/** R-DIV-DIZ : N : b avec N un nombre de dizaines */
const divideTens: VariationBuilder = (template, index) => {
	const op = splitTop(expressionOf(template, index), ':');
	if (!op) throw new Error(`variation ${index} : pas un quotient`);
	const { rows, sampling } = sampleValues(template, index, [`(${op.l})/(${op.r})/10`]);
	if (rows.some(([q]) => !Number.isInteger(q)))
		throw new Error(`variation ${index} : quotient non entier`);
	const tens = E(`(${op.l})/10`);
	const q = E(`(${op.l})/10/(${op.r})`);
	return {
		steps: [
			`**Diviser des dizaines.** ${inline(op.L)}, c'est ${inline(T(tens))} dizaines. ` +
				`Avec la table de ${inline(op.R)} : ${inline(`${T(tens)} : ${op.R} = ${I(q)}`)}, ` +
				`donc ${inline(`${op.L} : ${op.R}`)} fait ${inline(I(q))} dizaines.`,
			align(
				`${op.L} : ${op.R} &= \\left( ${T(tens)} : ${op.R} \\right) \\times 10 \\\\ ` +
					`&= ${I(q)} \\times 10 \\\\ &= {{solution}}`
			)
		],
		note: `${op.L} : ${op.R} (${describeSampling(sampling)})`
	};
};

/** R-PETIT-DIV : chercher un petit diviseur ; la décomposition suit la réponse attendue */
const smallDivisor: VariationBuilder = (template, index) => {
	const expression = expressionOf(template, index);
	const N = toDisplayForm(expression.replace(/^eval:(.*)$/, '{{eval:$1}}'));
	const answer = template.variations[index].blanks?.[0]?.expectedAnswer ?? '';
	const parts = splitTop(answer, '*');
	if (!parts) throw new Error(`variation ${index} : réponse « ${answer} » pas un produit`);
	const { sampling } = sampleValues(template, index, ['1']);
	return {
		steps: [
			`**Chercher un petit diviseur.** On essaie les petits diviseurs ${inline('2')}, ${inline('3')}, ${inline('5')}… ` +
				`avec les tables et les critères de divisibilité (un nombre pair est divisible par ${inline('2')} ; ` +
				`si la somme de ses chiffres est dans la table de ${inline('3')}, il est divisible par ${inline('3')}). ` +
				`${inline(N)} est dans la table de ${inline(T(parts.L))} : ${inline(`${T(parts.L)} \\times ${I(parts.R)} = ${N}`)}.`,
			align(`${N} &= ${T(parts.L)} \\times ${I(parts.R)}`)
		],
		note: `${N} = ${parts.L} × ${parts.R} (réponse attendue ; ${describeSampling(sampling)})`
	};
};

// ============================================================================
// EXPORTS
// ============================================================================

function perVariation(builder: VariationBuilder): (template: QuestionTemplate) => Generated {
	return (template) => {
		const notes: string[] = [];
		const byVariation = template.variations.map((_, index) => {
			const { steps, note } = builder(template, index);
			notes.push(`variation ${index} : ${note}`);
			return steps;
		});
		return { byVariation, notes };
	};
}

export const MENTAL_STRATEGIES: Record<string, (template: QuestionTemplate) => Generated> = {
	'R-COMPL': perVariation(complementHole),
	'R-ECART': perVariation(gapByBonds),
	'R-POSE': perVariation(gapByBonds),
	'R-RANGPARRANG': perVariation(rankByRank),
	'R-RANG': perVariation(wholeRank),
	'R-DISTRIB': perVariation(distributive),
	'R-XDIZ': perVariation(timesTens),
	'R-DIV-DIZ': perVariation(divideTens),
	'R-PETIT-DIV': perVariation(smallDivisor)
};
