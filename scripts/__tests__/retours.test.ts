/**
 * Bouton « signaler » du serveur de dev : la route et `pnpm retours`
 * ==================================================================
 *
 * `scripts/retours/logique.ts` porte tout ce qui se décide sans serveur :
 * validation de l'entrée, refus hors base locale, refus d'une autre origine,
 * nom et contenu du fichier, compte rendu lu par `pnpm retours`.
 * `scripts/retours/plugin.ts` est le middleware de Vite (serveur de dev
 * seulement) : il est essayé ici derrière un vrai serveur HTTP.
 */

import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FEEDBACK_ENDPOINT, MAX_ERRORS, MAX_NOTE } from '../../src/lib/dev/feedback';
import {
	MAX_BODY_BYTES,
	MAX_FILES,
	checkRequest,
	feedbackFileName,
	feedbackSchema,
	formatFeedback,
	isLocalSupabaseUrl,
	isLoopbackAddress,
	latestFeedbackFiles,
	voirCommand,
	type StoredFeedback
} from '../retours/logique';
import { createFeedbackMiddleware, retoursDev } from '../retours/plugin';

const VALID = {
	note: 'Le bouton Valider est caché par le clavier',
	url: 'https://serveur.exemple.ts.net:8447/dashboard/carnet?onglet=notes',
	viewport: { width: 390, height: 664, dpr: 3 },
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Safari/605.1.15',
	account: { email: 'eleve01@local.test', role: 'student' },
	errors: [
		{ type: 'console', message: 'TypeError: x is undefined', at: '2026-11-22T10:00:00.000Z' }
	],
	droppedErrors: 0
};

describe('retours — validation de l’entrée', () => {
	it('accepte un retour complet', () => {
		expect(feedbackSchema.safeParse(VALID).success).toBe(true);
	});

	it('accepte une note vide et aucun compte (les erreurs seules sont utiles)', () => {
		const result = feedbackSchema.safeParse({ ...VALID, note: '', account: null });
		expect(result.success).toBe(true);
	});

	it(`refuse une note de plus de ${MAX_NOTE} caractères`, () => {
		expect(feedbackSchema.safeParse({ ...VALID, note: 'a'.repeat(MAX_NOTE) }).success).toBe(true);
		expect(feedbackSchema.safeParse({ ...VALID, note: 'a'.repeat(MAX_NOTE + 1) }).success).toBe(
			false
		);
	});

	it(`refuse plus de ${MAX_ERRORS} erreurs`, () => {
		const error = VALID.errors[0];
		const full = Array.from({ length: MAX_ERRORS }, () => error);
		expect(feedbackSchema.safeParse({ ...VALID, errors: full }).success).toBe(true);
		expect(feedbackSchema.safeParse({ ...VALID, errors: [...full, error] }).success).toBe(false);
	});

	it('refuse une adresse qui n’en est pas une, un type d’erreur inconnu, un champ en trop', () => {
		expect(feedbackSchema.safeParse({ ...VALID, url: 'javascript:alert(1)' }).success).toBe(false);
		expect(feedbackSchema.safeParse({ ...VALID, url: 'pas une adresse' }).success).toBe(false);
		expect(
			feedbackSchema.safeParse({ ...VALID, errors: [{ ...VALID.errors[0], type: 'autre' }] })
				.success
		).toBe(false);
		expect(feedbackSchema.safeParse({ ...VALID, file: '../../etc/passwd' }).success).toBe(false);
	});

	it('refuse un écran aux dimensions absurdes', () => {
		expect(
			feedbackSchema.safeParse({ ...VALID, viewport: { width: -1, height: 600, dpr: 2 } }).success
		).toBe(false);
		expect(
			feedbackSchema.safeParse({ ...VALID, viewport: { width: 390, height: 1e9, dpr: 2 } }).success
		).toBe(false);
	});
});

