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
import {
	generatePedagogicalDifferentiationSteps,
	PedagogicalDifferentiationRenderer
} from '$lib/mathAST/pedagogical-differentiation';
import { toLatex } from '$lib/mathAST/latex-generator';
import { nodeCount, tidyTerms, withExplicitNumberProducts } from './tidy-terms';
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
 */
export function deriveSteps(expression: string, name?: string): DerivedSteps | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;

		const result = generatePedagogicalDifferentiationSteps(node, {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (result.steps.length === 0) return null;

		const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (steps.length === 0) return null;

		// La dérivée MISE AU PROPRE : la règle de dérivation laisse `3 \cdot 3x^2`
		// (retour de David). Si `tidy` a quelque chose à faire, c'est une étape de
		// plus — la réponse ne tombe pas du ciel.
		// Le membre de gauche avec un × entre deux nombres : `3 3 x^2` se lisait
		// « 33x² » (revue). L'étape n'apparaît que si la forme se SIMPLIFIE (moins
		// de nœuds), pas pour un simple déplacement de facteurs.
		const tidied = tidyTerms(result.derivative);
		const raw = toLatex(withExplicitNumberProducts(result.derivative));
		const derivative = toLatex(tidied);
		if (derivative.trim() === '') return null;
		const allSteps: readonly RenderedStep[] =
			nodeCount(tidied) >= nodeCount(result.derivative) || derivative === toLatex(result.derivative)
				? steps
				: [
						...steps,
						{
							id: steps.length + 1,
							rule: 'simplify',
							title: 'On simplifie',
							explanation: 'On calcule les produits et on regroupe les termes.',
							expressionLatex: `${raw} = ${derivative}`
						}
					];

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
