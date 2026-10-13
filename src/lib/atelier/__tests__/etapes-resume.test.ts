/**
 * Atelier — les étapes en version résumée (interrupteur « Résumé / Détaillé »,
 * plan `docs/wip/atelier-progress.md`, 2a).
 *
 * Les quatre commandes qui rédigent leurs étapes (simplifier, factoriser,
 * dériver, résoudre) rendent DEUX rédactions du même calcul : la détaillée
 * (`steps`) et la résumée (`summary`), absente quand elle ne dit rien de
 * moins. Mesuré le 2026-10-13 : dans les cinq renderers, la verbosité ne
 * gouverne que l'`explanation` de chaque étape.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { simplifySteps } from '../simplify-steps';
import { factorSteps } from '../factor-steps';
import { deriveSteps } from '../derive-steps';
import { solveSteps } from '../solve-steps';
import {
	STEPS_VERBOSITY_KEY,
	readStepsVerbosity,
	summaryOf,
	writeStepsVerbosity
} from '../steps-summary';

// =============================================================================
// Décor
// =============================================================================

/** Toutes les étapes, sous-étapes comprises. */
function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

/** Les titres seuls, dans l'ordre : ce que les deux rédactions partagent. */
function titles(steps: readonly RenderedStep[]): string[] {
	return flatten(steps).map((step) => step.title);
}

/** Un `Storage` minimal en mémoire. */
function memoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => void values.delete(key),
		setItem: (key, value) => void values.set(key, value)
	};
}

/** Un navigateur qui refuse tout accès (mode privé strict, quota). */
function hostileStorage(): Storage {
	const refuse = () => {
		throw new DOMException('refusé', 'SecurityError');
	};
	return {
		length: 0,
		clear: refuse,
		getItem: refuse,
		key: refuse,
		removeItem: refuse,
		setItem: refuse
	};
}

/** Les deux rédactions d'une sortie : mêmes étapes, explications en moins. */
function expectSummaryOf(
	steps: readonly RenderedStep[],
	summary: readonly RenderedStep[] | undefined
) {
	expect(summary, 'la version résumée manque').toBeDefined();
	expect(flatten(steps).some((step) => step.explanation !== undefined)).toBe(true);
	expect(flatten(summary!).every((step) => step.explanation === undefined)).toBe(true);
	expect(titles(summary!)).toEqual(titles(steps));
	expect(flatten(summary!).map((s) => s.expressionLatex)).toEqual(
		flatten(steps).map((s) => s.expressionLatex)
	);
}

// =============================================================================
// Comportements
// =============================================================================

describe('les fonctions d’étapes rendent les deux rédactions', () => {
	it.each(['\\frac{6}{8}+\\frac13', 'sqrt(12)+sqrt(3)', '3x+2x-x'])('simplifier %s', (e) => {
		const result = simplifySteps(e)!;
		expectSummaryOf(result.steps, result.summary);
	});

	it.each(['x^2-9', '6x+9', 'x^2-5x+6'])('factoriser %s', (e) => {
		const result = factorSteps(e);
		expect(result.kind).toBe('factorisee');
		if (result.kind !== 'factorisee') return;
		expectSummaryOf(result.steps, result.summary);
	});

	it.each(['x^2\\sin x', 'x^3+2x', 'e^{2x}'])('dériver %s', (e) => {
		const result = deriveSteps(e)!;
		expectSummaryOf(result.steps, result.summary);
	});

	it('dériver : l’étape « On simplifie » ajoutée après le rendu est résumée aussi', () => {
		// `3 \cdot 3x^2` → `9x^2` : l'étape de mise au propre vient de `withTidyStep`
		const result = deriveSteps('3x^3')!;
		const last = (steps: readonly RenderedStep[]) => steps[steps.length - 1];
		expect(last(result.steps).title).toBe('On simplifie');
		expect(last(result.steps).explanation).toBeDefined();
		expect(last(result.summary!).title).toBe('On simplifie');
		expect(last(result.summary!).explanation).toBeUndefined();
	});

	it.each(['3x-4\\leq 2x+1', 'x^2-5x+6=0', '|x-1|=3', '\\frac{x+1}{x-2}\\geq0'])(
		'résoudre %s',
		(e) => {
			const result = solveSteps(e)!;
			expectSummaryOf(result.steps, result.summary);
		}
	);

	it('la réponse ne dépend pas de la rédaction', () => {
		expect(solveSteps('x^2-5x+6=0')!.answer).toMatch(/2.*3/);
	});
});

