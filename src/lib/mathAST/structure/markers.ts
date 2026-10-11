/**
 * Marqueurs `\class{ubs-n<id>}{…}` du LaTeX structuré
 * ===================================================
 *
 * MathLive rend un `<span class="ubs-n<id>">` par marqueur, sans changer la mise
 * en page (mesuré le 2026-10-11 ; `\htmlData` décalait `2\sin x`).
 */
import type { ExpressionStructure, StructureNode } from './types';

// Constantes
export const MARKER_PREFIX = 'ubs-n';

const MARKER_OPENING = new RegExp(`^\\\\class\\{${MARKER_PREFIX}\\d+\\}\\{`);

// Fonctions
/** Enveloppe le LaTeX d'une sous-expression dans son marqueur */
export function markLatex(id: number, latex: string): string {
	return `\\class{${MARKER_PREFIX}${id}}{${latex}}`;
}

/** Identifiant de sous-expression porté par une liste de classes CSS, ou `null` */
export function markerIdFromClasses(classes: Iterable<string>): number | null {
	for (const c of classes) {
		if (!c.startsWith(MARKER_PREFIX)) continue;
		const id = Number(c.slice(MARKER_PREFIX.length));
		if (Number.isInteger(id) && id >= 0) return id;
	}
	return null;
}

/** Retire les marqueurs : `\class{ubs-n3}{x} + 1` → `x + 1` */
export function stripMarkers(latex: string): string {
	let result = '';
	// Pour chaque accolade ouverte : est-ce celle d'un marqueur (à retirer) ?
	const openings: boolean[] = [];
	let i = 0;
	while (i < latex.length) {
		const marker = latex[i] === '\\' ? MARKER_OPENING.exec(latex.slice(i)) : null;
		if (marker) {
			openings.push(true);
			i += marker[0].length;
		} else if (latex[i] === '\\') {
			// Commande ou caractère échappé (`\{`, `\}`) : recopié tel quel
			result += latex.slice(i, i + 2);
			i += 2;
		} else {
			if (latex[i] === '{') openings.push(false);
			if (latex[i] === '}' && openings.pop() === true) {
				i++;
				continue;
			}
			result += latex[i];
			i++;
		}
	}
	return result;
}

/** La sous-expression et toutes celles qui la contiennent, jusqu'à l'expression entière */
export function ancestors(structure: ExpressionStructure, id: number): StructureNode[] {
	const result: StructureNode[] = [];
	let current: StructureNode | undefined = structure.nodes[id];
	while (current) {
		result.push(current);
		current = current.parent === null ? undefined : structure.nodes[current.parent];
	}
	return result;
}
