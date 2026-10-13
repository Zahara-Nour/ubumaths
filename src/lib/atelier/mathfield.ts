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
 *   `12\operatorname{\mathrm{km}}`, que l'atelier refusait. Une valeur écrite
 *   « un nombre, une espace, une unité » se lit comme dans Calcul (lot C des
 *   grandeurs) : `2\,h\,30\,\min` est une durée composée, `\frac{1}{2}\,m` un
 *   demi-mètre.
 *
 * @module atelier/mathfield
 */

import type { MathNode } from '$lib/mathAST/types';
import type { AtelierObject, ObjectKind } from './types';
import { astOf, parseDefinition, readingMode, readNumber } from './parse';
import { INTERNAL_LETTER, renameVariable } from './letter';
import { readNaturalQuantities } from './natural-quantities';
import { toLatex } from '$lib/mathAST/latex-generator';
import { isAddition, isDelimiter, isNumber, isUnit } from '$lib/mathAST/guards';
import { normalizeStudentQuantity } from '$lib/questions/units/student-input';

// =============================================================================
// Constantes
// =============================================================================

/** Les unités d'une durée composée (`2 h 30 min`). */
const DURATION_UNITS: ReadonlySet<string> = new Set(['h', 'min', 's']);

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
	const provenance = object.provenance ?? 'url';
	const definition =
		letter === INTERNAL_LETTER || object.kind !== 'function'
			? object.definition
			: renameVariable(object.definition, INTERNAL_LETTER, letter, provenance, functionNames);
	if (definition.trim() === '') return '';
	if (object.kind === 'value') {
		const composite = compositeDurationField(astOf(definition, provenance, functionNames));
		if (composite !== null) return composite;
	}
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
 * Une durée composée rangée `(2[h]+30[min])`, montrée comme l'élève l'écrit :
 * `2 h 30 min`, sans le `+` ni les parenthèses du rangement (restes du lot C).
 */
function compositeDurationField(ast: MathNode | null): string | null {
	if (ast === null || !isDelimiter(ast)) return null;
	const parts: MathNode[] = [];
	let node = ast.content;
	while (isAddition(node)) {
		parts.unshift(node.right);
		node = node.left;
	}
	parts.unshift(node);
	if (parts.length < 2) return null;
	const written: string[] = [];
	for (const part of parts) {
		const symbol = isUnit(part) ? part.unit.original : undefined;
		if (!isUnit(part) || !isNumber(part.expression) || symbol === undefined) return null;
		if (!DURATION_UNITS.has(symbol)) return null;
		written.push(`${part.expression.value}~\\unit{${symbol}}`);
	}
	return forMathlive(written.join('~'));
}

/**
 * Une valeur écrite « un nombre, une espace, une unité », lue comme dans Calcul
 * (`readNaturalQuantities`) puis réécrite en LaTeX : `2\,h\,30\,\min` →
 * `(2\unit{h}+30\unit{min})`, `\frac{1}{2}\,m` → `\frac{1}{2}\unit{m}`.
 *
 * `null` si ce n'est pas QU'une grandeur : une lettre hors d'une unité
 * (`\min\left(2,3\right)`, `3\,x`) laisse la saisie aux autres lectures.
 */
function naturalQuantityLatex(latex: string): string | null {
	const text = latex
		.replace(/\\left\(/g, '(')
		.replace(/\\right\)/g, ')')
		.replace(/\\operatorname\{\\mathrm\{([^{}]*)\}\}/g, ' $1')
		.replace(/\\mathrm\{([^{}]*)\}/g, ' $1')
		.replace(/\\d?frac\{(\d+)\}\{(\d+)\}/g, '$1/$2')
		// MathLive écrit toujours « min » en opérateur `\min`
		.replace(/\\min(?![A-Za-z])/g, 'min')
		.replace(/\{,\}/g, ',')
		.replace(/\\[,;: ]|~/g, ' ')
		// `(1/2) m`, la forme que le champ montre pour `(1/2)[m]` : `1/2 m`
		.replace(/\(\s*(\d+\/\d+)\s*\)(?=\s+[^\s\d(])/g, '$1');
	const read = readNaturalQuantities(text, []).text;
	const outside = read.replace(/\[[^\]]*\]/g, '');
	if (outside === read || /[A-Za-z\\]/.test(outside)) return null;
	return (
		read
			.replace(/\((\d+)\/(\d+)\)\[/g, '\\frac{$1}{$2}[')
			.replace(/\[([^\]]*)\]/g, '\\unit{$1}')
			// La virgule redevient celle de MathLive (`2{,}5`) : nue, le LaTeX la refuse
			.replace(/(\d),(\d)/g, '$1{,}$2')
			.replace(/\s+/g, '')
	);
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
	// « un nombre, une espace, une unité » (lot C des grandeurs) : l'espace tapée
	// arrive `\,` (`mathModeSpace` du champ) — `5\,m` est une grandeur, `5m` un produit
	const natural = naturalQuantityLatex(typed);
	if (natural !== null) {
		const read = parseDefinition('value', natural, 'keyboard');
		if (read.error === undefined && read.unit !== undefined) return natural;
	}
	if (parseDefinition('value', typed, 'keyboard').error === undefined) return typed;

	const quantity = normalizeStudentQuantity(typed);
	const read = parseDefinition('value', quantity, 'keyboard');
	return read.error === undefined && read.unit !== undefined ? quantity : typed;
}
