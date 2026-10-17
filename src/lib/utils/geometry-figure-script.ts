/**
 * Exécuter le script d'une figure stockée (ADR 0027), sans jamais lever.
 *
 * Sert à l'aperçu en direct de l'éditeur (qui interdit d'enregistrer un script
 * en erreur) et à la page publique. Les erreurs du DSL portent leur numéro de
 * ligne (« Ligne 3, colonne 5 : … ») ; il est aussi rendu à part, pour l'afficher.
 *
 * Un budget d'exécution borne les boucles : une faute de frappe dans une boucle
 * imbriquée (10^9 tours) ne doit pas figer l'onglet pendant la saisie.
 *
 * `evaluateStoredFigure` lit en plus l'en-tête (texte d'un bloc ```figure :
 * en-tête, `---`, script ; sans `---`, script nu) : une erreur d'en-tête
 * empêche l'enregistrement comme une erreur de script, et les lignes du script
 * sont comptées depuis le début du texte.
 */

import { parse } from '$lib/geometry-core/dsl/parser';
import { interpret } from '$lib/geometry-core/dsl/interpreter';
import { DslParseError, DslRuntimeError } from '$lib/geometry-core/dsl/errors';
import { DslTokenizerError } from '$lib/geometry-core/dsl/tokenizer';
import type { Figure } from '$lib/geometry-core/graph/figure';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { hasFigureHeader } from '$lib/utils/stored-figure-header';
import type { FigureHeader, FigureInteractiveSettings } from '$lib/ubumark/types/figure';

// ============================================================================
// TYPES
// ============================================================================

export type FigureScriptResult =
	{ ok: true; figure: Figure } | { ok: false; message: string; line: number | null };

/** Réglages d'affichage lus dans l'en-tête ; null = script nu (affichage historique) */
export type StoredFigureDisplay = {
	header: FigureHeader;
	settings: FigureInteractiveSettings;
} | null;

export type StoredFigureResult =
	| { ok: true; figure: Figure; display: StoredFigureDisplay }
	| { ok: false; message: string; line: number | null };

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

/** « Ligne N » en tête d'un message du DSL, recalé de `offset` lignes */
const LINE_PREFIX_REGEX = /^Ligne (\d+)/;

function shiftLines(result: FigureScriptResult, offset: number): FigureScriptResult {
	if (result.ok || offset === 0) return result;
	return {
		ok: false,
		message: result.message.replace(
			LINE_PREFIX_REGEX,
			(_, n: string) => `Ligne ${Number(n) + offset}`
		),
		line: result.line === null ? null : result.line + offset
	};
}

/**
 * @param lineOffset lignes qui précèdent le script dans le texte affiché (en-tête
 *   et `---`) : les numéros de ligne des erreurs en sont décalés
 */
export function evaluateFigureScript(script: string, lineOffset = 0): FigureScriptResult {
	return shiftLines(runScript(script), lineOffset);
}

/** Texte complet d'une figure stockée : en-tête éventuel + script. */
export function evaluateStoredFigure(text: string): StoredFigureResult {
	if (!hasFigureHeader(text)) {
		const result = evaluateFigureScript(text);
		return result.ok ? { ...result, display: null } : result;
	}
	const node = parseFigureContent(text, { interactive: true });
	if (node.errors.length > 0) {
		return {
			ok: false,
			message: node.errors.map((e) => e.message).join('\n'),
			line: node.errors[0].line ?? null
		};
	}
	const result = evaluateFigureScript(node.script, node.scriptStartLine - 1);
	if (!result.ok) return result;
	const settings = node.interactive ?? { draggable: false, renderMode: 'normal' };
	return { ...result, display: { header: node.header, settings } };
}

function runScript(script: string): FigureScriptResult {
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
