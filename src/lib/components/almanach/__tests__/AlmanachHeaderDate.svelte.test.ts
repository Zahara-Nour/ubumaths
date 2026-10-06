import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AlmanachHeaderDate from '../AlmanachHeaderDate.svelte';
import {
	EXTRA_DAY_NAMES,
	civilToPataphysical,
	type PataphysicalDate
} from '$lib/almanach/calendar';

/** Rendu dans <main>, comme dans le layout : la taille de police compte */
async function renderInMain(date: PataphysicalDate) {
	const main = document.createElement('main');
	document.body.appendChild(main);
	const screen = await render(AlmanachHeaderDate, { props: { date }, target: main });
	return { screen, main };
}

/** Texte réellement visible (les éléments en display:none n'ont pas de boîte) */
function visibleText(root: Element): string {
	return [...root.querySelectorAll('span')]
		.filter((el) => getComputedStyle(el).display !== 'none')
		.map((el) => el.textContent)
		.join('');
}

afterEach(async () => {
	document.querySelectorAll('main').forEach((m) => m.remove());
	await page.viewport(1280, 800);
});

describe('AlmanachHeaderDate', () => {
	const lumenal13 = civilToPataphysical(2026, 5, 22);

	it('est un lien vers /almanach, au nom explicite pour les lecteurs d’écran', async () => {
		await renderInMain(lumenal13);
		const link = page.getByRole('link', {
			name: '13 Lumenal, An 130 E.R. : ouvrir l’Almanach des Chiphres'
		});
		await expect.element(link).toBeInTheDocument();
		expect(link.element().getAttribute('href')).toMatch(/\/almanach$/);
	});

	it('ordinateur et tablette (≥ sm) : format moyen « 13 Lumenal, An 130 E.R. »', async () => {
		await page.viewport(800, 800);
		const { main } = await renderInMain(lumenal13);
		expect(visibleText(main)).toBe('13 Lumenal, An 130 E.R.');
	});

	it('mobile (< sm) : format court « 13 Lumenal »', async () => {
		await page.viewport(375, 667);
		const { main } = await renderInMain(lumenal13);
		expect(visibleText(main)).toBe('13 Lumenal');
	});

	it('un jour hors-mois garde le formateur de l’Almanach (la Cloche)', async () => {
		await page.viewport(375, 667);
		const cloche = civilToPataphysical(2026, 8, 22);
		expect(cloche).toMatchObject({ kind: 'extra-day', extraDay: 'cloche' });
		const { main } = await renderInMain(cloche);
		expect(visibleText(main)).toBe(EXTRA_DAY_NAMES.cloche);
	});

	it('reste discrète : petit texte (≤ 12 px)', async () => {
		const { main } = await renderInMain(lumenal13);
		const link = main.querySelector('a')!;
		expect(parseFloat(getComputedStyle(link).fontSize)).toBeLessThanOrEqual(12);
	});
});
