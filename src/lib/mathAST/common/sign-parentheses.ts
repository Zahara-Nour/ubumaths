/**
 * Les parenthèses qu'un signe unaire ne peut pas se passer
 *
 * ⚠️ **Mesuré** : `opposite(add(x, 2))` — c'est-à-dire −(x + 2) — s'écrivait
 * `-x + 2` en LaTeX et `-x+2` en syntaxe texte. Ce n'est pas un choix de
 * style : la chaîne produite se relit `(−x) + 2`, une **autre** expression. Le
 * calcul était juste, son écriture était fausse.
 *
 * Le défaut restait invisible parce qu'un `-(x+2)` écrit à la main porte un
 * nœud `delimiter` explicite (le parseur en pose un), et parce que la
 * normalisation distribue le signe. Seule une RÈGLE qui construit
 * `opposite(somme)` directement l'expose — `abs-negative` le fait sur `|x + 2|`
 * quand `x < −3`. Même famille de piège que les parenthèses obligatoires de la
 * mise en facteur commun : nos générateurs s'appuient sur des `delimiter`
 * explicites, et une règle qui en oublie un produit une chaîne fausse.
 *
 * @module mathAST/common/sign-parentheses
 */

import type { MathNode } from '../types';

/**
 * Cette expression doit-elle être parenthésée sous un signe unaire ?
 *
 * Une somme ou une différence, oui : le signe ne porterait que sur le premier
 * terme. Le reste — produit, quotient, puissance, fonction, feuille — se lit
 * sans ambiguïté, et parenthéser alourdirait pour rien.
 */
export function needsParenthesesUnderSign(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

/**
 * Le symbole `%` est un postfixe : il se rattache au dernier atome à la relecture.
 * `(a+5)%`, `(2x)%`, `(-3)%` gardent donc leurs parenthèses ; un atome, un appel de
 * fonction ou une expression déjà parenthésée s'écrit tel quel (`20%`, `a%`).
 */
export function needsParenthesesUnderPercent(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
		case 'variable':
		case 'greek':
		case 'constant':
		case 'hole':
		case 'function':
		case 'delimiter':
			return false;
		default:
			return true;
	}
}

/**
 * Cette expression doit-elle être parenthésée en BASE d'une puissance ?
 *
 * ⚠️ **Mesuré en production** : `{{eval:a*(b)^n}}` avec b = −2 affichait
 * `3 × (−2^n)`. tidy retire le délimiteur de `(−2)` et garde le nœud juste,
 * `superscript(opposite(2), n)`, mais écrit sans parenthèses il se relit
 * −(2ⁿ) : une AUTRE valeur (n pair). De même `1/4^n` se relit 1/(4ⁿ).
 *
 * Une somme, une différence, un opposé, un quotient ou une grandeur : oui.
 */
export function needsParenthesesAsPowerBase(node: MathNode): boolean {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'opposite':
		case 'division':
		case 'unit':
			return true;
		default:
			return false;
	}
}
