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
import { detectInputFormat, hasBareFunctionCall } from '$lib/mathAST/cli/core/input-detector';
import { toLatex } from '$lib/mathAST/latex-generator';
import { bareFunctionRefusal } from '$lib/mathAST/cli/core/variable-argument';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { format as formatUnit } from '$lib/mathAST/units';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import type { MathNode } from '$lib/mathAST/types';
import {
	MAX_CATEGORIES,
	MAX_CATEGORY_LENGTH,
	MAX_DEFINITION_LENGTH,
	MAX_LIST_VALUES
} from './types';
import type { MissingReference, ObjectKind } from './types';
import { readListValue, readNumber } from '$lib/statistics/read-value';
import { hasObjectNameShape } from './names';
import { argumentSemicolonsLatex, coupleOrSetRefusal, decimalCommaInput } from './decimal-comma';
import { objectKindOf, partsOf, specOf } from './construction-spec';
import { hasMeasureCall, measureShapeRefusal, withoutMeasureCalls } from './measures-read';
import { perfSwitches } from './perf-switches';
import {
	CURVE_NEEDS_XY,
	CURVE_UNIT,
	POINT_NO_XY,
	POINT_UNIT,
	equationShapeRefusal,
	reservedYMessage,
	splitCoordinates
} from './geometry';

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
/**
 * Les noms que le parseur doit reconnaître comme des FONCTIONS.
 *
 * ⚠️ `mathAST` n'accepte l'apostrophe que sur ses noms par défaut —
 * `f g h u v w`. Mesuré : `f'` se lit, `k'` **échoue**. Or l'élève nomme ses
 * fonctions comme il veut, et `k` est même l'un des noms que l'atelier propose…
 * pour les valeurs.
 *
 * Signalé par David le 2026-09-16 (« on ne peut pas avoir k'(x)=b ? ») : la
 * limite n'était pas dans la dérivation — `mathAST` dérive très bien `b*x` en
 * `b` — mais dans la LECTURE, un cran avant.
 *
 * ⚠️⚠️ On n'ajoute QUE les noms réellement portés par une fonction de
 * l'atelier. Déclarer tout l'alphabet casse la lecture du reste : `zzz(x)` se
 * met à désigner des appels de fonction, et trois tests de l'attente l'ont
 * montré aussitôt.
 */
const DEFAULT_FUNCTION_NAMES = ['f', 'g', 'h', 'u', 'v', 'w'] as const;

function genericFunctionsFor(extraNames: readonly string[] | undefined) {
	const names = new Set<string>(DEFAULT_FUNCTION_NAMES);
	for (const name of extraNames ?? []) names.add(name);
	return { names: [...names], allowDerivatives: true, allowInverse: true };
}

/**
 * Le symbole `π` tapé tel quel, réécrit `\pi` — la constante, que les deux
 * parseurs connaissent. Sans quoi ils lisent une VARIABLE nommée « π » :
 * `f(x) = 2sin(π x)` ne s'évaluait pas, et sa dérivée l'affichait comme une
 * lettre. L'atelier conseille pourtant « \pi ou le symbole π » (#896).
 *
 * ⚠️ Propre à l'atelier : ailleurs (le DSL de géométrie), `π` est un nom comme
 * un autre, décision prise. L'espace qui suit évite de coller la commande à
 * une lettre (`πx` → `\pi x`, pas `\pix`).
 */
export function withPiCommand(text: string): string {
	return text.replace(/π/g, '\\pi ');
}

/**
 * `(2\pi )[m]` : un texte où `π` est devenu `\pi` est lu en LaTeX, qui ne
 * connaît pas les crochets d'une grandeur (« « [ » inattendu ici ») ; ses
 * unités y sont écrites `\unit{m}` (grandeur après une expression, 2026-10-18).
 * `withPiCommand` laisse une espace : `2\pi [m]`.
 *
 * ⚠️ En repli seulement dans Calcul : une ligne en texte (`sqrt(\pi )*3[m]`)
 * est lue par le parseur maison, qui connaît les crochets mais pas `\unit`.
 */
