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
 * De même `e^x^2` se relit e^{x²} (KaTeX refuse le double exposant) et `2x^2`
 * se relit 2·x².
 *
 * Une somme, une différence, un opposé, un quotient, un produit, une puissance ou
 * une grandeur : oui.
 */
export function needsParenthesesAsPowerBase(node: MathNode): boolean {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'opposite':
		case 'division':
		case 'multiplication':
		case 'superscript':
		case 'unit':
		// `\lim_{x\to0} x^2` se relirait lim(x²) : portée de \lim
		case 'limit':
			return true;
		default:
			return false;
	}
}

/**
 * Cette expression doit-elle être parenthésée sous une factorielle `!` ?
 *
 * `!` est un postfixe : il se rattache à ce qui le précède immédiatement à la
 * relecture. `(n+1)!`, `(2n)!`, `(-3)!`, `(2^3)!` gardent leurs parenthèses ; un
 * atome, un appel de fonction, un indice (`u_{n}!`) ou une expression déjà
 * parenthésée s'écrit tel quel. Une factorielle de factorielle aussi est
 * parenthésée : `3!!` serait relu comme une double factorielle (refusée).
 */
export function needsParenthesesUnderFactorial(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
		case 'variable':
		case 'greek':
		case 'constant':
		case 'hole':
		case 'delimiter':
		case 'subscript':
			return false;
		case 'function':
			return node.name === 'factorial';
		default:
			return true;
	}
}

/**
 * L'écriture de cette expression commence-t-elle par un signe (`-` ou `+`) ?
 *
 * Un opposé, un nombre négatif, un produit dont le premier facteur commence par
 * un signe, un quotient EN LIGNE dont le numérateur commence par un signe. Une
 * fraction `\dfrac` ne commence pas par un signe à l'écrit ; une somme, une
 * puissance ou un pourcentage dont l'opérande est signé sont déjà parenthésés
 * par ailleurs.
 */
function startsWithSign(node: MathNode): boolean {
	switch (node.type) {
		case 'opposite':
		case 'positive':
			return true;
		case 'number':
			return node.value.startsWith('-');
		case 'multiplication':
			return startsWithSign(node.left);
		case 'division':
			return node.displayStyle !== 'fraction' && startsWithSign(node.numerator);
		default:
			return false;
	}
}

/**
 * Cette expression doit-elle être parenthésée comme facteur de DROITE d'un produit ?
 *
 * ⚠️ **Mesuré** : la dérivée de `2e^{-x}` s'écrivait `2 -e^{-x}`, qui se lit
 * « 2 moins e^{-x} » alors que c'est 2 × (−e^{-x}). Une construction interne
 * (`differentiate`, `tidy`) ne pose pas de délimiteur. Deux signes ne se suivent
 * pas non plus à l'écrit : `2 × -3` s'écrit `2 × (−3)`.
 *
 * Oui pour une somme ou une différence (comme sous un signe), et pour tout
 * facteur dont l'écriture commence par un signe. À GAUCHE, `-2x` reste `-2x`.
 */
export function needsParenthesesAsRightFactor(node: MathNode): boolean {
	return needsParenthesesUnderSign(node) || startsWithSign(node);
}

/**
 * Cette expression doit-elle être parenthésée sous un signe `-` unaire ?
 *
 * ⚠️ **Mesuré** (oracle des dérivées) : la règle du quotient sur `-2/(x-4)`
 * écrivait `--2` dans les étapes, et la carte `f′` de l'atelier
 * `e^{--0.75 x}` dès qu'un paramètre négatif (`k = -0.75`) était substitué
 * dans `e^{-kx}`. Deux signes ne se suivent pas à l'écrit : `-(-2)`.
 *
 * Une somme ou une différence (le signe ne porterait que sur le premier terme),
 * et tout ce dont l'écriture commence par un signe.
 */
export function needsParenthesesUnderOpposite(node: MathNode): boolean {
	return needsParenthesesUnderSign(node) || startsWithSign(node);
}

/**
 * Cette expression doit-elle être parenthésée comme terme de DROITE d'une somme
 * (`operator = 'addition'`) ou d'une différence (`'subtraction'`) ?
 *
 * ⚠️ **Mesuré** : la primitive de `x sin x` s'écrivait
 * `x \left( -\cos(x) \right) - -\sin(x)` — deux signes consécutifs. Même
 * principe que pour un facteur de droite : deux signes ne se suivent pas à
 * l'écrit, `a − (−b)` et `a + (−b)` gardent leurs parenthèses.
 *
 * Après un `-`, une somme ou une différence aussi (`a − (b + c)` ≠ `a − b + c`).
 * Après un `+`, non : `a + (b + c)` se relit à l'identique.
 */
export function needsParenthesesAsRightTerm(
	node: MathNode,
	operator: 'addition' | 'subtraction'
): boolean {
	return operator === 'subtraction' ? needsParenthesesAsRightFactor(node) : startsWithSign(node);
}
