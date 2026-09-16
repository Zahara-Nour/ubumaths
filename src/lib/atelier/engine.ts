/**
 * Atelier — le moteur reflète les objets
 *
 * **Q1, option B**, tranchée le 2026-09-16 : l'atelier détient les noms,
 * `WebReplEngine` n'est qu'un calculateur qu'on remet en accord avant de s'en
 * servir. Un seul sens, comme `plot-sync` pour le grapheur.
 *
 * Sans ce pont, `f` défini dans le panneau et `f` défini au clavier sont deux
 * `f` différents — le défaut n° 2 du cadrage, reproduit à l'intérieur de
 * l'atelier.
 *
 * @module atelier/engine
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject } from './types';
import type { MathNode } from '$lib/mathAST/types';
import type { FunctionBindings, FunctionDefinition } from '$lib/mathAST/eval/function-bindings';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import {
	setBinding,
	createFunctionBinding,
	clearBindings,
	clearFunctions
} from '$lib/mathAST/cli/core/eval-state';
import { substituteAll } from '$lib/mathAST/eval/substitute';
import { substituteFunction } from '$lib/mathAST/eval/function-bindings';
import { toCustom } from '$lib/mathAST/custom-generator';
import { differentiate } from '$lib/mathAST/differentiation';
import { astOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Ce que rend `expressionOf` : une expression prête pour le moteur, ou pourquoi non. */
export type Substituted =
	| { readonly ok: true; readonly expression: string }
	| { readonly ok: false; readonly message: string };

/**
 * Ce que le moteur connaît de l'atelier, par couple (atelier, moteur).
 *
 * Tenu à part pour ne rien refaire quand rien n'a changé : la vue Calcul
 * synchronisera à chaque frappe.
 *
 * ⚠️ Clé sur le COUPLE, pour la même raison qu'au lot 2 : deux moteurs pour un
 * même atelier ne doivent pas partager un état de synchronisation qui ne décrit
 * ni l'un ni l'autre.
 */
const pushed = new WeakMap<Atelier, WeakMap<WebReplEngine, string>>();

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les objets qu'on peut confier au moteur.
 *
 * Un objet en erreur ou en attente n'entre PAS : le moteur lui ferait dire
 * n'importe quoi, loin de l'endroit où la faute est visible. Le panneau porte
 * déjà le message, c'est là que l'élève doit le lire.
 */
function usable(atelier: Atelier): AtelierObject[] {
	return atelier.objects.filter((o) => o.status === 'ok' && o.definition.trim() !== '');
}

/** L'empreinte de ce qui est poussé — deux empreintes égales, rien à refaire. */
function fingerprint(objects: readonly AtelierObject[]): string {
	return JSON.stringify(objects.map((o) => [o.kind, o.name, o.definition]));
}

/**
 * Mettre le moteur en accord avec l'atelier.
 *
 * ⚠️ **Idempotente**, comme `syncPlots` : appelée deux fois sans changement,
 * elle ne fait rien.
 *
 * ⚠️ Vide les liaisons une par une plutôt qu'avec `clearAllState`, qui remet
 * aussi le mode à `exact` : l'élève qui bascule en décimal y serait ramené à la
 * frappe suivante, sans rien avoir demandé.
 */
export function syncEngine(atelier: Atelier, engine: WebReplEngine): void {
	const objects = usable(atelier);
	const mark = fingerprint(objects);

	const perEngine = pushed.get(atelier) ?? new WeakMap<WebReplEngine, string>();
	if (perEngine.get(engine) === mark) return;

	const state = engine.getState();
	clearBindings(state);
	clearFunctions(state);

	for (const object of objects) {
		const ast = astOf(object.definition);
		if (ast === null) continue;
		if (object.kind === 'function') {
			createFunctionBinding(state, object.name, ['x'], ast);
		} else if (object.kind === 'sequence') {
			createFunctionBinding(state, object.name, ['n'], ast);
		} else if (object.kind === 'value') {
			setBinding(state, object.name, ast);
		}
		// Les listes n'ont pas de place dans l'`EvalState` : elles arrivent au
		// lot 4, avec leurs propres commandes (`.stats`, `.linreg`).
	}

	perEngine.set(engine, mark);
	pushed.set(atelier, perEngine);
}

/**
 * Remplacer `f'` par la dérivée de `f`, partout dans un arbre.
 *
 * ⚠️ **`substituteFunction` ne le fait pas** : il laisse `f'(x)` symbolique,
 * c'est écrit dans sa documentation. Sans ce passage, `g = f'` rendait « f' »
 * tel quel — un objet que l'atelier croyait sain et qui ne valait rien.
 *
 * La dérivée est recalculée **à chaque lecture**, jamais figée : c'est ce qui
 * fait de `f'` une référence **vivante**. Modifier `f` change `g` sans que
 * l'élève ait à y revenir.
 */
