/**
 * Sens de `AB` dans les formules en syntaxe maison rendues à l'écran (lot 5 des longueurs)
 *
 * Une carte de question pose le sens résolu de l'instance (`provideCapitalPairs`) ; les
 * formules `~…~` et `$$…$$` en syntaxe maison l'écrivent : en longueur `AB^2`, `ABC` ; en
 * produit ou sans sens (atelier, exercices, instance d'avant), l'écriture d'avant `A B^2`.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CapitalPairsProviderHarness from './CapitalPairsProviderHarness.svelte';
import InlineCapitalPairsHarness from './InlineCapitalPairsHarness.svelte';
import type { CapitalPairs } from '$lib/mathAST/parser/types';

const contenu = 'Dans le triangle ~ABC~, ~AB^2=AC^2+BC^2~.';

/** LaTeX des formules affichées (<math-span>), dans l'ordre. */
async function formules(capitalPairs?: CapitalPairs): Promise<string> {
	const screen = await render(CapitalPairsProviderHarness, {
		props: { content: contenu, ...(capitalPairs ? { capitalPairs } : {}) }
	});
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('math-span').length).toBe(2);
	return [...el.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join(' | ');
}

describe('formules en syntaxe maison — sens de AB posé par la carte', () => {
	it('longueur : AB^2 et le nom de figure ABC, sans espace entre les points', async () => {
		const latex = await formules('length');
		expect(latex).toContain('ABC');
		expect(latex).toContain('AB^2');
		expect(latex).not.toContain('A B');
	});

	it('produit : l’écriture d’avant', async () => {
		expect(await formules('product')).toContain('A B^2');
	});

	it('sans sens (instance d’avant, exercices, atelier) : produit, comme avant', async () => {
		expect(await formules()).toBe(await formules('product'));
	});

	it('le sens suit l’instance sans remontage (passage d’une carte à l’autre)', async () => {
		const screen = await render(CapitalPairsProviderHarness, {
			props: { content: contenu, capitalPairs: 'length' }
		});
		const el = screen.container;
		const latex = () => [...el.querySelectorAll('math-span')].map((m) => m.textContent).join(' | ');
		await expect.poll(latex).toContain('AB^2');
		await screen.rerender({ content: contenu, capitalPairs: 'product' });
		await expect.poll(latex).toContain('A B^2');
	});
});

// Lot 6 : le chat du tuteur, ouvert dans la fenêtre d'un exercice en « longueur », garde
// l'écriture d'avant (produit, Q-M) grâce à `clearCapitalPairs`.
describe('clearCapitalPairs : un rendu enfant revient au produit', () => {
	it('l’exercice écrit AB^2, le rendu qui coupe le sens écrit A B^2', async () => {
		const { default: Harness } = await import('./CapitalPairsClearHarness.svelte');
		const screen = await render(Harness, { props: { content: '~AB^2=9~' } });
		const latexIn = (id: string) =>
			[...screen.container.querySelectorAll(`[data-testid="${id}"] math-span`)]
				.map((m) => m.textContent ?? '')
				.join(' | ');
		await expect.poll(() => latexIn('exercise')).toContain('AB^2');
		await expect.poll(() => latexIn('chat')).toContain('A B^2');
	});

	it('InlineMarkdown : le sens passé en prop l’emporte sur celui de la page (titres d’une liste)', async () => {
		const screen = await render(InlineCapitalPairsHarness, {
			props: { content: 'Exercice ~AB^2~', pageCapitalPairs: 'length', capitalPairs: 'product' }
		});
		const el = screen.container;
		await expect.poll(() => el.querySelector('math-span')?.textContent ?? '').toContain('A B^2');
	});
});
