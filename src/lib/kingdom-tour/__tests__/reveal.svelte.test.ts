/**
 * L'apparition au défilement ne cache jamais ce qu'on ne pourra pas voir apparaître.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reveal } from '../reveal';

const created: HTMLElement[] = [];

/** Un bloc placé à `top` px du haut du document */
function block(top: number): HTMLElement {
	const element = document.createElement('div');
	element.style.cssText = `position: absolute; top: ${top}px; height: 100px; width: 100px;`;
	document.body.appendChild(element);
	created.push(element);
	return element;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	while (created.length) created.pop()?.remove();
	window.scrollTo(0, 0);
});

describe('reveal', () => {
	it('un bloc déjà à l’écran reste visible (pas de clignotement)', () => {
		const element = block(0);
		reveal(element);
		expect(element.dataset.reveal).toBeUndefined();
	});

	it('un bloc sous l’écran se cache, puis se montre quand on y arrive', async () => {
		const element = block(window.innerHeight + 2000);
		const action = reveal(element, 120);
		expect(element.dataset.reveal).toBe('pending');
		expect(element.style.getPropertyValue('--reveal-delay')).toBe('120ms');

		element.scrollIntoView();
		await expect.poll(() => element.dataset.reveal).toBe('shown');
		action?.destroy?.();
	});

	it('atteint au clavier avant d’être à l’écran : il se montre aussitôt', () => {
		const element = block(window.innerHeight + 2000);
		const link = element.appendChild(document.createElement('a'));
		link.href = '#';
		reveal(element);
		expect(element.dataset.reveal).toBe('pending');
		link.focus({ preventScroll: true });
		expect(element.dataset.reveal).toBe('shown');
	});

	it('une fois apparu, il rend la main à ses transitions (plus d’attribut ni de retard)', () => {
		const element = block(window.innerHeight + 2000);
		const link = element.appendChild(document.createElement('a'));
		link.href = '#';
		reveal(element, 90);
		link.focus({ preventScroll: true });
		element.dispatchEvent(new Event('transitionend'));
		expect(element.dataset.reveal).toBeUndefined();
		expect(element.style.getPropertyValue('--reveal-delay')).toBe('');
	});

	it('moins d’animations demandé : rien ne se cache', () => {
		vi.spyOn(window, 'matchMedia').mockImplementation(
			(query: string) => ({ matches: query.includes('reduce'), media: query }) as MediaQueryList
		);
		const element = block(window.innerHeight + 2000);
		reveal(element);
		expect(element.dataset.reveal).toBeUndefined();
	});

	it('sans IntersectionObserver : rien ne se cache', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		const element = block(window.innerHeight + 2000);
		reveal(element);
		expect(element.dataset.reveal).toBeUndefined();
	});
});