describe('summaryOf : pas de version résumée quand elle ne dit rien de moins', () => {
	const step: RenderedStep = { id: 1, rule: 'r', title: 'On réduit', expressionLatex: 'x' };

	it('identique → absente', () => {
		expect(summaryOf([step], [{ ...step }])).toBeUndefined();
	});

	it('différente → la résumée', () => {
		const detailed = [{ ...step, explanation: 'Parce que.' }];
		expect(summaryOf(detailed, [step])).toEqual([step]);
	});
});

describe('les lignes de l’atelier portent la version résumée', () => {
	function lastEntry(input: string) {
		const desk = new CalcDesk(new Atelier());
		desk.submit(input);
		return desk.entries[desk.entries.length - 1];
	}

	it.each([
		'.simplifier \\frac{6}{8}+\\frac13',
		'.factoriser x^2-9',
		'.dériver x^2\\sin x',
		'.résoudre 3x-4\\leq 2x+1'
	])('%s', (input) => {
		const entry = lastEntry(input);
		expect(entry.steps).toBeDefined();
		expectSummaryOf(entry.steps!, entry.summary);
	});

	it('les virgules décimales s’écrivent aussi dans le résumé', () => {
		const entry = lastEntry('.résoudre x+0.5=2');
		const latex = flatten(entry.summary!)
			.map((s) => s.expressionLatex ?? '')
			.join(' ');
		expect(latex).toContain('{,}');
		expect(latex).not.toMatch(/\d\.\d/);
	});

	it('une action sur un objet (« Dériver ») porte aussi le résumé', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x)=x^2\\sin x');
		desk.runFromPanel('derive', 'f');
		const entry = desk.entries.find((e) => e.label.startsWith('Dériver'));
		expect(entry?.steps).toBeDefined();
		expectSummaryOf(entry!.steps!, entry!.summary);
	});

	it('`.variations` a sa propre rédaction : pas de résumé (hors périmètre)', () => {
		const entry = lastEntry('.variations x^2-4x');
		expect(entry.steps).toBeDefined();
		expect(entry.summary).toBeUndefined();
	});

	it('une ligne sans étapes reste sans étapes ni résumé (V48)', () => {
		const entry = lastEntry('.résoudre \\frac{2x^3}{x}<2');
		expect(entry.steps).toBeUndefined();
		expect(entry.summary).toBeUndefined();
	});
});

describe('le dernier choix est retenu dans ce navigateur', () => {
	it('« Détaillé » à l’ouverture', () => {
		expect(readStepsVerbosity(memoryStorage())).toBe('detailed');
		expect(readStepsVerbosity(null)).toBe('detailed');
	});

	it('écrit puis relu', () => {
		const storage = memoryStorage();
		writeStepsVerbosity(storage, 'summarized');
		expect(storage.getItem(STEPS_VERBOSITY_KEY)).toBe('summarized');
		expect(readStepsVerbosity(storage)).toBe('summarized');
	});

	it('une valeur inconnue → « Détaillé »', () => {
		const storage = memoryStorage();
		storage.setItem(STEPS_VERBOSITY_KEY, 'bavard');
		expect(readStepsVerbosity(storage)).toBe('detailed');
	});

	it('un navigateur qui refuse le stockage ne casse rien', () => {
		expect(readStepsVerbosity(hostileStorage())).toBe('detailed');
		expect(() => writeStepsVerbosity(hostileStorage(), 'summarized')).not.toThrow();
		expect(() => writeStepsVerbosity(null, 'summarized')).not.toThrow();
	});
});
