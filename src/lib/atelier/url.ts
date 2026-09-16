/**
 * Atelier — porter l'atelier dans une URL
 *
 * ⚠️ **La compression n'est pas une optimisation.** Mesuré le 2026-09-16 :
 * l'atelier au plafond D8 (8 listes × 200 valeurs) pèse 16 752 caractères en
 * base64 brut, contre **788** compressé. Sans elle, la promesse de D8 — « tenir
 * sous les 2 000 caractères d'URL qui passent partout » — est fausse d'un
 * facteur 8.
 *
 * Décision Q1 : on compresse, et on **replie** sur base64 brut là où
 * `CompressionStream` n'existe pas (Safari < 16.4). Un préfixe d'un caractère
 * distingue les deux, pour que la relecture ne devine jamais.
 *
 * @module atelier/url
 */

import type { AtelierState } from './persistence';
import { atelierShellSchema, salvageObjects, ATELIER_STATE_VERSION } from './persistence';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Longueur maximale de la charge utile, en caractères.
 *
 * 2 000 est ce qui passe partout — ce ne sont pas les navigateurs qui
 * tronquent, ce sont les messageries et les ENT. On garde de la marge pour le
 * reste de l'URL (domaine, chemin, nom du paramètre).
 */
export const MAX_URL_PAYLOAD = 1800;

/** Charge compressée par `deflate-raw`. */
const COMPRESSED = '1';
/** Charge non compressée — repli quand le navigateur ne sait pas comprimer. */
const RAW = '0';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'une charge encodée pèse, et si elle passera. */
export interface Encoded {
	/** À mettre dans l'URL, tel quel : base64url, rien à échapper. */
	readonly payload: string;
	/** La compression a-t-elle été possible ? */
	readonly compressed: boolean;
	/** Tient-elle dans une URL ? À dire AVANT de copier (§6 L1). */
	readonly withinLimit: boolean;
}

/** Pourquoi une charge n'a pas pu être relue. */
export type DecodeFailure = 'too-long' | 'too-recent' | 'corrupt';

export type Decoded =
	| {
			readonly ok: true;
			readonly state: AtelierState;
			/** Objets écartés faute d'être relisibles — à signaler, pas à taire. */
			readonly dropped: number;
	  }
	| { readonly ok: false; readonly reason: DecodeFailure; readonly message: string };

// =============================================================================
// base64url
// =============================================================================

/** base64url : ni `+`, ni `/`, ni `=` — rien qu'une URL doive échapper. */
function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
	try {
		const padded = text.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
		return Uint8Array.from(binary, (char) => char.charCodeAt(0));
	} catch {
		return null;
	}
}

// =============================================================================
// Compression
// =============================================================================

/** Le navigateur sait-il comprimer ? Safari a attendu 16.4. */
function canCompress(): boolean {
	return typeof CompressionStream !== 'undefined';
}

async function deflate(text: string): Promise<Uint8Array> {
	const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
	const stream = new Blob([bytes as BlobPart])
		.stream()
		.pipeThrough(new DecompressionStream('deflate-raw'));
	return new Response(stream).text();
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Encoder un atelier pour une URL.
 *
 * ⚠️ `withinLimit` se lit **avant** de proposer le lien : le §6 L1 demande de
 * prévenir avant la copie, pas de refuser après coup comme le fait `/calc`
 * aujourd'hui.
 */
export async function encodeAtelier(state: AtelierState): Promise<Encoded> {
	const json = JSON.stringify(state);

	if (canCompress()) {
		const payload = COMPRESSED + toBase64Url(await deflate(json));
		return { payload, compressed: true, withinLimit: payload.length <= MAX_URL_PAYLOAD };
	}

	const bytes = new TextEncoder().encode(json);
	const payload = RAW + toBase64Url(bytes);
	return { payload, compressed: false, withinLimit: payload.length <= MAX_URL_PAYLOAD };
}

/** Le refus, avec son message français. */
function refuse(reason: DecodeFailure): Decoded {
	const messages: Record<DecodeFailure, string> = {
		'too-long': 'Ce lien est trop long pour être ouvert.',
		'too-recent': 'Ce lien vient d’une version plus récente de l’atelier.',
		corrupt: 'Ce lien est incomplet ou abîmé.'
	};
	return { ok: false, reason, message: messages[reason] };
}

/**
 * Relire ce qu'une URL porte.
 *
 * ⚠️ **Une URL est une entrée non fiable**, et celles-ci circuleront entre
 * élèves : la charge est bornée avant d'être décodée, et l'état validé par Zod
 * avant d'être rendu. Rien de ce qui n'a pas passé le schéma n'est affiché.
 *
 * ⚠️ Une version plus récente n'est pas une corruption : c'est l'élève qui a
 * ouvert son atelier ailleurs, dans une version plus neuve. Le dire permet de
 * ne pas lui faire croire que son lien est cassé (§6 L3).
 */
export async function decodeAtelier(payload: string): Promise<Decoded> {
	// Borner AVANT de décoder : on ne décompresse pas ce qu'on n'ouvrira pas.
	if (payload.length === 0 || payload.length > MAX_URL_PAYLOAD) return refuse('too-long');

	const marker = payload[0];
	const body = payload.slice(1);
	if (marker !== COMPRESSED && marker !== RAW) return refuse('corrupt');

	const bytes = fromBase64Url(body);
	if (bytes === null) return refuse('corrupt');

	let json: string;
	try {
		json = marker === COMPRESSED ? await inflate(bytes) : new TextDecoder().decode(bytes);
	} catch {
		// Une charge tronquée meurt ici : `deflate-raw` refuse un flux incomplet.
		return refuse('corrupt');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return refuse('corrupt');
	}

	// La version se lit avant la validation : un format plus récent a le droit
	// d'avoir des champs que notre schéma ne connaît pas.
	const version = (parsed as { version?: unknown })?.version;
	if (typeof version === 'number' && version > ATELIER_STATE_VERSION) return refuse('too-recent');

	const shell = atelierShellSchema.safeParse(parsed);
	if (!shell.success) return refuse('corrupt');

	// ⚠️ Le MÊME tri que le stockage, objet par objet : un objet abîmé ne doit
	// pas coûter tout le lien. Deux règles différentes ici et là feraient qu'un
	// atelier rangé puis partagé ne survivrait pas au même filtre.
	const { objects, dropped } = salvageObjects(shell.data.objects);
	return { ok: true, state: { version: shell.data.version, objects }, dropped };
}
