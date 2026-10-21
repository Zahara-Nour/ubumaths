/**
 * Atelier — lire une construction (géométrie v2, lot 2 : L2, L3)
 *
 * Une construction s'écrit comme une ligne du DSL de géométrie (`milieu(A, B)`,
 * `cercle(O, passant=A)`, `projection(M, axe=d)`), plus trois raccourcis de
 * manuel : `(AB)` = `droite(A, B)`, `[AB]` = `segment(A, B)`, `[AB)` =
 * `demidroite(A, B)` — en définition comme à l'intérieur d'un argument.
 *
 * ## Pourquoi pas le lecteur du DSL (`geometry-core/dsl/parser.ts`)
 *
 * Mesuré le 2026-10-18, avant d'écrire ce module : le lecteur du DSL refuse
 * `cercle(O, rayon=2a)` (« Attendu RPAREN, reçu IDENTIFIER 'a' »), `√2`, `a²`,
 * `\frac{1}{2}` (le LaTeX des cartes) et `parallèle` (« Caractère inattendu »),
 * lit `(AB)` comme l'identifiant `AB` et `[AB]` comme une liste. Traduire
 * d'abord la virgule décimale n'y suffit donc pas : l'atelier écrit ses nombres
 * à sa façon, que le DSL ne lit pas. Ce module lit la STRUCTURE (le mot, les
 * arguments positionnels et nommés, les raccourcis, les séparateurs) et laisse
 * chaque argument numérique en TEXTE, que l'atelier lit comme partout ailleurs
 * (`astOf`). `construction-lecture.test.ts` vérifie qu'il donne la même
 * structure que le DSL sur les lignes que celui-ci sait lire.
 *
 * ## Séparateurs (propre à l'atelier, à cause de sa virgule décimale)
 *
 * `;` sépare toujours ; `,` sépare quand rien ne peut être un décimal ; une
 * virgule entre deux chiffres sans « ; » (`point(1,5, 2)`, `point(1,2)`) est
 * ambiguë et refusée — la même règle que `max(1,2)` (`decimal-comma.ts`).
 *
 * @module atelier/construction-read
 */

import { BUILTIN_NAMES } from '$lib/geometry-core/dsl/builtins';
import type { Provenance } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Les mots du DSL que l'atelier sait construire (catalogue L3 ; PR 3 : intersection, point_sur). */
export type ConstructionWord =
	| 'intersection'
	| 'point_sur'
	| 'point'
	| 'milieu'
	| 'projection'
	| 'droite'
	| 'segment'
	| 'demidroite'
	| 'parallele'
	| 'perpendiculaire'
	| 'cercle';

/** Un argument tel qu'écrit : un nom, une construction, ou un nombre en texte. */
export type ReadArgument =
	| { readonly kind: 'name'; readonly name: string }
	| { readonly kind: 'call'; readonly call: ReadCall }
	| { readonly kind: 'scalar'; readonly text: string };

/** Un appel du DSL, ou un raccourci de manuel. */
export interface ReadCall {
	readonly word: ConstructionWord;
	/** Le raccourci écrit (`(AB)`, `[AB]`, `[AB)`), s'il en est un. */
	readonly shortcut?: 'line' | 'segment' | 'ray';
	readonly positional: readonly ReadArgument[];
	readonly named: ReadonlyMap<string, ReadArgument>;
	/** L'appel tel qu'écrit, LaTeX retiré (`milieu(A, B)`, `(AB)`). */
	readonly text: string;
}

