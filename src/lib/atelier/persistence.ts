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
import { MAX_DEFINITION_LENGTH } from './types';
import { sequenceDisplaySchema, storedDisplaySchema, type StoredDisplay } from './display';
import { COORDINATE_LIMIT } from '$lib/grapheur/types';

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

/**
 * Au-delà, on refuse d'enregistrer plutôt que d'écrire un état qu'on ne saura
 * pas relire. Large : un atelier au plafond D8 (8 listes de 200 valeurs) tient
 * sous 100 ko, et `localStorage` en offre environ 5 Mo.
 */
const MAX_SERIALIZED_LENGTH = 500_000;

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
	definition: z.string().max(MAX_DEFINITION_LENGTH),
	/** Affiché dans la vue Graphe. Absent = non tracé. */
	plotted: z.boolean().optional(),
	/**
	 * Réglages d'affichage d'une fonction. ⚠️ `.catch(undefined)` : un réglage
	 * abîmé est OUBLIÉ, l'objet est gardé — perdre `f` pour une couleur illisible
	 * serait disproportionné. Tracée, elle recevra une couleur neuve.
	 */
	display: storedDisplaySchema.optional().catch(undefined),
	/** Curseur réglé d'une valeur. Abîmé : oublié, l'objet gardé (même règle). */
	slider: z
		.object({
			min: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
			max: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
			step: z.number().positive()
		})
		// Mêmes règles que `setSlider` : un lien ne doit pas faire entrer ce que
		// la carte refuserait (revue du lot 4, A3)
		.refine((s) => s.min < s.max && s.step <= s.max - s.min)
		.optional()
		.catch(undefined),
	/**
	 * Mode, rang et premier terme d'une suite (lot 5). Absents des suites rangées
	 * avant : le mode se retrouve à la relecture (S4). Validés à la création.
	 */
	mode: z.enum(['explicit', 'recurrence']).optional().catch(undefined),
	firstIndex: z.number().int().min(0).max(1000).optional().catch(undefined),
	firstTerm: z.string().max(20).optional().catch(undefined),
	/** Réglages du tracé d'une suite (lot 5b). Abîmés : oubliés, l'objet gardé. */
	sequenceDisplay: sequenceDisplaySchema.optional().catch(undefined)
});

/**
 * L'enveloppe, volontairement permissive : elle ne juge QUE la forme générale.
 * Le tri des objets se fait un par un, pour n'en perdre qu'un à la fois.
 */
export const atelierShellSchema = z.object({
	version: z.number().int().positive(),
	objects: z.array(z.unknown())
});

export interface StoredObject {
	readonly name: string;
	readonly kind: ObjectKind;
	readonly definition: string;
	readonly plotted?: boolean;
	readonly display?: StoredDisplay;
	readonly slider?: { readonly min: number; readonly max: number; readonly step: number };
	readonly mode?: 'explicit' | 'recurrence';
	readonly firstIndex?: number;
	readonly firstTerm?: string;
	readonly sequenceDisplay?: unknown;
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
	| {
			readonly kind: 'loaded';
			readonly state: AtelierState;
			/** Objets abîmés qu'on n'a pas su relire — à signaler, jamais à taire. */
			readonly dropped: number;
	  }
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
	/** Trop gros pour être relu ensuite : on refuse AVANT d'écrire. */
	| { readonly kind: 'too-large'; readonly message: string }
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

	// ⚠️ On récupère objet par objet, JAMAIS en bloc. Un seul objet abîmé ne doit
	// pas coûter tout l'atelier à l'élève : c'est sa seule mémoire, il n'a pas de
	// compte pour le retrouver ailleurs.
	const shell = atelierShellSchema.safeParse(parsed);
	if (!shell.success) {
		return { kind: 'corrupt', message: "L'atelier enregistré n'a pas la forme attendue." };
	}

	const { objects, dropped } = salvageObjects(shell.data.objects);
	return { kind: 'loaded', state: { version: shell.data.version, objects }, dropped };
}

/**
 * Trier les objets un par un, en comptant ceux qu'on n'a pas su relire.
 *
 * Jamais de rejet en bloc : un objet abîmé ne doit pas coûter tout l'atelier.
 */
export function salvageObjects(candidates: readonly unknown[]): {
	objects: StoredObject[];
	dropped: number;
} {
	const objects: StoredObject[] = [];
	let dropped = 0;
	for (const candidate of candidates) {
		const one = storedObjectSchema.safeParse(candidate);
		if (one.success) objects.push(one.data);
		else dropped++;
	}
	return { objects, dropped };
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

	// ⚠️ Ne jamais ranger ce qu'on ne saura pas relire. Sans ce garde, un atelier
	// trop gros s'enregistrait « avec succès » puis revenait vide au rechargement :
	// l'élève perdait tout après qu'on lui a dit que c'était sauvegardé.
	const serialized = JSON.stringify(state);
	if (serialized.length > MAX_SERIALIZED_LENGTH) {
		return {
			kind: 'too-large',
			message: `L'atelier est trop volumineux pour être enregistré (${Math.round(serialized.length / 1000)} ko). Exporte-le dans un fichier, ou supprime des objets.`
		};
	}

	try {
		storage.setItem(ATELIER_STORAGE_KEY, serialized);
		return { kind: 'saved' };
	} catch (error) {
		// Firefox n'emploie pas le même nom ni le même code que les autres —
		// s'en tenir à « QuotaExceededError » faisait afficher le message
		// « rien ne sera conservé » à la place de « exporte ou supprime ».
		const isQuota =
			error instanceof DOMException &&
			(error.name === 'QuotaExceededError' ||
				error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
				error.code === 22 ||
				error.code === 1014);
		if (isQuota) {
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

	const shell = atelierShellSchema.safeParse(parsed);
	if (!shell.success) {
		return {
			kind: 'corrupt',
			message: 'Un autre onglet a enregistré un atelier que celui-ci ne sait pas lire.'
		};
	}

	// Même tolérance qu'à la lecture : un objet abîmé ne coûte pas le reste.
	const { objects } = salvageObjects(shell.data.objects);
	return {
		kind: 'changed',
		state: { version: shell.data.version, objects },
		message: "L'atelier a été modifié dans un autre onglet."
	};
}
