/**
 * Atelier — lecture des définitions
 *
 * Un seul endroit sait transformer la chaîne saisie par l'élève en objet
 * exploitable, et en tirer ses dépendances. Séparé du modèle pour rester
 * testable seul.
 *
 * @module atelier/parse
 */

import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { detectInputFormat } from '$lib/mathAST/cli/core/input-detector';
import { toLatex } from '$lib/mathAST/latex-generator';
import { getVariables } from '$lib/mathAST/eval/substitute';
import type { MathNode } from '$lib/mathAST/types';
import type { MissingReference, ObjectKind } from './types';
import { hasObjectNameShape } from './names';

/**
 * D'où vient une définition. Décision D10 : c'est la provenance qui décide du
 * parseur, jamais le contenu — on connaît toujours la première, alors que
 * deviner d'après le second casse sur les mélanges (`sin(x) + \frac{1}{2}`).
 */
export type Provenance = 'mathfield' | 'keyboard' | 'storage' | 'paste' | 'url' | 'command';

/** Comment lire une définition venue de là. */
export type ReadingMode = 'latex' | 'detect';

/**
 * Un champ de maths produit du LaTeX — ses raccourcis intégrés convertissent
 * « sin » en `\sin`, vérifié dans Chromium (`mathlive-shortcuts.svelte.test.ts`).
 * Tout le reste est du texte dont on ne sait rien.
 */
export function readingMode(provenance: Provenance): ReadingMode {
	return provenance === 'mathfield' || provenance === 'keyboard' || provenance === 'storage'
		? 'latex'
		: 'detect';
}

/**
 * Analyser une définition selon sa provenance.
 *
 * En mode `detect`, le repli d'une détection hésitante (confiance ≤ 0,5) est la
 * syntaxe **custom** : c'est ce qu'un humain écrit au clavier. Deux effets
 * voulus — `a/b` devient une fraction, et `e` reste la constante d'Euler.
 */
function parseByProvenance(definition: string, provenance: Provenance) {
	if (readingMode(provenance) === 'latex') return parseLatexSafe(definition);

	const detected = detectInputFormat(definition);
	if (detected.format === 'latex' && detected.confidence > 0.5) return parseLatexSafe(definition);
	return parseCustomSafe(definition);
}

/**
 * Réécrire un texte collé en LaTeX, pour que le champ montre ce qui a été
 * compris.
 *
 * MathLive ne normalise PAS une valeur injectée (mesuré) : sans ce passage, un
 * `sin` collé resterait trois lettres italiques, lues `s·i·n`. Un texte qui
 * n'est pas une expression est rendu tel quel — le champ le recevra, et l'objet
 * portera son erreur à la lecture (§6 bis L2).
 */
export function normalizePasted(text: string): string {
	if (text.trim() === '') return text;
	const result = parseByProvenance(text, 'paste');
	if (!result.ast) return text;
	try {
		return toLatex(result.ast);
	} catch {
		return text;
	}
}

/** Ce qu'une définition apprend sur l'objet qu'elle définit. */
export interface ParsedDefinition {
	/** Message français quand la définition n'est pas exploitable. */
	readonly error?: string;
	/** Unité, pour une valeur qui est une grandeur (`12 km`). */
	readonly unit?: string;
	/** Valeurs d'une liste, les entrées non numériques écartées. */
	readonly values?: readonly number[];
	/** Nombre d'entrées écartées, pour pouvoir le signaler. */
	readonly skipped?: number;
}

/** Une valeur : un nombre, éventuellement suivi d'une unité. */
const VALUE_SHAPE = /^\s*(-?\d+(?:[.,]\d+)?)\s*([A-Za-zµ°%]+(?:\/[A-Za-zµ°%]+)?)?\s*$/;

/** Les identifiants du TEXTE — pour la réécriture au renommage, pas pour lire les dépendances. */
const IDENTIFIERS = /[A-Za-z]+(?:_\d+)?/g;

