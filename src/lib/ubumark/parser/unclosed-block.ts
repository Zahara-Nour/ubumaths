/**
 * Fin d'un bloc spécial NON FERMÉ (Q63, 2026-10-02)
 * ==================================================
 *
 * Un ```variation / ```probtree / ```line / ```trig sans ``` de fin prenait
 * toute la suite du document comme contenu : le document entier disparaissait
 * (parse en échec, rien d'affiché). Il s'arrête désormais à sa première ligne
 * vide, comme une ```figure non fermée ; la suite est lue normalement.
 *
 * Un bloc FERMÉ garde sa règle : il peut contenir des lignes vides.
 *
 * @module ubumark/parser/unclosed-block
 */

import { bodyOpensParagraph } from './block-closure';

/**
 * La fin d'un bloc spécial ouvert en `startIndex`, selon `isEnd` (``` seul) :
 * le ``` trouvé plus loin, s'il ne fait pas lire du texte comme contenu du
 * bloc (Q66, règle Q47 de ```courbe / ```figure) ; sinon le bloc est non
 * fermé et s'arrête à sa première ligne vide (Q63).
 *
 * Les lignes valides de ces blocs contiennent toutes `:` (`sign: f(x)`,
 * `Rouge:3/5`, `preset: quarters`) : jamais prises pour du texte (relevé sur
 * les contenus réels, 2026-10-02 : 94 lignes après une ligne vide, toutes avec
 * `:`). ⚠️ Une ligne FAUTIVE du bloc (`preset quarters`, `: ` oublié) doit le
 * laisser fermé, sinon la suite du document était avalée en code (revue) :
 * clé connue en tête, chiffre ou `$` → ligne du bloc. Dans le doute, fermé.
 *
 * @param keys les clés du bloc (`preset`, `sign`, `root`…)
 */
export function specialBlockEnd(
	lines: readonly string[],
	startIndex: number,
	isEnd: (line: string) => boolean,
	keys: readonly string[]
): { endIndex: number; closed: boolean } {
	const keyStart = new RegExp(`^\\s*(${keys.join('|')})\\b`, 'i');
	const isBlockLine = (line: string) => keyStart.test(line) || /[\d$]/.test(line);
	let end = startIndex + 1;
	while (end < lines.length && !isEnd(lines[end])) end++;
	if (end < lines.length && !bodyOpensParagraph(lines.slice(startIndex + 1, end), isBlockLine)) {
		return { endIndex: end, closed: true };
	}
	return { endIndex: unclosedBlockEnd(lines, startIndex), closed: false };
}

/**
 * La dernière ligne d'un bloc non fermé ouvert en `startIndex` : celle qui
 * précède la première ligne vide, ou la dernière du document.
 */
export function unclosedBlockEnd(lines: readonly string[], startIndex: number): number {
	for (let k = startIndex + 1; k < lines.length; k++) {
		if (lines[k].trim() === '') return k - 1;
	}
	return lines.length - 1;
}
