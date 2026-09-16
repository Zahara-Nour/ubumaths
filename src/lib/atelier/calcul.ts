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
import { readNumber } from './parse';
import { syncEngine, expressionOf } from './engine';
import { toCustom } from '$lib/mathAST/custom-generator';
import { resolveCommand, suggestFor, commandCatalog } from './commands';
import { renderResult } from './render';

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
	  }
	| { readonly kind: 'refus'; readonly message: string };

/** Ce qu'une action attachée à un objet a produit. */
export type ActionOutcome =
	| { readonly ok: true; readonly output: string; readonly latex?: string }
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

/** Le type d'objet qu'annonce une définition, d'après sa forme. */
function kindOf(parameter: string | undefined): ObjectKind {
	if (parameter === 'n') return 'sequence';
	return parameter === undefined ? 'value' : 'function';
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
			{ kind: kindOf(parameter), name, definition: body.trim() },
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
	const name = (space === -1 ? resolved.slice(1) : resolved.slice(1, space)).trim().toLowerCase();

	// ⚠️ On vérifie AVANT d'exécuter : le moteur répondrait « Unknown command »
	// en anglais, sans dire ce qui s'en approche (§2 E2).
	const known = commandCatalog(engine).some(
		(c) => c.name.toLowerCase() === name || c.aliases.some((a) => a.toLowerCase() === name)
	);
	if (!known) {
		const typed = (
			input.indexOf(' ') === -1 ? input.slice(1) : input.slice(1, input.indexOf(' '))
		).trim();
		const close = suggestFor(engine, typed);
		const suffix =
			close.length === 0 ? '' : ` Peut-être : ${close.map((c) => `« .${c} »`).join(' ou ')} ?`;
		return { kind: 'refus', message: `« .${typed} » n'est pas une commande.${suffix}` };
	}

	// L'argument reçoit les EXPRESSIONS, pas les noms — règle du §6 bis, ici
	// appliquée à la commande tapée à la main.
	const executed =
		space === -1
			? resolved
			: `${resolved.slice(0, space)} ${substituteNames(session, resolved.slice(space + 1))}`;

	const result = engine.execute(executed);
	// `fromCommand` : pour une commande, `result.ast` porte l'ENTRÉE. Le rendre
	// afficherait « x^2 » là où `.dériver x^2` répond « 2x » (voir `render.ts`).
	const rendered = renderResult(result, { fromCommand: true });
	return {
		kind: 'commande',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: rendered.latex })
	};
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

	const result = session.engine.execute(input);
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

	const result = engine.execute(build(substituted.expression));
	const rendered = renderResult(result, { fromCommand: true });
	if (!result.success) {
		return { ok: false, message: rendered.text || 'Le calcul n’a pas abouti.' };
	}
	return { ok: true, output: rendered.text };
}
