/**
 * Mots cliquables (lot 2 du lexique)
 * ==================================
 *
 * Repère dans le texte d'un énoncé les mots du dictionnaire mathématique
 * visibles au niveau de l'élève, pour qu'un clic ouvre leur définition.
 * Spécification validée par David le 2026-10-09 :
 * docs/wip/lexique/lot2-mots-cliquables-spec.md.
 *
 * Une passe pure sur l'AST d'ubumark : chaque nœud texte reçoit les positions
 * de ses mots repérés (`terms`), sans être découpé, pour que l'arbre garde sa
 * forme. L'AST reçu n'est jamais modifié (il peut venir du cache des rendus).
 * Les entrées viennent de la base (`createLinker`, ADR 0022).
 *
 * @module lexicon/linker
 */

import { isTermVisibleTo, type MathTerm } from '$lib/dictionary/model';
import type { GradeCode } from '$lib/types/grades';
import type { DocumentNode, LexiconMark, TermRange, TextNode } from '$lib/ubumark';

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

/** Identifiant d'une entrée : son nom, suivi de son sens pour un homonyme (« carré (puissance) »). */
export function termId(term: MathTerm): string {
	return term.sense ? `${term.term} (${term.sense})` : term.term;
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

function buildIndex(entries: readonly MathTerm[], grade: GradeCode): LexiconIndex {
	const byName = new Map<string, MathTerm[]>();
	const auto = new Set<string>();
	for (const term of entries) {
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
	return {
		autoNames,
		auto: namesRegex(autoNames),
		allNames,
		allExact: exactRegex(allNames),
		byName
	};
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
	grade: GradeCode,
	getTermById: (id: string) => MathTerm | undefined
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

/** Le nœud texte, avec les positions des mots repérés (aucun découpage). */
function linkText(
	node: TextNode,
	index: LexiconIndex,
	grade: GradeCode,
	seen: Set<string>,
	getTermById: (id: string) => MathTerm | undefined
): TextNode {
	if (node.code || node.lexicon?.mode === 'block') return node;
	if (node.lexicon?.mode === 'force') {
		const entries = markedEntries(node.content, node.lexicon, index, grade, getTermById);
		if (entries.length === 0) return node;
		seen.add(idsKey(entries));
		return { ...node, terms: [{ start: 0, end: node.content.length, ids: entries.map(termId) }] };
	}
	if (!index.auto) return node;

	const terms: TermRange[] = [];
	// Expression compilée une fois par niveau : on repart du début du texte
	const regex = index.auto;
	regex.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(node.content)) !== null) {
		const entries = autoEntries(index, matchedName(match, index.autoNames));
		const key = idsKey(entries);
		// Première occurrence seulement : les suivantes restent du texte
		if (entries.length === 0 || seen.has(key)) continue;
		seen.add(key);
		terms.push({
			start: match.index,
			end: match.index + match[0].length,
			ids: entries.map(termId)
		});
	}
	return terms.length > 0 ? { ...node, terms } : node;
}

// ---------------------------------------------------------------------------
// Passe sur le document
// ---------------------------------------------------------------------------

/** Nœud qui contient du texte d'énoncé : paragraphe, titre, liste, élément de liste, encadré. */
interface Container {
	type: string;
	children?: unknown[];
	items?: unknown[];
}

function isContainer(node: unknown): node is Container {
	return typeof node === 'object' && node !== null && 'type' in node;
}

function isText(node: unknown): node is TextNode {
	return isContainer(node) && node.type === 'text';
}

/**
 * Copie du document où les mots du dictionnaire visibles au niveau `grade`
 * sont repérés (`TextNode.terms`), dans l'ordre du texte : un mot n'est repéré
 * qu'une fois par document. Les tableaux, liens, formules et blocs spéciaux
 * ne sont pas touchés.
 */
function linkWith(
	doc: DocumentNode,
	grade: GradeCode,
	index: LexiconIndex,
	getTermById: (id: string) => MathTerm | undefined
): DocumentNode {
	const seen = new Set<string>();

	function visit(node: unknown): unknown {
		if (!isContainer(node)) return node;
		if (Array.isArray(node.children)) {
			const children = node.children.map((child) =>
				isText(child) ? linkText(child, index, grade, seen, getTermById) : visit(child)
			);
			return { ...node, children };
		}
		if (Array.isArray(node.items)) {
			return { ...node, items: node.items.map(visit) };
		}
		return node;
	}

	// Même forme que le document reçu : seuls des champs `terms` s'ajoutent
	return visit(doc) as DocumentNode;
}

// ---------------------------------------------------------------------------
// Repérage sur un dictionnaire donné
// ---------------------------------------------------------------------------

export interface Linker {
	/** Entrée du dictionnaire par son identifiant. */
	getTermById(id: string): MathTerm | undefined;
	/** Le document, avec les mots repérés au niveau `grade` (voir `linkWith`). */
	linkDocument(doc: DocumentNode, grade: GradeCode): DocumentNode;
}

/** Repérage des mots de `entries` ; l'index d'un niveau est construit une fois (~19 ms). */
export function createLinker(entries: readonly MathTerm[]): Linker {
	const byId = new Map(entries.map((term) => [termId(term), term]));
	const indexes = new Map<GradeCode, LexiconIndex>();
	const getTermById = (id: string) => byId.get(id);

	function getIndex(grade: GradeCode): LexiconIndex {
		let index = indexes.get(grade);
		if (!index) {
			index = buildIndex(entries, grade);
			indexes.set(grade, index);
		}
		return index;
	}

	return {
		getTermById,
		linkDocument: (doc, grade) => linkWith(doc, grade, getIndex(grade), getTermById)
	};
}
