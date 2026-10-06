/**
 * Atelier — le champ MathLive de la carte
 *
 * Deux sens, une règle chacun (phase 0 `/grapheur` §1 C5, C6, C8, C10) :
 *
 * - **vers le champ** : une définition tapée dans Calcul est du texte
 *   (`sqrt(x)`), que MathLive afficherait lettre à lettre. On la traduit en
 *   LaTeX ; ce qui vient déjà d'un champ de maths est rendu tel quel.
 * - **depuis le champ** : du LaTeX, lu en provenance `'keyboard'` (D10). Une
 *   seule retouche, en SECOURS : une grandeur que MathLive écrit
 *   `12\operatorname{\mathrm{km}}`, que l'atelier refusait.
 *
 * @module atelier/mathfield
 */

import type { AtelierObject, ObjectKind } from './types';
import { astOf, parseDefinition, readingMode, readNumber, renameInDefinition } from './parse';
import { INTERNAL_LETTER } from './letter';
import { toLatex } from '$lib/mathAST/latex-generator';
import { normalizeStudentQuantity } from '$lib/questions/units/student-input';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Ce que le champ de la carte doit afficher pour cet objet.
 *
 * Une définition illisible est rendue telle quelle : l'élève doit retrouver ce
 * qu'il a tapé pour le corriger, pas un champ vide.
 */
export function fieldLatexOf(
	object: AtelierObject,
	functionNames: readonly string[],
	letter: string = INTERNAL_LETTER
): string {
	// `f(t) = t^2` : rangée en x, montrée dans la lettre de l'élève (`letter.ts`)
	const definition =
		letter === INTERNAL_LETTER
			? object.definition
			: renameInDefinition(object.definition, INTERNAL_LETTER, letter);
	if (definition.trim() === '') return '';
	const provenance = object.provenance ?? 'url';
	if (readingMode(provenance) === 'latex') return forMathlive(definition);
	// Un nombre s'affiche comme l'élève l'écrit : `2,5`, pas le `2.5` que rendrait
	// `toLatex` (revue du lot 4 : le curseur écrit `2,5`, le champ montrait `2.5`)
	if (readNumber(definition) !== null) return definition.trim();

	const ast = astOf(definition, provenance, functionNames);
	return ast === null ? definition : forMathlive(toLatex(ast));
}

/**
 * Du LaTeX que MathLive sait afficher.
 *
 * ⚠️ MathLive ne connaît pas `\unit{km}` (notre écriture des grandeurs) : il
 * affichait « \unitkm » en toutes lettres (revue du lot 2a). On lui donne la
 * forme qu'il écrit lui-même quand on tape `12 km` — que `definitionFromField`
 * sait relire en grandeur.
 */
export function forMathlive(latex: string): string {
	return latex.replace(/\\unit\{([^{}]*)\}/g, '\\operatorname{\\mathrm{$1}}');
}

/**
 * La définition à ranger pour ce que l'élève a tapé dans la carte.
 *
 * ⚠️ Le secours « unité » ne s'applique qu'à une VALEUR qui ne se lit pas
 * telle quelle : `normalizeStudentQuantity` ferait de `2b` le nombre 2 suivi
 * d'une unité `b` (mesuré). Il n'est gardé que s'il produit bien une grandeur.
 */
export function definitionFromField(kind: ObjectKind, latex: string): string {
	const typed = latex.trim();
	if (kind !== 'value' || typed === '') return typed;
	// MathLive écrit la virgule décimale `{,}` : un nombre est rangé `2,5`
	const decimal = typed.replace(/\{,\}/g, ',');
	if (readNumber(decimal) !== null) return decimal;
	if (parseDefinition('value', typed, 'keyboard').error === undefined) return typed;

	const quantity = normalizeStudentQuantity(typed);
	const read = parseDefinition('value', quantity, 'keyboard');
	return read.error === undefined && read.unit !== undefined ? quantity : typed;
}
