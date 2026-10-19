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
import { substitute, substituteAll } from '$lib/mathAST/eval/substitute';
import { substituteFunction } from '$lib/mathAST/eval/function-bindings';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { differentiate } from '$lib/mathAST/differentiation';
import { tidyTerms } from './tidy-terms';
import { radiansInTrigonometry } from './angle-radians';
import { derivativeOf } from './names';
import { INTERNAL_LETTER } from './letter';
import { astOf, readNumber, type Provenance } from './parse';
import { constantOf } from './constant';
import { perfStats, perfSwitches } from './perf-switches';
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

/**
 * La formule de `f⁻¹` en x pour une fonction de l'atelier, `null` si `name`
 * n'en est pas une (le nœud reste tel quel). LÈVE `ReciprocalUnavailable`
 * quand f n'a pas de réciproque : un refus est une RÉPONSE, que l'appelant dit.
 */
type ReciprocalResolver = (name: string) => MathNode | null;

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

/**
 * Les réciproques en cours de calcul, par atelier. Calculer `f⁻¹` relit f
 * (`substitutedAstOf`), donc les AUTRES objets — dont `g(x) = f⁻¹(x)`, qui
 * redemanderait `f⁻¹` sans fin. Redemandée en cours de calcul, elle est
 * indisponible : l'objet qui la cite est laissé de côté (f ne le cite pas,
 * sinon ce serait un cycle, déjà refusé).
 */
const resolving = new WeakMap<Atelier, Set<string>>();

/**
 * Les formules de `f⁻¹` déjà calculées, par atelier, valables tant que
 * l'empreinte de l'atelier ne change pas. Sans elles, chaque `bindingsOf`
 * recalculait toutes les réciproques citées, qui relisent f, donc refont
 * `bindingsOf` : cinq réciproques citées prenaient 11 s (revue de la PR).
 */
const formulas = new WeakMap<
	Atelier,
	{ readonly mark: string; readonly byName: Map<string, MathNode | string> }
>();

/** Tout ce dont dépend une réciproque (et le moteur) : définitions, statuts, ensembles. */
function atelierMark(atelier: Atelier): string {
	return JSON.stringify([
		// Une mesure d'angle change d'unité avec le réglage (2026-10-18)
		atelier.angleUnit,
		...atelier.objects.map((o) => [
			o.name,
			o.kind,
			o.definition,
			o.status,
			o.provenance,
			'interval' in o ? o.interval : null,
			'reciprocalOn' in o ? o.reciprocalOn : null,
			'inheritedInterval' in o ? o.inheritedInterval : null
		])
	]);
}

/** `f⁻¹` citée sans réciproque possible (f non bijective…) ; le message est le refus. */
export class ReciprocalUnavailable extends Error {}

/** `f^{-1}` écrit dans un texte (la forme rangée, `withReciprocalNotation`). */
const INVERSE_WRITTEN = /\^\{-1\}/;

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
	// ⚠️ Pas seulement les définitions : `g(x) = f⁻¹(x)` change avec l'ensemble
	// de f (`interval`, `reciprocalOn`, `inheritedInterval`) — revue de #1338
	const mark = atelierMark(atelier);

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
	functions: Record<string, FunctionDefinition>,
	reciprocals?: ReciprocalResolver
): MathNode {
	// Rien à développer (ni `f'` ni `f⁻¹`) : l'arbre tel quel, sans copie
	// (chantier perf du 2026-10-19 — `bindingsOf` recopiait chaque définition
	// à chaque coordonnée relue). Les arbres ne se modifient jamais.
	if (!citesDerivedFunction(node)) return node;
	return expandedCopy(node, functions, reciprocals);
}

/** L'arbre contient-il une dérivée (`f'`) ou une réciproque (`f⁻¹`) à développer ? */
function citesDerivedFunction(node: unknown): boolean {
	if (node === null || typeof node !== 'object' || node instanceof Map) return false;
	if (Array.isArray(node)) return node.some(citesDerivedFunction);
	const current = node as { type?: unknown; isInverse?: unknown; derivativeOrder?: unknown };
	if (
		current.type === 'function' &&
		(current.isInverse === true ||
			(typeof current.derivativeOrder === 'number' && current.derivativeOrder >= 1))
	) {
		return true;
	}
	return Object.values(node).some(citesDerivedFunction);
}

