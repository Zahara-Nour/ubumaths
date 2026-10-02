/**
 * Préfixe « variable = » recopié devant une valeur (décision de David du 2026-10-02)
 *
 * L'énoncé finit par « $x=?$ » ; l'élève recopie le `x=` (`x=\frac32`). La
 * réponse est jugée sur le membre de droite, comme `S=` l'est pour un ensemble
 * (intervals/interval-answer.ts), à deux conditions :
 * - le membre de gauche est une variable SEULE : une lettre, indice permis
 *   (`x=`, `y=`, `u_n=`, `u_{n+1}=`) — `2x=3` reste une équation ;
 * - l'attendu n'est pas lui-même une relation (`y=x+1`).
 */

// Constants

/** Une lettre, indice facultatif (`_n`, `_{n+1}`), puis « = », puis le reste */
const LEADING_VARIABLE = /^\s*[a-zA-Z](?:_(?:[a-zA-Z0-9]|\{[^{}=]*\}))?\s*=\s*([^=]+)$/;

/** Relation dans l'attendu : `=`, `<`, `>`, `\le`, `\ge`, `\neq`, `\lt`, `\gt` */
const RELATION = /[=<>]|\\(?:le|ge|leq|geq|neq|ne|lt|gt|leqslant|geqslant)(?![a-zA-Z])/;

// Functions

/** L'attendu est-il une valeur (et non une relation comme `y=x+1`) ? */
export function expectsValue(expected: string): boolean {
	return !RELATION.test(expected);
}

/**
 * La réponse sans « variable = » en tête, quand l'attendu est une valeur.
 * Sinon la réponse telle quelle.
 */
export function withoutVariablePrefix(answer: string, expected: string): string {
	if (!expectsValue(expected)) return answer;
	const match = LEADING_VARIABLE.exec(answer);
	if (!match) return answer;
	const value = match[1].trim();
	return value === '' ? answer : value;
}
