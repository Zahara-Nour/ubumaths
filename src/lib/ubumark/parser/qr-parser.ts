/**
 * Bloc ```qr — analyse du texte
 * =============================
 *
 * ```qr
 * https://www.chiph.re/glossaire
 * légende: Le glossaire en ligne
 * taille: 3cm
 * ```
 *
 * - Ligne 1 : l'adresse (`/glossaire`, `chiph.re/…` ou `https://…` extérieure,
 *   cf. `qr/qr-target.ts`).
 * - Puis, facultatives : `légende:` (120 caractères au plus) et `taille:`
 *   (2 à 6 cm, unité `cm` obligatoire, virgule décimale acceptée).
 *
 * Une erreur ne fait pas disparaître le bloc : le nœud porte ses messages
 * situés et le renderer les montre au prof (Q48). Repérage et blocs non
 * fermés : ceux de ```line / ```trig (Q63, Q66).
 *
 * Volontairement LÉGER : aucun import de `uqr` (le parseur Markdown est dans
 * le chunk de toutes les pages) ; la matrice est calculée au rendu.
 *
 * @module ubumark/parser/qr-parser
 */

import { z } from 'zod';
import { normalizeQrTarget } from '$lib/qr/qr-target';
import { specialBlockEnd } from './unclosed-block';
import { QR_CAPTION_MAX, QR_SIZE_CM } from '../types/qr';
import type { QrBlockRange, QrIssue, QrNode } from '../types/qr';

// ============================================================================
// CONSTANTES
// ============================================================================

const QR_BLOCK_START_REGEX = /^```qr\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `3cm`, `2,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = ['légende', 'legende', 'taille'] as const;

/** Gabarit inséré par le bouton « Insérer un QR code » de l'éditeur riche */
export const QR_TEMPLATE = '/glossaire\nlégende: Le glossaire en ligne\ntaille: 3cm';

/** Garde finale des réglages lus (bornes de la phase 0) */
const qrSettingsSchema = z.object({
	url: z.string().min(1).nullable(),
	caption: z.string().max(QR_CAPTION_MAX).nullable(),
	sizeCm: z.number().min(QR_SIZE_CM.min).max(QR_SIZE_CM.max)
});

// ============================================================================
// DÉTECTION
// ============================================================================

/** `2.5` → `2,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(value).replace('.', ',');
}

export function isQrBlockStart(line: string): boolean {
	return QR_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```qr d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findQrBlocks(lines: string[]): QrBlockRange[] {
	const blocks: QrBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isQrBlockStart(lines[i])) {
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

function normalizeKey(key: string): 'légende' | 'taille' | null {
	const lower = key.toLowerCase();
	if (lower === 'légende' || lower === 'legende') return 'légende';
	if (lower === 'taille') return 'taille';
	return null;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```qr.
 */
export function parseQrContent(source: string): QrNode {
	const lines = source.split('\n');
	const errors: QrIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let url: string | null = null;
	let caption: string | null = null;
	let sizeCm: number = QR_SIZE_CM.default;
	const seen = new Map<string, number>();

	const firstIndex = lines.findIndex((line) => line.trim() !== '');
	if (firstIndex === -1) {
		fail(1, 'adresse manquante (la première ligne du bloc est l’adresse, ex. /glossaire)');
	} else {
		const target = normalizeQrTarget(lines[firstIndex]);
		if ('url' in target) url = target.url;
		else fail(firstIndex + 1, target.error);
	}

	for (let k = firstIndex + 1; firstIndex !== -1 && k < lines.length; k++) {
		const text = lines[k].trim();
		if (text === '') continue;
		const lineNo = k + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : légende: … ou taille: …)`);
			continue;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : légende, taille)`);
			continue;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			continue;
		}
		seen.set(key, lineNo);

		if (key === 'légende') {
			if (value.length > QR_CAPTION_MAX) {
				fail(lineNo, `légende trop longue (${value.length} caractères, ${QR_CAPTION_MAX} au plus)`);
			} else {
				caption = value === '' ? null : value;
			}
			continue;
		}

		const size = SIZE_REGEX.exec(value);
		if (!size) {
			fail(lineNo, `taille « ${value} » : écris un nombre de centimètres, ex. taille: 3cm`);
			continue;
		}
		const cm = Number(size[1].replace(',', '.'));
		if (cm < QR_SIZE_CM.min || cm > QR_SIZE_CM.max) {
			fail(
				lineNo,
				`taille ${size[1]} cm : choisis entre ${frenchNumber(QR_SIZE_CM.min)} et ${frenchNumber(QR_SIZE_CM.max)} cm`
			);
			continue;
		}
		sizeCm = cm;
	}

	// Garde finale : ce qui sort du bloc respecte toujours les bornes
	const settings = qrSettingsSchema.safeParse({ url, caption, sizeCm });
	if (!settings.success) {
		return {
			type: 'qr',
			source,
			url: null,
			caption: null,
			sizeCm: QR_SIZE_CM.default,
			errors: errors.length > 0 ? errors : [{ message: 'réglages du QR code invalides' }]
		};
	}
	return { type: 'qr', source, ...settings.data, errors };
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseQr(lines: string[], startIndex: number, end: number): { node: QrNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseQrContent(body.join('\n'));
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
