/**
 * Atelier — la virgule décimale à l'affichage
 *
 * Décision de David (2026-10-09) : la vue Calcul écrit les décimaux à la
 * française, `0,5` en texte et `0{,}5` en LaTeX — l'écriture que produit
 * MathLive et que `solve-latex.ts` emploie déjà pour les réponses en ln.
 *
 * ⚠️ **Seul l'affichage est converti.** Le moteur continue d'écrire et de lire
 * `0.5` : l'arbre gardé (`ast`), l'écho de la saisie et le rejeu n'y passent
 * pas. Le point de passage est la sortie de `runInput` et de `runAction`.
 *
 * Ne touche QUE `chiffre . chiffre` : ni `\cdot`, ni `...`, ni `.évaluer`.
 *
 * @module atelier/decimal-comma
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';

// =============================================================================
// Constantes
// =============================================================================

/** Le point d'un décimal : entre deux chiffres. */
const DECIMAL_POINT = /(?<=\d)\.(?=\d)/g;

/**
 * Une virgule qui SÉPARE, collée à un décimal à point : `(1.5, 2)`,
 * `a = 0.5, b = 1`. Devenue `0,5, b`, elle serait ambiguë : elle passe au
 * point-virgule, comme dans les ensembles (#973).
 *
 * `(?<!\\)` : `\,` est l'espace fine du LaTeX (`\,;\,`), pas un séparateur.
 *
 * ⚠️ Pas devant un MOT : dans une phrase du moteur, « at x=0.5, order 3 », la
 * virgule est de la ponctuation (« x=0,5 ; order » vu en revue).
 */
const SEPARATOR_AFTER_DECIMAL = /(\d\.\d+)\s*(?<!\\),(?!\s*\p{L}{2})\s*/gu;
const SEPARATOR_BEFORE_DECIMAL = /\s*(?<!\\),\s*(?=[-−]?\d+\.\d)/g;

// =============================================================================
// Fonctions
// =============================================================================

/** Les virgules séparatrices voisines d'un décimal deviennent « ; ». */
function separatorsToSemicolons(text: string): string {
	return text.replace(SEPARATOR_AFTER_DECIMAL, '$1 ; ').replace(SEPARATOR_BEFORE_DECIMAL, ' ; ');
}

/** Un texte affiché : `1.25` → `1,25`. */
export function decimalCommaText(text: string): string {
	return separatorsToSemicolons(text).replace(DECIMAL_POINT, ',');
}

/** Du LaTeX affiché : `1.25` → `1{,}25`. */
export function decimalCommaLatex(latex: string): string {
	return separatorsToSemicolons(latex).replace(DECIMAL_POINT, '{,}');
}

/**
 * Une phrase (titre, explication, indication) : la virgule seule.
 *
 * Pas de point-virgule ici : dans « on divise par 0.5, l'égalité… » la
 * virgule est de la ponctuation, pas un séparateur.
 */
export function decimalCommaProse(text: string): string {
	return text.replace(DECIMAL_POINT, ',');
}

/**
 * Toutes les chaînes d'une donnée (tableau de signes, de variations) en LaTeX.
 *
 * ⚠️ Les lignes d'un tableau de variations rangent leurs valeurs dans une
 * `Map` dont les CLÉS sont les points du domaine : clés et points sont
 * convertis ensemble, sinon plus aucune valeur ne retrouve sa colonne.
 */
export function decimalCommaDeep<T>(value: T): T {
	if (typeof value === 'string') return decimalCommaLatex(value) as T;
	if (Array.isArray(value)) return value.map((item: unknown) => decimalCommaDeep(item)) as T;
	if (value instanceof Map) {
		return new Map(
			[...value].map(([key, item]: [unknown, unknown]) => [
				decimalCommaDeep(key),
				decimalCommaDeep(item)
			])
		) as T;
	}
	if (
		value !== null &&
		typeof value === 'object' &&
		Object.getPrototypeOf(value) === Object.prototype
	) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, decimalCommaDeep(item)])
		) as T;
	}
	return value;
}

/**
 * Les fonctions du moteur à PLUSIEURS arguments. L'élève les sépare par « ; »
 * (`max(1 ; 5)`), que le moteur ne lit pas : traduit en « , » après coup.
 */
const MULTI_ARGUMENT_FUNCTIONS = ['min', 'max', 'gcd', 'binom', 'mod'] as const;

/** L'ouverture d'un appel à plusieurs arguments : `max(`. */
const MULTI_ARGUMENT_CALL = new RegExp(
	`(?<![A-Za-z])(${MULTI_ARGUMENT_FUNCTIONS.join('|')})\\s*\\(`,
	'g'
);

