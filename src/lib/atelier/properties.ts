/**
 * Atelier — les propriétés d'un objet, que son panneau « Propriétés » affiche
 *
 * Phase 0 du chantier `docs/wip/atelier-proprietes-progress.md` (validée par
 * David le 2026-10-23) : ce qu'on sait d'un objet sans le lire sur sa carte —
 * mesures d'une figure, valeur exacte et approchée, ensemble de définition,
 * mode d'une suite, effectif d'une liste —, puis ses dépendances. Le nom et le
 * style, qui se MODIFIENT, sont dans le panneau lui-même.
 *
 * ⚠️ RECALCULÉES à chaque lecture, jamais rangées : elles suivent les curseurs.
 * Le LaTeX est régénéré depuis le calcul, jamais le texte saisi.
 *
 * @module atelier/properties
 */

import type { Atelier } from './atelier.svelte';
import type { FunctionObject, ListObject, SequenceObject, ValueObject } from './types';
import type { PropertyRow } from './figure-properties';
import { figurePropertiesOf } from './figure-properties';
import { valueAnswerOf } from './calcul';
import { plainLatex, plainText } from './construction';
import { astOf } from './parse';
import { substitutedAstOf } from './engine';
import { intervalDomainOf, intervalText } from './interval';
import { INTERNAL_LETTER } from './letter';
import { displayName } from './names';
import { computeDomain } from '$lib/mathAST/domain/compute';
import { intersect } from '$lib/mathAST/domain/algebra';

export type { PropertyRow } from './figure-properties';

// =============================================================================
// Fonctions
// =============================================================================

/** Une ligne de texte simple (pas de mathématiques à composer). */
function wordRow(label: string, text: string): PropertyRow {
	const escaped = text.replace(/[\\{}]/g, (c) => (c === '\\' ? '\\backslash ' : `\\${c}`));
	return { label, latex: `\\text{${escaped}}`, text };
}

/** Un ensemble écrit par `intervalText` (`ℝ \ {0}`, `[0 ; +∞[`), en LaTeX. */
function setLatex(text: string): string {
	return text
		.replace(/\\/g, '\\setminus ')
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}')
		.replace(/ℝ/g, '\\mathbb{R}')
		.replace(/∪/g, '\\cup ')
		.replace(/∞/g, '\\infty ')
		.replace(/−/g, '-')
		.replace(/;/g, '\\,;\\,');
}

/**
 * Une unité en clair : `m^2` → `m²` ; et une valeur rangée avec la sienne,
 * `√2[cm]` → `√2 cm` (revue de #1630 : le format de rangement était lu tel quel).
 */
function plainUnit(text: string): string {
	return text
		.replace(/\[([^\]]*)\]/g, ' $1')
		.replace(/\^2/g, '²')
		.replace(/\^3/g, '³');
}

/** Une ligne dont la valeur s'écrit en mathématiques, lue en clair par `text`. */
function mathRow(label: string, latex: string, text: string): PropertyRow {
	return { label, latex, text };
}

function valueRows(atelier: Atelier, object: ValueObject): PropertyRow[] {
	const rows: PropertyRow[] = [];
	const answer = valueAnswerOf(atelier, object.name);
	if (answer !== null && answer.decimalLatex !== undefined) {
		// Un décimal exact (`3,4`, que le calcul tient pour 17/5) se dit en décimal
		const decimal = answer.decimalLatex;
		rows.push(mathRow('Valeur', decimal, decimal.replace(/\{,\}/g, ',')));
	} else if (answer !== null) {
		const text = plainUnit(answer.ast === undefined ? answer.text : plainText(answer.ast));
		rows.push({
			...mathRow('Valeur', answer.latex, text),
			...(answer.approximate !== undefined && { approximate: answer.approximate })
		});
	}
	if (object.unit !== undefined) rows.push(wordRow('Unité', plainUnit(object.unit)));
	return rows;
}

/**
 * L'ensemble de définition : celui qu'a écrit l'élève (ou hérité), sinon le
 * domaine calculé — croisés, comme `.domaine`. `null` si on ne sait pas le dire.
 */
