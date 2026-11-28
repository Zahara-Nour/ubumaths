/**
 * Éditeur de modèle : lecture et écriture des réglages « primitive » / « solution-ed »
 * dans `shared.blankDefaults`.
 */

import { describe, it, expect } from 'vitest';
import { calculusEditorState, calculusBlankDefaults } from '../calculus-editor';
import { blankDefaultsSchema } from '../../template-schema';

describe('calculus-editor', () => {
	it('aller-retour primitive (champs vides omis)', () => {
		const defaults = {
			answerKind: 'primitive' as const,
			integrand: '3x^2',
			interval: ']0;+\\infty['
		};
		const state = calculusEditorState(defaults);
		expect(state.primitive).toBe(true);
		expect(calculusBlankDefaults(state)).toEqual(defaults);
		expect(blankDefaultsSchema.safeParse(calculusBlankDefaults(state)).success).toBe(true);
	});

	it('aller-retour solution-ed, mode générale', () => {
		const defaults = {
			answerKind: 'solution-ed' as const,
			solutionMode: 'generale' as const,
			equation: "y'=2y-6",
			function: 'y',
			variable: 'x'
		};
		expect(calculusBlankDefaults(calculusEditorState(defaults))).toEqual(defaults);
	});

	it('solution-ed sans « générale » : mode une, condition initiale gardée', () => {
		const state = {
			...calculusEditorState(undefined),
			solution: true,
			equation: " y'=y ",
			initial: 'y(0)=1'
		};
		expect(calculusBlankDefaults(state)).toEqual({
			answerKind: 'solution-ed',
			solutionMode: 'une',
			equation: "y'=y",
			initial: 'y(0)=1'
		});
	});

	it('aller-retour résolution ligne par ligne, lignes exigées', () => {
		const defaults = {
			answerKind: 'resolution' as const,
			equation: '{{a}}x+{{b}}={{c}}',
			minLines: 2
		};
		const state = calculusEditorState(defaults);
		expect(state.resolution).toBe(true);
		expect(state.minLines).toBe('2');
		expect(calculusBlankDefaults(state)).toEqual(defaults);
		expect(blankDefaultsSchema.safeParse(calculusBlankDefaults(state)).success).toBe(true);
	});

	it('résolution : lignes exigées vides, 1 ou illisibles omises (défaut 1)', () => {
		for (const minLines of ['', '1', 'deux', '2.5']) {
			const state = { ...calculusEditorState(undefined), resolution: true, minLines };
			expect(calculusBlankDefaults(state)).toEqual({ answerKind: 'resolution' });
		}
	});

	it('aller-retour droite paramétrique (outil 64) : la nature est gardée au save', () => {
		const defaults = { answerKind: 'droite-parametrique' as const };
		const state = calculusEditorState(defaults);
		expect(state.parametric).toBe(true);
		expect(calculusBlankDefaults(state)).toEqual(defaults);
		expect(blankDefaultsSchema.safeParse(calculusBlankDefaults(state)).success).toBe(true);
	});

	it('aucune case de calcul : null', () => {
		expect(calculusBlankDefaults(calculusEditorState({ answerKind: 'vecteur' }))).toBeNull();
	});
});
