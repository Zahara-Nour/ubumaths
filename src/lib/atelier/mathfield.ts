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
import { intervalFieldLatex } from './interval';
import { readNaturalQuantities } from './natural-quantities';
import { argumentSeparatorsShown } from './decimal-comma';
import { readConstruction } from './construction-read';
import { constructionLatex } from './construction';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import { toLatex } from '$lib/mathAST/latex-generator';
import { isAddition, isDelimiter, isNumber, isUnit } from '$lib/mathAST/guards';
import { normalizeStudentQuantity } from '$lib/questions/units/student-input';

// =============================================================================
// Constantes
// =============================================================================

/** Les unités d'une durée composée (`2 h 30 min`), de la plus grande à la plus petite. */
const DURATION_UNITS: readonly string[] = ['h', 'min', 's'];

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
	// `f(x) = x^2 sur [0;+∞[` : l'ensemble suit la définition, « sur » écrit en mot
	const expression = expressionFieldLatex(object, functionNames, letter);
	const interval = intervalFieldLatex(object);
	return interval === null ? expression : `${expression}\\text{ sur }${interval}`;
}

/** La définition seule, sans l'ensemble. */
function expressionFieldLatex(
	object: AtelierObject,
	functionNames: readonly string[],
	letter: string
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
	// Une construction tapée dans Calcul (`milieu(A, B)`, `(AB)`, lot 2) : en LaTeX
	// que le champ montre et que la lecture des constructions relit
	if (object.kind === 'point' || object.kind === 'curve') {
		const construction = readConstruction(definition, provenance);
		if (construction !== null && construction.ok) {
			return forMathlive(constructionLatex(construction.call));
		}
	}
	// Un nombre s'affiche comme l'élève l'écrit : `2,5`, pas le `2.5` que rendrait
	// `toLatex` (revue du lot 4 : le curseur écrit `2,5`, le champ montrait `2.5`)
	if (readNumber(definition) !== null) return definition.trim();

	const ast = astOf(definition, provenance, functionNames);
	if (ast === null) return definition;
	// La virgule de l'élève : `2,5 km`, `2,5x`, pas le `2.5` de `toLatex` ; ses
	// arguments séparés par « ; » : `max(2,5 ; x)`, pas `2,5, x`
	return argumentSeparatorsShown(forMathlive(toLatex(ast))).replace(/(\d)\.(\d)/g, '$1{,}$2');
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
	let previous = -1;
	for (const part of parts) {
		const symbol = isUnit(part) ? part.unit.original : undefined;
		if (!isUnit(part) || !isNumber(part.expression) || symbol === undefined) return null;
		// h, min, s dans cet ordre, chacune une fois : sinon l'écriture du rangement
		const rank = DURATION_UNITS.indexOf(symbol);
		if (rank <= previous) return null;
		previous = rank;
		// La virgule de MathLive, comme un nombre seul (`2{,}5`)
		const value = String(part.expression.value).replace('.', '{,}');
		written.push(`${value}~\\unit{${symbol}}`);
	}
	return forMathlive(written.join('~'));
}

/**
 * Une valeur écrite « un nombre, une espace, une unité », lue comme dans Calcul
 * (`readNaturalQuantities`) puis réécrite en LaTeX : `2\,h\,30\,\min` →
 * `(2\unit{h}+30\unit{min})`, `\frac{1}{2}\,m` → `\frac{1}{2}\unit{m}`.
 *
 * Une grandeur peut être prise dans un calcul de nombres (`(1 h + 30 min) × 2`,
 * la forme que le champ montre pour `(1[h]+30[min])*2`).
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
		// Une grandeur prise dans un calcul : `\times`, `\cdot` et `\dfrac` restent du LaTeX
		.replace(/\\times(?![A-Za-z])/g, '\\cdot ')
		// MathLive écrit toujours « min » en opérateur `\min`
		.replace(/\\min(?![A-Za-z])/g, 'min')
		.replace(/\{,\}/g, ',')
		.replace(/\\[,;: ]|~/g, ' ')
		// `(1/2) m`, la forme que le champ montre pour `(1/2)[m]` : `1/2 m`
		.replace(/\(\s*(\d+\/\d+)\s*\)(?=\s+[^\s\d(])/g, '$1');
	const read = readNaturalQuantities(text, [], { afterTerms: false }).text;
	const outside = read.replace(/\[[^\]]*\]|\\(?:d?frac|cdot)(?![A-Za-z])/g, '');
	if (!read.includes('[') || /[A-Za-z\\]/.test(outside)) return null;
	// Le × de l'élève, lu `\cdot` ci-dessus, lui est rendu : il revenait en ·
	// après retouche (restes des grandeurs, 2026-10-18)
	const times = /\\times(?![A-Za-z])/.test(latex) && !/\\cdot(?![A-Za-z])/.test(latex);
	return (
		(times ? read.replace(/\\cdot(?![A-Za-z])\s*/g, '\\times ') : read)
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
	// La notation scientifique (`2{,}5\times10^3\,m`) échappe à la lecture
	// naturelle (un nombre après `^`) : le secours des cases à unité (revue)
	// (sur `decimal` : la virgule de MathLive `2{,}5` cachait le chiffre — revue du lot C)
	if (/\d\\,\s*[^\d\s\\]/.test(decimal)) {
		// La virgule redevient celle de MathLive (`2{,}5`) : nue, le LaTeX la refuse
		const spaced = normalizeStudentQuantity(decimal).replace(/(\d),(\d)/g, '$1{,}$2');
		const read = parseDefinition('value', spaced, 'keyboard');
		if (read.error === undefined && read.unit !== undefined) return spaced;
	}
	if (parseDefinition('value', typed, 'keyboard').error === undefined) return typed;

	// La virgule du champ (`2{,}5\times10^3`) : nue, le LaTeX la refuse (revue)
	const quantity = normalizeStudentQuantity(typed).replace(/(\d),(\d)/g, '$1{,}$2');
	const read = parseDefinition('value', quantity, 'keyboard');
	if (read.error === undefined && read.unit !== undefined) return quantity;

	// Une unité écrite comme le champ la montre (`\operatorname{\mathrm{m}}`, la forme
	// de `forMathlive`) est une unité, quoi qu'il y ait devant : `10^3 m`, que le secours ci-dessus coupe
	const marked = typed.replace(
		/\\operatorname\{\\mathrm\{([^{}]*)\}\}/g,
		(whole, symbol: string) => (parseUnit(symbol) === null ? whole : `\\unit{${symbol}}`)
	);
	if (marked === typed) return typed;
	const markedRead = parseDefinition('value', marked, 'keyboard');
	return markedRead.error === undefined && markedRead.unit !== undefined ? marked : typed;
}
