/**
 * Éditeur de modèle : réglages des cases « primitive » et « solution-ed »
 * (valeurs par défaut des cases, `shared.blankDefaults`).
 *
 * L'état du formulaire est un objet plat de champs texte ; il se lit depuis
 * `blankDefaults` et s'y réécrit, champs vides omis.
 *
 * @module questions/calculus/calculus-editor
 */

import type { BlankDefaults, CalculusBlankFields } from '$lib/questions/types';

// Types
export interface CalculusEditorState {
	/** Case « primitive » */
	primitive: boolean;
	/** Case « solution-ed » */
	solution: boolean;
	/** Solution-ed : la solution générale est attendue (mode `generale`) */
	general: boolean;
	integrand: string;
	variable: string;
	interval: string;
	equation: string;
	functionName: string;
	initial: string;
}

// Functions

/** État du formulaire lu depuis les valeurs par défaut des cases */
export function calculusEditorState(defaults: BlankDefaults | undefined): CalculusEditorState {
	return {
		primitive: defaults?.answerKind === 'primitive',
		solution: defaults?.answerKind === 'solution-ed',
		general: defaults?.solutionMode === 'generale',
		integrand: defaults?.integrand ?? '',
		variable: defaults?.variable ?? '',
		interval: defaults?.interval ?? '',
		equation: defaults?.equation ?? '',
		functionName: defaults?.function ?? '',
		initial: defaults?.initial ?? ''
	};
}

/** Champ texte non vide, rogné ; `undefined` sinon */
function filled(text: string): string | undefined {
	return text.trim() || undefined;
}

/**
 * Réglages à écrire dans `blankDefaults` (`answerKind` compris), `null` si
 * aucune des deux cases n'est choisie. « primitive » l'emporte si les deux le sont.
 */
export function calculusBlankDefaults(
	state: CalculusEditorState
): (CalculusBlankFields & Pick<BlankDefaults, 'answerKind'>) | null {
	const variable = filled(state.variable);
	if (state.primitive) {
		const integrand = filled(state.integrand);
		const interval = filled(state.interval);
		return {
			answerKind: 'primitive',
			...(integrand && { integrand }),
			...(variable && { variable }),
			...(interval && { interval })
		};
	}
	if (state.solution) {
		const equation = filled(state.equation);
		const fn = filled(state.functionName);
		const initial = filled(state.initial);
		return {
			answerKind: 'solution-ed',
			solutionMode: state.general ? 'generale' : 'une',
			...(equation && { equation }),
			...(variable && { variable }),
			...(fn && { function: fn }),
			...(initial && { initial })
		};
	}
	return null;
}
