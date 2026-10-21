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

import { encodeQr, qrSvg } from '$lib/qr/qr-code';
import { QR_UNAVAILABLE, type QrNode } from '../types/qr';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${QR_UNAVAILABLE}]`;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/** Typst d'un bloc ```qr */
export function generateQrTypst(node: QrNode): string {
	if (node.errors.length > 0 || node.url === null) return UNAVAILABLE_TYPST;
	const qr = encodeQr(node.url);
	if (qr === null) return UNAVAILABLE_TYPST;

	const svg = qrSvg(qr, `QR code vers ${node.url}`);

	const label = node.caption ?? node.url.replace(/^https:\/\//, '');
	return [
		'#align(center)[#block(breakable: false)[',
		`  #image(bytes(${typstString(svg)}), format: "svg", width: ${cm(node.sizeCm)})`,
		'  #v(2pt, weak: true)',
		`  #text(size: 8pt, ${typstString(label)})`,
		']]'
	].join('\n');
}
