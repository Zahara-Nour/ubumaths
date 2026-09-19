/**
 * Atelier — la saisie de la vue Calcul
 *
 * Un seul champ, comme dans `/cas` : ce que l'élève tape est une **définition**
 * (elle crée ou met à jour un objet), un **calcul** (il produit une ligne
 * d'historique), ou une **commande** (elle commence par un point).
 *
 * Spécification : `docs/wip/atelier-vue-calcul-phase0.md` §2 et §4.
 *
 * @module atelier/calcul
 */

import type { Atelier, Created, Refused } from './atelier.svelte';
import type { AtelierObject, ObjectKind } from './types';
import type { MathNode } from '$lib/mathAST/types';
import type { Provenance } from './parse';
import type { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { validateName, nameRejectionMessage, nextName } from './names';
import { astOf, readNumber } from './parse';
import { syncEngine, expressionOf, expandInput } from './engine';
import { toCustom } from '$lib/mathAST/custom-generator';
import { resolveCommand, suggestFor, commandCatalog } from './commands';
import { renderResult } from './render';
import { solveSteps } from './solve-steps';
import { deriveSteps } from './derive-steps';
import { simplifySteps } from './simplify-steps';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { computeVariations } from '$lib/mathAST/variations';
import { toLatex } from '$lib/mathAST/latex-generator';
import { variationTableNode } from '$lib/ubumark/builders/variation-table';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

// =============================================================================
// Types
// =============================================================================

/** Ce sur quoi la vue Calcul travaille : l'atelier, et le moteur qui le reflète. */
export interface CalcSession {
	readonly atelier: Atelier;
	readonly engine: WebReplEngine;
}

/** Ce qu'une saisie a produit. */
export type CalcResult =
	| { readonly kind: 'vide' }
	| { readonly kind: 'definition'; readonly name: string; readonly object: AtelierObject }
	| {
			readonly kind: 'calcul';
			readonly input: string;
			readonly output: string;
			readonly latex?: string;
			/**
			 * L'arbre du RÉSULTAT — le seul support sûr pour « Garder ».
			 *
			 * Sans lui il faudrait relire la sortie texte, ce que `render.ts`
			 * interdit, mesures à l'appui.
			 */
			readonly ast?: MathNode;
	  }
	| {
			readonly kind: 'commande';
			readonly input: string;
			readonly output: string;
			readonly latex?: string;
			/**
			 * Les étapes pédagogiques, quand `pedagogical-solve` sait les
			 * produire. Absentes = repli : la ligne garde la sortie du moteur.
			 */
			readonly steps?: readonly RenderedStep[];
	  }
	| { readonly kind: 'refus'; readonly message: string };

/** Ce qu'une action attachée à un objet a produit. */
export type ActionOutcome =
	| {
			readonly ok: true;
			readonly output: string;
			readonly latex?: string;
			/**
			 * Les étapes pédagogiques, quand l'action sait les produire.
			 *
			 * Absentes = repli : la ligne garde la sortie du moteur.
			 */
			readonly steps?: readonly RenderedStep[];
			/**
			 * Le tableau de variations, quand l'action en produit un.
			 *
			 * Absent = repli : la ligne garde le bloc texte du moteur.
			 */
			readonly table?: VariationTableNode;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/**
 * `f(x) = …`, `u(n) = …` ou `a = …`, mais jamais `3 = 3`.
 *
 * Le membre gauche doit avoir la forme d'un nom d'objet : sinon c'est un test
 * d'égalité, que le moteur sait déjà traiter (§2 L1).
 */
const DEFINITION = /^\s*([A-Za-z](?:_\d+)?)\s*(?:\(\s*([A-Za-z])\s*\))?\s*=\s*(.+)$/s;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le type d'objet qu'annonce une définition.
 *
 * La FORME tranche quand elle le peut : `u(n) = …` est une suite, `f(x) = …`
 * une fonction. Sans paramètre, c'est le CONTENU qui décide — sans quoi
 * `g = f'` produisait une VALEUR nommée « f' », que l'atelier croyait saine et
 * à laquelle il proposait un curseur, comme à un nombre.
 */
function kindOf(parameter: string | undefined, body: string): ObjectKind {
	if (parameter === 'n') return 'sequence';
	if (parameter !== undefined) return 'function';

	const ast = astOf(body);
	if (ast === null) return 'value';
	const variables = new Set(getVariables(ast));
	if (variables.has('x')) return 'function';
	// `f'` n'a pas de variable libre, mais désigne bien une fonction : c'est le
	// nœud lui-même qui le dit (`derivativeOrder`).
	if (/[A-Za-z](?:_\d+)?['’]/.test(body)) return 'function';
	return 'value';
}

/**
 * Créer ou mettre à jour l'objet qu'une définition décrit.
 *
 * ⚠️ Une définition qu'on ne sait pas lire crée quand même l'objet (§2 E1) :
 * il porte son erreur, et l'élève voit son travail plutôt qu'un refus sec.
 */
function defineObject(
	session: CalcSession,
	name: string,
	parameter: string | undefined,
	body: string,
	provenance: Provenance
): CalcResult {
	const { atelier } = session;
	const existing = atelier.get(name);

	if (existing === undefined) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) {
			return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
		}
		const created = atelier.create(
			{ kind: kindOf(parameter, body), name, definition: body.trim() },
			provenance
		);
		if (!created.ok) return { kind: 'refus', message: created.message };
		return { kind: 'definition', name, object: created.object };
	}

	const updated = atelier.update(name, body.trim(), provenance);
	if (!updated.ok) return { kind: 'refus', message: updated.message };
	return { kind: 'definition', name, object: updated.object };
}

/**
 * Remplacer, dans l'argument d'une commande, les noms d'objets par leur
 * expression.
 *
 * ⚠️ **Le défaut que ça répare a été vu à l'écran.** `.dériver f` rendait **0**
 * avec un message de succès : le moteur lit `f` comme une variable libre et la
 * dérive par rapport à `x`. L'action « Dériver » du panneau, elle, donnait
 * `2x-3` — parce qu'elle substitue. Deux chemins, deux réponses, dont une
 * fausse et silencieuse.
 *
 * On ne remplace qu'un nom **isolé** ou **appelé** (`f` ou `f(x)`) : sans ça,
 * le `f` de `\frac` ou d'un mot quelconque serait réécrit.
 */
function substituteNames(session: CalcSession, argument: string): string {
	if (argument.trim() === '') return argument;

	let result = argument;
	for (const object of session.atelier.objects) {
		if (object.status !== 'ok') continue;
		const expression = expressionOf(session.atelier, object.name);
		if (!expression.ok) continue;

		// `f(x)` d'abord : sinon le `f` seul de `f(x)` serait remplacé, et il
		// resterait un `(x)` orphelin.
		const called = new RegExp(`\\b${object.name}\\s*\\(\\s*[xn]\\s*\\)`, 'g');
		const alone = new RegExp(`(?<![A-Za-z_])${object.name}(?![A-Za-z_0-9])`, 'g');
		result = result.replace(called, `(${expression.expression})`);
		result = result.replace(alone, `(${expression.expression})`);
	}
	return result;
}

/** Exécuter une commande, après l'avoir traduite vers ce que comprend le moteur. */
function runCommand(session: CalcSession, input: string): CalcResult {
	const { engine } = session;
	const resolved = resolveCommand(input);

	const space = resolved.indexOf(' ');
	const typed = (space === -1 ? resolved.slice(1) : resolved.slice(1, space)).trim().toLowerCase();

	// ⚠️ On vérifie AVANT d'exécuter : le moteur répondrait « Unknown command »
	// en anglais, sans dire ce qui s'en approche (§2 E2).
	const known = commandCatalog(engine).find(
		(c) => c.name.toLowerCase() === typed || c.aliases.some((a) => a.toLowerCase() === typed)
	);
	if (known === undefined) {
		const written = (
			input.indexOf(' ') === -1 ? input.slice(1) : input.slice(1, input.indexOf(' '))
		).trim();
		const close = suggestFor(engine, written);
		const suffix =
			close.length === 0 ? '' : ` Peut-être : ${close.map((c) => `« .${c} »`).join(' ou ')} ?`;
		return { kind: 'refus', message: `« .${written} » n'est pas une commande.${suffix}` };
	}

	/**
	 * ⚠️ **Le catalogue tranche, y compris pour l'exécution.**
	 *
	 * `resolveCommand` ne traduit que le nom FRANÇAIS : un raccourci partait au
	 * moteur tel quel, et le moteur l'arbitre autrement. Mesuré le 2026-09-19 —
	 * deux raccourcis sont revendiqués par deux commandes chacun (`s` par
	 * `simplify` et `solve`, `h` par `help` et `hash`), et le moteur donne le
	 * second à chaque fois, à l'inverse du catalogue que l'élève lit :
	 *
	 *   .s x+x   → ligne VIDE (solve, « l'entrée doit être une équation »)
	 *   .h       → ligne VIDE (hash, sans argument)
	 *
	 * Le catalogue annonçait pourtant « .s → Simplifier » et « .h → Aide », et
	 * son arbitrage est délibéré (« `aide` est utile à un élève, `empreinte` ne
	 * l'est pas »). On exécute donc le nom CANONIQUE, pas ce qui a été tapé.
	 *
	 * C'est aussi ce qui permet aux étapes pédagogiques de reconnaître la
	 * commande : sans ça, `.simp` ne dépliait rien là où `.simplifier` dépliait.
	 */
	const name = known.name.toLowerCase();

	// L'argument reçoit les EXPRESSIONS, pas les noms — règle du §6 bis, ici
	// appliquée à la commande tapée à la main.
	const argument = space === -1 ? '' : substituteNames(session, resolved.slice(space + 1));
	const executed = space === -1 ? `.${known.name}` : `.${known.name} ${argument}`;

	const result = engine.execute(executed);
	// `fromCommand` : pour une commande, `result.ast` porte l'ENTRÉE. Le rendre
	// afficherait « x^2 » là où `.dériver x^2` répond « 2x » (voir `render.ts`).
	const rendered = renderResult(result, { fromCommand: true });

	// ⚠️ **Les étapes remplacent le formateur de terminal, jamais la réponse.**
	// `solveSteps` rend `null` dès qu'il ne sait pas faire (degré ≥ 3, non
	// polynomial, paramètre, liste qui ne conclut pas) : la ligne garde alors
	// exactement ce qu'elle affichait avant ce lot.
	//
	// ⚠️ **On ne conditionne PAS au succès du moteur.** Sur une inéquation il
	// échoue et ne rend rien — mesuré, `.résoudre 2x+1<7` affichait une ligne
	// entièrement vide, sans même un message. Les étapes sont alors la seule
	// chose que l'élève recevra.
	// ⚠️ **Le bouton et la commande doivent dire la MÊME chose** — leçon du lot
	// `.résoudre`, où seul l'un des deux chemins avait d'abord été branché.
	// Ici il n'y a pas d'objet à nommer, donc la dérivée est rendue seule.
	if (name === 'diff') {
		const derived = deriveSteps(argument);
		if (derived !== null) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: derived.answer,
				steps: derived.steps
			};
		}
	}

	// ⚠️ Même forme que `.dériver`, pour la même raison : le moteur ne SAIT pas
	// faire une partie de ce qu'on lui demande. Mesuré — `.simplifier x+x` et
	// `.simplifier sqrt(8)` rendaient l'entrée inchangée. L'étape n'est donc pas
	// qu'une explication ici : c'est aussi la bonne réponse.
	if (name === 'simplify') {
		const simplified = simplifySteps(argument);
		if (simplified !== null) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: simplified.answer,
				steps: simplified.steps
			};
		}
	}

	const solved = name === 'solve' ? solveSteps(argument) : null;
	if (solved !== null) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: solved.answer,
			steps: solved.steps
		};
	}

	return {
		kind: 'commande',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: rendered.latex })
	};
}

