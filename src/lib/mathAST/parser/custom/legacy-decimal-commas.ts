/**
 * La virgule décimale lue comme la lisait le parseur maison AVANT la PR 6 de
 * lecture-grandeurs (2026-10-21) : `0,3` → `0.3`, `max(2,3)` inchangé.
 *
 * Le parseur maison ne lit plus que le point décimal (`DECIMAL_COMMA`). Ce
 * traducteur sert aux textes écrits avant, ou dans une langue qui garde la
 * virgule, et qu'il faut relire À L'IDENTIQUE :
 * - l'atelier relit ses définitions rangées sans provenance (lien, stockage) :
 *   un curseur pose `0,3`, une commande range `0,5u_n + 3`, le moteur `max(2,3)` ;
 * - la DSL géométrie lit `sur ]0,5 ; 1,5[` (le « ; » sépare, la virgule est décimale).
 *
 * La règle exacte de l'ancien tokenizer : une virgule collée entre deux entiers
 * est décimale, sauf directement dans les parenthèses d'un appel de fonction
 * connue (`max(`, `mod(`) ou dans une matrice (`[[…]]`). Un nombre déjà décimal
 * ou en notation scientifique (`1.5,2`, `1e10,2`) n'en prend pas une seconde.
 *
 * @module mathAST/parser/custom/legacy-decimal-commas
 */

import { tokenize } from './tokenizer';

/** Le texte, ses virgules décimales (règle d'avant la PR 6) passées au point */
export function legacyDecimalCommas(text: string): string {
	const tokens = tokenize(text);
	const openers: Array<'call' | 'group'> = [];
	const decimalCommas: number[] = [];
	let matrixDepth = 0;
	let fractionIndex = -1;
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type === 'LPAREN') openers.push(tokens[i - 1]?.type === 'FUNC' ? 'call' : 'group');
		else if (token.type === 'LBRACE') openers.push('group');
		else if (token.type === 'RPAREN' || token.type === 'RBRACE') openers.pop();
		else if (token.type === 'DOUBLE_LBRACKET') matrixDepth++;
		else if (token.type === 'DOUBLE_RBRACKET') matrixDepth--;
		if (token.type !== 'COMMA' || matrixDepth > 0 || openers.at(-1) === 'call') continue;
		// `√2,5` : la parenthèse implicite de `√` (longueur 0) n'est pas dans le texte
		const beforeIndex = tokens[i - 1]?.length === 0 ? i - 2 : i - 1;
		const before = tokens[beforeIndex];
		const after = tokens[i + 1];
		const isDecimal =
			before?.type === 'NUMBER' &&
			after?.type === 'NUMBER' &&
			beforeIndex !== fractionIndex &&
			/^\d+$/.test(before.value) &&
			/^\d/.test(after.value) &&
			before.position + before.length === token.position &&
			token.position + 1 === after.position;
		if (isDecimal) {
			decimalCommas.push(token.position);
			fractionIndex = i + 1;
		}
	}
	// Positions des jetons en unités UTF-16 : découpage de chaîne, pas `[...text]`
	let read = text;
	for (const position of decimalCommas) {
		read = `${read.slice(0, position)}.${read.slice(position + 1)}`;
	}
	return read;
}
