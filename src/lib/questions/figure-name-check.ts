/**
 * Garde auteur : un nom de figure dans une réponse attendue (décision Q-A)
 * =======================================================================
 *
 * En mode « longueur », `ABC` n'est pas une longueur mais un NOM DE FIGURE : le
 * parseur le garde (affichage), mais le calcul et la correction le refusent. Une
 * réponse attendue qui en contient noterait faux tous les élèves, en silence :
 * l'éditeur de modèle la signale à l'auteur.
 *
 * Seules les réponses attendues des cases MATHS sont lues : une case texte `[_]`
 * compare des chaînes, `ABC` y est donc accepté. Un gabarit `{{…}}` y est
 * remplacé par un nombre (sa valeur n'existe qu'au tirage). Une réponse illisible
 * n'est pas signalée ici (le test du modèle s'en charge).
 */

import { findNodes, isFigureName, parseLatexSafe, type FigureNameNode } from '$lib/mathAST';
import { formatPointNames } from '$lib/mathAST/common/point-names';
import { resolveCapitalPairs } from './capital-pairs';
import { assignBlankIndices } from './generator/assign-blank-indices';
import type { QuestionTemplate } from './types';

// Constantes

/** Gabarit `{{…}}` : remplacé par un nombre avant la lecture */
const TEMPLATE_PLACEHOLDER_REGEX = /\{\{[^}]*\}\}/g;

// Fonctions

/** Premier nom de figure d'une réponse attendue, lue en mode longueur ; `null` sinon */
function figureNameIn(expectedAnswer: string): string | null {
	const latex = expectedAnswer.replace(TEMPLATE_PLACEHOLDER_REGEX, '1');
	const { ast } = parseLatexSafe(latex, { capitalPairs: 'length' });
	if (!ast) return null;
	const [figure] = findNodes<FigureNameNode>(ast, isFigureName);
	return figure ? formatPointNames(figure.points) : null;
}

/**
 * Messages (français) pour l'auteur : une ligne par case dont la réponse attendue
 * contient un nom de figure, quand le modèle lit deux majuscules collées comme une
 * longueur. Rien en mode produit (déclaré ou par le contexte).
 */
export function figureNameWarnings(
	template: Pick<QuestionTemplate, 'shared' | 'theme' | 'variations'>
): string[] {
	const { capitalPairs } = resolveCapitalPairs({
		declaration: template.shared?.capitalPairs,
		theme: template.theme
	});
	if (capitalPairs !== 'length') return [];

	const warnings: string[] = [];
	template.variations.forEach((variation, variationIndex) => {
		// Type des cases lu dans l'énoncé, comme au tirage (`[_]` = texte)
		const statement = variation.statement ?? template.shared?.statement ?? '';
		const answerFormats = variation.answerFormats ?? template.shared?.answerFormats;
		const { blankTypes } = assignBlankIndices(statement, answerFormats);
		variation.blanks?.forEach((blank, blankIndex) => {
			if (blankTypes[blankIndex] === 'text') return;
			const figure = figureNameIn(blank.expectedAnswer);
			if (!figure) return;
			warnings.push(
				`Variation ${variationIndex + 1}, case ${blankIndex + 1} : « ${figure} » est un nom de ` +
					`figure, pas une longueur. Aucune réponse d’élève ne pourra être acceptée : attends ` +
					`une longueur à deux points (AB), ou déclare que deux majuscules collées désignent ` +
					`un produit.`
			);
		});
	});
	return warnings;
}
