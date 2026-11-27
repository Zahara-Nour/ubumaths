import { mkdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Verrou entre fichiers qui partagent les mêmes comptes élèves
 * =============================================================
 *
 * Deux fichiers qui photographient puis remettent les lignes des mêmes élèves ne
 * doivent pas tourner en même temps. Un verrou = un dossier créé par `mkdir`
 * non récursif (atomique : un seul appelant le crée). Un verrou de plus de 30 min est
 * considéré abandonné (passage interrompu) et repris : un fichier qui dure plus longtemps
 * rafraîchit le sien à chaque test (`refreshLock`).
 *
 * Le dossier est le même pour toute la machine (`~/.local/state/verifs/verrous`,
 * `VERIFS_VERROUS` pour un autre) : il n'y a qu'une base locale, et deux worktrees
 * (tâche de nuit comprise) qui jouent les vérifications doivent se voir.
 */

const RETRY_MS = 500;
const WAIT_MAX_MS = 30 * 60 * 1000;
const STALE_MS = 30 * 60 * 1000;

/** Durée max d'attente du verrou : à ajouter au délai du `beforeAll` (`testInfo.setTimeout`). */
export const LOCK_WAIT_MAX_MS = WAIT_MAX_MS;

/** Le dossier des verrous, partagé par tous les worktrees de la machine. */
export function locksDir(): string {
	return process.env.VERIFS_VERROUS ?? join(homedir(), '.local/state/verifs/verrous');
}

function lockPath(name: string): string {
	return join(locksDir(), name);
}

function isStale(path: string): boolean {
	try {
		return Date.now() - statSync(path).mtimeMs > STALE_MS;
	} catch {
		return false;
	}
}

export async function acquireLock(name: string): Promise<void> {
	mkdirSync(locksDir(), { recursive: true });
	const path = lockPath(name);
	const deadline = Date.now() + WAIT_MAX_MS;
	for (;;) {
		try {
			mkdirSync(path);
			return;
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
		}
		if (isStale(path)) {
			rmSync(path, { recursive: true, force: true });
			continue;
		}
		if (Date.now() > deadline) {
			throw new Error(
				`Verrou « ${name} » toujours pris après ${WAIT_MAX_MS / 60000} min : un autre fichier de vérifs tient les mêmes élèves (dossier ${path}).`
			);
		}
		await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
	}
}

/** Redonne 30 min au verrou tenu : à appeler en `beforeEach` d'un fichier long. */
export function refreshLock(name: string): void {
	const now = new Date();
	try {
		utimesSync(lockPath(name), now, now);
	} catch {
		// Verrou absent : rien à rafraîchir
	}
}

export function releaseLock(name: string): void {
	rmSync(lockPath(name), { recursive: true, force: true });
}
