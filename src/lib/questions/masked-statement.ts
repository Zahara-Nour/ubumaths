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
 * barres de `placer:`, `axe: à choisir` compris : l'échelle ne se déduit plus),
 * ```boite-a-moustaches (les cinq valeurs des boîtes de `placer:`, ou `données:`).
 * Lot 2, des lignes réécrites (David, journal § 7) :
 * - ```cubes `retrouver:` : `hauteurs: ? ? / 0 ?` (l'empreinte est la vue de dessus,
 *   donnée) et `vues: face 2 1 ; droite 1 2` (tout assemblage qui a ces vues est juste :
 *   les hauteurs du bloc en sont un) ;
 * - ```patron `completer:` : le patron amputé en grille, déjà tourné et retourné, et
 *   `completer: ? ?` (une face à poser par `?`) ;
 * - ```figure-a-completer : `verifier: ?`, l'outil écrit (`outils:`). Les points
 *   restent : un point invisible posé sur la réponse fuirait (aucun modèle).
 * Un bloc dans une option d'un ```choix n'est pas un geste (le générateur met le
 * choix à l'abri avant de repérer les gestes) : il reste tel quel, sinon les options
 * deviendraient identiques.
 * Sans objet : ```ranger (déjà mélangé), ```patron `designer:` (la tâche, que la
 * consigne dit ; les faces se trouvent par le pliage), ```cubes `dessiner:` (la
 * perspective est la figure), opération posée.
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
import {
	findBarsToPlace,
	findBoxPlotsToPlace,
	parseStatChartContent
} from '$lib/ubumark/parser/stat-chart-parser';
import { findChoiceBlocks } from '$lib/ubumark/parser/choix-parser';
import {
	findCubesToBuild,
	findPatronsToBuild,
	parseEspaceContent
} from '$lib/ubumark/parser/espace-parser';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { unnestedLine } from '$lib/ubumark/parser/nested-line';
import { MASKED_VALUE } from '$lib/ubumark/utils/masked-value';
import { sideColumns } from '$lib/ubumark/utils/espace-scene';
import { transformGrid, trimGrid } from '$lib/ubumark/utils/espace-patrons';
import { CHECK_TOOL } from '$lib/ubumark/types/construction';

// Types
interface FoundBlock {
	startIndex: number;
	body: string[];
}

/**
 * Ligne du corps (sans ce qui l'imbrique) → ligne masquée ; plusieurs lignes, ou
 * aucune (`[]` : retirée) ; null : inchangée
 */
type MaskLine = (line: string, rank: number) => string | string[] | null;

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

/** Ligne retirée d'un bloc réécrit (filtrée à la fin) */
const REMOVED_LINE = '\u0000';
/** `clé: valeur` d'un bloc d'espace ou d'une figure */
const ESPACE_KEY_LINE = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;
const FIGURE_A_COMPLETER_START = /^```figure-a-completer\s*$/;
const FENCE_END = /^```\s*$/;
const FIGURE_SEPARATOR = /^---\s*$/;
/** Lignes d'un patron qui diraient où va la face retirée, ou qui s'appliquent déjà */
const PATRON_DROPPED_KEYS = new Set(['tourner', 'retourner', 'dessous', 'faux']);

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
			const at = trimmed === '' ? -1 : original.lastIndexOf(trimmed);
			const prefix = at === -1 ? '' : original.slice(0, at);
			const written = typeof masked === 'string' ? [masked] : masked;
			lines[index] =
				written.length === 0 ? REMOVED_LINE : written.map((line) => prefix + line).join('\n');
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
 * Boîte à moustaches à construire : la ligne `Nom = 4 ; 8 ; 11 ; 14 ; 19` de chaque
 * boîte de `placer:` devient `Nom = ? ; ? ; ? ; ? ; ?` ; `données:` (la série d'où
 * l'attendu est calculé) devient une boîte sans nom masquée — la consigne donne la
 * série, le bloc ne la répète pas
 */
function maskBoxPlot(block: FoundBlock): MaskLine {
	const plot = parseStatChartContent('boite-a-moustaches', block.body.join('\n')).spec?.boxPlot;
	const masked = ['?', '?', '?', '?', '?'].join(' ; ');
	if (!plot?.toPlace) {
		// Bloc illisible (jamais pour une instance générée) : toute boîte et toute série masquées
		return (line) => {
			const trimmed = line.trim();
			if (/^donn[ée]es\s*:/i.test(trimmed)) return `= ${masked}`;
			if (!DATUM_LINE.test(trimmed) && !trimmed.startsWith('=')) return null;
			return `${trimmed.slice(0, trimmed.indexOf('=')).trimEnd()} = ${masked}`;
		};
	}
	const lines = new Set(plot.toPlace.map((rank) => plot.boxes[rank].line - 1));
	return (line, rank) => {
		if (!lines.has(rank)) return null;
		const trimmed = line.trim();
		if (plot.fromData) return `= ${masked}`;
		return `${trimmed.slice(0, trimmed.indexOf('=')).trimEnd()} = ${masked}`;
	};
}

/** Clé d'une ligne `clé: valeur`, sans accent ni majuscule ; null sinon */
function keyOf(line: string): string | null {
	const match = ESPACE_KEY_LINE.exec(line.trim());
	return match
		? match[1]
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.toLowerCase()
		: null;
}

/**
 * Assemblage à retrouver : `hauteurs:` (et ses rangées en retrait) devient
 * `hauteurs: ? ? / 0 ?`, suivie de `vues:` (une hauteur par colonne de chaque vue
 * donnée). `dessiner:` et un bloc illisible restent tels quels.
 */
function maskCubes(block: FoundBlock): MaskLine {
	const spec = parseEspaceContent(block.body.join('\n'), 'cubes').spec;
	if (spec?.kind !== 'cubes' || spec.task?.kind !== 'retrouver' || spec.givenViews) {
		return () => null;
	}
	const { heights, task } = spec;
	const footprint = heights
		.map((row) => row.map((h) => (h > 0 ? MASKED_VALUE : '0')).join(' '))
		.join(' / ');
	const views = task.views
		.map((view) => `${view} ${sideColumns(heights, view).join(' ')}`)
		.join(' ; ');
	let inHeights = false;
	return (line) => {
		const key = keyOf(line);
		if (key === null) return inHeights && line.trim() !== '' ? [] : null;
		inHeights = key === 'hauteurs';
		return inHeights ? [`hauteurs: ${footprint}`, `vues: ${views}`] : null;
	};
}

/**
 * Patron à compléter : `forme:` (et sa grille) devient le patron amputé en grille,
 * déjà tourné et retourné ; `completer: 4` devient `completer: ?`.
 */
function maskPatron(block: FoundBlock): MaskLine {
	const spec = parseEspaceContent(block.body.join('\n'), 'patron').spec;
	const task = spec?.kind === 'patron' ? spec.task : undefined;
	if (spec?.kind !== 'patron' || task?.kind !== 'completer' || task.masked !== undefined) {
		return () => null;
	}
	let rank = 0;
	const left = (spec.cells ?? []).map((row) =>
		row.map((on) => on && !task.removed.includes(rank++))
	);
	const grid = trimGrid(transformGrid(left, spec.turn, spec.mirror));
	const rows = grid.map((row) => '  ' + row.map((on) => (on ? 'X' : '.')).join(''));
	const toPlace = task.removed.map(() => MASKED_VALUE).join(' ');
	// Sans `forme:` (patron par défaut), la grille s'écrit devant `completer:`
	const hasForm = block.body.some((line) => keyOf(line) === 'forme');
	let inForm = false;
	return (line) => {
		const key = keyOf(line);
		if (key === null) return inForm && line.trim() !== '' ? [] : null;
		inForm = key === 'forme';
		if (inForm) return ['forme:', ...rows];
		if (PATRON_DROPPED_KEYS.has(key)) return [];
		if (key !== 'completer') return null;
		const completer = `completer: ${toPlace}`;
		return hasForm ? completer : ['forme:', ...rows, completer];
	};
}

/** Les blocs ```figure-a-completer d'un énoncé (corps sans clôtures) */
function findFiguresACompleter(lines: string[]): FoundBlock[] {
	const plainLines = lines.map(unnestedLine);
	const found: FoundBlock[] = [];
	for (let i = 0; i < plainLines.length; i++) {
		if (!FIGURE_A_COMPLETER_START.test(plainLines[i].trim())) continue;
		let end = i + 1;
		while (end < plainLines.length && !FENCE_END.test(plainLines[end].trim())) end++;
		found.push({ startIndex: i, body: plainLines.slice(i + 1, end) });
		i = end;
	}
	return found;
}

/**
 * Figure à compléter : la première ligne `verifier:` devient `verifier: ?` (précédée
 * de `outils:` si l'outil venait de la vérification), les autres sont retirées.
 * Les lignes de la figure (après `---`) restent.
 */
function maskFigure(block: FoundBlock): MaskLine {
	const header = readConstructionHeader(block.body.join('\n'));
	if (header.spec.masked || header.spec.checks.length === 0) return () => null;
	const separator = block.body.findIndex((line) => FIGURE_SEPARATOR.test(line.trim()));
	const headerEnd = separator === -1 ? block.body.length : separator;
	const toolsWritten = block.body.slice(0, headerEnd).some((line) => keyOf(line) === 'outils');
	const tool = CHECK_TOOL[header.spec.checks[0].kind];
	let first = true;
	return (line, rank) => {
		if (rank >= headerEnd || !/^(verifier|vérifier)$/.test(keyOf(line) ?? '')) return null;
		if (!first) return [];
		first = false;
		return toolsWritten
			? `verifier: ${MASKED_VALUE}`
			: [`outils: ${tool}`, `verifier: ${MASKED_VALUE}`];
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
	maskBlocks(findBoxPlotsToPlace(statement), maskBoxPlot);
	// Bloc cité ou en retrait : pas de case, pas de geste (rien à masquer)
	const ownBlocks = <T extends FoundBlock & { nested: boolean }>(found: T[]) =>
		found.filter((block) => !block.nested);
	maskBlocks(ownBlocks(findCubesToBuild(statement)), maskCubes);
	maskBlocks(ownBlocks(findPatronsToBuild(statement)), maskPatron);
	maskBlocks(findFiguresACompleter(statement.split('\n')), maskFigure);
	return lines.filter((line) => line !== REMOVED_LINE).join('\n');
}
