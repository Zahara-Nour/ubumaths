/**
 * Avertissement : variable qui peut être négative, citée sans parenthèses
 * =======================================================================
 *
 * `{{a}}` est remplacé par sa valeur telle quelle : avec a = -3, `x-{{a}}` donne
 * `x--3`, `{{a}}^2` donne `-3^2` (lu -(3²)), `2{{a}}` donne `2-3` (un produit lu
 * comme une soustraction). La substitution ne change pas (décision du 2026-10-03 :
 * des modèles écrivent `{{a}}x{{b}}` en comptant sur le signe de b) ; on AVERTIT
 * l'auteur, sans toucher au verdict d'import.
 *
 * Seules les formules sont examinées (`$…$`, `$$…$$`, `~…~`, `~~…~~`, réponses
 * attendues) : dans le texte, `-{{a}}` relève de la rédaction, pas du calcul.
 * « Peut être négative » se lit sur les tirages réels (plage ou valeur calculée).
 */

import type { QuestionTemplate, ResolvedVariable } from '../types';
import { tokenize } from '$lib/ubumark';

// ============================================================================
// TYPES
// ============================================================================

/** Variables d'un tirage réussi, pour une variation seule */
export interface VariableDraw {
	variationIndex: number;
	seed: number;
	variables: readonly ResolvedVariable[];
}

/** Texte d'auteur à examiner, avec sa place dans le modèle */
interface Source {
	where: string;
	text: string;
	/** Tout le texte est une formule (réponse attendue, format de réponse) */
	math: boolean;
}

/** Ce que les tirages disent d'une variable */
interface Sign {
	negative?: { value: string; seed: number };
	nonNegative: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Formules d'un texte markdown, comme les lit ubumark (`math-extractor.ts`) */
const MATH_ZONES = [
	/(?<!\\)\$\$([\s\S]+?)\$\$/g,
	/(?<!\\)(?<!~)~~(?!~)([\s\S]+?)(?<!~)~~(?!~)/g,
	/(?<!\\)\$([^$\n]+)\$/g,
	/(?<!\\)~([^~\n]+)~(?!~)/g
];

/** Degrés : `-30^\circ` se lit bien -30° */
const DEGREES = /^\s*\^\s*(\\circ|\{\s*\\circ\s*\})/;

// ============================================================================
// FUNCTIONS
// ============================================================================

function isNegative(value: string): boolean {
	return /^\s*-/.test(value) || Number(value) < 0;
}

/** Signe de chaque variable d'une variation, sur ses tirages */
function signsOf(draws: readonly VariableDraw[]): Map<string, Sign> {
	const signs = new Map<string, Sign>();
	for (const draw of draws) {
		for (const variable of draw.variables) {
			const shown = variable.displayValue ?? variable.value;
			const sign = signs.get(variable.name) ?? { nonNegative: false };
			if (isNegative(String(variable.value))) {
				sign.negative ??= { value: String(shown), seed: draw.seed };
			} else {
				sign.nonNegative = true;
			}
			signs.set(variable.name, sign);
		}
	}
	return signs;
}

/** Textes d'une variation (champs partagés repris quand la variation ne les redéfinit pas) */
function sourcesOf(template: QuestionTemplate, index: number): Source[] {
	const variation = template.variations[index];
	const shared = template.shared ?? {};
	const sources: Source[] = [];
	const markdown = (where: string, text: unknown) => {
		if (typeof text === 'string') sources.push({ where, text, math: false });
	};
	const math = (where: string, text: unknown) => {
		if (typeof text === 'string') sources.push({ where, text, math: true });
	};
	markdown('consigne', template.exerciseInstruction);
	markdown('énoncé', variation.statement ?? shared.statement);
	const correction = variation.correction ?? shared.correction;
	for (const step of correction?.steps ?? []) markdown('correction', step);
	for (const feedback of Object.values(correction?.feedback ?? {})) markdown('retour', feedback);
	for (const choice of variation.choices ?? shared.choices ?? []) markdown('choix', choice.content);
	for (const blank of variation.blanks ?? []) {
		math('réponse attendue', blank.expectedAnswer);
		math('case pré-remplie', blank.prefilled);
	}
	const formats = { ...shared.answerFormats, ...variation.answerFormats };
	for (const format of Object.values(formats)) math('format de réponse', format);
	return sources;
}

/** Plages [début, fin[ du CONTENU des formules d'un texte */
function mathRanges(source: Source): [number, number][] {
	if (source.math) return [[0, source.text.length]];
	// Chaque zone trouvée est masquée avant la suivante (un `$` d'un bloc n'ouvre rien)
	let masked = source.text;
	const ranges: [number, number][] = [];
	for (const regex of MATH_ZONES) {
		masked = masked.replace(regex, (whole: string, content: string, offset: number) => {
			const start = offset + whole.indexOf(content);
			ranges.push([start, start + content.length]);
			return '\uE000'.repeat(whole.length);
		});
	}
	return ranges;
}

/**
 * Pourquoi la valeur négative citée à cet endroit s'affiche mal, ou `null`.
 * `juxtaposed` : collée à un chiffre, une lettre ou une parenthèse (produit implicite).
 */
function problemAt(
	before: string,
	after: string,
	sign: Sign
): { reason: string; juxtaposed: boolean } | null {
	if (/^\s*\^/.test(after) && !DEGREES.test(after)) {
		return { reason: 'la puissance porte sur le nombre sans son signe', juxtaposed: false };
	}
	const trimmed = before.trimEnd();
	if (trimmed.endsWith('^')) return { reason: 'exposant sans accolades', juxtaposed: false };
	if (/(\\times|\\cdot|\*)$/.test(trimmed)) {
		return { reason: 'deux signes d’opération se suivent', juxtaposed: false };
	}
	if (/[-+]$/.test(trimmed)) return { reason: 'deux signes se suivent', juxtaposed: false };
	// Produit implicite : seulement si la variable prend les deux signes. Toujours
	// négative, c'est l'écriture d'un terme signé (`3x^2{{b}}x` → `3x^2-4x`), voulue.
	const command = /\\[a-zA-Z]+$/.test(before);
	if (!command && /[\p{L}\d)]$/u.test(before) && sign.nonNegative) {
		return { reason: 'un produit se lit comme une soustraction', juxtaposed: true };
	}
	return null;
}

