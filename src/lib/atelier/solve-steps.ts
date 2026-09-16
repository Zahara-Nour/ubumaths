/**
 * Atelier — la résolution pas à pas
 *
 * `.résoudre` passait jusqu'ici par `cli/commands/solve.command.ts`, qui
 * refabrique ses propres étapes en texte de terminal : « Equation lineaire »,
 * « Delta », « sqrt(5) », sans un accent, alignées à l'espace, et avec un
 * fragment cassé — `3/2+{1/2}sqrt(5)`, accolades orphelines comprises.
 *
 * Ce module branche l'atelier sur `pedagogical-solve`, le module pédagogique
 * que les corrections de questions emploient déjà en production.
 *
 * Spécification : `docs/wip/atelier-resolution-etapes-phase0.md`.
 *
 * @module atelier/solve-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { RelationNode } from '$lib/mathAST/types';
import {
	generateEquationSteps,
	LinearEquationRenderer,
	QuadraticEquationRenderer
} from '$lib/mathAST/pedagogical-solve';
import { astOf } from './parse';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les règles qui CONCLUENT une résolution.
 *
 * ⚠️ Toute liste d'étapes ne conclut pas. Mesuré : `0x=5` rend une seule étape
 * (« Équation du premier degré ») et `x=x` s'arrête sur « On soustrait x aux
 * deux membres ». Montrer ça à l'élève serait pire que la sortie actuelle, qui
 * conclut — d'où le repli quand la dernière étape n'est pas l'une de celles-ci.
 */
const CONCLUSIONS: ReadonlySet<string> = new Set([
	'read-solution',
	'read-solutions',
	'no-real-solution'
]);

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les étapes de résolution d'une équation, prêtes à afficher — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors la
 * sortie actuelle du moteur. Aucun chemin de ce module ne doit pouvoir faire
 * disparaître la réponse de l'élève, donc aucun ne jette.
 *
 * @param equation - L'équation, noms d'objets DÉJÀ substitués (§6 bis)
 */
export function solveSteps(equation: string): readonly RenderedStep[] | null {
	const node = astOf(equation, 'text');
	if (node === null || node.type !== 'relation') return null;

	let steps;
	try {
		// Le niveau remonte tout seul quand il ne colle pas : en passant
		// `college`, une équation du second degré est traitée en `lycee`
		// (mesuré). L'atelier n'a donc pas à connaître la classe de l'élève —
		// il est sans compte.
		steps = generateEquationSteps(node as RelationNode, { level: 'college' });
	} catch {
		// Degré ≥ 3, non-polynomial, coefficients paramétriques, ou l'inconnue
		// introuvable (`b*x+5=14` → « cannot detect a single variable », une
		// `Error` nue qu'on ne peut pas distinguer par son type).
		return null;
	}

	if (steps.length === 0) return null;

	// ⚠️ **Le renderer se lit dans les étapes, jamais sur un degré recalculé.**
	// Le mauvais renderer ne lève aucune erreur : il ment. Mesuré — une équation
	// du premier degré rendue par le renderer du second s'annonce « Équation du
	// second degré ». Le générateur, lui, dit ce qu'il a décidé.
	const first = steps[0].operation;
	const kind = first?.kind === 'identify-equation' ? first.equationType : null;
	if (kind !== 'linear' && kind !== 'quadratic') return null;

	if (!CONCLUSIONS.has(steps[steps.length - 1].rule)) return null;

	return kind === 'linear'
		? new LinearEquationRenderer().renderAll(steps, {
				schoolLevel: 'college',
				verbosity: 'detailed'
			})
		: new QuadraticEquationRenderer().renderAll(steps, {
				schoolLevel: 'lycee',
				verbosity: 'detailed'
			});
}

/**
 * La réponse que garde la ligne d'historique, les étapes se dépliant sous elle.
 *
 * Lue sur la DERNIÈRE ÉTAPE — jamais dans la sortie texte du moteur, ce que
 * `render.ts` interdit, mesures à l'appui.
 */
export function answerOf(steps: readonly RenderedStep[]): string {
	return steps[steps.length - 1]?.expressionLatex ?? '';
}
