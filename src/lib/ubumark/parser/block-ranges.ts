/**
 * Les lignes que le parseur lit comme blocs (Q60)
 * ===============================================
 *
 * Partagé par `parseMarkdown` (formules non extraites de ces lignes) et le
 * pré-passage des fences indentées (Q65 : un `$$` situé dans un de ces blocs
 * n'est plus une formule, il ne doit plus bloquer les fences indentées).
 *
 * @module ubumark/parser/block-ranges
 */

import { findCodeBlocks } from './code-block-parser';
import { findVariationBlocks } from './variation-table-parser';
import { findProbTreeBlocks } from './probability-tree-parser';
import { findTrigCircleBlocks } from './trig-circle-parser';
import { findNumberLineBlocks } from './number-line-parser';
import { findCourbeBlocks } from './courbe-parser';
import { findFigureBlocks } from './figure-parser';
import { findStatChartBlocks } from './stat-chart-parser';

/**
 * La fin d'un bloc spécial : ``` seul, à la marge — la même règle que les
 * `isBlockEnd` de leurs parseurs (revue : `~~~` passait pour une fin)
 */
export const isSpecialBlockEnd = (line: string | undefined) =>
	line !== undefined && /^```\s*$/.test(line);

/**
 * Les lignes que le parseur lit comme BLOCS (Q60) : code, ```courbe,
 * ```figure, statistiques, ```variation, ```probtree, ```trig, ```line —
 * chacun selon son propre repérage, comme `parseBlocks`. Triées, fusionnées.
 */
export function blockLineRanges(lines: string[]): [number, number][] {
	const special = [
		...findVariationBlocks(lines),
		...findProbTreeBlocks(lines),
		...findTrigCircleBlocks(lines),
		...findNumberLineBlocks(lines),
		...findCourbeBlocks(lines),
		...findFigureBlocks(lines),
		...findStatChartBlocks(lines)
	].map((r): [number, number] => [r.startIndex, r.endIndex]);
	// Les blocs de code, une fois les blocs spéciaux masqués (comme parseBlocks)
	const masked = lines.map((line, index) =>
		special.some(([start, end]) => index >= start && index <= end) ? '' : line
	);
	// ⚠️ Un bloc de code NON FERMÉ n'est pas protégé (Q60) : il court jusqu'à
	// la fin du document, et un ``` resté seul dans une formule `$$` sur
	// plusieurs lignes aurait changé toute la suite en code. Un bloc spécial
	// non fermé, lui, s'arrête à sa première ligne vide (Q63) : protégé, sinon
	// il affichait `§M:0§` (revue)
	const code = findCodeBlocks(masked)
		.filter((r) => r.closeFence !== undefined && r.endIndex > r.startIndex)
		.map((r): [number, number] => [r.startIndex, r.endIndex]);

	const sorted = [...special, ...code].sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const [start, end] of sorted) {
		const last = merged.at(-1);
		if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
		else merged.push([start, end]);
	}
	return merged;
}
