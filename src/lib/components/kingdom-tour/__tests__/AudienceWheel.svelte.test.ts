/**
 * La roue des publics : un bouton qui ouvre trois liens. Au survol de la souris elle
 * s'ouvre seule ; au clavier, Entrée l'ouvre et Échap la referme en rendant le focus.
 */
import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AudienceWheel from '../AudienceWheel.svelte';

// Functions

async function renderWheel(props: Record<string, unknown> = {}) {
	const screen = await render(AudienceWheel, { props });
	const toggle = screen.getByRole('button', { name: /Choisir sa visite|Fermer/ });
	const nav = screen.container.querySelector('nav') as HTMLElement;
	return { screen, toggle, nav };
}

describe('AudienceWheel', () => {
	it('fermée : trois liens, inertes tant qu’elle ne s’ouvre pas', async () => {
		const { screen, toggle, nav } = await renderWheel();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(nav.inert).toBe(true);
		const hrefs = [...screen.container.querySelectorAll('nav a')].map((a) =>
			a.getAttribute('href')
		);
		expect(hrefs).toEqual([
			expect.stringMatching(/\/eleves$/),
			expect.stringMatching(/\/parents$/),
			expect.stringMatching(/\/professeurs$/)
		]);
	});

	it('marque la vue où l’on se trouve', async () => {
		const { screen } = await renderWheel({ current: 'parent' });
		const current = screen.container.querySelector('a[aria-current="page"]');
		expect(current?.textContent).toMatch(/Parent/);
	});

	it('au clavier : Entrée ouvre, Échap referme et rend le focus au bouton', async () => {
		const { toggle, nav } = await renderWheel();
		(toggle.element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(nav.inert).toBe(false);
		await userEvent.keyboard('{Escape}');
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(document.activeElement).toBe(toggle.element());
	});

	it('à la souris : le survol suffit à l’ouvrir, et un clic ne la referme pas', async () => {
		const { toggle } = await renderWheel();
		await userEvent.hover(toggle);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await userEvent.click(toggle);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('à la souris : elle se referme peu après qu’on la quitte', async () => {
		const { toggle } = await renderWheel();
		await userEvent.hover(toggle);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await userEvent.unhover(toggle);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('l’invitation « Tu es… ? » s’efface quand la roue s’ouvre', async () => {
		const { screen, toggle } = await renderWheel({ invite: true });
		expect(screen.container.textContent).toMatch(/Tu es… \?/);
		(toggle.element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(screen.container.textContent).not.toMatch(/Tu es… \?/);
	});

	describe('au bout d’une minute (WCAG 2.2.2)', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('la flamme cesse de vaciller : plus aucune animation sans fin', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const { screen } = await renderWheel();
			const flame = screen.container.querySelector('.flamme') as SVGElement;
			expect(getComputedStyle(flame).animationName).not.toBe('none');
			vi.advanceTimersByTime(59_000);
			await Promise.resolve();
			expect(screen.container.querySelector('.still')).toBeNull();
			vi.advanceTimersByTime(1_000);
			await expect.poll(() => getComputedStyle(flame).animationName).toBe('none');
			const light = screen.container.querySelector('.light') as HTMLElement;
			expect(getComputedStyle(light).animationName).toBe('none');
		});
	});
});
