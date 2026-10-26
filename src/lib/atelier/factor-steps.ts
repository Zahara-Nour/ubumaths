/**
 * Atelier — la factorisation expliquée
 *
 * ⚠️ **Il n'y a pas de commande de factorisation dans le moteur.** Mesuré : les
 * 34 commandes du registre ne contiennent ni `factor` ni `expand`. L'intention
 * `factoriser` de `pedagogical-simplify` n'était donc atteignable depuis aucune
 * interface — la règle de mise en facteur commun ajoutée en #372 était du code
 * mort de fait, et `.simplifier` ne peut pas la réveiller : il travaille en
 * intention `auto`, qui ne factorise rien (`x² - 4` y reste `x² - 4`, et c'est
 * voulu — « simplifier » ne dit pas « factoriser »).
 *
 * ⚠️ **Et sans moteur, il n'y a pas de repli.** Là où `.simplifier` garde la
 * sortie du moteur quand le module ne sait rien dire, `.factoriser` n'a que ce
 * que le module lui donne. Le cas « je n'ai pas su » doit donc se DIRE : rendre
 * l'entrée inchangée ferait passer `3x + 6` pour une forme factorisée.
 *
 * @module atelier/factor-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import { generatePedagogicalSimplifySteps } from '$lib/mathAST/pedagogical-simplify/pipeline';
import { PedagogicalSimplifyRenderer } from '$lib/mathAST/pedagogical-simplify/renderer';
import { toLatex } from '$lib/mathAST/latex-generator';
import { toCustom } from '$lib/mathAST/custom-generator';
import { astOf } from './parse';
import { summaryOf } from './steps-summary';
import { domainAlternative, keepingDomain, type DomainAlternative } from './domain-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Ce qu'une demande de factorisation produit.
 *
 * Trois issues, et non « un résultat ou `null` » : sans moteur derrière, c'est
 * ici que se décide ce que l'élève lira. Les distinguer oblige à écrire les
 * trois phrases, au lieu de laisser une ligne vide tenir lieu de réponse.
 */
export type FactoredOutcome =
	/** Le module a factorisé : la réponse et son raisonnement. */
	| {
			readonly kind: 'factorisee';
			readonly steps: readonly RenderedStep[];
			/** Les mêmes étapes en version résumée, absente si elle ne dit rien de moins. */
			readonly summary?: readonly RenderedStep[];
			/** La forme factorisée en LaTeX — ce que la ligne affiche. */
			readonly answer: string;
			/** La même en syntaxe texte, pour le cas où le LaTeX ne se compose pas. */
			readonly text: string;
			/** Le calcul qui change le domaine, derrière le bouton de la ligne (tidy-conditions). */
			readonly alternative?: DomainAlternative;
	  }
	/** Rien n'a bougé : ce n'est pas une erreur, c'est une réponse. */
	| {
			readonly kind: 'inchangee';
			readonly message: string;
			readonly alternative?: DomainAlternative;
	  }
	/** La demande elle-même ne tient pas : l'atelier refuse. */
	| { readonly kind: 'illisible'; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Retirer les parenthèses qui enveloppent toute l'expression.
 *
 * ⚠️ Mesuré : `.factoriser f(x)` rendait `\\left( \\left( x + 2 \\right)
 * \\left( x - 2 \\right) \\right)` — une paire de parenthèses en trop autour
 * de toute la réponse. La substitution des noms (§6 bis) écrit `(x^2-4)` avec
 * ses parenthèses, **nécessaires** pour que l'expression se relise
 * correctement ; mais là où dériver ou réduire remplacent le nœud racine et
 * emportent l'enveloppe avec lui, factoriser la laisse en place.
 *
 * On ne touche qu'aux parenthèses de GROUPEMENT : `[0;1]` est un intervalle,
 * et le dépouiller changerait le sens.
 */
function unwrapGrouping(node: MathNode): MathNode {
	if (node.type !== 'delimiter') return node;
	if (node.semantic !== undefined && node.semantic !== 'grouping') return node;
	return unwrapGrouping(node.content);
}

/**
 * Cette expression est-elle une somme ?
 *
 * C'est la seule forme qu'on cherche à factoriser : dire « je ne sais pas
 * factoriser » devant `(x+1)(x-1)` serait faux, il n'y a simplement rien à y
 * faire. Les parenthèses de tête sont traversées — `(a + b)` est une somme.
 */
function isSum(node: MathNode): boolean {
	if (node.type === 'delimiter') return isSum(node.content);
	return node.type === 'addition' || node.type === 'subtraction';
}

/** La forme texte d'un arbre, ou sa forme LaTeX si le générateur refuse. */
function plainFormOf(node: MathNode, latex: string): string {
	try {
		return toCustom(node);
	} catch {
		return latex;
	}
}

/** Les étapes rendues et leur résumé, pour le bouton de la ligne. */
function renderedSteps(steps: Parameters<PedagogicalSimplifyRenderer['renderAll']>[0]): {
	steps: readonly RenderedStep[];
	summary?: readonly RenderedStep[];
} {
	const renderer = new PedagogicalSimplifyRenderer();
	const detailed = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
	const summary = summaryOf(
		detailed,
		renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'summarized' })
	);
	return { steps: detailed, ...(summary !== undefined && { summary }) };
}

