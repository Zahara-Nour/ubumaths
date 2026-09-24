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

import { tokenize } from './tokenizer';

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
	RBRACE: '}',
	// Dénominateur entre parenthèses : `kg/(m.s)`
	LPAREN: '(',
	RPAREN: ')'
};

/** Les caractères qu'une écriture d'unité peut contenir. */
export const UNIT_WRITING = /^[A-Za-z0-9€$°μΩ.^/*{}()-]+$/;

/** Message d'une espace dans une unité (`3[m s^-1]` se lirait « par milliseconde »). */
export const UNIT_SPACE_MESSAGE =
	'Space inside a unit: join the symbols with "." or "/" (m.s^-1, km/h)';

/**
 * Message d'un exposant collé au crochet d'unité : `3[m]^2` se lisait (3 m)²,
 * soit 9 m², quand l'auteur voulait presque toujours 3 m².
 */
export const UNIT_EXPONENT_MESSAGE =
	'Exponent after a unit: write 3[m^2] for 3 m², or (3[m])^2 for (3 m)²';

/** Le même message pour le parseur LaTeX. */
export const UNIT_EXPONENT_MESSAGE_LATEX =
	'Exponent after a unit: write 3~\\unit{m^2} for 3 m², or \\left(3~\\unit{m}\\right)^2 for (3 m)²';

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

// =============================================================================
// Crochet d'unité ou crochet de calcul
// =============================================================================

/** Ce que la classification doit savoir d'un jeton : son type. */
interface TypedToken {
	readonly type: string;
}

/** Les jetons qui font d'un contenu entre crochets une expression. */
const EXPRESSION_TOKENS: ReadonlySet<string> = new Set([
	'PLUS',
	'EQUALS',
	'LESS',
	'GREATER',
	'LESS_EQUAL',
	'GREATER_EQUAL',
	'NOT_EQUAL'
]);

/**
 * Un crochet POSTFIXE (`2[…]`) est-il un crochet de calcul plutôt qu'une unité ?
 *
 * Oui quand son contenu est clairement une expression : il contient `+`, `=`,
 * `<`, `>` (ou `<=`, `>=`, `!=`), ou un `-` qui n'est pas le signe d'un
 * exposant — un signe d'exposant suit `^` ou `^{` (`m.s^-1`, `m.s^{-1}`).
 * Sinon le crochet reste une unité, et ses erreurs restent les siennes
 * (`3[kms]`, `3[m s]`).
 *
 * Regarde en avant jusqu'au `]` apparié (crochets imbriqués comptés) SANS rien
 * consommer. `tokenAt(0)` est le `[` lui-même. Un crochet jamais fermé n'est
 * pas un crochet de calcul : l'erreur d'unité (« Expected ']' ») reste celle
 * d'avant.
 *
 * Partagé par les deux parseurs maison et par le générateur de notation.
 */
export function isGroupingBracket(tokenAt: (offset: number) => TypedToken): boolean {
	let depth = 1;
	let isExpression = false;
	let previous = '';
	let beforePrevious = '';

	for (let offset = 1; ; offset++) {
		const type = tokenAt(offset).type;
		if (type === 'EOF') return false;
		if (type === 'LBRACKET') depth++;
		else if (type === 'DOUBLE_LBRACKET') depth += 2;
		else if (type === 'RBRACKET') depth--;
		else if (type === 'DOUBLE_RBRACKET') depth -= 2;
		if (depth <= 0) return isExpression;

		if (EXPRESSION_TOKENS.has(type)) isExpression = true;
		if (type === 'MINUS') {
			const isExponentSign =
				previous === 'CARET' || (previous === 'LBRACE' && beforePrevious === 'CARET');
			if (!isExponentSign) isExpression = true;
		}
		beforePrevious = previous;
		previous = type;
	}
}

/**
 * La même classification sur un texte : le contenu `content` écrit `[content]`
 * derrière un nombre serait-il relu comme un crochet de calcul ? Sert au
 * générateur de notation, qui écrit `(…)` quand la réponse est non.
 */
export function isGroupingBracketContent(content: string): boolean {
	let tokens: readonly TypedToken[];
	try {
		tokens = tokenize(`[${content}]`);
	} catch {
		// Texte illisible : les parenthèses sont le choix sûr
		return false;
	}
	const eof: TypedToken = { type: 'EOF' };
	return isGroupingBracket((offset) => tokens[offset] ?? eof);
}
