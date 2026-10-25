/**
 * La saisie « Écriture mathématique » de Calcul, sans point (en essai)
 *
 * Décisions de David du 2026-10-13 (`docs/archive/wip/atelier-saisie-naturelle.md`) :
 * le premier mot décide (commande ou calcul), les petits mots ne sont des mots
 * que dans une commande, un mot devient texte quand il est FINI, une unité ne
 * se lit qu'après « nombre + espace ». Depuis le 2026-10-14, l'élève choisit
 * ce mode ou le texte dans les réglages (`docs/archive/wip/atelier-reglages-phase0.md`).
 *
 * Logique pure, sans MathLive : le champ (`NaturalField.svelte`) lui passe le
 * LaTeX à gauche du curseur et applique ce qu'elle rend.
 *
 * @module atelier/natural-input
 */

import { plain, type AtelierCommand } from '$lib/atelier/commands';
import { normalizePasted } from '$lib/atelier/parse';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import { resolveUnit, UNIT_FAMILIES } from '$lib/mathAST/units/definitions';

// Types

export type LineKind = 'command' | 'function-definition' | 'value-definition' | 'calculation';

/** Un mot de commande, toutes graphies comprises. */
export interface CommandWord {
	/** Le nom du catalogue (`résoudre`) : celui qu'on envoie à `runInput`. */
	readonly french: string;
	/** Les graphies reconnues, sans accent ni majuscule (`resous`). */
	readonly forms: readonly string[];
	/** Le modèle à trous, en LaTeX (`\text{intégrer}\,\placeholder{}…`). */
	readonly template: string;
	readonly description: string;
}

/** Le mot qui finit juste avant le curseur (ou avant ce qui vient de le finir). */
export interface WordAtCaret {
	/** Les lettres (`km`), ou `min` pour l'opérateur `\min` posé par MathLive. */
	readonly word: string;
	/** Combien d'atomes MathLive il occupe (une lettre = un atome ; `\min` = un). */
	readonly atoms: number;
	readonly place: 'start' | 'after-number' | 'elsewhere';
}

export interface Proposal {
	readonly label: string;
	readonly detail: string;
	/** Ce qui remplace le mot commencé. */
	readonly latex: string;
}

export type CalcText = { ok: true; text: string } | { ok: false; message: string };

// Constantes

/** Les petits mots (décision 3) : des mots seulement dans une commande. */
export const SMALL_WORDS: readonly string[] = 'de à en sur pour dans et ordre par'.split(' ');

/** Les mots-clés qui séparent les cases d'un modèle (`atelier-syntaxe.md`). */
const TEMPLATE_KEYWORDS: ReadonlySet<string> = new Set('de à en pour dans sur et ordre'.split(' '));

/** Les formes conjuguées (décision 2) : « résous », « dérive ». */
const CONJUGATIONS: ReadonlyMap<string, string> = new Map(
	(
		'simplifier simplifie, factoriser factorise, dériver dérive, résoudre résous, intégrer intègre, ' +
		'évaluer évalue, développer développe, simuler simule, comparer compare, croiser croise, ' +
		'filtrer filtre, convertir convertis, exporter exporte'
	)
		.split(', ')
		.map((pair) => pair.split(' ') as [string, string])
);

/** Les préfixes du SI, pour nommer une unité préfixée (le module écrit « kmètre »). */
const PREFIX_NAMES: ReadonlyMap<string, string> = new Map(
	'G giga, M méga, k kilo, h hecto, da déca, d déci, c centi, m milli, μ micro, n nano, p pico'
		.split(', ')
		.map((pair) => pair.split(' ') as [string, string])
);

const PLACEHOLDER = String.raw`\placeholder{}`;

/** Une lettre, accents français compris (MathLive range « é » tel quel : mesuré). */
const LETTER = 'A-Za-zÀ-ÖØ-öø-ÿ';

/** Ce qui finit un mot : l'espace du champ (`\,`) ou un opérateur. */
const TERMINATOR = /(?:\\,|\\ |[+\-=<>;]|\\(?:le|ge|leq|geq|ne|times|cdot|div)(?![A-Za-z]))$/;

