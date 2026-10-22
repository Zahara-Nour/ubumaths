/**
 * Pedagogical Simplify — développer : de l'expression aux étapes montrées
 *
 * **Une intention, une seule rédaction** (décision de David du 2026-10-14,
 * option B). Tout chemin qui MONTRE à un élève les étapes de l'intention
 * `developper` passe par `explainExpansion` : le « Comment ? » de
 * `.développer` dans l'atelier (`atelier/expand.ts`), les corrections
 * d'exercices générées (`generatedSteps` `kind: 'simplify'`,
 * `intent: 'developper'`, `questions/generator/correction-generator.ts`), la
 * démo du module (`demo-helpers.ts`).
 *
 * La trace de `generatePedagogicalSimplifySteps` n'est montrée nulle part —
 * mesuré le 2026-10-14 : produits collés (`2 x 1` s'affiche « 2x1 »), la même
 * ligne jusqu'à 13 fois, distribution cachée sous « On regroupe les termes
 * semblables ». Seul son RÉSULTAT sert, ici comme à l'intégration et à la
 * stratégie 6 de `factoriser`, et il ne change pas.
 *
 * Le chemin : résultat du pipeline → ordre du manuel (`orderExpanded`) →
 * décimaux → rédaction (`writeExpandSteps`) → rendu, détaillé et résumé.
 *
 * Les décimaux suivent l'écriture (décision de David du 2026-10-06 pour
 * `.limite`, étendue à `.développer` le 2026-10-14) : un décimal écrit dans
 * l'expression donne des décimaux (`(0,5x+1)²` → `0,25x² + x + 1`), sinon des
 * fractions ; l'atelier y ajoute son mode décimal (`decimal: true`). Pour un
 * exercice, l'expression de l'énoncé décide.
 *
 * @module mathAST/pedagogical-simplify/expand-explained
 */

import type { MathNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import { mapNode } from '../transforms';
import { nodesEqual } from '../normal/hash';
import { hasDecimalLiteral } from '../tidy/decimal';
import { generatePedagogicalSimplifySteps } from './pipeline';
import { PedagogicalSimplifyRenderer } from './renderer';
import { orderExpanded } from './expand-order';
import { writeExpandSteps, type ExpandSteps } from './expand-steps';
import {
	decimalFraction,
	hasUnfinishedArithmetic,
	unwrapGrouping,
	withExplicitMinusOne,
	withoutGrouping
} from './expand-format';
import type { PedagogicalSimplifyOptions } from './types';

// =============================================================================
// Types
// =============================================================================

/** Les options d'un développement expliqué. */
export interface ExplainExpansionOptions {
	/** Le niveau : celui du pipeline (le résultat en dépend) et du vocabulaire du rendu. */
	readonly schoolLevel: SchoolLevel;
	/** Des décimaux même sans décimal écrit : le mode décimal de l'atelier. */
	readonly decimal?: boolean;
	/** Les options du pipeline qu'un modèle d'exercice peut fixer, transmises telles quelles. */
	readonly pipeline?: Pick<
		PedagogicalSimplifyOptions,
		'variable' | 'enableTrig' | 'enableLogExp' | 'enableAbs'
	>;
}

/** La rédaction, brute et rendue dans ses deux versions. */
export interface ExpansionSteps {
	/** Les étapes brutes (`globalBefore`/`globalAfter` : la démo en syntaxe texte). */
	readonly raw: ExpandSteps;
	/** `raw.steps` rendues en `detailed` : lignes à × et « pourquoi ». */
	readonly detailed: readonly RenderedStep[];
	/** `raw.summary` rendues en `summarized` : sans lignes à × ni « pourquoi ». */
	readonly summarized: readonly RenderedStep[];
}

/** Ce que produit un développement expliqué — trois issues. */
export type ExplainedExpansion =
	| {
			readonly kind: 'expanded';
			/** La réponse développée, réduite, ordonnée, décimaux écrits : la dernière image. */
			readonly answer: MathNode;
			/** Les étapes, `null` quand on ne sait pas les rédiger (la réponse reste). */
			readonly steps: ExpansionSteps | null;
	  }
	/** Rien n'a bougé : il n'y a rien à développer. */
	| { readonly kind: 'unchanged' }
	/** Le pipeline n'a pas su finir (`2 x 1`, `1^2`) : ni réponse ni étapes. */
	| { readonly kind: 'unfinished' };

export { unwrapGrouping } from './expand-format';

// =============================================================================
// Fonctions — lecture
// =============================================================================

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Développer et réduire une expression, et rédiger comment — comme au tableau.
 *
 * Les exceptions du pipeline (`PedagogicalSimplifyNotImplemented` : matrice,
 * inéquation…) remontent à l'appelant, qui sait comment se replier.
 *
 * @param node - Une expression (pas une relation : on développe une expression)
 * @param options - Le niveau, le mode décimal de l'atelier, les options d'un modèle
 */
export function explainExpansion(
	node: MathNode,
	options: ExplainExpansionOptions
): ExplainedExpansion {
	const start = unwrapGrouping(node);
	const result = generatePedagogicalSimplifySteps(withExplicitMinusOne(start), {
		...options.pipeline,
		intent: 'developper',
		schoolLevel: options.schoolLevel,
		verbosity: 'detailed'
	});
	// Rien n'a bougé : aucune étape, ou des étapes qui rendent l'expression de
	// départ (`1/(x+1)` : « On réduit la fraction », sans rien réduire)
	if (
		result.steps.length === 0 ||
		nodesEqual(withoutGrouping(result.result), withoutGrouping(start))
	) {
		return { kind: 'unchanged' };
	}

	// L'ordre du manuel (tableau B de la phase 0) : celui de la réponse ET des étapes
	const ordered = orderExpanded(result.result);
	const decimal = options.decimal === true || hasDecimalLiteral(start);
	const format = (image: MathNode) => (decimal ? mapNode(image, decimalFraction) : image);
	const answer = format(ordered);
	// Jamais une réponse mal écrite : « je ne sais pas » vaut mieux que `2 x 1`
	if (hasUnfinishedArithmetic(answer)) return { kind: 'unfinished' };

	// Les étapes reçoivent la réponse et sa mise en forme : leur dernière image
	// s'écrit exactement comme la réponse
	const raw = writeExpandSteps(start, ordered, { format });
	if (raw === null) return { kind: 'expanded', answer, steps: null };
	const renderer = new PedagogicalSimplifyRenderer();
	const { schoolLevel } = options;
	return {
		kind: 'expanded',
		answer,
		steps: {
			raw,
			detailed: renderer.renderAll(raw.steps, { schoolLevel, verbosity: 'detailed' }),
			summarized: renderer.renderAll(raw.summary, { schoolLevel, verbosity: 'summarized' })
		}
	};
}
