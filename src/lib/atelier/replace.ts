/**
 * Atelier — remplacer son atelier, et la copie mise de côté
 *
 * Phase 0 : `docs/wip/atelier-remplacer-phase0.md` (R1-R5, B1-B9, validée par
 * David). « Remplacer mon atelier » (un atelier reçu par lien) et « Charger »
 * (un fichier `.atelier.json`) remplacent l'atelier personnel ; avant, il est
 * **mis de côté** — une seule copie, sous sa propre clé (`SET_ASIDE_STORAGE_KEY`),
 * rangée et relue comme l'atelier personnel (`persistence.ts`, B7).
 * « Retrouver mon atelier précédent » ÉCHANGE les deux (B3) : rien n'est jamais
 * perdu, on passe de l'un à l'autre.
 *
 * ⚠️ L'ordre des écritures est la garantie (R3, B5) : la copie d'abord, l'atelier
 * ensuite ; une écriture refusée défait la précédente, et rien ne change.
 *
 * Le stockage est injecté, comme dans `persistence.ts` : `null` = refusé.
 *
 * @module atelier/replace
 */

import {
	ATELIER_STORAGE_KEY,
	SET_ASIDE_STORAGE_KEY,
	loadAtelier,
	saveAtelier,
	type AtelierState
} from './persistence';

// =============================================================================
// Constantes
// =============================================================================

/** Ce que dit la confirmation après ce qui sera remplacé (B2). */
export const SET_ASIDE_REASSURANCE = 'Ton atelier est mis de côté : tu pourras le retrouver.';

/** L'avis qui suit un remplacement, avec l'action « Retrouver » (B4). */
export const SET_ASIDE_NOTICE = 'Ton atelier précédent est mis de côté.';

/** Le nom du geste, dans la barre, dans l'avis, et de son étape d'Annuler. */
export const RETRIEVE_LABEL = 'Retrouver mon atelier précédent';

/** B6 : mêmes mots que la fusion (`keepReceived`). */
const PERSONAL_UNREADABLE =
	'Ton atelier enregistré ne peut pas être ouvert ici : rien n’a été remplacé.';

/** B5 : la copie ou l'atelier ne s'écrivent pas. */
const NOT_SAVED =
	'Ton atelier n’a pas pu être mis de côté (stockage plein ou indisponible) : rien n’a été remplacé.';

/** B5, pour « Retrouver ». */
const NOT_RETRIEVED =
	'Ton atelier précédent n’a pas pu être retrouvé (stockage plein ou indisponible) : rien n’a changé.';

// =============================================================================
// Types
// =============================================================================

export type Outcome = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** L'atelier personnel, relu avant de le remplacer. */
export type PersonalRead =
	/** Rien à perdre (B1) : ni confirmation, ni copie. */
	| { readonly kind: 'blank' }
	| { readonly kind: 'ready'; readonly state: AtelierState }
	/** B6 : plus récent, abîmé, ou stockage refusé — on ne remplace pas. */
	| { readonly kind: 'refused'; readonly message: string };

/** La copie mise de côté, relue. */
export type SetAsideRead =
	| { readonly kind: 'none' }
	| { readonly kind: 'loaded'; readonly state: AtelierState; readonly dropped: number }
	/** B7 : illisible — oubliée, et on le dit. */
	| { readonly kind: 'forgotten'; readonly message: string }
	/** Rangée par une version plus récente, ou stockage refusé : ni relue, ni oubliée. */
	| { readonly kind: 'refused'; readonly message: string };

// =============================================================================
// Ce que le remplacement emporte (B1, B2)
// =============================================================================

/** La grille a-t-elle quelque chose à elle (cases sans nom, titres, mise en forme) ? */
function hasGrid(state: AtelierState): boolean {
	const grid = state.grid;
	return (
		Object.keys(grid?.cells ?? {}).length > 0 ||
		Object.keys(grid?.titles ?? {}).length > 0 ||
		(grid?.formats?.length ?? 0) > 0
	);
}

/** B1 : ni objet, ni grille — rien à perdre, rien à mettre de côté. */
export function isBlankAtelier(state: AtelierState): boolean {
	return state.objects.length === 0 && !hasGrid(state);
}

/** B2 : « Tes 6 objets et ta grille seront remplacés. » */
export function replacementLoss(state: AtelierState): string {
	const count = state.objects.length;
	const grid = hasGrid(state);
	if (count === 0) return grid ? 'Ta grille sera remplacée.' : 'Rien ne sera remplacé.';
	const objects = count === 1 ? 'Ton objet' : `Tes ${count} objets`;
	if (grid) return `${objects} et ta grille seront remplacés.`;
	return `${objects} ${count === 1 ? 'sera remplacé' : 'seront remplacés'}.`;
}

// =============================================================================
// Lire
// =============================================================================

/** L'atelier personnel, tel qu'il sera mis de côté. */
export function readPersonal(storage: Storage | null): PersonalRead {
	const loaded = loadAtelier(storage);
	if (loaded.kind === 'empty') return { kind: 'blank' };
	if (loaded.kind !== 'loaded') return { kind: 'refused', message: PERSONAL_UNREADABLE };
	return isBlankAtelier(loaded.state) ? { kind: 'blank' } : { kind: 'ready', state: loaded.state };
}

