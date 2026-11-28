/**
 * Engrenages à l'écran (outil n° 52, `docs/wip/outil-engrenages-progress.md`)
 *
 * Phase 0 : toutes les dents dessinées ; dans l'énoncé, figure à l'arrêt, sans bouton ;
 * dans une correction (`CorrectionView`), « Voir tourner » fait tourner les roues jusqu'au
 * premier retour des repères, puis une phrase dit les tours de chaque roue.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MarkdownRenderer from '#lib/components/markdown/MarkdownRenderer.svelte';
import CorrectionView from '#lib/components/questions/CorrectionView.svelte';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const BLOC = ['```engrenages', 'roues: 12 ; 18', '```'].join('\n');

describe('bloc ```engrenages à l’écran', () => {
	it('dans l’énoncé : deux roues dessinées, leurs légendes, aucun bouton', async () => {
		const container = mainElement();
		await render(MarkdownRenderer, {
			target: container,
			props: { content: `Deux roues s’engrènent.\n\n${BLOC}` }
		});
		await expect.element(page.getByRole('img', { name: /roue A, 12 dents/ })).toBeVisible();
		expect(container.querySelectorAll('.engrenages-roue')).toHaveLength(2);
		expect(container.querySelectorAll('.engrenages-repere')).toHaveLength(2);
		expect(container.querySelector('svg text')?.textContent).toBe('A');
		expect(container.querySelector('button')).toBeNull();
	});

	it('dans une correction : « Voir tourner », puis les tours de chaque roue', async () => {
		await render(CorrectionView, {
			target: mainElement(),
			props: { markdown: `Le plus petit multiple commun de 12 et 18 est 36.\n\n${BLOC}` }
		});
		const button = page.getByRole('button', { name: 'Voir tourner' });
		await expect.element(button).toBeVisible();
		await button.click();
		await expect.element(page.getByRole('button', { name: 'Arrêter' })).toBeVisible();
		// 2 tours de la grande roue : 3,2 s
		await expect
			.element(page.getByText(/après 36 dents : A a fait 3 tours, B a fait 2 tours/), {
				timeout: 6000
			})
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Revoir tourner' })).toBeVisible();
	});

	it('bloc en erreur : cadre neutre pour l’élève', async () => {
		await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: '```engrenages\nroues: 12\n```' }
		});
		await expect.element(page.getByText('Engrenages indisponibles')).toBeVisible();
	});
});
