/**
 * Énoncé d'une évaluation notée, sans la réponse (chantier `fuite-enonce`)
 * ========================================================================
 *
 * `toPublicQuestion` envoie le texte de l'énoncé au navigateur : celui des blocs à
 * geste dirait la réponse (`placer: A=3`, `construire: 35`, `colorier: 3/8`, effectif
 * d'une barre à construire). Avant l'envoi, chaque valeur que l'élève doit trouver
 * devient `?` (`MASKED_VALUE`), sans chercher si la consigne la donne déjà (phase 0,
 * Q1) ; les parseurs la lisent comme une valeur de remplacement : l'écran garde les
 * noms, le nombre de points ou de barres, la forme. La correction ne change pas :
 * le serveur juge sur l'instance complète.
 *
 * Masqué : ```line et ```courbe (`placer:`), ```horloge (`placer:`), ```collection et
 * ```monnaie (`construire:`), ```partage (`colorier:`), ```barres (effectifs des
 * barres de `placer:`). Pas encore (lot 2 du chantier) : ```cubes, ```patron
 * `completer:`, ```barres avec `axe: à choisir`, ```figure-a-completer.
 * Sans objet : ```ranger (déjà mélangé), ```patron `designer:` (la tâche, que la
 * consigne dit ; les faces se trouvent par le pliage), opération posée.
 *
 * @module questions/masked-statement
 */

import { findLinesToPlace } from '$lib/ubumark/parser/number-line-parser';
import { findCourbesToPlace } from '$lib/ubumark/parser/courbe-parser';
import { findHorlogesToPlace } from '$lib/ubumark/parser/horloge-parser';
import { findBuildCollections } from '$lib/ubumark/parser/collection-parser';
import { findBuildMonnaies } from '$lib/ubumark/parser/monnaie-parser';
import { findPartagesToColorier } from '$lib/ubumark/parser/partage-parser';
import { findBarsToPlace, parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { MASKED_VALUE } from '$lib/ubumark/utils/masked-value';

// Types
interface FoundBlock {
	startIndex: number;
	body: string[];
}

/** Ligne du corps (sans ce qui l'imbrique) → ligne masquée ; null : inchangée */
type MaskLine = (line: string, rank: number) => string | null;

// Constantes
const PLACER_LINE = /^(placer\s*:)(.*)$/i;
const BUILD_LINE = /^(construire\s*:)(.*)$/i;
const COLORIER_LINE = /^(colorier\s*:)(.*)$/i;
/** `A=3` sur une droite : le nom avant `=` */
const NAMED_TARGET = /^([^=\s]+)\s*=/;
/** `A=(2 ; 3)` dans un repère : les noms */
const COURBE_NAMES = /([A-Z])\s*=\s*\(/g;

// Functions
/** `A=3 ; B=7` → `A=? ; B=?` ; `7` → `?` */
function maskLineTargets(value: string): string {
	return value
		.split(';')
		.map((part) => {
			const named = NAMED_TARGET.exec(part.trim());
			return named ? `${named[1]}=${MASKED_VALUE}` : MASKED_VALUE;
		})
		.join(' ; ');
}

/** `A=(2 ; 3) ; B=(-1 ; 2)` → `A=? ; B=?` ; `(2 ; 3)` → `?` */
function maskCourbeTargets(value: string): string {
	const names = [...value.matchAll(COURBE_NAMES)].map((match) => match[1]);
	return names.length === 0
		? MASKED_VALUE
		: names.map((name) => `${name}=${MASKED_VALUE}`).join(' ; ');
}

/** La ligne clé: valeur dont la valeur se remplace */
function keyLine(pattern: RegExp, mask: (value: string) => string): MaskLine {
	return (line) => {
		const match = pattern.exec(line.trim());
		return match ? `${match[1]} ${mask(match[2])}` : null;
	};
}

/** Réécrire les lignes du corps de chaque bloc, en gardant ce qui les imbrique */
function maskBlocks(
	lines: string[],
	blocks: FoundBlock[],
	maskFor: (block: FoundBlock) => MaskLine
): void {
	for (const block of blocks) {
		const mask = maskFor(block);
		block.body.forEach((plain, rank) => {
			const masked = mask(plain, rank);
			if (masked === null) return;
			const index = block.startIndex + 1 + rank;
			const original = lines[index];
			const trimmed = plain.trim();
			const at = original.lastIndexOf(trimmed);
			lines[index] = at === -1 ? masked : original.slice(0, at) + masked;
		});
	}
}

/**
 * Diagramme à construire : la ligne `catégorie = effectif` de chaque barre de
 * `placer:` (rangs lus par le parseur) devient `catégorie = ?`
 */
function maskBars(block: FoundBlock): MaskLine {
	const spec = parseStatChartContent('barres', block.body.join('\n')).spec;
	const lines = new Set((spec?.toPlace ?? []).map((rank) => spec!.data[rank].line - 1));
	return (line, rank) => {
		if (!lines.has(rank)) return null;
		const trimmed = line.trim();
		return `${trimmed.slice(0, trimmed.lastIndexOf('=')).trimEnd()} = ${MASKED_VALUE}`;
	};
}

/**
 * L'énoncé sans les valeurs que l'élève doit trouver dans ses blocs à geste.
 * Un énoncé sans bloc à geste revient tel quel.
 */
export function maskGestureAnswers(statement: string): string {
	const lines = statement.split('\n');
	const placer = keyLine(PLACER_LINE, maskLineTargets);
	maskBlocks(lines, findLinesToPlace(statement), () => placer);
	maskBlocks(lines, findCourbesToPlace(statement), () => keyLine(PLACER_LINE, maskCourbeTargets));
	maskBlocks(lines, findHorlogesToPlace(statement), () => keyLine(PLACER_LINE, () => MASKED_VALUE));
	const build = keyLine(BUILD_LINE, () => MASKED_VALUE);
	maskBlocks(lines, findBuildCollections(statement), () => build);
	maskBlocks(lines, findBuildMonnaies(statement), () => build);
	maskBlocks(lines, findPartagesToColorier(statement), () =>
		keyLine(COLORIER_LINE, () => MASKED_VALUE)
	);
	maskBlocks(lines, findBarsToPlace(statement), maskBars);
	return lines.join('\n');
}
