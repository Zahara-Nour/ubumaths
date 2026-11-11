/**
 * Deux lignes dépliées pendant une coupure : un seul « Réessayer » réussi
 * doit les rétablir TOUTES (revue de #2545). Le vrai `lazyLoader` est gardé,
 * seul l'`import()` est piloté : c'est sa réactivité qu'on asserte.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import GeneratedStepsCorrection from '$lib/components/questions/GeneratedStepsCorrection.svelte';

const importer = vi.hoisted(() => ({
	next: (() => Promise.reject(new Error('réseau coupé'))) as () => Promise<unknown>
}));

vi.mock('$lib/atelier/steps-loader', async () => {
	const { lazyLoader } = await import('$lib/utils/lazy-loader.svelte');
	return { stepsCorrection: lazyLoader(() => importer.next()) };
});

const { default: StepsOnDemand } = await import('../StepsOnDemand.svelte');

const STEPS: readonly RenderedStep[] = [
	{ id: 1, rule: 'reduire', title: 'On réduit', expressionLatex: 'x+x=2x' }
];

describe('StepsOnDemand, reprise après une coupure', () => {
	it('le « Réessayer » réussi d’une ligne rétablit les autres', async () => {
		const first = await render(StepsOnDemand, { steps: STEPS });
		const second = await render(StepsOnDemand, { steps: STEPS });

		// Les deux rendus partagent la page : on lit chaque conteneur à part
		const text = (screen: { container: HTMLElement }) => screen.container.textContent ?? '';
		await vi.waitFor(() => {
			expect(text(first)).toContain("Les étapes n'ont pas pu se charger.");
			expect(text(second)).toContain("Les étapes n'ont pas pu se charger.");
		});

		importer.next = () => Promise.resolve(GeneratedStepsCorrection);
		const retry = first.container.querySelector('button');
		expect(retry?.textContent).toContain('Réessayer');
		retry?.click();

		await vi.waitFor(() => {
			expect(text(first)).toContain('On réduit');
			expect(text(second)).toContain('On réduit');
		});
		expect(text(second)).not.toContain("n'ont pas pu se charger");
	});
});
