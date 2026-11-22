/**
 * Les serveurs de dev du Mac, vus du système
 * ==========================================
 *
 * Racine du worktree courant, serveurs `node` qui écoutent et dossier d'où ils
 * ont été lancés, fichiers d'environnement, environnement du process serveur.
 * Partagé par `pnpm voir` et `pnpm lien`. Lecture seule : rien n'est lancé ni
 * arrêté ici.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { ENV_FILES, type DevServer } from './logique';

// Functions

/** Racine du worktree courant, chemin réel. */
export function worktreeRoot(): string {
	try {
		const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
		return realpathSync(root.trim());
	} catch {
		return realpathSync(process.cwd());
	}
}

/** Les process `node` qui écoutent en local, avec le dossier d'où ils ont été lancés. */
export function listDevServers(): DevServer[] {
	let listing = '';
	try {
		listing = execFileSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-a', '-c', 'node', '-Fpn'], {
			encoding: 'utf8'
		});
	} catch {
		// lsof sort en 1 quand rien n'écoute
		return [];
	}
	const ports = new Map<number, Set<number>>();
	let pid = 0;
	for (const line of listing.split('\n')) {
		if (line.startsWith('p')) pid = Number(line.slice(1));
		else if (line.startsWith('n')) {
			const port = Number(line.slice(line.lastIndexOf(':') + 1));
			if (!Number.isInteger(port)) continue;
			const known = ports.get(pid) ?? new Set<number>();
			known.add(port);
			ports.set(pid, known);
		}
	}
	const servers: DevServer[] = [];
	for (const [serverPid, serverPorts] of ports) {
		let cwd = '';
		try {
			const out = execFileSync('lsof', ['-a', '-p', String(serverPid), '-d', 'cwd', '-Fn'], {
				encoding: 'utf8'
			});
			cwd =
				out
					.split('\n')
					.find((line) => line.startsWith('n'))
					?.slice(1) ?? '';
		} catch {
			continue;
		}
		if (!cwd) continue;
		for (const port of serverPorts) servers.push({ port, cwd, pid: serverPid });
	}
	return servers;
}

/** Contenu des fichiers d'environnement du worktree qui passent devant `.env`. */
export function readEnvFiles(root: string): string[] {
	const contents: string[] = [];
	for (const file of ENV_FILES) {
		try {
			contents.push(readFileSync(join(root, file), 'utf8'));
		} catch {
			// Fichier absent
		}
	}
	return contents;
}

/** Environnement du process serveur à son lancement. Illisible → `null` (refus). */
export function readServerEnv(pid: number | undefined): string | null {
	if (pid === undefined) return null;
	try {
		return execFileSync('ps', ['eww', '-o', 'command=', '-p', String(pid)], { encoding: 'utf8' });
	} catch {
		return null;
	}
}
