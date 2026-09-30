/**
 * Retouches ciblées de modèles déjà en base
 * =========================================
 *
 * Une retouche = une fonction PURE modèle → modèle, avec une note en français.
 * Elle s'applique à la ligne de prod COURANTE ; chaque remplacement de texte
 * exige de trouver exactement le texte attendu (sinon la retouche lève une
 * erreur : la ligne a changé depuis la relecture, rien n'est écrit).
 *
 * Défauts relevés par les agents de corrections (docs/wip/corrections-strategies-progress.md),
 * vérifiés sur la prod (lecture seule) le 2026-09-30. Écartés après vérification :
 * - 294c4316 (facteur commun) : `c` est tiré premier avec `b` (`!cd(b)`), donc les
 *   diviseurs communs de a×b et a×c sont EXACTEMENT les diviseurs de a : la règle
 *   `divisor` de `{{a}}` est déjà juste (300 tirages : pgcd(b, c) = 1 à chaque fois) ;
 * - 579d0b00, ed5f5f52 (sommes) : la description dit « un nombre ayant un seul chiffre
 *   non nul », les unités en font partie, et ed5f5f52 a une spec « 7996 + 8 » : d = 0
 *   est voulu.
 */

import type { QuestionTemplate, QuestionVariation } from '../../../src/lib/questions/types';
import { templateMarkdown } from '../../../src/lib/ubumark';

// ============================================================================
// TYPES
// ============================================================================

export interface Retouche {
	templateId: string;
	/** Ce que fait la retouche, en français (affiché dans la simulation) */
	note: string;
	apply: (template: QuestionTemplate) => QuestionTemplate;
}

/** Colonnes qu'une retouche peut modifier (toute autre modification est refusée) */
export const PATCHABLE_COLUMNS = ['title', 'variations', 'shared', 'test_specs'] as const;
export type PatchableColumn = (typeof PATCHABLE_COLUMNS)[number];

// ============================================================================
// HELPERS — TEXTE
// ============================================================================

/** Remplace `from` par `to` ; exige exactement `count` occurrences (1 par défaut) */
export function replaceExact(text: string, from: string, to: string, count = 1): string {
	const found = text.split(from).length - 1;
	if (found !== count) {
		throw new Error(
			`texte attendu trouvé ${found} fois (au lieu de ${count}) : « ${from.slice(0, 80)} »`
		);
	}
	return text.split(from).join(to);
}

function identifier(name: string): RegExp {
	return new RegExp(`(?<![\\\\A-Za-z0-9_])${name}(?![A-Za-z0-9_])`, 'g');
}

/** Renomme une variable dans une EXPRESSION (aucune prose) : `{{e}}` et l'identifiant nu */
export function renameInExpression(expression: string, from: string, to: string): string {
	return expression.split(`{{${from}}}`).join(`{{${to}}}`).replace(identifier(from), to);
}

/** Fin (exclue) du groupe ouvert par `{{` à la position `start` : accolades équilibrées */
function closingIndex(text: string, start: number): number {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') {
			depth--;
			if (depth === 0) return i + 1;
		}
	}
	throw new Error(`accolades non refermées après la position ${start}`);
}

/**
 * Renomme une variable dans un TEXTE (énoncé, étape, réponse) : seulement dans les
 * directives — `{{e}}`, le contenu de `{{eval:…}}`, la condition de `{{if:…|`.
 * La prose n'est jamais touchée (« le », « rée »…).
 */
export function renameInText(text: string, from: string, to: string): string {
	let out = '';
	let i = 0;
	while (i < text.length) {
		const isEval = text.startsWith('{{eval:', i);
		const isIf = text.startsWith('{{if:', i);
		if (!isEval && !isIf) {
			if (text.startsWith(`{{${from}}}`, i)) {
				out += `{{${to}}}`;
				i += from.length + 4;
			} else {
				out += text[i];
				i++;
			}
			continue;
		}
		const prefix = isEval ? '{{eval:' : '{{if:';
		const end = closingIndex(text, i);
		const inner = text.slice(i + prefix.length, end - 2);
		if (isEval) {
			out += prefix + renameInExpression(renameInText(inner, from, to), from, to) + '}}';
		} else {
			// Condition = jusqu'au premier `|` hors accolades imbriquées
			let depth = 0;
			let bar = -1;
			for (let k = 0; k < inner.length; k++) {
				if (inner[k] === '{') depth++;
				else if (inner[k] === '}') depth--;
				else if (inner[k] === '|' && depth === 0) {
					bar = k;
					break;
				}
			}
			if (bar === -1) throw new Error(`{{if:}} sans « | » : ${inner.slice(0, 60)}`);
			out +=
				prefix +
				renameInExpression(inner.slice(0, bar), from, to) +
				renameInText(inner.slice(bar), from, to) +
				'}}';
		}
		i = end;
	}
	return out;
}

