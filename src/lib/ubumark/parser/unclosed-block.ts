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
