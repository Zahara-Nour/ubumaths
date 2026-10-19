/**
 * Le QR code d'une série porte un lien court, que seuls un prof et l'admin créent.
 * Phase 0 : docs/wip/liens-courts-phase0.md (comportements 1 et question 1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';

import SeriesLinkShare from '../SeriesLinkShare.svelte';

const CATEGORIES = [
	{
		category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
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
			categories: CATEGORIES,
			canMakeQr: true
		});
		await userEvent.click(qrButton(container));
		await settle();
		await settle();

		expect(fetchMock).toHaveBeenCalledOnce();
		const [address, init] = fetchMock.mock.calls[0];
		expect(address).toBe('/api/short-links');
		const { target } = JSON.parse(String(init?.body)) as { target: string };
		expect(target).toMatch(/^\/automaths\/panier\?categories=[!-~]+$/);

		const shown = document.querySelector(
			'input[aria-label="Adresse du QR code"]'
		) as HTMLInputElement;
		expect(shown.value).toBe('https://www.chiph.re/l/Xk7pQ2mZ');
	});

	it('élève ou visiteur : QR indisponible, avec sa raison, sans appel au serveur', async () => {
		const fetchMock = mockServer();
		const { container } = await render(SeriesLinkShare, { categories: CATEGORIES });
		const button = qrButton(container);

		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.getAttribute('title')).toContain('réservé aux profs');
		button.click();
		await settle();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
