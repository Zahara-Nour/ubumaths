/**
 * Mots cliquables (lot 2 du lexique)
 * ==================================
 *
 * Repère dans le texte d'un énoncé les mots du dictionnaire mathématique
 * visibles au niveau de l'élève, pour qu'un clic ouvre leur définition.
 * Spécification validée par David le 2026-10-09 :
 * docs/wip/lexique/lot2-mots-cliquables-spec.md.
 *
 * Une passe pure sur l'AST d'ubumark : chaque nœud texte est découpé, et les
 * morceaux repérés portent `term = { ids }`. L'AST reçu n'est jamais modifié
 * (il peut venir du cache des rendus).
 *
 * @module lexicon/linker
 */

import MATH_DICTIONARY, { isTermVisibleTo, type MathTerm } from '$lib/data/math-dictionary-fr';
import { GRADES, isGradeCode, type GradeCode } from '$lib/types/grades';
import type { DocumentNode, LexiconMark, TextNode } from '$lib/ubumark';

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

/** Identifiant d'une entrée : son nom, suivi de son sens pour un homonyme (« carré (puissance) »). */
export function termId(term: MathTerm): string {
	return term.sense ? `${term.term} (${term.sense})` : term.term;
}

const TERMS_BY_ID = new Map(MATH_DICTIONARY.map((term) => [termId(term), term]));

/** Entrée du dictionnaire par son identifiant. */
export function getTermById(id: string): MathTerm | undefined {
	return TERMS_BY_ID.get(id);
}

// ---------------------------------------------------------------------------
// Niveau de lecture
// ---------------------------------------------------------------------------

/**
 * Niveau de lecture : celui de l'élève ; sans lui (visiteur, professeur), le
 * plus petit niveau de la question, pour les définitions les plus simples.
 */
export function lexiconGrade(
	profileGrade: string | null | undefined,
	questionGrades: readonly string[] = []
): GradeCode | null {
	if (profileGrade && isGradeCode(profileGrade)) return profileGrade;
	const grades = questionGrades.filter(isGradeCode);
	if (grades.length === 0) return null;
	return grades.reduce((lowest, grade) =>
		GRADES[grade].schoolYear < GRADES[lowest].schoolYear ? grade : lowest
	);
}

// ---------------------------------------------------------------------------
// Index des noms, par niveau
// ---------------------------------------------------------------------------

/** Petits mots d'une expression qui ne prennent pas la marque du pluriel. */
const NO_PLURAL = new Set([
	'à',
	'au',
	'aux',
	'de',
	'des',
	'du',
	'en',
	'et',
	'la',
	'le',
	'les',
	'par',
	'sur',
	'un',
	'une'
]);

interface LexiconIndex {
	/** Noms soulignés automatiquement, du plus long au plus court (groupe n°i+1 de `auto`) */
	autoNames: string[];
	auto: RegExp | null;
	/** Tous les noms visibles, liste fermée comprise : un mot marqué `{.def}` doit en être un, en entier */
	allNames: string[];
	allExact: RegExp | null;
	/** Nom en minuscules → entrées (plusieurs pour un homonyme) */
	byName: Map<string, MathTerm[]>;
}

const indexes = new Map<GradeCode, LexiconIndex>();

