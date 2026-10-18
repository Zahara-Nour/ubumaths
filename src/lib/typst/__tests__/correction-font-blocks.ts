/**
 * Les blocs Typst qui portent les polices du Corrigé, pour les tests : chaque
 * jeu de règles doit ouvrir un bloc `#[ … ]` qui les borne (demande de David,
 * 2026-10-18 : seule la correction en Shantell, titres et sections dans la
 * police habituelle).
 */
import { CORRECTION_FONT_RULES } from '../correction-fonts';

/** Le bloc `#[ … ]` qui s'ouvre à `start` (crochets équilibrés, chaînes ignorées) */
function blockAt(typst: string, start: number): string | null {
	let depth = 0;
	let inString = false;
	for (let i = start + 1; i < typst.length; i++) {
		const char = typst[i];
		if (inString) {
			if (char === '\\') i++;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === '[') depth++;
		else if (char === ']' && --depth === 0) return typst.slice(start, i + 1);
	}
	return null;
}

/**
 * Les blocs qui portent les règles de police, dans l'ordre du document. Lève
 * une erreur si un jeu de règles n'ouvre pas son bloc : posé au niveau du
 * document, il mettrait tout ce qui le suit en Shantell.
 */
export function correctionFontBlocks(typst: string): string[] {
	const blocks: string[] = [];
	const opening = `#[\n${CORRECTION_FONT_RULES}`;
	let from = 0;
	for (;;) {
		const rules = typst.indexOf(CORRECTION_FONT_RULES, from);
		if (rules === -1) return blocks;
		const start = rules - '#[\n'.length;
		if (typst.slice(start, start + opening.length) !== opening) {
			throw new Error(`Règles de police hors bloc, à la position ${rules}`);
		}
		const block = blockAt(typst, start);
		if (block === null) throw new Error(`Bloc de police non fermé, à la position ${start}`);
		blocks.push(block);
		from = rules + CORRECTION_FONT_RULES.length;
	}
}

/** Le document hors des blocs de police : ce qui doit rester en police habituelle */
export function outsideCorrectionFontBlocks(typst: string): string {
	return correctionFontBlocks(typst).reduce((rest, block) => rest.replace(block, ''), typst);
}
