/**
 * Lecture des formules d'une instance par le parseur
 * ==================================================
 *
 * Ce que le modèle a déclaré (ou que le contexte a résolu) et qui change la LECTURE
 * d'une saisie : les fonctions déclarées (`P'(2)`) et le sens de deux majuscules
 * collées (`AB` : longueur ou produit). Un seul objet, pour que la réponse de l'élève
 * et la réponse attendue soient lues de la même façon partout (valeur, forme exigée,
 * contraintes d'écriture, règles).
 */

import type { CapitalPairs, GenericFunctionConfig } from '$lib/mathAST/parser/types';
import { templateGenericFunctions } from './generic-functions';
import type { QuestionInstance } from './types';

// Types

export interface FormulaReading {
	/** Fonctions déclarées par le modèle ; absent : défauts du parseur */
	genericFunctions?: GenericFunctionConfig;
	/** Sens de `AB` ; absent (instance servie avant le chantier) : produit, comme avant */
	capitalPairs?: CapitalPairs;
}

// Fonctions

/** Lecture des formules d'une instance (clés absentes = défauts du parseur) */
export function readingOf(
	instance: Pick<QuestionInstance, 'genericFunctions' | 'capitalPairs'>
): FormulaReading {
	const genericFunctions = templateGenericFunctions(instance.genericFunctions);
	return {
		...(genericFunctions && { genericFunctions }),
		...(instance.capitalPairs && { capitalPairs: instance.capitalPairs })
	};
}
