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
 * Spécification : `docs/archive/wip/atelier-resolution-etapes-phase0.md`.
 *
 * @module atelier/solve-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { EquationStep } from '$lib/mathAST/pedagogical-solve';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import type {
	PedagogicalRenderOptions,
	SchoolLevel,
	StepRenderer
} from '$lib/mathAST/common/step-renderer-base';
import {
	AbsoluteValueEquationRenderer,
	generateEquationSteps,
	generateInequalitySteps,
	LinearEquationRenderer,
	QuadraticEquationRenderer
} from '$lib/mathAST/pedagogical-solve';
import { toLatex } from '$lib/mathAST/latex-generator';
import { exactValueToShow } from '$lib/mathAST/eval/exact-value';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { hasDecimalLiteral } from '$lib/mathAST/tidy/decimal';
import {
	DEFAULT_VARIABLE,
	splitVariableArgument,
	variableNameOf
} from '$lib/mathAST/cli/core/variable-argument';
import { astOf, variablesOf } from './parse';
import { concludedSolutions, conclusionAgrees } from './solve-steps-check';
import { summaryOf } from './steps-summary';
import { approximateSolutionsLatex } from '$lib/mathAST/cli/approximation';
import type { Domain } from '$lib/mathAST/domain/types';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { evaluate } from '$lib/mathAST/eval';
import { intervalText } from './interval';

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
	'inequality-conclude-quadratic',
	// Une équation avec valeur absolue peut conclure `S = ℝ` (|x − 1| = |1 − x|)
	'read-all-reals'
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

/** Des lettres qui ne sont pas des paramètres : e (Euler), i, π. */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(['e', 'i', 'pi']);

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
	/** Les mêmes étapes en version résumée, absente si elle ne dit rien de moins. */
	readonly summary?: readonly RenderedStep[];
	/** La réponse en LaTeX, jamais vide — la ligne d'historique l'affiche. */
	readonly answer: string;
	/**
	 * Les MÊMES solutions en valeurs approchées, pour le bouton ≈ : dans l'ordre
	 * et sous la forme de `answer` (revue : celles du moteur, triées, ne
	 * correspondaient plus à la ligne quand a < 0).
	 */
	readonly approximate?: string;
}

/** Le type d'équation qu'annonce la première étape (`identify-equation`). */
type EquationType = Extract<
	EquationStep['operation'],
	{ kind: 'identify-equation' }
>['equationType'];

/**
 * Le renderer d'un type d'équation, et le niveau auquel il rend.
 *
 * ⚠️ **Exhaustif, sans `else` fourre-tout.** L'ancien `kind === 'linear' ?
 * Linear : Quadratic` envoyait sans bruit tout nouveau type au renderer du
 * second degré — mesuré le 2026-10-13, `|2x+1|=5` s'y annonçait « Équation du
 * second degré ». Un type ajouté sans sa ligne ici ne compile plus.
 */
export function rendererFor(kind: EquationType): {
	readonly renderer: StepRenderer<EquationStep, PedagogicalRenderOptions>;
	readonly schoolLevel: SchoolLevel;
} {
	switch (kind) {
		case 'linear':
			return { renderer: new LinearEquationRenderer(), schoolLevel: 'college' };
		// `rational` : les inéquations rationnelles, que `correction-generator`
		// confie, comme nous, au renderer du second degré
		case 'quadratic':
		case 'rational':
			return { renderer: new QuadraticEquationRenderer(), schoolLevel: 'lycee' };
		// Le niveau demandé à la génération (`college`) : chaque branche du premier
		// degré se rédige comme l'équation seule (« On soustrait 1 aux deux membres »)
		case 'absolute-value':
			return { renderer: new AbsoluteValueEquationRenderer(), schoolLevel: 'college' };
		default: {
			const unknown: never = kind;
			throw new Error(`rendererFor: type d'équation inconnu ${String(unknown)}`);
		}
	}
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
 *   « résoudre `3x+5=14` en x ». L'inconnue est x, sauf si une autre est
 *   donnée après un point-virgule (`3 = 2t ; t`) — comme `.solve`, aucune
 *   devinette (décision de David, 2026-10-06).
 * @param within - L'ensemble de la fonction résolue (lot 2 de
 *   `docs/wip/atelier-intervalle-phase0.md`) : les étapes résolvent sur ℝ, puis
 *   une dernière ne garde que les solutions de l'ensemble. Seulement pour une
 *   équation qui conclut sur des solutions isolées ; sinon, repli (`null`).
 */
