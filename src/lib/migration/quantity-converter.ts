/**
 * Grandeurs TinyMath → notation du moteur (lot 4 du chantier Grandeurs)
 * =====================================================================
 *
 * TinyMath écrit une grandeur « nombre espace unité » (`&1 mm`, `$e[1;11] km`,
 * `[_&1_] km.h^{-1}`, `&1 h &2 min`) et un calcul « exprimé en » `[_expr_unité_]`
 * (`_HMS_` = affichage en heures-minutes-secondes). Le moteur (#484) écrit
 * `7[mm]`, `{{eval:expr;[unité]}}` et `{{eval:…;hms}}`.
 *
 * Ce module travaille sur le TEXTE TinyMath (références `&n` intactes), avant la
 * conversion TinyCAS : il ne réécrit que ce qui est reconnu comme une unité de la
 * liste scolaire ci-dessous — toute autre lettre (`x`, `a`…) reste une variable.
 */

import { parse as parseUnit } from '$lib/mathAST/units/parser';

// Unités simples que TinyMath écrit (longueurs, masses, contenances, durées)
const PREFIXED = /^(?:k|h|da|d|c|m|µ)?(?:m|g|L)(?:\^\{?[23]\}?)?$/;
const SIMPLE = new Set(['h', 'min', 's', 'ms', 't']);
// Écriture d'unité TinyMath : symboles, exposants `^2` / `^{-1}`, produits `.`
const UNIT_SOURCE = String.raw`[a-zA-Zµ]+(?:\^\{?-?\d\}?)?(?:\.[a-zA-Zµ]+(?:\^\{?-?\d\}?)?)*`;
// Opérande d'une grandeur : référence `&n`, nombre, calcul `[_…_]` ou parenthèse simple
const OPERAND_SOURCE = String.raw`&\w+|\d+(?:[.,]\d+)?|\[_(?:(?!_\]).)*_\]`;
// Une grandeur « opérande espace unité », l'unité finissant sur un mot entier
const QUANTITY = new RegExp(
	String.raw`(${OPERAND_SOURCE})\s+(${UNIT_SOURCE})(?![a-zA-Zµ0-9^{])`,
	'g'
);
const LONE_QUANTITY = new RegExp(String.raw`^\s*(${OPERAND_SOURCE})\s+(${UNIT_SOURCE})\s*$`);
// Grandeur réécrite (`&1[h]`, `30[min]`, `(&2)[min]`) ; une suite juxtaposée = durée composée
const REWRITTEN_ATOM = String.raw`(?:&\w+|\d+(?:\.\d+)?|\([^()]*\))\[[^\]\s]+\]`;
const JUXTAPOSED = new RegExp(String.raw`${REWRITTEN_ATOM}(?:\s+${REWRITTEN_ATOM})+`);
// Tirage TinyMath suivi d'une unité : `$e[1;11] mm`
const DRAW_WITH_UNIT = new RegExp(
	String.raw`^\s*(\$er?\[[^\]]*\](?:\\\{[^}]*\})?)\s+(${UNIT_SOURCE})\s*$`
);

/** Unité TinyMath reconnue (liste scolaire, ou produit/puissance de celles-ci) */
export function isTinyMathUnit(writing: string): boolean {
	const symbols = writing.split('.').map((part) => part.replace(/\^\{?-?\d\}?$/, ''));
	const known = symbols.every((symbol) => PREFIXED.test(symbol) || SIMPLE.has(symbol));
	return known && parseUnit(writing) !== null;
}

/** Opérande TinyMath → opérande du calcul : `[_x_]` → `(x)` */
function operandInCalculation(operand: string): string {
	const evaluation = operand.match(/^\[_(.*)_\]$/s);
	if (evaluation) return `(${evaluation[1]})`;
	return operand.replace(/(\d),(\d)/g, '$1.$2');
}

/**
 * Grandeurs écrites DANS un calcul : `&1 h` → `&1[h]`, `(1 min)` → `(1[min])`,
 * durée composée `&1 h &2 min` → `(&1[h]+&2[min])`.
 */
export function quantitiesInCalculation(body: string): string {
	let result = body.replace(QUANTITY, (match, operand: string, unit: string) =>
		isTinyMathUnit(unit) ? `${operandInCalculation(operand)}[${unit}]` : match
	);
	// Durée composée : somme des grandeurs juxtaposées, entre parenthèses
	let chain = JUXTAPOSED.exec(result);
	while (chain) {
		const sum = chain[0].split(/\s+/).join('+');
		result =
			result.slice(0, chain.index) + `(${sum})` + result.slice(chain.index + chain[0].length);
		chain = JUXTAPOSED.exec(result);
	}
	return result;
}