/** Toutes les chaînes « expression » et « texte » d'une variation (pour contrôle) */
function variationStrings(variation: Partial<QuestionVariation>): {
	expressions: string[];
	texts: string[];
} {
	return {
		expressions: [
			...(variation.variables ?? []).flatMap((v) => [v.name, v.expression]),
			...(variation.conditions ?? [])
		],
		texts: [
			variation.statement ?? '',
			...(variation.blanks ?? []).map((b) => String(b.expectedAnswer ?? '')),
			...(variation.correction?.steps ?? []).map(String),
			...(variation.choices ?? []).map((c) => String(c.content))
		]
	};
}

/** La variable `name` est-elle encore référencée quelque part ? */
export function referencesVariable(template: QuestionTemplate, name: string): boolean {
	const parts = [template.shared ?? {}, ...template.variations].map((v) =>
		variationStrings(v as Partial<QuestionVariation>)
	);
	const inExpression = parts.some((p) => p.expressions.some((e) => identifier(name).test(e)));
	// Dans un texte : renommer vers une sentinelle ne doit rien changer
	const inText = parts.some((p) => p.texts.some((t) => renameInText(t, name, '§') !== t));
	const inSpecs = (template.testSpecs ?? []).some((s) => name in (s.variables ?? {}));
	return inExpression || inText || inSpecs;
}

function mapVariationLike<T extends Partial<QuestionVariation>>(
	variation: T,
	from: string,
	to: string
): T {
	return {
		...variation,
		...(variation.statement !== undefined && {
			statement: templateMarkdown(renameInText(variation.statement, from, to))
		}),
		...(variation.variables && {
			variables: variation.variables.map((v) => ({
				...v,
				name: v.name === from ? to : v.name,
				expression: renameInExpression(v.expression, from, to)
			}))
		}),
		...(variation.conditions && {
			conditions: variation.conditions.map((c) => renameInExpression(c, from, to))
		}),
		...(variation.blanks && {
			blanks: variation.blanks.map((b) => ({
				...b,
				expectedAnswer: renameInText(String(b.expectedAnswer), from, to)
			}))
		}),
		...(variation.correction && {
			correction: {
				...variation.correction,
				steps: (variation.correction.steps ?? []).map((s) =>
					templateMarkdown(renameInText(String(s), from, to))
				)
			}
		})
	};
}

/**
 * Renomme une variable PARTOUT : déclaration, expressions, conditions, énoncés,
 * réponses, étapes de correction (dont `{{if:}}`), clés `variables` des specs.
 * Refuse si le nouveau nom est pris ou si une référence subsiste.
 */
export function renameVariable(
	template: QuestionTemplate,
	from: string,
	to: string
): QuestionTemplate {
	if (referencesVariable(template, to)) throw new Error(`variable « ${to} » déjà utilisée`);
	const renamed: QuestionTemplate = {
		...template,
		shared: template.shared && mapVariationLike(template.shared, from, to),
		variations: template.variations.map((v) => mapVariationLike(v, from, to)),
		testSpecs: template.testSpecs?.map((spec) =>
			spec.variables && from in spec.variables
				? {
						...spec,
						variables: Object.fromEntries(
							Object.entries(spec.variables).map(([k, v]) => [k === from ? to : k, v])
						)
					}
				: spec
		)
	};
	if (referencesVariable(renamed, from)) throw new Error(`« ${from} » encore référencée`);
	return renamed;
}

// ============================================================================
// HELPERS — MODÈLE
// ============================================================================

function mapSteps(
	template: QuestionTemplate,
	transform: (step: string, variationIndex: number, stepIndex: number) => string
): QuestionTemplate {
	return {
		...template,
		variations: template.variations.map((variation, vi) => {
			if (!variation.correction) throw new Error(`variation ${vi} sans correction`);
			return {
				...variation,
				correction: {
					...variation.correction,
					steps: (variation.correction.steps ?? []).map((s, si) =>
						templateMarkdown(transform(String(s), vi, si))
					)
				}
			};
		})
	};
}