describe('retours — base locale seulement', () => {
	it('accepte Supabase local, par localhost ou par le tailnet', () => {
		expect(isLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
		expect(isLocalSupabaseUrl('http://localhost:54321')).toBe(true);
		expect(isLocalSupabaseUrl('https://serveur.exemple.ts.net:8443')).toBe(true);
	});

	it('reconnaît une connexion venue de la machine elle-même', () => {
		expect(isLoopbackAddress('127.0.0.1')).toBe(true);
		expect(isLoopbackAddress('::1')).toBe(true);
		expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
		expect(isLoopbackAddress('192.168.1.20')).toBe(false);
		expect(isLoopbackAddress('100.64.0.7')).toBe(false);
		expect(isLoopbackAddress('::ffff:192.168.1.20')).toBe(false);
		expect(isLoopbackAddress(undefined)).toBe(false);
	});

	it('refuse la prod, une adresse absente ou illisible', () => {
		expect(isLocalSupabaseUrl('https://abcdefgh.supabase.co')).toBe(false);
		expect(isLocalSupabaseUrl('https://ts.net.exemple.com')).toBe(false);
		expect(isLocalSupabaseUrl(undefined)).toBe(false);
		expect(isLocalSupabaseUrl('')).toBe(false);
		expect(isLocalSupabaseUrl('n’importe quoi')).toBe(false);
	});
});

describe('retours — contrôle de la requête', () => {
	const ok = {
		method: 'POST',
		origin: 'https://serveur.exemple.ts.net:8447',
		host: 'serveur.exemple.ts.net:8447',
		contentType: 'application/json'
	};

	it('laisse passer un POST JSON venu de la page elle-même', () => {
		expect(checkRequest(ok)).toBeNull();
		expect(
			checkRequest({ ...ok, origin: 'http://localhost:5176', host: 'localhost:5176' })
		).toBeNull();
	});

	it('refuse une autre méthode', () => {
		expect(checkRequest({ ...ok, method: 'GET' })?.status).toBe(405);
	});

	it('refuse une requête sans origine ou venue d’un autre site', () => {
		expect(checkRequest({ ...ok, origin: undefined })?.status).toBe(403);
		expect(checkRequest({ ...ok, origin: 'https://autre.exemple.com' })?.status).toBe(403);
		expect(checkRequest({ ...ok, origin: 'null' })?.status).toBe(403);
		expect(checkRequest({ ...ok, host: undefined })?.status).toBe(403);
	});

	it('refuse un serveur joint sous un nom qui n’est pas le sien (nom pointé sur 127.0.0.1)', () => {
		expect(
			checkRequest({
				...ok,
				origin: 'http://piege.exemple.com:5176',
				host: 'piege.exemple.com:5176'
			})?.status
		).toBe(403);
		expect(
			checkRequest({ ...ok, origin: 'http://127.0.0.1:5176', host: '127.0.0.1:5176' })
		).toBeNull();
	});

	it('refuse un corps qui n’est pas du JSON (formulaire d’un autre site)', () => {
		expect(checkRequest({ ...ok, contentType: 'text/plain' })?.status).toBe(415);
		expect(checkRequest({ ...ok, contentType: undefined })?.status).toBe(415);
		expect(checkRequest({ ...ok, contentType: 'application/json; charset=utf-8' })).toBeNull();
	});
});

describe('retours — fichier et compte rendu', () => {
	const stored: StoredFeedback = { ...VALID, receivedAt: '2026-11-22T10:01:02.345Z' };

	it('nomme le fichier par sa date, sans rien reprendre de l’entrée', () => {
		const name = feedbackFileName(new Date('2026-11-22T10:01:02.345Z'), 'abc123');
		expect(name).toBe('2026-11-22T10-01-02-345Z-abc123.json');
	});

	it('propose la commande `pnpm voir` de la même page, au même format', () => {
		expect(voirCommand(stored)).toBe("pnpm voir '/dashboard/carnet?onglet=notes' --compte eleve");
		expect(
			voirCommand({
				...stored,
				viewport: { width: 1440, height: 900, dpr: 2 },
				account: { email: 'teacher@local.test', role: 'teacher' }
			})
		).toBe("pnpm voir '/dashboard/carnet?onglet=notes' --ordi --compte prof");
		expect(voirCommand({ ...stored, account: null, url: 'http://localhost:5176/' })).toBe(
			"pnpm voir '/'"
		);
	});

	it('n’injecte rien dans la commande proposée (apostrophe dans l’adresse)', () => {
		const command = voirCommand({ ...stored, url: "http://localhost:5176/a'; rm -rf ~; '" });
		expect(command).not.toContain("'; rm");
		expect(command).toContain('%27');
	});

	it('rend un compte rendu lisible : note, page, écran, compte, erreurs', () => {
		const text = formatFeedback(stored, 'x.json');
		expect(text).toContain('Le bouton Valider est caché par le clavier');
		expect(text).toContain('/dashboard/carnet?onglet=notes');
		expect(text).toContain('390 × 664');
		expect(text).toContain('eleve01@local.test');
		expect(text).toContain('TypeError: x is undefined');
		expect(text).toContain('pnpm voir');
	});

	it('dit quand il n’y a ni note ni erreur, et combien d’erreurs ont été écartées', () => {
		const text = formatFeedback({ ...stored, note: '', errors: [], droppedErrors: 0 }, 'x.json');
		expect(text).toContain('(sans note)');
		expect(text).toContain('Aucune erreur');
		expect(formatFeedback({ ...stored, droppedErrors: 12 }, 'x.json')).toContain('12');
	});

	it('retire les caractères de contrôle du terminal', () => {
		const text = formatFeedback({ ...stored, note: 'avant\u001b[2Japrès\u0007' }, 'x.json');
		expect(text).not.toContain('\u001b');
		expect(text).not.toContain('\u0007');
		expect(text).toContain('avant');
	});

	it('retire les caractères invisibles et d’inversion du sens d’écriture', () => {
		const text = formatFeedback({ ...stored, note: 'a\u202eb\u200bc\u2066d' }, 'x.json');
		expect(text).toContain('Note    : abcd');
	});
});

describe('retours — la route du serveur de dev', () => {
	let dir: string;
	let server: Server;
	let base: string;
	let supabaseUrl: string | undefined;
	let vercel: string | undefined;
	let remote: string | undefined;

	beforeEach(async () => {
		dir = mkdtempSync(join(tmpdir(), 'retours-'));
		supabaseUrl = 'http://127.0.0.1:54321';
		vercel = undefined;
		remote = undefined;
		const middleware = createFeedbackMiddleware({
			dir,
			supabaseUrl: () => supabaseUrl,
			vercel: () => vercel,
			remoteAddress: () => remote
		});
		server = createServer((req, res) => {
			middleware(req, res, () => {
				res.statusCode = 299;
				res.end('suite');
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise((resolve) => server.close(resolve));
		rmSync(dir, { recursive: true, force: true });
	});

	function send(body: unknown, headers: Record<string, string> = {}) {
		return fetch(base + FEEDBACK_ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: base, ...headers },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
	}

	it('écrit le retour dans le dossier, avec sa date de réception', async () => {
		const response = await send(VALID);
		expect(response.status).toBe(201);
		const files = readdirSync(dir);
		expect(files).toHaveLength(1);
		const stored = JSON.parse(readFileSync(join(dir, files[0] ?? ''), 'utf8'));
		expect(stored.note).toBe(VALID.note);
		expect(stored.account).toEqual(VALID.account);
		expect(typeof stored.receivedAt).toBe('string');
	});

	it('laisse passer les autres adresses au serveur de dev', async () => {
		const response = await fetch(base + '/dashboard', { method: 'POST', body: '{}' });
		expect(response.status).toBe(299);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse hors base locale, sans rien écrire', async () => {
		supabaseUrl = 'https://abcdefgh.supabase.co';
		expect((await send(VALID)).status).toBe(403);
		supabaseUrl = undefined;
		expect((await send(VALID)).status).toBe(403);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse une connexion venue d’une autre machine (serveur lancé avec --host)', async () => {
		remote = '192.168.1.20';
		expect((await send(VALID)).status).toBe(403);
		remote = '100.64.0.7';
		expect((await send(VALID)).status).toBe(403);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse un corps trop gros envoyé par morceaux, sans longueur annoncée', async () => {
		const chunk = 'a'.repeat(64 * 1024);
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('"'));
				for (let i = 0; i < MAX_BODY_BYTES / chunk.length + 4; i++)
					controller.enqueue(new TextEncoder().encode(chunk));
				controller.close();
			}
		});
		const response = await fetch(base + FEEDBACK_ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: base },
			body,
			// @ts-expect-error option de Node pour un corps envoyé en flux
			duplex: 'half'
		}).catch(() => null);
		if (response) expect(response.status).toBe(413);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse sur Vercel, même avec une base à l’air locale', async () => {
		vercel = '1';
		expect((await send(VALID)).status).toBe(403);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse une autre origine, un JSON cassé, une entrée invalide', async () => {
		expect((await send(VALID, { origin: 'https://autre.exemple.com' })).status).toBe(403);
		expect((await send('{pas du json')).status).toBe(400);
		expect((await send({ ...VALID, note: 'a'.repeat(MAX_NOTE + 1) })).status).toBe(400);
		expect((await send({ note: 'seule' })).status).toBe(400);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('refuse un corps trop gros sans le garder en mémoire', async () => {
		const response = await send('"' + 'a'.repeat(MAX_BODY_BYTES + 10) + '"').catch(() => null);
		// Connexion coupée ou 413 : dans les deux cas, rien n'est écrit
		if (response) expect(response.status).toBe(413);
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it(`ne garde que les ${MAX_FILES} retours les plus récents`, async () => {
		for (let i = 0; i < MAX_FILES + 2; i++) {
			const stamp = new Date(Date.UTC(2020, 0, 1, 0, 0, i));
			writeFileSync(join(dir, feedbackFileName(stamp, 'vieux0')), '{}');
		}
		expect((await send(VALID)).status).toBe(201);
		const files = readdirSync(dir).sort();
		expect(files).toHaveLength(MAX_FILES);
		// Le plus ancien est parti, le nouveau est là
		expect(files).not.toContain(
			feedbackFileName(new Date(Date.UTC(2020, 0, 1, 0, 0, 0)), 'vieux0')
		);
		expect(files.at(-1)?.startsWith('2020')).toBe(false);
	});

	it('ne touche qu’à ses propres fichiers en faisant le ménage', async () => {
		writeFileSync(join(dir, 'notes-de-david.txt'), 'à garder');
		expect((await send(VALID)).status).toBe(201);
		expect(readdirSync(dir)).toContain('notes-de-david.txt');
	});
});

describe('retours — lecture et build', () => {
	it('liste les retours du plus récent au plus ancien', () => {
		const dir = mkdtempSync(join(tmpdir(), 'retours-'));
		try {
			const a = feedbackFileName(new Date('2026-11-22T10:00:00.000Z'), 'aaaaaa');
			const b = feedbackFileName(new Date('2026-11-22T11:00:00.000Z'), 'bbbbbb');
			writeFileSync(join(dir, a), '{}');
			writeFileSync(join(dir, b), '{}');
			writeFileSync(join(dir, 'autre.txt'), '');
			expect(latestFeedbackFiles(dir)).toEqual([b, a]);
			expect(latestFeedbackFiles(join(dir, 'absent'))).toEqual([]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('le plugin ne s’applique qu’au serveur de dev, jamais au build', () => {
		expect(retoursDev().apply).toBe('serve');
	});

	it('aucune route SvelteKit ne porte cette adresse (elle serait dans le build)', () => {
		// Le bouton n'est chargé que sous `import.meta.env.DEV` : garde de build dans la CI
		// (étape « Bouton signaler absent du build » de quality.yml).
		const layout = readFileSync('src/routes/+layout.svelte', 'utf8');
		expect(layout).toMatch(/if \(import\.meta\.env\.DEV\)[^}]*SignalerButton\.svelte/s);
		expect(layout).not.toMatch(/^\s*import [^;]*SignalerButton/m);
	});
});
