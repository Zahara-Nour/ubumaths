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
 * ```monnaie (`construire:`, avec sa réserve par défaut écrite : `maskMonnaie`), ```partage (`colorier:`), ```barres (effectifs des
 * barres de `placer:`, `axe: à choisir` compris : l'échelle ne se déduit plus).
 * Pas encore (lot 2 du chantier) : ```cubes, ```patron `completer:`,
 * ```figure-a-completer.
 * Un bloc dans une option d'un ```choix n'est pas un geste (le générateur met le
 * choix à l'abri avant de repérer les gestes) : il reste tel quel, sinon les options
 * deviendraient identiques.
 * Sans objet : ```ranger (déjà mélangé), ```patron `designer:` (la tâche, que la
 * consigne dit ; les faces se trouvent par le pliage), opération posée.
 *
 * @module questions/masked-statement
 */

import { findLinesToPlace } from '$lib/ubumark/parser/number-line-parser';
import { findCourbesToPlace } from '$lib/ubumark/parser/courbe-parser';
import { findHorlogesToPlace } from '$lib/ubumark/parser/horloge-parser';
import { findBuildCollections } from '$lib/ubumark/parser/collection-parser';
import { defaultReserve, findBuildMonnaies } from '$lib/ubumark/parser/monnaie-parser';
import { fromCents, isCents, readAmount, toCents } from '$lib/ubumark/utils/monnaie-valeurs';
import { findPartagesToColorier } from '$lib/ubumark/parser/partage-parser';
import { findBarsToPlace, parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { findChoiceBlocks } from '$lib/ubumark/parser/choix-parser';
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
const RESERVE_LINE = /^réserve\s*:/i;
/** `A=3` sur une droite : le nom avant `=` */
const NAMED_TARGET = /^([^=\s]+)\s*=/;
/** Donnée d'un diagramme (`Natation = 8`) : un `=` sans `:` avant (pas une option) */
const DATUM_LINE = /^[^:=]+=/;
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
function maskLines(
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
 * Monnaie à construire : `construire: ?`. Sans `réserve:`, la réserve par défaut
 * dépend de la somme (pièces de centimes si elle en a, chantier `monnaie-centimes`) :
 * l'énoncé masqué l'écrit, pour que l'élève ait la même réserve qu'à l'entraînement.
 */
function maskMonnaie(block: FoundBlock): MaskLine {
	const build = keyLine(BUILD_LINE, () => MASKED_VALUE);
	if (block.body.some((line) => RESERVE_LINE.test(line.trim()))) return build;
	return (line, rank) => {
		const masked = build(line, rank);
		if (masked === null) return null;
		const cents = readAmount(BUILD_LINE.exec(line.trim())![2]);
		if (cents === null) return masked;
		const reserve = defaultReserve(fromCents(cents))
			.map((value) => (isCents(value) ? `${toCents(value)}c` : String(value)))
			.join(' ');
		return `${masked}\nréserve: ${reserve}`;
	};
}

/**
 * Diagramme à construire : la ligne `catégorie = effectif` de chaque barre de
 * `placer:` (rangs lus par le parseur) devient `catégorie = ?`
 */
function maskBars(block: FoundBlock): MaskLine {
	const spec = parseStatChartContent('barres', block.body.join('\n')).spec;
	const lines = new Set((spec?.toPlace ?? []).map((rank) => spec!.data[rank].line - 1));
	return (line, rank) => {
		// Bloc illisible (jamais pour une instance générée) : toute donnée `x = y` masquée
		const datum = spec === null ? DATUM_LINE.test(line.trim()) : lines.has(rank);
		if (!datum) return null;
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
	const choices = findChoiceBlocks(lines);
	const inChoice = (block: FoundBlock) =>
		choices.some((c) => block.startIndex > c.startIndex && block.startIndex <= c.endIndex);
	const maskBlocks = (found: FoundBlock[], maskFor: (block: FoundBlock) => MaskLine) =>
		maskLines(
			lines,
			found.filter((block) => !inChoice(block)),
			maskFor
		);
	const placer = keyLine(PLACER_LINE, maskLineTargets);
	maskBlocks(findLinesToPlace(statement), () => placer);
	maskBlocks(findCourbesToPlace(statement), () => keyLine(PLACER_LINE, maskCourbeTargets));
	maskBlocks(findHorlogesToPlace(statement), () => keyLine(PLACER_LINE, () => MASKED_VALUE));
	const build = keyLine(BUILD_LINE, () => MASKED_VALUE);
	maskBlocks(findBuildCollections(statement), () => build);
	maskBlocks(findBuildMonnaies(statement), maskMonnaie);
	maskBlocks(findPartagesToColorier(statement), () => keyLine(COLORIER_LINE, () => MASKED_VALUE));
	maskBlocks(findBarsToPlace(statement), maskBars);
	return lines.join('\n');
}
