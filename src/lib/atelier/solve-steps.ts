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
import type { EquationStep } from '$lib/mathAST/pedagogical-solve';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import {
	generateEquationSteps,
	generateInequalitySteps,
	LinearEquationRenderer,
	QuadraticEquationRenderer
} from '$lib/mathAST/pedagogical-solve';
import { toLatex } from '$lib/mathAST/latex-generator';
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
	'no-real-solution',
	// Les inéquations du second degré et rationnelles concluent, elles aussi,
	// par un ensemble de solutions : `S = ]-∞ ; -2] ∪ [2 ; +∞[`.
	'inequality-conclude-rational',
	'inequality-conclude-from-isolated-square',
	'inequality-conclude-quadratic'
	// ⚠️ **`inequality-conclude-truth` est ABSENT, et délibérément.** Il annonce
	// une contradiction dès qu'il n'arrive pas à évaluer la comparaison —
	// mesuré, `0x<5` rend « contradiction : S = ∅ » alors que 0 < 5 est
	// toujours vrai, et `b*x<6` pareil alors qu'on ne peut pas conclure sans b.
	// Et là où il a raison (`2<7` → S = ℝ), la réponse est dans le TITRE : son
	// LaTeX vaut `2 < 7`, la forme réduite, pas l'ensemble des solutions.
	// L'inscrire ici ferait afficher ces réponses fausses. Ces saisies
	// dégénérées tombent alors dans `isSolvedForm`, qui les rejette. Le défaut
	// est versé au lot mathAST.
]);

/**
 * Les étapes dont le LaTeX ne s'affiche NULLE PART dans l'application.
 *
 * ⚠️ Les renderers composent le tableau de signes en `\begin{array}{|c|ccc|}`
 * avec des `\hline`. MathLive ne connaît pas cet environnement — mesuré, il
 * rend une boîte d'erreur — et aucun composant du dépôt ne sait l'afficher
 * autrement. Le défaut dépasse l'atelier : les corrections de questions
 * emploient les mêmes étapes en production.
 *
 * On garde l'étape et on retire son LaTeX : son titre (« On dresse le tableau
 * de signes ») et son explication (« le polynôme est du signe de a à
 * l'extérieur des racines… ») se suffisent. Se replier priverait l'élève de
 * TOUT — le moteur ne rend rien sur une inéquation — et afficher la boîte
 * cassée serait pire encore.
 */
const UNDISPLAYABLE_LATEX: ReadonlySet<string> = new Set([
	'quadratic-sign-table',
	'rational-sign-table'
]);

/**
 * Ce qu'une résolution donne à afficher : la réponse pour la ligne, les étapes
 * pour le dépliage.
 *
 * Les deux sont produits ENSEMBLE, à partir des mêmes étapes : une `answer`
 * calculée ailleurs pourrait décrire autre chose que ce que les étapes
 * démontrent.
 */
export interface SolvedSteps {
	/** Les étapes rendues, prêtes pour `GeneratedStepsCorrection`. */
	readonly steps: readonly RenderedStep[];
	/** La réponse en LaTeX, jamais vide — la ligne d'historique l'affiche. */
	readonly answer: string;
}

/** Le membre de gauche est-il l'inconnue toute seule ? */
function isSolvedForm(node: MathNode): boolean {
	return node.type === 'relation' && node.left.type === 'variable';
}

/**
 * La réponse à montrer sur la ligne — ou `null` si les étapes n'en donnent pas.
 *
 * Deux cas, et la différence n'est pas cosmétique :
 *
 * - **une étape de CONCLUSION** (équations, inéquations du second degré et
 *   rationnelles) porte la réponse dans son rendu : `x = 3`, `S = { … }`,
 *   `S = ]-∞ ; -2] ∪ [2 ; +∞[` ;
 * - **une inéquation du premier degré ne conclut pas** : sa dernière étape est
 *   la division, dont le rendu est un `\begin{aligned}` de deux lignes.
 *   L'afficher mettrait un bloc de calcul là où l'élève attend `x < 3`. La
 *   réponse se lit alors sur l'ARBRE `after`, qui porte la forme résolue.
 */