export function solveSteps(argument: string, within?: Domain): SolvedSteps | null {
	try {
		// ⚠️ **On lit l'argument comme des MATHÉMATIQUES, pas comme une ligne de
		// commande.** Le moteur, lui, appliquait deux conventions de terminal qui
		// n'ont pas leur place devant un élève, et qui lui font résoudre une
		// autre équation que celle qui est écrite :
		//   • `<équation> [variable]` : `.solve 3x+5=14 x` amputait le `x` final
		//     et répondait « x = 3 », alors que `3x+5=14x` donne 5/11 (corrigé
		//     le 2026-10-06 : la variable se donne après `;`, x par défaut) ;
		//   • le retrait des options : `.solve 3-v=1` lit `-v` comme un drapeau,
		//     résout « 3 = 1 » et répond « contradictoire », alors que v = 2
		//     (toujours vrai dans le moteur).
		// Le parseur, lui, lit l'espace comme une multiplication implicite —
		// mesuré, `3x+5=14 x` donne `3x+5=14x`. C'est ce que l'élève a écrit,
		// c'est ce qu'on résout. Les étapes réparent donc ces deux défauts au
		// lieu de les propager.
		const { expression, variable: typedVariable } = splitVariableArgument(argument);
		const node = astOf(expression, 'text');
		if (node === null || node.type !== 'relation') return null;
		// La variable tapée est lue par le même parseur que l'équation
		const typed = typedVariable === null ? undefined : astOf(typedVariable, 'text');
		const variable =
			typed === undefined ? DEFAULT_VARIABLE : typed === null ? null : variableNameOf(typed);
		if (variable === null) return null;
		// Une autre lettre que l'inconnue (`b*x+5=14`, ou `3 = 2t` résolue en x) :
		// équation à paramètre, repli sur le moteur (L3)
		// `x_1` est une autre lettre que x (`variablesOf`) : une équation à paramètre
		const others = [...variablesOf(node, undefined)].filter(
			(name) => name !== variable && !CONSTANT_NAMES.has(name)
		);
		if (others.length > 0) return null;

		const relation: RelationNode = node;
		const steps =
			relation.relation === '='
				? generateEquationSteps(relation, { level: 'college', variable })
				: generateInequalitySteps(relation, { level: 'college', variable });
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

		const { renderer, schoolLevel } = rendererFor(kind);
		const rendered = renderer.renderAll(steps, { schoolLevel, verbosity: 'detailed' });

		// Sans réponse affichable, la ligne n'aurait RIEN à montrer : une zone
		// mathématique vide, et le texte du moteur jamais affiché.
		const answer = answerFor(steps[steps.length - 1], rendered[rendered.length - 1]);
		if (answer === null) return null;

		// ⚠️ **Garde-fou : la conclusion est vérifiée contre le moteur.** Mesuré
		// le 2026-10-08 — `(2x-4)=0` concluait `x = 0` (le moteur : x = 2). Une
		// conclusion que les nombres démentent n'est jamais montrée : repli.
		if (!conclusionAgrees(relation, variable, steps[steps.length - 1])) return null;

		const solutions = concludedSolutions(steps[steps.length - 1]);
		const summarized = renderer.renderAll(steps, { schoolLevel, verbosity: 'summarized' });
		const decimal = hasDecimalLiteral(relation);
		if (within !== undefined) {
			return solutions === null
				? null
				: restrictedSteps(rendered, summarized, solutions, variable, within, decimal);
		}
		const approximate =
			solutions === null
				? null
				: approximateSolutionsLatex(variable, solutions, answer.trimStart().startsWith('S'));
		// Le même calcul, rédigé sans les « pourquoi » (interrupteur du dépliage)
		const summary = summaryOf(rendered, summarized);
		const values =
			relation.relation !== '='
				? null
				: (solutions ?? solvedValue(steps[steps.length - 1].after, variable));
		return {
			steps: rendered,
			answer: values === null ? answer : shownAnswer(answer, values, variable, decimal),
			...(summary !== undefined && { summary }),
			...(approximate !== null && { approximate })
		};
	} catch {
		// Degré ≥ 3, non-polynomial, coefficients paramétriques, inconnue
		// introuvable (`b*x+5=14` → « cannot detect a single variable », une
		// `Error` nue qu'on ne peut pas distinguer par son type), ou un renderer
		// qui refuse ce qu'on lui donne.
		return null;
	}
}

