/**
 * Conditions sur les variables tirées : `{{if:condition|alors|sinon}}`
 * =====================================================================
 *
 * Remplacé à la génération par la branche retenue, dans un énoncé ou un corrigé (une
 * condition côté élève, `isCorrect`, y reste pour le navigateur), mais aussi dans une
 * réponse attendue et dans l'expression d'une variable (mode strict : toute condition doit
 * y être tranchée). Les branches peuvent contenir des accolades et d'autres `{{if:…}}`.
 *
 * Ce passage précède la lecture des tirages : sans lui, dans une réponse attendue ou une
 * variable, le `|` était lu comme une liste de tirage (`{{if:a>0|1|2}}` rendait 1 ou 2
 * au hasard, sans erreur).
 *
 * @module questions/generator/variable-conditionals
 */

import type { ResolvedVariable } from '../types';
import { ConditionSyntaxError, evaluateConditionStrict } from './condition-evaluator';
import { AuthorExpressionError } from '$lib/ubumark/parameterization/resolver/variable-resolver';

// Constantes

/** Ouverture d'un marqueur conditionnel */
const IF_OPEN = '{{if:';

/** Mots de la syntaxe des conditions qui ne sont pas des noms de variables */
const CONDITION_KEYWORDS = new Set(['and', 'or', 'not']);

// Fonctions

/** Fin (exclue) du marqueur `{{if:…}}` ouvert en `start` : accolades équilibrées, -1 sinon */
function conditionalEnd(text: string, start: number): number {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return i + 1;
	}
	return -1;
}

/**
 * Découpe `condition|alors|sinon` sur les `|` hors accolades (une branche peut contenir du
 * LaTeX) ; `\\left|`, `\\right|` et `\\|` (valeur absolue, norme) ne séparent pas.
 */
function splitConditional(inner: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === '{') depth++;
		if (char === '}') depth--;
		const isDelimiter = /(?:\\left|\\right|\\)$/.test(current);
		if (char === '|' && depth === 0 && !isDelimiter) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);
	return parts;
}

/**
 * La condition ne nomme-t-elle QUE des variables tirées ? (`mod({{a}},2)=0` oui ;
 * `{{answer}}={{a}}`, `isCorrect`, `x=x` non : réponse de l'élève ou inconnue, que le
 * calcul trancherait à tort). Les noms suivis de `(` sont des fonctions.
 */
function isVariableCondition(condition: string, resolvedVariables: ResolvedVariable[]): boolean {
	const names = new Set(resolvedVariables.map((v) => v.name));
	const identifiers = condition
		.replace(/\{\{(\w+)\}\}/g, ' $1 ')
		.match(/[a-zA-Z_]\w*(?!\w*\s*\()/g);
	return (identifiers ?? []).every((id) => names.has(id) || CONDITION_KEYWORDS.has(id));
}

/**
 * `{{if:condition|alors}}` ou `{{if:condition|alors|sinon}}` dont la condition porte sur
 * les VARIABLES tirées (`{{if:mod(a,2)=0|… est pair}}`, repris de TinyMath) : remplacé
 * par la branche retenue, elle-même relue (imbrication).
 *
 * - par défaut (énoncé, corrigé) : une condition illisible avec les variables
 *   (`isCorrect`, réponse de l'élève) est laissée telle quelle, le navigateur la résout ;
 * - `strict` (réponse attendue, variable) : rien ne peut rester pour le navigateur, une
 *   condition non tranchée est une faute du modèle (`AuthorExpressionError`).
 */
export function resolveVariableConditionals(
	text: string,
	resolvedVariables: ResolvedVariable[],
	options: { strict?: boolean } = {}
): string {
	if (!text.includes(IF_OPEN)) return text;
	let result = '';
	let index = 0;
	while (index < text.length) {
		const start = text.indexOf(IF_OPEN, index);
		const end = start === -1 ? -1 : conditionalEnd(text, start);
		if (end === -1) {
			if (options.strict && start !== -1) {
				throw new AuthorExpressionError(`« ${text.slice(start)} » : accolades non fermées`);
			}
			result += text.slice(index);
			break;
		}
		result += text.slice(index, start);
		const marker = text.slice(start, end);
		const parts = splitConditional(text.slice(start + IF_OPEN.length, end - 2));
		let replacement = marker;
		const readable =
			(parts.length === 2 || parts.length === 3) &&
			isVariableCondition(parts[0], resolvedVariables);
		if (readable) {
			try {
				const branch = evaluateConditionStrict(parts[0], resolvedVariables)
					? parts[1]
					: (parts[2] ?? '');
				replacement = resolveVariableConditionals(branch, resolvedVariables, options);
			} catch (error) {
				if (options.strict) {
					const message = `« ${marker} » : ${error instanceof Error ? error.message : String(error)}`;
					// Condition illisible : faute du modèle ; non calculable pour CE tirage
					// (division par zéro) : erreur ordinaire, le tirage est relancé
					throw error instanceof ConditionSyntaxError
						? new AuthorExpressionError(message)
						: new Error(message);
				}
				// Condition côté élève : conservée
			}
		} else if (options.strict) {
			throw new AuthorExpressionError(
				`« ${marker} » : la condition doit ne porter que sur des variables déclarées, ` +
					'avec une branche « alors » et au plus une branche « sinon »'
			);
		}
		result += replacement;
		index = end;
	}
	return result;
}
