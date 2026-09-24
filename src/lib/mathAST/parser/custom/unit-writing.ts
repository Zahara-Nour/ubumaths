/**
 * L'écriture d'une unité entre crochets, pour les deux parseurs maison.
 *
 * Le contenu d'un crochet d'unité n'est pas une expression : c'est une
 * écriture d'unité brute, recollée depuis le **texte** des jetons jusqu'au
 * `]`. Sans cela `2[min]` échouait — le tokenizer y voit la fonction `min`
 * (finding I4 de la revue des grandeurs, 2026-09-20).
 *
 * @module mathAST/parser/custom/unit-writing
 */

/**
 * Le texte que rend un jeton dans une écriture d'unité, quand sa valeur ne le
 * porte pas telle quelle. Partiel : tout jeton absent de la table rend sa
 * propre `value`.
 */
export const UNIT_TOKEN_TEXT: Partial<Record<string, string>> = {
	CARET: '^',
	MINUS: '-',
	SLASH: '/',
	STAR: '*',
	// Exposant entre accolades, comme ailleurs dans la notation : `m.s^{-1}`
	LBRACE: '{',
	RBRACE: '}'
};

/** Les caractères qu'une écriture d'unité peut contenir. */
export const UNIT_WRITING = /^[A-Za-z0-9€$°μΩ.^/*{}-]+$/;

/** Message d'une espace dans une unité (`3[m s^-1]` se lirait « par milliseconde »). */
export const UNIT_SPACE_MESSAGE =
	'Space inside a unit: join the symbols with "." or "/" (m.s^-1, km/h)';

/** Ce que l'écriture d'unité doit savoir d'un jeton : son texte et sa place. */
interface UnitWritingToken {
	readonly type: string;
	readonly value: string;
	readonly position: number;
	readonly length: number;
}

/**
 * Recolle l'écriture d'une unité jeton après jeton, jusqu'au premier jeton qui
 * n'en fait pas partie (le `]` fermant, en principe).
 *
 * Les espaces ont disparu à la tokenisation : on les retrouve par les
 * positions. Une espace ENTRE deux jetons est signalée (`spaceAt`) — `m s`
 * se recollerait en `ms`, la milliseconde. Celles qui entourent l'écriture
 * sont admises.
 */
export function readUnitWriting(
	current: () => UnitWritingToken,
	advance: () => void,
	isEnd: (token: UnitWritingToken) => boolean
): { text: string; spaceAt: number | null } {
	let text = '';
	let spaceAt: number | null = null;
	let previousEnd: number | null = null;

	while (!isEnd(current())) {
		const token = current();
		const piece = UNIT_TOKEN_TEXT[token.type] ?? token.value;
		if (piece === '' || !UNIT_WRITING.test(piece)) break;
		if (previousEnd !== null && token.position > previousEnd && spaceAt === null) {
			spaceAt = previousEnd;
		}
		text += piece;
		previousEnd = token.position + token.length;
		advance();
	}

	return { text, spaceAt };
}
