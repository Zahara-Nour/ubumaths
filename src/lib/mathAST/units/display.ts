/**
 * Afficher une écriture d'unité, telle que l'auteur l'a écrite.
 *
 * Le générateur LaTeX de mathAST écrit une grandeur `3~\unit{m.s^-1}` : c'est
 * la forme que le parseur LaTeX sait RELIRE. Mais `\unit` vient de l'extension
 * siunitx, qu'aucun moteur d'affichage de l'application ne connaît : MathLive
 * l'affiche en rouge, l'export `.tex` ne compile pas, Typst l'ignore. Ce module
 * traduit l'écriture juste avant l'affichage :
 *
 * - symboles en romain (`\mathrm{km}`, `upright("km")`) ;
 * - `.`, `*`, `·` en point de produit ; `/` reste une barre, jamais une fraction ;
 * - parenthèses du dénominateur conservées (`kg/(m.s)`) ;
 * - exposants complets (`s^{-1}` : le `1` monte avec le `-`).
 *
 * @module mathAST/units/display
 */

import { tokenizeUnitWriting } from './parser';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Caractères d'unité qui n'ont pas leur place dans `\mathrm{…}` : pdflatex ne
 * les accepte pas en mode mathématique, MathLive les rend sans eux.
 */
const LATEX_SPECIAL_SYMBOLS: Record<string, string> = {
	'°': '{}^{\\circ}',
	μ: '\\mu{}',
	Ω: '\\Omega{}',
	'€': '\\text{€}',
	$: '\\$'
};

/** `\unit{…}`, accolades d'exposant comprises (`\unit{m.s^{-1}}`). */
const UNIT_COMMAND = /\\unit\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;

// =============================================================================
// Fonctions
// =============================================================================

/** Un symbole d'unité en LaTeX de base : lettres en romain, caractères spéciaux à part. */
function symbolToLatex(symbol: string): string {
	return symbol
		.split(/([°μΩ€$])/)
		.filter((part) => part !== '')
		.map((part) => LATEX_SPECIAL_SYMBOLS[part] ?? `\\mathrm{${part}}`)
		.join('');
}

/**
 * Une écriture d'unité en LaTeX de base, lisible par MathLive et par pdflatex.
 *
 * @example
 * unitWritingToLatex('m.s^{-1}') // '\\mathrm{m}\\cdot\\mathrm{s}^{-1}'
 * unitWritingToLatex('km/h')     // '\\mathrm{km}/\\mathrm{h}'
 */
export function unitWritingToLatex(writing: string): string {
	const tokens = tokenizeUnitWriting(writing);
	// Écriture illisible : on la montre telle quelle plutôt que de la perdre
	if (!tokens) return `\\text{${writing.replace(/[\\{}$%#&_^~]/g, '')}}`;
	return tokens
		.map((token) => {
			if (token.type === 'SYMBOL') return symbolToLatex(token.value);
			if (token.type === 'EXPONENT') return `^{${token.value}}`;
			if (token.type === 'LPAREN' || token.type === 'RPAREN') return token.value;
			return token.value === '/' ? '/' : '\\cdot';
		})
		.join('');
}

/**
 * Une écriture d'unité en Typst : `/` en chaîne collée (une barre nue ferait une
 * fraction en Typst), `.` en point de produit.
 *
 * @example
 * unitWritingToTypst('km/h')   // 'upright("km")"/"upright("h")'
 * unitWritingToTypst('m^{2}')  // 'upright("m")^(2)'
 */
export function unitWritingToTypst(writing: string): string {
	const tokens = tokenizeUnitWriting(writing);
	if (!tokens) return `upright(${JSON.stringify(writing)})`;
	const parts: string[] = [];
	for (const token of tokens) {
		if (token.type === 'SYMBOL') parts.push(`upright(${JSON.stringify(token.value)})`);
		else if (token.type === 'EXPONENT') parts.push(`${parts.pop() ?? ''}^(${token.value})`);
		// Parenthèses en symboles : collées à `"/"`, une parenthèse nue serait
		// lue par Typst comme un appel
		else if (token.type === 'LPAREN') parts.push('paren.l');
		else if (token.type === 'RPAREN') parts.push('paren.r');
		else parts.push(token.value === '/' ? '"/"' : 'dot.op');
	}
	// Barre collée à ses voisins : « km/h », pas « km / h »
	return parts.join(' ').replace(/ "\/" /g, '"/"');
}

/**
 * Remplace chaque `\unit{…}` d'un LaTeX par sa forme d'affichage.
 * À n'appliquer qu'à un LaTeX destiné à être AFFICHÉ : le parseur LaTeX ne
 * relirait pas la forme traduite comme une grandeur.
 */
export function displayUnitsInLatex(latex: string): string {
	if (!latex.includes('\\unit')) return latex;
	return latex.replace(UNIT_COMMAND, (_match, writing: string) => unitWritingToLatex(writing));
}