/** Un nombre suivi de l'espace du champ (`5\,`, `\frac12\,`), ou une unité et sa barre. */
const AFTER_NUMBER = /(?:(?:\d|\\frac\d\d|\\frac\{\d+\}\{\d+\})\\,|\\mathrm\{[^{}]+\}\/)$/;

/** `f(x) =`, `f\left(x\right)\,=` (l'espace tapée est `\,`). */
const FUNCTION_DEFINITION =
	/^[A-Za-z](?:_\{?\w+\}?)?(?:\\left)?\(\s*[A-Za-z]\s*(?:\\right)?\)(?:\s|\\,)*=/;
const VALUE_DEFINITION = /^[A-Za-z](?:_\{?\w+\}?)?(?:\s|\\,)*=/;

/** Les unités proposées : familles du module d'unités, puis quelques autres. */
const UNIT_PROPOSALS: readonly string[] = [
	...new Set([
		...Object.values(UNIT_FAMILIES).flat(),
		...'ha a N J W kW kWh V Pa Hz °C km/h m/s m² cm² km² m³ cm³'.split(' ')
	])
].filter((unit) => parseUnit(unit.replace('²', '^2').replace('³', '^3')) !== null);

/**
 * Raccourcis par défaut de MathLive 0.111.1 qui se déclenchent pendant la
 * frappe d'un mot du vocabulaire ou d'une unité (mesuré sur la table
 * `INLINE_SHORTCUTS`, 259 entrées, en rejouant son tampon de frappe) :
 * - dans un mot : `in` (domaine), `int` (intégrer), `lim` (limite), `or`
 *   (factoriser, ordre, taylor), `lt` (filtrer), `mod` (mode) ; `tg` quand le
 *   « é » n'entre pas dans le tampon (texte inséré sans `keydown` : clavier de
 *   téléphone) — « in·tg·rer », le « é » effacé ;
 * - une unité collée au nombre (`5km` → `5\operatorname{\mathrm{km}}`, lu comme
 *   une grandeur) : contraire à la règle « nombre, espace, unité ».
 */
export const REMOVED_SHORTCUTS: readonly string[] =
	'in int lim or lt mod tg mm cm km kg ft inch mi lb'.split(' ');

/** Les contextes où un raccourci restreint se déclenche (jamais après `\,`). */
const CONTEXTS = 'digit+function+frac+surd+binop+relop+punct+openfence+closefence';

/**
 * Des raccourcis de fonctions gardés, mais pas là où ils cassent un mot :
 * `exp` pas en tête de ligne (exponentielle, exporter), `ch` pas après une
 * lettre (échantillons), `sec` jamais après l'espace (5 seconde). Mesuré : un
 * raccourci à contexte ne se déclenche jamais après `\,` (atome « spacing »).
 */
const RESTRICTED_SHORTCUTS = {
	exp: { after: CONTEXTS, value: '\\exp' },
	ch: { after: `nothing+${CONTEXTS}`, value: '\\operatorname{ch}' },
	sec: { after: `nothing+${CONTEXTS}`, value: '\\sec' }
};

// Fonctions

/** Une graphie comparable : sans accent, en minuscules. */
function normalized(word: string): string {
	return plain(word).toLowerCase();
}

/**
 * Le modèle à trous d'une commande, tiré de l'exemple du catalogue : chaque
 * suite de jetons entre deux mots-clés devient une case.
 * `.intégrer x^2 de 0 à 1` → « intégrer ▢ de ▢ à ▢ ».
 */
export function templateOf(french: string, example: string | undefined): string {
	const parts = [String.raw`\text{${french}}`];
	let argument = false;
	for (const token of (example ?? '').replace(/^\.\S+\s*/, '').split(/\s+/)) {
		if (token === '') continue;
		if (!TEMPLATE_KEYWORDS.has(token)) {
			argument = true;
			continue;
		}
		if (argument) parts.push(PLACEHOLDER);
		argument = false;
		parts.push(String.raw`\text{${token}}`);
	}
	if (argument) parts.push(PLACEHOLDER);
	return parts.join('\\,');
}

