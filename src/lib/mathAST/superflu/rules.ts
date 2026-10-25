/**
 * Registre des règles de superflu
 * ===============================
 *
 * Une fiche par règle d'écriture superflue : identifiant de contrainte, libellé
 * (éditeur de modèles), message à l'élève et, pour les règles jugées sur l'arbre,
 * la transformation qui retire le superflu. Le juge (`buildASTPipeline`), la liste
 * des contraintes réglables, les libellés, les messages et le schéma Zod des
 * modèles lisent ce registre : ajouter une règle, c'est ajouter une fiche.
 *
 * L'ordre compte : `zeros` et `spaces` se jugent sur la chaîne tapée, avant
 * l'analyse ; les règles sur l'arbre s'appliquent dans l'ordre du registre.
 *
 * Chantier : docs/archive/wip/simplify-carte-progress.md § 46-47.
 *
 * @module mathAST/superflu/rules
 */

import type { MathNode } from '../types';
import { stripUnnecessaryBrackets, removeNullTermsAST } from '../transforms';
import {
	reduceRadicalsAST,
	reduceFractionsAST,
	simplifyNullProductsAST,
	removeSignsAST,
	removeFactorsOneAST,
	removeMultOperatorAST
} from './transforms';

/** Réglages du juge qui changent une transformation */
export interface SuperfluOptions {
	/** `(-5)+3` garde ses parenthèses (`allowBracketsInFirstNegativeTerm`) */
	allowFirstNegative?: boolean;
}

/** Message à l'élève, selon que la question attend une réponse ou plusieurs */
export interface SuperfluFeedback {
	single: string;
	multiple: string;
}

interface SuperfluRule<Id extends string> {
	id: Id;
	label: string;
	feedback: SuperfluFeedback;
	/** Absente pour une règle jugée sur la chaîne tapée (`zeros`, `spaces`) */
	transform?: (ast: MathNode, options: SuperfluOptions) => MathNode;
}

function sameFeedback(message: string): SuperfluFeedback {
	return { single: message, multiple: message };
}

export const SUPERFLU_RULES = [
	// Sur la chaîne tapée (`cosmeticViolations`, avant l'analyse)
	{
		id: 'zeros',
		label: 'Zéros inutiles',
		feedback: sameFeedback('Il y a un ou des zéros inutiles.')
	},
	{
		id: 'spaces',
		label: 'Espaces',
		feedback: sameFeedback('Les chiffres sont mal espacés.')
	},
	// Sur l'arbre, dans l'ordre d'application
	{
		// Racine carrée à facteur carré (√12 pour 2√3), décision du 2026-10-04
		id: 'reducedRadicals',
		label: 'Racines simplifiées',
		feedback: {
			single: 'La racine peut être simplifiée.',
			multiple: 'Une ou plusieurs racines peuvent être simplifiées.'
		},
		transform: reduceRadicalsAST
	},
	{
		id: 'reducedFractions',
		label: 'Fractions irréductibles',
		feedback: {
			single: 'La fraction peut être simplifiée.',
			multiple: 'Une ou plusieurs fractions peuvent être simplifiées.'
		},
		transform: reduceFractionsAST
	},
	{
		id: 'factorZero',
		label: 'Facteur 0 (0 * x)',
		feedback: sameFeedback('Une multiplication par 0 peut être simplifiée en 0.'),
		transform: simplifyNullProductsAST
	},
	{
		id: 'nullTerms',
		label: 'Termes nuls (x + 0)',
		feedback: sameFeedback('Il y a des termes nuls (comme +0) qui peuvent être supprimés.'),
		transform: removeNullTermsAST
	},
	{
		id: 'brackets',
		label: 'Parenthèses',
		feedback: sameFeedback('Il y a des parenthèses inutiles.'),
		transform: (ast, options) =>
			stripUnnecessaryBrackets(ast, { allowFirstNegative: options.allowFirstNegative })
	},
	{
		id: 'signs',
		label: 'Signes (-- = +)',
		feedback: sameFeedback('Il y a des signes superflus (comme ++, --, ou +x).'),
		transform: removeSignsAST
	},
	{
		id: 'factorOne',
		label: 'Facteur 1 (1 * x)',
		feedback: sameFeedback('Il y a des facteurs 1 (comme ×1) qui peuvent être simplifiés.'),
		transform: removeFactorsOneAST
	},
	{
		id: 'products',
		label: 'Symbole de multiplication',
		feedback: sameFeedback('Tu peux simplifier certains symboles de multiplication.'),
		transform: removeMultOperatorAST
	}
] as const satisfies readonly SuperfluRule<string>[];

/** Identifiant d'une règle de superflu, réglable par modèle (`strict` / `warn` / `off`) */
export type SuperfluRuleId = (typeof SUPERFLU_RULES)[number]['id'];

type SuperfluAstRule = Extract<(typeof SUPERFLU_RULES)[number], { transform: unknown }>;

/** Les règles jugées sur l'arbre, dans l'ordre d'application */
export const SUPERFLU_AST_RULES: readonly SuperfluAstRule[] = SUPERFLU_RULES.filter(
	(rule): rule is SuperfluAstRule => 'transform' in rule
);

/** Les identifiants, dans l'ordre du registre */
export const SUPERFLU_RULE_IDS: readonly SuperfluRuleId[] = SUPERFLU_RULES.map((rule) => rule.id);

/**
 * Une valeur par règle, dans l'ordre du registre (libellés, messages, schéma).
 * Le registre est un tableau ; cette table indexée en est la vue par identifiant.
 */
export function bySuperfluRule<T>(
	pick: (rule: (typeof SUPERFLU_RULES)[number]) => T
): Record<SuperfluRuleId, T> {
	return Object.fromEntries(SUPERFLU_RULES.map((rule) => [rule.id, pick(rule)])) as Record<
		SuperfluRuleId,
		T
	>;
}
