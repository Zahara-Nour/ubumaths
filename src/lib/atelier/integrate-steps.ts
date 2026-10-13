/**
 * Atelier — l'intégration expliquée (« Comment ? » de `.intégrer`)
 *
 * La réponse de la ligne vient du moteur `integration` (via
 * `integrate.command.ts`) et ne change pas. Ce module y ajoute les étapes de
 * `pedagogical-integration`, mais SEULEMENT quand elles disent vrai — un
 * affichage faux est pire que pas d'étapes (même règle que `solve-steps`).
 *
 * Mesuré en phase 0 (2026-10-13), trois sortes de rédactions :
 * - **justes** : polynômes, eˣ, 1/x, cos/sin, IPP, éléments simples ;
 * - **trompeuses** : une composée dont l'intégrande n'est pas exactement
 *   u′·f(u) — `e^{2x}` rend « ½e^{2x} » sous le titre « u′e^u → e^u », sans
 *   dire d'où vient le ½ ;
 * - **discordantes** : `\ln x` de 0 à 1, que les étapes refusent (valeur
 *   interdite 0) alors que le moteur répond −1 (intégrale impropre).
 * Décision de David : montrer les justes, refuser (`null`) tout le reste.
 *
 * @module atelier/integrate-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import {
	generatePedagogicalIntegrationSteps,
	PedagogicalIntegrationRenderer,
	type PedagogicalDefiniteIntegrationResult,
	type PedagogicalIntegrationStep
} from '$lib/mathAST/pedagogical-integration';
import { DEFAULT_VARIABLE } from '$lib/mathAST/cli/core/variable-argument';
import { astOf } from './parse';
import { summaryOf } from './steps-summary';
import {
	citesForbiddenPoint,
	hasUnexplainedCoefficient,
	isNumericBound,
	primitivesAgree,
	valuesAgree
} from './integrate-steps-check';

// =============================================================================
// Types
// =============================================================================

/** Ce que lit `.intégrer` : l'expression, la variable tapée, les bornes. */
export interface IntegralArguments {
	readonly expression: string;
	readonly variable: string | null;
	readonly bounds: { readonly lower: string; readonly upper: string } | null;
}

/**
 * Les étapes à déplier sous la ligne. Pas de réponse : celle de la ligne est
 * celle du moteur, que les étapes ont été vérifiées confirmer.
 */
