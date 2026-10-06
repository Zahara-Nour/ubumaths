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
	PedagogicalDifferentiationRenderer,
	withTidyStep
} from '$lib/mathAST/pedagogical-differentiation';
import { defaultVariable } from '$lib/mathAST/cli/core/variable-argument';
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
 * @param variable - La variable donnée après la virgule (`.dériver t^2, t`).
 *   Sans elle : `x` pour un objet nommé ; sinon la même règle que `.diff`
 *   (`x` si elle apparaît, sinon la seule variable libre) — et `null` (repli
 *   sur le moteur, qui demande laquelle) s'il y en a plusieurs. ⚠️ Avec un
 *   `x` codé en dur, `.dériver t^3` répondait `0`.
 */
export function deriveSteps(
	expression: string,
	name?: string,
	variable?: string
): DerivedSteps | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;

		// Un objet nommé est une fonction de l'atelier, donc en x (sa réponse
		// s'écrit d'ailleurs `f'(x) = …`)
		const given = variable ?? (name === undefined ? undefined : 'x');
		const found = given === undefined ? defaultVariable(node) : null;
		if (found !== null && !found.ok) return null;
		const derivationVariable = found !== null && found.ok ? found.variable : (given ?? 'x');

		const result = generatePedagogicalDifferentiationSteps(node, {
			variable: derivationVariable,
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (result.steps.length === 0) return null;

		const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (steps.length === 0) return null;

		// La dérivée MISE AU PROPRE (`tidyTerms`) : si elle change l'écriture de
		// la dérivée brute (`3 \cdot 3x^2`, retour de David), c'est une étape de
		// plus — la réponse ne tombe pas du ciel. Étape partagée avec les
		// corrections de questions (`pedagogical-differentiation/tidy-step.ts`).
		const { steps: allSteps, derivativeLatex: derivative } = withTidyStep(steps, result.derivative);
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