/**
 * L'entrée cite-t-elle la dérivée d'un objet qui ne peut rien produire ?
 *
 * ⚠️ Vu à l'écran : `k'` sur un objet en attente rendait « Unexpected token: ' »
 * — un message de parseur, en anglais, là où l'élève attend qu'on lui dise ce
 * qui manque.
 */
function derivativeOfUnusable(session: CalcSession, input: string): string | null {
	for (const match of input.matchAll(/([A-Za-z](?:_\d+)?)['\u2019]/g)) {
		const object = session.atelier.get(match[1]);
		if (object === undefined) {
			return `« ${match[1]} » n'existe pas : sa dérivée non plus.`;
		}
		// ⚠️ **Seule une définition ILLISIBLE bloque la dérivation.**
		//
		// Un objet « en attente » se dérive très bien : `k(x) = bx` ne peut pas
		// être ÉVALUÉ — on ne connaît pas `b` — mais `k'(x) = b` se calcule sans
		// rien savoir de `b`. Mesuré : `mathAST` rend `b*x → b`, `a*x+b → a`,
		// `b*sin(x) → b·cos(x)`.
		//
		// Mon premier garde confondait les deux et refusait une dérivée
		// parfaitement légitime — relevé par David.
		if (object.status === 'error') {
			return object.message ?? `« ${match[1]} » ne se lit pas : sa dérivée non plus.`;
		}
	}
	return null;
}

/**
 * Traiter ce que l'élève vient de taper.
 *
 * ⚠️ Le moteur est remis en accord avec l'atelier **avant** toute évaluation :
 * c'est ce qui fait que `f(2)` répond sans que l'élève redéclare `f` (§2 N3,
 * option B).
 */
export function runInput(
	session: CalcSession,
	text: string,
	provenance: Provenance = 'text'
): CalcResult {
	const input = text.trim();
	if (input === '') return { kind: 'vide' };

	syncEngine(session.atelier, session.engine);

	if (input.startsWith('.')) return runCommand(session, input);

	// La forme du membre gauche est garantie par la regex — `3 = 3` n'y entre
	// pas. Un nom RÉSERVÉ, lui, y entre et se fait refuser par `validateName` :
	// « x = 3 » doit expliquer pourquoi (§2 L2), pas se taire en test d'égalité.
	const definition = DEFINITION.exec(input);
	if (definition !== null) {
		const [, name, parameter, body] = definition;
		const result = defineObject(session, name, parameter, body, provenance);
		// L'objet a changé : le moteur doit le savoir pour le calcul suivant.
		syncEngine(session.atelier, session.engine);
		return result;
	}

	// ⚠️ Une dérivée d'objet indisponible se refuse ICI, en français : laissée au
	// moteur, elle rendait « Unexpected token: ' » — un message de parseur.
	const blocked = derivativeOfUnusable(session, input);
	if (blocked !== null) return { kind: 'refus', message: blocked };

	// `f'(2)` doit valoir 1 : le moteur ne sait pas lier `f'`, l'atelier traduit.
	const result = session.engine.execute(expandInput(session.atelier, input));
	const rendered = renderResult(result);
	return {
		kind: 'calcul',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: rendered.latex }),
		...(result.success && result.ast !== undefined && { ast: result.ast })
	};
}