/** Le vocabulaire des commandes : catalogue (sauf avancées) + les deux absentes. */
export function commandWords(catalog: readonly AtelierCommand[]): CommandWord[] {
	return catalog
		.filter((c) => c.advanced !== true)
		.map((c) => ({
			french: c.french,
			forms: [...new Set([c.french, CONJUGATIONS.get(c.french) ?? c.french].map(normalized))],
			template: templateOf(c.french, c.example),
			description: c.description
		}));
}

export function findCommand(words: readonly CommandWord[], typed: string): CommandWord | null {
	const wanted = normalized(typed.trim());
	return words.find((w) => w.forms.includes(wanted)) ?? null;
}

/** « a » sans accent reste une lettre (variable) : le moteur le lit déjà « à ». */
function isSmallWord(word: string): boolean {
	return word.toLowerCase() !== 'a' && SMALL_WORDS.some((s) => normalized(s) === normalized(word));
}

/** Une unité du module (`km`, `h`, `km/h`) — jamais un mot accentué. */
export function isUnit(word: string): boolean {
	return /^[A-Za-zµμΩ°]+$/.test(word) && parseUnit(word) !== null;
}

/** Les raccourcis du champ : ceux de MathLive, nettoyés du vocabulaire. */
export function cleanedShortcuts<T>(defaults: Readonly<Record<string, T>>) {
	const kept: Record<string, T | { after: string; value: string }> = { ...defaults };
	for (const key of REMOVED_SHORTCUTS) delete kept[key];
	return { ...kept, ...RESTRICTED_SHORTCUTS };
}

/** Le premier mot décide (décision 2) ; sinon définition ou calcul. */
export function lineKindOf(latex: string, words: readonly CommandWord[]): LineKind {
	const trimmed = latex.trim();
	const head = /^\\text\{([^{}]*)\}/.exec(trimmed);
	if (head !== null && findCommand(words, head[1]) !== null) return 'command';
	if (FUNCTION_DEFINITION.test(trimmed)) return 'function-definition';
	if (VALUE_DEFINITION.test(trimmed)) return 'value-definition';
	return 'calculation';
}

/**
 * Le mot qui finit à droite de `before` (le LaTeX à gauche du curseur, au
 * niveau 0). `terminated` : le dernier atome est ce qui vient de finir le mot
 * (clavier virtuel, lu après coup sur `input`) — il est retiré d'abord.
 */
export function wordAtCaret(before: string, terminated: boolean): WordAtCaret | null {
	const end = terminated ? TERMINATOR.exec(before) : null;
	if (terminated && end === null) return null;
	const rest = end === null ? before : before.slice(0, end.index);
	const match = new RegExp(`(?<![\\\\${LETTER}])(?:[${LETTER}]+|\\\\min)$`).exec(rest);
	if (match === null) return null;
	const prefix = rest.slice(0, match.index);
	const place =
		prefix.trim() === '' ? 'start' : AFTER_NUMBER.test(prefix) ? 'after-number' : 'elsewhere';
	return match[0] === '\\min'
		? { word: 'min', atoms: 1, place }
		: { word: match[0], atoms: [...match[0]].length, place };
}

function unitLine(line: LineKind): boolean {
	return line === 'calculation' || line === 'value-definition';
}

/**
 * Ce que devient un mot FINI (décision 4), ou `null` : rien ne change. Un mot
 * de commande seulement en tête ; un petit mot seulement dans une commande
 * (« sur » aussi après le `=` d'une fonction) ; une unité seulement après
 * « nombre + espace », jamais dans une commande ni une définition de fonction.
 */
export function finishedWordLatex(
	found: WordAtCaret,
	line: LineKind,
	words: readonly CommandWord[]
): string | null {
	const { word, place } = found;
	const text = String.raw`\text{${word}}`;
	if (place === 'start' && found.atoms > 1) return findCommand(words, word) ? text : null;
	if (line === 'command') return isSmallWord(word) ? text : null;
	if (line === 'function-definition') return normalized(word) === 'sur' ? text : null;
	const unit = place === 'after-number' && unitLine(line) && (word === 'min' || isUnit(word));
	return unit ? String.raw`\mathrm{${word}}` : null;
}