export type ReadOutcome =
	{ readonly ok: true; readonly call: ReadCall } | { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const CONSTRUCTION_WORDS: readonly ConstructionWord[] = [
	'intersection',
	'point_sur',
	'point',
	'milieu',
	'projection',
	'droite',
	'segment',
	'demidroite',
	'parallele',
	'perpendiculaire',
	'cercle'
];

/** Les arguments nommés que chaque mot accepte (ceux du DSL, catalogue L3). */
const NAMED_KEYS: Readonly<Record<ConstructionWord, readonly string[]>> = {
	intersection: [],
	point_sur: [],
	point: [],
	milieu: [],
	projection: ['axe'],
	droite: [],
	segment: [],
	demidroite: [],
	parallele: [],
	perpendiculaire: [],
	cercle: ['rayon', 'passant']
};

/** Un nom d'objet de l'atelier : une lettre, un indice éventuel (`names.ts`). */
const NAME = /^[A-Za-z](?:_\d+)?$/;

/**
 * Un raccourci : deux noms entre `(…)`, `[…]` ou `[…)`, que rien ne précède
 * qui en ferait un appel (`f(AB)`) ou un indice. `\uE000` (usage privé) n’apparaît jamais
 * dans une saisie : il marque ici la place d'un raccourci déjà lu.
 */
const SHORTCUT =
	/(?<![A-Za-z0-9_À-ɏ])([([])\s*([A-Za-z](?:_\d+)?)\s*([A-Za-z](?:_\d+)?)\s*([)\]])/g;
const MARK = /^\uE000(\d+)\uE000$/;

/** Un raccourci tel qu'ÉCRIT, texte ou LaTeX de MathLive, pour le renommage. */
const WRITTEN_SHORTCUT =
	/((?:\\left\s*)?(?:\(|\[|\\lbrack))(\s*)([A-Za-z](?:_\d+|_\{\d+\})?)(\s*)([A-Za-z](?:_\d+|_\{\d+\})?)(\s*)((?:\\right\s*)?(?:\)|\]|\\rbrack))/g;

/** Un mot suivi d'une parenthèse : `milieu(`, `parallèle (`, `demi-droite(`. */
const CALL_HEAD = /^([A-Za-zÀ-ɏ_]+(?:-[A-Za-zÀ-ɏ_]+)*)\s*\(/;

/** Les fonctions de calcul du DSL : ce sont des nombres, lus par l'atelier. */
const MATH_WORDS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan']);

// =============================================================================
// Lecture
// =============================================================================

/** Le mot sans accent ni tiret : `parallèle` → `parallele`, `demi-droite` → `demidroite`. */
export function plainWord(word: string): string {
	return word.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/-/g, '');
}

/**
 * Les MESURES (lot 2, PR 2, L4) : des valeurs, lues par `measures.ts` — ni des
 * constructions, ni des mots « pas encore dans l'atelier ».
 */
export const MEASURE_WORDS = ['distance', 'aire', 'perimetre', 'angle'] as const;
export type MeasureWord = (typeof MEASURE_WORDS)[number];

/** `périmètre` → `perimetre` ; `null` si ce n'est pas un mot de mesure. */
export function measureWordOf(word: string): MeasureWord | null {
	const plain = plainWord(word);
	return (MEASURE_WORDS as readonly string[]).includes(plain) ? (plain as MeasureWord) : null;
}

/** Un mot du DSL hors catalogue (`médiatrice`, `intersection`) ? */
export function isLaterWord(word: string): boolean {
	const plain = plainWord(word);
	return (
		BUILTIN_NAMES.has(plain) &&
		!MATH_WORDS.has(plain) &&
		measureWordOf(plain) === null &&
		!(CONSTRUCTION_WORDS as readonly string[]).includes(plain)
	);
}

/** « médiatrice » n'est pas encore dans l'atelier. */
export function laterWordMessage(typed: string): string {
	return `« ${typed} » n’est pas encore dans l’atelier.`;
}

/**
 * Le texte d'une définition, LaTeX de MathLive retiré (`\left(AB\right)` →
 * `(AB)`, `\operatorname{milieu}` → `milieu`, `2{,}5` → `2,5`). Un nombre
 * écrit en LaTeX (`\frac{1}{2}`, `\sqrt{2}`) reste du LaTeX : sa lecture le
 * reconnaît (`astOf`, provenance « texte »).
 */
export function constructionText(definition: string, provenance: Provenance = 'text'): string {
	// La règle de `readingMode` (`parse.ts`), recopiée : `parse.ts` lit les
	// constructions par ce module, l'importer ici ferait une boucle d'imports
	const latex = provenance === 'mathfield' || provenance === 'keyboard' || provenance === 'storage';
	if (!latex) return definition.trim();
	return (
		definition
			.replace(/\\left\s*(?:\\lbrack|\[)/g, '[')
			.replace(/\\right\s*(?:\\rbrack|\])/g, ']')
			.replace(/\\left\s*\(/g, '(')
			.replace(/\\right\s*\)/g, ')')
			.replace(/\\left\s*\.|\\right\s*\./g, '')
			.replace(/\\lbrack/g, '[')
			.replace(/\\rbrack/g, ']')
			// `point\_sur` : le tiret bas du mot, échappé par la carte (`constructionLatex`)
			.replace(/\\_/g, '_')
			.replace(/\\(?:operatorname|mathrm|text|mathit)\{([^{}]*)\}/g, '$1')
			// MathLive fait de `_` un indice : `point_{sur}` est le mot du DSL
			.replace(/point\s*_\s*\{\s*s\s*u\s*r\s*\}/g, 'point_sur')
			.replace(/\\(?:acute|grave|hat)\{([A-Za-z])\}/g, '$1')
			.replace(/\{,\}/g, ',')
			.replace(/_\{(\d+)\}/g, '_$1')
			.replace(/\\[,;: !]|~/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

/** Les raccourcis remplacés par une marque, et ce qu'ils étaient. */
interface Masked {
	readonly text: string;
	readonly shortcuts: readonly {
		readonly kind: 'line' | 'segment' | 'ray';
		readonly a: string;
		readonly b: string;
		readonly written: string;
	}[];
}

function masked(text: string): Masked {
	const shortcuts: Masked['shortcuts'][number][] = [];
	const replaced = text.replace(SHORTCUT, (whole, open: string, a: string, b: string, close) => {
		const kind =
			open === '(' && close === ')'
				? 'line'
				: open === '[' && close === ']'
					? 'segment'
					: open === '[' && close === ')'
						? 'ray'
						: null;
		// `(AB]` : pas une écriture de manuel, laissée telle quelle
		if (kind === null) return whole;
		shortcuts.push({ kind, a, b, written: `${open}${a}${b}${close}` });
		return `\uE000${shortcuts.length - 1}\uE000`;
	});
	return { text: replaced, shortcuts };
}

/** Le texte d'origine d'un morceau masqué (un raccourci lu comme un nombre : `(ab)`). */
function unmasked(text: string, mask: Masked): string {
	return text.replace(/\uE000(\d+)\uE000/g, (_, i: string) => mask.shortcuts[Number(i)].written);
}

/** Lecture interne : un refus remonte par exception, attrapée par `readConstruction`. */
class Refusal extends Error {}

/** L'indice de la parenthèse qui ferme celle ouverte en `open`, ou -1. */
function closing(text: string, open: number): number {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		const char = text[i];
		if ('([{'.includes(char)) depth++;
		else if (')]}'.includes(char) && --depth === 0) return i;
	}
	return -1;
}

/** Les morceaux de premier niveau séparés par `separator`. */
function splitFirstLevel(text: string, separator: ',' | ';'): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if ('([{'.includes(char)) depth++;
		else if (')]}'.includes(char)) depth--;
		else if (char === separator && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
}

/** Ce qui est au premier niveau d'un contenu : parenthèses internes vidées. */
function firstLevelOf(text: string): string {
	let depth = 0;
	let flat = '';
	for (const char of text) {
		if ('([{'.includes(char)) depth++;
		if (depth === 0) flat += char;
		if (')]}'.includes(char)) depth--;
	}
	return flat;
}

/** Les arguments d'un appel, selon la règle des séparateurs. */
function argumentsOf(content: string, word: string): string[] {
	const level = firstLevelOf(content);
	const separatingComma = /,(?!\d)|(?<!\d),/.test(level);
	const decimalComma = /\d,\d/.test(level);
	// Le nombre de l'élève (`0,3`), sinon l'exemple (revue de la PR 3)
	const shown = /\d+,\d+/.exec(level)?.[0] ?? '1,5';
	const ambiguous = `Sépare les arguments de ${word} avec « ; » : une virgule entre deux chiffres est décimale (${shown}).`;
	let parts: string[];
	if (level.includes(';')) {
		if (separatingComma) throw new Refusal(ambiguous);
		parts = splitFirstLevel(content, ';');
	} else {
		if (decimalComma) throw new Refusal(ambiguous);
		parts = content.trim() === '' ? [] : splitFirstLevel(content, ',');
	}
	if (parts.some((part) => part.trim() === '')) {
		throw new Refusal(`Il manque un argument dans ${word}(…).`);
	}
	return parts.map((part) => part.trim());
}

/**
 * Les arguments d'un appel quelconque (une mesure : `aire(A ; M ; N)`), lus
 * comme ceux d'une construction : mêmes séparateurs, mêmes raccourcis. `content`
 * est le texte ENTRE les parenthèses, LaTeX déjà retiré (`constructionText`).
 */
export function readArguments(
	content: string,
	word: string
):
	| { readonly ok: true; readonly args: readonly ReadArgument[] }
	| { readonly ok: false; readonly message: string } {
	const mask = masked(content);
	try {
		return { ok: true, args: argumentsOf(mask.text, word).map((part) => readArgument(part, mask)) };
	} catch (error) {
		if (error instanceof Refusal) return { ok: false, message: error.message };
		throw error;
	}
}

/** Lire un argument (ou le tout) : raccourci, appel, nom ou nombre. */
function readArgument(piece: string, mask: Masked): ReadArgument {
	const text = piece.trim();
	const mark = MARK.exec(text);
	if (mark !== null) {
		const shortcut = mask.shortcuts[Number(mark[1])];
		return { kind: 'call', call: shortcutCall(shortcut) };
	}
	const head = CALL_HEAD.exec(text);
	if (head !== null) {
		const open = head[0].length - 1;
		if (closing(text, open) === text.length - 1) {
			const plain = plainWord(head[1]);
			if ((CONSTRUCTION_WORDS as readonly string[]).includes(plain)) {
				return { kind: 'call', call: readCall(plain as ConstructionWord, text, open, mask) };
			}
			if (isLaterWord(head[1])) throw new Refusal(laterWordMessage(head[1]));
		}
	}
	// Un mot du DSL hors catalogue pris dans un nombre (`2·aire(…)`)
	for (const match of unmasked(text, mask).matchAll(/([A-Za-zÀ-ɏ_]+)\s*\(/g)) {
		if (isLaterWord(match[1])) throw new Refusal(laterWordMessage(match[1]));
	}
	if (NAME.test(text)) return { kind: 'name', name: text };
	return { kind: 'scalar', text: unmasked(text, mask) };
}

function shortcutCall(shortcut: Masked['shortcuts'][number]): ReadCall {
	const word: ConstructionWord =
		shortcut.kind === 'line' ? 'droite' : shortcut.kind === 'segment' ? 'segment' : 'demidroite';
	return {
		word,
		shortcut: shortcut.kind,
		positional: [
			{ kind: 'name', name: shortcut.a },
			{ kind: 'name', name: shortcut.b }
		],
		named: new Map(),
		text: shortcut.written
	};
}

function readCall(word: ConstructionWord, text: string, open: number, mask: Masked): ReadCall {
	const content = text.slice(open + 1, -1);
	const positional: ReadArgument[] = [];
	const named = new Map<string, ReadArgument>();
	for (const piece of argumentsOf(content, word)) {
		const key = /^([A-Za-z_À-ɏ]+)\s*=(?!=)([\s\S]*)$/.exec(piece);
		if (key !== null) {
			const name = plainWord(key[1]);
			if (!NAMED_KEYS[word].includes(name)) {
				throw new Refusal(`${word}(…) ne connaît pas l’argument « ${key[1]} » dans l’atelier.`);
			}
			named.set(name, readArgument(key[2], mask));
			continue;
		}
		if (named.size > 0) {
			throw new Refusal(`Dans ${word}(…), les arguments nommés (rayon=…) viennent en dernier.`);
		}
		positional.push(readArgument(piece, mask));
	}
	return { word, positional, named, text: unmasked(text, mask) };
}

/**
 * Lire une définition comme une construction.
 *
 * @returns `null` si ce n'est pas une construction (le calcul suit son chemin :
 *   `2a + 1`, `(1 ; 2)`, `sqrt(2)`) ; sinon l'appel lu, ou le refus en français.
 *   Un mot du DSL hors catalogue (`médiatrice(A, B)`) est un refus, jamais un calcul.
 */
export function readConstruction(definition: string, provenance: Provenance): ReadOutcome | null {
	const text = constructionText(definition, provenance);
	if (text === '') return null;
	const mask = masked(text);
	const whole = mask.text.trim();
	const head = CALL_HEAD.exec(whole);
	const isCall =
		head !== null &&
		closing(whole, head[0].length - 1) === whole.length - 1 &&
		((CONSTRUCTION_WORDS as readonly string[]).includes(plainWord(head[1])) ||
			isLaterWord(head[1]));
	if (!isCall && MARK.exec(whole) === null) return null;
	try {
		const read = readArgument(whole, mask);
		if (read.kind !== 'call') return null;
		return { ok: true, call: read.call };
	} catch (error) {
		if (error instanceof Refusal) return { ok: false, message: error.message };
		throw error;
	}
}

/** Le raccourci `(AB)` seul, tel que Calcul doit le départager d'un produit (`(ab)`). */
export function bareLineShortcut(call: ReadCall): readonly [string, string] | null {
	if (call.shortcut !== 'line') return null;
	const [a, b] = call.positional;
	return a?.kind === 'name' && b?.kind === 'name' ? [a.name, b.name] : null;
}

/**
 * Le premier mot du DSL hors catalogue appelé dans une saisie (`2·aire(A, B, C)`),
 * pour le refus de Calcul — ou `null`.
 */
export function laterWordIn(text: string): string | null {
	for (const match of text.matchAll(
		/(?<![A-Za-zÀ-ɏ_\\])([A-Za-zÀ-ɏ_]+(?:-[A-Za-zÀ-ɏ_]+)*)\s*\(/g
	)) {
		if (isLaterWord(match[1])) return match[1];
	}
	return null;
}

/**
 * Un mot du CATALOGUE pris dans un calcul (`2·milieu(A, B)`), ou `null` :
 * une construction ne se calcule pas, elle se nomme ou s'écrit seule.
 */
export function constructionWordIn(text: string): string | null {
	for (const match of text.matchAll(
		/(?<![A-Za-zÀ-ɏ_\\])([A-Za-zÀ-ɏ_]+(?:-[A-Za-zÀ-ɏ_]+)*)\s*\(/g
	)) {
		if ((CONSTRUCTION_WORDS as readonly string[]).includes(plainWord(match[1]))) return match[1];
	}
	return null;
}

/** Les noms d'un appel lu, construction comprise, dans l'ordre (pour le renommage). */
export function renameInConstruction(
	definition: string,
	provenance: Provenance,
	from: string,
	to: string
): string | null {
	if (readConstruction(definition, provenance) === null) return null;
	// `A_{1}` (MathLive) et `A_1` sont le même nom ; on réécrit dans l'écriture trouvée
	const same = (id: string) => id.replace(/_\{(\d+)\}/, '_$1') === from;
	const written = (id: string) => (id.includes('{') ? to.replace(/_(\d+)/, '_{$1}') : to);
	const renamed = (id: string) => (same(id) ? written(id) : id);
	// Les raccourcis d'abord, LaTeX compris (`\left(AB\right)`, `\left\lbrack AB\right\rbrack`) :
	// `(AB)` ne contient pas l'identifiant `A` pour une expression régulière de mots
	const shortcuts = definition.replace(
		WRITTEN_SHORTCUT,
		(
			whole: string,
			open: string,
			s1: string,
			a: string,
			s2: string,
			b: string,
			s3: string,
			close: string,
			at: number
		) => {
			// `f(AB)` : un appel, pas un raccourci (comme `SHORTCUT`)
			const bare = open === '(' || open === '[';
			if (bare && /[A-Za-z0-9_À-ɏ]/.test(definition[at - 1] ?? '')) return whole;
			return `${open}${s1}${renamed(a)}${s2}${renamed(b)}${s3}${close}`;
		}
	);
	return shortcuts.replace(/(?<![A-Za-z\\])[A-Za-z](?:_\d+|_\{\d+\})?(?![A-Za-z])/g, renamed);
}
