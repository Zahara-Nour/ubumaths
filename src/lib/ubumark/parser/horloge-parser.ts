/**
 * Bloc ```horloge — analyse du texte
 * ==================================
 *
 * ```horloge
 * heure: 8 h 30 ; 8 h 45
 * légendes: Départ ; Arrivée
 * chiffres: tous | quarts | aucun
 * graduations: minutes | heures | aucune
 * minutes: visibles | cachées
 * cadran: 12 | 24
 * taille: 4cm
 * ```
 *
 * - `heure:` (obligatoire) : 1 à 4 heures séparées par `;`, écrites `9 h`,
 *   `9 h 30`, `9h5` ; heures de 0 à 23, minutes de 0 à 59.
 * - Le reste est facultatif ; une clé inconnue ou une valeur hors liste est
 *   une erreur située, jamais un réglage ignoré.
 *
 * Dans un modèle de question, `{{h}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * messages). Repérage et blocs non fermés : ceux de ```qr (Q63, Q66).
 *
 * Phase 0 : `docs/wip/horloge-progress.md`.
 *
 * @module ubumark/parser/horloge-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	HORLOGE_CAPTION_MAX,
	HORLOGE_MAX_CLOCKS,
	HORLOGE_NUMBERS,
	HORLOGE_SIZE_CM,
	HORLOGE_TICKS,
	type HorlogeBlockRange,
	type HorlogeIssue,
	type HorlogeNode,
	type HorlogeNumbers,
	type HorlogeTicks,
	type HorlogeTime
} from '../types/horloge';

// ============================================================================
// CONSTANTES
// ============================================================================

const HORLOGE_BLOCK_START_REGEX = /^```horloge\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `9 h`, `9 h 30`, `9h5` ; le signe est lu pour dire « de 0 à 23 » plutôt que « illisible » */
const TIME_REGEX = /^(-?\d+)\s*h(?:\s*(\d+))?$/;

/** `3cm`, `2,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = [
	'heure',
	'légendes',
	'legendes',
	'chiffres',
	'graduations',
	'minutes',
	'cadran',
	'taille'
] as const;

type Key = 'heure' | 'légendes' | 'chiffres' | 'graduations' | 'minutes' | 'cadran' | 'taille';

const KEY_NAMES: Key[] = [
	'heure',
	'légendes',
	'chiffres',
	'graduations',
	'minutes',
	'cadran',
	'taille'
];

const TIME_FORMAT_HINT = 'écris l’heure sous la forme 9 h 30 (ou 9 h)';

// ============================================================================
// DÉTECTION
// ============================================================================

export function isHorlogeBlockStart(line: string): boolean {
	return HORLOGE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```horloge d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findHorlogeBlocks(lines: string[]): HorlogeBlockRange[] {
	const blocks: HorlogeBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isHorlogeBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
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

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

/** `2.5` → `2,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(value).replace('.', ',');
}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'legendes') return 'légendes';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

/** Retire les accents d'une valeur (`cachées` = `cachees`) */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], key: string): T {
	const found = allowed.find((value) => plain(value) === plain(raw));
	if (found === undefined) {
		throw new LineError(`${key} « ${raw} » : valeurs possibles ${allowed.join(', ')}`);
	}
	return found;
}

function parseTime(raw: string): HorlogeTime {
	const match = TIME_REGEX.exec(raw);
	if (!match) throw new LineError(`heure « ${raw} » non comprise : ${TIME_FORMAT_HINT}`);
	const hours = Number(match[1]);
	const minutes = match[2] === undefined ? 0 : Number(match[2]);
	if (hours < 0 || hours > 23) {
		throw new LineError(`heure « ${raw} » : de 0 à 23 h (minuit s’écrit 0 h)`);
	}
	if (minutes > 59) throw new LineError(`heure « ${raw} » : minutes de 0 à 59`);
	return { hours, minutes };
}

function parseTimes(value: string): HorlogeTime[] {
	const parts = value.split(';').map((part) => part.trim());
	if (parts.length > HORLOGE_MAX_CLOCKS) {
		throw new LineError(`${parts.length} heures : au plus ${HORLOGE_MAX_CLOCKS} horloges par bloc`);
	}
	return parts.map(parseTime);
}