/**
 * Une suite de nombres à plusieurs séparateurs, sans « ; » : `12,15,9`, ou
 * `1.5,2.5` (l'ancienne écriture). Jamais lue : refusée, corrigée.
 */
const DIGIT_CHAIN = /\d+(?:[.,]\d+){2,}/g;

/** Une virgule entre deux chiffres : toujours décimale (décision de David). */
const DECIMAL_COMMA = /(?<=\d),(?=\d)/g;

/** Le message d'un couple : `(1 ; 2)` n'est pas lu par Calcul. */
export const COUPLE_MESSAGE = 'Les couples (a ; b) ne sont pas encore pris en charge dans Calcul.';

/**
 * Plusieurs virgules entre chiffres hors d'une commande de séries : aucune
 * forme à proposer (`1 ; 2 ; 3` retapé échouerait), on explique.
 */
export const SERIES_HINT =
	'Une virgule sert à écrire un nombre décimal, comme 0,5. Pour une série de valeurs, utilise « ; » dans une commande, par exemple .stats 1 ; 2 ; 3.';

/** Le message d'un ensemble : `{1 ; 2}` n'est pas lu par Calcul. */
export const SET_MESSAGE = 'Les ensembles {a ; b} ne sont pas encore pris en charge dans Calcul.';

/**
 * Ce qui précède une accolade de GROUPE LaTeX, pas d'ensemble : `\frac{`,
 * `}{`, `x^{`, `u_{`, `0{,}5`.
 */
const LATEX_GROUP_BEFORE = /(?:\\[A-Za-z]+|[}^_\d])\s*$/;

/** Un ensemble `{1 ; 2}` tapé : une accolade nue dont le premier niveau a un « ; ». */
function typedSet(text: string): boolean {
	const stack: { set: boolean; semicolon: boolean }[] = [];
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '{') {
			stack.push({ set: !LATEX_GROUP_BEFORE.test(text.slice(0, i)), semicolon: false });
		} else if (char === '}') {
			const group = stack.pop();
			if (group?.set === true && group.semicolon) return true;
		} else if (char === ';' && stack.length > 0) {
			stack[stack.length - 1].semicolon = true;
		}
	}
	return false;
}

/** L'indice de la parenthèse qui ferme celle ouverte en `open`, ou -1. */
function closingParenthesis(text: string, open: number): number {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === '(') depth++;
		else if (text[i] === ')' && --depth === 0) return i;
	}
	return -1;
}

/** Ce qui est au PREMIER niveau d'un contenu : les parenthèses internes vidées. */
function firstLevel(content: string): string {
	let depth = 0;
	let flat = '';
	for (const char of content) {
		if (char === '(') depth++;
		if (depth === 0) flat += char;
		if (char === ')') depth--;
	}
	return flat;
}

/** Les appels à plusieurs arguments : nom, contenu, bornes. */
function multiArgumentCalls(
	text: string
): { name: string; start: number; open: number; close: number }[] {
	const calls = [];
	for (const match of text.matchAll(MULTI_ARGUMENT_CALL)) {
		const open = match.index + match[0].length - 1;
		const close = closingParenthesis(text, open);
		if (close !== -1) calls.push({ name: match[1], start: match.index, open, close });
	}
	return calls;
}

/**
 * Ce que l'élève tape, virgule décimale lue : `0,5x+3=1` → `0.5x+3=1`.
 *
 * L'atelier AFFICHE `0,5` : l'élève le recopie. Le parseur du moteur, lui, ne
 * lit que le point (« Unexpected token: , ») — #880 ne traduisait que les
 * valeurs et les bornes (`en x=0,3`, `dans [0;1,5]`), jamais l'expression.
 *
 * Règle de David (2026-10-09), sans exception : une virgule ENTRE DEUX
 * CHIFFRES est décimale, parenthèses comprises — `(1,2)+(3,4)` vaut
 * 1,2 + 3,4, un couple s'écrit `(1 ; 2)`. Une virgule voisine d'une lettre
 * (`max(a,b)`) sépare, et reste. Les suites `1,2,3` sont refusées en amont
 * (`commaRefusal`) et ne sont jamais converties ici.
 *
 * Puis le « ; » d'un appel à plusieurs arguments devient « , » pour le moteur :
 * `max(1,5 ; 2)` → `max(1.5 , 2)`. Ailleurs (`.dériver x^2 ; t`,
 * `dans [0 ; 1]`) il appartient à la commande et n'est pas touché.
 */