/** Le développement lui-même : une copie de l'arbre, dérivées et réciproques remplacées. */
function expandedCopy(
	node: MathNode,
	functions: Record<string, FunctionDefinition>,
	reciprocals?: ReciprocalResolver
): MathNode {
	if (node === null || typeof node !== 'object') return node;

	const current = node as MathNode & {
		type?: string;
		name?: string;
		args?: MathNode[];
		derivativeOrder?: number;
		isInverse?: boolean;
	};

	// `f⁻¹`, comme `f'` : recalculée à chaque lecture (décision (1) de David,
	// 2026-10-13). `f⁻¹` seule désigne la fonction ; `f⁻¹(5)` sa valeur en 5.
	if (current.type === 'function' && current.isInverse === true && reciprocals !== undefined) {
		const formula = typeof current.name === 'string' ? reciprocals(current.name) : null;
		if (formula !== null) {
			const args = current.args ?? [];
			if (args.length === 0) return expandDerivatives(formula, functions, reciprocals);
			const at = substitute(formula, { [INTERNAL_LETTER]: args[0] }, { maxIterations: 1 });
			// Entre parenthèses : `2f⁻¹(5)` s'écrivait `2{5-3}/2`, illisible au moteur
			const grouped: MathNode = {
				type: 'delimiter',
				delimiters: 'parentheses',
				content: expandDerivatives(at, functions, reciprocals),
				semantic: 'grouping'
			};
			return grouped;
		}
	}

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
			if (args.length === 0) return expandDerivatives(derived, functions, reciprocals);
			// ⚠️ Une seule passe : `f'(2x)` remplace x par 2x, puis plus rien —
			// itérer donnait cos(1024x) (2026-10-06)
			return expandDerivatives(
				substitute(derived, { [target.parameters[0] ?? 'x']: args[0] }, { maxIterations: 1 }),
				functions,
				reciprocals
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
					? expandDerivatives(item as MathNode, functions, reciprocals)
					: item
			);
		} else if (value instanceof Map) {
			// L'unité d'une grandeur (`components`, une Map) n'est pas un nœud : copiée
			// clé à clé, elle devenait {} et la grandeur ne se lisait plus (angles, lot 2)
			copy[key] = value;
		} else if (value !== null && typeof value === 'object') {
			copy[key] = expandDerivatives(value as MathNode, functions, reciprocals);
		}
	}
	return copy as unknown as MathNode;
}

/** Les réciproques de l'atelier, pour `expandDerivatives` (voir `ReciprocalResolver`). */
function reciprocalResolver(atelier: Atelier): ReciprocalResolver {
	return (name) => {
		if (atelier.get(name)?.kind !== 'function') return null;
		const busy = resolving.get(atelier) ?? new Set<string>();
		resolving.set(atelier, busy);
		if (busy.has(name)) throw new ReciprocalUnavailable(`${name}⁻¹ se cite elle-même.`);
		const mark = atelierMark(atelier);
		let known = formulas.get(atelier);
		if (known === undefined || known.mark !== mark) {
			known = { mark, byName: new Map() };
			formulas.set(atelier, known);
		}
		let found = known.byName.get(name);
		if (found === undefined) {
			busy.add(name);
			try {
				const outcome = atelier.reciprocalOutcome(name);
				const formula = outcome.ok
					? astOf(outcome.definition, 'text', atelier.functionNames)
					: null;
				found = outcome.ok ? (formula ?? `${name}⁻¹ ne se lit pas.`) : outcome.message;
			} finally {
				busy.delete(name);
			}
			known.byName.set(name, found);
		}
		// Un message : le refus de `.réciproque f`
		if (typeof found === 'string') throw new ReciprocalUnavailable(found);
		return found;
	};
}

