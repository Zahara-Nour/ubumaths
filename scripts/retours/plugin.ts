/**
 * Route du bouton « signaler » : un middleware du serveur de dev de Vite
 * =====================================================================
 *
 * `POST /__dev/retours` écrit le retour envoyé par la page dans
 * `.captures/retours/` (dossier du serveur de dev, ignoré par git). La route
 * n'est PAS une route SvelteKit : elle n'existe que sur le serveur de dev
 * (`apply: 'serve'`), jamais dans le build ni en prod.
 *
 * Refus : connexion venue d'une autre machine, base qui n'est pas locale (le retour porte l'adresse du compte
 * connecté), Vercel, requête venue d'un autre site, corps trop gros, entrée
 * invalide (Zod).
 */

import { randomBytes } from 'node:crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { FEEDBACK_ENDPOINT } from '../../src/lib/dev/feedback.ts';
import {
	FEEDBACK_DIR,
	MAX_BODY_BYTES,
	MAX_FILES,
	checkRequest,
	feedbackFileName,
	feedbackSchema,
	isLocalSupabaseUrl,
	isLoopbackAddress,
	latestFeedbackFiles,
	type StoredFeedback
} from './logique.ts';

// Types

export interface FeedbackMiddlewareOptions {
	/** Dossier où écrire les retours */
	dir: string;
	/** Adresse de Supabase du serveur, lue à chaque requête */
	supabaseUrl: () => string | undefined;
	/** Variable `VERCEL` du serveur */
	vercel: () => string | undefined;
	/** Adresse d'où vient la connexion (par défaut : celle de la socket) */
	remoteAddress?: (req: IncomingMessage) => string | undefined;
}

type Next = () => void;

// Functions

function reply(res: ServerResponse, status: number, body: Record<string, unknown>): void {
	res.statusCode = status;
	res.setHeader('content-type', 'application/json; charset=utf-8');
	res.setHeader('cache-control', 'no-store');
	res.end(JSON.stringify(body));
}

/** Lit le corps, au plus `MAX_BODY_BYTES` octets ; `null` s'il dépasse. */
function readBody(req: IncomingMessage): Promise<string | null> {
	return new Promise((resolveBody, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		let tooBig = false;
		req.on('data', (chunk: Buffer) => {
			if (tooBig) return;
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				// On arrête de lire : la réponse 413 part, puis la connexion est fermée
				tooBig = true;
				chunks.length = 0;
				req.pause();
				resolveBody(null);
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => resolveBody(tooBig ? null : Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

/** Efface les retours les plus anciens au-delà de `MAX_FILES` (ses fichiers seulement). */
function prune(dir: string): void {
	for (const name of latestFeedbackFiles(dir).slice(MAX_FILES)) {
		try {
			unlinkSync(join(dir, name));
		} catch {
			// Déjà effacé par une autre requête : sans importance
		}
	}
}

export function createFeedbackMiddleware(options: FeedbackMiddlewareOptions) {
	return (req: IncomingMessage, res: ServerResponse, next: Next): void => {
		const path = (req.url ?? '').split('?')[0];
		if (path !== FEEDBACK_ENDPOINT) {
			next();
			return;
		}

		if (options.vercel() || !isLocalSupabaseUrl(options.supabaseUrl())) {
			reply(res, 403, { message: 'Retours refusés : ce serveur ne vise pas la base locale' });
			return;
		}
		const remote = options.remoteAddress?.(req) ?? req.socket.remoteAddress;
		if (!isLoopbackAddress(remote)) {
			reply(res, 403, { message: 'Retours refusés : connexion venue d’une autre machine' });
			return;
		}
		const refusal = checkRequest({
			method: req.method,
			origin: req.headers.origin,
			host: req.headers.host,
			contentType: req.headers['content-type']
		});
		if (refusal) {
			reply(res, refusal.status, { message: refusal.message });
			return;
		}
		if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) {
			reply(res, 413, { message: 'Retour trop gros' });
			return;
		}

		readBody(req)
			.then((body) => {
				if (body === null) {
					res.setHeader('connection', 'close');
					res.once('finish', () => req.destroy());
					reply(res, 413, { message: 'Retour trop gros' });
					return;
				}
				let json: unknown;
				try {
					json = JSON.parse(body);
				} catch {
					reply(res, 400, { message: 'JSON illisible' });
					return;
				}
				const parsed = feedbackSchema.safeParse(json);
				if (!parsed.success) {
					reply(res, 400, { message: parsed.error.issues[0]?.message ?? 'Retour invalide' });
					return;
				}
				const date = new Date();
				const stored: StoredFeedback = { ...parsed.data, receivedAt: date.toISOString() };
				const file = feedbackFileName(date, randomBytes(3).toString('hex'));
				mkdirSync(options.dir, { recursive: true });
				writeFileSync(join(options.dir, file), JSON.stringify(stored, null, '\t') + '\n', {
					encoding: 'utf8',
					flag: 'wx'
				});
				prune(options.dir);
				reply(res, 201, { ok: true, file });
			})
			.catch(() => {
				if (!res.headersSent) reply(res, 500, { message: 'Écriture du retour impossible' });
			});
	};
}

/** Plugin Vite : la route des retours, sur le serveur de dev seulement. */
export function retoursDev(): Plugin {
	return {
		name: 'retours-dev',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(
				createFeedbackMiddleware({
					dir: resolve(server.config.root, FEEDBACK_DIR),
					supabaseUrl: () => process.env.PUBLIC_SUPABASE_URL,
					vercel: () => process.env.VERCEL
				})
			);
		}
	};
}
