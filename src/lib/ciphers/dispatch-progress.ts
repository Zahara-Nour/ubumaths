/**
 * Progression dans les Dépêches du Czar, gardée dans le navigateur seulement :
 * aucune donnée ne quitte l'appareil. Le stockage peut être absent ou refuser
 * l'accès (navigation privée, données effacées) : tout reste alors jouable,
 * simplement sans mémoire d'une visite à l'autre.
 *
 * @module lib/ciphers/dispatch-progress
 */
import { z } from 'zod';
import { DISPATCHES } from './dispatches';

// Constantes

export const PROGRESS_KEY = 'chiphre:depeches-du-czar';

const progressSchema = z
	.array(z.number().int().min(1).max(DISPATCHES.length))
	.max(DISPATCHES.length);

// Functions

/** Numéros des dépêches décryptées ; une valeur illisible vaut une progression vide */
export function loadProgress(storage: Pick<Storage, 'getItem'> | null): number[] {
	try {
		const raw = storage?.getItem(PROGRESS_KEY);
		if (!raw) return [];
		const parsed = progressSchema.safeParse(JSON.parse(raw));
		return parsed.success ? [...new Set(parsed.data)].sort((a, b) => a - b) : [];
	} catch {
		return [];
	}
}

export function saveProgress(
	storage: Pick<Storage, 'setItem'> | null,
	solved: readonly number[]
): void {
	try {
		storage?.setItem(PROGRESS_KEY, JSON.stringify([...new Set(solved)].sort((a, b) => a - b)));
	} catch {
		// Stockage refusé : la partie continue, sans mémoire
	}
}