/** `expandDerivatives`, ou `null` si une réciproque citée est indisponible. */
function expandedOrSkipped(
	ast: MathNode,
	functions: Record<string, FunctionDefinition>,
	reciprocals: ReciprocalResolver
): MathNode | null {
	try {
		return expandDerivatives(ast, functions, reciprocals);
	} catch (error) {
		if (error instanceof ReciprocalUnavailable) return null;
		throw error;
	}
}

/** Les types de nœuds qui ne portent aucun nom (ni variable, ni appel, ni longueur `AB`). */
const NAMELESS_NODES: ReadonlySet<string> = new Set([
	'number',
	'constant',
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'opposite',
	'positive',
	'percentage',
	'delimiter',
	'superscript',
	'unit'
]);

/**
 * L'arbre ne nomme-t-il rien que les liaisons pourraient remplacer ? Prudent :
 * un seul nœud d'un autre type (variable, lettre grecque, longueur, appel,
 * indice…) et la réponse est non.
 */
function namesNothing(node: unknown): boolean {
	if (node === null || typeof node !== 'object' || node instanceof Map) return true;
	if (Array.isArray(node)) return node.every(namesNothing);
	const type = (node as { type?: unknown }).type;
	if (typeof type === 'string' && !NAMELESS_NODES.has(type)) return false;
	return Object.entries(node).every(
		// L'unité d'une grandeur (`m`, `rad`) n'est pas un nom d'objet
		([key, child]) => (type === 'unit' && key === 'unit') || namesNothing(child)
	);
}

/** Les liaisons d'un arbre qui ne nomme rien : aucune (voir `namesNothing`). */
const NO_BINDINGS: ReturnType<typeof bindingsOf> = {
	variables: {},
	functions: {},
	derivableFunctions: {},
	reciprocals: () => null
};

/** Les types de nœuds dont on sait lire les noms (`collectNames`) : les autres font tout lier. */
const NAMED_NODES: ReadonlySet<string> = new Set(['variable', 'greek', 'function', 'subscript']);

/**
 * Ajouter à `names` toutes les chaînes de l'arbre — un SUR-ensemble des noms
 * qu'il cite (`x`, `f`, `a`… et aussi `addition`, sans effet). Rend `false`
 * quand l'arbre porte un nœud dont on ne sait pas lire les noms (une longueur
 * `AB`, dont la liaison s'appelle « AB » ou « BA ») : l'appelant lie alors tout.
 */
function collectNames(node: unknown, names: Set<string>): boolean {
	if (typeof node === 'string') {
		names.add(node);
		return true;
	}
	if (node === null || typeof node !== 'object' || node instanceof Map) return true;
	if (Array.isArray(node)) return node.every((child) => collectNames(child, names));
	const type = (node as { type?: unknown }).type;
	if (typeof type === 'string' && !NAMELESS_NODES.has(type) && !NAMED_NODES.has(type)) {
		return false;
	}
	return Object.entries(node).every(
		([key, child]) => (type === 'unit' && key === 'unit') || collectNames(child, names)
	);
}

/**
 * Les objets dont `root` peut avoir besoin : ceux qu'il nomme, puis ceux que
 * NOMMENT leurs définitions, jusqu'au point fixe (une dérivée `f'` et une
 * réciproque `f⁻¹` se développent avec la définition de f, déjà comptée).
 * `null` : on ne sait pas dire, tout lier (chantier perf du 2026-10-19 — une
 * coordonnée `a` relisait toutes les définitions, mesures comprises).
 */
function wantedNames(atelier: Atelier, root: MathNode): ReadonlySet<string> | null {
	const names = new Set<string>();
	if (!collectNames(root, names)) return null;
	const byName = new Map(derivable(atelier).map((o) => [o.name, o]));
	// Un `Set` parcouru visite aussi ce qu'on y ajoute en route : c'est le point fixe
	for (const name of names) {
		const object = byName.get(name);
		if (object === undefined) continue;
		const ast = atelier.definitionAst(object);
		if (ast !== null && !collectNames(ast, names)) return null;
	}
	return names;
}

