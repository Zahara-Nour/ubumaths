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
import type { Provenance } from './parse';
import type { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { validateName, nameRejectionMessage, nextName } from './names';
import { astOf } from './parse';
import { syncEngine } from './engine';
import { resolveCommand, suggestFor, commandCatalog } from './commands';

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
	| { readonly kind: 'calcul'; readonly input: string; readonly output: string }
	| { readonly kind: 'commande'; readonly input: string; readonly output: string }
	| { readonly kind: 'refus'; readonly message: string };

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

/** Ce que le moteur a renvoyé, débarrassé de ce qui ne regarde pas l'élève. */
function readOutput(result: { output: string; outputHtml?: string }): string {
	return result.output;
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
	// `provenance` suivra jusqu'à `create`/`update` quand la dette D10 sera
	// soldée — ils ne la prennent pas encore.
	void provenance;

	const { atelier } = session;
	const existing = atelier.get(name);

	if (existing === undefined) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) {
			return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
		}
		const created = atelier.create({ kind: kindOf(parameter), name, definition: body.trim() });
		if (!created.ok) return { kind: 'refus', message: created.message };
		return { kind: 'definition', name, object: created.object };
	}

	const updated = atelier.update(name, body.trim());
	if (!updated.ok) return { kind: 'refus', message: updated.message };
	return { kind: 'definition', name, object: updated.object };
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

	const result = engine.execute(resolved);
	return { kind: 'commande', input, output: readOutput(result) };
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
	provenance: Provenance = 'keyboard'
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
	return { kind: 'calcul', input, output: readOutput(result) };
}

/** L'expression qu'une ligne d'historique permet de garder, s'il y en a une. */
function keepable(result: CalcResult): string | null {
	if (result.kind === 'calcul') return result.output.trim() || null;
	if (result.kind !== 'commande') return null;

	// Les commandes répondent en plusieurs lignes, sur le modèle
	// « d/dx(x^2) = 2x » puis « LaTeX: 2 x ». C'est ce qui suit le dernier `=`
	// de la première ligne qui est le résultat.
	const first = result.output.split('\n')[0];
	const equals = first.lastIndexOf('=');
	const candidate = (equals === -1 ? first : first.slice(equals + 1)).trim();
	return candidate === '' ? null : candidate;
}

/** Le type d'un résultat qu'on garde : il suit le CONTENU, pas le geste (§4 N2). */
function kindOfExpression(expression: string): ObjectKind | null {
	const ast = astOf(expression);
	if (ast === null) return null;
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

	const expression = keepable(result);
	if (expression === null) {
		// Une définition a déjà produit son objet ; une erreur n'a rien produit.
		return { ok: false, message: "Il n'y a rien à garder dans cette ligne." };
	}

	const kind = kindOfExpression(expression);
	if (kind === null) {
		return { ok: false, message: `« ${expression} » ne peut pas devenir un objet.` };
	}

	const chosen = name ?? nextName(kind, atelier.names);
	const rejection = validateName(chosen, atelier.names);
	if (rejection !== null) {
		return { ok: false, message: nameRejectionMessage(rejection, chosen) };
	}

	const created = atelier.create({ kind, name: chosen, definition: expression });
	if (created.ok) syncEngine(atelier, session.engine);
	return created;
}