/**
 * Lire un nombre écrit à la française.
 *
 * La virgule est décimale — c'est ainsi que l'élève l'écrit. Le séparateur de
 * liste est le point-virgule, jamais la virgule : distinguer `1,2` de `1, 2`
 * par une espace, comme le fait le tokenizer, est intenable en classe.
 */
export function readNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === '') return null;
	const n = Number(trimmed.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/**
 * Lire une définition selon le type de l'objet.
 *
 * Une définition vide ne rend jamais d'erreur : l'objet est « incomplet », ce
 * qui est un état normal pendant qu'on cherche.
 */
export function parseDefinition(
	kind: ObjectKind,
	definition: string,
	provenance: Provenance = 'url'
): ParsedDefinition {
	if (definition.trim() === '') return {};

	if (kind === 'list') {
		const parts = definition.split(';');
		const values: number[] = [];
		let skipped = 0;
		for (const part of parts) {
			const n = readNumber(part);
			if (n === null) skipped++;
			else values.push(n);
		}
		return { values, skipped };
	}

	if (kind === 'value') {
		const m = VALUE_SHAPE.exec(definition);
		if (m) {
			// Décision D4 : la grandeur est acceptée, mais elle ne prendra pas de
			// curseur — c'est au modèle d'en décider, pas ici.
			return m[2] ? { unit: m[2] } : {};
		}
		// Une valeur peut aussi être une expression (`2+3`) : on la fait analyser.
	}

	const result = parseByProvenance(definition, provenance);
	if (!result.ast) {
		return { error: `« ${definition.trim()} » n'est pas une expression valide.` };
	}
	return {};
}

/**
 * Les noms libres d'une définition, classés par la grammaire.
 *
 * Tout vient de l'AST, jamais du texte : `ax + b` se lit `a·x + b`, donc `ax`
 * n'est pas un nom — une lecture par expression régulière s'y trompait. Un
 * identifiant appelé avec une parenthèse produit un nœud `function` et sort
 * donc classé `function` ; une lettre seule produit une variable.
 *
 * Seuls les identifiants qui POURRAIENT nommer un objet sont retenus (§1 : une
 * lettre, éventuellement indicée). `sqrt`, `sin` et `abs` font plusieurs
 * lettres : aucun objet ne portera jamais ces noms, donc ils ne manquent
 * jamais — et l'atelier n'a aucune liste de fonctions à tenir à jour.
 *
 * ⚠️ En syntaxe custom, `pi` n'est PAS une constante : il se lit `p·i`.
 */
export function referencesOf(
	definition: string,
	provenance: Provenance = 'url'
): MissingReference[] {
	const result = parseByProvenance(definition, provenance);
	if (!result.ast) return [];

	const found = new Map<string, MissingReference>();

	for (const name of getVariables(result.ast)) {
		if (!hasObjectNameShape(name)) continue;
		found.set(name, { name, as: 'value' });
	}

	// Un appel de fonction l'emporte sur la lecture « variable » du même nom :
	// `h(x) + h` désigne une fonction, et on n'offrira pas de curseur pour elle.
	for (const name of calledFunctions(result.ast)) {
		if (!hasObjectNameShape(name)) continue;
		found.set(name, { name, as: 'function' });
	}

	return [...found.values()];
}

/** Les noms des fonctions appelées dans un AST, à tout niveau. */
function calledFunctions(node: MathNode): string[] {
	const out: string[] = [];
	const visit = (n: unknown): void => {
		if (!n || typeof n !== 'object') return;
		const o = n as Record<string, unknown>;
		if (o.type === 'function' && typeof o.name === 'string') out.push(o.name);
		for (const value of Object.values(o)) {
			if (Array.isArray(value)) value.forEach(visit);
			else visit(value);
		}
	};
	visit(node);
	return out;
}

/**
 * Réécrire une définition après le renommage d'un objet.
 *
 * Remplace le nom entier seulement : renommer `f` ne doit pas toucher au `f`
 * de `f_1`, ni à celui de `sin`.
 */
export function renameInDefinition(definition: string, from: string, to: string): string {
	return definition.replace(IDENTIFIERS, (id) => (id === from ? to : id));
}
