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
