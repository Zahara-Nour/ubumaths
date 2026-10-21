/**
 * Bloc ```qr à l'écran (lot 2 des QR codes, `docs/wip/qr-codes-phase0.md`)
 *
 * Le module de dessin est chargé à la demande : chaque test attend l'image.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QrBlock from '../QrBlock.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseQrContent } from '$lib/ubumark/parser/qr-parser';
import { QR_COLORS, encodeQr } from '$lib/qr/qr-code';
import { decodeSvg } from '$lib/qr/__tests__/decode-qr';

async function imageOf(container: HTMLElement): Promise<SVGSVGElement> {
	await expect
		.poll(() => container.querySelector('.qr-bloc svg'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('.qr-bloc svg') as SVGSVGElement;
}

describe('bloc ```qr à l’écran', () => {
	it('dessine le QR stylé de l’adresse canonique, qui se lit', async () => {
		const node = parseQrContent('/glossaire');
		const { container } = await render(QrBlock, { node });
		const svg = await imageOf(container);

		const qr = encodeQr('https://www.chiph.re/glossaire');
		if (!qr) throw new Error('QR attendu');
		const markup = new XMLSerializer().serializeToString(svg);
		expect(await decodeSvg(markup, qr.size)).toBe('https://www.chiph.re/glossaire');
		// Les couleurs de la variante B
		expect(svg.querySelector(`[fill="${QR_COLORS.eyes}"]`)).not.toBeNull();
		expect(svg.querySelector(`[stroke="${QR_COLORS.gidouille}"]`)).not.toBeNull();
	});

	it('dit vers où mène le QR, pour un lecteur d’écran', async () => {
		const { container } = await render(QrBlock, { node: parseQrContent('/glossaire') });
		const svg = await imageOf(container);
		expect(svg.getAttribute('role')).toBe('img');
		expect(svg.getAttribute('aria-label')).toBe('QR code vers https://www.chiph.re/glossaire');
	});

	it('montre la légende et l’adresse en lien', async () => {
		const node = parseQrContent('/glossaire\nlégende: Le glossaire en ligne');
		const { container } = await render(QrBlock, { node });
		await imageOf(container);
		expect(container.textContent).toContain('Le glossaire en ligne');
		const link = container.querySelector('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('https://www.chiph.re/glossaire');
		expect(link.textContent).toContain('www.chiph.re/glossaire');
	});

	it('ouvre un site extérieur avec rel="noopener noreferrer"', async () => {
		const node = parseQrContent('https://fr.wikipedia.org/wiki/Pythagore');
		const { container } = await render(QrBlock, { node });
		await imageOf(container);
		const link = container.querySelector('a') as HTMLAnchorElement;
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		expect(link.getAttribute('target')).toBe('_blank');
	});

	it('règle la largeur selon la taille en cm', async () => {
		const node = parseQrContent('/glossaire\ntaille: 5cm');
		const { container } = await render(QrBlock, { node });
		const svg = await imageOf(container);
		expect(svg.getAttribute('width')).toBe('5cm');
	});
});

describe('bloc ```qr en erreur', () => {
	it('montre le message à l’auteur', async () => {
		const node = parseQrContent('javascript:alert(1)');
		const { container } = await render(QrBlock, { node, showErrors: true });
		expect(container.textContent).toContain('Ligne 1');
		expect(container.querySelector('svg')).toBeNull();
	});

	it('montre un cadre neutre à l’élève', async () => {
		const node = parseQrContent('javascript:alert(1)');
		const { container } = await render(QrBlock, { node, showErrors: false });
		expect(container.textContent).toContain('QR code indisponible');
		expect(container.textContent).not.toContain('Ligne 1');
	});

	it('refuse une adresse trop longue pour un QR lisible', async () => {
		const node = parseQrContent(`https://example.com/${'a'.repeat(600)}`);
		const { container } = await render(QrBlock, { node, showErrors: true });
		await expect
			.poll(() => container.textContent ?? '', { timeout: 5000 })
			.toContain('trop long pour un QR code lisible');
		expect(container.querySelector('svg')).toBeNull();
	});
});

describe('bloc ```qr dans un document', () => {
	it('est rendu par MarkdownRenderer', async () => {
		const { container } = await render(MarkdownRenderer, {
			content: 'Scanne :\n\n```qr\n/glossaire\n```'
		});
		await imageOf(container);
	});
});
