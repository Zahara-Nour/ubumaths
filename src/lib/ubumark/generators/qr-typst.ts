/**
 * Bloc ```qr → Typst
 * ==================
 *
 * La matrice est dessinée par Typst lui-même : un rectangle noir par suite de
 * modules sombres d'une même rangée, dans une boîte blanche à la taille
 * demandée. Ni fichier image, ni paquet téléchargé : le PDF ne dépend pas du
 * réseau et le code reste net à l'impression.
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

import { encodeQr } from '$lib/qr/qr-code';
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

	const module = node.sizeCm / qr.size;
	const rects: string[] = [];
	qr.data.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			if (!row[x]) {
				x++;
				continue;
			}
			// Une suite de modules sombres : un seul rectangle (pas de joint entre eux)
			let run = 1;
			while (x + run < row.length && row[x + run]) run++;
			rects.push(
				`    #place(dx: ${cm(x * module)}, dy: ${cm(y * module)}, rect(width: ${cm(run * module)}, height: ${cm(module)}, fill: black, stroke: none))`
			);
			x += run;
		}
	});

	const label = node.caption ?? node.url.replace(/^https:\/\//, '');
	return [
		'#align(center)[#block(breakable: false)[',
		`  #box(width: ${cm(node.sizeCm)}, height: ${cm(node.sizeCm)}, fill: white)[`,
		...rects,
		'  ]',
		'  #v(2pt, weak: true)',
		`  #text(size: 8pt, ${typstString(label)})`,
		']]'
	].join('\n');
}