function expandDerivatives(
	node: MathNode,
	functions: Record<string, FunctionDefinition>
): MathNode {
	if (node === null || typeof node !== 'object') return node;

	const current = node as MathNode & {
		type?: string;
		name?: string;
		args?: MathNode[];
		derivativeOrder?: number;
	};

	if (
		current.type === 'function' &&
		typeof current.name === 'string' &&
		(current.derivativeOrder ?? 0) >= 1
	) {
		const target = functions[current.name];
		if (target !== undefined) {
			// Dériver autant de fois que l'apostrophe le demande : `f''` existe.
			let derived = target.expression;
			for (let order = 0; order < (current.derivativeOrder ?? 1); order++) {
				derived = differentiate(derived);
			}
			// `f'` sans argument désigne la fonction ; `f'(2)` demande sa valeur en 2.
			const args = current.args ?? [];
			if (args.length === 0) return expandDerivatives(derived, functions);
			return expandDerivatives(
				substituteAll(derived, { [target.parameters[0] ?? 'x']: args[0] }, substituteFunction),
				functions
			);
		}
	}

	// Descente générique : les nœuds portent leurs enfants sous des noms variés
	// (`left`/`right`, `args`, `operand`, `base`/`exponent`…). Les parcourir tous
	// évite d'énumérer les 27 formes de `MathNode` — et d'en oublier une à la
	// prochaine qui s'ajoutera.
	//
	// ⚠️ Le double passage par `unknown` est délibéré : `MathNode` est une union
	// discriminée, et TypeScript refuse à juste titre qu'un objet reconstruit clé
	// par clé s'y convertisse directement. C'est la seule forme du module qui ne
	// se vérifie pas statiquement — les tests couvrent les cas, y compris les
	// dérivées imbriquées et composées.
	const copy = { ...(node as unknown as Record<string, unknown>) };
	for (const [key, value] of Object.entries(copy)) {
		if (Array.isArray(value)) {
			copy[key] = value.map((item) =>
				item !== null && typeof item === 'object'
					? expandDerivatives(item as MathNode, functions)
					: item
			);
		} else if (value !== null && typeof value === 'object') {
			copy[key] = expandDerivatives(value as MathNode, functions);
		}
	}
	return copy as unknown as MathNode;
}

/** Les définitions des AUTRES objets, sous la forme qu'attend `substituteAll`. */
function bindingsOf(atelier: Atelier, exclude: string) {
	const variables: Record<string, MathNode> = {};
	const functions: Record<string, FunctionDefinition> = {};

	for (const object of usable(atelier)) {
		if (object.name === exclude) continue;
		const ast = astOf(object.definition);
		if (ast === null) continue;
		if (object.kind === 'function') functions[object.name] = { expression: ast, parameters: ['x'] };
		else if (object.kind === 'sequence')
			functions[object.name] = { expression: ast, parameters: ['n'] };
		else if (object.kind === 'value') variables[object.name] = ast;
	}

	return { variables, functions };
}

/**
 * L'expression d'un objet, tous les noms qu'il cite remplacés par leur valeur.
 *
 * ⚠️ **C'est la règle du §6 bis, et elle vient d'une mesure.** Une commande à
 * qui on passe `f(x)` au lieu de l'expression rend un résultat **faux sans
 * erreur** : `.variations f(x)` affiche « Derivee : f'(x) = f'(x) » et
 * « Points critiques : aucun », soit un tableau de variations d'apparence
 * normale qui ne dit rien de la fonction. Avec `x^2-3x+1`, le même appel trouve
 * le point critique 3/2.
 *
 * La substitution est **récursive** (`substituteAll` itère) : sans ça, `f` qui
 * cite `g` reproduirait le défaut un étage plus bas.
 */
/**
 * Développer les dérivées d'une saisie libre, avant de la donner au moteur.
 *
 * ⚠️ Le moteur ne connaît pas `f'` : `f'` n'est pas un identifiant qu'il puisse
 * lier. C'est donc à l'atelier de traduire avant d'appeler, comme pour les noms
 * d'objets.
 */
export function expandInput(atelier: Atelier, text: string): string {
	if (!text.includes("'") && !text.includes('’')) return text;

	const ast = astOf(text);
	if (ast === null) return text;

	const { functions } = bindingsOf(atelier, '');
	const expanded = expandDerivatives(ast, functions);
	return toCustom(expanded);
}

export function expressionOf(atelier: Atelier, name: string): Substituted {
	const object = atelier.get(name);
	if (object === undefined) {
		return { ok: false, message: `« ${name} » n'existe pas dans l'atelier.` };
	}
	if (object.status !== 'ok') {
		// Le message de l'objet dit déjà ce qui manque ou ce qui cloche ; le
		// reformuler ici le ferait diverger de ce que montre le panneau.
		return {
			ok: false,
			message: object.message ?? `« ${name} » n'a pas encore de définition exploitable.`
		};
	}

	const ast = astOf(object.definition);
	if (ast === null) {
		return { ok: false, message: `« ${object.definition} » ne se lit pas.` };
	}

	const { variables, functions } = bindingsOf(atelier, name);
	// Les dérivées AVANT le reste : `f'` doit devenir une expression avant que
	// `substituteAll` cherche à y remplacer des noms.
	const expanded = expandDerivatives(ast, functions);
	const substituted = substituteAll(expanded, variables, substituteFunction, {
		functions: functions satisfies FunctionBindings
	});

	return { ok: true, expression: toCustom(substituted) };
}
