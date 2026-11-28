/**
 * Bloc ```python-a-ecrire → Typst
 * ===============================
 *
 * Une question « programme Python » se fait à l'écran (le programme tourne dans le
 * navigateur) : la fiche imprime le programme de départ en bloc de code, sans éditeur, ou
 * la consigne « Écris la fonction … » s'il n'y en a pas. Jamais la solution de l'auteur.
 *
 * Un bloc en erreur devient le cadre neutre « Programme Python indisponible » — jamais une
 * erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/python-a-ecrire-typst
 */

import type { PythonAEcrireNode } from '../types/python-a-ecrire';

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

/** Message de la fiche pour un bloc en erreur */
export const PYTHON_A_ECRIRE_UNAVAILABLE = 'Programme Python indisponible';

/** Une suite de ``` plus longue que toute suite d'accents graves du code (bloc brut Typst) */
function rawFence(code: string): string {
	const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
	return '`'.repeat(Math.max(3, longest + 1));
}

/** Typst d'un bloc ```python-a-ecrire : le départ en code, ou la fonction à écrire */
export function generatePythonAEcrireTypst(node: PythonAEcrireNode): string {
	if (node.errors.length > 0 || node.spec === null) {
		return `#block(${FRAME})[${PYTHON_A_ECRIRE_UNAVAILABLE}]`;
	}
	const { depart, fonction } = node.spec;
	if (depart.trim() === '') {
		return `#block(${FRAME})[Écris en Python la fonction #raw("${fonction}"), à l’écran.]`;
	}
	const fence = rawFence(depart);
	return `${fence}python\n${depart}\n${fence}`;
}