export function decimalCommaInput(text: string): string {
	const chains = [...text.matchAll(DIGIT_CHAIN)].map((m) => [m.index, m.index + m[0].length]);
	const inChain = (index: number) => chains.some(([from, to]) => index > from && index < to);
	const decimal = text.replace(DECIMAL_COMMA, (comma, index: number) =>
		inChain(index) ? comma : '.'
	);
	const chars = [...decimal];
	for (const call of multiArgumentCalls(decimal)) {
		let depth = 0;
		for (let i = call.open + 1; i < call.close; i++) {
			if (chars[i] === '(') depth++;
			else if (chars[i] === ')') depth--;
			else if (chars[i] === ';' && depth === 0) chars[i] = ',';
		}
	}
	return chars.join('');
}

/**
 * La forme corrigée d'une suite : `12,15,9` → `12 ; 15 ; 9`. Avec des points
 * (`1.5,2.5`), la virgule sépare et le point est décimal : `1,5 ; 2,5`.
 */
function fixedChain(chain: string): string {
	if (!chain.includes(',')) return chain.replaceAll('.', ' ; ');
	if (!chain.includes('.')) return chain.replaceAll(',', ' ; ');
	return chain.replaceAll(',', ' ; ').replaceAll('.', ',');
}

/**
 * Une saisie que la règle de la virgule refuse, avec sa forme corrigée :
 *
 * - `12,15,9` (plusieurs virgules entre chiffres, l'ancienne écriture) :
 *   jamais une lecture devinée — `1,2,3` n'est ni 1.2.3 ni une liste ;
 * - `max(1,2)` : un SEUL argument décimal pour une fonction qui en veut deux ;
 * - `(1 ; 2)`, `{1 ; 2}` (avec `couples`) : un couple, un ensemble, que
 *   Calcul ne lit pas encore.
 *
 * @param echo - Ce que l'élève a tapé, à corriger dans le message
 */
export function commaRefusal(
	text: string,
	echo: string,
	options?: { readonly couples?: boolean; readonly series?: boolean }
): string | null {
	// ⚠️ Un message ne propose jamais une saisie qui échoue : la forme corrigée
	// n'existe que pour une commande de SÉRIES (`.stats 12 ; 15 ; 9`). Ailleurs,
	// `1 ; 2 ; 3` retapé échouerait — on explique (revue)
	if (new RegExp(DIGIT_CHAIN.source).test(text)) {
		if (options?.series !== true) return SERIES_HINT;
		const fixed = echo.replace(DIGIT_CHAIN, fixedChain);
		return `Pour séparer des valeurs, utilise « ; » : ${fixed}`;
	}
	for (const call of multiArgumentCalls(text)) {
		const content = text.slice(call.open + 1, call.close);
		const level = firstLevel(content);
		const onlyDecimalCommas = !level.includes(';') && !/,(?!\d)|(?<!\d),/.test(level);
		if (onlyDecimalCommas && /\d,\d/.test(level)) {
			// Toute la ligne, l'appel corrigé : `binom(10 ; 3)*0,3^3` se retape
			const typed = text.slice(call.start, call.close + 1);
			const fixed = `${call.name}(${content.replace(DECIMAL_COMMA, ' ; ')})`;
			return `Sépare les valeurs avec « ; » : ${echo.replace(typed, fixed)}`;
		}
	}
	if (options?.couples === true) {
		if (typedSet(text)) return SET_MESSAGE;
		for (let i = 0; i < text.length; i++) {
			if (text[i] !== '(' || /[A-Za-z_]\s*$/.test(text.slice(0, i))) continue;
			const close = closingParenthesis(text, i);
			if (close !== -1 && firstLevel(text.slice(i + 1, close)).includes(';')) {
				return COUPLE_MESSAGE;
			}
		}
	}
	return null;
}

/** Une étape pédagogique, sous-étapes comprises. */
export function decimalCommaStep(step: RenderedStep): RenderedStep {
	return {
		...step,
		title: decimalCommaProse(step.title),
		...(step.explanation !== undefined && { explanation: decimalCommaProse(step.explanation) }),
		...(step.expressionLatex !== undefined && {
			expressionLatex: decimalCommaLatex(step.expressionLatex)
		}),
		...(step.text !== undefined && { text: decimalCommaText(step.text) }),
		...(step.signTable !== undefined && { signTable: decimalCommaDeep(step.signTable) }),
		...(step.subSteps !== undefined && { subSteps: step.subSteps.map(decimalCommaStep) })
	};
}
