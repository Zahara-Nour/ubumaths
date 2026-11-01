/**
 * Bloc ```collection — analyse du texte
 * =====================================
 *
 * ```collection
 * dizaines: 3 ; 2
 * unités: 15 ; 8
 * dessin: barres | paquets
 * unités en: vrac | rangées
 * légendes: Léa ; Tom
 * taille: 6cm
 * ```
 *
 * - `dizaines:` (0 à 10) et `unités:` (0 à 100) : au moins l'une des deux ;
 *   une valeur par collection, séparées par `;` (1 à 3 collections) ; une
 *   ligne absente vaut 0 pour chaque collection. 100 objets au plus en tout.
 * - Le reste est facultatif ; une clé inconnue ou une valeur hors liste est
 *   une erreur située, jamais un réglage ignoré. `centaines:` est réservée
 *   (CE1, plus tard).
 *
 * - `construire: 34` (1 à 100) : l'élève construit la collection sur un plan
 *   vide ; `dizaines:`, `unités:`, `unités en:` et `légendes:` sont alors sans
 *   objet. `case: N` est posée par le générateur de questions, jamais par l'auteur.
 *
 * Dans un modèle de question, `{{n}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * messages). Repérage et blocs non fermés : ceux de ```horloge.
 *
 * Phase 0 : `docs/archive/wip/collection-progress.md`.
 *
 * @module ubumark/parser/collection-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { isMaskedValue } from '../utils/masked-value';
import {
	COLLECTION_BUILD_RANGE,
	COLLECTION_CAPTION_MAX,
	COLLECTION_DRAWINGS,
	COLLECTION_LIMITS,
	COLLECTION_MAX_SETS,
	COLLECTION_SIZE_CM,
	COLLECTION_UNIT_LAYOUTS,
	type CollectionBlockRange,
	type CollectionDrawing,
	type CollectionIssue,
	type CollectionNode,
	type CollectionSet,
	type CollectionUnitLayout
} from '../types/collection';

// ============================================================================
// CONSTANTES
// ============================================================================

const COLLECTION_BLOCK_START_REGEX = /^```collection\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` ; une clé peut avoir deux mots (`unités en`) */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)?)\s*:\s*(.*)$/;

/** Un nombre entier écrit en chiffres */
const INTEGER_REGEX = /^\d+$/;

/** `3cm`, `2,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/**
 * Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66).
 * Sans `construire:` ni `case:` : leurs valeurs ont toujours un chiffre, déjà
 * reconnu ; les ajouter ferait avaler à un bloc non fermé un paragraphe « Construire… »
 */
const BLOCK_KEYS = [
	'dizaines',
	'unités',
	'unites',
	'dessin',
	'légendes',
	'legendes',
	'taille',
	'centaines'
] as const;

type Key =
	'dizaines' | 'unités' | 'dessin' | 'unités en' | 'légendes' | 'taille' | 'construire' | 'case';

const KEY_NAMES: Key[] = [
	'dizaines',
	'unités',
	'dessin',
	'unités en',
	'légendes',
	'taille',
	'construire',
	'case'
];

/** Clés sans objet sur un bloc à construire, et pourquoi */
const NOT_WITH_BUILD: Partial<Record<Key, string>> = {
	dizaines: ' (l’élève part d’un plan vide)',
	unités: ' (l’élève part d’un plan vide)',
	'unités en': ' (les objets se rangent d’office)',
	légendes: ''
};

// ============================================================================
// DÉTECTION
// ============================================================================

export function isCollectionBlockStart(line: string): boolean {
	return COLLECTION_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```collection d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findCollectionBlocks(lines: string[]): CollectionBlockRange[] {
	return findCollectionBlockSpans(lines).map(({ startIndex, endIndex }) => ({
		startIndex,
		endIndex
	}));
}

/**
 * Les mêmes blocs, avec leur fermeture : `endIndex` est la fence de fin d'un bloc
 * fermé, la dernière ligne d'un bloc non fermé
 */
export function findCollectionBlockSpans(
	lines: string[]
): (CollectionBlockRange & { closed: boolean })[] {
	const blocks: (CollectionBlockRange & { closed: boolean })[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isCollectionBlockStart(lines[i])) {
			const { endIndex, closed } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex: i, endIndex, closed });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

/** `2.5` → `2,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(value).replace('.', ',');
}

