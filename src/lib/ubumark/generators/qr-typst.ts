/**
 * Bloc ```qr → Typst
 * ==================
 *
 * Le QR stylé (`qrSvg`, le même dessin qu'à l'écran) est posé en image
 * vectorielle, à la taille demandée : `#image(bytes("<svg…>"), format: "svg")`.
 * Ni fichier image, ni paquet téléchargé : le PDF ne dépend pas du réseau et
 * le code reste net à l'impression.
 *
 * Textes (légende, adresse) en chaînes Typst littérales : rien n'y est lu
 * comme du balisage.
 *
 * Un bloc en erreur, ou une adresse trop longue pour un QR lisible, devient
 * le cadre neutre « QR code indisponible » — jamais une erreur de compilation
 * (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/qr-typst
 */

import { encodeQr, qrSvg } from '#lib/qr/qr-code.ts';
import { QR_UNAVAILABLE, type QrNode } from '../types/qr';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${QR_UNAVAILABLE}]`;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
export function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/**
 * L'image Typst du QR stylé de `url`, `width` en cm ; `null` si l'adresse est
 * trop longue pour un QR lisible. Sert au bloc ```qr et à l'en-tête des fiches.
 */
export function qrImageTypst(url: string, widthCm: number): string | null {
	const qr = encodeQr(url);
	if (qr === null) return null;
	const svg = qrSvg(qr, `QR code vers ${url}`);
	return `image(bytes(${typstString(svg)}), format: "svg", width: ${cm(widthCm)})`;
}

/** Typst d'un bloc ```qr */
export function generateQrTypst(node: QrNode): string {
	if (node.errors.length > 0 || node.url === null) return UNAVAILABLE_TYPST;
	const image = qrImageTypst(node.url, node.sizeCm);
	if (image === null) return UNAVAILABLE_TYPST;

	const label = node.caption ?? node.url.replace(/^https:\/\//, '');
	return [
		'#align(center)[#block(breakable: false)[',
		`  #${image}`,
		'  #v(2pt, weak: true)',
		`  #text(size: 8pt, ${typstString(label)})`,
		']]'
	].join('\n');
}