/**
 * La liste de complétion (décision 9) pour le mot commencé au curseur :
 * commandes dès 2 lettres en tête de ligne, unités après « nombre + espace ».
 */
export function proposalsFor(
	found: WordAtCaret | null,
	line: LineKind,
	words: readonly CommandWord[]
): Proposal[] {
	if (found?.place === 'start' && found.word.length >= 2) {
		const typed = normalized(found.word);
		return words
			.filter((w) => w.forms.some((form) => form.startsWith(typed)))
			.slice(0, 8)
			.map((w) => ({ label: w.french, detail: w.description, latex: w.template }));
	}
	if (found?.place !== 'after-number' || !unitLine(line)) return [];
	// L'ordre du module (km avant kg), l'unité tapée en entier d'abord
	return UNIT_PROPOSALS.filter((unit) => unit.startsWith(found.word))
		.sort((a, b) => Number(b === found.word) - Number(a === found.word))
		.slice(0, 10)
		.map((unit) => ({ label: unit, detail: unitName(unit), latex: unitLatex(unit) }));
}

/** Le nom français d'une unité : `kilomètre`, pas le « kmètre » du module. */
function unitName(unit: string): string {
	const found = resolveUnit(unit);
	if (found === null) return '';
	for (const [prefix, french] of PREFIX_NAMES) {
		const base = unit.length > prefix.length ? resolveUnit(unit.slice(prefix.length)) : null;
		if (unit.startsWith(prefix) && base !== null && found.name === `${prefix}${base.name}`) {
			return `${french}${base.name}`;
		}
	}
	return found.name ?? '';
}

/** `km/h` → `\mathrm{km}/\mathrm{h}`, `m²` → `\mathrm{m}^2`. */
function unitLatex(unit: string): string {
	const written = (part: string) => {
		const power = part.endsWith('²') ? '^2' : part.endsWith('³') ? '^3' : '';
		return String.raw`\mathrm{${part.replace(/[²³]$/, '')}}${power}`;
	};
	return unit.split('/').map(written).join('/');
}

/** Le dénominateur d'une fraction (`\frac14` → `4`, `\frac{2}{x+1}` → `x+1`). */
export function denominatorOf(fraction: string): string | null {
	const match = /^\\d?frac(?:\{[^{}]*\}|\d)(\{[^{}]*\}|\d)$/.exec(fraction);
	return match === null ? null : match[1].replace(/^\{|\}$/g, '');
}

/**
 * Le texte que lit `runInput` (décision 10). Mesuré : sans le point, une
 * commande est lue comme un calcul (`résoudre x^2-4=0` → « false ») ; les
 * arguments en LaTeX passent tels quels ; une définition veut `f(x)`, pas
 * `f\left(x\right)` (« « [ » inattendu ici ») ; une grandeur veut `*`, pas `\cdot`.
 */
