/**
 * Bloc ```operation → Typst
 * =========================
 *
 * Une table Typst native (carreaux de cahier) construite depuis la MÊME scène
 * que l'écran (`buildOperationScene`) : mêmes colonnes, mêmes retenues.
 *
 * Sur papier, l'élève écrit ses retenues où il veut : les cases de retenue
 * à remplir ne sont pas dessinées, les cases du résultat sont des carreaux
 * vides. En mode résolu (`cases: aucune`), tout est écrit. Multiplication :
 * produits partiels entre les deux traits, + devant le dernier.
 *
 * Seuls des chiffres entrent dans le Typst : rien n'y est lu comme du
 * balisage. Un bloc en erreur devient le cadre neutre « Opération
 * indisponible » — jamais une erreur de compilation (une seule erreur Typst
 * fait échouer toute la fiche).
 *
 * @module ubumark/generators/operation-typst
 */

import { buildOperationScene, type OperationMark } from '../utils/operation-scene';
import { OPERATION_UNAVAILABLE, type OperationNode } from '../types/operation';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${OPERATION_UNAVAILABLE}]`;

/** Côté d'un carreau */
const CELL = '0.7cm';

const SIGN = { '+': '+', '-': '−', '×': '×' } as const;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Petite écriture à placer : rien pour une case à remplir (papier libre) */
const small = (mark: OperationMark | null) =>
	mark === null || mark.blank || mark.text === '' ? null : `text(size: 7pt)[${mark.text}]`;

/** Un carreau : chiffre au centre, petite retenue en haut à gauche, virgule en bas à droite */
function cell(
	digit: string,
	options: { struck?: boolean; mark?: string | null; comma?: boolean } = {}
): string {
	const parts: string[] = [];
	if (digit !== '') parts.push(options.struck ? `strike(stroke: 1pt)[${digit}]` : `[${digit}]`);
	if (options.mark) parts.push(`place(top + left, dx: 1.5pt, dy: 1pt, ${options.mark})`);
	if (options.comma)
		parts.push('place(bottom + right, dx: 2.5pt, dy: -3pt, text(weight: "bold")[,])');
	if (parts.length === 0) return '[]';
	return `[#${parts.join(' #')}]`;
}

/** Typst d'un bloc ```operation */
export function generateOperationTypst(node: OperationNode): string {
	if (node.errors.length > 0 || node.spec === null) return UNAVAILABLE_TYPST;
	const scene = buildOperationScene(node.spec);

	const cells: string[] = [];
	/** Une rangée de petites écritures (retenues), chacune en bas de son carreau */
	const marksRow = (marks: readonly (OperationMark | null)[]) => {
		cells.push('[]');
		for (const mark of marks) {
			const text = small(mark);
			cells.push(text === null ? '[]' : `align(center + bottom, ${text})`);
		}
	};
	marksRow(scene.above);
	scene.terms.forEach((row, r) => {
		const last = r === scene.terms.length - 1;
		cells.push(last ? `[${SIGN[scene.operator]}]` : '[]');
		for (const c of row) {
			cells.push(cell(c.digit, { struck: c.struck, mark: small(c.mark), comma: c.comma }));
		}
	});
	if (scene.partialCarries !== null) marksRow(scene.partialCarries);
	scene.partials.forEach((row, r) => {
		cells.push(r === scene.partials.length - 1 ? '[+]' : '[]');
		for (const c of row) cells.push(cell(c.blank ? '' : c.digit));
	});
	cells.push('[]');
	for (const c of scene.result) cells.push(cell(c.blank ? '' : c.digit, { comma: c.comma }));

	const width = scene.columns + 1;
	const firstLine = scene.terms.length + 1;
	const lines = [`  table.hline(y: ${firstLine}, stroke: 1.2pt + black),`];
	if (scene.partials.length > 0) {
		const secondLine = firstLine + (scene.partialCarries === null ? 0 : 1) + scene.partials.length;
		lines.push(`  table.hline(y: ${secondLine}, stroke: 1.2pt + black),`);
	}
	return [
		'#align(center)[#block(breakable: false)[',
		'#set text(size: 13pt)',
		`#table(columns: (${CELL},) * ${width}, rows: ${CELL}, inset: 0pt, align: center + horizon, stroke: 0.4pt + luma(180),`,
		...lines,
		`  ${cells.join(', ')}`,
		')',
		']]'
	].join('\n');
}
