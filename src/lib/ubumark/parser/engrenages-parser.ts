/**
 * Bloc ```engrenages — analyse du texte
 * =====================================
 *
 * ```engrenages
 * roues: 12 ; 18 ; 8
 * légendes: A ; B ; C
 * taille: 8cm
 * ```
 *
 * - `roues:` (obligatoire) : 2 ou 3 nombres entiers de dents, de 6 à 60,
 *   séparés par `;`, de gauche à droite.
 * - `légendes:` (facultatif, A ; B ; C par défaut) : une par roue, 20
 *   caractères au plus.
 * - `taille:` (facultatif, 8 cm) : largeur de la figure, 4 à 16 cm, unité `cm`
 *   obligatoire, virgule décimale acceptée.
 *
 * Dans un modèle de question, `{{a}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc : le nœud porte ses
 * messages situés et le renderer les montre au prof (Q48). Repérage et blocs
 * non fermés : ceux de ```qr (Q63, Q66).
 *
 * Phase 0 : `docs/wip/outil-engrenages-progress.md`.
 *
 * @module ubumark/parser/engrenages-parser
 */

import { z } from 'zod';
import { specialBlockEnd } from './unclosed-block';
import {
	ENGRENAGES_CAPTION_MAX,
	ENGRENAGES_DEFAULT_LABELS,
	ENGRENAGES_SIZE_CM,
	ENGRENAGES_TEETH,
	ENGRENAGES_WHEELS
} from '../types/engrenages';
import type {
	EngrenagesBlockRange,
	EngrenagesIssue,
	EngrenagesNode,
	EngrenagesWheel
} from '../types/engrenages';

// ============================================================================
// TYPES
// ============================================================================

type Key = 'roues' | 'légendes' | 'taille';

// ============================================================================
// CONSTANTES
// ============================================================================

const ENGRENAGES_BLOCK_START_REGEX = /^```engrenages\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `8cm`, `10,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/** Un nombre entier de dents */
const TEETH_REGEX = /^\d+$/;

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = ['roues', 'légendes', 'legendes', 'taille'] as const;

/** Gabarit d'exemple (catalogue, éditeur) */
export const ENGRENAGES_TEMPLATE = 'roues: 12 ; 18\nlégendes: A ; B\ntaille: 8cm';

/** Garde finale des réglages lus (bornes de la phase 0) */
const gearsSettingsSchema = z.object({
	wheels: z
		.array(
			z.object({
				teeth: z.number().int().min(ENGRENAGES_TEETH.min).max(ENGRENAGES_TEETH.max),
				label: z.string().min(1).max(ENGRENAGES_CAPTION_MAX)
			})
		)
		.min(ENGRENAGES_WHEELS.min)
		.max(ENGRENAGES_WHEELS.max),
	sizeCm: z.number().min(ENGRENAGES_SIZE_CM.min).max(ENGRENAGES_SIZE_CM.max)
});

// ============================================================================
// DÉTECTION
// ============================================================================

/** `10.5` → `10,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(value).replace('.', ',');
}

export function isEngrenagesBlockStart(line: string): boolean {
	return ENGRENAGES_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```engrenages d'une liste de lignes (indices inclusifs, clôtures
 * comprises). Fermé par un ``` qui ne fait pas lire du texte comme contenu
 * (Q66), sinon jusqu'à la première ligne vide (Q63).
 */
