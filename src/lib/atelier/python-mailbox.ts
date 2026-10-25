/**
 * Atelier — la boîte aux lettres de « Ouvrir dans l'atelier » depuis Python
 *
 * Q4 de la phase 0 (`docs/archive/wip/python-vers-atelier-phase0.md`) : un lien `?a=`
 * ne tient pas 200 flottants (1 800 caractères). La page `/python` dépose donc
 * les listes dans `localStorage` sous une clé neuve et ouvre
 * `/atelier?depuis-python=<clé>` ; l'atelier les lit UNE fois et les efface.
 * Rien ne sort du navigateur, et l'adresse ne se partage pas : c'est voulu.
 *
 * ⚠️ Ce qu'on relit vient d'un programme de l'élève : validé par Zod, aux
 * plafonds de l'atelier, avant d'être créé — comme un lien reçu.
 *
 * @module atelier/python-mailbox
 */

import { z } from 'zod';
import { MAX_DEFINITION_LENGTH } from './types';
import { MAX_TITLE_LENGTH } from './grid';
import type { MailboxList } from './from-python';

// =============================================================================
// Types
// =============================================================================

export type TakenFromPython =
	| { readonly ok: true; readonly lists: readonly MailboxList[] }
	| { readonly ok: false; readonly reason: 'missing' | 'invalid' };

// =============================================================================
// Constantes
// =============================================================================

export const PYTHON_MAILBOX_PREFIX = 'chiphre-python-vers-atelier:';

/** Le paramètre de l'adresse de l'atelier. */
export const PYTHON_MAILBOX_PARAM = 'depuis-python';

const MAILBOX_VERSION = 1;

/** Au-delà, un dépôt jamais ouvert (onglet fermé trop tôt) est balayé. */
const MAILBOX_TTL_MS = 24 * 3600 * 1000;

/** Une liste, ou ses valeurs et ses effectifs : deux au plus. */
const MAX_MAILBOX_LISTS = 2;

const mailboxSchema = z.object({
	version: z.literal(MAILBOX_VERSION),
	postedAt: z.number(),
	lists: z
		.array(
			z.object({
				name: z.string().min(1).max(10).optional(),
				title: z.string().max(MAX_TITLE_LENGTH).optional(),
				definition: z.string().min(1).max(MAX_DEFINITION_LENGTH)
			})
		)
		.min(1)
		.max(MAX_MAILBOX_LISTS)
});

const idSchema = z.string().uuid();

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Déposer des listes pour l'atelier ; l'adresse à ouvrir, ou `null` si le
 * stockage est plein ou bloqué (navigation privée stricte) — rien n'est ouvert.
 */
export function postToAtelier(
	lists: readonly MailboxList[],
	storage: Storage = localStorage
): string | null {
	const id = crypto.randomUUID();
	const posted = { version: MAILBOX_VERSION, postedAt: Date.now(), lists };
	try {
		sweep(storage, posted.postedAt);
		storage.setItem(PYTHON_MAILBOX_PREFIX + id, JSON.stringify(posted));
	} catch {
		return null;
	}
	return `/atelier?${PYTHON_MAILBOX_PARAM}=${id}`;
}

/** Relire, et effacer, ce qui a été déposé sous cette clé. */
export function takeFromPython(id: string, storage: Storage = localStorage): TakenFromPython {
	if (!idSchema.safeParse(id).success) return { ok: false, reason: 'invalid' };
	const key = PYTHON_MAILBOX_PREFIX + id;
	let raw: string | null;
	try {
		raw = storage.getItem(key);
		storage.removeItem(key);
	} catch {
		return { ok: false, reason: 'missing' };
	}
	if (raw === null) return { ok: false, reason: 'missing' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, reason: 'invalid' };
	}
	const read = mailboxSchema.safeParse(parsed);
	return read.success ? { ok: true, lists: read.data.lists } : { ok: false, reason: 'invalid' };
}

/** Effacer les dépôts trop anciens, ou illisibles : un onglet fermé avant d'avoir lu. */
function sweep(storage: Storage, now: number): void {
	const keys: string[] = [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key?.startsWith(PYTHON_MAILBOX_PREFIX)) keys.push(key);
	}
	for (const key of keys) {
		const postedAt = postedAtOf(storage.getItem(key));
		if (postedAt === null || now - postedAt > MAILBOX_TTL_MS) storage.removeItem(key);
	}
}

function postedAtOf(raw: string | null): number | null {
	if (raw === null) return null;
	try {
		const postedAt = (JSON.parse(raw) as { postedAt?: unknown })?.postedAt;
		return typeof postedAt === 'number' ? postedAt : null;
	} catch {
		return null;
	}
}
