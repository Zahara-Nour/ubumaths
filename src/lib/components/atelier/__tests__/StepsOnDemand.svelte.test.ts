/**
 * Les étapes chargées au premier dépliage : ce que l'élève lit pendant le
 * chargement, après, et quand le chargement échoue.
 *
 * Le chargeur est remplacé par un double piloté à la main : le vrai
 * `import()` réussit toujours en test, on ne verrait jamais l'échec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Component } from 'svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import GeneratedStepsCorrection from '$lib/components/questions/GeneratedStepsCorrection.svelte';

type StepsComponent = Component<{ steps: readonly RenderedStep[] }>;

const fake = vi.hoisted(() => ({
	loaded: undefined as unknown,
	load: (() => Promise.reject(new Error('non piloté'))) as () => Promise<unknown>
}));

vi.mock('$lib/atelier/steps-loader', () => ({ stepsCorrection: fake }));

const { default: StepsOnDemand } = await import('../StepsOnDemand.svelte');

const STEPS: readonly RenderedStep[] = [
	{ id: 1, rule: 'reduire', title: 'On réduit', expressionLatex: 'x+x=2x' }
];

function deferred() {
	let resolve!: (value: StepsComponent) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<StepsComponent>((ok, ko) => {
		resolve = ok;
		reject = ko;
	});
	return { promise, resolve, reject };
}

beforeEach(() => {
	fake.loaded = undefined;
});

describe('StepsOnDemand', () => {
	it('annonce le chargement, puis affiche les étapes', async () => {
		const pending = deferred();
		fake.load = () => pending.promise;

		const screen = await render(StepsOnDemand, { steps: STEPS });
		await expect.element(screen.getByRole('status')).toHaveTextContent('Chargement des étapes…');

		pending.resolve(GeneratedStepsCorrection as StepsComponent);

		await expect.element(screen.getByText('On réduit')).toBeVisible();
		await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
	});

	it('affiche aussitôt les étapes quand le composant est déjà chargé', async () => {
		fake.loaded = GeneratedStepsCorrection;
		const load = vi.fn(() => Promise.resolve(GeneratedStepsCorrection));
		fake.load = load;

		const screen = await render(StepsOnDemand, { steps: STEPS });

		expect(screen.container.textContent).toContain('On réduit');
		expect(screen.container.textContent).not.toContain('Chargement');
		expect(load).not.toHaveBeenCalled();
	});

	it('dit l’échec et réessaie à la demande', async () => {
		const first = deferred();
		const second = deferred();
		const attempts = [first.promise, second.promise];
		fake.load = () => attempts.shift() ?? Promise.reject(new Error('trop d’essais'));

		const screen = await render(StepsOnDemand, { steps: STEPS });
		first.reject(new Error('réseau coupé'));

		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent("Les étapes n'ont pas pu se charger.");

		await screen.getByRole('button', { name: 'Réessayer' }).click();
		await expect.element(screen.getByRole('status')).toHaveTextContent('Chargement des étapes…');

		second.resolve(GeneratedStepsCorrection as StepsComponent);
		await expect.element(screen.getByText('On réduit')).toBeVisible();
	});
});
