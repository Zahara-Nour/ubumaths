/**
 * Fences indentées hors d'une liste : ramenées à la marge
 * =======================================================
 *
 * Q56-Q59 (2026-10-02). Un bloc de code dont la fence est indentée de 1 à 3
 * espaces (CommonMark) s'affichait en texte, backticks visibles. Il est
 * désormais ramené à la marge AVANT tout le reste du parseur, qui le lit
 * alors exactement comme un bloc à la marge d'aujourd'hui.
 *
 * ⚠️ Pré-passage, et non nouvelle règle dans `findCodeBlocks` : le parseur
 * repère les blocs deux fois (formules remplacées / texte original) et les
 * apparie par rang. Une 1re version branchée là avalait du texte dès qu'un
 * `$$` chevauchait une fence (revue de la PR).
 *
 * Règles :
 * - ouverture : 1 à 3 espaces, puis ``` ou ~~~ ; jamais un bloc spécial
 *   (```courbe, ```variation…, Q58) ;
 * - fermeture (Q59) : une fence ELLE AUSSI indentée de 1 à 3 espaces, même
 *   type, au moins aussi longue ; toute ligne non vide entre les deux est
 *   indentée — une ligne à la marge abandonne, le texte reste tel quel ;
 * - jamais fermée (Q57) : texte, comme avant ;
 * - lignes d'une liste ou du code d'un bloc à la marge : jamais touchées ;
 * - ⚠️ seuls les blocs placés AVANT la première formule bloc sur plusieurs
 *   lignes (`$$…$$`, `~~…~~`) sont ramenés : une formule repliée décalait
 *   l'appariement par rang des blocs (et les listes repérées). Depuis Q60, les
 *   formules ne sont plus extraites des blocs fermés, mais ce repérage-ci
 *   compte encore un `$$` situé dans du code : garde prudente, gardée telle
 *   quelle (revue : code d'un autre bloc affiché, texte avalé, liste scindée).
 *
 * @module ubumark/parser/indented-fences
 */

import { findCodeBlocks } from './code-block-parser';
import { blockLineRanges } from './block-ranges';
import { findListBlocks } from './list-parser';
import {
	extractMath,
	BLOCK_CUSTOM_REGEX,
	BLOCK_MATH_REGEX,
	ESCAPED_DOLLAR_REGEX,
	ESCAPED_TILDE_REGEX
} from './math-extractor';
import { STAT_CHART_KINDS } from '../types/stat-chart';

// ============================================================================
// CONSTANTES
// ============================================================================

const OPENING = /^( {1,3})(`{3,}|~{3,})(.*)$/;

const CLOSING = /^ {1,3}(`{3,}|~{3,})\s*$/;

/**
 * Langages des blocs spéciaux d'ubumark : indentés, ils restent du texte (Q58).
 * Leurs parseurs ne lisent que la marge.
 */
const SPECIAL_LANGUAGES: ReadonlySet<string> = new Set([
	'variation',
	'probtree',
	'trig',
	'line',
	'courbe',
	'figure',
	...STAT_CHART_KINDS
]);

// ============================================================================
// FONCTIONS
// ============================================================================

const leadingSpaces = (line: string) => line.length - line.replace(/^ +/, '').length;

/**
 * La ligne où commence la première formule bloc sur plusieurs lignes, dans
 * l'ordre de `extractMath` (échappements, `$$`, puis `~~`) ; Infinity sinon.
 */
function firstMultilineMathLine(markdown: string): number {
	const blank = (text: string) => text.replace(/[^\n]/g, '\0');
	const unescaped = markdown
		.replace(ESCAPED_DOLLAR_REGEX, '\0\0')
		.replace(ESCAPED_TILDE_REGEX, '\0\0');
	let first = Infinity;
	for (const match of unescaped.matchAll(new RegExp(BLOCK_MATH_REGEX))) {
		if (match[0].includes('\n')) first = Math.min(first, match.index);
	}
	const withoutDollars = unescaped.replace(new RegExp(BLOCK_MATH_REGEX), blank);
	for (const match of withoutDollars.matchAll(new RegExp(BLOCK_CUSTOM_REGEX))) {
		if (match[0].includes('\n')) first = Math.min(first, match.index);
	}
	return first === Infinity ? Infinity : markdown.slice(0, first).split('\n').length - 1;
}

