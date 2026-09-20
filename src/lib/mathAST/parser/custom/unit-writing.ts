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
	STAR: '*'
};

/** Les caractères qu'une écriture d'unité peut contenir. */
export const UNIT_WRITING = /^[A-Za-z0-9€$°μΩ.^/*-]+$/;
