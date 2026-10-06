/**
 * Atelier — la dérivation expliquée
 *
 * « Dériver » passait par `.diff`, qui rend la notation d'un terminal :
 * `d/dx(x^2*sin(x)) = 2xsin(x)+x^2cos(x)`, avec un `:/` parasite sur les
 * quotients et des accolades là où on attend une fraction. Et aucune règle
 * nommée : le résultat tombait du ciel.
 *
 * `pedagogical-differentiation` dit « Règle du produit, avec u = x² et
 * v = sin(x) », et détaille chaque facteur en sous-étape.
 *
 * @module atelier/derive-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import {
	generatePedagogicalDifferentiationSteps,
	PedagogicalDifferentiationRenderer,
	type PedagogicalDifferentiationStep,
	withTidyStep
} from '$lib/mathAST/pedagogical-differentiation';
import {
	DEFAULT_VARIABLE,
	indexVariables,
	variableNameOf
} from '$lib/mathAST/cli/core/variable-argument';
import { astOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/**
 * Ce qu'une dérivation donne à afficher : la réponse pour la ligne, les étapes
 * pour le dépliage.
 *
 * Les deux sont produits ENSEMBLE, à partir du même calcul : une `answer`
 * obtenue ailleurs pourrait décrire autre chose que ce que les étapes
 * démontrent.
 */
export interface DerivedSteps {
	/** Les étapes rendues, prêtes pour `GeneratedStepsCorrection`. */
	readonly steps: readonly RenderedStep[];
	/** La réponse en LaTeX, jamais vide — la ligne d'historique l'affiche. */
	readonly answer: string;
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Les étapes de dérivation d'une expression — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors la
 * sortie du moteur. Aucun chemin ne jette — une exception remonterait jusqu'à
 * `desk.submit` ou `desk.runFromPanel`, qui n'afficheraient alors AUCUNE ligne.
 *
 * @param expression - L'expression, noms d'objets DÉJÀ substitués (§6 bis)
 * @param name - Le nom de l'objet, quand il y en a un : la réponse s'écrit
 *   alors `f'(x) = …`. Sans lui — commande tapée à la main — la dérivée est
 *   rendue seule, puisqu'il n'y a rien à nommer.
 * @param variable - La variable donnée après le point-virgule (`.dériver t^2 ; t`).
 *   Sans elle : `x`, comme `.diff` — aucune devinette (décision de David,
 *   2026-10-06) : `.dériver t^3` répond `0`, et la ligne indique comment
 *   choisir t (`variableHintOf`, côté `calcul.ts`).
 */
export function deriveSteps(
	expression: string,
	name?: string,
	variable?: string
): DerivedSteps | null {
	try {
		const parsed = astOf(expression, 'text');
		if (parsed === null) return null;
		// Variables indicées (`x_1`) réécrites en variables simples, nommées par
		// leur LaTeX : la dérivation traite un indice en constante. Les étapes
		// sont rendues en LaTeX, où le nom s'écrit comme l'indice d'origine.
		const indexed = indexVariables(parsed);
		const node = indexed.node;

		// La variable tapée est lue par le même parseur que l'expression (`x_1`)
		const typedVariable = variable === undefined ? undefined : astOf(variable, 'text');
		const explicit =
			typedVariable === undefined
				? undefined
				: typedVariable === null
					? null
					: variableNameOf(typedVariable);
		if (explicit === null) return null;

		// Sans variable donnée : x (un objet nommé est d'ailleurs une fonction
		// de l'atelier, en x — sa réponse s'écrit `f'(x) = …`)
		const derivationVariable = explicit ?? DEFAULT_VARIABLE;

		const result = generatePedagogicalDifferentiationSteps(node, {
			variable: derivationVariable,
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (result.steps.length === 0) return null;

		const steps = new PedagogicalDifferentiationRenderer().renderAll(
			result.steps.map((step) => restoreStep(step, indexed.restore)),
			{
				schoolLevel: 'lycee',
				verbosity: 'detailed'
			}
		);
		if (steps.length === 0) return null;

		// La dérivée MISE AU PROPRE (`tidyTerms`) : si elle change l'écriture de
		// la dérivée brute (`3 \cdot 3x^2`, retour de David), c'est une étape de
		// plus — la réponse ne tombe pas du ciel. Étape partagée avec les
		// corrections de questions (`pedagogical-differentiation/tidy-step.ts`).
		const { steps: allSteps, derivativeLatex: derivative } = withTidyStep(
			steps,
			indexed.restore(result.derivative)
		);
		if (derivative.trim() === '') return null;

		return {
			steps: allSteps,
			answer: name === undefined ? derivative : `${name}'(x) = ${derivative}`
		};
	} catch {
		// `PedagogicalDifferentiationNotImplemented` (valeur absolue, par
		// exemple), expression illisible, ou un renderer qui refuse ce qu'on lui
		// donne.
		return null;
	}
}

/**
 * Une étape dont les variables indicées réécrites (`indexVariables`) sont
 * rendues à leur forme d'origine : sans ça, `x_1` s'afficherait
 * `\mathit{x_1}`.
 */
function restoreStep(
	step: PedagogicalDifferentiationStep,
	restore: (node: MathNode) => MathNode
): PedagogicalDifferentiationStep {
	return {
		...step,
		before: restore(step.before),
		after: restore(step.after),
		...(step.globalBefore && { globalBefore: restore(step.globalBefore) }),
		...(step.globalAfter && { globalAfter: restore(step.globalAfter) }),
		...(step.bindings && {
			bindings: Object.fromEntries(
				Object.entries(step.bindings).map(([key, node]) => [key, restore(node)])
			)
		}),
		...(step.subSteps && { subSteps: step.subSteps.map((sub) => restoreStep(sub, restore)) })
	};
}
