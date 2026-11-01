/**
 * Bloc ```scratch — repérage et lecture
 * =====================================
 *
 * Le corps du bloc EST le programme (syntaxe des `scratchblocks`, en
 * français), gardé tel quel, lignes vides comprises (elles séparent deux
 * scripts). Volontairement LÉGER : aucun import de `scratchblocks` (le parseur
 * Markdown est dans le chunk de toutes les pages) ; les instructions sont
 * vérifiées au rendu (`utils/scratch-check.ts`).
 *
 * Fermeture : le premier ``` seul. Un programme est du texte libre : on ne peut
 * pas y reconnaître une phrase de l'énoncé comme pour les blocs à clés (Q66) ;
 * une phrase avalée devient une instruction non reconnue, signalée à l'auteur.
 * Une ligne qui ouvre un autre bloc (```horloge…) arrête la recherche : bloc
 * non fermé, jusqu'à sa première ligne vide (Q63).
 *
 * @module ubumark/parser/scratch-parser
 */

import { unclosedBlockEnd } from './unclosed-block';
import type { ScratchBlockRange, ScratchIssue, ScratchNode } from '../types/scratch';

// ============================================================================
// CONSTANTES
// ============================================================================

const SCRATCH_BLOCK_START_REGEX = /^```scratch\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;
const FENCE_REGEX = /^```/;

/** Gabarit d'un programme (éditeur riche, aide à l'écriture) */
export const SCRATCH_TEMPLATE = 'quand le drapeau vert pressé\nmettre [a v] à (5)\ndire (a)';

// ============================================================================
// DÉTECTION
// ============================================================================

export function isScratchBlockStart(line: string): boolean {
	return SCRATCH_BLOCK_START_REGEX.test(line);
}

/** La fin d'un bloc ouvert en `startIndex` : le ``` seul, sinon non fermé (Q63) */
function scratchBlockEnd(lines: readonly string[], startIndex: number): number {
	for (let k = startIndex + 1; k < lines.length; k++) {
		if (BLOCK_END_REGEX.test(lines[k])) return k;
		if (FENCE_REGEX.test(lines[k])) break;
	}
	return unclosedBlockEnd(lines, startIndex);
}

/** Blocs ```scratch d'une liste de lignes (indices inclusifs, clôtures comprises) */
export function findScratchBlocks(lines: string[]): ScratchBlockRange[] {
	const blocks: ScratchBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isScratchBlockStart(lines[i])) {
			const endIndex = scratchBlockEnd(lines, i);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Lire le texte d'un bloc (sans les clôtures) : toujours un nœud */
export function parseScratchContent(source: string): ScratchNode {
	const errors: ScratchIssue[] = [];
	if (source.trim() === '') {
		errors.push({ message: 'Ligne 1 : programme vide (écris une instruction par ligne)', line: 1 });
	}
	return { type: 'scratch', source, errors };
}

/**
 * Lire un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de
 * fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseScratch(
	lines: string[],
	startIndex: number,
	end: number
): { node: ScratchNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseScratchContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			errors: [
				...node.errors,
				{
					message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
					line: body.length + 1
				}
			]
		}
	};
}