export interface IntegratedSteps {
	/** Les étapes rendues, prêtes pour `GeneratedStepsCorrection`. */
	readonly steps: readonly RenderedStep[];
	/** Les mêmes étapes en version résumée, absente si elle ne dit rien de moins. */
	readonly summary?: readonly RenderedStep[];
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Les étapes d'une intégration — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** La ligne garde alors la
 * réponse du moteur, sans « Comment ? ». Aucun chemin ne jette : le `try`
 * couvre la génération ET le rendu.
 *
 * @param args - Les arguments de la commande, noms d'objets DÉJÀ substitués.
 * @param engineAnswer - La réponse du moteur : la primitive (sans `+ C`), ou la
 *   valeur de l'intégrale définie. Les étapes doivent la confirmer.
 */
export function integrateSteps(
	args: IntegralArguments,
	engineAnswer: MathNode
): IntegratedSteps | null {
	try {
		const read = readArguments(args);
		if (read === null) return null;
		const { integrand, variable, definite } = read;

		const result: PedagogicalDefiniteIntegrationResult = generatePedagogicalIntegrationSteps(
			integrand,
			{ level: 'lycee', variable, ...(definite !== undefined && { definite }) }
		);
		if (!agreesWithEngine(result, definite !== undefined, engineAnswer, variable)) return null;
		if (hasUnexplainedCoefficient(result.steps)) return null;
		return rendered(result.steps);
	} catch {
		// `PedagogicalIntegrationNotImplemented` (`\frac{1}{x^2}`), plusieurs
		// variables, renderer qui refuse : repli sur la réponse du moteur
		return null;
	}
}

/**
 * Les étapes d'un REFUS du moteur (`INTEGRAL_UNDEFINED` : pôle dans [a ; b])
 * — ou `null`.
 *
 * Le refus garde le message du moteur ; ces étapes disent pourquoi
 * (« f n'est pas définie en x = 0, qui appartient à [−1 ; 1] »). Montrées
 * seulement quand elles concordent avec le refus (décision de David,
 * 2026-10-13) :
 * - elles concluent « non définie » (`undefinedAt`), par l'étape
 *   `integrand-undefined-on-interval`, qui cite la même valeur ;
 * - cette valeur est vraiment interdite et dans [a ; b] (`citesForbiddenPoint`,
 *   recalculé ici, sans faire confiance au pipeline).
 * Une intégrale que les étapes calculent alors que le moteur refuse : `null`.
 */
export function integrateRefusalSteps(args: IntegralArguments): IntegratedSteps | null {
	try {
		const read = readArguments(args);
		if (read === null || read.definite === undefined) return null;
		const { integrand, variable, definite } = read;

		const result = generatePedagogicalIntegrationSteps(integrand, {
			level: 'lycee',
			variable,
			definite
		});
		const point = result.undefinedAt;
		if (point === undefined) return null;
		const last = result.steps[result.steps.length - 1];
		const cited = last?.bindings?.point;
		if (last?.rule !== 'integrand-undefined-on-interval' || cited === undefined) return null;
		if (!valuesAgree(cited, point)) return null;
		if (!citesForbiddenPoint(integrand, variable, point, definite.lower, definite.upper)) {
			return null;
		}
		return rendered(result.steps);
	} catch {
		return null;
	}
}

// =============================================================================
// Lecture et rendu
// =============================================================================

interface ReadArguments {
	readonly integrand: MathNode;
	readonly variable: string;
	readonly definite?: { readonly lower: MathNode; readonly upper: MathNode };
}

/** L'intégrande, la variable et les bornes en arbres — `null` si illisibles. */
function readArguments(args: IntegralArguments): ReadArguments | null {
	const integrand = astOf(args.expression, 'text');
	if (integrand === null) return null;
	const typed = args.variable === null ? null : astOf(args.variable, 'text');
	if (args.variable !== null && typed?.type !== 'variable') return null;
	const variable = typed?.type === 'variable' ? typed.name : DEFAULT_VARIABLE;
	if (args.bounds === null) return { integrand, variable };

	// Bornes : deux nombres, sinon pas d'étapes (`de 0 à a` : les étapes ne
	// calculent rien, mesuré en phase 0)
	const lower = astOf(args.bounds.lower, 'text');
	const upper = astOf(args.bounds.upper, 'text');
	if (lower === null || upper === null) return null;
	if (!isNumericBound(lower) || !isNumericBound(upper)) return null;
	return { integrand, variable, definite: { lower, upper } };
}

/** Les étapes rendues, et leur résumé quand il dit quelque chose de moins. */
function rendered(raw: readonly PedagogicalIntegrationStep[]): IntegratedSteps | null {
	const renderer = new PedagogicalIntegrationRenderer();
	const steps = renderer.renderAll(raw, { schoolLevel: 'lycee', verbosity: 'detailed' });
	if (steps.length === 0) return null;
	const summarized = renderer.renderAll(raw, { schoolLevel: 'lycee', verbosity: 'summarized' });
	const summary = summaryOf(steps, summarized);
	return { steps, ...(summary !== undefined && { summary }) };
}

/**
 * Les étapes concluent-elles ce que dit le moteur ?
 *
 * ⚠️ Un refus rédigé (`undefinedAt` : valeur interdite dans [a ; b]) alors que
 * le moteur a une valeur, c'est un désaccord : `\ln x` de 0 à 1 vaut −1.
 */
function agreesWithEngine(
	result: PedagogicalDefiniteIntegrationResult,
	definite: boolean,
	engineAnswer: MathNode,
	variable: string
): boolean {
	if (result.undefinedAt !== undefined) return false;
	if (definite) {
		return result.value !== undefined && valuesAgree(result.value, engineAnswer);
	}
	return (
		result.antiderivative !== undefined &&
		primitivesAgree(result.antiderivative, engineAnswer, variable)
	);
}
