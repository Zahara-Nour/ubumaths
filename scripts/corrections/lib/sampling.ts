/**
 * Tirages d'une variation : tout le domaine quand c'est possible
 * ==============================================================
 *
 * Une branche de correction (`{{if:…}}`) choisie sur 300 graines peut manquer un
 * cas rare ; un vérificateur qui tire 50 graines aussi. On ÉNUMÈRE donc toutes les
 * combinaisons des variables aléatoires de la variation quand le domaine compte au
 * plus `EXHAUSTIVE_MAX` combinaisons ; sinon, `SEED_FALLBACK` graines au moins.
 *
 * Variables énumérées : intervalles entiers `2..8`, bornes calculées
 * (`{{eval:11-b}}..9`, `0..4-a`), unions `1..9|11..99`, listes `0.1|0.01`, signe
 * `;±`. Toute autre écriture aléatoire (`digits:m.q`, exclusions `!cd(a)`…) fait
 * repasser aux graines, raison à l'appui.
 *
 * Garde-fou : l'énumération est confrontée au VRAI générateur (`SAMPLE_CHECK`
 * graines) ; un tirage réel absent du domaine énuméré fait repasser aux graines
 * (le domaine a été mal lu).
 */

import type {
	GenerationResult,
	QuestionTemplate,
	ResolvedVariable
} from '../../../src/lib/questions/types';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { generateInstanceWithFixedVariables } from '../../../src/lib/questions/generator/test-instance-builder';
import { resolveExpression } from '../../../src/lib/questions/generator/content-resolver';
import { evaluateConditions } from '../../../src/lib/questions/generator/condition-evaluator';
import { mergedVariables } from './operation';

// ============================================================================
// TYPES
// ============================================================================

export interface Sampling {
	mode: 'exhaustive' | 'seeds';
	/** Combinaisons énumérées (avant conditions) ou graines tirées */
	size: number;
	/** Pourquoi l'énumération n'a pas été faite */
	reason?: string;
}

export interface Draw {
	/** `a=3, b=7` ou `graine 12` */
	label: string;
	result: GenerationResult;
}

export interface DrawPlan {
	sampling: Sampling;
	draws: Iterable<Draw>;
}

type Combination = Record<string, string>;

class UnsupportedDomain extends Error {}

// ============================================================================
// CONSTANTS
// ============================================================================

export const EXHAUSTIVE_MAX = 20_000;
export const SEED_FALLBACK = 5_000;
const SAMPLE_CHECK = 200;

// ============================================================================
// DOMAIN PARSING
// ============================================================================

/** Découpe sur `separator` hors `{{…}}` et parenthèses */
function splitTopLevel(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '{' || char === '(') depth++;
		else if (char === '}' || char === ')') depth--;
		else if (depth === 0 && text.startsWith(separator, i)) {
			parts.push(text.slice(start, i));
			start = i + separator.length;
			i += separator.length - 1;
		}
	}
	parts.push(text.slice(start));
	return parts.map((part) => part.trim());
}

/** Variable aléatoire (sinon : calculée par le pipeline) */
export function isRandomExpression(expression: string): boolean {
	const trimmed = expression.trim();
	if (/^(digits|random):/.test(trimmed) || trimmed.includes('{{random')) return true;
	return splitTopLevel(trimmed, '..').length > 1 || splitTopLevel(trimmed, '|').length > 1;
}

/** Valeur entière d'une borne (`9`, `{{eval:11-b}}`, `{{b}}`, `4-a`) */
function evaluateBound(bound: string, resolved: ResolvedVariable[]): number {
	const evalMatch = bound.match(/^\{\{eval:(.+)\}\}$/);
	const variableMatch = bound.match(/^\{\{(\w+)\}\}$/);
	const inner = evalMatch ? evalMatch[1] : variableMatch ? variableMatch[1] : bound;
	if (!/^[\w\s+\-*/().]+$/.test(inner)) throw new UnsupportedDomain(`borne « ${bound} »`);
	let value: number;
	try {
		value = Number(resolveExpression(`{{eval:${inner}}}`, resolved));
	} catch {
		throw new UnsupportedDomain(`borne « ${bound} »`);
	}
	if (!Number.isInteger(value)) throw new UnsupportedDomain(`borne « ${bound} » non entière`);
	return value;
}

/** Valeurs possibles d'une variable aléatoire, les précédentes étant fixées */
export function domainValues(expression: string, resolved: ResolvedVariable[]): string[] {
	let body = expression.trim();
	let signed = false;
	if (body.endsWith(';±')) {
		signed = true;
		body = body.slice(0, -2).trim();
	}
	if (/^(digits|random):/.test(body) || body.includes(';') || body.includes('!')) {
		throw new UnsupportedDomain(`« ${expression} »`);
	}
	const values = new Set<string>();
	for (const part of splitTopLevel(body, '|')) {
		const range = splitTopLevel(part, '..');
		if (range.length === 2) {
			const min = evaluateBound(range[0], resolved);
			const max = evaluateBound(range[1], resolved);
			for (let k = min; k <= max; k++) {
				if (signed) {
					values.add(String(k));
					values.add(String(-k));
				} else values.add(String(k));
			}
		} else if (range.length === 1 && /^-?\d+(\.\d+)?$/.test(part)) {
			values.add(part);
			if (signed) values.add(String(-Number(part)));
		} else {
			throw new UnsupportedDomain(`« ${expression} »`);
		}
	}
	return [...values];
}

