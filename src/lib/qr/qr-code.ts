/**
 * QR codes vers les pages et les ressources du site
 * =================================================
 *
 * Fabriqués dans le navigateur par `uqr` (aucun service extérieur : l'adresse
 * ne quitte pas le site). Phase 0 : `docs/wip/qr-codes-phase0.md`.
 *
 * Module pur : la fenêtre (`QrCodeButton.svelte`) et les tests l'importent.
 *
 * @module qr/qr-code
 */

import { encode } from 'uqr';

// ============================================================================
// TYPES
// ============================================================================

/** La matrice d'un QR code : `true` pour un module sombre, marge comprise. */
export interface QrMatrix {
	readonly version: number;
	readonly size: number;
	readonly data: readonly (readonly boolean[])[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Correction d'erreur M : 15 % du code peut être abîmé ou masqué. */
export const QR_ECC = 'M';

/** La marge blanche réglementaire autour du code, en modules. */
export const QR_BORDER = 4;

/**
 * Version la plus grande acceptée (77 modules de côté, 412 octets en
 * correction M). Au-delà, un QR imprimé petit ou photographié de loin ne se
 * lit plus de façon fiable : on refuse plutôt que d'en donner un illisible.
 */
export const QR_MAX_VERSION = 15;

/** Adresse au-delà de `QR_MAX_VERSION` (bloc ```qr) */
export const QR_TOO_LONG_MESSAGE = 'Ce lien est trop long pour un QR code lisible.';

// ============================================================================
// FONCTIONS
// ============================================================================

/** La matrice du QR code de `text`, ou `null` si le texte est trop long. */
export function encodeQr(text: string): QrMatrix | null {
	try {
		const { version, size, data } = encode(text, {
			ecc: QR_ECC,
			border: QR_BORDER,
			maxVersion: QR_MAX_VERSION
		});
		return { version, size, data };
	} catch {
		// `uqr` lève une erreur quand le texte ne tient dans aucune version permise
		return null;
	}
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Le tracé SVG des modules sombres, un module par unité (repère du `viewBox`) */
export function qrPath(qr: QrMatrix): string {
	let path = '';
	qr.data.forEach((row, y) => {
		row.forEach((dark, x) => {
			if (dark) path += `M${x} ${y}h1v1h-1z`;
		});
	});
	return path;
}

/**
 * Le QR code en SVG autonome : un module par unité, fond blanc, modules noirs.
 * Noir sur blanc quel que soit le thème : un QR inversé se lit mal.
 */
export function qrSvg(qr: QrMatrix, title: string): string {
	const path = qrPath(qr);
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" shape-rendering="crispEdges">` +
		`<title>${escapeXml(title)}</title>` +
		`<rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/>` +
		`<path d="${path}" fill="#000000"/>` +
		`</svg>`
	);
}

/** Un nom de fichier parlant : `qr-aire-du-disque.png`. */
export function qrFileName(resource: string, extension: 'png' | 'svg'): string {
	const slug = resource
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return `qr-${slug || 'chiphre'}.${extension}`;
}