/**
 * Avertissements, en français, une fois par citation fautive (toutes variations
 * confondues), avec un exemple de rendu sur un tirage réel et la correction.
 */
export function findUnparenthesizedNegatives(
	template: QuestionTemplate,
	draws: readonly VariableDraw[]
): string[] {
	const warnings = new Map<string, string>();
	template.variations.forEach((_variation, index) => {
		const signs = signsOf(draws.filter((draw) => draw.variationIndex === index));
		for (const source of sourcesOf(template, index)) {
			const ranges = mathRanges(source);
			for (const token of tokenize(source.text)) {
				if (token.type !== 'variable') continue;
				const sign = signs.get(token.inner);
				if (!sign?.negative) continue;
				const range = ranges.find(([start, end]) => token.start >= start && token.end <= end);
				if (!range) continue;
				const before = source.text.slice(range[0], token.start);
				const after = source.text.slice(token.end, range[1]);
				const problem = problemAt(before, after, sign);
				if (!problem) continue;

				const from = Math.max(range[0], token.start - 12);
				const to = Math.min(range[1], token.end + 4);
				const quoted = source.text.slice(from, to).trim();
				const key = `${source.where}|${quoted}|${token.inner}`;
				if (warnings.has(key)) continue;
				const { value, seed } = sign.negative;
				const shown =
					source.text.slice(from, token.start) + value + source.text.slice(token.end, to);
				const name = token.inner;
				const fix = problem.juxtaposed
					? `Facteur : {{${name};()}} (parenthèses si négatif) ; terme signé : {{${name};+}}`
					: `Écrire {{${name};()}} (parenthèses si négatif) ou {{eval:…}}`;
				warnings.set(
					key,
					`${source.where}, variation ${index + 1} : {{${name}}} peut être négatif ` +
						`(${name} = ${value}, tirage ${seed}) — « ${quoted} » s'affiche « ${shown.trim()} » ` +
						`(${problem.reason}). ${fix}.`
				);
			}
		}
	});
	return [...warnings.values()];
}