/**
 * Le type d'un objet qu'on garde : il suit le CONTENU, pas le geste (§4 N2).
 *
 * Lu sur l'ARBRE, jamais sur le texte.
 */
function kindOfNode(ast: MathNode): ObjectKind {
	const variables = new Set(getVariables(ast));
	if (variables.has('x')) return 'function';
	if (variables.has('n')) return 'sequence';
	return 'value';
}

/**
 * Garder un résultat sous un nom — décision D5, le geste « je tiens quelque
 * chose » de la recherche.
 *
 * Sans nom, l'atelier en propose un. Le type suit le contenu : un résultat en
 * `x` devient une **fonction**, donc traçable — c'est ce qui permet d'enchaîner
 * « je dérive » puis « je trace la dérivée ».
 */
export function promote(
	session: CalcSession,
	result: CalcResult,
	name?: string
): Created | Refused {
	const { atelier } = session;

	// ⚠️ **Seul un calcul se garde, et seulement par son ARBRE.**
	//
	// Redériver l'objet depuis la sortie texte donnait des objets faux avec un
	// message de SUCCÈS — mesuré le 2026-09-16 :
	//   • `.résoudre x^2-4=0` gardait « 0 », pas les racines ;
	//   • `.variations x^2-3x+1` créait une FONCTION traçable nommée
	//     « Expression : x^2-3x+1 », le mot lu comme un produit de lettres ;
	//   • `.aide` gardait « MathAST CAS - Commandes disponibles ».
	//
	// Une commande ne porte pas l'arbre de son résultat — celui qu'elle rend est
	// l'arbre de l'ENTRÉE. On refuse donc, plutôt que de deviner.
	if (result.kind !== 'calcul' || result.ast === undefined) {
		return {
			ok: false,
			message:
				result.kind === 'commande'
					? 'Le résultat d’une commande ne peut pas encore être gardé. Écris le calcul directement pour le garder.'
					: 'Il n’y a rien à garder dans cette ligne.'
		};
	}

	const kind = kindOfNode(result.ast);
	const definition = toCustom(result.ast);

	const chosen = name ?? nextName(kind, atelier.names);
	const rejection = validateName(chosen, atelier.names);
	if (rejection !== null) {
		return { ok: false, message: nameRejectionMessage(rejection, chosen) };
	}

	const created = atelier.create({ kind, name: chosen, definition });
	if (created.ok) syncEngine(atelier, session.engine);
	return created;
}

