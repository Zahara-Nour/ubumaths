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
