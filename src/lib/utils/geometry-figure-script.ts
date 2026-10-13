/**
 * Exécuter le script d'une figure stockée (ADR 0027), sans jamais lever.
 *
 * Sert à l'aperçu en direct de l'éditeur (qui interdit d'enregistrer un script
 * en erreur) et à la page publique. Les erreurs du DSL portent leur numéro de
 * ligne (« Ligne 3, colonne 5 : … ») ; il est aussi rendu à part, pour l'afficher.
 *
 * Un budget d'exécution borne les boucles : une faute de frappe dans une boucle
 * imbriquée (10^9 tours) ne doit pas figer l'onglet pendant la saisie.
 */

import { parse } from '$lib/geometry-core/dsl/parser';
import { interpret } from '$lib/geometry-core/dsl/interpreter';
import { DslParseError, DslRuntimeError } from '$lib/geometry-core/dsl/errors';
import { DslTokenizerError } from '$lib/geometry-core/dsl/tokenizer';
import type { Figure } from '$lib/geometry-core/graph/figure';

// ============================================================================
// TYPES
// ============================================================================

export type FigureScriptResult =
	{ ok: true; figure: Figure } | { ok: false; message: string; line: number | null };

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Instructions exécutées + tours de boucle. Large : le flocon de Koch (77 000
 * caractères, 4 étapes) en consomme bien moins ; les blocs ```figure de
 * l'ubumark, eux, sont bornés à 5 000 parce qu'ils viennent des élèves.
 */
export const FIGURE_SCRIPT_MAX_STEPS = 200_000;

// ============================================================================
// FONCTIONS
// ============================================================================

export function evaluateFigureScript(script: string): FigureScriptResult {
	try {
		const program = parse(script);
		const { figure } = interpret(program, undefined, undefined, {
			maxSteps: FIGURE_SCRIPT_MAX_STEPS
		});
		return { ok: true, figure };
	} catch (error) {
		if (
			error instanceof DslParseError ||
			error instanceof DslRuntimeError ||
			error instanceof DslTokenizerError
		) {
			return { ok: false, message: error.message, line: error.line };
		}
		const detail = error instanceof Error ? error.message : String(error);
		return { ok: false, message: `Le script ne s'exécute pas : ${detail}`, line: null };
	}
}
