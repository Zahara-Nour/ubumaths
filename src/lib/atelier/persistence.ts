/**
 * Atelier — ranger et relire l'état local
 *
 * Sans compte, le navigateur est la seule mémoire de l'élève : ce module ne
 * doit donc jamais perdre son travail en silence. Chaque issue est nommée, et
 * l'appelant décide quoi lui dire (§5).
 *
 * Le stockage est **injecté** plutôt qu'importé : la logique se teste sans
 * navigateur, et `null` représente le cas « stockage refusé » — navigation
 * privée, site bloqué (§5 E1).
 *
 * @module atelier/persistence
 */

import { z } from 'zod';
import type { ObjectKind } from './types';

// =============================================================================
// Constantes
// =============================================================================

export const ATELIER_STORAGE_KEY = 'chiphre-atelier';

/**
 * Version du format rangé.
 *
 * À incrémenter dès que la forme change. Un état d'une version PLUS RÉCENTE
 * n'est jamais relu ni écrasé : l'élève a peut-être ouvert l'atelier ailleurs
 * dans une version plus neuve, et son travail vaut mieux que le nôtre (§5 L2).
 */
export const ATELIER_STATE_VERSION = 1;

// =============================================================================
// Forme rangée
// =============================================================================

/**
 * Ce qu'on range d'un objet : de quoi le reconstruire, rien de plus.
 *
 * Statut, message et manquants ne sont PAS rangés — ils se recalculent à la
 * relecture. Les ranger, c'est risquer de relire un verdict devenu faux.
 */
const storedObjectSchema = z.object({
	name: z.string().min(1).max(8),
	kind: z.enum(['value', 'function', 'sequence', 'list']),
	definition: z.string().max(4000)
});

const atelierStateSchema = z.object({
	version: z.number().int().positive(),
	objects: z.array(storedObjectSchema).max(64)
});

export interface StoredObject {
	readonly name: string;
	readonly kind: ObjectKind;
	readonly definition: string;
}

export interface AtelierState {
	readonly version: number;
	readonly objects: readonly StoredObject[];
}

// =============================================================================
// Issues
// =============================================================================

export type LoadOutcome =
	| { readonly kind: 'empty' }
	| { readonly kind: 'loaded'; readonly state: AtelierState }
	/** §5 L2 — plus récent que nous : on ne relit pas, et on n'écrase pas. */
	| { readonly kind: 'too-recent'; readonly version: number; readonly raw: string }
	/** §5 L3 — illisible : atelier vide et message, jamais d'écran blanc. */
	| { readonly kind: 'corrupt'; readonly message: string }
	/** §5 E1 — stockage refusé : tout marche, rien n'est conservé. */
	| { readonly kind: 'unavailable' };

export type SaveOutcome =
	| { readonly kind: 'saved' }
	/** §5 L1 — plus de place : prévenir, jamais réduire en douce. */
	| { readonly kind: 'quota'; readonly message: string }
	/** §5 L2 — un état plus récent occupe la place. */
	| { readonly kind: 'refused-newer'; readonly version: number }
	| { readonly kind: 'unavailable' };

// =============================================================================
// Lire
// =============================================================================

export function loadAtelier(storage: Storage | null): LoadOutcome {
	if (!storage) return { kind: 'unavailable' };

	let raw: string | null;
	try {
		raw = storage.getItem(ATELIER_STORAGE_KEY);
	} catch {
		// Un navigateur peut refuser jusqu'à la lecture (site bloqué).
		return { kind: 'unavailable' };
	}
	if (raw === null) return { kind: 'empty' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { kind: 'corrupt', message: "L'atelier enregistré est illisible." };
	}

	// La version se lit AVANT la validation : un format plus récent a le droit
	// d'avoir une forme qu'on ne connaît pas encore.
	const version = (parsed as { version?: unknown })?.version;
	if (typeof version === 'number' && version > ATELIER_STATE_VERSION) {
		return { kind: 'too-recent', version, raw };
	}

	const check = atelierStateSchema.safeParse(parsed);
	if (!check.success) {
		return { kind: 'corrupt', message: "L'atelier enregistré n'a pas la forme attendue." };
	}
	return { kind: 'loaded', state: check.data };
}

// =============================================================================
// Ranger
// =============================================================================

export function saveAtelier(storage: Storage | null, state: AtelierState): SaveOutcome {
	if (!storage) return { kind: 'unavailable' };

	// Ne jamais écraser plus récent que soi (§5 L2).
	const existing = loadAtelier(storage);
	if (existing.kind === 'too-recent') {
		return { kind: 'refused-newer', version: existing.version };
	}
	if (existing.kind === 'unavailable') return { kind: 'unavailable' };

	try {
		storage.setItem(ATELIER_STORAGE_KEY, JSON.stringify(state));
		return { kind: 'saved' };
	} catch (error) {
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			// ⚠️ On ne réduit PAS l'atelier pour faire tenir : le store de la
			// calculatrice le fait et vide l'historique sans rien dire. Ici c'est
			// le travail de l'élève, il doit savoir et choisir.
			return {
				kind: 'quota',
				message:
					"Il n'y a plus de place pour enregistrer l'atelier. Exporte-le dans un fichier, ou supprime des objets."
			};
		}
		return { kind: 'unavailable' };
	}
}