/** Motif d'un nom : accents exacts, casse ignorée (drapeau `i`), pluriel admis sur chaque mot. */
function namePattern(name: string): string {
	return name
		.split(/\s+/)
		.map((word) => {
			const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]");
			const bare = word.replace(/^.*['’]/, '');
			const plural = bare.length >= 2 && !NO_PLURAL.has(bare) && /\p{L}$/u.test(word);
			return plural ? `${escaped}(?:s|x)?` : escaped;
		})
		.join('\\s+');
}

function alternatives(names: string[]): string {
	return names.map((name) => `(${namePattern(name)})`).join('|');
}

/** Un nom n'est repéré qu'en mot entier : ni lettre, ni chiffre, ni trait d'union autour. */
function namesRegex(names: string[]): RegExp | null {
	if (names.length === 0) return null;
	return new RegExp(`(?<![\\p{L}\\p{N}_-])(?:${alternatives(names)})(?![\\p{L}\\p{N}_-])`, 'giu');
}

/** Le texte entier est un nom (mot marqué à la main). */
function exactRegex(names: string[]): RegExp | null {
	return names.length === 0 ? null : new RegExp(`^(?:${alternatives(names)})$`, 'iu');
}

function byLength(a: string, b: string): number {
	return b.length - a.length || a.localeCompare(b);
}

function getIndex(grade: GradeCode): LexiconIndex {
	const cached = indexes.get(grade);
	if (cached) return cached;
	const byName = new Map<string, MathTerm[]>();
	const auto = new Set<string>();
	for (const term of MATH_DICTIONARY) {
		if (!isTermVisibleTo(term, grade)) continue;
		for (const name of [term.term, ...(term.synonyms ?? []), ...(term.forms ?? [])]) {
			const key = name.toLowerCase();
			const entries = byName.get(key) ?? [];
			if (!entries.includes(term)) entries.push(term);
			byName.set(key, entries);
			if (term.autoLink !== false) auto.add(key);
		}
	}
	const autoNames = [...auto].sort(byLength);
	const allNames = [...byName.keys()].sort(byLength);
	const index: LexiconIndex = {
		autoNames,
		auto: namesRegex(autoNames),
		allNames,
		allExact: exactRegex(allNames),
		byName
	};
	indexes.set(grade, index);
	return index;
}

/** Nom reconnu par une correspondance : le groupe capturant qui a répondu. */
function matchedName(match: RegExpExecArray, names: string[]): string {
	for (let i = 1; i < match.length; i++) {
		if (match[i] !== undefined) return names[i - 1];
	}
	throw new Error('Correspondance sans groupe');
}

/** Entrées soulignables d'un nom : celles de la liste fermée en sont exclues. */
function autoEntries(index: LexiconIndex, name: string): MathTerm[] {
	return (index.byName.get(name) ?? []).filter((term) => term.autoLink !== false);
}

// ---------------------------------------------------------------------------
// Découpage d'un nœud texte
// ---------------------------------------------------------------------------

/** Entrées ouvertes par un mot marqué à la main, ou aucune (le mot reste du texte). */
function markedEntries(
	content: string,
	mark: LexiconMark,
	index: LexiconIndex,
	grade: GradeCode
): MathTerm[] {
	if (mark.target) {
		const exact = getTermById(mark.target);
		if (exact) return isTermVisibleTo(exact, grade) ? [exact] : [];
		return index.byName.get(mark.target.toLowerCase()) ?? [];
	}
	// Le mot entier doit être un nom du dictionnaire (pluriel admis)
	const match = index.allExact?.exec(content.trim());
	return match ? (index.byName.get(matchedName(match, index.allNames)) ?? []) : [];
}

function idsKey(entries: MathTerm[]): string {
	return entries.map(termId).join('|');
}

function linkText(
	node: TextNode,
	index: LexiconIndex,
	grade: GradeCode,
	seen: Set<string>
): TextNode[] {
	if (node.code || node.lexicon?.mode === 'block') return [node];
	if (node.lexicon?.mode === 'force') {
		const entries = markedEntries(node.content, node.lexicon, index, grade);
		if (entries.length === 0) return [node];
		seen.add(idsKey(entries));
		return [{ ...node, term: { ids: entries.map(termId) } }];
	}
	if (!index.auto) return [node];

	const pieces: TextNode[] = [];
	// Expression compilée une fois par niveau : on repart du début du texte
	const regex = index.auto;
	regex.lastIndex = 0;
	let position = 0;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(node.content)) !== null) {
		const entries = autoEntries(index, matchedName(match, index.autoNames));
		const key = idsKey(entries);
		// Première occurrence seulement : les suivantes restent du texte
		if (entries.length === 0 || seen.has(key)) continue;
		seen.add(key);
		if (match.index > position) {
			pieces.push({ ...node, content: node.content.slice(position, match.index) });
		}
		pieces.push({ ...node, content: match[0], term: { ids: entries.map(termId) } });
		position = match.index + match[0].length;
	}
	if (pieces.length === 0) return [node];
	if (position < node.content.length) {
		pieces.push({ ...node, content: node.content.slice(position) });
	}
	return pieces;
}

// ---------------------------------------------------------------------------
// Passe sur le document
// ---------------------------------------------------------------------------

/** Nœuds dont les enfants sont du texte d'énoncé : paragraphes, titres, listes, encadrés. */
type Container = { type: string; children?: unknown[]; items?: unknown[] };

/**
 * Copie du document où les mots du dictionnaire visibles au niveau `grade`
 * sont repérés (`TextNode.term`), dans l'ordre du texte : un mot n'est repéré
 * qu'une fois par document. Les tableaux, liens, formules et blocs spéciaux
 * ne sont pas touchés.
 */
export function linkDocument(doc: DocumentNode, grade: GradeCode): DocumentNode {
	const index = getIndex(grade);
	const seen = new Set<string>();

	function visit<T>(node: T): T {
		if (!node || typeof node !== 'object') return node;
		const container = node as Container;
		if (Array.isArray(container.children)) {
			const children = container.children.flatMap((child) =>
				(child as TextNode).type === 'text'
					? linkText(child as TextNode, index, grade, seen)
					: [visit(child)]
			);
			return { ...node, children } as T;
		}
		if (Array.isArray(container.items)) {
			return { ...node, items: container.items.map((item) => visit(item)) } as T;
		}
		return node;
	}

	return visit(doc);
}