function answerFor(step: EquationStep, rendered: RenderedStep): string | null {
	if (CONCLUSIONS.has(step.rule)) {
		const latex = rendered.expressionLatex;
		return latex !== undefined && latex.trim() !== '' ? latex : null;
	}

	// Pas de conclusion : la dernière étape doit au moins avoir isolé l'inconnue.
	return isSolvedForm(step.after) ? toLatex(step.after) : null;
}

/**
 * L'étape, privée de son rendu quand celui-ci ne s'affiche pas.
 *
 * `expressionLatex` étant facultatif dans `RenderedStep`, et
 * `GeneratedStepsCorrection` ne l'affichant que s'il est présent, le retirer
 * suffit : l'étape garde son titre et son explication.
 */
function withoutUndisplayableLatex(step: RenderedStep): RenderedStep {
	if (!UNDISPLAYABLE_LATEX.has(step.rule)) return step;
	const { expressionLatex: _ignored, ...rest } = step;
	return rest;
}

/**
 * Les étapes de résolution d'une équation ou d'une inéquation — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors la
 * sortie actuelle du moteur. Aucun chemin de ce module ne doit pouvoir faire
 * disparaître la réponse de l'élève, donc aucun ne jette — d'où le `try` autour
 * du corps ENTIER, rendu compris : les renderers jettent eux aussi (niveau
 * incompatible, type inattendu), et une exception qui remonterait jusqu'à
 * `desk.submit` n'afficherait aucune ligne du tout.
 *
 * ⚠️ Pour une **inéquation**, le moteur n'a rien du tout — mesuré, la ligne
 * était entièrement vide. Ces étapes ne l'améliorent donc pas : elles sont la
 * seule chose que l'élève recevra.
 *
 * @param argument - L'équation ou l'inéquation, noms d'objets DÉJÀ substitués
 *   (§6 bis), lue telle quelle : `3x+5=14 x` est l'équation `3x+5=14x`, pas
 *   « résoudre `3x+5=14` en x ».
 */
export function solveSteps(argument: string): SolvedSteps | null {
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
		if (node === null || node.type !== 'relation') return null;

		const relation: RelationNode = node;
		const steps =
			relation.relation === '='
				? generateEquationSteps(relation, { level: 'college' })
				: generateInequalitySteps(relation, { level: 'college' });
		if (steps.length === 0) return null;

		// ⚠️ **Le renderer se lit dans les étapes, jamais sur un degré
		// recalculé.** Le mauvais renderer ne lève aucune erreur : il ment.
		// Mesuré — une équation du premier degré rendue par le renderer du
		// second s'annonce « Équation du second degré ». Le générateur, lui, dit
		// ce qu'il a décidé — et pour une inéquation il dit aussi `rational`,
		// une troisième valeur que `correction-generator` confie, comme nous, au
		// renderer du second degré.
		const first = steps[0].operation;
		const kind = first?.kind === 'identify-equation' ? first.equationType : null;
		if (kind === null) return null;

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

		// Sans réponse affichable, la ligne n'aurait RIEN à montrer : une zone
		// mathématique vide, et le texte du moteur jamais affiché.
		const answer = answerFor(steps[steps.length - 1], rendered[rendered.length - 1]);
		if (answer === null) return null;

		return { steps: rendered.map(withoutUndisplayableLatex), answer };
	} catch {
		// Degré ≥ 3, non-polynomial, coefficients paramétriques, inconnue
		// introuvable (`b*x+5=14` → « cannot detect a single variable », une
		// `Error` nue qu'on ne peut pas distinguer par son type), ou un renderer
		// qui refuse ce qu'on lui donne.
		return null;
	}
}
