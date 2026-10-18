/**
 * Relevé factuel de ce que génèrent les modèles du lot C5 « primaire + collège »
 * ==============================================================================
 *
 * LECTURE SEULE : n'écrit jamais en base. Écrit seulement dans ce dossier
 * (docs/wip/arbre-notions/releves/) : un <template_id>.json par modèle + index.csv.
 *
 * Usage (depuis la racine du dépôt, pour que tsx résolve `$lib` via tsconfig) :
 *   pnpm exec tsx docs/wip/arbre-notions/releves/releve.ts
 *   pnpm exec tsx docs/wip/arbre-notions/releves/releve.ts --rafraichir      relit les modèles en prod
 *   pnpm exec tsx docs/wip/arbre-notions/releves/releve.ts --ids <id>,<id>   seulement ces modèles
 *   pnpm exec tsx docs/wip/arbre-notions/releves/releve.ts --graines 300     tirages par variation
 *
 * Source des modèles : `templates.json` (instantané de `question_templates`, colonnes complètes).
 * `--rafraichir` le recharge par l'API REST de Supabase avec la clé anonyme de `.env`
 * (GET seulement ; la clé anonyme ne voit que les modèles publiés, ce qui est le cas du lot).
 *
 * Graines : pour la variation v, le modèle est réduit à cette seule variation et tiré avec
 * les graines 1..N. Une instance ainsi obtenue n'est PAS celle que l'app tire avec la même
 * graine sur le modèle entier (le choix de la variation consomme le hasard).
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
import { parseMarkdown } from '$lib/ubumark';
import {
	expressionToLatex,
	genericFunctionsConfig
} from '$lib/components/markdown/utils/math-utils';
import type { QuestionInstance } from '$lib/questions/types';
import { augmentASTForExpressions } from '$lib/components/question-inputs/fill-blanks-utils';

// ============================================================================
// TYPES
// ============================================================================

interface CsvRow {
	[key: string]: string;
}

type AnyNode = { type: string; [k: string]: unknown };

interface NumberToken {
	value: number;
	decimals: number;
	negative: boolean;
	raw: string;
}

interface Sample {
	seed: number;
	ok: boolean;
	error?: string;
	vars: Record<string, string>;
	text: string;
	answers: string[];
	answerLabels: string[];
	statementNumbers: NumberToken[];
	answerNumbers: NumberToken[];
	choiceNumbers: NumberToken[];
	fractions: { num: number; den: number; where: 'enonce' | 'reponse' }[];
	words: number;
	figure: string[];
	units: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DIR = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(DIR, '../../../..');
const CSV_PATH = path.join(DIR, '..', 'c5-lot-2bis-v2.csv');
const SNAPSHOT = path.join(DIR, 'templates.json');
const LETTERS = 'ABCDEFGHIJKL';
const MAX_DISTINCT = 30;

const SYMBOLS: [string, RegExp][] = [
	['=', /=/],
	['<', /<|\\lt\b/],
	['>', />|\\gt\b/],
	['≤', /\\le(q)?\b|≤/],
	['≥', /\\ge(q)?\b|≥/],
	['≠', /\\neq?\b|≠/],
	['≈', /\\approx|≈/],
	['+', /\+/],
	['−', /\d\s*-\s*[\d(]|[)}]\s*-\s*[\d(]|−/],
	['×', /\\times|×|\\cdot/],
	['÷', /\\div|÷/],
	['fraction', /\\d?frac/],
	['puissance', /\^/],
	['racine', /\\sqrt/],
	['%', /\\%|%/],
	['parenthèses', /\(/],
	['case ?', /\[\?\]/],
	['case texte [_]', /\[_\]/],
	['…', /\\ldots|\\dots|…/]
];

// ============================================================================
// ARGUMENTS
// ============================================================================

const argv = process.argv.slice(2);
function argValue(name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}
const N_SEEDS = Number(argValue('--graines') ?? 300);
const ONLY_IDS = argValue('--ids')
	?.split(',')
	.map((s) => s.trim());

// ============================================================================
// LECTURE DES ENTRÉES
// ============================================================================

function parseCsv(text: string): CsvRow[] {
	// CSV `;` avec champs éventuellement entre guillemets (`""` = guillemet)
	const rows: string[][] = [];
	let field = '';
	let row: string[] = [];
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ';') {
			row.push(field);
			field = '';
		} else if (ch === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (ch !== '\r') field += ch;
	}
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	const [head, ...body] = rows;
	return body
		.filter((r) => r.length > 1)
		.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

async function refreshSnapshot(ids: string[]): Promise<void> {
	const env = Object.fromEntries(
		fs
			.readFileSync(path.join(ROOT, '.env'), 'utf8')
			.split('\n')
			.filter((l) => l.includes('='))
			.map((l) => {
				const i = l.indexOf('=');
				return [
					l.slice(0, i).trim(),
					l
						.slice(i + 1)
						.trim()
						.replace(/^["']|["']$/g, '')
				];
			})
	);
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;
	const out: unknown[] = [];
	for (let i = 0; i < ids.length; i += 50) {
		const chunk = ids.slice(i, i + 50);
		const r = await fetch(`${url}/rest/v1/question_templates?select=*&id=in.(${chunk.join(',')})`, {
			headers: { apikey: key, Authorization: `Bearer ${key}` }
		});
		const j: unknown = await r.json();
		if (!Array.isArray(j))
			throw new Error('Réponse inattendue : ' + JSON.stringify(j).slice(0, 300));
		out.push(...j);
	}
	fs.writeFileSync(SNAPSHOT, JSON.stringify(out));
	console.log(`instantané rafraîchi : ${out.length} modèles (attendus ${ids.length})`);
}

// ============================================================================
// RENDU TEXTE
// ============================================================================

interface Ctx {
	inst: QuestionInstance;
	figure: string[];
}

function mathLatex(node: { expression: string; syntax: 'latex' | 'custom' }, ctx: Ctx): string {
	let latex: string;
	try {
		latex = expressionToLatex(
			node.expression,
			node.syntax,
			genericFunctionsConfig(ctx.inst.genericFunctions),
			'fr',
			ctx.inst.capitalPairs
		);
	} catch {
		latex = node.expression;
	}
	return latex
		.replace(/\\placeholder\[(\d+)\]\{\}/g, (_m, k: string) => {
			const pre = ctx.inst.blanks?.[Number(k)]?.prefilled;
			return pre ? `[${pre}]` : '[?]';
		})
		.replace(/\\placeholder(\[[^\]]*\])?\{([^{}]*)\}/g, '[$2]');
}

function inline(nodes: AnyNode[], ctx: Ctx): string {
	return nodes
		.map((n) => {
			switch (n.type) {
				case 'text':
					return String(n.content);
				case 'math-inline':
					return `$${mathLatex(n as never, ctx)}$`;
				case 'line-break':
					return '\n';
				case 'blank':
					return '[_]';
				case 'link':
					return String(n.text);
				case 'internal-link':
					return String(n.label ?? '');
				default:
					return String(n.content ?? n.text ?? n.label ?? '');
			}
		})
		.join('');
}

function cellText(content: string, ctx: Ctx): string {
	const doc = parseMarkdown(content);
	return doc.children
		.map((b) =>
			b.type === 'paragraph' ? inline(b.children as AnyNode[], ctx) : block(b as AnyNode, ctx)
		)
		.join(' ');
}

function block(n: AnyNode, ctx: Ctx): string {
	switch (n.type) {
		case 'paragraph':
		case 'heading':
			return inline(n.children as AnyNode[], ctx);
		case 'math-block':
			return `$$${mathLatex(n as never, ctx)}$$`;
		case 'list':
			return (n.items as { children: AnyNode[] }[])
				.map(
					(it) =>
						'- ' +
						it.children
							.map((c) =>
								c.type === 'paragraph' ? inline(c.children as AnyNode[], ctx) : block(c, ctx)
							)
							.join(' ')
				)
				.join('\n');
		case 'table': {
			ctx.figure.push('tableau');
			const head = (n.header as { content: string }[]).map((c) => cellText(c.content, ctx));
			const rows = (n.rows as { content: string }[][]).map((r) =>
				r.map((c) => cellText(c.content, ctx))
			);
			return [head, ...rows]
				.filter((r) => r.length)
				.map((r) => '| ' + r.join(' | ') + ' |')
				.join('\n');
		}
		case 'blockquote':
			return ((n.children as AnyNode[]) ?? []).map((c) => '> ' + block(c, ctx)).join('\n');
		case 'horizontal-rule':
			return '---';
		case 'code-block':
			if (n.language) {
				ctx.figure.push(String(n.language));
				return `[figure ${String(n.language)}]\n${String(n.content ?? n.code ?? '')}\n[/figure]`;
			}
			return String(n.content ?? n.code ?? '');
		case 'image':
			ctx.figure.push('image');
			return `[image ${String(n.src ?? n.url ?? '')}]`;
		default:
			ctx.figure.push(n.type);
			return `[${n.type}]`;
	}
}

function renderText(md: string, ctx: Ctx, augment: boolean): string {
	const doc = parseMarkdown(md);
	const ast = augment
		? augmentASTForExpressions(doc, ctx.inst.expressions, ctx.inst.capitalPairs)
		: doc;
	return ast.children.map((b) => block(b as AnyNode, ctx)).join('\n\n');
}

// ============================================================================
// EXTRACTION DES NOMBRES
// ============================================================================

/** Retire ce qui n'est pas un nombre de l'énoncé : couleurs, unités, indices de case */
function scrub(latex: string): string {
	return latex
		.replace(/\\textcolor\{[^{}]*\}/g, '')
		.replace(/\\color\{[^{}]*\}/g, '')
		.replace(/\\(htmlStyle|style|class)\{[^{}]*\}/g, '')
		.replace(/\\unit\{[^{}]*\}/g, ' ')
		.replace(/\\(hspace|vspace|kern)\{[^{}]*\}/g, ' ')
		.replace(/#[0-9a-fA-F]{3,8}\b/g, '')
		.replace(/var\(--[^)]*\)/g, '')
		.replace(/\\(d|t)?frac/g, '\\frac');
}