/**
 * Toutes les combinaisons des variables aléatoires de la variation, ou une
 * raison de ne pas énumérer (écriture non lue, domaine > `limit`).
 */
export function enumerateCombinations(
	template: QuestionTemplate,
	variationIndex: number,
	limit = EXHAUSTIVE_MAX
): { combinations: Combination[]; randomNames: string[] } | { reason: string } {
	const variables = mergedVariables(template, variationIndex);
	const randomNames = variables.filter((v) => isRandomExpression(v.expression)).map((v) => v.name);
	const combinations: Combination[] = [];
	const walk = (index: number, resolved: ResolvedVariable[], current: Combination): void => {
		if (combinations.length > limit) return;
		if (index === variables.length) {
			combinations.push({ ...current });
			return;
		}
		const variable = variables[index];
		if (!isRandomExpression(variable.expression)) {
			walk(index + 1, resolved, current);
			return;
		}
		for (const value of domainValues(variable.expression, resolved)) {
			current[variable.name] = value;
			walk(index + 1, [...resolved, { name: variable.name, value }], current);
			delete current[variable.name];
		}
	};
	try {
		walk(0, [], {});
	} catch (error) {
		if (error instanceof UnsupportedDomain)
			return { reason: `écriture non énumérée : ${error.message}` };
		throw error;
	}
	if (combinations.length > limit) return { reason: `domaine > ${limit} combinaisons` };
	return { combinations, randomNames };
}

// ============================================================================
// DRAWS
// ============================================================================

function comboKey(names: string[], values: (name: string) => string | undefined): string {
	return names.map((name) => Number(values(name))).join('|');
}

function singleVariation(template: QuestionTemplate, variationIndex: number): QuestionTemplate {
	return { ...template, variations: [template.variations[variationIndex]] };
}

function* seedDraws(template: QuestionTemplate, variationIndex: number, count: number) {
	const single = singleVariation(template, variationIndex);
	for (let seed = 1; seed <= count; seed++) {
		yield { label: `graine ${seed}`, result: generateInstance(single, seed) };
	}
}

function* combinationDraws(
	template: QuestionTemplate,
	variationIndex: number,
	combinations: Combination[]
): Generator<Draw> {
	const variation = template.variations[variationIndex];
	const conditions = variation.conditions ?? template.shared?.conditions ?? [];
	for (const combination of combinations) {
		const result = generateInstanceWithFixedVariables(template, combination, variationIndex);
		// Les conditions du modèle écartent les combinaisons que le générateur refuserait
		if (
			result.success &&
			!evaluateConditions(conditions, result.instance.resolvedVariables ?? [])
		) {
			continue;
		}
		const label = Object.entries(combination)
			.map(([name, value]) => `${name}=${value}`)
			.join(', ');
		yield { label: label || 'sans variable aléatoire', result };
	}
}

/** Le domaine énuméré contient-il tous les tirages réels du générateur ? */
function coversRealDraws(
	template: QuestionTemplate,
	variationIndex: number,
	combinations: Combination[],
	randomNames: string[]
): boolean {
	const keys = new Set(combinations.map((c) => comboKey(randomNames, (n) => c[n])));
	const single = singleVariation(template, variationIndex);
	for (let seed = 1; seed <= SAMPLE_CHECK; seed++) {
		const result = generateInstance(single, seed);
		if (!result.success) continue;
		const resolved = result.instance.resolvedVariables ?? [];
		const key = comboKey(randomNames, (n) => resolved.find((v) => v.name === n)?.value);
		if (!keys.has(key)) return false;
	}
	return true;
}

/**
 * Les tirages d'une variation : énumération complète si possible, sinon
 * `SEED_FALLBACK` graines. `seeds` force N graines (tests rapides, `--instances`).
 */
export function planDraws(
	template: QuestionTemplate,
	variationIndex: number,
	options: { seeds?: number } = {}
): DrawPlan {
	if (options.seeds !== undefined) {
		return {
			sampling: { mode: 'seeds', size: options.seeds, reason: 'nombre de graines imposé' },
			draws: seedDraws(template, variationIndex, options.seeds)
		};
	}
	const enumeration = enumerateCombinations(template, variationIndex);
	if ('reason' in enumeration) {
		return {
			sampling: { mode: 'seeds', size: SEED_FALLBACK, reason: enumeration.reason },
			draws: seedDraws(template, variationIndex, SEED_FALLBACK)
		};
	}
	const { combinations, randomNames } = enumeration;
	if (!coversRealDraws(template, variationIndex, combinations, randomNames)) {
		return {
			sampling: {
				mode: 'seeds',
				size: SEED_FALLBACK,
				reason: 'un tirage réel sort du domaine énuméré'
			},
			draws: seedDraws(template, variationIndex, SEED_FALLBACK)
		};
	}
	return {
		sampling: { mode: 'exhaustive', size: combinations.length },
		draws: combinationDraws(template, variationIndex, combinations)
	};
}
