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
import type { ObjectKind } from './types';

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

/** Les identifiants d'une expression, pour en tirer les dépendances. */
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
export function parseDefinition(kind: ObjectKind, definition: string): ParsedDefinition {
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

	const result = parseCustomSafe(definition);
	if (!result.ast) {
		return { error: `« ${definition.trim()} » n'est pas une expression valide.` };
	}
	return {};
}

/**
 * Les identifiants d'une définition qui désignent des objets de l'atelier.
 *
 * Tout ce qui n'est pas un nom d'objet est ignoré : `sin`, `x`, un nombre. On
 * n'a donc pas besoin de connaître les fonctions du CAS pour éviter de les
 * confondre avec des dépendances.
 */
export function referencedNames(definition: string, known: readonly string[]): string[] {
	const knownSet = new Set(known);
	const found = new Set<string>();
	for (const match of definition.matchAll(IDENTIFIERS)) {
		if (knownSet.has(match[0])) found.add(match[0]);
	}
	return [...found];
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