/** Une copie est-elle là ? (B4 : « Retrouver » n'est proposé qu'alors.) */
export function hasSetAside(storage: Storage | null): boolean {
	try {
		return storage?.getItem(SET_ASIDE_STORAGE_KEY) != null;
	} catch {
		return false;
	}
}

/**
 * La copie mise de côté, relue par les mêmes schémas que l'atelier personnel
 * (B7) : objets abîmés écartés un par un ; les migrations (`y`) se font à la
 * relecture par l'atelier (`restore`, `replaceWith`). Illisible : oubliée.
 */
export function readSetAside(storage: Storage | null): SetAsideRead {
	const loaded = loadAtelier(storage, SET_ASIDE_STORAGE_KEY);
	switch (loaded.kind) {
		case 'empty':
			return { kind: 'none' };
		case 'loaded':
			return { kind: 'loaded', state: loaded.state, dropped: loaded.dropped };
		case 'corrupt':
			forget(storage);
			return {
				kind: 'forgotten',
				message: 'Ton atelier mis de côté était abîmé : il ne peut pas être retrouvé.'
			};
		case 'too-recent':
			return {
				kind: 'refused',
				message:
					'Ton atelier mis de côté vient d’une version plus récente : il n’est pas ouvert ici, et il est gardé.'
			};
		case 'unavailable':
			return {
				kind: 'refused',
				message: 'Ce navigateur n’enregistre rien : l’atelier mis de côté est inaccessible.'
			};
	}
}

// =============================================================================
// Écrire
// =============================================================================

function forget(storage: Storage | null): void {
	try {
		storage?.removeItem(SET_ASIDE_STORAGE_KEY);
	} catch {
		// Un stockage qui refuse jusqu'à l'effacement : la copie reste, sans dommage
	}
}

/** Le texte rangé sous une clé, pour le remettre si l'écriture suivante échoue. */
function rawAt(storage: Storage, key: string): string | null {
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function putBack(storage: Storage, key: string, raw: string | null): void {
	try {
		if (raw === null) storage.removeItem(key);
		else storage.setItem(key, raw);
	} catch {
		// Rien de plus à tenter : l'écriture qui a échoué n'a rien écrit
	}
}

/**
 * Mettre cet atelier de côté (la seule copie). Un atelier vide efface la copie
 * plutôt que d'en ranger une vide : « Retrouver » ne propose pas le vide (B3).
 */
export function keepAside(storage: Storage | null, state: AtelierState): Outcome {
	if (storage === null) return { ok: false, message: NOT_SAVED };
	if (isBlankAtelier(state)) {
		forget(storage);
		return { ok: true };
	}
	const saved = saveAtelier(storage, state, SET_ASIDE_STORAGE_KEY);
	return saved.kind === 'saved' ? { ok: true } : { ok: false, message: NOT_SAVED };
}

/**
 * « Remplacer mon atelier » (R1-R3) : l'atelier personnel est mis de côté, PUIS
 * `incoming` est enregistré à sa place. Rend l'atelier mis de côté (`null` s'il
 * était vide, B1 : la copie d'avant reste alors), ou le refus (B5, B6) — rien
 * n'a changé.
 */
export function replacePersonal(
	storage: Storage | null,
	incoming: AtelierState
): { ok: true; previous: AtelierState | null } | { ok: false; message: string } {
	if (storage === null) return { ok: false, message: NOT_SAVED };
	const personal = readPersonal(storage);
	if (personal.kind === 'refused') return { ok: false, message: personal.message };

	const asideBefore = rawAt(storage, SET_ASIDE_STORAGE_KEY);
	if (personal.kind === 'ready') {
		const kept = keepAside(storage, personal.state);
		if (!kept.ok) return kept;
	}
	if (saveAtelier(storage, incoming).kind !== 'saved') {
		// La copie d'avant revient : un remplacement refusé ne coûte rien (B5)
		putBack(storage, SET_ASIDE_STORAGE_KEY, asideBefore);
		return { ok: false, message: NOT_SAVED };
	}
	return { ok: true, previous: personal.kind === 'ready' ? personal.state : null };
}

/**
 * « Retrouver mon atelier précédent » (B3) : la copie devient l'atelier
 * personnel, et `current` (l'atelier affiché) devient la copie. Les deux
 * écritures ou aucune (B5). L'appelant affiche ensuite la copie rendue
 * (`Atelier.replaceWith`).
 */
export function swapWithSetAside(
	storage: Storage | null,
	current: AtelierState
):
	| { readonly kind: 'swapped'; readonly state: AtelierState; readonly dropped: number }
	| Exclude<SetAsideRead, { kind: 'loaded' }> {
	const read = readSetAside(storage);
	// Une copie relue suppose un stockage : `storage === null` ne fait que le dire au typage
	if (read.kind !== 'loaded') return read;
	if (storage === null) return { kind: 'refused', message: NOT_RETRIEVED };
	const personalBefore = rawAt(storage, ATELIER_STORAGE_KEY);
	if (saveAtelier(storage, read.state).kind !== 'saved') {
		return { kind: 'refused', message: NOT_RETRIEVED };
	}
	if (!keepAside(storage, current).ok) {
		putBack(storage, ATELIER_STORAGE_KEY, personalBefore);
		return { kind: 'refused', message: NOT_RETRIEVED };
	}
	return { kind: 'swapped', state: read.state, dropped: read.dropped };
}
