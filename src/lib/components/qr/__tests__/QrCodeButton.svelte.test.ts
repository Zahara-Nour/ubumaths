/**
 * Le bouton « QR code » et sa fenêtre — lot 1 de `docs/wip/qr-codes-phase0.md`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';
import QrCodeButton from '../QrCodeButton.svelte';
import { QR_BORDER, encodeQr, qrSvg } from '$lib/qr/qr-code';
import { decodeBlob } from '$lib/qr/__tests__/decode-qr';

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button') as HTMLButtonElement;
}

/** La fenêtre est rendue hors du conteneur (portail) */
function dialog(): HTMLElement {
	return document.querySelector('[role="dialog"]') as HTMLElement;
}

async function openFor(props: Record<string, unknown>) {
	const result = await render(QrCodeButton, props);
	await userEvent.click(trigger(result.container));
	await settle();
	return result;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('le bouton', () => {
	it('se nomme d’après la ressource', async () => {
		const { container } = await render(QrCodeButton, {
			url: '/glossaire',
			label: 'Glossaire'
		});
		expect(trigger(container).getAttribute('aria-label')).toBe('QR code de Glossaire');
	});

	it('est indisponible, avec sa raison, quand il n’y a pas d’adresse', async () => {
		const { container } = await render(QrCodeButton, {
			url: null,
			label: 'la série',
			unavailableReason: 'Le temps limite va de 1 à 60 minutes'
		});
		const button = trigger(container);
		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.getAttribute('title')).toContain('Le temps limite va de 1 à 60 minutes');
		// Playwright refuse de cliquer un élément `aria-disabled` : le clic part du DOM
		button.click();
		await settle();
		expect(dialog()).toBeNull();
	});
});

describe('la fenêtre', () => {
	it('montre le QR de l’adresse CANONIQUE, et cette adresse en clair', async () => {
		await openFor({ url: 'http://localhost:5175/glossaire', label: 'Glossaire' });

		const box = dialog();
		expect(box).not.toBeNull();
		expect(box.textContent).toContain('QR code de Glossaire');
		const shown = box.querySelector('input[aria-label="Adresse du QR code"]') as HTMLInputElement;
		expect(shown.value).toBe('https://www.chiph.re/glossaire');
		const img = box.querySelector('img') as HTMLImageElement;
		expect(img.alt).toBe('QR code vers https://www.chiph.re/glossaire');
		// L'image est exactement le QR de l'adresse canonique
		const qr = encodeQr('https://www.chiph.re/glossaire');
		if (!qr) throw new Error('QR attendu');
		const svg = qrSvg(qr, 'QR code vers https://www.chiph.re/glossaire');
		expect(decodeURIComponent(img.src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''))).toBe(
			svg
		);
	});

	it('copie l’adresse canonique', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		await openFor({ url: '/cours/abc123', label: 'le cours' });

		const copy = [...dialog().querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Copier')
		) as HTMLButtonElement;
		await userEvent.click(copy);
		await settle();

		expect(writeText).toHaveBeenCalledWith('https://www.chiph.re/cours/abc123');
	});

	it('propose le PNG et le SVG', async () => {
		await openFor({ url: '/glossaire', label: 'Glossaire' });
		const labels = [...dialog().querySelectorAll('button')].map((b) => b.textContent ?? '');
		expect(labels.some((l) => l.includes('PNG'))).toBe(true);
		expect(labels.some((l) => l.includes('SVG'))).toBe(true);
	});

	it('télécharge un PNG du QR stylé, qui se lit', async () => {
		let saved: Blob | null = null;
		vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
			saved = blob as Blob;
			return 'blob:qr';
		});
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		await openFor({ url: '/glossaire', label: 'Glossaire' });

		const png = [...dialog().querySelectorAll('button')].find((b) =>
			b.textContent?.includes('PNG')
		) as HTMLButtonElement;
		await userEvent.click(png);
		await expect.poll(() => saved, { timeout: 5000 }).not.toBeNull();

		const blob = saved as unknown as Blob;
		expect(blob.type).toBe('image/png');
		expect(await decodeBlob(blob)).toBe('https://www.chiph.re/glossaire');

		// Le centre d'un œil est ambre : c'est le QR stylé, pas l'ancien noir et blanc
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d') as CanvasRenderingContext2D;
		context.drawImage(bitmap, 0, 0);
		const qr = encodeQr('https://www.chiph.re/glossaire');
		if (!qr) throw new Error('QR attendu');
		const center = Math.round(((QR_BORDER + 3.5) / qr.size) * bitmap.width);
		const [r, g, b] = context.getImageData(center, center, 1, 1).data;
		expect([r, g, b]).toEqual([0xb2, 0x5f, 0x00]);
	});

	it('prévient qu’un QR imprimé avec un jeton ne se reprend pas', async () => {
		await openFor({
			url: '/exercice/aire?token=Ab12Cd34Ef56Gh78',
			label: 'l’exercice',
			containsToken: true
		});
		expect(dialog().textContent).toContain(
			'Ce QR contient le jeton de partage : une fois imprimé, il ne se reprend pas.'
		);
	});

	it('ne prévient de rien sans jeton', async () => {
		await openFor({ url: '/glossaire', label: 'Glossaire' });
		expect(dialog().textContent).not.toContain('jeton');
	});

	it('refuse un lien trop long, sans QR illisible', async () => {
		await openFor({
			url: `/automaths/test?categories=${'%2522x'.repeat(200)}`,
			label: 'la série'
		});
		expect(dialog().textContent).toContain('Ce lien est trop long pour un QR code lisible');
		expect(dialog().querySelector('img')).toBeNull();
		const labels = [...dialog().querySelectorAll('button')].map((b) => b.textContent ?? '');
		expect(labels.some((l) => l.includes('PNG'))).toBe(false);
	});
});

