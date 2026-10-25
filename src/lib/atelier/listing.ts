/**
 * Atelier — `.valeurs` et `.fonctions`, faites depuis les cartes
 *
 * Avant le retrait de `/cas` (2026-10-13), ces deux commandes rendaient la liste
 * du MOTEUR, en anglais (« Variables: », « Functions: ») : une suite y passait
 * pour une fonction, `g(t) = 2t+1` s'y écrivait en x et `b = 2a` devenait
 * `b = 2*5`. Le panneau fait foi : on liste ses cartes, dans son ordre, comme
 * il les montre (nom affiché, lettre de l'élève, ensemble, état).
 *
 * Phase 0 : `docs/archive/wip/atelier-cas-phase0.md`, PR 4.
 *
 * @module atelier/listing
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject, FunctionObject, ObjectStatus } from './types';
import { derivativeOf, displayName, reciprocalOf } from './names';
import { astOf } from './parse';
import { derivativeAstOf } from './engine';
import { INTERNAL_LETTER, renameVariableIn, studentDefinitionOf, typedLetterOf } from './letter';
import { intervalLabelOf } from './interval';
import { toCustom } from '$lib/mathAST/custom-generator';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Constantes
// =============================================================================

/** Les mêmes mots que l'état d'une carte (`ObjectCard`). */
const STATE_LABELS: Readonly<Partial<Record<ObjectStatus, string>>> = {
	error: 'erreur',
	pending: 'en attente',
	incomplete: 'à compléter'
};

export const NO_VALUES = 'Aucune valeur dans tes objets. Pour en créer une : a = 5';
export const NO_FUNCTIONS = 'Aucune fonction dans tes objets. Pour en créer une : f(x) = x^2';

// =============================================================================
// Fonctions
// =============================================================================

/** `.valeurs` : chaque carte « valeur », telle que l'élève l'a écrite. */
export function valuesListing(atelier: Atelier): string {
	const values = atelier.objects.filter((o) => o.kind === 'value');
	if (values.length === 0) return NO_VALUES;
	return [
		'Tes valeurs :',
		...values.map((v) => `  ${v.name} = ${studentDefinitionOf(atelier, v) || '…'}${stateOf(v)}`)
	].join('\n');
}

/**
 * `.fonctions` : chaque carte « fonction », dérivées (`f′`) et réciproques
 * (`f⁻¹`) comprises — ce sont des cartes du panneau. Ni les suites, ni les
 * listes : le panneau les range à part.
 */
export function functionsListing(atelier: Atelier): string {
	const functions = atelier.objects.filter((o): o is FunctionObject => o.kind === 'function');
	if (functions.length === 0) return NO_FUNCTIONS;
	return [
		'Tes fonctions :',
		...functions.map((f) => {
			const letter = typedLetterOf(atelier, f);
			const interval = intervalLabelOf(f);
			return `  ${displayName(f.name)}(${letter}) = ${formulaOf(atelier, f, letter)}${
				interval === null ? '' : ` sur ${interval}`
			}${stateOf(f)}`;
		})
	].join('\n');
}

/**
 * La formule que montre la carte. Une dérivée est définie par `f′(x)` : on
 * écrit sa formule recalculée (comme la carte), dans la lettre de l'élève ;
 * une réciproque, sa formule relue. Le reste : tel que l'élève l'a tapé.
 */
function formulaOf(atelier: Atelier, object: FunctionObject, letter: string): string {
	if (derivativeOf(object.name) !== null) {
		const derived = derivativeAstOf(atelier, object.name);
		if (!derived.ok) return '…';
		return typedText(
			letter === INTERNAL_LETTER
				? derived.ast
				: renameVariableIn(derived.ast, INTERNAL_LETTER, letter)
		);
	}
	// Une réciproque est calculée, pas tapée : sa définition rangée est une
	// écriture interne (`{x-1}/2`), réécrite ici comme la dérivée
	if (reciprocalOf(object.name) !== null) {
		const ast = astOf(object.definition, object.provenance ?? 'url', atelier.functionNames);
		if (ast !== null) {
			return typedText(
				letter === INTERNAL_LETTER ? ast : renameVariableIn(ast, INTERNAL_LETTER, letter)
			);
		}
	}
	return studentDefinitionOf(atelier, object) || '…';
}

/**
 * Une formule calculée, en texte : l'écriture maison groupe par accolades
 * (`{x-1}/2`), que la ligne montrerait telles quelles (revue) ; on les lit en
 * parenthèses, comme l'élève les tape — même sens pour le lecteur de Calcul.
 */
function typedText(ast: MathNode): string {
	return toCustom(ast).replaceAll('{', '(').replaceAll('}', ')');
}

/** ` (en attente)`, ou rien pour une carte qui calcule. */
function stateOf(object: AtelierObject): string {
	const label = STATE_LABELS[object.status];
	return label === undefined ? '' : ` (${label})`;
}
