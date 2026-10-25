/**
 * Thème et taille d'une diapositive (chantier demo-debug, PR 6i-b)
 *
 * - La couleur du texte suit le fond de la diapositive (couleur unie ou thème
 *   imposé), plus le thème du site.
 * - Une diapositive UbuMark trop longue se réduit pour tenir, jusqu'à moitié ;
 *   au-delà, elle défile.
 */
import { afterEach, describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ThemeDeckHarness from './ThemeDeckHarness.svelte';

// Texte des tokens `--color-foreground` de app.css
const LIGHT_TEXT = 'rgb(26, 26, 26)';
const DARK_TEXT = 'rgb(239, 239, 239)';

async function paragraphColor(container: HTMLElement, selector: string): Promise<string> {
	await expect.poll(() => container.querySelector(selector), { timeout: 5000 }).not.toBeNull();
	return getComputedStyle(container.querySelector(selector) as HTMLElement).color;
}

function lines(count: number): string {
	return Array.from({ length: count }, (_, i) => `Ligne ${i + 1}`).join('\n\n');
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	document.documentElement.style.colorScheme = '';
});

describe('couleur du texte d’une diapositive', () => {
	it('fond sombre, site en thème clair : texte clair', async () => {
		const { container } = await render(ThemeDeckHarness, {
			content: 'Du texte et $x^2$',
			background: '#1a1a2e'
		});
		expect(await paragraphColor(container, '.ubumark-slide p')).toBe(DARK_TEXT);
	});

	it('fond clair, site en thème sombre : texte foncé', async () => {
		document.documentElement.classList.add('dark');
		document.documentElement.style.colorScheme = 'dark';
		const { container } = await render(ThemeDeckHarness, {
			content: 'Du texte',
			background: '#ffffff'
		});
		expect(await paragraphColor(container, '.ubumark-slide p')).toBe(LIGHT_TEXT);
	});

	it('thème imposé sur un dégradé', async () => {
		const { container } = await render(ThemeDeckHarness, {
			content: 'Du texte',
			background: 'linear-gradient(#000, #333)',
			theme: 'sombre'
		});
		expect(await paragraphColor(container, '.ubumark-slide p')).toBe(DARK_TEXT);
	});

	it('diapositive simple sans fond : la couleur du texte du site, plus le blanc', async () => {
		const { container } = await render(ThemeDeckHarness, {});
		expect(await paragraphColor(container, '.texte-simple')).toBe(LIGHT_TEXT);
	});

	it('diapositive simple sur un fond sombre : texte clair', async () => {
		const { container } = await render(ThemeDeckHarness, { background: '#000000' });
		expect(await paragraphColor(container, '.texte-simple')).toBe(DARK_TEXT);
	});

	it('diapositive simple sur un dégradé : blanc, comme avant', async () => {
		const { container } = await render(ThemeDeckHarness, {
			background: 'linear-gradient(to bottom, #283b95, #17b2c3)'
		});
		expect(await paragraphColor(container, '.texte-simple')).toBe('rgb(255, 255, 255)');
	});
});

describe('taille du contenu d’une diapositive UbuMark', () => {
	async function fitOf(container: HTMLElement): Promise<HTMLElement> {
		await expect
			.poll(() => container.querySelector('.ubumark-fit p'), { timeout: 5000 })
			.not.toBeNull();
		return container.querySelector('.ubumark-fit') as HTMLElement;
	}

	it('un contenu court garde sa taille', async () => {
		const { container } = await render(ThemeDeckHarness, { content: '## Titre\n\nUn paragraphe' });
		const fit = await fitOf(container);
		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(getComputedStyle(fit).transform).toBe('none');
	});

	it('un contenu trop long se réduit pour tenir dans la diapositive', async () => {
		const { container } = await render(ThemeDeckHarness, { content: lines(20) });
		const fit = await fitOf(container);
		const box = container.querySelector('.ubumark-slide') as HTMLElement;
		await expect.poll(() => getComputedStyle(fit).transform).not.toBe('none');
		const fitRect = fit.getBoundingClientRect();
		const boxRect = box.getBoundingClientRect();
		expect(fitRect.top).toBeGreaterThanOrEqual(boxRect.top - 1);
		expect(fitRect.bottom).toBeLessThanOrEqual(boxRect.bottom + 1);
	});

	it('au-delà de la moitié, il ne rétrécit plus : il défile', async () => {
		const { container } = await render(ThemeDeckHarness, { content: lines(120) });
		const fit = await fitOf(container);
		const box = container.querySelector('.ubumark-slide') as HTMLElement;
		await expect.poll(() => getComputedStyle(fit).transform).not.toBe('none');
		// matrix(a, b, c, d, e, f) : a = échelle
		const scale = Number(getComputedStyle(fit).transform.split('(')[1].split(',')[0]);
		expect(scale).toBeCloseTo(0.5, 2);
		expect(getComputedStyle(box).overflowY).toBe('auto');
		expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
		// Le haut du contenu reste atteignable (pas coupé au-dessus)
		expect(fit.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			box.getBoundingClientRect().top - 1
		);
	});
});
