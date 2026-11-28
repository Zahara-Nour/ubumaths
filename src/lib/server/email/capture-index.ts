/**
 * Index des courriels capturés en local (`capture.ts`)
 * ====================================================
 *
 * Lecture seule, sans `$env` : les tests Playwright (`e2e/verifs/`) l'importent
 * tels quels pour lire les courriels que le serveur de dev a capturés.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export const CAPTURE_INDEX_FILE = 'index.jsonl';

export interface CapturedEmail {
	date: string;
	to: string;
	subject: string;
	/** Nom du fichier `.html`, relatif au dossier de capture. */
	file: string;
	headers?: Record<string, string>;
}

const capturedEmailSchema = z.object({
	date: z.string().max(40),
	to: z.string().max(320),
	subject: z.string().max(1000),
	file: z.string().max(200),
	headers: z.record(z.string(), z.string()).optional()
});

/** Les courriels capturés dans `dir`, dans l'ordre d'envoi (dossier absent → aucun). */
export async function readCaptureIndex(dir: string): Promise<CapturedEmail[]> {
	let raw: string;
	try {
		raw = await readFile(join(dir, CAPTURE_INDEX_FILE), 'utf8');
	} catch {
		return [];
	}
	const emails: CapturedEmail[] = [];
	for (const line of raw.split('\n')) {
		if (!line.trim()) continue;
		// Ligne tronquée (écriture interrompue) : ignorée, les autres restent lisibles.
		let value: unknown;
		try {
			value = JSON.parse(line);
		} catch {
			continue;
		}
		const parsed = capturedEmailSchema.safeParse(value);
		if (parsed.success) emails.push(parsed.data);
	}
	return emails;
}
