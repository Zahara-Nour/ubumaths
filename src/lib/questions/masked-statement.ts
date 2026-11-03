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
 * Masqué : ```line, ```courbe et ```trig (`placer:`), ```courbe (`tracer:` : l'équation
 * de la droite devient `tracer: ?`), ```horloge (`placer:`), ```collection et
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
 *   `verifier: mesure AOB` reste tel quel ; ses points calculés passent en coordonnées.
 * Tableau de signes à compléter (```variation à `?`, chantier `tableau-signes`) : chaque
 * valeur de x cachée devient un jeton `??1`, `??2`… dans `domain:` ET dans les clés des
 * lignes (`-inf,-3` → `-inf,??1`, sinon la clé dirait la valeur) ; chaque signe ou
 * marque cachés devient `?` seul. Le parseur lit ces formes comme des cases sans réponse.
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
import { findTrigCirclesToPlace } from '$lib/ubumark/parser/trig-circle-parser';
import {
	findHorlogesToPlace,
	isMaskedPlacerValue,
	maskedPlacerValue
} from '$lib/ubumark/parser/horloge-parser';
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
import {
	constructionPositions,
	constructionShapes,
	hasConstructionPositions
} from '$lib/questions/construction/positions';
import { findVariationsToFill } from '$lib/ubumark/parser/variation-table-parser';
import { unnestedLine } from '$lib/ubumark/parser/nested-line';
import {
	isMaskedVectorValue,
	isVectorValue,
	MASKED_VALUE,
	maskVectorValue
} from '$lib/ubumark/utils/masked-value';
import { sideColumns } from '$lib/ubumark/utils/espace-scene';
import { transformGrid, trimGrid } from '$lib/ubumark/utils/espace-patrons';

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
const REPRESENTER_LINE = /^(representer\s*:)(.*)$/i;
const TRACER_LINE = /^(tracer\s*:)(.*)$/i;
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

/**
 * `representer:` masqué en gardant le geste : `?` (demi-droite, une borne et un
 * côté), `? ; ?` (intervalle borné, deux bornes) ; ni bornes ni crochets
 */
function maskRepresenter(value: string): string {
	return isLineToRepresentBounded(value) ? `${MASKED_VALUE} ; ${MASKED_VALUE}` : MASKED_VALUE;
}

/** `[-1, 3[` : deux bornes finies ; `[2, +inf[` : non (une borne infinie) */
function isLineToRepresentBounded(value: string): boolean {
	if (/^\s*\?\s*;\s*\?\s*$/.test(value)) return true;
	return !/(?:inf|∞|\\infty)/i.test(value);
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

/** `verifier: mesure AOB` (lot 6) : rien à cacher */
const MEASURE_CHECK = /^mesure\s+[A-Z]{3}$/;
/** Définition d'un point nommé : `B = <expression>` */
const POINT_DEFINITION = /^\s*([A-Za-z][A-Za-z0-9_']*)\s*=\s*(.+)$/;
/** Une expression qui peut porter la mesure d'un angle (garde de l'énoncé masqué) */
const ANGLE_IN_FIGURE = /\bangle\s*=|\brotation\s*\(/;

/** Coordonnée écrite dans l'énoncé masqué : 6 décimales, sans zéros inutiles */
function coordinate(value: number): string {
	return String(Number(value.toFixed(6)));
}

/**
 * Angle à mesurer (lot 6, décision de David du 2026-11-03) : dans l'énoncé masqué,
 * chaque point nommé défini par un calcul devient `B = point(x, y)` (invisible :
 * `visible=faux` gardé ; ses autres réglages d'affichage tombent). Les autres lignes
 * restent : les traits nomment leurs points. Sans le calcul des figures (positions
 * non inscrites), rien n'est réécrit : la garde refuse alors l'envoi.
 */
function maskMeasureFigure(block: FoundBlock): MaskLine {
	if (!hasConstructionPositions()) return () => null;
	const source = block.body.join('\n');
	let points: ReadonlyMap<string, { x: number; y: number }>;
	let visible: ReadonlySet<string>;
	try {
		points = constructionPositions(source);
		visible = constructionShapes(source).visiblePoints;
	} catch {
		return () => null;
	}
	const separator = block.body.findIndex((line) => FIGURE_SEPARATOR.test(line.trim()));
	return (line, rank) => {
		if (separator === -1 || rank <= separator) return null;
		const definition = POINT_DEFINITION.exec(line);
		if (!definition) return null;
		const [, name, expression] = definition;
		const at = points.get(name);
		if (!at || /^point\s*\(/.test(expression.trim())) return null;
		const hidden = visible.has(name) ? '' : ', visible=faux';
		return `${name} = point(${coordinate(at.x)}, ${coordinate(at.y)}${hidden})`;
	};
}

/**
 * Figure à compléter : la première ligne `verifier:` devient `verifier: ?` (précédée
 * de `outils:` si l'outil venait de la vérification), les autres sont retirées.
 * Les lignes de la figure (après `---`) restent.
 */
function maskFigure(block: FoundBlock): MaskLine {
	const header = readConstructionHeader(block.body.join('\n'));
	if (header.spec.masked || header.spec.checks.length === 0) return () => null;
	// Angle à mesurer (lot 6) : `verifier: mesure AOB` reste (l'écran en tire la case) ; les
	// points calculés sont écrits en coordonnées (`B = rotation(A, angle=50, …)` dirait la réponse)
	if (header.spec.checks.some((c) => c.kind === 'mesure')) return maskMeasureFigure(block);
	const separator = block.body.findIndex((line) => FIGURE_SEPARATOR.test(line.trim()));
	const headerEnd = separator === -1 ? block.body.length : separator;
	const toolsWritten = block.body.slice(0, headerEnd).some((line) => keyOf(line) === 'outils');
	// La palette déduite (un outil, ou les instruments du papier uni) : écrite telle quelle
	const tools = header.spec.tools.join(', ');
	let first = true;
	return (line, rank) => {
		if (rank >= headerEnd || !/^(verifier|vérifier)$/.test(keyOf(line) ?? '')) return null;
		if (!first) return [];
		first = false;
		return toolsWritten
			? `verifier: ${MASKED_VALUE}`
			: [`outils: ${tools}`, `verifier: ${MASKED_VALUE}`];
	};
}

/** Ligne `domain:` d'un tableau */
const DOMAIN_LINE = /^(\s*domain\s*:\s*)(.*)$/i;
/** Valeur de x cachée dans `domain:` : borne éventuelle, `?`, valeur, borne éventuelle */
const HIDDEN_DOMAIN_POINT = /^(\s*[[\]]?\s*)\?(.*?)(\s*[[\]]?\s*)$/;
/** Cellule d'une ligne du tableau (`  -inf,-3: ?-`) : retrait, clé, séparateur, valeur */
const TABLE_ENTRY = /^(\s{2,})(.+?)(\s*:\s*)(.+?)\s*$/;

/**
 * Tableau de signes à compléter : valeurs de x cachées → `??n` (dans `domain:` et dans
 * les clés), signes et marques cachés → `?`. Les lignes sont réécrites d'après tout le
 * corps (les clés dépendent du domaine).
 */
function maskVariation(block: FoundBlock): MaskLine {
	const tokens = new Map<string, string>();
	const masked = block.body.map((line) => {
		const domain = DOMAIN_LINE.exec(line);
		if (!domain) return null;
		const points = domain[2].split(',').map((part) => {
			const hidden = HIDDEN_DOMAIN_POINT.exec(part);
			if (!hidden || hidden[2].trim().startsWith('?')) return part;
			const token = `??${tokens.size + 1}`;
			tokens.set(hidden[2].trim(), token);
			return `${hidden[1]}${token}${hidden[3]}`;
		});
		// Sans retrait : `maskLines` remet ce qui précédait la ligne
		return `${domain[1].trimStart()}${points.join(',')}`;
	});
	return (line, rank) => {
		if (masked[rank] !== null) return masked[rank];
		const entry = TABLE_ENTRY.exec(line);
		if (!entry) return null;
		const [, , key, separator, value] = entry;
		const parts = key.split(',').map((part) => part.trim());
		const renamed = parts.map((part) => tokens.get(part) ?? part).join(',');
		const shownValue = value.trim().startsWith('?') ? MASKED_VALUE : value;
		if (renamed === parts.join(',') && shownValue === value) return null;
		return `${renamed}${separator}${shownValue}`;
	};
}

/**
 * Tableau à compléter masqué : chaque case sans réponse, et aucune clé de ligne qui
 * ne soit une valeur du domaine (une clé `-3` dirait la valeur cachée `??1`)
 */
function variationMasked(node: ReturnType<typeof findVariationsToFill>[number]['node']): boolean {
	if (node === null) return false;
	if ((node.cases ?? []).some((cell) => cell.answer !== '')) return false;
	const domain = new Set(node.domain.map((point) => point.expression));
	return node.rows.every((row) =>
		[...row.values.keys()].every((key) => key.split(',').every((part) => domain.has(part)))
	);
}

/** `A=? ; B=?`, `?` : chaque cible de la ligne est masquée */
function allMasked(value: string): boolean {
	return value
		.split(';')
		.every(
			(part) =>
				(part.includes('=') ? part.slice(part.indexOf('=') + 1) : part).trim() === MASKED_VALUE
		);
}

/** Valeur de la ligne `clé:` d'un corps de bloc (null si la clé n'y est pas) */
function valuesOf(body: string[], keys: readonly string[]): string[] {
	return body.flatMap((line) => {
		const key = keyOf(line);
		if (key === null || !keys.includes(key)) return [];
		return [ESPACE_KEY_LINE.exec(line.trim())![2]];
	});
}

/** Barres : les données de `placer:` (toutes si le bloc ne se lit pas) finissent par `= ?` */
function barsMasked(block: FoundBlock): boolean {
	const spec = parseStatChartContent('barres', block.body.join('\n')).spec;
	const ranks = spec
		? new Set((spec.toPlace ?? []).map((rank) => spec.data[rank].line - 1))
		: new Set(block.body.flatMap((line, rank) => (DATUM_LINE.test(line.trim()) ? [rank] : [])));
	return [...ranks].every((rank) => /=\s*\?\s*$/.test(block.body[rank] ?? ''));
}

/** Assemblage à retrouver : aucune hauteur chiffrée (hors `0`) dans `hauteurs:` et ses rangées */
function cubesMasked(block: FoundBlock): boolean {
	if (valuesOf(block.body, ['retrouver']).length === 0) return true;
	let inHeights = false;
	return block.body.every((line) => {
		const key = keyOf(line);
		if (key !== null) inHeights = key === 'hauteurs';
		const heights = key === null ? line : (ESPACE_KEY_LINE.exec(line.trim())?.[2] ?? '');
		return !inHeights || !/[1-9]/.test(heights);
	});
}

/**
 * Les blocs à geste d'un énoncé À ENVOYER qui disent encore leur réponse (leur genre,
 * dans l'ordre des genres). Lecture du texte, sans passer par les masques : un
 * masque qui ne lit pas son bloc le laisse tel quel, cette garde le voit.
 */
export function findUnmaskedAnswers(statement: string): string[] {
	const lines = statement.split('\n');
	const choices = findChoiceBlocks(lines);
	const inChoice = (block: FoundBlock) =>
		choices.some((c) => block.startIndex > c.startIndex && block.startIndex <= c.endIndex);
	const leaks = (kind: string, found: FoundBlock[], masked: (block: FoundBlock) => boolean) =>
		found.some((block) => !inChoice(block) && !masked(block)) ? [kind] : [];
	// Cubes, patron : un bloc cité ou en retrait n'a pas de case (refusé au générateur)
	const own = (found: (FoundBlock & { nested: boolean })[]) => found.filter((b) => !b.nested);
	const keyMasked = (keys: string[]) => (block: FoundBlock) =>
		valuesOf(block.body, keys).every(allMasked);
	return [
		...leaks('line', findLinesToPlace(statement), keyMasked(['placer', 'representer'])),
		...leaks(
			'courbe',
			findCourbesToPlace(statement),
			(block) =>
				valuesOf(block.body, ['placer']).every(allMasked) &&
				valuesOf(block.body, ['tracer']).every((v) =>
					isVectorValue(v) ? isMaskedVectorValue(v) : allMasked(v)
				)
		),
		...leaks('trig', findTrigCirclesToPlace(statement), keyMasked(['placer'])),
		...leaks('horloge', findHorlogesToPlace(statement), (block) =>
			valuesOf(block.body, ['placer']).every(isMaskedPlacerValue)
		),
		...leaks('collection', findBuildCollections(statement), keyMasked(['construire'])),
		...leaks('monnaie', findBuildMonnaies(statement), keyMasked(['construire'])),
		...leaks('partage', findPartagesToColorier(statement), keyMasked(['colorier'])),
		...leaks('barres', findBarsToPlace(statement), barsMasked),
		...leaks('cubes', own(findCubesToBuild(statement)), cubesMasked),
		...leaks('patron', own(findPatronsToBuild(statement)), (block) =>
			valuesOf(block.body, ['completer']).every((v) =>
				v.split(/\s+/).every((w) => w === MASKED_VALUE)
			)
		),
		// Angle à mesurer (lot 6) : `mesure AOB` ne dit rien que la figure ne montre ; une
		// rotation ou un `angle=` restés dans sa figure, si
		...leaks('figure-a-completer', findFiguresACompleter(lines), (block) => {
			const values = valuesOf(block.body, ['verifier']);
			if (values.every(allMasked)) return true;
			if (!values.every((v) => allMasked(v) || MEASURE_CHECK.test(v.trim()))) return false;
			const separator = block.body.findIndex((line) => FIGURE_SEPARATOR.test(line.trim()));
			return block.body.slice(separator + 1).every((line) => !ANGLE_IN_FIGURE.test(line));
		}),
		...(findVariationsToFill(statement).some(
			(block) => !block.nested && !inChoice(block) && !variationMasked(block.node)
		)
			? ['variation']
			: [])
	];
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
	const representer = keyLine(REPRESENTER_LINE, maskRepresenter);
	maskBlocks(
		findLinesToPlace(statement),
		() => (line, rank) => placer(line, rank) ?? representer(line, rank)
	);
	const courbePoints = keyLine(PLACER_LINE, maskCourbeTargets);
	// Droite : l'équation entière ; vecteur : ses coordonnées seules (nom, origine gardés)
	const courbeLine = keyLine(TRACER_LINE, (value) =>
		isVectorValue(value) ? maskVectorValue(value) : MASKED_VALUE
	);
	maskBlocks(
		findCourbesToPlace(statement),
		() => (line, rank) => courbePoints(line, rank) ?? courbeLine(line, rank)
	);
	maskBlocks(findTrigCirclesToPlace(statement), () => placer);
	maskBlocks(findHorlogesToPlace(statement), () => keyLine(PLACER_LINE, maskedPlacerValue));
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
	maskBlocks(ownBlocks(findVariationsToFill(statement)), maskVariation);
	return lines.filter((line) => line !== REMOVED_LINE).join('\n');
}
