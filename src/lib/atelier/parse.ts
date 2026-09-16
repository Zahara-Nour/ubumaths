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
import { format as formatUnit } from '$lib/mathAST/units';
import type { MathNode } from '$lib/mathAST/types';
import { MAX_LIST_VALUES } from './types';
import type { MissingReference, ObjectKind } from './types';
import { hasObjectNameShape } from './names';

/**
 * D'où vient une définition. Décision D10 : c'est la provenance qui décide du
 * parseur, jamais le contenu — on connaît toujours la première, alors que
 * deviner d'après le second casse sur les mélanges (`sin(x) + \frac{1}{2}`).
 */
export type Provenance =
	/** Valeur lue dans un champ MathLive : du LaTeX. */
	| 'mathfield'
	/**
	 * Frappe au clavier **dans** un champ MathLive.
	 *
	 * ⚠️ Ce n'est PAS « tapé dans un champ texte » — c'est aussi du LaTeX, parce
	 * que les raccourcis de MathLive convertissent « sin » en `\sin` à la frappe
	 * (mesuré dans Chromium, `mathlive-shortcuts.svelte.test.ts`), alors qu'ils
	 * ne touchent pas une valeur injectée. Pour un champ texte ordinaire, c'est
	 * `'text'`.
	 */
	| 'keyboard'
	/**
	 * Champ texte ordinaire : ce que l'élève écrit à la main, sans éditeur.
	 *
	 * Lu en `detect`, avec repli custom — sans quoi `sin(x)` se lirait
	 * `s·i·n·(x)`, trois noms inconnus au lieu d'une fonction connue. C'est
	 * exactement le défaut que D10 nomme « le pire type de défaut ».
	 */
	| 'text'
	| 'storage'
	| 'paste'
	| 'url'
	| 'command';

/** Comment lire une définition venue de là. */
export type ReadingMode = 'latex' | 'detect';

/**
 * Un champ de maths produit du LaTeX — ses raccourcis intégrés convertissent
 * « sin » en `\sin`, vérifié dans Chromium (`mathlive-shortcuts.svelte.test.ts`).
 * Tout le reste est du texte dont on ne sait rien.
 *
 * ⚠️ `'text'` n'est PAS du LaTeX, malgré son voisinage avec `'keyboard'` : un
 * champ texte ordinaire ne convertit rien, et y lire du LaTeX ferait de
 * `sin(x)` un produit de lettres.
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
 * L'arbre d'une définition, ou `null` si elle ne se lit pas.
 *
 * Le pont vers le moteur (`engine.ts`) en a besoin : `createFunctionBinding` et
 * `setBinding` travaillent sur des arbres, pas sur du texte. Passer par ici
 * garantit que le moteur lit la définition **exactement** comme le panneau —
 * même provenance, donc même syntaxe (décision D10).
 */
export function astOf(definition: string, provenance: Provenance = 'url'): MathNode | null {
	if (definition.trim() === '') return null;
	return parseByProvenance(definition, provenance).ast ?? null;
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

/** Une valeur purement numérique, sans unité ni expression. */
const PLAIN_NUMBER = /^\s*-?\d+(?:[.,]\d+)?\s*$/;

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
 * L'élève a-t-il séparé ses valeurs par des virgules ? Si oui, le message.
 *
 * ⚠️ Décision Q1 (2026-09-16) : on **refuse en montrant la correction**. Accepter
 * la virgule rouvrirait l'ambiguïté que le §4 E2 a fermée — `3,14` est
 * l'écriture décimale française, la plus fréquente, et la distinguer de `3, 14`
 * par une espace est intenable en classe.
 *
 * Le test est précis pour ne pas accuser un décimal : un segment n'est fautif
 * que s'il **ne se lit pas** comme un nombre ET que le découper sur les virgules
 * donne plusieurs nombres valides. `3,14` se lit, donc il passe ; `12,15,9` ne
 * se lit pas et donne trois nombres, donc il est repris.
 */
function commaUsedAsSeparator(definition: string): string | null {
	for (const segment of definition.split(';')) {
		if (!segment.includes(',')) continue;
		if (readNumber(segment) !== null) continue;

		const pieces = segment.split(',').map((piece) => piece.trim());
		if (pieces.length < 2 || pieces.some((piece) => readNumber(piece) === null)) continue;

		// Montrer la correction sur SA saisie, pas sur un exemple générique :
		// l'élève voit ce qu'il aurait dû taper.
		return `Sépare tes valeurs par des points-virgules : ${pieces.join(' ; ')}`;
	}
	return null;
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
		const misused = commaUsedAsSeparator(definition);
		if (misused !== null) {
			return { values: [], skipped: 0, error: misused };
		}

		const parts = definition.split(';');
		const values: number[] = [];
		let skipped = 0;
		for (const part of parts) {
			const n = readNumber(part);
			if (n === null) skipped++;
			else values.push(n);
		}
		// Plafond D8 : la liste garde ses valeurs et porte son erreur — on ne jette
		// pas la saisie de l'élève, on lui dit ce qui bloque. Le contrôle vit ici
		// et non à la construction de l'objet : `recomputeAll` repart toujours de
		// `parseDefinition`, et écraserait un statut posé ailleurs.
		if (values.length > MAX_LIST_VALUES) {
			return {
				values,
				skipped,
				error: `Une liste ne peut pas dépasser ${MAX_LIST_VALUES} valeurs (celle-ci en a ${values.length}).`
			};
		}
		return { values, skipped };
	}

	if (kind === 'value' && PLAIN_NUMBER.test(definition)) return {};

	const result = parseByProvenance(definition, provenance);
	if (!result.ast) {
		return { error: `« ${definition.trim()} » n'est pas une expression valide.` };
	}

	if (kind === 'value') {
		// Décision D4 : la grandeur est acceptée, mais elle ne prendra pas de
		// curseur — c'est au modèle d'en décider, pas ici.
		const symbol = unitSymbolOf(result.ast);
		if (symbol) return { unit: symbol };
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

/**
 * Le symbole d'unité porté par une définition, s'il y en a un.
 *
 * ⚠️ L'unité se **déclare**, elle ne se devine pas : `12[km]` en syntaxe custom,
 * `\unit{km}` en LaTeX — ce que produit la palette d'unités du champ de saisie.
 * Le parseur en fait un nœud `unit` qui, lui, ne libère aucune variable : `12 km`
 * écrit sans crochets reste donc le produit `12·k·m`, ce qu'il est
 * mathématiquement.
 *
 * Une lecture par expression régulière prenait auparavant n'importe quel suffixe
 * pour une unité — `2pi` devenait « 2 d'unité pi », `3x` « 3 d'unité x ».
 */
function unitSymbolOf(node: MathNode): string | null {
	const found = findUnitNode(node);
	if (!found) return null;
	try {
		return formatUnit(found, 'original');
	} catch {
		return null;
	}
}

function findUnitNode(node: unknown): Parameters<typeof formatUnit>[0] | null {
	if (!node || typeof node !== 'object') return null;
	const o = node as Record<string, unknown>;
	if (o.type === 'unit' && o.unit) return o.unit as Parameters<typeof formatUnit>[0];
	for (const value of Object.values(o)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				const found = findUnitNode(item);
				if (found) return found;
			}
		} else {
			const found = findUnitNode(value);
			if (found) return found;
		}
	}
	return null;
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
