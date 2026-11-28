/**
 * Le QR code d'une série porte un lien court, que seuls un prof et l'admin créent.
 * Phase 0 : docs/archive/wip/liens-courts-phase0.md (comportements 1 et question 1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';

import SeriesLinkShare from '../SeriesLinkShare.svelte';

const ITEMS = [
	{
		templateId: '11111111-1111-4111-8111-111111111111',
		quantity: 4,
		delay: 20
	}
];

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

function qrButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="QR code de la série"]') as HTMLButtonElement;
}

function mockServer() {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
		new Response(JSON.stringify({ code: 'Xk7pQ2mZ', path: '/l/Xk7pQ2mZ' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		})
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('le QR code d’une série', () => {
	it('prof ou admin : le QR porte le lien court de la série, demandé avec son chemin', async () => {
		const fetchMock = mockServer();
		const { container } = await render(SeriesLinkShare, {
			items: ITEMS,
			canMakeQr: true
		});
		await userEvent.click(qrButton(container));
		await settle();
		await settle();

		expect(fetchMock).toHaveBeenCalledOnce();
		const [address, init] = fetchMock.mock.calls[0];
		expect(address).toBe('/api/short-links');
		const { target } = JSON.parse(String(init?.body)) as { target: string };
		expect(target).toMatch(/^\/automaths\/panier\?modeles=[!-~]+$/);

		const shown = document.querySelector(
			'input[aria-label="Adresse du QR code"]'
		) as HTMLInputElement;
		expect(shown.value).toBe('https://www.chiph.re/l/Xk7pQ2mZ');
	});

	it('élève ou visiteur : QR indisponible, avec sa raison, sans appel au serveur', async () => {
		const fetchMock = mockServer();
		const { container } = await render(SeriesLinkShare, { items: ITEMS });
		const button = qrButton(container);

		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.getAttribute('title')).toContain('réservé aux profs');
		button.click();
		await settle();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('« Mêmes nombres pour tous » (chantier memes-nombres)', () => {
	const CASE = 'Mêmes nombres pour tous';

	function sameNumbersBox(): HTMLButtonElement | null {
		const label = [...document.querySelectorAll('label')].find(
			(l) => l.textContent?.trim() === CASE
		);
		if (!label) return null;
		return document.getElementById(label.htmlFor) as HTMLButtonElement | null;
	}

	async function chooseForm(container: HTMLElement, name: string) {
		const trigger = container.querySelector('[aria-label="Forme du lien"]') as HTMLButtonElement;
		await userEvent.click(trigger);
		await settle();
		const option = [...document.querySelectorAll('[role="option"]')].find(
			(o) => o.textContent?.trim() === name
		) as HTMLElement;
		await userEvent.click(option);
		await settle();
	}

	async function copiedLink(container: HTMLElement): Promise<URL> {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
		const copy = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Copier le lien')
		) as HTMLButtonElement;
		await userEvent.click(copy);
		await settle();
		const link = String(writeText.mock.calls.at(-1)?.[0]);
		writeText.mockRestore();
		return new URL(link);
	}

	it('sans forme (le lien ouvre « Ma série ») : pas de case', async () => {
		await render(SeriesLinkShare, { items: ITEMS });
		expect(sameNumbersBox()).toBeNull();
	});

	it('avec une forme : case proposée, décochée, le lien ne porte pas de graine', async () => {
		const { container } = await render(SeriesLinkShare, { items: ITEMS });
		await chooseForm(container, 'En classe');

		const box = sameNumbersBox();
		expect(box).not.toBeNull();
		expect(box?.getAttribute('aria-checked')).toBe('false');
		expect((await copiedLink(container)).searchParams.has('graine')).toBe(false);
	});

	it('case cochée : le lien porte une graine, la même à chaque copie', async () => {
		const { container } = await render(SeriesLinkShare, { items: ITEMS });
		await chooseForm(container, 'En classe');
		await userEvent.click(sameNumbersBox()!);
		await settle();

		const first = (await copiedLink(container)).searchParams.get('graine');
		const second = (await copiedLink(container)).searchParams.get('graine');
		expect(first).toMatch(/^\d+$/);
		expect(second).toBe(first);
	});

	it('décochée puis recochée : une nouvelle graine', async () => {
		const { container } = await render(SeriesLinkShare, { items: ITEMS });
		await chooseForm(container, 'Flash-cards');
		const box = sameNumbersBox()!;
		await userEvent.click(box);
		await settle();
		const first = (await copiedLink(container)).searchParams.get('graine');

		const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
		await userEvent.click(box);
		await settle();
		expect((await copiedLink(container)).searchParams.has('graine')).toBe(false);
		await userEvent.click(box);
		await settle();
		const second = (await copiedLink(container)).searchParams.get('graine');
		random.mockRestore();

		expect(second).toMatch(/^\d+$/);
		expect(second).not.toBe(first);
	});

	it('retour à « Sans forme » : case retirée, le lien ne porte plus de graine', async () => {
		const { container } = await render(SeriesLinkShare, { items: ITEMS });
		await chooseForm(container, 'En classe');
		await userEvent.click(sameNumbersBox()!);
		await settle();
		await chooseForm(container, 'Sans forme (ouvre « Ma série »)');

		expect(sameNumbersBox()).toBeNull();
		const url = await copiedLink(container);
		expect(url.pathname).toBe('/automaths/panier');
		expect(url.searchParams.has('graine')).toBe(false);
	});
});