function definitionSetOf(atelier: Atelier, object: FunctionObject): string | null {
	const chosen = intervalDomainOf(object);
	const substituted = substitutedAstOf(atelier, object.name);
	if (!substituted.ok) return chosen === null ? null : intervalText(chosen);
	const computed = computeDomain(substituted.ast, INTERNAL_LETTER);
	if (computed.unresolved !== undefined && computed.unresolved.length > 0) {
		return chosen === null ? null : intervalText(chosen);
	}
	return intervalText(chosen === null ? computed.domain : intersect(chosen, computed.domain));
}

function functionRows(atelier: Atelier, object: FunctionObject): PropertyRow[] {
	const letter = object.letter ?? INTERNAL_LETTER;
	const rows: PropertyRow[] = [mathRow('Variable', letter, letter)];
	const set = definitionSetOf(atelier, object);
	if (set !== null) rows.push(mathRow('Ensemble de définition', setLatex(set), set));
	return rows;
}

function sequenceRows(object: SequenceObject): PropertyRow[] {
	const recurrence = object.mode === 'recurrence';
	const rows: PropertyRow[] = [
		wordRow('Définition', recurrence ? 'par récurrence' : 'explicite'),
		mathRow('Premier rang', String(object.firstIndex), String(object.firstIndex))
	];
	// Le premier terme est TAPÉ (un nombre, le nom d'une valeur) : son LaTeX est
	// régénéré depuis sa lecture, jamais recopié
	const first = recurrence ? astOf(object.firstTerm, 'text') : null;
	if (first !== null) {
		rows.push(
			mathRow(
				'Premier terme',
				`${termLatex(object.name, object.firstIndex)}=${plainLatex(first)}`,
				`${object.name}_${object.firstIndex} = ${plainText(first)}`
			)
		);
	}
	return rows;
}

/** Le LaTeX du terme de rang n : `u_{0}`, et `{u_{1}}_{0}` pour une suite indicée. */
function termLatex(name: string, index: number): string {
	const indexed = /^(.+)_(\d+)$/.exec(name);
	const base = indexed === null ? name : `{${indexed[1]}_{${indexed[2]}}}`;
	return `${base}_{${index}}`;
}

function listRows(object: ListObject): PropertyRow[] {
	const count = object.categories?.length ?? object.values.length;
	return [mathRow('Nombre de valeurs', String(count), String(count))];
}

/** Les objets que celui-ci cite, puis ceux qui le citent, dans l'ordre des cartes. */
function dependencyRows(atelier: Atelier, name: string): PropertyRow[] {
	const cited = new Set(atelier.citedNames(name));
	const users = new Set(atelier.dependents(name));
	const inOrder = (set: ReadonlySet<string>) =>
		atelier.objects
			.filter((o) => o.name !== name && set.has(o.name))
			.map((o) => displayName(o.name));
	const rows: PropertyRow[] = [];
	const from = inOrder(cited);
	if (from.length > 0) rows.push(wordRow('Dépend de', from.join(', ')));
	const by = inOrder(users);
	if (by.length > 0) rows.push(wordRow('Utilisé par', by.join(', ')));
	return rows;
}

/**
 * Les propriétés affichées de l'objet `name`, dans l'ordre du panneau ; vide
 * s'il n'existe pas. Un objet en attente ou en erreur garde ses dépendances.
 */
export function propertiesOf(atelier: Atelier, name: string): readonly PropertyRow[] {
	const object = atelier.get(name);
	if (object === undefined) return [];
	const own = (): readonly PropertyRow[] => {
		if (object.status !== 'ok') return [];
		switch (object.kind) {
			case 'point':
			case 'curve':
				return figurePropertiesOf(atelier, name);
			case 'value':
				return valueRows(atelier, object);
			case 'function':
				return functionRows(atelier, object);
			case 'sequence':
				return sequenceRows(object);
			case 'list':
				return listRows(object);
		}
	};
	return [...own(), ...dependencyRows(atelier, name)];
}