/**
 * La valeur d'une forme résolue `x = valeur` (premier degré, sans étape de
 * conclusion), ou `null`.
 */
function solvedValue(after: MathNode, variable: string): readonly MathNode[] | null {
	if (after.type !== 'relation' || after.relation !== '=') return null;
	if (after.left.type !== 'variable' || after.left.name !== variable) return null;
	return getVariables(after.right).size === 0 ? [after.right] : null;
}

/**
 * La ligne de réponse écrite depuis les valeurs (lot 5c, Q26) : chaque solution
 * passe par la valeur exacte à afficher commune — `−√2/2`, `(1 − √5)/2`, et le
 * registre décimal de l'équation (`2x = 0,6` → `x = 0,3`). La forme (`x = …`
 * ou `S = {…}`) est celle de la conclusion ; les étapes gardent leur écriture
 * (lot 5f).
 */
function shownAnswer(
	answer: string,
	values: readonly MathNode[],
	variable: string,
	decimal: boolean
): string {
	if (values.length === 0) return answer;
	return solutionsLine(values, variable, decimal, answer.trimStart().startsWith('S'));
}

/** `S = ∅`, `x = …` ou `S = {… ; …}`, chaque valeur écrite pour être lue. */
function solutionsLine(
	values: readonly MathNode[],
	variable: string,
	decimal: boolean,
	asSet: boolean
): string {
	if (values.length === 0) return 'S = \\emptyset';
	const written = values.map((value) => toLatex(exactValueToShow(value, { decimal })));
	if (written.length === 1 && !asSet) return `${variable} = ${written[0]}`;
	return `S = \\left\\{ ${written.join(' \\,;\\, ')} \\right\\}`;
}

/**
 * Les étapes sur ℝ, puis celle qui ne garde que les solutions de l'ensemble
 * (`x = 2` pour x² = 4 sur [0 ; +∞[). La réponse est celle de cette étape.
 */
function restrictedSteps(
	rendered: readonly RenderedStep[],
	summarized: readonly RenderedStep[],
	solutions: readonly MathNode[],
	variable: string,
	within: Domain,
	decimal: boolean
): SolvedSteps | null {
	const kept: MathNode[] = [];
	for (const solution of solutions) {
		const value = numericValueOf(solution);
		if (value === null) return null;
		if (containsValue(within, value)) kept.push(solution);
	}
	const answer = solutionsLine(kept, variable, decimal, false);
	const last = (steps: readonly RenderedStep[]): RenderedStep => ({
		id: steps.length,
		rule: 'keep-in-interval',
		title: `On ne garde que les solutions qui sont dans ${intervalText(within)}`,
		expressionLatex: answer
	});
	const detailed = [...rendered, last(rendered)];
	const summary = summaryOf(detailed, [...summarized, last(summarized)]);
	const approximate = approximateSolutionsLatex(variable, kept, kept.length > 1);
	return {
		steps: detailed,
		answer,
		...(summary !== undefined && { summary }),
		...(approximate !== null && { approximate })
	};
}

/** La valeur décimale d'une solution, ou `null`. */
function numericValueOf(node: MathNode): number | null {
	const result = evaluate(node, { mode: 'decimal' });
	return result.status === 'value' &&
		typeof result.value === 'number' &&
		Number.isFinite(result.value)
		? result.value
		: null;
}