function setExpectedAnswer(
	template: QuestionTemplate,
	variationIndex: number,
	from: string,
	to: string
): QuestionTemplate {
	return {
		...template,
		variations: template.variations.map((variation, vi) => {
			if (vi !== variationIndex) return variation;
			const blanks = variation.blanks ?? [];
			if (blanks.length !== 1 || blanks[0].expectedAnswer !== from) {
				throw new Error(`variation ${vi} : réponse attendue inattendue`);
			}
			return { ...variation, blanks: [{ ...blanks[0], expectedAnswer: to }] };
		})
	};
}

function retitle(template: QuestionTemplate, from: string, to: string): QuestionTemplate {
	if (template.title !== from) throw new Error(`titre inattendu : « ${template.title} »`);
	return { ...template, title: to };
}

// ============================================================================
// RETOUCHES
// ============================================================================

const E_NOTE = (to: string) =>
	`Variable \`e\` (lue comme la constante d'Euler dans un calcul) renommée \`${to}\` partout.`;

/** accbfd16, 7c642d2f : `e` → `u` ; `{{eval:{{e}}}}` (contournement) → `{{u}}`, rendu identique */
function renameUnitsDigit(template: QuestionTemplate): QuestionTemplate {
	const renamed = renameVariable(template, 'e', 'u');
	return mapSteps(renamed, (step) => step.split('{{eval:{{u}}}}').join('{{u}}'));
}

const DD7_OLD_TEXT =
	"On écrit ${{a}}$ avec le dénominateur $\\textcolor{{{color:primary.1}}}{10}$ : ${{a}} = \\dfrac{2}{10}$. Le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.";
const DD7_NEW_TEXT =
	"Le dénominateur $5$ n'est pas $10$, $100$ ou $1000$. Comme $5 \\times \\textcolor{{{color:primary.1}}}{2} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{2}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.";
const DD7_OLD_CALC = '$$\\begin{align} \\dfrac{2}{10} &= {{solution}} \\end{align}$$';
const DD7_NEW_CALC =
	'$$\\begin{align} \\dfrac{1}{5} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{2}}{5 \\times \\textcolor{{{color:primary.1}}}{2}} \\\\ &= \\dfrac{2}{10} \\\\ &= {{solution}} \\end{align}$$';

function dropTwoTenths(template: QuestionTemplate): QuestionTemplate {
	const variation = template.variations[0];
	const variables = (variation.variables ?? []).map((v) =>
		v.name === 'a' ? { ...v, expression: replaceExact(v.expression, '|2/10|', '|') } : v
	);
	const withList: QuestionTemplate = {
		...template,
		variations: [{ ...variation, variables }]
	};
	return mapSteps(withList, (step, _vi, si) => {
		if (si === 1) return replaceExact(step, DD7_OLD_TEXT, DD7_NEW_TEXT);
		if (si === 2) return replaceExact(step, DD7_OLD_CALC, DD7_NEW_CALC);
		return step;
	});
}

const TENTH = '\\dfrac{{{b}}}{10}';
const HUNDREDTH = '\\dfrac{{{c}}}{100}';
const THOUSANDTH = '\\dfrac{{{d}}}{1000}';

function dropNullTerms(ranks: 2 | 3): (template: QuestionTemplate) => QuestionTemplate {
	return (template) => {
		const tail = ranks === 3 ? ` + ${THOUSANDTH}` : '';
		const full = `{{a}} + ${TENTH} + ${HUNDREDTH}${tail}`;
		// Variation 1 : b = 0 (pas de dixièmes) ; variation 2 : c = 0 (pas de centièmes)
		const noTenths = setExpectedAnswer(template, 1, full, `{{a}} + ${HUNDREDTH}${tail}`);
		return setExpectedAnswer(noTenths, 2, full, `{{a}} + ${TENTH}${tail}`);
	};
}

/** 33b1b496 v0-v1 : `r` redéclaré avec exclusion de `p` (la variation prime sur `shared`) */
function excludeRFromP(template: QuestionTemplate): QuestionTemplate {
	const sharedR = template.shared?.variables?.find((v) => v.name === 'r');
	if (sharedR?.expression !== 'a|b|c|x|y') throw new Error('variable partagée `r` inattendue');
	if (template.variations.slice(0, 2).some((v) => v.variables?.some((x) => x.name === 'r'))) {
		throw new Error('`r` déjà redéclarée dans une variation');
	}
	return {
		...template,
		variations: template.variations.map((variation, vi) =>
			vi > 1
				? variation
				: {
						...variation,
						variables: [{ name: 'r', expression: 'a|b|c|x|y!p' }, ...(variation.variables ?? [])]
					}
		)
	};
}

