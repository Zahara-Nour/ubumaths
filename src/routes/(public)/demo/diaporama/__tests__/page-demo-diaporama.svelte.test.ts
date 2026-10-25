/**
 * Vitrine — le diaporama (`/demo/diaporama`)
 * Comportements validés par David le 2026-10-25 (docs/wip/demo-debug-progress.md, PR 6i).
 *
 * - un visiteur voit le titre, le retour vers `/demo` et un diaporama de 13 diapositives ;
 * - le bloc Python est coloré et s'ouvre dans `/python` ;
 * - le cercle trigonométrique et la figure de géométrie sont dessinés ;
 * - le minuteur : deux questions de 10 s, la barre se vide, puis la correction ;
 * - la dernière diapositive mène aux démonstrations et à l'Atelier.
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import Page from '../+page.svelte';

// Constantes
const NEXT = 'Diapositive horizontale suivante';
const DOWN = 'Diapositive verticale suivante';
// Positions dans le diaporama (0 = la première diapositive)
const EXPANSION_SLIDE = 4;
const TIMER_SLIDE = 9;

// Functions
function activeSlide(container: HTMLElement): HTMLElement | null {
	return container.querySelector<HTMLElement>('.slide.active');
}

async function goRight(times: number) {
	for (let i = 0; i < times; i++) {
		await page.getByRole('button', { name: NEXT }).click();
	}
}

describe('/demo/diaporama', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('montre au visiteur le titre, le retour vers /demo et 13 diapositives', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Le diaporama');
		await expect
			.element(page.getByRole('link', { name: 'Retour aux démonstrations' }))
			.toHaveAttribute('href', '/demo');
		const container = screen.container.querySelector('.slides-container');
		expect(container?.children).toHaveLength(13);
		expect(activeSlide(screen.container)?.textContent).toMatch(/flèches/);
	});

	it('développe (x+1)² tout seul, une ligne toutes les 2 s', async () => {
		const screen = await render(Page);
		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();

		// Les lignes sont marquées une fois le rendu ubumark fait (avant les faux minuteurs :
		// expect.poll attend avec setTimeout)
		const slide = () =>
			screen.container.querySelector('.slides-container')?.children[EXPANSION_SLIDE];
		const lines = () => [...(slide()?.querySelectorAll('.fragment') ?? [])];
		await expect.poll(() => lines().length).toBe(3);

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		await goRight(EXPANSION_SLIDE);
		flushSync();
		expect(activeSlide(screen.container)).toBe(slide());
		const visible = () => lines().filter((l) => l.classList.contains('visible')).length;
		expect(visible()).toBe(0);

		vi.advanceTimersByTime(2000);
		flushSync();
		expect(visible()).toBe(1);
		vi.advanceTimersByTime(4000);
		flushSync();
		expect(visible()).toBe(3);
	});

	it('colore le bloc Python et le relie à la page Python', async () => {
		const screen = await render(Page);

		await expect
			.poll(() => screen.container.querySelectorAll('code .hljs-keyword').length)
			.toBeGreaterThan(0);
		const link = screen.container.querySelector<HTMLAnchorElement>('a[href^="/python?code="]');
		expect(link?.textContent?.trim()).toBe('Ouvrir dans Python');
	});

	it('dessine le cercle trigonométrique et la figure de géométrie', async () => {
		const screen = await render(Page);

		await expect.poll(() => screen.container.querySelectorAll('.trig-circle-svg').length).toBe(1);
		expect(screen.container.querySelector('.trig-erreur')).toBeNull();
		await expect
			.poll(() => screen.container.querySelectorAll('svg.geometry-canvas').length)
			.toBe(1);
	});

	it('enchaîne deux questions de 10 s, la barre se vide, puis montre la correction', async () => {
		const screen = await render(Page);
		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();

		await goRight(TIMER_SLIDE);
		expect(activeSlide(screen.container)?.textContent).toMatch(/10 secondes/);

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		await page.getByRole('button', { name: DOWN }).click();
		flushSync();
		expect(activeSlide(screen.container)?.textContent).toMatch(/Question 1/);
		const bar = () =>
			activeSlide(screen.container)?.querySelector<HTMLElement>('[data-testid="chrono-fill"]');
		expect(bar()?.style.width).toBe('100%');

		vi.advanceTimersByTime(5000);
		flushSync();
		expect(parseFloat(bar()?.style.width ?? '')).toBeCloseTo(50, 0);

		vi.advanceTimersByTime(5000);
		flushSync();
		expect(activeSlide(screen.container)?.textContent).toMatch(/Question 2/);

		vi.advanceTimersByTime(10000);
		flushSync();
		const correction = activeSlide(screen.container)?.textContent ?? '';
		expect(correction).toMatch(/Correction/);
		expect(correction).toMatch(/8 = 56/);
		expect(correction).toMatch(/div 4 = 20/);
	});

	it('finit sur les liens vers les démonstrations et l’Atelier', async () => {
		const screen = await render(Page);
		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();

		await goRight(12);
		const last = activeSlide(screen.container);
		expect(last?.querySelector('a[href="/demo"]')).not.toBeNull();
		expect(last?.querySelector('a[href="/atelier"]')).not.toBeNull();
	});
});
