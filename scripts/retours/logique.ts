/**
 * Bouton « signaler » : ce qui se décide sans serveur
 * ===================================================
 *
 * Validation du retour envoyé par la page, contrôle de la requête, nom du
 * fichier, compte rendu rendu par `pnpm retours`. Le middleware est dans
 * `plugin.ts`, la commande dans `index.ts`. Tests : `scripts/__tests__/retours.test.ts`.
 */

import { existsSync, readdirSync } from 'node:fs';
import { z } from 'zod';
import {
	MAX_ERRORS,
	MAX_ERROR_MESSAGE,
	MAX_NOTE,
	isLocalSupabaseUrl,
	type FeedbackPayload
} from '../../src/lib/dev/feedback.ts';

export { isLocalSupabaseUrl };

// Types

/** Un retour tel qu'il est écrit sur le disque. */
export interface StoredFeedback extends FeedbackPayload {
	/** Date ISO de réception, posée par le serveur */
	receivedAt: string;
}

export interface RequestFacts {
	method: string | undefined;
	origin: string | undefined;
	host: string | undefined;
	contentType: string | undefined;
}

export interface Refusal {
	status: number;
	message: string;
}

// Constantes

/** Dossier des retours, relatif au dossier du serveur de dev (ignoré par git). */
export const FEEDBACK_DIR = '.captures/retours';

/**
 * Taille maximale du corps de la requête : 50 erreurs de 2 000 caractères tiennent dedans,
 * même échappées (`\uXXXX`, 6 octets par caractère).
 */
export const MAX_BODY_BYTES = 1024 * 1024;

/** Nombre de retours gardés ; les plus anciens sont effacés. */
export const MAX_FILES = 200;

/** Largeur à partir de laquelle `pnpm voir` est proposé en grand écran. */
const DESKTOP_WIDTH = 1024;

const FILE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.json$/;

/* eslint-disable no-control-regex -- retirer les caractères de contrôle est le but */
const UNPRINTABLE =
	/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
/* eslint-enable no-control-regex */

const ROLE_ACCOUNTS: Record<string, string> = { teacher: 'prof', student: 'eleve', admin: 'admin' };

export const feedbackSchema = z.strictObject({
	note: z.string().max(MAX_NOTE),
	url: z
		.string()
		.max(2000)
		.refine((value) => {
			try {
				return ['http:', 'https:'].includes(new URL(value).protocol);
			} catch {
				return false;
			}
		}, 'Adresse de page invalide'),
	viewport: z.strictObject({
		width: z.number().int().min(0).max(20000),
		height: z.number().int().min(0).max(20000),
		dpr: z.number().min(0).max(10)
	}),
	userAgent: z.string().max(500),
	account: z.strictObject({ email: z.string().max(320), role: z.string().max(50) }).nullable(),
	errors: z
		.array(
			z.strictObject({
				type: z.enum(['console', 'error', 'unhandledrejection']),
				message: z.string().max(MAX_ERROR_MESSAGE),
				at: z.string().max(40)
			})
		)
		.max(MAX_ERRORS),
	droppedErrors: z.number().int().min(0).max(1_000_000)
});

// Functions

/**
 * La requête vient-elle de la page elle-même ? Un autre site ouvert dans le
 * même navigateur ne doit pas pouvoir écrire sur le Mac mini : l'origine doit
 * être celle du serveur, et le corps du JSON (qu'un formulaire ne sait pas envoyer).
 */