/** ff8082bd : `b` n'est utilisée nulle part */
function dropUnusedB(template: QuestionTemplate): QuestionTemplate {
	const without: QuestionTemplate = {
		...template,
		shared: template.shared && {
			...template.shared,
			variables: template.shared.variables?.filter((v) => v.name !== 'b')
		},
		testSpecs: template.testSpecs?.map((spec) => {
			if (!spec.variables) return spec;
			const { b: _b, ...rest } = spec.variables;
			return { ...spec, variables: rest };
		})
	};
	if (template.shared?.variables?.length === without.shared?.variables?.length) {
		throw new Error('variable `b` absente');
	}
	if (referencesVariable(without, 'b')) throw new Error('`b` est référencée');
	return without;
}

function removeThinSpaces(template: QuestionTemplate): QuestionTemplate {
	let removed = 0;
	const out = mapSteps(template, (step) => {
		removed += step.split('\\;').length - 1;
		return step.split('\\;').join('');
	});
	if (removed === 0) throw new Error('aucun `\\;` dans les étapes');
	return out;
}

const trimTitle = (template: QuestionTemplate): QuestionTemplate => {
	if (template.title === template.title.trim()) throw new Error('titre déjà sans espace final');
	return { ...template, title: template.title.trim() };
};

/** R-DEC-RANG dont le titre finit par une espace (relevé en prod le 2026-09-30) */
export const R_DEC_RANG_TRAILING_SPACE = [
	'3bbe92f2-84f0-487f-9ca1-2077248a313b',
	'a0241952-7930-4e8a-aa6c-2a5b8bef664a',
	'f1a392f5-060d-4e1c-b7a5-2920a054b83b',
	'b100ddb2-e91d-402c-9940-012da8236d1d',
	'7d57fb3b-a050-4920-8231-e5ac609fa07d',
	'6a16303a-acb1-46c4-aed2-ebae62cb5c32',
	'b9a9048a-d973-47a3-ad5b-acbde2d80a66'
];

export const RETOUCHES: Retouche[] = [
	{
		templateId: 'accbfd16-cfcb-4256-a4db-c2f9383b5feb',
		note: `${E_NOTE('u')} \`{{eval:{{e}}}}\` devient \`{{u}}\` (rendu identique).`,
		apply: renameUnitsDigit
	},
	{
		templateId: '7c642d2f-7060-45bf-bce7-9192925ff49c',
		note: `${E_NOTE('u')} \`{{eval:{{e}}}}\` devient \`{{u}}\` (rendu identique).`,
		apply: renameUnitsDigit
	},
	{
		templateId: '13d52989-fff8-4da6-a189-1f589cd53355',
		note: `${E_NOTE('n')} (le nombre à quatre chiffres).`,
		apply: (template) => renameVariable(template, 'e', 'n')
	},
	{
		templateId: 'dd7db98e-2c46-4b1f-9501-edfa5b161ac1',
		note: '2/10 retiré de la liste (même valeur que 1/5) ; la branche commune devient la correction de 1/5 (amplification par 2, comme 1/2 et 1/4).',
		apply: dropTwoTenths
	},
	{
		templateId: '160f782d-c2ee-4d54-a8f9-86f52418abe9',
		note: 'Réponse attendue sans terme nul (variation 2 : sans 0/10, variation 3 : sans 0/100), comme la fin de la correction ; la consigne ne demande pas chaque rang.',
		apply: dropNullTerms(2)
	},
	{
		templateId: '58f7a8dd-b8de-48f4-9cfa-5356b75e1c64',
		note: 'Réponse attendue sans terme nul (variation 2 : sans 0/10, variation 3 : sans 0/100), comme la fin de la correction ; la consigne ne demande pas chaque rang.',
		apply: dropNullTerms(3)
	},
	{
		templateId: '33b1b496-0de3-47bb-b19a-ff016fd08ef5',
		note: 'Variations 1-2 : la lettre en facteur `r` ne peut plus être égale à `p` (exclusion `!p`).',
		apply: excludeRFromP
	},
	{
		templateId: 'ff8082bd-fe4d-4747-bddc-19eced72839f',
		note: 'Variable `b` inutilisée retirée (et des specs).',
		apply: dropUnusedB
	},
	{
		templateId: '07bce646-6a88-4b7c-aaf6-fe07ffa63ed6',
		note: 'Titre : il s’agit d’opérations sur les limites, pas de la limite d’une suite.',
		apply: (template) =>
			retitle(template, "Déterminer la limite d'une suite", 'Opérations sur les limites')
	},
	...R_DEC_RANG_TRAILING_SPACE.map((templateId) => ({
		templateId,
		note: 'R-DEC-RANG : espace finale du titre retirée.',
		apply: trimTitle
	})),
	{
		templateId: '14a51794-8825-4297-9858-083fad48ab8c',
		note: 'Espaces fines `\\;` parasites retirées des étapes de correction.',
		apply: removeThinSpaces
	},
	{
		templateId: 'bd21a9d7-142a-47a0-be18-7719b58934ea',
		note: 'Espaces fines `\\;` parasites retirées des étapes de correction.',
		apply: removeThinSpaces
	}
];

