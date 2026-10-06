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
/** Indices déjà vus : ils survivent à un aller-retour vers les outils */
export const HINTS_KEY = 'chiphre:depeches-du-czar:indices';

const progressSchema = z
	.array(z.number().int().min(1).max(DISPATCHES.length))
	.max(DISPATCHES.length);
const hintsSchema = z.record(z.string().regex(/^[1-9]$/), z.number().int().min(0).max(2));

// Functions

/** Numéros des dépêches décryptées ; une valeur illisible vaut une progression vide */
export function loadProgress(storage: Pick<Storage, 'getItem'> | null): number[] {
	try {
		const raw = storage?.getItem(PROGRESS_KEY);
		if (!raw) return [];
		const parsed = progressSchema.safeParse(JSON.parse(raw));
		if (!parsed.success) return [];
		// Seule la chaîne continue 1, 2, …, k a pu être jouée : le reste est ignoré
		const solved = new Set(parsed.data);
		const chain: number[] = [];
		while (solved.has(chain.length + 1)) chain.push(chain.length + 1);
		return chain;
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

/** Nombre d'indices vus par dépêche ; une valeur illisible vaut « aucun » */
export function loadHints(storage: Pick<Storage, 'getItem'> | null): Record<number, number> {
	try {
		const raw = storage?.getItem(HINTS_KEY);
		if (!raw) return {};
		const parsed = hintsSchema.safeParse(JSON.parse(raw));
		if (!parsed.success) return {};
		return Object.fromEntries(
			Object.entries(parsed.data).map(([number, count]) => [Number(number), count])
		);
	} catch {
		return {};
	}
}

export function saveHints(
	storage: Pick<Storage, 'setItem'> | null,
	hints: Record<number, number>
): void {
	try {
		storage?.setItem(HINTS_KEY, JSON.stringify(hints));
	} catch {
		// Stockage refusé : les indices seront à redemander
	}
}