/**
 * Les définitions des AUTRES objets, sous la forme qu'attend `substituteAll`.
 * Avec `root` : seulement celles dont cet arbre peut avoir besoin (`wantedNames`) —
 * les autres ne s'y appliqueraient à rien.
 */
function bindingsOf(atelier: Atelier, exclude: string, root?: MathNode) {
	const wanted = root === undefined ? null : wantedNames(atelier, root);
	const reciprocals = reciprocalResolver(atelier);
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
		if (wanted !== null && !wanted.has(object.name)) continue;
		perfStats.boundDefinitions++;
		// Une mesure (`aire(A, B, C)`, `AM`) remplacée par sa valeur exacte (lot 2, L4)
		const plain = atelier.definitionAst(object);
		// `g(x) = f⁻¹(x)` : la réciproque développée AVANT toute dérivée (`g'`)
		const ast = plain === null ? null : expandedOrSkipped(plain, {}, reciprocals);
		if (ast === null) continue;
		if (object.kind === 'function') raw[object.name] = { expression: ast, parameters: ['x'] };
		else if (object.kind === 'sequence' && object.mode === 'explicit')
			raw[object.name] = { expression: ast, parameters: ['n'] };
	}

	for (const object of usable(atelier)) {
		if (object.name === exclude) continue;
		if (wanted !== null && !wanted.has(object.name)) continue;
		// La réciproque déjà développée au premier passage, quand il y en a un
		const plain = raw[object.name]?.expression ?? atelier.definitionAst(object);
		// ⚠️ Développé ICI aussi : sans quoi une fonction qui cite `g` recevrait
		// `f'` par substitution, et le développement du niveau supérieur — déjà
		// passé — ne le verrait jamais.
		const ast = plain === null ? null : expandedOrSkipped(plain, raw, reciprocals);
		if (ast === null) continue;
		if (object.kind === 'function') functions[object.name] = { expression: ast, parameters: ['x'] };
		else if (object.kind === 'sequence' && object.mode === 'explicit')
			functions[object.name] = { expression: ast, parameters: ['n'] };
		else if (object.kind === 'value') variables[object.name] = ast;
	}

	return { variables, functions, derivableFunctions: raw, reciprocals };
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
	if (!text.includes("'") && !text.includes('’') && !INVERSE_WRITTEN.test(text)) return text;

	const ast = astOf(text, 'url', atelier.functionNames);
	if (ast === null) return text;

	// ⚠️ Les bindings DÉRIVABLES, pas ceux de l'évaluation : `k(x) = bx` ne
	// s'évalue pas mais se dérive, et `k'` doit valoir `b`.
	const { derivableFunctions, reciprocals } = bindingsOf(atelier, '');
	const expanded = expandedOrSkipped(ast, derivableFunctions, reciprocals);
	return expanded === null ? text : toCustom(expanded);
}

/**
 * L'argument d'une commande qui cite une dérivée, prêt pour le moteur : les
 * dérivées développées PUIS les noms substitués, le tout dans l'ARBRE.
 *
 * ⚠️ Pas en texte : `expandInput` rendait `2ax` collé (toCustom), et la
 * substitution textuelle des noms ne retrouvait plus `a` — avec a = 2 et
 * f(x) = a x², `.resoudre f'(x)=4` répondait « pas de solution » (revue #859).
 *
 * @returns null si l'argument ne se lit pas : à l'appelant de garder son texte
 */
export function expandCommandArgument(atelier: Atelier, text: string): string | null {
	const ast = astOf(text, 'url', atelier.functionNames);
	if (ast === null) return null;
	const { variables, functions, derivableFunctions, reciprocals } = bindingsOf(atelier, '');
	let expanded: MathNode;
	try {
		expanded = expandDerivatives(ast, derivableFunctions, reciprocals);
	} catch {
		return null;
	}
	const substituted = substituteAll(expanded, variables, substituteFunction, {
		functions: functions satisfies FunctionBindings
	});
	return toCustom(substituted);
}

