/**
 * Atelier — relire un historique de Calcul exporté en JSON
 *
 * Le fichier vient de DEHORS (n'importe qui peut en écrire un) : il est validé
 * par Zod et borné avant que le moindre geste ne soit rejoué. Une seule issue
 * pour tout ce qui n'est pas un historique, en français (E1 à E3).
 *
 * Phase 0 : `docs/wip/atelier-suppression-export-phase0.md`, lot C2.
 *
 * @module atelier/history-import
 */

import { z } from 'zod';
import { HISTORY_FORMAT, HISTORY_VERSION } from './history-export';
import type { ReplayStep } from './desk.svelte';

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, le fichier est refusé avant toute lecture (E3). */
export const MAX_HISTORY_BYTES = 1_000_000;

export const MAX_HISTORY_ENTRIES = 500;

/** Une saisie, un nom, une valeur : rien de ce qu'un élève tape n'approche cette longueur. */
const MAX_INPUT_LENGTH = 2000;

/** Ce que l'écran montrait : relu seulement pour vérifier, mais borné aussi. */
const MAX_TEXT_LENGTH = 20_000;

const NOT_A_HISTORY = 'Ce fichier n’est pas un historique de Calcul.';
const TOO_RECENT = 'Cet historique vient d’une version plus récente de Chiphre.';
const TOO_BIG = 'Cet historique est trop long pour être rejoué.';

// =============================================================================
// Schémas
// =============================================================================

const input = z.string().max(MAX_INPUT_LENGTH);

/** Ce que l'écran montrait — commun à toutes les entrées. */
const shown = {
	label: z.string().max(MAX_TEXT_LENGTH),
	text: z.string().max(MAX_TEXT_LENGTH),
	latex: z.string().max(MAX_TEXT_LENGTH).optional(),
	failed: z.boolean()
};

const entrySchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('saisie'), input, ...shown }),
	z.object({
		kind: z.literal('action'),
		action: z.string().min(1).max(100),
		name: z.string().min(1).max(100),
		value: input.optional(),
		...shown
	}),
	z.object({
		kind: z.literal('garder'),
		line: z.number().int().min(0).max(MAX_HISTORY_ENTRIES),
		...shown
	}),
	/** Une ligne écrite en plus par un geste : relue, jamais rejouée. */
	z.object({ kind: z.literal('ligne'), ...shown })
]);

/** La version seule d'abord : un fichier plus récent est dit tel, pas « illisible » (E2). */
const headerSchema = z.object({
	format: z.literal(HISTORY_FORMAT),
	version: z.number().int().min(1)
});

const historySchema = headerSchema.extend({
	version: z.literal(HISTORY_VERSION),
	exportedAt: z.string().max(100),
	entries: z.array(entrySchema).max(MAX_HISTORY_ENTRIES)
});

// =============================================================================
// Types
// =============================================================================

export type ImportedEntry = z.infer<typeof entrySchema>;
export type ImportedHistory = z.infer<typeof historySchema>;

export type ReadHistory =
	| { readonly ok: true; readonly history: ImportedHistory }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

/** Lire le contenu d'un fichier choisi par l'élève. */
export function readHistory(text: string): ReadHistory {
	if (text.length > MAX_HISTORY_BYTES) return { ok: false, message: TOO_BIG };
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { ok: false, message: NOT_A_HISTORY };
	}
	const header = headerSchema.safeParse(raw);
	if (!header.success) return { ok: false, message: NOT_A_HISTORY };
	if (header.data.version > HISTORY_VERSION) return { ok: false, message: TOO_RECENT };

	const history = historySchema.safeParse(raw);
	if (!history.success) {
		const tooMany = history.error.issues.some((i) => i.code === 'too_big');
		return { ok: false, message: tooMany ? TOO_BIG : NOT_A_HISTORY };
	}
	return { ok: true, history: history.data };
}

/** Le geste d'une entrée relue, s'il y en a un à rejouer. */
export function stepOf(entry: ImportedEntry): ReplayStep | null {
	switch (entry.kind) {
		case 'saisie':
			return { kind: 'saisie', input: entry.input };
		case 'action':
			return {
				kind: 'action',
				action: entry.action,
				name: entry.name,
				...(entry.value !== undefined && { value: entry.value })
			};
		case 'garder':
			return { kind: 'garder', line: entry.line };
		default:
			return null;
	}
}