/** Corps d'un calcul `[_…_]` : `expr_unité` → `expr;[unité]`, `expr_HMS` → `expr;hms` */
function convertEvaluationBody(body: string, decimal: boolean, inSolution: boolean): string {
	const split = body.match(/^(.*)_([^_]+)$/s);
	const suffix = split?.[2].trim();
	if (split && suffix && (suffix === 'HMS' || isTinyMathUnit(suffix))) {
		const expression = quantitiesInCalculation(split[1].trim());
		// Réponse attendue : une seule unité, jamais `;hms` (interdit par le moteur)
		const modifier = suffix === 'HMS' ? (inSolution ? '' : ';hms') : `;[${suffix}]`;
		// Une grandeur est déjà décimale : `[._` n'ajoute rien
		return `[_${expression}${modifier}_]`;
	}
	const rewritten = quantitiesInCalculation(body);
	return decimal ? `[._${rewritten}_]` : `[_${rewritten}_]`;
}

/**
 * Réécrit les grandeurs des calculs `[_…_]` / `[._…_]` et des affichages `[°…°]`
 * d'un texte TinyMath. Sans grandeur, le texte est rendu inchangé.
 */
export function rewriteTinyMathQuantities(text: string, inSolution = false): string {
	if (!text) return text;
	// Durée collée à une référence (`&1h = ?min`) : `&1h` se lirait comme une variable `1h`
	let result = text.replace(/&(\d+)(h|min|s)(?![a-zA-Z0-9])/g, '&$1 $2');
	result = result.replace(/\[(\.?)_((?:(?!_\]).)*?)_\]/gs, (match, dot: string, body: string) => {
		const converted = convertEvaluationBody(body, dot === '.', inSolution);
		return converted === `[${dot}_${body}_]` ? match : converted;
	});
	// Affichage `[°&1 cm°]` : la grandeur en LaTeX
	result = result.replace(/\[°([\s\S]*?)°\]/g, (match, body: string) => {
		const displayed = body.replace(QUANTITY, (quantity, operand: string, unit: string) =>
			isTinyMathUnit(unit) ? `${operand}~\\unit{${unit}}` : quantity
		);
		return displayed === body ? match : `[°${displayed}°]`;
	});
	return result;
}

/**
 * Valeur ENTIÈRE qui est une grandeur (définition de variable, solution) :
 * `&1 mm` → `[_&1[mm]_]`, `[_&1_] km.h^{-1}` → `[_(&1)[km.h^{-1}]_]`,
 * `&1 h &2 min` → `[_(&1[h]+&2[min])_]`. `null` si ce n'est pas une grandeur.
 */
export function wholeQuantity(value: string): string | null {
	const trimmed = value.trim();
	if (!LONE_QUANTITY.test(trimmed) && !/^(?:\S+\s+\S+\s+)+\S+\s+\S+$/.test(trimmed)) return null;
	const rewritten = quantitiesInCalculation(trimmed);
	// Tout doit être grandeur : plus aucune espace hors des grandeurs réécrites
	if (rewritten === trimmed || /\s/.test(rewritten)) return null;
	return `[_${rewritten}_]`;
}

/**
 * Définition de variable TinyMath qui est une grandeur, en entrées `[nom, expression]`
 * (tirage → variable auxiliaire `<nom>1`, comme les tirages composés). `null` sinon.
 */
export function splitQuantityVariable(name: string, expression: string): [string, string][] | null {
	const draw = expression.match(DRAW_WITH_UNIT);
	if (draw && isTinyMathUnit(draw[2])) {
		return [
			[`&${name}1`, draw[1]],
			[`&${name}`, `&${name}1[${draw[2]}]`]
		];
	}
	// ⚠️ Liste de grandeurs (`$l{&1 km; &1 hm}`) NON convertie : un élément de liste n'est
	// pas substitué à l'affichage (`a[mm]` s'afficherait « a mm ») — #428, #429 en erreur
	const whole = wholeQuantity(expression);
	if (whole) return [[`&${name}`, whole]];
	return null;
}

/** La définition TinyMath est-elle une grandeur ? */
export function isQuantityDefinition(expression: string): boolean {
	return splitQuantityVariable('x', expression) !== null;
}