export function findEngrenagesBlocks(lines: string[]): EngrenagesBlockRange[] {
	const blocks: EngrenagesBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isEngrenagesBlockStart(lines[i])) {
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

function normalizeKey(key: string): Key | null {
	const lower = key.toLowerCase();
	if (lower === 'roues') return 'roues';
	if (lower === 'légendes' || lower === 'legendes') return 'légendes';
	if (lower === 'taille') return 'taille';
	return null;
}

const splitList = (value: string) => value.split(';').map((part) => part.trim());

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```engrenages.
 */
export function parseEngrenagesContent(source: string): EngrenagesNode {
	const lines = source.split('\n');
	const errors: EngrenagesIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let teeth: number[] | null = null;
	let labels: { values: string[]; line: number } | null = null;
	let sizeCm: number = ENGRENAGES_SIZE_CM.default;
	const seen = new Map<Key, number>();

	for (let k = 0; k < lines.length; k++) {
		const text = lines[k].trim();
		if (text === '') continue;
		const lineNo = k + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : roues: …, légendes: … ou taille: …)`);
			continue;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : roues, légendes, taille)`);
			continue;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			continue;
		}
		seen.set(key, lineNo);

		if (key === 'roues') {
			const parts = splitList(value);
			if (parts.length < ENGRENAGES_WHEELS.min || parts.length > ENGRENAGES_WHEELS.max) {
				fail(
					lineNo,
					`${parts.length} roue${parts.length > 1 ? 's' : ''} : écris 2 ou 3 roues, ex. roues: 12 ; 18`
				);
				continue;
			}
			const read: number[] = [];
			for (const part of parts) {
				if (!TEETH_REGEX.test(part)) {
					fail(lineNo, `« ${part} » : écris un nombre entier de dents, ex. 12`);
					continue;
				}
				const n = Number(part);
				if (n < ENGRENAGES_TEETH.min || n > ENGRENAGES_TEETH.max) {
					fail(
						lineNo,
						`${n} dents : choisis entre ${ENGRENAGES_TEETH.min} et ${ENGRENAGES_TEETH.max} dents`
					);
					continue;
				}
				read.push(n);
			}
			if (read.length === parts.length) teeth = read;
			continue;
		}

		if (key === 'légendes') {
			const parts = splitList(value);
			const empty = parts.some((p) => p === '');
			const tooLong = parts.find((p) => p.length > ENGRENAGES_CAPTION_MAX);
			if (empty) fail(lineNo, 'légende vide (écris une légende par roue, séparées par « ; »)');
			else if (tooLong !== undefined)
				fail(
					lineNo,
					`légende « ${tooLong} » trop longue (${ENGRENAGES_CAPTION_MAX} caractères au plus)`
				);
			else labels = { values: parts, line: lineNo };
			continue;
		}

		const size = SIZE_REGEX.exec(value);
		if (!size) {
			fail(lineNo, `taille « ${value} » : écris un nombre de centimètres, ex. taille: 8cm`);
			continue;
		}
		const cm = Number(size[1].replace(',', '.'));
		if (cm < ENGRENAGES_SIZE_CM.min || cm > ENGRENAGES_SIZE_CM.max) {
			fail(
				lineNo,
				`taille ${size[1]} cm : choisis entre ${frenchNumber(ENGRENAGES_SIZE_CM.min)} et ${frenchNumber(ENGRENAGES_SIZE_CM.max)} cm`
			);
			continue;
		}
		sizeCm = cm;
	}

	if (!seen.has('roues')) {
		errors.push({ message: 'roues: manquant (ex. roues: 12 ; 18)', line: 1 });
	}
	if (teeth !== null && labels !== null && labels.values.length !== teeth.length) {
		fail(labels.line, `${labels.values.length} légendes pour ${teeth.length} roues`);
	}

	const failed = (): EngrenagesNode => ({
		type: 'engrenages',
		source,
		wheels: null,
		sizeCm: ENGRENAGES_SIZE_CM.default,
		errors: errors.length > 0 ? errors : [{ message: 'réglages des engrenages invalides' }]
	});
	if (errors.length > 0 || teeth === null) return failed();

	const names = labels?.values ?? ENGRENAGES_DEFAULT_LABELS;
	const wheels: EngrenagesWheel[] = teeth.map((n, i) => ({ teeth: n, label: names[i] }));

	// Garde finale : ce qui sort du bloc respecte toujours les bornes
	const settings = gearsSettingsSchema.safeParse({ wheels, sizeCm });
	if (!settings.success) return failed();
	return { type: 'engrenages', source, ...settings.data, errors: [] };
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseEngrenages(
	lines: string[],
	startIndex: number,
	end: number
): { node: EngrenagesNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseEngrenagesContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			wheels: null,
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