function parseCaptions(value: string): string[] {
	const captions = value.split(';').map((part) => part.trim());
	const tooLong = captions.find((caption) => caption.length > HORLOGE_CAPTION_MAX);
	if (tooLong !== undefined) {
		throw new LineError(
			`légende « ${tooLong.slice(0, 20)}… » trop longue (${HORLOGE_CAPTION_MAX} caractères au plus)`
		);
	}
	return captions;
}

function parseSize(value: string): number {
	const size = SIZE_REGEX.exec(value);
	if (!size)
		throw new LineError(`taille « ${value} » : écris un nombre de centimètres, ex. taille: 4cm`);
	const cm = Number(size[1].replace(',', '.'));
	if (cm < HORLOGE_SIZE_CM.min || cm > HORLOGE_SIZE_CM.max) {
		throw new LineError(
			`taille ${size[1]} cm : choisis entre ${frenchNumber(HORLOGE_SIZE_CM.min)} et ${frenchNumber(HORLOGE_SIZE_CM.max)} cm`
		);
	}
	return cm;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```horloge.
 */
export function parseHorlogeContent(source: string): HorlogeNode {
	const lines = source.split('\n');
	const errors: HorlogeIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let times: HorlogeTime[] | null = null;
	let timesLine = 1;
	let captions: string[] | null = null;
	let captionsLine = 1;
	let numbers: HorlogeNumbers = 'tous';
	let ticks: HorlogeTicks = 'minutes';
	let minuteHand = true;
	let dial24 = false;
	let sizeCm: number | null = null;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. heure: 9 h 30)`);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_NAMES.join(', ')})`);
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
				case 'heure':
					times = parseTimes(value);
					timesLine = lineNo;
					break;
				case 'légendes':
					captions = parseCaptions(value);
					captionsLine = lineNo;
					break;
				case 'chiffres':
					numbers = oneOf(value, HORLOGE_NUMBERS, 'chiffres');
					break;
				case 'graduations':
					ticks = oneOf(value, HORLOGE_TICKS, 'graduations');
					break;
				case 'minutes':
					minuteHand = oneOf(value, ['visibles', 'cachées'] as const, 'minutes') === 'visibles';
					break;
				case 'cadran':
					dial24 = oneOf(value, ['12', '24'] as const, 'cadran') === '24';
					break;
				case 'taille':
					sizeCm = parseSize(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Les vérifications qui croisent deux lignes, une fois tout lu
	const readTimes = times as HorlogeTime[] | null;
	const readCaptions = captions as string[] | null;
	if (readTimes === null) {
		if (!seen.has('heure')) fail(1, 'il manque la ligne heure: (ex. heure: 9 h 30)');
	} else {
		if (!minuteHand && readTimes.some((t) => t.minutes !== 0)) {
			fail(
				timesLine,
				'aiguille des minutes cachée : écris une heure entière (ex. heure: 9 h), sinon la petite aiguille ne se lit pas'
			);
		}
		if (readCaptions !== null && readCaptions.length !== readTimes.length) {
			fail(
				captionsLine,
				`${readCaptions.length} légende(s) pour ${readTimes.length} horloge(s) : une légende par heure`
			);
		}
	}

	if (errors.length > 0 || readTimes === null) {
		return { type: 'horloge', source, spec: null, errors };
	}
	return {
		type: 'horloge',
		source,
		spec: { times: readTimes, captions: readCaptions, numbers, ticks, minuteHand, dial24, sizeCm },
		errors
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseHorloge(
	lines: string[],
	startIndex: number,
	end: number
): { node: HorlogeNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseHorlogeContent(body.join('\n'));
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
 * Taille d'une horloge dans un CHOIX de QCM imprimé (série figée) : `taille: 3cm`
 * ajouté aux blocs ```horloge qui n'en donnent pas (décision 6). À l'écran, c'est
 * le CSS du choix qui réduit le cadran.
 */
export function withChoiceClockSize(markdown: string): string {
	const lines = markdown.split('\n');
	const blocks = findHorlogeBlocks(lines);
	for (const { startIndex, endIndex } of [...blocks].reverse()) {
		const body = lines.slice(startIndex + 1, endIndex + 1);
		if (body.some((line) => /^\s*taille\s*:/i.test(line))) continue;
		lines.splice(startIndex + 1, 0, `taille: ${HORLOGE_SIZE_CM.choice}cm`);
	}
	return lines.join('\n');
}
