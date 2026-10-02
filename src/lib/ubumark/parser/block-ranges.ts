/**
 * Les lignes que le parseur lit comme blocs fermés (Q60)
 * ======================================================
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

/** Une fence nue : ``` ou ~~~, rien après */
export const isFenceLine = (line: string | undefined) =>
	line !== undefined && /^(`{3,}|~{3,})\s*$/.test(line.trim());

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
	const code = findCodeBlocks(masked).map((r): [number, number] => [r.startIndex, r.endIndex]);

	// Fermé : la plage finit sur une fence nue, après l'ouvrante
	const closed = ([start, end]: [number, number]) => end > start && isFenceLine(lines[end]);
	const sorted = [...special, ...code].filter(closed).sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const [start, end] of sorted) {
		const last = merged.at(-1);
		if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
		else merged.push([start, end]);
	}
	return merged;
}