/** Retire les accents (`unités` = `unites`) */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function normalizeKey(raw: string): Key | null {
	const key = plain(raw).replace(/\s+/g, ' ');
	return KEY_NAMES.find((k) => plain(k) === key) ?? null;
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], key: string): T {
	const found = allowed.find((value) => plain(value) === plain(raw));
	if (found === undefined) {
		throw new LineError(`${key} « ${raw} » : valeurs possibles ${allowed.join(', ')}`);
	}
	return found;
}

/** Une liste de quantités `3 ; 2`, chacune entière de 0 à `max` */
function parseCounts(value: string, key: string, max: number): number[] {
	const parts = value.split(';').map((part) => part.trim());
	if (parts.length > COLLECTION_MAX_SETS) {
		throw new LineError(
			`${parts.length} valeurs : au plus ${COLLECTION_MAX_SETS} collections par bloc`
		);
	}
	return parts.map((part) => {
		if (!INTEGER_REGEX.test(part) || Number(part) > max) {
			throw new LineError(`${key} « ${part} » : écris un nombre entier de 0 à ${max}`);
		}
		return Number(part);
	});
}

function parseCaptions(value: string): string[] {
	const captions = value.split(';').map((part) => part.trim());
	const tooLong = captions.find((caption) => caption.length > COLLECTION_CAPTION_MAX);
	if (tooLong !== undefined) {
		throw new LineError(
			`légende « ${tooLong.slice(0, 20)}… » trop longue (${COLLECTION_CAPTION_MAX} caractères au plus)`
		);
	}
	return captions;
}

function parseSize(value: string): number {
	const size = SIZE_REGEX.exec(value);
	if (!size)
		throw new LineError(`taille « ${value} » : écris un nombre de centimètres, ex. taille: 6cm`);
	const cm = Number(size[1].replace(',', '.'));
	if (cm < COLLECTION_SIZE_CM.min || cm > COLLECTION_SIZE_CM.max) {
		throw new LineError(
			`taille ${size[1]} cm : choisis entre ${frenchNumber(COLLECTION_SIZE_CM.min)} et ${frenchNumber(COLLECTION_SIZE_CM.max)} cm`
		);
	}
	return cm;
}

