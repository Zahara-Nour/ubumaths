/**
 * Pedagogical Integration — LaTeX des étapes
 *
 * `toLatex` écrit `\ln|u|` avec deux délimiteurs : `\ln\left( \left| u \right| \right)`,
 * affiché ln(|u|). Les étapes d'intégration l'écrivent comme sur une copie :
 * `\ln\left| u \right|` (décision de David, 2026-10-13). Seule la rédaction
 * des étapes change : la réponse du moteur garde l'écriture de `toLatex`.
 *
 * @module mathAST/pedagogical-integration/latex
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';

const LN_ABS_OPEN = '\\ln\\left( \\left| ';
const ABS_CLOSE = ' \\right|';
const PAREN_CLOSE = ' \\right)';

/** Le LaTeX d'un nœud dans une étape d'intégration : `\ln\left| u \right|`. */
export function integrationLatex(node: MathNode): string {
	return collapseLnAbs(toLatex(node));
}

/**
 * `\ln\left( \left| … \right| \right)` → `\ln\left| … \right|`, la valeur
 * absolue appariée par profondeur de `\left` / `\right` : sous
 * `\ln\left( \left| x \right| + 1 \right)`, le `\right|` ne ferme pas la
 * parenthèse du ln, rien n'est réécrit.
 */
export function collapseLnAbs(latex: string): string {
	let out = '';
	let i = 0;
	while (i < latex.length) {
		const start = latex.indexOf(LN_ABS_OPEN, i);
		if (start === -1) break;
		const contentStart = start + LN_ABS_OPEN.length;
		const close = matchingAbsClose(latex, contentStart);
		if (close === -1 || !latex.startsWith(PAREN_CLOSE, close + ABS_CLOSE.length)) {
			out += latex.slice(i, contentStart);
			i = contentStart;
			continue;
		}
		const content = collapseLnAbs(latex.slice(contentStart, close));
		out += `${latex.slice(i, start)}\\ln\\left| ${content} \\right|`;
		i = close + ABS_CLOSE.length + PAREN_CLOSE.length;
	}
	return out + latex.slice(i);
}

/**
 * Position du ` \right|` qui ferme le `\left|` ouvert juste avant `from`, ou −1
 * si le premier `\right` de même niveau n'est pas un `\right|`.
 */
function matchingAbsClose(latex: string, from: number): number {
	let depth = 0;
	let i = from;
	while (i < latex.length) {
		if (latex.startsWith('\\left', i)) {
			depth++;
			i += '\\left'.length;
		} else if (latex.startsWith('\\right', i)) {
			if (depth === 0) {
				return latex.startsWith('\\right|', i) && latex[i - 1] === ' ' ? i - 1 : -1;
			}
			depth--;
			i += '\\right'.length;
		} else {
			i++;
		}
	}
	return -1;
}