/**
 * L'ARBRE d'un objet, tous les noms qu'il cite remplacés — voir `expressionOf`.
 *
 * ⚠️ Les suites s'en servent directement : repasser par le texte (`toCustom`
 * puis relecture) perdait des constantes (revue du lot 5b) ; l'arbre ne perd rien.
 */
export function substitutedAstOf(
	atelier: Atelier,
	name: string,
	options?: {
		readonly forDerivation?: boolean;
		/**
		 * Garder les VALEURS citées en lettres (`a x + b`) : seules les fonctions
		 * sont remplacées. La carte `f⁻¹` garde ainsi ses curseurs (`reciprocal.ts`).
		 */
		readonly keepValues?: boolean;
		/**
		 * Garder en lettres CES valeurs seulement : les curseurs de la vue Figure
		 * (`figure-sync.ts`). `b = 2a` avec `a` gardé devient `2a`.
		 */
		readonly keepNames?: ReadonlySet<string>;
	}
):
	{ readonly ok: true; readonly ast: MathNode } | { readonly ok: false; readonly message: string } {
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

	const ast = atelier.definitionAst(object);
	if (ast === null) {
		return { ok: false, message: `« ${object.definition} » ne se lit pas.` };
	}
	return substitutedTree(atelier, ast, name, options);
}

/**
 * L'arbre d'un TEXTE écrit dans l'atelier (une coordonnée de point), substitué
 * comme une définition d'objet — voir `substitutedAstOf`.
 */
export function substitutedTextOf(
	atelier: Atelier,
	text: string,
	provenance: Provenance | undefined,
	options?: { readonly keepNames?: ReadonlySet<string> }
):
	{ readonly ok: true; readonly ast: MathNode } | { readonly ok: false; readonly message: string } {
	// Une mesure dans ce texte (`(AM ; 0)`, `cercle(A ; AM)`, revue de la PR 2)
	const measured = atelier.textAst(text, provenance ?? 'url');
	if (!measured.ok) return measured;
	const ast = measured.ast;
	if (ast === null) return { ok: false, message: `« ${text} » ne se lit pas.` };
	return substitutedTree(atelier, ast, '', options);
}