/** Valeur à construire : entier de 1 à 100 */
function parseBuild(value: string): number {
	const { min, max } = COLLECTION_BUILD_RANGE;
	if (!INTEGER_REGEX.test(value) || Number(value) < min || Number(value) > max) {
		throw new LineError(`construire « ${value} » : écris un nombre entier de ${min} à ${max}`);
	}
	return Number(value);
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```collection.
 */
export function parseCollectionContent(source: string): CollectionNode {
	const lines = source.split('\n');
	const errors: CollectionIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let tens: number[] | null = null;
	let tensLine = 1;
	let units: number[] | null = null;
	let unitsLine = 1;
	let captions: string[] | null = null;
	let captionsLine = 1;
	let drawing: CollectionDrawing = 'barres';
	let unitLayout: CollectionUnitLayout = 'vrac';
	let sizeCm: number | null = null;
	let build: number | undefined;
	let caseIndex: number | undefined;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. unités: 23)`);
			return;
		}
		if (plain(match[1]) === 'centaines') {
			fail(lineNo, 'centaines : pas encore disponible (dizaines et unités seulement)');
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(
				lineNo,
				`clé « ${match[1]} » inconnue (clés possibles : ${KEY_NAMES.filter((k) => k !== 'case').join(', ')})`
			);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'dizaines':
					tens = parseCounts(value, 'dizaines', COLLECTION_LIMITS.tens);
					tensLine = lineNo;
					break;
				case 'unités':
					units = parseCounts(value, 'unités', COLLECTION_LIMITS.units);
					unitsLine = lineNo;
					break;
				case 'légendes':
					captions = parseCaptions(value);
					captionsLine = lineNo;
					break;
				case 'dessin':
					drawing = oneOf(value, COLLECTION_DRAWINGS, 'dessin');
					break;
				case 'unités en':
					unitLayout = oneOf(value, COLLECTION_UNIT_LAYOUTS, 'unités en');
					break;
				case 'taille':
					sizeCm = parseSize(value);
					break;
				case 'construire':
					// Énoncé d'une évaluation notée : valeur de remplacement (`masked-value.ts`)
					build = isMaskedValue(value) ? 1 : parseBuild(value);
					break;
				case 'case':
					if (!INTEGER_REGEX.test(value)) {
						throw new LineError(`case « ${value} » : numéro de case entier`);
					}
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Bloc à construire : plan vide, aucun ensemble dessiné (lues dans le forEach :
	// TS les croit encore à leur valeur initiale)
	const readBuild = build as number | undefined;
	const readCase = caseIndex as number | undefined;
	if (seen.has('construire')) {
		for (const [key, why] of Object.entries(NOT_WITH_BUILD) as [Key, string][]) {
			const line = seen.get(key);
			if (line !== undefined) fail(line, `${key} : sans objet avec construire:${why}`);
		}
		if (errors.length > 0 || readBuild === undefined) {
			return { type: 'collection', source, spec: null, errors };
		}
		return {
			type: 'collection',
			source,
			spec: { sets: [], captions: null, drawing, unitLayout: 'rangées', sizeCm, build: readBuild },
			errors,
			...(readCase !== undefined && { caseIndex: readCase })
		};
	}
	if (seen.has('case')) fail(seen.get('case')!, 'case: sans objet sans construire:');

	// Les vérifications qui croisent deux lignes, une fois tout lu
	const readTens = tens as number[] | null;
	const readUnits = units as number[] | null;
	const readCaptions = captions as string[] | null;
	let sets: CollectionSet[] | null = null;
	if (!seen.has('dizaines') && !seen.has('unités')) {
		fail(1, 'il manque une quantité : dizaines: ou unités: (ex. unités: 23)');
	} else if (errors.length === 0) {
		if (readTens !== null && readUnits !== null && readTens.length !== readUnits.length) {
			fail(
				unitsLine,
				`dizaines : ${readTens.length} valeur(s), unités : ${readUnits.length} : une par collection`
			);
		} else {
			const count = (readTens ?? readUnits ?? []).length;
			sets = Array.from({ length: count }, (_, i) => ({
				tens: readTens?.[i] ?? 0,
				units: readUnits?.[i] ?? 0
			}));
			sets.forEach((set, i) => {
				const total = 10 * set.tens + set.units;
				if (total > COLLECTION_LIMITS.total) {
					const where = sets!.length > 1 ? ` (collection ${i + 1})` : '';
					fail(
						readUnits === null ? tensLine : unitsLine,
						`${total} objets${where} : ${COLLECTION_LIMITS.total} au plus`
					);
				}
			});
			if (readCaptions !== null && readCaptions.length !== sets.length) {
				fail(
					captionsLine,
					`${readCaptions.length} légende(s) pour ${sets.length} collection(s) : une légende par collection`
				);
			}
		}
	}

	if (errors.length > 0 || sets === null) {
		return { type: 'collection', source, spec: null, errors };
	}
	return {
		type: 'collection',
		source,
		spec: { sets, captions: readCaptions, drawing, unitLayout, sizeCm },
		errors
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseCollection(
	lines: string[],
	startIndex: number,
	end: number
): { node: CollectionNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseCollectionContent(body.join('\n'));
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

/**
 * Un texte contient-il un bloc ```collection à construire (en retrait ou cité
 * compris : le générateur dira qu'il doit être au premier niveau) ?
 */
export function hasCollectionToBuild(markdown: string): boolean {
	return findBuildCollections(markdown).length > 0;
}

/**
 * Blocs ```collection à construire d'un texte, délimités comme le parseur (une
 * ligne vide suivie d'une clé reste dans un bloc fermé, Q66) ; en retrait ou
 * cités compris (`nested`) : le générateur les refuse.
 */
export function findBuildCollections(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	return findCollectionBlockSpans(plain).flatMap(({ startIndex, endIndex, closed }) => {
		const body = plain.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
		if (!body.some((line) => /^construire\s*:/i.test(line))) return [];
		return [{ startIndex, body, closed, nested: lines[startIndex] !== plain[startIndex] }];
	});
}

/**
 * Taille d'une collection dans un CHOIX de QCM imprimé (série figée) : `taille: 3cm`
 * ajouté aux blocs ```collection qui n'en donnent pas (décision 9). À l'écran,
 * c'est le CSS du choix qui réduit la collection.
 */
export function withChoiceCollectionSize(markdown: string): string {
	const lines = markdown.split('\n');
	const blocks = findCollectionBlocks(lines);
	for (const { startIndex, endIndex } of [...blocks].reverse()) {
		const body = lines.slice(startIndex + 1, endIndex + 1);
		if (body.some((line) => /^\s*taille\s*:/i.test(line))) continue;
		lines.splice(startIndex + 1, 0, `taille: ${COLLECTION_SIZE_CM.choice}cm`);
	}
	return lines.join('\n');
}