// ============================================================================
// COLONNES ET DIFF
// ============================================================================

/** JSON à clés triées : jsonb réordonne les clés, la comparaison doit l'ignorer */
export function canonical(value: unknown): string {
	return JSON.stringify(value, (_key, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(
					Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
				)
			: v
	);
}

/** Valeur de colonne d'un modèle (undefined → null, comme en base) */
export function columnValue(template: QuestionTemplate, column: PatchableColumn): unknown {
	switch (column) {
		case 'title':
			return template.title;
		case 'variations':
			return template.variations;
		case 'shared':
			return template.shared ?? null;
		case 'test_specs':
			return template.testSpecs ?? null;
	}
}

/**
 * Colonnes modifiées par la retouche ; refuse toute modification hors des
 * colonnes autorisées (une retouche ne touche ni statut, ni niveau, ni thème…).
 */
export function changedColumns(
	before: QuestionTemplate,
	after: QuestionTemplate
): Partial<Record<PatchableColumn, unknown>> {
	const patchable = new Set<string>(['title', 'variations', 'shared', 'testSpecs']);
	for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
		if (patchable.has(key)) continue;
		const k = key as keyof QuestionTemplate;
		if (canonical(before[k] ?? null) !== canonical(after[k] ?? null)) {
			throw new Error(`champ « ${key} » modifié : hors des colonnes autorisées`);
		}
	}
	const changed: Partial<Record<PatchableColumn, unknown>> = {};
	for (const column of PATCHABLE_COLUMNS) {
		const value = columnValue(after, column);
		if (canonical(columnValue(before, column)) !== canonical(value)) changed[column] = value;
	}
	return changed;
}

function leaves(value: unknown, path: string, out: Map<string, string>): void {
	if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			leaves(child, path ? `${path}.${key}` : key, out);
		}
		if (Object.keys(value as object).length === 0) out.set(path, JSON.stringify(value));
	} else {
		out.set(path, value === undefined ? 'undefined' : JSON.stringify(value));
	}
}

/** Portion différente de deux textes, avec un peu de contexte */
function excerpt(a: string, b: string, context = 40): [string, string] {
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}
	const from = Math.max(0, start - context);
	const cut = (text: string, end: number) =>
		`${from > 0 ? '…' : ''}${text.slice(from, end + context)}${end + context < text.length ? '…' : ''}`;
	return [cut(a, endA), cut(b, endB)];
}

/** Diff lisible, feuille par feuille, des colonnes modifiées */
export function readableDiff(before: QuestionTemplate, after: QuestionTemplate): string[] {
	const lines: string[] = [];
	for (const [column, value] of Object.entries(changedColumns(before, after))) {
		const old = new Map<string, string>();
		const neu = new Map<string, string>();
		leaves(columnValue(before, column as PatchableColumn), column, old);
		leaves(value, column, neu);
		for (const path of new Set([...old.keys(), ...neu.keys()])) {
			const a = old.get(path);
			const b = neu.get(path);
			if (a === b) continue;
			if (a !== undefined && b !== undefined) {
				const [ea, eb] = excerpt(a, b);
				lines.push(`    ~ ${path}`, `      - ${ea}`, `      + ${eb}`);
			} else if (a !== undefined) lines.push(`    - ${path} : ${a.slice(0, 160)}`);
			else lines.push(`    + ${path} : ${(b ?? '').slice(0, 160)}`);
		}
	}
	return lines;
}