// =============================================================================
// Les actions attachées aux objets (§6)
// =============================================================================

/** Ce que chaque action demande au moteur, à partir de l'expression substituée. */
const ACTION_COMMANDS: Readonly<Record<string, (expression: string) => string>> = {
	derive: (e) => `.diff ${e}`,
	solve: (e) => `.solve ${e}=0`,
	variations: (e) => `.variations ${e}`
};

/**
 * Le tableau de variations d'une expression, et la dérivée qui l'accompagne —
 * ou `null`.
 *
 * ⚠️ Rien n'est recalculé ici : `computeVariations` trouve les sens, les points
 * critiques et les limites, et le pont les traduit. Aucun chemin ne jette : une
 * exception remonterait jusqu'à `desk.runFromPanel`, qui n'afficherait alors
 * AUCUNE ligne.
 *
 * ⚠️ **La dérivée voyage avec le tableau parce qu'elle est la seule chose qu'il
 * ne dit PAS.** Le tableau montre le SIGNE de f', jamais f' elle-même — et
 * c'est ce qu'on écrit au-dessus d'un tableau de variations. Tout le reste du
 * bloc texte du moteur (domaine, points critiques, signe, extremum, limites) y
 * figure déjà, en moins lisible. Relevé par David sur capture.
 *
 * @param expression - L'expression SUBSTITUÉE (§6 bis)
 * @param name - Le nom de l'objet, pour étiqueter les lignes `f'(x)` et `f(x)`
 */