export function latexUnitsWithPi(text: string): string {
	if (!text.includes('\\pi')) return text;
	return text.replace(/(?<=[\w)}]\s*)\[([^\]]+)\]/g, (whole, writing: string) =>
		parseUnit(writing) === null ? whole : `\\unit{${writing}}`
	);
}

/**
 * `ln\left(x\right)` → `\ln\left(x\right)`. MathLive écrit ainsi un `ln` tapé
 * lettre à lettre puis une parenthèse : sans l'antislash, le parseur LaTeX lit
 * l·n·(x). L'élève a mis les parenthèses : c'est bien ln de x (revue de V59).
 * Seulement devant `\left(` : `ln x` reste refusé (`bareFunctionRefusal`), et
 * `ln(x)` se lit déjà.
 */
export function withLatexFunctionNames(text: string): string {
	return text.replace(/(?<![A-Za-z\\{])(sin|cos|tan|ln|log|exp|sqrt)(?=\s*\\left\s*\()/g, '\\$1');
}

/**
 * Le refus d'une saisie MÊLÉE : `sin(` sans antislash (texte) avec une commande
 * LaTeX que le parseur maison ne connaît pas (`\frac`, `\sqrt`, `\cdot`…).
 */
export const MIXED_NOTATION_MESSAGE =
	'Deux écritures mélangées : sin(x) est en texte, \\frac, \\sqrt ou \\cdot en LaTeX. Choisis-en une — en texte : 1/2*sin(x), sqrt(x)*cos(x), 2*cos(x) ; en LaTeX : \\frac{1}{2}\\sin(x).';

/**
 * Le message d'une saisie mêlée que le parseur maison ne lit pas, ou `null`.
 *
 * Le `sin(` l'emporte à la détection (syntaxe maison) ; le parseur maison
 * refusait alors la commande LaTeX par « Invalid backslash sequence at
 * position 0 », en anglais, montré tel quel dans une ligne de calcul (revue
 * #911). Une saisie mêlée qu'il LIT (`cos(3x+\pi/4)`, `e^{sin(x)}`) passe.
 */
export function mixedNotationMessage(text: string): string | null {
	if (!hasBareFunctionCall(text)) return null;
	const read = parseCustomSafe(withPiCommand(text));
	return read.ast === null && read.errors.some((e) => e.code === 'UNKNOWN_COMMAND')
		? MIXED_NOTATION_MESSAGE
		: null;
}

/** Les provenances qui sont la saisie de l'élève, virgule décimale et « ; » compris. */
const STUDENT_TYPED: ReadonlySet<Provenance> = new Set(['text', 'paste', 'command']);

/** Un exposant négatif sans accolades : `^-1`, `^-12`, `^-x` (un nombre ou UNE lettre, pas `^-sin(x)`) ;
 * jamais suivi d'un autre `^` : `e^-x^2` se lirait (e^{-x})² ici et e^{-x²} dans Calcul. */
const NEGATIVE_EXPONENT = /\^\s*-\s*(\d+(?:\.\d+)?|[A-Za-z](?![A-Za-z(]))(?!\s*\^)/g;

/**
 * Les lectures déjà faites (chantier perf du 2026-10-19). La lecture est une
 * fonction PURE du texte, de la provenance et des noms de fonctions : la même
 * entrée rend le même arbre. Sans ce mémo, un cran de curseur relisait chaque
 * définition des dizaines de fois (une fois par coordonnée citée, via
 * `bindingsOf`) — 1/3 du temps passait à fabriquer les exceptions du parseur.
 *
 * ⚠️ L'arbre rendu est PARTAGÉ : il ne se modifie jamais (même règle que
 * `PARSE_CACHE` de `geometry-core`). En développement et en test il est gelé,
 * pour qu'une écriture se voie aussitôt au lieu d'abîmer le mémo en silence.
 * Plafond et `clear()` au site d'insertion, comme `PARSE_CACHE`.
 */
const READ_CACHE = new Map<string, ReturnType<typeof readByProvenance>>();
const READ_CACHE_MAX = 5_000;

function parseByProvenance(
	rawDefinition: string,
	provenance: Provenance,
	functionNames?: readonly string[]
): ReturnType<typeof readByProvenance> {
	if (!perfSwitches.readCache) return readByProvenance(rawDefinition, provenance, functionNames);
	const key = `${provenance}\u0000${functionNames?.join(',') ?? ''}\u0000${rawDefinition}`;
	const known = READ_CACHE.get(key);
	if (known !== undefined) return known;
	const read = readByProvenance(rawDefinition, provenance, functionNames);
	if (import.meta.env.DEV) deepFreeze(read);
	if (READ_CACHE.size >= READ_CACHE_MAX) READ_CACHE.clear();
	READ_CACHE.set(key, read);
	return read;
}

/** Geler un résultat de lecture partagé (développement et tests seulement). */
function deepFreeze(value: unknown): void {
	if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
	Object.freeze(value);
	for (const child of Object.values(value)) deepFreeze(child);
}

function readByProvenance(
	rawDefinition: string,
	provenance: Provenance,
	functionNames?: readonly string[]
) {
	const typed = withPiCommand(withLatexFunctionNames(rawDefinition));
	// Les mêmes noms de fonctions dans les deux lectures : en LaTeX, l'atelier ne
	// les transmettait pas, et `k(x)` tapé dans la carte se lisait k·x
	const genericFunctions = genericFunctionsFor(functionNames);
	// Le « ; » de l'élève entre les arguments (`max(2,5 ; x)`) : traduit pour un
	// calcul, il ne l'était pas pour une définition — `f(1)` répondait « Écriture
	// non reconnue » (2026-10-13)
	if (readingMode(provenance) === 'latex') {
		return parseLatexSafe(argumentSemicolonsLatex(typed), { genericFunctions });
	}
	// ⚠️ La saisie de l'élève seulement : `'url'` relit aussi le texte du moteur
	// (`toCustom` écrit `max(2,3)`), dont la virgule n'est pas décimale (revue)
	const definition = STUDENT_TYPED.has(provenance) ? decimalCommaInput(typed) : typed;

	const detected = detectInputFormat(definition);
	if (detected.format === 'latex' && detected.confidence > 0.5) {
		return parseLatexSafe(latexUnitsWithPi(definition), { genericFunctions });
	}
	const read = parseCustomSafe(definition, { genericFunctions });
	// `x^-1`, `f(x)^-1`, `e^-x` : le parseur maison exige `x^{-1}`, alors qu'une
	// ligne de Calcul les lit. `g(x) = f(x)^-1` créait une g en erreur, et `g(2)`
	// répondait « Fonction inconnue : g » (constat du lot 3 de la réciproque).
	// Relu avec l'exposant entre parenthèses, seulement après ce refus-là.
	if (read.ast === null && read.errors.some((e) => e.code === 'INVALID_SUPERSCRIPT')) {
		const bracketed = definition.replace(NEGATIVE_EXPONENT, '^(-$1)');
		if (bracketed !== definition) return parseCustomSafe(bracketed, { genericFunctions });
	}
	return read;
}

/**
 * L'arbre d'une définition, ou `null` si elle ne se lit pas.
 *
 * Le pont vers le moteur (`engine.ts`) en a besoin : `createFunctionBinding` et
 * `setBinding` travaillent sur des arbres, pas sur du texte. Passer par ici
 * garantit que le moteur lit la définition **exactement** comme le panneau —
 * même provenance, donc même syntaxe (décision D10).
 */
export function astOf(
	definition: string,
	provenance: Provenance = 'url',
	functionNames?: readonly string[]
): MathNode | null {
	if (definition.trim() === '') return null;
	return parseByProvenance(definition, provenance, functionNames).ast ?? null;
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
	/** Modalités d'une liste qualitative (Q84), une par entrée */
	readonly categories?: readonly string[];
	/** La 1re entrée-mot d'une liste qui mélange nombres et mots (Q92) */
	readonly qualitativeBecause?: string;
	/**
	 * Liste : la LIGNE (1, 2…) de chaque élément de `values` ou de `categories` —
	 * une entrée par ligne de la grille (P1 : deux listes s'associent par ligne).
	 */
	readonly rows?: readonly number[];
}

/** Une valeur purement numérique, sans unité ni expression. */
const PLAIN_NUMBER = /^\s*-?\d+(?:[.,]\d+)?\s*$/;

/** Les identifiants du TEXTE — pour la réécriture au renommage, pas pour lire les dépendances. */
const IDENTIFIERS = /[A-Za-z]+(?:_\d+)?/g;

// `readNumber` et `readListValue` vivent dans le module statistique : le bloc
// ubumark `données:` lit une série comme l'atelier (Q92, v2 lot 4)
export { readListValue, readNumber };

/**
 * Les entrées d'une liste, une par INDIVIDU, telles que tapées — ou la place
 * du premier trou (`12 ; ; 15`, ou une entrée illisible `1/0`). Un point-virgule
 * final ne compte pas.
 *
 * ⚠️ Pour `.filtrer` et `.croiser` (Q89-Q90) : la liste analysée ÉCARTE ces
 * entrées, et les individus suivants se décalaient en silence d'une liste à
 * l'autre (revue : la note d'un autre élève était rendue).
 */
export function individualEntries(
	definition: string,
	qualitative: boolean
): { entries: string[] } | { hole: number } {
	const parts = definition.split(';').map((part) => part.trim());
	while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
	const hole = parts.findIndex(
		(part) => part === '' || (!qualitative && readListValue(part) === null)
	);
	return hole === -1 ? { entries: parts } : { hole: hole + 1 };
}

/** Un MOT (Q84) : au moins une lettre. `1/0` n'en est pas un, il reste « ignoré » (Q45). */
const WORD = /\p{L}/u;

/** La clé d'une modalité (Q85) : sans la casse ni les espaces autour, accents comptés */
function categoryKey(entry: string): string {
	return entry.trim().toLocaleLowerCase('fr');
}

/**
 * Les entrées d'une liste qualitative, chacune écrite comme sa PREMIÈRE
 * occurrence (Q85) — `Fille ; fille` donne deux fois `Fille` — ou le refus
 * (Q91 : modalités trop nombreuses ou trop longues).
 */
function readCategories(entries: readonly string[]): { categories: string[] } | { error: string } {
	const first = new Map<string, string>();
	for (const entry of entries) {
		if (entry.length > MAX_CATEGORY_LENGTH) {
			return {
				error: `« ${entry} » est trop longue : une modalité a au plus ${MAX_CATEGORY_LENGTH} caractères.`
			};
		}
		const key = categoryKey(entry);
		if (!first.has(key)) first.set(key, entry);
	}
	if (first.size > MAX_CATEGORIES) {
		return {
			error: `Une liste qualitative a au plus ${MAX_CATEGORIES} modalités (celle-ci en a ${first.size}).`
		};
	}
	return { categories: entries.map((entry) => first.get(categoryKey(entry))!) };
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
		// `readListValue` et non `readNumber` : le vrai signe moins compte ici
		// aussi, sinon `−3,14` serait découpé en « −3 ; 14 » (revue Q50)
		if (readListValue(segment) !== null) continue;

		const pieces = segment.split(',').map((piece) => piece.trim());
		// Que des nombres (`12,15,9`) ou que des fractions (`1/2,3/4`, Q49) : un
		// mélange comme `1,5/2` se corrigerait en « 1 ; 5/2 », faux
		const allNumbers = pieces.every(
			(piece) => !piece.includes('/') && readListValue(piece) !== null
		);
		const allFractions = pieces.every(
			(piece) => piece.includes('/') && readListValue(piece) !== null
		);
		// Des mots (Q86) : `fille, garçon` — jamais une écriture décimale
		const allWords = pieces.every((piece) => piece !== '' && WORD.test(piece));
		if (pieces.length < 2 || !(allNumbers || allFractions || allWords)) continue;

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
	provenance: Provenance = 'url',
	functionNames?: readonly string[]
): ParsedDefinition {
	if (definition.trim() === '') return {};

	if (kind === 'list') {
		if (definition.length > MAX_DEFINITION_LENGTH) {
			return {
				values: [],
				skipped: 0,
				error: `Une liste ne peut pas dépasser ${MAX_DEFINITION_LENGTH} caractères (celle-ci en a ${definition.length}) : elle ne pourrait pas être enregistrée.`
			};
		}
		const misused = commaUsedAsSeparator(definition);
		if (misused !== null) {
			return { values: [], skipped: 0, error: misused };
		}

		const parts = definition.split(';');

		// Q84 : un mot, et toute la liste est qualitative
		const entries = parts.map((part) => part.trim()).filter((part) => part !== '');
		// La ligne de chaque entrée non vide (P1)
		const entryRows = parts.flatMap((part, i) => (part.trim() === '' ? [] : [i + 1]));
		// Q92 : une entrée qui se lit comme un nombre (`1e3`) n'est jamais un mot
		const isWord = (entry: string) => WORD.test(entry) && readListValue(entry) === null;
		if (entries.some(isWord)) {
			if (entries.length > MAX_LIST_VALUES) {
				// Refusée, elle reste qualitative (actions d'une liste de mots)
				return {
					values: [],
					skipped: 0,
					categories: entries,
					error: `Une liste ne peut pas dépasser ${MAX_LIST_VALUES} valeurs (celle-ci en a ${entries.length}).`
				};
			}
			const read = readCategories(entries);
			// Refusée, elle reste QUALITATIVE (revue) : ses actions sont celles d'une
			// liste de mots, désactivées, pas le catalogue numérique
			// Q92 : une liste MÉLANGÉE dit quelle entrée la rend qualitative (un
			// `2x` tapé par erreur dans des notes la basculait en silence)
			const mixed = entries.some((entry) => !isWord(entry));
			const because = mixed ? { qualitativeBecause: entries.find(isWord)! } : {};
			return 'error' in read
				? {
						values: [],
						skipped: 0,
						categories: entries,
						rows: entryRows,
						error: read.error,
						...because
					}
				: { values: [], skipped: 0, categories: read.categories, rows: entryRows, ...because };
		}

		const values: number[] = [];
		const rows: number[] = [];
		let skipped = 0;
		parts.forEach((part, i) => {
			// Une entrée vide est une case vide de la grille (`12 ; ; 15`, tableur
			// intégré), pas une valeur écartée : rien à signaler
			if (part.trim() === '') return;
			const n = readListValue(part);
			if (n === null) skipped++;
			else {
				values.push(n);
				rows.push(i + 1);
			}
		});
		// Plafond D8 : la liste garde ses valeurs et porte son erreur — on ne jette
		// pas la saisie de l'élève, on lui dit ce qui bloque. Le contrôle vit ici
		// et non à la construction de l'objet : `recomputeAll` repart toujours de
		// `parseDefinition`, et écraserait un statut posé ailleurs.
		if (values.length > MAX_LIST_VALUES) {
			return {
				values,
				skipped,
				rows,
				error: `Une liste ne peut pas dépasser ${MAX_LIST_VALUES} valeurs (celle-ci en a ${values.length}).`
			};
		}
		return { values, skipped, rows };
	}

	if (kind === 'point' || kind === 'curve') {
		// Géométrie, lot 2 : `milieu(A, B)`, `(AB)`… une construction (L2, L3)
		const construction = parseConstruction(kind, definition, provenance, functionNames);
		if (construction !== null) return construction;
	}
	if (kind === 'point') return parsePoint(definition, provenance, functionNames);
	if (kind === 'curve') return parseCurve(definition, provenance, functionNames);

	// Une mesure (`aire(A, B, C)`, lot 2, L4) se lit comme un nombre : sa forme
	// ici, sa valeur avec l'atelier (`measures.ts`)
	if (
		(kind === 'value' || kind === 'function' || kind === 'sequence') &&
		hasMeasureCall(definition, provenance)
	) {
		const shape = measureShapeRefusal(definition, provenance);
		if (shape !== null) return { error: shape };
		return parseDefinition(
			kind,
			withoutMeasureCalls(definition, provenance),
			provenance,
			functionNames
		);
	}

	if (kind === 'value' && PLAIN_NUMBER.test(definition)) return {};

	// V59 : la carte refuse `ln x` comme la ligne de calcul — sans quoi un
	// `ln x` sans antislash venu de MathLive se lisait l·n·x
	const bare = bareFunctionRefusal(definition);
	if (bare !== null) return { error: bare };

	const result = parseByProvenance(definition, provenance, functionNames);
	if (!result.ast) {
		return {
			error:
				coupleOrSetRefusal(definition) ??
				mixedNotationMessage(definition) ??
				`« ${definition.trim()} » n'est pas une expression valide.`
		};
	}

	// G5 : `y` est la variable des équations de courbe. Ailleurs, aucun objet ne
	// peut s'appeler ainsi : sans ce refus, `f(x) = x + y` attendait un `y` à jamais
	if (getVariables(result.ast).has('y')) return { error: reservedYMessage(kind) };

	if (kind === 'value') {
		// Décision D4 : la grandeur est acceptée, mais elle ne prendra pas de
		// curseur — c'est au modèle d'en décider, pas ici.
		const symbol = unitSymbolOf(result.ast);
		if (symbol) return { unit: symbol };
	}
	return {};
}

/**
 * Une construction (géométrie, lot 2) : sa forme (`construction-read.ts`), le
 * type qu'elle crée — un point ou une courbe, selon le mot —, et ses nombres
 * (coordonnées, rayon) lus comme des valeurs, sans unité, sans x ni y. Les
 * TYPES des objets cités se contrôlent avec l'atelier (`recomputeAll`).
 * `null` si la définition n'est pas une construction.
 */
function parseConstruction(
	kind: 'point' | 'curve',
	definition: string,
	provenance: Provenance,
	functionNames: readonly string[] | undefined
): ParsedDefinition | null {
	const read = specOf(definition, provenance);
	if (read === null) return null;
	if (!read.ok) return { error: read.message };
	const made = objectKindOf(read.spec);
	if (made !== kind) {
		const what = made === 'point' ? 'un point' : 'une ligne ou un cercle';
		const wanted = kind === 'point' ? 'pas un point' : 'pas une courbe';
		return { error: `${read.call.text} construit ${what}, ${wanted}.` };
	}
	for (const scalar of partsOf(read.spec).scalars) {
		const ast = astOf(scalar, 'text', functionNames);
		const variables = ast === null ? new Set<string>() : getVariables(ast);
		if (variables.has('x') || variables.has('y')) {
			return { error: `« ${scalar} » : les nombres d’une construction ne contiennent ni x ni y.` };
		}
		const value = parseDefinition('value', scalar, 'text', functionNames);
		if (value.error !== undefined) return { error: value.error };
		if (value.unit !== undefined) {
			return { error: `« ${scalar} » : les nombres d’une construction sont sans unité.` };
		}
	}
	return {};
}

/**
 * Un point (`(a ; 2a)`, G3) : deux coordonnées, chacune lue comme une valeur —
 * virgule décimale et fractions comprises (P3) —, sans unité (P8), sans x ni y.
 */
function parsePoint(
	definition: string,
	provenance: Provenance,
	functionNames: readonly string[] | undefined
): ParsedDefinition {
	const split = splitCoordinates(definition);
	if (!split.ok) return { error: split.message };
	for (const coordinate of split.coordinates) {
		// x et y d'abord : la lecture d'une valeur refuserait y avec un autre message
		const ast = astOf(coordinate, provenance, functionNames);
		const variables = ast === null ? new Set<string>() : getVariables(ast);
		if (variables.has('x') || variables.has('y')) return { error: POINT_NO_XY };
		const read = parseDefinition('value', coordinate, provenance, functionNames);
		if (read.error !== undefined) return { error: read.error };
		if (read.unit !== undefined) return { error: POINT_UNIT };
	}
	return {};
}

/**
 * Une courbe (`y = 3x - 2`, G0) : une équation à un seul « = » (C9, C10), qui
 * contient x ou y (C8), sans unité (C11, D4). Gardée telle qu'écrite (C7).
 */
function parseCurve(
	definition: string,
	provenance: Provenance,
	functionNames: readonly string[] | undefined
): ParsedDefinition {
	const shape = equationShapeRefusal(definition);
	if (shape !== null) return { error: shape };
	const bare = bareFunctionRefusal(definition);
	if (bare !== null) return { error: bare };
	const result = parseByProvenance(definition, provenance, functionNames);
	if (!result.ast) {
		return {
			error:
				mixedNotationMessage(definition) ??
				`« ${definition.trim()} » n'est pas une équation valide.`
		};
	}
	if (unitSymbolOf(result.ast) !== null) return { error: CURVE_UNIT };
	const variables = getVariables(result.ast);
	if (!variables.has('x') && !variables.has('y')) return { error: CURVE_NEEDS_XY };
	return {};
}

/**
 * Les deux coordonnées d'un point telles qu'écrites, ou `null` si la définition
 * n'a pas la forme d'un point (`(1 ; 2)`).
 */
export function pointCoordinatesOf(definition: string): readonly [string, string] | null {
	const split = splitCoordinates(definition);
	return split.ok ? split.coordinates : null;
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
	provenance: Provenance = 'url',
	functionNames?: readonly string[]
): MissingReference[] {
	const result = parseByProvenance(definition, provenance, functionNames);
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
 * Les noms qu'une définition emploie COMME UN NOMBRE (V58) : `a` dans
 * `ax`, `a^2`, et dans `a(2) + a` — là où `referencesOf` fait gagner l'appel.
 *
 * Lus dans l'ARBRE, jamais dans le texte (`ax` est `a·x`) : une variable
 * seule. Ne comptent pas :
 * - la base d'un indice (`a_1`, `u_n`) : `a_1` est un autre nom, `u_n` la
 *   notation d'une suite ;
 * - la base d'une puissance −1 (`f^(-1)`, ce que devient `f^-1`) : la
 *   réciproque. `f'(x)`, `f^{-1}(x)` sont déjà des appels dans l'arbre.
 */
export function bareNamesOf(
	definition: string,
	provenance: Provenance = 'url',
	functionNames?: readonly string[]
): string[] {
	const result = parseByProvenance(definition, provenance, functionNames);
	if (!result.ast) return [];
	const found = new Set<string>();
	collectBareNames(result.ast, found);
	return [...found].filter(hasObjectNameShape);
}

/** Une puissance −1 : `-1` ou `-(1)`, tels que les parseurs les rendent. */
function isMinusOne(node: unknown): boolean {
	if (!node || typeof node !== 'object') return false;
	const o = node as Record<string, unknown>;
	if (o.type === 'number') return o.value === '-1';
	if (o.type === 'opposite') {
		const operand = o.operand as Record<string, unknown> | undefined;
		return operand?.type === 'number' && operand.value === '1';
	}
	if (o.type === 'delimiter') return isMinusOne(o.content);
	return false;
}

function collectBareNames(node: unknown, into: Set<string>): void {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const item of node) collectBareNames(item, into);
		return;
	}
	const o = node as Record<string, unknown>;
	if (o.type === 'variable' && typeof o.name === 'string') {
		into.add(o.name);
		return;
	}
	// `a_1`, `u_n` : ni la base ni l'indice ne sont un nombre de l'atelier
	if (o.type === 'subscript') return;
	if (o.type === 'superscript' && isMinusOne(o.superscript)) {
		const base = o.base as Record<string, unknown> | undefined;
		if (base?.type === 'variable') return;
	}
	for (const value of Object.values(o)) collectBareNames(value, into);
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