describe('l’adresse fabriquée à l’ouverture (lien court, docs/wip/liens-courts-phase0.md)', () => {
	const LONG = `/automaths/test?categories=${'%2522x'.repeat(200)}`;

	it('porte l’adresse COURTE, canonique, dans le QR et en clair', async () => {
		const resolveUrl = vi.fn(async () => '/l/Xk7pQ2mZ');
		await openFor({ url: LONG, label: 'la série', resolveUrl });

		expect(resolveUrl).toHaveBeenCalledExactlyOnceWith(LONG);
		const shown = dialog().querySelector(
			'input[aria-label="Adresse du QR code"]'
		) as HTMLInputElement;
		expect(shown.value).toBe('https://www.chiph.re/l/Xk7pQ2mZ');
		const img = dialog().querySelector('img') as HTMLImageElement;
		expect(img.alt).toBe('QR code vers https://www.chiph.re/l/Xk7pQ2mZ');
		expect(dialog().textContent).not.toContain('trop long');
	});

	it('ne redemande pas l’adresse en rouvrant la fenêtre', async () => {
		const resolveUrl = vi.fn(async () => '/l/Xk7pQ2mZ');
		const { container } = await openFor({ url: LONG, label: 'la série', resolveUrl });
		await userEvent.keyboard('{Escape}');
		await settle();
		await userEvent.click(trigger(container));
		await settle();
		expect(resolveUrl).toHaveBeenCalledTimes(1);
		expect(dialog().querySelector('img')).not.toBeNull();
	});

	it('après un échec, rouvrir la fenêtre redemande l’adresse', async () => {
		const resolveUrl = vi
			.fn<(url: string) => Promise<string>>()
			.mockRejectedValueOnce(new Error('réseau'))
			.mockResolvedValueOnce('/l/Xk7pQ2mZ');
		const { container } = await openFor({ url: LONG, label: 'la série', resolveUrl });
		expect(dialog().textContent).toContain('QR indisponible');
		await userEvent.keyboard('{Escape}');
		await settle();
		await userEvent.click(trigger(container));
		await settle();
		expect(resolveUrl).toHaveBeenCalledTimes(2);
		expect(dialog().querySelector('img')?.getAttribute('alt')).toBe(
			'QR code vers https://www.chiph.re/l/Xk7pQ2mZ'
		);
	});

	it('une autre série : son propre lien court, jamais celui de la précédente', async () => {
		const OTHER = `${LONG}&mode=flash`;
		const resolveUrl = vi.fn(async (target: string) =>
			target === LONG ? '/l/Xk7pQ2mZ' : '/l/Ab3cD4eF'
		);
		const { container, rerender } = await openFor({ url: LONG, label: 'la série', resolveUrl });
		await userEvent.keyboard('{Escape}');
		await settle();
		await rerender({ url: OTHER });
		await userEvent.click(trigger(container));
		await settle();
		expect(resolveUrl).toHaveBeenLastCalledWith(OTHER);
		expect(dialog().querySelector('img')?.getAttribute('alt')).toBe(
			'QR code vers https://www.chiph.re/l/Ab3cD4eF'
		);
	});

	it('une réponse arrivée pour l’ancienne série est ignorée', async () => {
		const OTHER = `${LONG}&mode=flash`;
		let answerFirst: (url: string) => void = () => {};
		const resolveUrl = vi.fn((target: string) =>
			target === LONG
				? new Promise<string>((resolve) => (answerFirst = resolve))
				: Promise.resolve('/l/Ab3cD4eF')
		);
		const { container, rerender } = await openFor({ url: LONG, label: 'la série', resolveUrl });
		await userEvent.keyboard('{Escape}');
		await settle();
		await rerender({ url: OTHER });
		await userEvent.click(trigger(container));
		await settle();
		answerFirst('/l/Xk7pQ2mZ');
		await settle();
		expect(dialog().querySelector('img')?.getAttribute('alt')).toBe(
			'QR code vers https://www.chiph.re/l/Ab3cD4eF'
		);
	});

	it('serveur muet : « QR indisponible », ni QR ni adresse', async () => {
		const resolveUrl = vi.fn(async () => {
			throw new Error('réseau');
		});
		await openFor({ url: LONG, label: 'la série', resolveUrl });

		expect(dialog().textContent).toContain('QR indisponible pour l’instant, copie le lien.');
		expect(dialog().querySelector('img')).toBeNull();
		expect(dialog().querySelector('input')).toBeNull();
	});

	it('pendant la fabrication : un message, pas de QR', async () => {
		const resolveUrl = vi.fn(() => new Promise<string>(() => {}));
		await openFor({ url: LONG, label: 'la série', resolveUrl });

		expect(dialog().querySelector('[role="status"]')?.textContent).toContain(
			'Fabrication du QR code'
		);
		expect(dialog().querySelector('img')).toBeNull();
	});
});
