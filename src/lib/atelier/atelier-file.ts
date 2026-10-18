/**
 * Atelier — enregistrer et charger l'atelier entier dans un fichier
 *
 * Lot 1 de `docs/wip/atelier-refonte-interface-phase0.md` (décision de David du
 * 2026-10-18). Le JSON « pour rejouer » (`history-export.ts`) ne garde que les
 * gestes de Calcul : une définition changée sur une carte, une couleur, le
 * tableur s'y perdaient. Le fichier `.atelier.json` porte donc l'état complet,
 * celui que `persistence.ts` range dans le navigateur, et l'historique de la
 * console tel que `history-storage.ts` le range.
 *
 * ⚠️ SÉCURITÉ : le fichier vient de DEHORS (n'importe qui peut en écrire un).
 * Taille bornée avant toute lecture, puis les mêmes schémas Zod que le
 * navigateur : objets triés un par un, formules de la console passées par la
 * liste blanche de `safe-latex.ts`. Un fichier refusé ne remplace rien.
 *
 * Module pur : la page télécharge et choisit le fichier, ce module écrit et lit.
 *
 * @module atelier/atelier-file
 */

import { z } from 'zod';
import type { Entry } from './desk.svelte';
import { HISTORY_FORMAT } from './history-export';
import { readHistory, type ImportedHistory } from './history-import';
import {
	keptHistoryOf,
	offeredLineCount,
	readKeptHistory,
	type KeptHistory
} from './history-storage';
import {
	ATELIER_STATE_VERSION,
	atelierShellSchema,
	salvageState,
	type AtelierState
} from './persistence';

// =============================================================================
// Constantes
// =============================================================================

export const ATELIER_FILE_FORMAT = 'chiphre-atelier';

/** À incrémenter dès que l'enveloppe change : une version plus récente est refusée. */
export const ATELIER_FILE_VERSION = 1;

/**
 * Au-delà, le fichier est refusé avant d'être lu. L'atelier a droit à 500 000
 * caractères (`persistence.ts`), la console à 200 000 (`history-storage.ts`) :
 * 1 000 000 laisse la marge de l'enveloppe.
 */
export const MAX_ATELIER_FILE_LENGTH = 1_000_000;

/**
 * Le garde-fou de la page, AVANT lecture : `File.size` compte des octets, la
 * limite ci-dessus des caractères. Un caractère pèse jusqu'à 4 octets en UTF-8
 * (accents, ′, « ») : un atelier légitime riche en accents dépasse 1 Mo. La
 * limite exacte reste celle en caractères, dans `readAtelierFile` (revue de #1479).
 */
export const MAX_ATELIER_FILE_BYTES = 4 * MAX_ATELIER_FILE_LENGTH;

const NOT_AN_ATELIER = 'Ce fichier n’est pas un atelier Chiphre.';
const TOO_RECENT = 'Cet atelier vient d’une version plus récente de Chiphre.';
/** Aussi dit par la page, qui refuse un fichier trop gros avant même de le lire. */
export const ATELIER_FILE_TOO_BIG = 'Ce fichier est trop gros pour être un atelier.';

/** L'en-tête seul d'abord : une version plus récente est dite telle, pas « illisible ». */
const headerSchema = z.object({
	format: z.literal(ATELIER_FILE_FORMAT),
	version: z.number().int().min(1)
});

/** L'enveloppe : l'atelier y est jugé par `persistence.ts`, la console à part. */
const fileSchema = headerSchema.extend({
	version: z.literal(ATELIER_FILE_VERSION),
	atelier: atelierShellSchema,
	history: z.unknown().optional()
});

/** Le format seul : distinguer un ancien historique « pour rejouer » d'un atelier. */
const formatSchema = z.object({ format: z.string() });

/** La version de l'atelier seule : plus récente, elle est dite telle, pas « illisible ». */
const atelierVersionSchema = z.object({ atelier: z.object({ version: z.number() }) });

const CONSOLE_UNREADABLE = 'La console de ce fichier était illisible : elle n’a pas été chargée.';
const CONSOLE_TOO_RECENT =
	'La console de ce fichier vient d’une version plus récente de Chiphre : elle n’a pas été chargée.';

const EMPTY_HISTORY: KeptHistory = { lines: [], typed: [] };

// =============================================================================
// Types
// =============================================================================

