/**
 * Source de la fonction qui exécute le code Blockly dans js-sandbox.worker.ts.
 *
 * Fichier sans effet de bord (le worker, lui, s'abonne à `self.onmessage` au chargement) : il se
 * teste sous Node.
 */

/**
 * Noms qu'une fonction en mode strict refuse comme paramètres (SyntaxError « Unexpected eval or
 * arguments in strict mode »). `eval` se bloque autrement : le worker le retire de sa portée
 * globale au démarrage.
 */
export const NOMS_INTERDITS_EN_PARAMETRE: ReadonlySet<string> = new Set(['eval', 'arguments']);

/**
 * Corps de la fonction sandbox : le code reçoit uniquement les globales nommées, passées en
 * paramètres d'une fonction en mode strict.
 */
export function construireSourceSandbox(noms: readonly string[], code: string): string {
	const interdit = noms.find((nom) => NOMS_INTERDITS_EN_PARAMETRE.has(nom));
	if (interdit) {
		throw new Error(`Sandbox : « ${interdit} » ne peut pas être un paramètre en mode strict`);
	}
	return `
		"use strict";
		return (function(${noms.join(', ')}) {
			${code}
		}).apply(null, arguments);
	`;
}
