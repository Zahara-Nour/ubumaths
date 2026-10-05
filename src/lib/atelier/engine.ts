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
import { toLatex } from '$lib/mathAST/latex-generator';
import { differentiate } from '$lib/mathAST/differentiation';
import { tidyTerms } from './tidy-terms';
import { derivativeOf } from './names';
import { astOf, readNumber } from './parse';
import { constantOf } from './constant';
import { transformAST } from '$lib/mathAST/visitor';
import {
	computeSequenceTerms,
	INDEX_VARIABLE,
	PREV_TERM_VARIABLE,
	type SequenceTerm
} from '$lib/grapheur/sequence';

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

/**
 * Les objets qu'on peut DÉRIVER, même s'ils ne s'évaluent pas.
 *
 * Plus large que `usable` : un objet en attente d'un paramètre garde une
 * définition lisible, donc dérivable. Seule une définition illisible est
 * écartée.
 */
function derivable(atelier: Atelier): AtelierObject[] {
	return atelier.objects.filter((o) => o.status !== 'error' && o.definition.trim() !== '');
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
		// ⚠️ Le moteur reçoit l'expression DÉVELOPPÉE, jamais la définition brute.
		//
		// Vu à l'écran : après `g = f'`, taper `g(3)` rendait « Evaluation error:
		// Cannot evaluate derivative function 'f'(x) without a definition » — le
		// moteur ne sait pas lier `f'`. C'est le §6 bis appliqué à la
		// synchronisation, au troisième endroit où il manquait après les commandes
		// et les actions.
		const substituted = expressionOf(atelier, object.name);
		const ast = substituted.ok ? astOf(substituted.expression) : astOf(object.definition);
		if (ast === null) continue;
		if (object.kind === 'function') {
			createFunctionBinding(state, object.name, ['x'], ast);
		} else if (object.kind === 'sequence') {
			// ⚠️ Une récurrence n'est PAS une fonction de n : la lier ainsi rendait
			// une erreur en anglais (« free variables: u »). Ses termes passent par
			// `termsOf`, et Calcul les substitue (`recurrenceTermsIn`, calcul.ts).
			if (object.mode === 'explicit') createFunctionBinding(state, object.name, ['n'], ast);
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
				// Terme à terme : `differentiate` écrit a·n·xⁿ⁻¹ sans calculer le
				// produit (`3*3x^2` sur la carte f′, retour de David) ; l'ordre des
				// termes reste celui de la règle (voir `tidy-terms.ts`).
				derived = tidyTerms(differentiate(derived));
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

	// Premier passage : les arbres bruts, pour que le développement des dérivées
	// puisse s'appuyer sur eux (`f'` a besoin de connaître `f`).
	//
	// ⚠️ Ici on prend AUSSI les objets en attente : `k(x) = bx` ne s'évalue pas,
	// mais il se dérive — `k'` vaut `b`, sans qu'on sache ce que `b` vaut. Seul
	// ce qui ne se LIT pas est écarté.
	const raw: Record<string, FunctionDefinition> = {};
	for (const object of derivable(atelier)) {
		const ast = astOf(object.definition, object.provenance, atelier.functionNames);
		if (ast === null) continue;
		if (object.kind === 'function') raw[object.name] = { expression: ast, parameters: ['x'] };
		else if (object.kind === 'sequence' && object.mode === 'explicit')
			raw[object.name] = { expression: ast, parameters: ['n'] };
	}

	for (const object of usable(atelier)) {
		if (object.name === exclude) continue;
		const plain = astOf(object.definition, object.provenance, atelier.functionNames);
		// ⚠️ Développé ICI aussi : sans quoi une fonction qui cite `g` recevrait
		// `f'` par substitution, et le développement du niveau supérieur — déjà
		// passé — ne le verrait jamais.
		const ast = plain === null ? null : expandDerivatives(plain, raw);
		if (ast === null) continue;
		if (object.kind === 'function') functions[object.name] = { expression: ast, parameters: ['x'] };
		else if (object.kind === 'sequence' && object.mode === 'explicit')
			functions[object.name] = { expression: ast, parameters: ['n'] };
		else if (object.kind === 'value') variables[object.name] = ast;
	}

	return { variables, functions, derivableFunctions: raw };
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

	const ast = astOf(text, 'url', atelier.functionNames);
	if (ast === null) return text;

	// ⚠️ Les bindings DÉRIVABLES, pas ceux de l'évaluation : `k(x) = bx` ne
	// s'évalue pas mais se dérive, et `k'` doit valoir `b`.
	const { derivableFunctions } = bindingsOf(atelier, '');
	const expanded = expandDerivatives(ast, derivableFunctions);
	return toCustom(withPlainEuler(expanded));
}

/**
 * L'ARBRE d'un objet, tous les noms qu'il cite remplacés — voir `expressionOf`.
 *
 * ⚠️ Les suites s'en servent directement : repasser par le texte (`toCustom`
 * puis relecture) perdait des constantes — `e^(-n)` devenait `\\euler^{-n}`,
 * illisible au retour (revue du lot 5b).
 */
export function substitutedAstOf(
	atelier: Atelier,
	name: string,
	options?: { readonly forDerivation?: boolean }
):
	| { readonly ok: true; readonly ast: MathNode }
	| { readonly ok: false; readonly message: string } {
	const object = atelier.get(name);
	if (object === undefined) {
		return { ok: false, message: `« ${name} » n'existe pas dans l'atelier.` };
	}
	// ⚠️ **Évaluer et dériver n'ont pas les mêmes exigences.**
	//
	// `k(x) = bx` ne peut pas être ÉVALUÉ — on ne connaît pas `b` — mais il se
	// DÉRIVE parfaitement : `k'` vaut `b`. Confondre les deux refusait une
	// dérivée légitime (relevé par David) ; ne plus distinguer du tout laissait
	// passer des évaluations sur du vide, et trois tests l'ont montré aussitôt.
	const blocking =
		options?.forDerivation === true ? ['error', 'incomplete'] : ['error', 'incomplete', 'pending'];
	if (blocking.includes(object.status)) {
		// Le message de l'objet dit déjà ce qui manque ou ce qui cloche ; le
		// reformuler ici le ferait diverger de ce que montre le panneau.
		return {
			ok: false,
			message: object.message ?? `« ${name} » n'a pas encore de définition exploitable.`
		};
	}

	const ast = astOf(object.definition, object.provenance, atelier.functionNames);
	if (ast === null) {
		return { ok: false, message: `« ${object.definition} » ne se lit pas.` };
	}

	const { variables, functions, derivableFunctions } = bindingsOf(atelier, name);
	// Les dérivées AVANT le reste : `f'` doit devenir une expression avant que
	// `substituteAll` cherche à y remplacer des noms. Et on les développe avec
	// les bindings DÉRIVABLES — un objet en attente se dérive.
	// ⚠️ `differentiate` LÈVE sur ce qu'il ne sait pas dériver (`abs`, `floor`).
	// Avec la carte `f′` qui suit `f`, il suffisait de changer `f` en |x| pour
	// faire tomber la carte, le moteur et les tracés (revue du lot 3a) : un
	// échec de dérivation est une RÉPONSE, pas une panne.
	let expanded: MathNode;
	try {
		expanded = expandDerivatives(ast, derivableFunctions);
	} catch {
		const derivative = derivativeOf(name);
		return {
			ok: false,
			message:
				derivative !== null
					? `La dérivée de « ${derivative.base} » ne se calcule pas.`
					: `Une dérivée citée par « ${name} » ne se calcule pas.`
		};
	}
	// Une autre suite explicite écrite `v_n` (et non `v(n)`) est un APPEL : sans
	// cette réécriture elle n'était pas remplacée, et le grapheur refusait la
	// suite qui la cite (revue du lot 5b)
	const withCalls = subscriptsAsCalls(expanded, functions, name);
	const substituted = substituteAll(withCalls, variables, substituteFunction, {
		functions: functions satisfies FunctionBindings
	});

	return { ok: true, ast: substituted };
}

export function expressionOf(
	atelier: Atelier,
	name: string,
	options?: { readonly forDerivation?: boolean }
): Substituted {
	const result = substitutedAstOf(atelier, name, options);
	return result.ok ? { ok: true, expression: toCustom(withPlainEuler(result.ast)) } : result;
}

/**
 * Le nombre d'Euler écrit `e`, et non `\euler`.
 *
 * ⚠️ `toCustom` écrit `\euler`, que ni le parseur du grapheur ni le moteur de
 * Calcul ne lisent (« Unknown command: \euler ») : `f(x) = e^x` ne se traçait
 * pas, `.deriver f` rendait une ligne vide (retour de David, 2026-10-05). `e`
 * est un nom réservé de l'atelier : l'écrire `e` ne peut désigner rien d'autre,
 * et les deux le lisent comme Euler.
 */
function withPlainEuler(ast: MathNode): MathNode {
	return transformAST(ast, {
		enterConstant: (node) =>
			node.constant === 'euler' ? { type: 'variable', name: 'e' } : undefined
	});
}

/** `v_n` → `v(n)` pour chaque autre suite explicite liée. */
function subscriptsAsCalls(
	ast: MathNode,
	functions: Readonly<Record<string, FunctionDefinition>>,
	self: string
): MathNode {
	return transformAST(ast, {
		enterSubscript: (node) =>
			node.base.type === 'variable' && node.base.name !== self && node.base.name in functions
				? { type: 'function', name: node.base.name, args: [node.subscript] }
				: undefined
	});
}

// =============================================================================
// Les termes d'une suite (lot 5)
// =============================================================================

/** Ce que rend `termsOf` : les termes, ou pourquoi on ne peut pas les calculer. */
export type Terms =
	| { readonly ok: true; readonly terms: readonly SequenceTerm[] }
	| { readonly ok: false; readonly message: string };

/**
 * Les termes d'une suite, du premier jusqu'au rang `lastIndex`.
 *
 * Réutilise le calcul du grapheur (`computeSequenceTerms`) : la définition
 * reçoit d'abord ses noms (valeurs, fonctions), puis le terme précédent —
 * écrit `u_n` ou `u(n)`, les deux (décision S2) — devient la variable que le
 * grapheur itère. Le premier terme est un nombre ou une valeur (S1).
 */
export function termsOf(atelier: Atelier, name: string, lastIndex: number): Terms {
	const object = atelier.get(name);
	if (object === undefined || object.kind !== 'sequence') {
		return { ok: false, message: `« ${name} » n'est pas une suite.` };
	}
	const substituted = substitutedAstOf(atelier, name);
	if (!substituted.ok) return substituted;
	const parsed = substituted.ast;

	let ast: MathNode;
	try {
		ast = previousTermAsVariable(parsed, name);
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}

	let firstTerm: number | null = null;
	if (object.mode === 'recurrence') {
		const first = firstTermValue(atelier, object.firstTerm);
		if (typeof first === 'string') return { ok: false, message: first };
		firstTerm = first;
	}

	const terms = computeSequenceTerms(
		{ mode: object.mode, ast, firstIndex: object.firstIndex, firstTerm },
		lastIndex
	);
	return { ok: true, terms };
}

/** La valeur numérique du premier terme : un nombre, ou une valeur de l'atelier. */
export function firstTermValue(atelier: Atelier, firstTerm: string): number | string {
	const plain = readNumber(firstTerm.replace(/\{,\}/g, ','));
	if (plain !== null) return plain;
	const cited = atelier.get(firstTerm);
	// Une grandeur perdrait son unité en silence (revue du lot 5a, M1)
	if (cited?.kind === 'value' && cited.unit !== undefined) {
		return `Le premier terme « ${firstTerm} » est une grandeur en ${cited.unit} : une suite prend un nombre.`;
	}
	const noValue = `Le premier terme « ${firstTerm} » n'a pas de valeur : il faut un nombre, ou le nom d'une valeur.`;
	if (cited?.kind !== 'value') return noValue;
	const value = expressionOf(atelier, firstTerm);
	if (!value.ok) return noValue;
	return constantOf(value.expression, 'text', atelier.functionNames) ?? noValue;
}

/**
 * `u_n` et `u(n)` deviennent le terme précédent que le grapheur itère.
 *
 * ⚠️ Seul le terme de rang n est permis : `u(n-1)` ou `u_{n+1}` feraient une
 * récurrence d'un autre ordre, que le grapheur ne calcule pas — on le dit.
 */
function previousTermAsVariable(ast: MathNode, name: string): MathNode {
	const isN = (node: MathNode) => node.type === 'variable' && node.name === INDEX_VARIABLE;
	const shifted = () =>
		new Error(`Seul « ${name}(n) » est accepté : une récurrence d'ordre 1 ne décale pas le rang.`);
	return transformAST(ast, {
		enterSubscript: (node) => {
			if (node.base.type !== 'variable' || node.base.name !== name) return undefined;
			if (!isN(node.subscript)) throw shifted();
			return { type: 'variable', name: PREV_TERM_VARIABLE };
		},
		enterFunction: (node) => {
			if (node.name !== name) return undefined;
			if (node.args.length !== 1 || !isN(node.args[0])) throw shifted();
			return { type: 'variable', name: PREV_TERM_VARIABLE };
		}
	});
}

/**
 * Le LaTeX qu'attend le grapheur pour tracer une suite, ou `null`.
 *
 * Les autres noms sont remplacés (valeurs, fonctions explicites), et le terme
 * précédent est écrit `u_n` — la seule forme que `parseSequence` du grapheur
 * relit ; l'élève, lui, a pu écrire `u(n)` (décision S2).
 */
export function graphLatexOf(atelier: Atelier, name: string): string | null {
	const substituted = substitutedAstOf(atelier, name);
	if (!substituted.ok) return null;
	const parsed = substituted.ast;
	const rewritten = transformAST(parsed, {
		enterFunction: (node) =>
			node.name === name && node.args.length === 1
				? { type: 'subscript', base: { type: 'variable', name }, subscript: node.args[0] }
				: undefined
	});
	return toLatex(rewritten);
}