export function calcTextOf(latex: string, words: readonly CommandWord[]): CalcText {
	if (latex.includes('\\placeholder')) {
		return { ok: false, message: 'Une case du modèle est encore vide (Tab pour y aller).' };
	}
	const text = latex
		.replace(/\\text\{([^{}]*)\}/g, ' $1 ')
		.replace(/\\operatorname\{\\mathrm\{([^{}]*)\}\}|\\mathrm\{([^{}]*)\}/g, '$1$2')
		.replace(/\\(?:left|right)(?![A-Za-z])/g, '')
		.replace(/\\lbrack(?![A-Za-z])/g, '[')
		.replace(/\\rbrack(?![A-Za-z])/g, ']')
		.replace(/\\infty(?![A-Za-z])/g, '∞')
		.replace(/\\(min|max)(?![A-Za-z])/g, '$1')
		.replace(/\\exponentialE(?![A-Za-z])/g, 'e')
		.replace(/\\imaginaryI(?![A-Za-z])/g, 'i')
		.replace(/\\(?:cdot|times)(?![A-Za-z])/g, '*')
		// Le ° tapé (`60\degree`, mesuré dans Chromium) : `60°`, comme en texte (`degrees.ts`)
		.replace(/\\degree(?![A-Za-z])|(?:\{\})?\^\{\\circ\}/g, '°')
		.replace(/\{,\}/g, ',')
		// Une fraction de nombres, comme la lecture des cartes (`mathfield.ts`) :
		// `\frac12\,m` est un demi-mètre, `\frac14+\frac13` une somme
		.replace(/\\d?frac\{(\d+)\}\{(\d+)\}|\\d?frac(\d)(\d)/g, '($1$3/$2$4)')
		.replace(/\\[,;: ]|~/g, ' ')
		.replace(/\(\s*(\d+\/\d+)\s*\)(?=\s+[^\s\d(])/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
	const [head, ...rest] = text.split(' ');
	const command = findCommand(words, head ?? '');
	return { ok: true, text: command === null ? text : [`.${command.french}`, ...rest].join(' ') };
}

/**
 * Ce que montre le mode texte quand l'élève y revient (phase 0
 * `atelier-reglages-phase0.md`, B) : le texte de Calcul, sans les cases
 * encore vides d'un modèle (« intégrer ▢ de ▢ » → `.intégrer de`).
 */
export function draftTextOf(latex: string, words: readonly CommandWord[]): string {
	const converted = calcTextOf(latex.replaceAll(PLACEHOLDER, ' '), words);
	return converted.ok ? converted.text : '';
}

/**
 * Les morceaux d'une ligne, coupés aux espaces HORS parenthèses : `(x + 1)^2`
 * et `P(X ⩽ 3)` restent entiers. Les crochets ne comptent pas — un intervalle
 * s'écrit `[0;+∞[`.
 */
function topLevelTokens(text: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let depth = 0;
	for (const char of text) {
		if (char === '(' || char === '{') depth++;
		else if ((char === ')' || char === '}') && depth > 0) depth--;
		if (/\s/.test(char) && depth === 0) {
			if (current !== '') tokens.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	if (current !== '') tokens.push(current);
	return tokens;
}

/**
 * Un texte brut collé (« résoudre x^2=4 ») réécrit pour le champ : le premier
 * mot et les petits mots en texte, chaque morceau d'expression relu
 * (`normalizePasted`), les unités après un nombre en romain.
 *
 * Sert aussi la ligne du mode texte qui passe au champ (bascule, ↑, commande
 * préparée par une carte) : son point devant la commande tombe
 * (`.résoudre` → résoudre).
 *
 * ⚠️ Dans une commande, les arguments sont joints par `\,` : une espace simple
 * ne se VOIT pas en mathématiques — `.simuler L M 100` s'affichait
 * « simuler LM100 » (revue du 2026-10-14). Un mot de plusieurs lettres y reste
 * un mot : sinon `fille` devient f·i·l·l·e, et MathLive range `fi lle`.
 */
export function fieldLatexFromText(text: string, words: readonly CommandWord[]): string {
	const line = text.trim().replace(/^\.(?=\p{L})/u, '');
	const tokens = topLevelTokens(line);
	if (findCommand(words, tokens[0] ?? '') === null) {
		if (!/\d\s+[A-Za-z]/.test(line)) return normalizePasted(line);
		const pieces = line.split(/\s+/);
		const unitAfterNumber = (token: string, i: number) =>
			i > 0 && /^\d+(?:[.,]\d+)?$/.test(pieces[i - 1]) && isUnit(token);
		return pieces
			.map((token, i) =>
				unitAfterNumber(token, i)
					? String.raw`\mathrm{${token}}`
					: token.replace(/(\d),(\d)/g, '$1{,}$2')
			)
			.join('\\,');
	}
	const asWord = (token: string) =>
		isSmallWord(token) || findCommand(words, token) !== null || /^\p{L}{2,}$/u.test(token);
	return [
		String.raw`\text{${tokens[0]}}`,
		...tokens
			.slice(1)
			.map((token) => (asWord(token) ? String.raw`\text{${token}}` : normalizePasted(token)))
	].join('\\,');
}
