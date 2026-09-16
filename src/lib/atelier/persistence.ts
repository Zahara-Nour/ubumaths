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

// =============================================================================
// Reprendre un atelier venu du grapheur (§5 L5)
// =============================================================================

/** La clé du grapheur. ⚠️ On y touche en LECTURE seule. */
const GRAPHEUR_STORAGE_KEY = 'chiphre-grapheur-state';

/** Lettres proposées aux fonctions du grapheur, qui n'ont pas de nom. */
const ADOPTED_NAMES = ['f', 'g', 'h', 'p', 'q', 'r'] as const;

/** Ce que le grapheur range, réduit à ce qui nous intéresse. */
const grapheurStateSchema = z.object({
	functions: z
		.array(z.object({ latex: z.string() }).passthrough())
		.max(ADOPTED_NAMES.length)
		.optional()
});

export type AdoptOutcome =
	| { readonly kind: 'adopted'; readonly state: AtelierState }
	/** L'atelier a déjà son propre état : on ne l'écrase pas. */
	| { readonly kind: 'skipped' }
	/** Rien à reprendre — pas d'état de grapheur, vide, ou illisible. */
	| { readonly kind: 'nothing' };

/**
 * Proposer à l'atelier ce que l'élève avait tracé dans le grapheur.
 *
 * Les courbes du grapheur n'ont **pas de nom** : elles reçoivent ici `f`, `g`,
 * `h`… puisqu'un objet d'atelier se désigne par son nom (§1).
 *
 * ⚠️ **L'état du grapheur est laissé intact** : `/grapheur` continue de vivre sa
 * vie, et l'élève ne perd rien s'il y retourne. C'est une copie, pas un
 * déménagement — la reprise ne se fait donc qu'une fois, quand l'atelier n'a
 * encore rien à lui.
 */
export function adoptGrapheurState(storage: Storage | null): AdoptOutcome {
	if (!storage) return { kind: 'nothing' };

	// Un atelier qui a déjà son état n'est pas à reprendre.
	const existing = loadAtelier(storage);
	if (existing.kind !== 'empty') return { kind: 'skipped' };

	let raw: string | null;
	try {
		raw = storage.getItem(GRAPHEUR_STORAGE_KEY);
	} catch {
		return { kind: 'nothing' };
	}
	if (raw === null) return { kind: 'nothing' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { kind: 'nothing' };
	}

	const check = grapheurStateSchema.safeParse(parsed);
	if (!check.success) return { kind: 'nothing' };

	const objects: StoredObject[] = [];
	for (const fn of check.data.functions ?? []) {
		const definition = fn.latex.trim();
		// Une courbe sans expression n'a rien à reprendre — et elle ne doit pas
		// coûter les autres.
		if (definition === '') continue;
		const name = ADOPTED_NAMES[objects.length];
		if (name === undefined) break;
		objects.push({ name, kind: 'function', definition });
	}

	if (objects.length === 0) return { kind: 'nothing' };
	return { kind: 'adopted', state: { version: ATELIER_STATE_VERSION, objects } };
}

// =============================================================================
// Un autre onglet a écrit (§5 L4)
// =============================================================================

export type ForeignWriteOutcome =
	/** L'atelier a changé ailleurs, et voici ce qui y est désormais rangé. */
	| { readonly kind: 'changed'; readonly state: AtelierState; readonly message: string }
	/** Un autre onglet a effacé l'atelier. */
	| { readonly kind: 'cleared'; readonly message: string }
	/** Ce qui a été écrit ailleurs est illisible d'ici. */
	| { readonly kind: 'corrupt'; readonly message: string }
	/** L'écriture ne nous concerne pas. */
	| { readonly kind: 'ignored' };

/**
 * Lire ce qu'un autre onglet vient d'écrire.
 *
 * Le navigateur émet `storage` dans les AUTRES pages de la même origine, jamais
 * dans celle qui écrit : recevoir cet événement signifie donc littéralement
 * « quelqu'un d'autre a touché à l'atelier ».
 *
 * ⚠️ **Le dernier qui écrit gagne, et on ne fusionne pas** — mais on prévient.
 * C'est la différence avec le grapheur, où deux onglets s'écrasent aujourd'hui
 * en silence. L'état reçu est rendu à l'appelant, qui peut proposer de le
 * reprendre plutôt que d'imposer un choix.
 */
export function readForeignWrite(event: StorageEvent): ForeignWriteOutcome {
	if (event.key !== ATELIER_STORAGE_KEY) return { kind: 'ignored' };

	if (event.newValue === null) {
		return {
			kind: 'cleared',
			message: "L'atelier a été vidé dans un autre onglet."
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(event.newValue);
	} catch {
		return {
			kind: 'corrupt',
			message: 'Un autre onglet a enregistré un atelier que celui-ci ne sait pas lire.'
		};
	}

	const check = atelierStateSchema.safeParse(parsed);
	if (!check.success) {
		return {
			kind: 'corrupt',
			message: 'Un autre onglet a enregistré un atelier que celui-ci ne sait pas lire.'
		};
	}

	return {
		kind: 'changed',
		state: check.data,
		message: "L'atelier a été modifié dans un autre onglet."
	};
}