/**
 * Factoriser une expression, et dire ce qui s'est passé.
 *
 * ⚠️ Aucun chemin ne jette — une exception remonterait jusqu'à `desk.submit`,
 * qui n'afficherait alors AUCUNE ligne.
 *
 * @param expression - L'expression, noms d'objets DÉJÀ substitués (§6 bis)
 */
export function factorSteps(expression: string): FactoredOutcome {
	const written = expression.trim();

	try {
		const parsed = astOf(expression, 'text');
		if (parsed === null) {
			return { kind: 'illisible', message: `« ${written} » n'est pas une expression valide.` };
		}
		const node = unwrapGrouping(parsed);

		const full = generatePedagogicalSimplifySteps(node, {
			intent: 'factoriser',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		// Le domaine est gardé (David, 2026-10-26) : `x/x` n'a rien à factoriser,
		// la simplification par x passe par le bouton, avec sa condition
		const { kept: result, lost, narrows } = keepingDomain(node, full);
		const alternative =
			lost === null || lost.length === 0 || full.steps.length === 0
				? undefined
				: domainAlternative(full.result, lost, renderedSteps(full.steps), narrows);
		const withAlternative = alternative === undefined ? {} : { alternative };

		const latex = toLatex(result.result);
		const plain = plainFormOf(result.result, latex);

		if (result.steps.length === 0 || latex.trim() === '') {
			// ⚠️ Deux silences très différents, et l'élève a besoin de savoir
			// lequel il a devant lui. `(x+1)(x-1)` n'a rien à factoriser ;
			// `x^2 + 1` est une somme qu'aucune stratégie ne factorise. On dit
			// alors « je ne sais pas », jamais « ne se factorise pas » : le
			// module ne le prouve pas (ADR 0024).
			return isSum(result.result)
				? {
						kind: 'inchangee',
						message: `Je ne sais pas factoriser « ${plain} ».`,
						...withAlternative
					}
				: {
						kind: 'inchangee',
						message: `« ${plain} » n’est pas une somme : il n’y a rien à factoriser.`,
						...withAlternative
					};
		}

		const renderer = new PedagogicalSimplifyRenderer();
		const steps = renderer.renderAll(result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		if (steps.length === 0) {
			return { kind: 'inchangee', message: `Je ne sais pas factoriser « ${plain} ».` };
		}
		// Le même calcul, rédigé sans les « pourquoi » (interrupteur du dépliage)
		const summary = summaryOf(
			steps,
			renderer.renderAll(result.steps, { schoolLevel: 'lycee', verbosity: 'summarized' })
		);

		return {
			kind: 'factorisee',
			steps,
			answer: latex,
			text: plain,
			...(summary !== undefined && { summary }),
			...withAlternative
		};
	} catch {
		// `PedagogicalSimplifyNotImplemented` (inéquation, matrice…), ou un
		// générateur qui refuse ce qu'on lui donne.
		return {
			kind: 'illisible',
			message: `« ${written} » n’est pas une expression qu’on sait factoriser.`
		};
	}
}
