/**
 * Capture des courriels en local
 * ==============================
 *
 * Sur la base LOCALE, aucun courriel ne part chez Brevo : `.env` porte la clé
 * de prod, et une adresse de parent saisie en local recevrait un vrai
 * courriel. Chaque courriel est écrit dans un dossier (par défaut
 * `.captures/courriels/`, ignoré par git) : un fichier `.html` lisible dans le
 * navigateur, et une ligne dans `index.jsonl` que lisent les tests Playwright.
 *
 * La capture exige DEUX signes du local : l'adresse de la base Supabase est
 * `localhost` / `127.0.0.1` (ou le Mac mini par le tailnet, `*.ts.net`), et
 * l'appli ne tourne pas sur Vercel. Au moindre doute (adresse absente,
 * illisible), c'est l'envoi réel : en prod, une capture avalerait les
 * courriels des parents sans bruit.
 *
 * `EMAIL_ENVOI_REEL=1` (dans `.env.local`) rétablit l'envoi réel en local.
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as env from '$app/env/private';
import * as publicEnv from '$app/env/public';
import { CAPTURE_INDEX_FILE, readCaptureIndex, type CapturedEmail } from './capture-index';

export type { CapturedEmail } from './capture-index';

export const DEFAULT_CAPTURE_DIR = '.captures/courriels';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Le Mac mini joint par le tailnet (tester-sur-un-autre-appareil.md) : base locale aussi. */
const TAILNET_SUFFIX = '.ts.net';

/** Vrai si la base Supabase visée est locale (sinon, ou au moindre doute : faux). */
function isLocalDatabase(): boolean {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	if (!url) return false;
	try {
		const host = new URL(url).hostname;
		return LOCAL_HOSTS.has(host) || host.endsWith(TAILNET_SUFFIX);
	} catch {
		return false;
	}
}

/** Vrai quand les courriels doivent être capturés au lieu d'être envoyés. */
export function isEmailCaptureActive(): boolean {
	if (env.VERCEL) return false;
	if (env.EMAIL_ENVOI_REEL === '1') return false;
	return isLocalDatabase();
}

function captureDir(): string {
	return resolve(env.EMAIL_CAPTURE_DIR || DEFAULT_CAPTURE_DIR);
}

/** Nom de fichier sûr et trié dans l'ordre d'envoi. */
function fileName(date: Date, subject: string): string {
	const slug =
		subject
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60) || 'courriel';
	const stamp = date.toISOString().replace(/[:.]/g, '-');
	const random = Math.random().toString(36).slice(2, 8);
	return `${stamp}-${random}-${slug}.html`;
}

/** Écrit le courriel dans le dossier de capture ; lève si l'écriture échoue. */
export async function captureEmail(email: {
	to: string;
	subject: string;
	html: string;
	text?: string;
	headers?: Record<string, string>;
}): Promise<CapturedEmail> {
	const dir = captureDir();
	await mkdir(dir, { recursive: true });
	const date = new Date();
	const file = fileName(date, email.subject);
	await writeFile(join(dir, file), email.html, 'utf8');
	if (email.text !== undefined) {
		await writeFile(join(dir, file.replace(/\.html$/, '.txt')), email.text, 'utf8');
	}
	const entry: CapturedEmail = {
		date: date.toISOString(),
		to: email.to,
		subject: email.subject,
		file,
		...(email.headers ? { headers: email.headers } : {})
	};
	await appendFile(join(dir, CAPTURE_INDEX_FILE), JSON.stringify(entry) + '\n', 'utf8');
	return entry;
}

/** Les courriels capturés, dans l'ordre d'envoi (dossier absent → aucun). */
export async function readCapturedEmails(dir: string = captureDir()): Promise<CapturedEmail[]> {
	return readCaptureIndex(dir);
}