/** Le cœur de `substitutedAstOf` : dérivées développées, puis noms remplacés. */
function substitutedTree(
	atelier: Atelier,
	ast: MathNode,
	name: string,
	options?: {
		readonly forDerivation?: boolean;
		readonly keepValues?: boolean;
		readonly keepNames?: ReadonlySet<string>;
	}
):
	{ readonly ok: true; readonly ast: MathNode } | { readonly ok: false; readonly message: string } {
	// Un arbre qui ne nomme rien (`0`, `3/2`, une mesure déjà remplacée par sa
	// valeur) : les liaisons ne s'y appliqueraient à rien — on ne les fabrique
	// pas (chantier perf du 2026-10-19 : chaque coordonnée `0` d'un point relisait
	// toutes les définitions, mesures comprises)
	const scoped = perfSwitches.scopedBindings;
	const { variables, functions, derivableFunctions, reciprocals } =
		scoped && namesNothing(ast) ? NO_BINDINGS : bindingsOf(atelier, name, scoped ? ast : undefined);
	// Les dérivées AVANT le reste : `f'` doit devenir une expression avant que
	// `substituteAll` cherche à y remplacer des noms. Et on les développe avec
	// les bindings DÉRIVABLES — un objet en attente se dérive.
	// ⚠️ `differentiate` LÈVE sur ce qu'il ne sait pas dériver (`abs`, `floor`).
	// Avec la carte `f′` qui suit `f`, il suffisait de changer `f` en |x| pour
	// faire tomber la carte, le moteur et les tracés (revue du lot 3a) : un
	// échec de dérivation est une RÉPONSE, pas une panne.
	let expanded: MathNode;
	try {
		expanded = expandDerivatives(ast, derivableFunctions, reciprocals);
	} catch (error) {
		// `g(x) = f⁻¹(x)` avec f non bijective : le refus de `.réciproque f`
		if (error instanceof ReciprocalUnavailable) return { ok: false, message: error.message };
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
	// Pour dériver (et pour une fonction à paramètre, V56) : une fonction citée
	// EN ATTENTE est remplacée aussi — `g(x) = f(x)+1` avec `f(x) = a x` vaut
	// `a x + 1`, et `.dériver g` répondait f'(x)
	const cited: FunctionBindings =
		options?.forDerivation === true
			? {
					...Object.fromEntries(Object.entries(derivableFunctions).filter(([n]) => n !== name)),
					...functions
				}
			: functions;
	const keep = options?.keepNames;
	const values =
		options?.keepValues === true
			? {}
			: keep === undefined
				? variables
				: Object.fromEntries(Object.entries(variables).filter(([n]) => !keep.has(n)));
	const substituted = substituteAll(withCalls, values, substituteFunction, { functions: cited });

	// Un angle mesuré pris par un cos, un sin : un nombre de radians (le moteur
	// n'évalue pas le cos d'une grandeur dans une fonction — revue de la PR 2)
	return { ok: true, ast: radiansInTrigonometry(substituted) };
}

/**
 * L'ARBRE qu'affiche la carte `f′` : la dérivée calculée, noms et paramètres
 * substitués, mise au propre — sans jamais repasser par le texte.
 *
 * ⚠️ La carte relisait `expressionOf` (écriture maison) avec `astOf` : chaque
 * aller-retour texte rouvrait un défaut (`sin` relu `s i n`, `\\pi x` collé,
 * `x^{-2/3}/3` en barre oblique). Ici, l'arbre va droit à `toLatex`.
 *
 * `tidyTerms` APRÈS la substitution : la dérivée est rangée avant, mais les
 * paramètres (a = 3) et les fonctions citées (`g(2x)`) n'arrivent qu'ensuite —
 * sans cette passe, `2 × 2 × 2x` restait tel quel. Même mise au propre que
 * `.dériver` dans Calcul.
 */
export function derivativeAstOf(
	atelier: Atelier,
	name: string
):
	{ readonly ok: true; readonly ast: MathNode } | { readonly ok: false; readonly message: string } {
	const result = substitutedAstOf(atelier, name);
	return result.ok ? { ok: true, ast: tidyTerms(result.ast) } : result;
}

export function expressionOf(
	atelier: Atelier,
	name: string,
	options?: { readonly forDerivation?: boolean }
): Substituted {
	const result = substitutedAstOf(atelier, name, options);
	return result.ok ? { ok: true, expression: toCustom(result.ast) } : result;
}

/**
 * Ce qu'une cellule de la grille sait des objets de l'atelier (tableur, lot 2) :
 * préparé UNE fois par recalcul de la grille — `bindingsOf` relit chaque
 * définition, le refaire pour chaque cellule coûterait des milliers de lectures.
 *
 * `expand` fait ce que fait une ligne de Calcul : dérivées (`f'`) et
 * réciproques (`f⁻¹`) développées, appels de suites (`u_n`), puis valeurs et
 * fonctions de l'atelier remplacées. Rend le refus d'une `f⁻¹` impossible.
 */
export interface GridContext {
	/** Les VALEURS de l'atelier remplacées, seulement (contrôle d'intervalle de `f(b)`). */
	values(ast: MathNode): MathNode;
	expand(
		ast: MathNode
	):
		| { readonly ok: true; readonly ast: MathNode }
		| { readonly ok: false; readonly message: string };
}

export function gridContext(atelier: Atelier): GridContext {
	const { variables, functions, derivableFunctions, reciprocals } = bindingsOf(atelier, '');
	return {
		values: (ast) => substituteAll(ast, variables, substituteFunction, { functions: {} }),
		expand(ast) {
			let expanded: MathNode;
			try {
				expanded = expandDerivatives(ast, derivableFunctions, reciprocals);
			} catch (error) {
				if (error instanceof ReciprocalUnavailable) return { ok: false, message: error.message };
				return { ok: false, message: 'Une dérivée citée ne se calcule pas.' };
			}
			const withCalls = subscriptsAsCalls(expanded, functions, '');
			return {
				ok: true,
				ast: substituteAll(withCalls, variables, substituteFunction, { functions })
			};
		}
	};
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