export function checkRequest(facts: RequestFacts): Refusal | null {
	if (facts.method !== 'POST') return { status: 405, message: 'POST seulement' };
	let originHost: string | null = null;
	try {
		originHost = facts.origin ? new URL(facts.origin).host : null;
	} catch {
		originHost = null;
	}
	if (!originHost || !facts.host || originHost !== facts.host)
		return { status: 403, message: 'Requête venue d’un autre site' };
	// Un nom de domaine quelconque pointé sur 127.0.0.1 aurait Origin = Host : le serveur
	// ne répond que sous ses propres noms (localhost, ou le Mac mini par le tailnet)
	if (!isLocalSupabaseUrl(`http://${facts.host}`))
		return { status: 403, message: 'Serveur joint sous un nom inconnu' };
	const type = (facts.contentType ?? '').split(';')[0]?.trim().toLowerCase();
	if (type !== 'application/json') return { status: 415, message: 'JSON attendu' };
	return null;
}

/**
 * La connexion vient-elle de la machine elle-même ? Le navigateur du Mac mini, le tunnel
 * SSH et `tailscale serve` arrivent tous par l'adresse de bouclage. Un serveur lancé avec
 * `--host 0.0.0.0` écoute aussi sur le réseau local : un appareil de ce réseau ne doit pas
 * pouvoir déposer un retour (sa note est lue ensuite comme un message de David).
 */
export function isLoopbackAddress(address: string | undefined): boolean {
	if (!address) return false;
	return address === '::1' || /^(::ffff:)?127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address);
}

/** Nom du fichier : la date de réception et un suffixe aléatoire, rien de l'entrée. */
export function feedbackFileName(date: Date, random: string): string {
	return `${date.toISOString().replace(/[:.]/g, '-')}-${random}.json`;
}

/** Les fichiers de retours d'un dossier, du plus récent au plus ancien. */
export function latestFeedbackFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => FILE_PATTERN.test(name))
		.sort()
		.reverse();
}

/**
 * Retire d'un texte venu de la page les caractères de contrôle (séquences du terminal) et les
 * caractères invisibles ou d'inversion du sens d'écriture (texte affiché autrement qu'il n'est lu).
 */
export function printable(text: string): string {
	return text.replace(UNPRINTABLE, '');
}

/** La commande `pnpm voir` qui refait la même page, au même format et avec le même compte. */
export function voirCommand(feedback: StoredFeedback): string {
	const url = new URL(feedback.url);
	const path = (url.pathname + url.search).replaceAll("'", '%27');
	const parts = [`pnpm voir '${path}'`];
	if (feedback.viewport.width >= DESKTOP_WIDTH) parts.push('--ordi');
	const account = feedback.account ? ROLE_ACCOUNTS[feedback.account.role] : undefined;
	if (account) parts.push(`--compte ${account}`);
	return parts.join(' ');
}

/** Le compte rendu d'un retour, tel que `pnpm retours` l'affiche. */
export function formatFeedback(feedback: StoredFeedback, file: string): string {
	const url = new URL(feedback.url);
	const { width, height, dpr } = feedback.viewport;
	const lines = [
		`Retour du ${feedback.receivedAt} (${file})`,
		'',
		`Note    : ${feedback.note.trim() || '(sans note)'}`,
		`Page    : ${url.pathname}${url.search}${url.hash}`,
		`Adresse : ${feedback.url}`,
		`Écran   : ${width} × ${height} (densité ${dpr})`,
		`Navig.  : ${feedback.userAgent}`,
		`Compte  : ${feedback.account ? `${feedback.account.email} (${feedback.account.role})` : 'aucun (visiteur)'}`,
		''
	];
	if (feedback.errors.length === 0) {
		lines.push('Aucune erreur de console depuis le chargement.');
	} else {
		lines.push(`Erreurs de console (${feedback.errors.length}) :`);
		if (feedback.droppedErrors > 0)
			lines.push(`  (${feedback.droppedErrors} erreurs plus anciennes écartées)`);
		for (const error of feedback.errors) {
			const [first = '', ...rest] = error.message.split('\n');
			lines.push(`  - [${error.type}] ${error.at} ${first}`);
			for (const line of rest.slice(0, 8)) lines.push(`      ${line}`);
		}
	}
	lines.push('', `Revoir la page : ${voirCommand(feedback)}`);
	return printable(lines.join('\n'));
}
