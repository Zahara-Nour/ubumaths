/**
 * E10 (chantier ecarts-verifs) : l'affichage des étapes ne dépend pas de leur
 * `id`. Six producteurs d'étapes numérotent chacun à leur façon (0, −1,
 * `steps.length`…) ; deux étapes sœurs de même `id` faisaient planter
 * « Comment ? » (`each_key_duplicate`) au lieu de s'afficher.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { RenderedStep } from '#lib/mathAST/common/step-renderer-base.ts';
import GeneratedStepsCorrection from '../GeneratedStepsCorrection.svelte';

const SAME_ID: readonly RenderedStep[] = [
	{
		id: 2,
		rule: 'power',
		title: 'Règle de la puissance',
		subSteps: [
			{ id: 1, rule: 'exp', title: 'Dérivée de l’exponentielle' },
			{ id: 1, rule: 'exp-bis', title: 'Sous-étape au même id' }
		]
	},
	{ id: 2, rule: 'simplify', title: 'On simplifie' }
];

describe('GeneratedStepsCorrection : étapes de même id', () => {
	it('affiche toutes les étapes, dans l’ordre', async () => {
		const screen = await render(GeneratedStepsCorrection, { steps: SAME_ID });
		await expect.element(screen.getByText('On simplifie')).toBeInTheDocument();
		await expect.element(screen.getByText('Sous-étape au même id')).toBeInTheDocument();
		const titles = [...screen.container.querySelectorAll('.step-title')].map((el) =>
			el.textContent?.trim()
		);
		expect(titles).toEqual([
			'Règle de la puissance',
			'Dérivée de l’exponentielle',
			'Sous-étape au même id',
			'On simplifie'
		]);
	});
});