/**
 * Ramener à la marge les blocs de code indentés de 1 à 3 espaces.
 *
 * @returns le texte, même nombre de lignes ; inchangé s'il n'y en a aucun
 */
export function dedentIndentedFences(markdown: string): string {
	if (!/^ {1,3}(```|~~~)/m.test(markdown)) return markdown;

	const lines = markdown.split('\n');
	// Pré-calculé : un `some` sur les plages à chaque ligne devenait quadratique
	const untouchable = new Array<boolean>(lines.length).fill(false);
	const ranges = [
		...findListBlocks(lines),
		...findCodeBlocks(lines).map((b): [number, number] => [b.startIndex, b.endIndex])
	];
	for (const [start, end] of ranges) untouchable.fill(true, start, end + 1);
	// Les lignes des blocs fermés ne sont plus extraites (Q60) : un `$$` de
	// SQL n'y est plus une formule, il ne bloque plus rien (Q65)
	const outsideBlocks = lines.map((line) => line);
	for (const [start, end] of blockLineRanges(lines)) outsideBlocks.fill('', start, end + 1);
	const mathLine = firstMultilineMathLine(outsideBlocks.join('\n'));

	// Première ligne d'abandon à partir de chaque ligne (marge non vide, liste,
	// bloc à la marge), et les fermantes possibles : la recherche de la
	// fermante devient linéaire (3e revue : 4,2 s sur 32 000 lignes)
	const stop = new Array<number>(lines.length + 1).fill(lines.length);
	for (let j = lines.length - 1; j >= 0; j--) {
		const abandons = untouchable[j] || (lines[j].trim() !== '' && !lines[j].startsWith(' '));
		stop[j] = abandons ? j : stop[j + 1];
	}
	const closers = lines.flatMap((line, j) => {
		const close = untouchable[j] ? null : CLOSING.exec(line);
		return close ? [{ index: j, fence: close[1] }] : [];
	});
	const firstCloserAfter = (index: number) => {
		let [low, high] = [0, closers.length];
		while (low < high) {
			const middle = (low + high) >> 1;
			if (closers[middle].index <= index) low = middle + 1;
			else high = middle;
		}
		return low;
	};
	// L'extraction des formules ne doit pas toucher les fences : `~~~ a~`
	// devenait `~~§M:0§`, plus une fence d'un côté, encore une de l'autre
	// (3e revue : la suite du document était avalée)
	const untouchedByMath = (line: string) => extractMath(line).text === line;

	let i = 0;
	while (i < lines.length) {
		const open = OPENING.exec(lines[i]);
		const fence = open?.[2] ?? '';
		const info = open?.[3] ?? '';
		// CommonMark : pas de backtick dans l'info d'une fence en backticks
		const validInfo = fence[0] !== '`' || !info.includes('`');
		if (!open || untouchable[i] || !validInfo || SPECIAL_LANGUAGES.has(info.trim())) {
			i++;
			continue;
		}
		const indent = open[1].length;

		let end = -1;
		const limit = stop[i + 1];
		for (let c = firstCloserAfter(i); c < closers.length && closers[c].index < limit; c++) {
			const candidate = closers[c].fence;
			if (candidate[0] === fence[0] && candidate.length >= fence.length) {
				end = closers[c].index;
				break;
			}
		}
		if (
			end === -1 ||
			mathLine <= end ||
			!untouchedByMath(lines[i]) ||
			!untouchedByMath(lines[end])
		) {
			i++;
			continue;
		}

		for (let k = i; k < end; k++) {
			lines[k] = lines[k].slice(Math.min(indent, leadingSpaces(lines[k])));
		}
		// La fermante, entièrement à la marge (elle peut être plus indentée)
		lines[end] = lines[end].trimStart();
		i = end + 1;
	}
	return lines.join('\n');
}
