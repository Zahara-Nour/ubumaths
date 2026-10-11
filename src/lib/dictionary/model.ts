/**
 * Modèle du dictionnaire mathématique (ADR 0022) : types d'une entrée et règles
 * de lecture par niveau. Les entrées viennent de la base (`dictionary_entries`),
 * lues par `$lib/server/dictionary`.
 *
 * Chaque définition est rangée à un niveau : la première au niveau du terme,
 * les suivantes à des niveaux plus avancés. Un lecteur voit ce qui est rangé à
 * son niveau ou avant (hiérarchie des niveaux), plus ce que `sharedWith`
 * partage avec sa filière (1re spé, générale, techno).
 *
 * @module dictionary/model
 */

import type { GradeCode } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';

// ---------------------------------------------------------------------------
// Graded content types
// ---------------------------------------------------------------------------

/** A piece of content associated with a grade level. */
export interface GradedContent {
	grade: GradeCode;
	content: string; // ubumark
	/** Filières parallèles qui lisent aussi ce contenu (la 1re générale pour une définition de 1re spé). */
	sharedWith?: GradeCode[];
}

/**
 * A field whose content depends on the reader's grade level.
 * - `cumulative` (default): all items from accessible grades are shown
 * - `discriminant`: only the highest accessible item is shown
 */
export interface GradedField {
	mode?: 'cumulative' | 'discriminant';
	items: GradedContent[];
}

/**
 * Un lecteur lit ce qui est rangé à son niveau ou avant, et ce qui est partagé
 * avec sa filière ou avec une filière qu'il a suivie (la Tle maths complémentaires
 * suit la 1re générale).
 */
export function canRead(
	readerGrade: GradeCode,
	grade: GradeCode,
	sharedWith: readonly GradeCode[] = []
): boolean {
	return (
		hasAccessToGrade(readerGrade, grade) ||
		sharedWith.some((other) => hasAccessToGrade(readerGrade, other))
	);
}

/**
 * Resolve a graded field for a given reader grade.
 * Returns the content strings appropriate for the reader.
 */
export function resolveGradedField(field: GradedField, readerGrade: GradeCode): string[] {
	const eligible = field.items.filter((i) => canRead(readerGrade, i.grade, i.sharedWith));

	if (field.mode === 'discriminant') {
		return eligible.length > 0 ? [eligible[eligible.length - 1].content] : [];
	}
	// Cumulative by default
	return eligible.map((i) => i.content);
}

// ---------------------------------------------------------------------------
// MathTerm interface
// ---------------------------------------------------------------------------

/** Pages du site vers lesquelles un terme peut renvoyer (« Voir aussi ») */
export const SEE_ALSO_PATHS = [
	'/chiffrement',
	'/chiffrement/depeches',
	'/chiffrement/cesar',
	'/chiffrement/substitution',
	'/chiffrement/vigenere',
	'/chiffrement/affine',
	'/chiffrement/hill',
	'/chiffrement/rsa'
] as const;

export type SeeAlsoPath = (typeof SEE_ALSO_PATHS)[number];

export interface MathTerm {
	term: string;
	/** Semantic disambiguation for homonyms (e.g., 'géométrie' vs 'puissances' for 'base'). */
	sense?: string;
	tags: string[];
	/** Definitions by grade level (ubumark). Required for principal terms, omitted for derived terms. */
	definitions?: GradedField;
	/** Usage examples by grade level (ubumark). */
	exemples?: GradedField;
	/** Historical note about the term or concept (ubumark). Invariant across grades. */
	history?: string;
	image?: string;
	/** Grade at which the term is introduced. */
	grade: GradeCode;
	/**
	 * Filières parallèles qui lisent aussi ce terme : « seuil », de 1re spé, est au
	 * programme de 1re générale. Sa définition de son propre niveau porte le même `sharedWith`.
	 */
	sharedWith?: GradeCode[];
	synonyms?: string[];
	/** Formes conjuguées reconnues dans les énoncés (« résous », « résolvez » pour « résoudre »). */
	forms?: string[];
	/** `false` : mot trop courant, jamais souligné automatiquement dans un énoncé (liste fermée). */
	autoLink?: false;
	/** For derived terms (verbs, adjectives): points to the principal term (substantive). */
	derivedFrom?: string;
	/** Page du site où la notion se pratique (lien « Voir aussi » du glossaire) */
	seeAlso?: { label: string; path: SeeAlsoPath };
}

// ---------------------------------------------------------------------------
// Lecture par niveau
// ---------------------------------------------------------------------------

/** Le lecteur voit-il ce terme (son niveau, un niveau antérieur ou une filière partagée) ? */
export function isTermVisibleTo(term: MathTerm, readerGrade: GradeCode): boolean {
	return canRead(readerGrade, term.grade, term.sharedWith);
}

/**
 * Niveau où ce lecteur rencontre le terme : celui du terme s'il le voit par la
 * hiérarchie, sinon la filière partagée qui le lui donne (« nombre dérivé », de
 * 1re spé, est rencontré en 1re techno). `undefined` si le terme lui est caché.
 */
export function gradeMetBy(term: MathTerm, readerGrade: GradeCode): GradeCode | undefined {
	if (hasAccessToGrade(readerGrade, term.grade)) return term.grade;
	return term.sharedWith?.find((other) => hasAccessToGrade(readerGrade, other));
}

/**
 * Entrées visibles au niveau `grade` : introduites à ce niveau ou avant, ou
 * partagées avec sa filière.
 */
export function getTermsForGrade(entries: readonly MathTerm[], grade: GradeCode): MathTerm[] {
	return entries.filter((t) => isTermVisibleTo(t, grade));
}
