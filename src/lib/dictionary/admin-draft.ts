/**
 * Brouillon d'une entrée sur la page d'admin du dictionnaire (ADR 0022)
 * ====================================================================
 *
 * La page édite un brouillon (listes en texte, champs vides permis) ; il
 * devient une saisie de l'admin (`DictionaryEntryInput`) à l'enregistrement.
 * Ce que la page n'édite pas (image, « Voir aussi », mode d'un champ gradué)
 * est gardé tel quel.
 *
 * @module dictionary/admin-draft
 */

import { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';
import type { Json } from '$lib/types/database';
import { normalizeName } from './consistency';
import type { DictionaryEntryInput, DictionaryRow } from './entry-schema';
import type { GradedField } from './model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftItem {
	/** Clé stable de la liste (un niveau retiré ne décale pas les autres) ; jamais envoyée. */
	key: number;
	grade: GradeCode;
	content: string;
	sharedWith: GradeCode[];
}

export interface DraftField {
	mode?: GradedField['mode'];
	items: DraftItem[];
}

export interface EntryDraft {
	term: string;
	sense: string;
	grade: GradeCode;
	/** Listes saisies séparées par des virgules. */
	tags: string;
	synonyms: string;
	forms: string;
	neverLinked: boolean;
	derivedFrom: string;
	sharedWith: GradeCode[];
	definitions: DraftField;
	exemples: DraftField;
	history: string;
	image: string | null;
	seeAlso: DictionaryEntryInput['see_also'];
}

/** Une entrée vue par l'admin : son contenu, son état et sa dernière modification. */
export type AdminDictionaryRow = DictionaryRow & {
	id: string;
	position: number;
	hidden: boolean;
	updated_at: string;
};

/** Une version précédente d'une entrée : date et auteur de la modification qui l'a remplacée. */
export interface DictionaryVersion {
	id: string;
	savedAt: string;
	savedBy: string | null;
	entry: Json;
}

/** Une ligne de la page : ce qu'il faut pour la chercher et l'afficher dans la liste. */
export interface SearchableRow {
	term: string;
	sense: string | null;
	synonyms: string[];
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SEARCH_LIMIT = 50;

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

let lastItemKey = 0;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Une clé neuve pour un niveau de brouillon. */
export function newItemKey(): number {
	lastItemKey += 1;
	return lastItemKey;
}

/** Filières parallèles de la même année : les seules avec qui partager (refus 13). */
export function parallelGrades(grade: GradeCode): GradeCode[] {
	return GRADE_CODES.filter(
		(other) =>
			other !== grade &&
			GRADES[other].schoolYear === GRADES[grade].schoolYear &&
			!hasAccessToGrade(other, grade) &&
			!hasAccessToGrade(grade, other)
	);
}

/** Le niveau change : seuls restent les partages encore possibles. */
export function pruneShares(grade: GradeCode, sharedWith: readonly GradeCode[]): GradeCode[] {
	const allowed = parallelGrades(grade);
	return sharedWith.filter((other) => allowed.includes(other));
}

/** Champ gradué de la base (jsonb déjà validé à la lecture) en brouillon. */
function toDraftField(field: DictionaryRow['definitions']): DraftField {
	const graded = field as GradedField | null;
	return {
		...(graded?.mode && { mode: graded.mode }),
		items: (graded?.items ?? []).map((item) => ({
			key: newItemKey(),
			grade: item.grade,
			content: item.content,
			sharedWith: [...(item.sharedWith ?? [])]
		}))
	};
}

/** Brouillon d'une entrée existante, ou d'une nouvelle entrée (`null`). */
export function rowToDraft(row: DictionaryRow | null): EntryDraft {
	return {
		term: row?.term ?? '',
		sense: row?.sense ?? '',
		grade: (row?.grade as GradeCode | undefined) ?? '6',
		tags: row?.tags.join(', ') ?? '',
		synonyms: row?.synonyms.join(', ') ?? '',
		forms: row?.forms.join(', ') ?? '',
		neverLinked: row ? !row.auto_link : false,
		derivedFrom: row?.derived_from ?? '',
		sharedWith: [...((row?.shared_with as GradeCode[] | undefined) ?? [])],
		definitions: toDraftField(row?.definitions ?? null),
		exemples: toDraftField(row?.exemples ?? null),
		history: row?.history ?? '',
		image: row?.image ?? null,
		seeAlso: (row?.see_also as DictionaryEntryInput['see_also'] | undefined) ?? null
	};
}

/** « a, b ,, c » → ['a', 'b', 'c']. */
function splitList(text: string): string[] {
	return text
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

/** Brouillon d'un champ gradué en saisie : un champ sans texte est absent. */
function toGradedInput(field: DraftField) {
	const items = field.items.map((item) => ({
		grade: item.grade,
		content: item.content.trim(),
		...(item.sharedWith.length > 0 && { sharedWith: item.sharedWith })
	}));
	if (items.length === 0) return null;
	return { ...(field.mode && { mode: field.mode }), items };
}

/** Le brouillon tel que la page l'envoie au serveur. */
export function draftToInput(draft: EntryDraft): DictionaryEntryInput {
	return {
		term: draft.term.trim(),
		sense: draft.sense.trim() || null,
		grade: draft.grade,
		tags: splitList(draft.tags).map((tag) => tag.toLowerCase()),
		definitions: toGradedInput(draft.definitions),
		exemples: toGradedInput(draft.exemples),
		history: draft.history.trim() || null,
		image: draft.image,
		synonyms: splitList(draft.synonyms),
		forms: splitList(draft.forms),
		auto_link: !draft.neverLinked,
		derived_from: draft.derivedFrom.trim() || null,
		see_also: draft.seeAlso,
		shared_with: draft.sharedWith
	};
}

/**
 * Les lignes dont le nom, le sens ou un synonyme contient la recherche
 * (accents et majuscules ignorés) ; les noms qui commencent par elle d'abord.
 */
export function searchRows<T extends SearchableRow>(rows: readonly T[], query: string): T[] {
	const needle = normalizeName(query);
	if (needle === '') return rows.slice(0, SEARCH_LIMIT);
	const starts: T[] = [];
	const contains: T[] = [];
	for (const row of rows) {
		const name = normalizeName(row.term);
		if (name.startsWith(needle)) starts.push(row);
		else if (
			name.includes(needle) ||
			normalizeName(row.sense ?? '').includes(needle) ||
			row.synonyms.some((s) => normalizeName(s).includes(needle))
		) {
			contains.push(row);
		}
	}
	return [...starts, ...contains].slice(0, SEARCH_LIMIT);
}