export interface AtelierFile {
	readonly format: typeof ATELIER_FILE_FORMAT;
	readonly version: typeof ATELIER_FILE_VERSION;
	readonly savedAt: string;
	readonly atelier: AtelierState;
	readonly history: ReturnType<typeof keptHistoryOf>;
}

export type ReadAtelierFile =
	/** Un atelier : il remplacera tout, console comprise. */
	| {
			readonly kind: 'atelier';
			readonly state: AtelierState;
			readonly history: KeptHistory;
			/** Objets et cellules illisibles, écartés : à dire à l'élève. */
			readonly dropped: number;
			/** Ce qui s'est perdu de la console (illisible, trop récente, lignes écartées), sinon `null`. */
			readonly consoleNotice: string | null;
	  }
	/** Un historique JSON d'avant la refonte : il sera rejoué, comme avant. */
	| { readonly kind: 'replay'; readonly history: ImportedHistory }
	| { readonly kind: 'error'; readonly message: string };

// =============================================================================
// Écrire
// =============================================================================

/** `atelier-2026-10-18.atelier.json` : la date du jour de l'élève, pas celle de Greenwich. */
export function atelierFileName(now: Date): string {
	const day = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0')
	].join('-');
	return `atelier-${day}.atelier.json`;
}

/** Le fichier de l'atelier : son état complet, et la console telle qu'on la range. */
export function atelierFileToJson(
	state: AtelierState,
	entries: readonly Entry[],
	typed: readonly string[],
	now: Date
): string {
	const file: AtelierFile = {
		format: ATELIER_FILE_FORMAT,
		version: ATELIER_FILE_VERSION,
		savedAt: now.toISOString(),
		atelier: state,
		history: keptHistoryOf(entries, typed)
	};
	return JSON.stringify(file);
}

// =============================================================================
// Lire
// =============================================================================

/** Lire le contenu d'un fichier choisi par l'élève. Refusé : rien n'est remplacé. */
export function readAtelierFile(text: string): ReadAtelierFile {
	if (text.length > MAX_ATELIER_FILE_LENGTH)
		return { kind: 'error', message: ATELIER_FILE_TOO_BIG };

	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { kind: 'error', message: NOT_AN_ATELIER };
	}

	// Un historique « pour rejouer » d'avant la refonte : son propre lecteur, ses messages
	const format = formatSchema.safeParse(raw);
	if (format.success && format.data.format === HISTORY_FORMAT) {
		const read = readHistory(text);
		return read.ok
			? { kind: 'replay', history: read.history }
			: { kind: 'error', message: read.message };
	}

	const header = headerSchema.safeParse(raw);
	if (!header.success) return { kind: 'error', message: NOT_AN_ATELIER };
	if (header.data.version > ATELIER_FILE_VERSION) return { kind: 'error', message: TOO_RECENT };

	// L'atelier a sa propre version : plus récente, on ne le relit pas (§5 L2)
	const atelierVersion = atelierVersionSchema.safeParse(raw);
	if (atelierVersion.success && atelierVersion.data.atelier.version > ATELIER_STATE_VERSION) {
		return { kind: 'error', message: TOO_RECENT };
	}

	const file = fileSchema.safeParse(raw);
	if (!file.success) return { kind: 'error', message: NOT_AN_ATELIER };

	// Un objet abîmé n'emporte pas les autres ; une console illisible part seule
	const { state, dropped } = salvageState(file.data.atelier);
	return { kind: 'atelier', state, dropped, ...readConsole(file.data.history) };
}

/** La console du fichier, et ce qui s'en est perdu, à dire à l'élève (revue de #1479). */
function readConsole(raw: unknown): { history: KeptHistory; consoleNotice: string | null } {
	// Un fichier sans console n'a rien perdu
	if (raw === undefined) return { history: EMPTY_HISTORY, consoleNotice: null };

	const read = readKeptHistory(raw);
	if (read.kind === 'too-recent')
		return { history: EMPTY_HISTORY, consoleNotice: CONSOLE_TOO_RECENT };

	const offered = offeredLineCount(raw);
	if (offered === null) return { history: EMPTY_HISTORY, consoleNotice: CONSOLE_UNREADABLE };

	const lost = offered - read.history.lines.length;
	return {
		history: read.history,
		consoleNotice: lost > 0 ? `${lost} ligne(s) de la console étaient illisibles.` : null
	};
}
