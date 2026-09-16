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

/**
 * Les étapes de résolution d'une équation, prêtes à afficher — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors la
 * sortie actuelle du moteur. Aucun chemin de ce module ne doit pouvoir faire
 * disparaître la réponse de l'élève, donc aucun ne jette — d'où le `try` autour
 * du corps ENTIER, rendu compris : les renderers jettent eux aussi (niveau
 * incompatible, type d'équation inattendu), et une exception qui remonterait
 * jusqu'à `desk.submit` n'afficherait aucune ligne du tout.
 *
 * Quand ce module rend des étapes, `answerOf` rend forcément une réponse non
 * vide : la garde de conclusion l'exige.
 *
 * @param argument - L'équation, noms d'objets DÉJÀ substitués (§6 bis), lue
 *   telle quelle : `3x+5=14 x` est l'équation `3x+5=14x`, pas « résoudre
 *   `3x+5=14` en x ».
 */
export function solveSteps(argument: string): readonly RenderedStep[] | null {
	try {
		// ⚠️ **On lit l'argument comme des MATHÉMATIQUES, pas comme une ligne de
		// commande.** Le moteur, lui, applique deux conventions de terminal qui
		// n'ont pas leur place devant un élève, et qui lui font résoudre une
		// autre équation que celle qui est écrite :
		//   • `<équation> [variable]` : `.solve 3x+5=14 x` ampute le `x` final
		//     et répond « x = 3 », alors que `3x+5=14x` donne 5/11 ;
		//   • le retrait des options : `.solve 3-v=1` lit `-v` comme un drapeau,
		//     résout « 3 = 1 » et répond « contradictoire », alors que v = 2.
		// Le parseur, lui, lit l'espace comme une multiplication implicite —
		// mesuré, `3x+5=14 x` donne `3x+5=14x`. C'est ce que l'élève a écrit,
		// c'est ce qu'on résout. Les étapes réparent donc ces deux défauts au
		// lieu de les propager.
		const node = astOf(argument, 'text');
		// ⚠️ `relation` ne veut pas dire `équation` : `2x+1<7` est une relation,
		// et mathAST en rend quatre étapes dont la dernière est titrée
		// « Solution : x = 3 » alors que son LaTeX dit `x < 3`. Le moteur, lui,
		// refuse les inéquations — on refuse comme lui.
		if (node === null || node.type !== 'relation' || node.relation !== '=') return null;

		const steps = generateEquationSteps(node, { level: 'college' });
		if (steps.length === 0) return null;

		// ⚠️ **Le renderer se lit dans les étapes, jamais sur un degré
		// recalculé.** Le mauvais renderer ne lève aucune erreur : il ment.
		// Mesuré — une équation du premier degré rendue par le renderer du
		// second s'annonce « Équation du second degré ». Le générateur, lui, dit
		// ce qu'il a décidé.
		const first = steps[0].operation;
		const kind = first?.kind === 'identify-equation' ? first.equationType : null;
		if (kind !== 'linear' && kind !== 'quadratic') return null;

		const last = steps[steps.length - 1];
		if (!CONCLUSIONS.has(last.rule)) return null;

		const rendered =
			kind === 'linear'
				? new LinearEquationRenderer().renderAll(steps, {
						schoolLevel: 'college',
						verbosity: 'detailed'
					})
				: new QuadraticEquationRenderer().renderAll(steps, {
						schoolLevel: 'lycee',
						verbosity: 'detailed'
					});

		// Sans conclusion affichable, la ligne n'aurait RIEN à montrer : une
		// zone mathématique vide, et le texte du moteur jamais affiché.
		// `expressionLatex` est facultatif dans `RenderedStep` — on ne suppose
		// pas qu'il est là, on le vérifie.
		const answer = rendered[rendered.length - 1]?.expressionLatex;
		if (answer === undefined || answer.trim() === '') return null;

		return rendered;
	} catch {
		// Degré ≥ 3, non-polynomial, coefficients paramétriques, inconnue
		// introuvable (`b*x+5=14` → « cannot detect a single variable », une
		// `Error` nue qu'on ne peut pas distinguer par son type), ou un renderer
		// qui refuse ce qu'on lui donne.
		return null;
	}
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
