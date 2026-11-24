import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';

/**
 * Lire un QR code comme un téléphone
 * ==================================
 *
 * « Scanner au téléphone » = décoder l'IMAGE du QR avec `jsqr`, sans passer par
 * le texte du SVG : l'élément est photographié (capture PNG, rendu réel du
 * navigateur) ou le fichier téléchargé est relu, puis dessiné dans un canvas
 * d'une page à part où `jsQR` est chargé. La lecture refuse les QR inversés
 * (`dontInvert`) : un QR blanc sur noir se lit mal sur un vrai téléphone.
 */

export const QR_SHOTS_DIR = resolve('.captures/verifs/qr');

const JSQR_FILE = resolve('node_modules/jsqr/dist/jsQR.js');

interface JsQrWindow {
	jsQR: (
		data: Uint8ClampedArray,
		width: number,
		height: number,
		options?: { inversionAttempts?: string }
	) => { data: string } | null;
}

/** Page vierge où jsQR est chargé, dans le même contexte que `page`. */
async function decoderPage(page: Page): Promise<Page> {
	const reader = await page.context().newPage();
	await reader.setContent('<!doctype html><html><body></body></html>');
	await reader.addScriptTag({ path: JSQR_FILE });
	return reader;
}

/**
 * Le texte lu dans une image (URL `data:` ou PNG/SVG en octets), ou `null` si
 * aucun QR noir sur blanc n'y est lisible. `side` : côté de dessin en pixels
 * (un SVG sans taille propre y est mis à l'échelle ; un PNG est lu tel quel).
 */
export async function decodeQrFromDataUrl(page: Page, dataUrl: string): Promise<string | null> {
	const reader = await decoderPage(page);
	try {
		return await reader.evaluate(async (src) => {
			const image = new Image(900, 900);
			const loaded = new Promise<boolean>((done) => {
				image.onload = () => done(true);
				image.onerror = () => done(false);
			});
			image.src = src;
			if (!(await loaded)) return null;
			const width = src.startsWith('data:image/svg') ? 900 : image.naturalWidth;
			const height = src.startsWith('data:image/svg') ? 900 : image.naturalHeight;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			if (!context) return null;
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, width, height);
			context.drawImage(image, 0, 0, width, height);
			const pixels = context.getImageData(0, 0, width, height);
			const win = window as unknown as JsQrWindow;
			return (
				win.jsQR(pixels.data, width, height, { inversionAttempts: 'dontInvert' })?.data ?? null
			);
		}, dataUrl);
	} finally {
		await reader.close();
	}
}

export function pngDataUrl(png: Buffer): string {
	return `data:image/png;base64,${png.toString('base64')}`;
}

export function svgDataUrl(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Photographie l'élément (ce que voit l'œil) et décode la capture. */
export async function decodeQrOnScreen(
	page: Page,
	element: Locator,
	shotName?: string
): Promise<string | null> {
	const png = await element.screenshot(
		shotName ? { path: resolve(QR_SHOTS_DIR, `${shotName}.png`) } : {}
	);
	return decodeQrFromDataUrl(page, pngDataUrl(png));
}

/** Le chemin (sans l'origine) d'une adresse décodée : on la visite sur le serveur local. */
export function pathOf(address: string): string {
	const url = new URL(address);
	return url.pathname + url.search;
}

/**
 * Tous les QR noir sur blanc d'une image (page de PDF rendue à 300 dpi) : chaque
 * QR lu est blanchi avant la lecture du suivant. `widthPx` : côté du symbole
 * (sans la marge), mesuré entre ses coins haut-gauche et haut-droit.
 */
export async function decodeQrsInPage(
	page: Page,
	dataUrl: string
): Promise<{ data: string; widthPx: number }[]> {
	const reader = await decoderPage(page);
	try {
		return await reader.evaluate(async (src) => {
			const image = new Image();
			const loaded = new Promise<boolean>((done) => {
				image.onload = () => done(true);
				image.onerror = () => done(false);
			});
			image.src = src;
			if (!(await loaded)) return [];
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) return [];
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0);
			const win = window as unknown as {
				jsQR: (
					data: Uint8ClampedArray,
					width: number,
					height: number,
					options?: { inversionAttempts?: string }
				) => {
					data: string;
					location: {
						topLeftCorner: { x: number; y: number };
						topRightCorner: { x: number; y: number };
						bottomLeftCorner: { x: number; y: number };
						bottomRightCorner: { x: number; y: number };
					};
				} | null;
			};
			const found: { data: string; widthPx: number }[] = [];
			for (let i = 0; i < 10; i++) {
				const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
				const code = win.jsQR(pixels.data, canvas.width, canvas.height, {
					inversionAttempts: 'dontInvert'
				});
				if (!code) break;
				const {
					topLeftCorner: a,
					topRightCorner: b,
					bottomLeftCorner: c,
					bottomRightCorner: d
				} = code.location;
				found.push({ data: code.data, widthPx: Math.hypot(b.x - a.x, b.y - a.y) });
				const xs = [a.x, b.x, c.x, d.x];
				const ys = [a.y, b.y, c.y, d.y];
				const pad = 60;
				const x = Math.min(...xs) - pad;
				const y = Math.min(...ys) - pad;
				context.fillStyle = '#ffffff';
				context.fillRect(x, y, Math.max(...xs) - x + pad, Math.max(...ys) - y + pad);
			}
			return found;
		}, dataUrl);
	} finally {
		await reader.close();
	}
}

/** Nombre de pixels « ambre » (yeux du QR stylé) d'un PNG : rouge fort, vert moyen, bleu faible. */
export async function countAmberPixels(page: Page, dataUrl: string): Promise<number> {
	const reader = await decoderPage(page);
	try {
		return await reader.evaluate(async (src) => {
			const image = new Image();
			const loaded = new Promise<boolean>((done) => {
				image.onload = () => done(true);
				image.onerror = () => done(false);
			});
			image.src = src;
			if (!(await loaded)) return 0;
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) return 0;
			context.drawImage(image, 0, 0);
			const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
			let count = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i] > 140 && data[i + 1] > 70 && data[i + 1] < 170 && data[i + 2] < 70) count++;
			}
			return count;
		}, dataUrl);
	} finally {
		await reader.close();
	}
}