function variationTableOf(
	expression: string,
	name: string
): { readonly table: VariationTableNode; readonly derivative: string } | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;

		const variations = computeVariations(node, { variable: 'x' });
		const table = variationTableNode(variations, name);
		if (table === null) return null;

		return { table, derivative: `${name}'(x) = ${toLatex(variations.derivative)}` };
	} catch {
		return null;
	}
}

/**
 * Lancer une action du panneau sur un objet.
 *
 * ⚠️ **L'expression est substituée avant l'appel** (§6 bis) : passer `f(x)` au
 * moteur rend un résultat faux SANS erreur — `.variations f(x)` annonce
 * « Points critiques : aucun » pour une parabole qui en a un.
 *
 * @param actionId - L'identifiant de `actionsFor`, pas un libellé
 * @param name - L'objet sur lequel l'élève a cliqué
 * @param argument - Le nombre demandé, pour « image d'un nombre »
 */
export function runAction(
	session: CalcSession,
	actionId: string,
	name: string,
	argument?: string
): ActionOutcome {
	const { atelier, engine } = session;
	syncEngine(atelier, engine);

	const substituted = expressionOf(atelier, name);
	// Le message vient de l'objet : le panneau et l'action disent la même chose.
	if (!substituted.ok) return { ok: false, message: substituted.message };

	if (actionId === 'image') {
		const value = argument === undefined ? null : readNumber(argument);
		if (value === null) {
			return { ok: false, message: `« ${argument ?? ''} » n'est pas un nombre.` };
		}
		// Ici, citer le nom est SÛR et mesuré : `f(2)` rend `-1`. C'est le chemin
		// d'évaluation, pas une commande symbolique — la substitution du §6 bis ne
		// concerne que les secondes.
		const result = engine.execute(`${name}(${value})`);
		if (!result.success) {
			return { ok: false, message: `Impossible de calculer ${name}(${argument}).` };
		}
		const rendered = renderResult(result);
		return { ok: true, output: rendered.text, ...(rendered.latex && { latex: rendered.latex }) };
	}

	const build = ACTION_COMMANDS[actionId];
	if (build === undefined) {
		return { ok: false, message: `L'action « ${actionId} » n'est pas encore disponible.` };
	}

	const command = build(substituted.expression);
	const result = engine.execute(command);
	const rendered = renderResult(result, { fromCommand: true });

	// ⚠️ **Le bouton et la commande doivent dire la MÊME chose.** Depuis que
	// `.résoudre` passe par `pedagogical-solve`, l'élève qui TAPE reçoit le
	// raisonnement en français ; celui qui CLIQUE recevait encore le bloc de
	// terminal. Le même geste, deux résultats — la forme exacte du défaut que
	// `substituteNames` documente plus haut.
	//
	// On ne conditionne pas au succès du moteur : sur une inéquation il échoue
	// et ne rend rien, alors que les étapes, elles, existent.
	if (actionId === 'solve') {
		const solved = solveSteps(`${substituted.expression}=0`);
		if (solved !== null) {
			return { ok: true, output: rendered.text, latex: solved.answer, steps: solved.steps };
		}
	}

	// ⚠️ Même histoire pour les variations : le moteur rendait « Derivee »,
	// « decroissante », « Signe de f'(x) » alignés à l'espace, sans un accent —
	// alors que `VariationTable.svelte` dessine le tableau depuis toujours.
	// ⚠️ « Dériver » rendait la notation d'un terminal : `d/dx(x^2*sin(x)) = …`,
	// avec un `:/` parasite sur les quotients et aucune règle nommée.
	if (actionId === 'derive') {
		const derived = deriveSteps(substituted.expression, name);
		if (derived !== null) {
			return { ok: true, output: rendered.text, latex: derived.answer, steps: derived.steps };
		}
	}

	if (actionId === 'variations') {
		const variations = variationTableOf(substituted.expression, name);
		if (variations !== null) {
			return {
				ok: true,
				output: rendered.text,
				latex: variations.derivative,
				table: variations.table
			};
		}
	}

	if (!result.success) {
		return { ok: false, message: rendered.text || 'Le calcul n’a pas abouti.' };
	}
	return { ok: true, output: rendered.text };
}