function toToken(
	intPart: string,
	decPart: string | undefined,
	negative: boolean,
	raw: string
): NumberToken {
	const digits = intPart.replace(/[^\d]/g, '');
	const value = Number(digits + (decPart ? '.' + decPart : '')) * (negative ? -1 : 1);
	return { value, decimals: decPart ? decPart.length : 0, negative, raw };
}

/**
 * Nombres d'un texte rendu (texte + LaTeX). Décimal : `3{,}5`, `3.5`, ou `3,5` collé.
 * Milliers : `12\,345`, `12\ 345`, `12~345`, espace insécable. Le signe n'est lu comme
 * « négatif » que devant un nombre en tête, après `(`, `=`, `,`, `\times`, `\div`, `[`.
 */
function extractNumbers(text: string): NumberToken[] {
	const s = scrub(text);
	const out: NumberToken[] = [];
	const re = /(\d{1,3}(?:(?:\\,|\\ |~| | |\\;|\{\s\})\d{3})+|\d+)(?:(?:\{,\}|\.|,(?=\d))(\d+))?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(s))) {
		const before = s.slice(Math.max(0, m.index - 12), m.index);
		// Chiffre précédé d'une lettre (`x2`, `A1`) : nom de point ou indice, pas un nombre
		if (/[A-Za-z]$/.test(before) && !/\\[a-zA-Z]+$/.test(before)) continue;
		const negative =
			/(^|[([=,{]|\\times|\\div|\\left\(|\\cdot)\s*(-|−)\s*$/.test(before) ||
			(m.index <= 1 && /^\s*-/.test(s));
		out.push(toToken(m[1], m[2], negative, m[0]));
	}
	return out;
}

function stripFigures(text: string): string {
	return text.replace(/\[figure[\s\S]*?\[\/figure\]/g, ' ').replace(/\[image [^\]]*\]/g, ' ');
}

function extractFractions(text: string): { num: number; den: number }[] {
	const out: { num: number; den: number }[] = [];
	const s = scrub(text);
	for (const m of s.matchAll(/\\frac\{\s*(-?\d+)\s*\}\{\s*(-?\d+)\s*\}/g)) {
		out.push({ num: Number(m[1]), den: Number(m[2]) });
	}
	for (const m of s.matchAll(/(?<![\d.{])(-?\d+)\s*\/\s*(\d+)(?![\d.])/g)) {
		out.push({ num: Number(m[1]), den: Number(m[2]) });
	}
	return out;
}

function unitsOf(text: string): string[] {
	const out = new Set<string>();
	for (const m of text.matchAll(/\\unit\{([^{}]*)\}/g)) out.add(m[1]);
	for (const m of text.matchAll(/~\s*\d[^~]*\[([^\]]+)\]~/g)) out.add(m[1]);
	for (const m of text.matchAll(/\d\s*\[([a-zA-Zµ°%²³.^\-\d/]+)\]/g)) {
		if (!/^\d+$/.test(m[1]) && m[1] !== '?' && m[1] !== '_') out.add(m[1]);
	}
	return [...out];
}

/** Une lettre isolée dans une formule (`x`, `a`), hors commandes, unités et textes */
function hasLetterInMath(text: string): boolean {
	const maths = [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g)].map(
		(m) => m[1] ?? m[2] ?? ''
	);
	return maths.some((m) => {
		const t = m
			.replace(/\\(mathrm|text|textrm|operatorname|unit|textcolor|color|htmlStyle)\{[^{}]*\}/g, ' ')
			.replace(/\\[a-zA-Z]+/g, ' ');
		return /(?<![a-zA-Z])[a-zA-Z](?![a-zA-Z])/.test(t);
	});
}

function wordsOutsideMath(text: string): number {
	const t = text
		.replace(/\[figure[\s\S]*?\[\/figure\]/g, ' ')
		.replace(/\$\$[\s\S]*?\$\$/g, ' ')
		.replace(/\$[^$]*\$/g, ' ');
	return (t.match(/[A-Za-zÀ-ÿ'’]{2,}/g) ?? []).length;
}

// ============================================================================
// STATISTIQUES
// ============================================================================

function numStats(tokens: NumberToken[]) {
	if (tokens.length === 0) return null;
	const values = tokens.map((t) => t.value);
	const distinct = [...new Set(values)].sort((a, b) => a - b);
	const maxDec = Math.max(...tokens.map((t) => t.decimals));
	const maxAbs = Math.max(...values.map((v) => Math.abs(v)));
	return {
		min: distinct[0],
		max: distinct[distinct.length - 1],
		nb_distinctes: distinct.length,
		valeurs: distinct.length <= MAX_DISTINCT ? distinct : undefined,
		nature: maxDec > 0 ? 'décimal' : 'entier',
		decimales_max: maxDec,
		negatif_possible: tokens.some((t) => t.negative || t.value < 0),
		chiffres_partie_entiere_max: String(Math.floor(maxAbs)).length
	};
}

const NUM_RE = /^-?\d+(\.\d+)?$/;
const FRAC_RE = /^(-?\d+)\/(\d+)$|^\\d?frac\{(-?\d+)\}\{(-?\d+)\}$/;

/** Nature d'une variable ou d'une réponse d'après ses valeurs (chaînes) */
/** `$$893\,558$$` → `893558`, `0{,}5` → `0.5` : une valeur affichée lue comme un nombre */
function normValue(v: string): string {
	return v
		.trim()
		.replace(/^\$+|\$+$/g, '')
		.replace(/(\d)(?:\\,|\\ |~|\u00a0|\u202f)(?=\d{3})/g, '$1')
		.replace(/\{,\}/g, '.')
		.trim();
}

function valueStats(rawValues: string[]) {
	if (rawValues.length === 0) return null;
	const values = rawValues.map(normValue);
	const distinct = [...new Set(values)];
	const allNum = values.every((v) => NUM_RE.test(v.trim()));
	if (allNum) {
		const nums = values.map((v) => Number(v));
		const sorted = [...new Set(nums)].sort((a, b) => a - b);
		const maxDec = Math.max(...values.map((v) => (v.split('.')[1] ?? '').length));
		return {
			nature: maxDec > 0 ? 'décimal' : 'entier',
			decimales_max: maxDec,
			min: sorted[0],
			max: sorted[sorted.length - 1],
			negatif_possible: sorted[0] < 0,
			nb_distinctes: sorted.length,
			valeurs: sorted.length <= MAX_DISTINCT ? sorted : undefined
		};
	}
	const fr = values.map((v) => v.trim().match(FRAC_RE));
	if (fr.every((m) => m !== null)) {
		const pairs = fr.map((m) => {
			const mm = m as RegExpMatchArray;
			return { num: Number(mm[1] ?? mm[3]), den: Number(mm[2] ?? mm[4]) };
		});
		const vals = pairs.map((p) => p.num / p.den);
		const dens = [...new Set(pairs.map((p) => p.den))].sort((a, b) => a - b);
		return {
			nature: 'fraction',
			min: Math.min(...vals),
			max: Math.max(...vals),
			negatif_possible: pairs.some((p) => p.num < 0 || p.den < 0),
			denominateurs: dens.length <= MAX_DISTINCT ? dens : undefined,
			denominateur_min: dens[0],
			denominateur_max: dens[dens.length - 1],
			nb_distinctes: distinct.length,
			valeurs: distinct.length <= MAX_DISTINCT ? distinct.sort() : undefined
		};
	}
	// Mélange nombre / texte, ou expression : nombres contenus
	const someNum = values.filter((v) => NUM_RE.test(v.trim())).length;
	const inner = values.flatMap((v) => extractNumbers(v));
	return {
		nature: someNum > 0 ? 'mixte (nombre ou texte/expression)' : 'texte ou expression',
		part_numerique: someNum / values.length,
		nb_distinctes: distinct.length,
		valeurs: distinct.length <= MAX_DISTINCT ? distinct.sort() : undefined,
		exemples: distinct.length > MAX_DISTINCT ? distinct.slice(0, 12) : undefined,
		nombres_contenus: numStats(inner)
	};
}

function fracStats(fr: { num: number; den: number }[]) {
	if (fr.length === 0) return null;
	const dens = [...new Set(fr.map((f) => f.den))].sort((a, b) => a - b);
	const nums = [...new Set(fr.map((f) => f.num))].sort((a, b) => a - b);
	return {
		nb: fr.length,
		denominateurs: dens.length <= MAX_DISTINCT ? dens : undefined,
		denominateur_min: dens[0],
		denominateur_max: dens[dens.length - 1],
		numerateur_min: nums[0],
		numerateur_max: nums[nums.length - 1],
		superieure_a_1_possible: fr.some((f) => Math.abs(f.num) > Math.abs(f.den))
	};
}

function groupCounts(items: string[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const it of items) out[it] = (out[it] ?? 0) + 1;
	return out;
}

// ============================================================================
// ÉCHANTILLONNAGE D'UNE VARIATION
// ============================================================================

function sampleOne(
	template: ReturnType<typeof toQuestionTemplate>,
	v: number,
	seed: number
): Sample & { inst?: QuestionInstance } {
	const empty: Sample = {
		seed,
		ok: false,
		vars: {},
		text: '',
		answers: [],
		answerLabels: [],
		statementNumbers: [],
		answerNumbers: [],
		choiceNumbers: [],
		fractions: [],
		words: 0,
		figure: [],
		units: []
	};
	try {
		const res = generateInstance({ ...template, variations: [template.variations[v]] }, seed);
		if (!res.success) {
			return {
				...empty,
				error: (res.errors ?? []).join(' | ').slice(0, 300) || 'échec sans message'
			};
		}
		const inst = res.instance;
		const ctx: Ctx = { inst, figure: [] };
		let text = renderText(String(inst.statement), ctx, true);
		const answers: string[] = [];
		const answerLabels: string[] = [];
		const choiceTexts: string[] = [];
		if (inst.shuffledChoices?.length) {
			const correct = new Set(
				(Array.isArray(inst.correctChoiceIndex)
					? inst.correctChoiceIndex
					: inst.correctChoiceIndex !== undefined
						? [inst.correctChoiceIndex]
						: []
				).map(String)
			);
			text +=
				'\n\n' +
				inst.shuffledChoices
					.map((c, i) => {
						const t = renderText(String(c.content), ctx, false);
						choiceTexts.push(t);
						const isOk =
							correct.size > 0
								? correct.has(String(c.originalIndex))
								: inst.choices?.[c.originalIndex]?.isCorrect;
						if (isOk) {
							answers.push(t);
							answerLabels.push(`${LETTERS[i]}. ${t}`);
						}
						return `- ${LETTERS[i]}. ${t}`;
					})
					.join('\n');
		}
		for (const b of inst.blanks ?? []) {
			answers.push(b.expectedAnswer);
			answerLabels.push(b.expectedAnswer + (b.unit?.required ? ` [${b.unit.required}]` : ''));
		}
		// Figures et images exclues : leurs nombres (coordonnées, nom de fichier) ne sont pas lus
		const statementNumbers = extractNumbers(
			stripFigures(inst.shuffledChoices?.length ? text.split('\n\n- A.')[0] : text)
		);
		const answerNumbers = answers.flatMap((a) => extractNumbers(a));
		const choiceNumbers = choiceTexts.flatMap((c) => extractNumbers(c));
		const fractions = [
			...extractFractions(stripFigures(text)).map((f) => ({ ...f, where: 'enonce' as const })),
			...answers.flatMap((a) =>
				extractFractions(a).map((f) => ({ ...f, where: 'reponse' as const }))
			)
		];
		const vars = Object.fromEntries(
			(inst.resolvedVariables ?? []).map((rv) => [rv.name, rv.value])
		);
		return {
			seed,
			ok: true,
			vars,
			text,
			answers,
			answerLabels,
			statementNumbers,
			answerNumbers,
			choiceNumbers,
			fractions,
			words: wordsOutsideMath(text),
			figure: ctx.figure,
			units: [
				...unitsOf(String(inst.statement)),
				...(inst.blanks ?? []).flatMap((b) => (b.unit?.required ? [b.unit.required] : []))
			],
			inst
		};
	} catch (e) {
		return {
			...empty,
			error: ('exception : ' + ((e as Error).message ?? String(e))).slice(0, 300)
		};
	}
}

function analyseVariation(
	template: ReturnType<typeof toQuestionTemplate>,
	row: QuestionTemplateRow,
	v: number
) {
	const samples: Sample[] = [];
	let firstInst: QuestionInstance | undefined;
	for (let seed = 1; seed <= N_SEEDS; seed++) {
		const s = sampleOne(template, v, seed);
		if (s.inst && !firstInst) firstInst = s.inst;
		delete s.inst;
		samples.push(s);
	}
	const ok = samples.filter((s) => s.ok);
	const failed = samples.filter((s) => !s.ok);

	const rawVariation = (row.variations as unknown as Record<string, unknown>[])[v] ?? {};
	const rawShared = (row.shared ?? {}) as Record<string, unknown>;

	// Variables : nature d'après les valeurs tirées
	const varNames = [...new Set(ok.flatMap((s) => Object.keys(s.vars)))];
	const variables = varNames.map((name) => ({
		nom: name,
		valeurs_tirees: valueStats(ok.map((s) => s.vars[name]).filter((x) => x !== undefined))
	}));

	// Réponses : par case (ou bonne réponse de QCM)
	const nAnswers = Math.max(0, ...ok.map((s) => s.answers.length));
	const reponses = Array.from({ length: nAnswers }, (_, i) => ({
		case: i + 1,
		valeurs: valueStats(ok.map((s) => s.answers[i]).filter((x) => x !== undefined))
	}));

	// Format
	const inst = firstInst;
	const symbolFreq: Record<string, number> = {};
	for (const s of ok) {
		for (const [label, re] of SYMBOLS)
			if (re.test(s.text)) symbolFreq[label] = (symbolFreq[label] ?? 0) + 1;
		if (hasLetterInMath(s.text))
			symbolFreq['lettre dans les maths'] = (symbolFreq['lettre dans les maths'] ?? 0) + 1;
	}
	const isQcm = Boolean(inst?.shuffledChoices?.length);
	const blankTypes = [...new Set((inst?.blanks ?? []).map((b) => b.type))];
	const format = {
		type_modele: row.type,
		type_reponse: isQcm
			? inst?.multipleAnswers ||
				(Array.isArray(inst?.correctChoiceIndex) && inst.correctChoiceIndex.length > 1)
				? 'QCM (plusieurs réponses)'
				: 'QCM'
			: blankTypes.includes('graphical')
				? 'graphique (droite graduée)'
				: blankTypes.length
					? `saisie (${blankTypes.join(', ')})`
					: 'inconnu',
		nb_cases: inst?.blanks?.length ?? 0,
		nb_choix: inst?.shuffledChoices?.length ?? 0,
		cases_prerempies: (inst?.blanks ?? []).filter((b) => b.prefilled).length,
		answer_kind: [...new Set((inst?.blanks ?? []).map((b) => b.answerKind).filter(Boolean))],
		forme_exigee: (inst?.blanks ?? []).map((b) => b.requiredForm).filter(Boolean),
		symboles_affiches: Object.fromEntries(
			Object.entries(symbolFreq).map(([k, n]) => [k, `${n}/${ok.length}`])
		),
		unites: [...new Set(ok.flatMap((s) => s.units))],
		unite_attendue_dans_la_reponse: (inst?.blanks ?? []).some((b) => b.unit?.expected),
		figures: groupCounts(ok.flatMap((s) => [...new Set(s.figure)])),
		mots_hors_maths: ok.length
			? { min: Math.min(...ok.map((s) => s.words)), max: Math.max(...ok.map((s) => s.words)) }
			: null,
		contexte_probable: ok.length > 0 && ok.some((s) => s.words >= 15)
	};

	// Exemples : plus grande valeur, plus petite, puis trois énoncés différents
	const allNums = (s: Sample) =>
		[...s.statementNumbers, ...s.answerNumbers, ...s.choiceNumbers].map((t) => t.value);
	const withNums = ok.filter((s) => allNums(s).length > 0);
	const pick: { role: string; s: Sample }[] = [];
	if (withNums.length) {
		const byMax = withNums.reduce((a, b) =>
			Math.max(...allNums(b)) > Math.max(...allNums(a)) ? b : a
		);
		const byMin = withNums.reduce((a, b) =>
			Math.min(...allNums(b)) < Math.min(...allNums(a)) ? b : a
		);
		pick.push({ role: `plus grande valeur (${Math.max(...allNums(byMax))})`, s: byMax });
		if (byMin.seed !== byMax.seed)
			pick.push({ role: `plus petite valeur (${Math.min(...allNums(byMin))})`, s: byMin });
	}
	const seenText = new Set(pick.map((p) => p.s.text));
	for (const s of ok) {
		if (pick.length >= 5) break;
		if (seenText.has(s.text)) continue;
		seenText.add(s.text);
		pick.push({ role: 'tirage', s });
	}

	const errors = groupCounts(failed.map((s) => s.error ?? '?'));
	return {
		variation: v + 1,
		graines: `1..${N_SEEDS} (modèle réduit à la variation ${v + 1})`,
		declarations: {
			variables_shared: (rawShared.variables as unknown[]) ?? [],
			variables_variation: (rawVariation.variables as unknown[]) ?? [],
			conditions: rawVariation.conditions ?? rawShared.conditions ?? [],
			enonce_brut: rawVariation.statement || rawShared.statement || '',
			reponses_brutes: ((rawVariation.blanks as { expectedAnswer?: string }[]) ?? []).map(
				(b) => b.expectedAnswer
			),
			choix_bruts: rawVariation.choices ?? rawShared.choices ?? undefined
		},
		tirages: N_SEEDS,
		reussis: ok.length,
		echecs: failed.length,
		taux_echec: failed.length / N_SEEDS,
		erreurs: Object.keys(errors).length ? errors : undefined,
		enonces_distincts: new Set(ok.map((s) => s.text)).size,
		variables,
		reponse_attendue: reponses,
		nombres_enonce: numStats(ok.flatMap((s) => s.statementNumbers)),
		nombres_reponse: numStats(ok.flatMap((s) => s.answerNumbers)),
		nombres_choix_qcm: numStats(ok.flatMap((s) => s.choiceNumbers)),
		nombres_tous: numStats(
			ok.flatMap((s) => [...s.statementNumbers, ...s.answerNumbers, ...s.choiceNumbers])
		),
		fractions_enonce: fracStats(ok.flatMap((s) => s.fractions.filter((f) => f.where === 'enonce'))),
		fractions_reponse: fracStats(
			ok.flatMap((s) => s.fractions.filter((f) => f.where === 'reponse'))
		),
		format,
		exemples: pick.map((p) => ({
			role: p.role,
			graine: p.s.seed,
			enonce: p.s.text,
			reponse: p.s.answerLabels,
			variables: p.s.vars
		}))
	};
}

// ============================================================================
// PRINCIPAL
// ============================================================================

async function main(): Promise<void> {
	const csv = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
	const csvById = new Map<string, CsvRow[]>();
	for (const r of csv) csvById.set(r.template_id, [...(csvById.get(r.template_id) ?? []), r]);
	const ids = ONLY_IDS ?? [...csvById.keys()];

	if (argv.includes('--rafraichir') || !fs.existsSync(SNAPSHOT))
		await refreshSnapshot([...csvById.keys()]);
	const rows: QuestionTemplateRow[] = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
	const rowById = new Map(rows.map((r) => [r.id, r]));

	const index: string[] = [
		[
			'template_id',
			'titre',
			'sous_titre',
			'grades',
			'nb_variations',
			'tirages',
			'echecs',
			'variations_en_echec',
			'decision',
			'points_candidats',
			'multi_points'
		].join(';')
	];
	const t0 = Date.now();
	let done = 0;
	for (const id of ids) {
		const row = rowById.get(id);
		const csvRows = csvById.get(id) ?? [];
		const points = csvRows.map((r) => ({
			decision: r.decision,
			code: r.code,
			libelle_point: r.libelle_point,
			noeud_actuel: r.noeud_actuel,
			noeud_cible: r.noeud_cible,
			multi_points: r.multi_points,
			confiance: r.confiance,
			changement: r.changement
		}));
		const csvCell = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
		if (!row) {
			fs.writeFileSync(
				path.join(DIR, `${id}.json`),
				JSON.stringify(
					{ template_id: id, erreur: 'modèle absent de l’instantané', points_candidats: points },
					null,
					1
				)
			);
			index.push(
				[
					id,
					'',
					'',
					'',
					0,
					0,
					0,
					'',
					csvCell(points.map((p) => p.decision).join(',')),
					csvCell(points.map((p) => p.code).join(',')),
					''
				].join(';')
			);
			continue;
		}
		let template: ReturnType<typeof toQuestionTemplate> | undefined;
		let conversionError: string | undefined;
		try {
			template = toQuestionTemplate(row);
		} catch (e) {
			conversionError = (e as Error).message;
		}
		const variations = template
			? template.variations.map((_, v) => analyseVariation(template!, row, v))
			: [];
		const record = {
			template_id: id,
			titre: row.title,
			sous_titre: row.description,
			consigne: row.exercise_instruction,
			grades: row.grades,
			type: row.type,
			theme: [row.theme, row.domain, row.subdomain].filter(Boolean).join(' > '),
			mis_a_jour: row.updated_at,
			points_candidats: points,
			erreur_conversion: conversionError,
			nb_variations: variations.length,
			variations
		};
		fs.writeFileSync(path.join(DIR, `${id}.json`), JSON.stringify(record, null, 1));
		const echecs = variations.reduce((a, v) => a + v.echecs, 0);
		index.push(
			[
				id,
				csvCell(row.title ?? ''),
				csvCell(row.description ?? ''),
				csvCell((row.grades ?? []).join(',')),
				variations.length,
				variations.length * N_SEEDS,
				echecs + (conversionError ? 1 : 0),
				csvCell(
					variations
						.filter((v) => v.echecs > 0)
						.map((v) => `v${v.variation}:${v.echecs}`)
						.join(',')
				),
				csvCell(points.map((p) => p.decision).join(',')),
				csvCell(points.map((p) => p.code).join(',')),
				csvCell(points.map((p) => p.multi_points).join(' / '))
			].join(';')
		);
		done++;
		if (done % 25 === 0)
			console.log(`${done}/${ids.length} modèles, ${Math.round((Date.now() - t0) / 1000)} s`);
	}
	if (!ONLY_IDS) fs.writeFileSync(path.join(DIR, 'index.csv'), index.join('\n') + '\n');
	console.log(`fini : ${done} modèles en ${Math.round((Date.now() - t0) / 1000)} s`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
