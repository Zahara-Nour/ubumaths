/**
 * Libérer de la place sur le disque
 * =================================
 *
 * `scripts/liberer-disque.sh` (`pnpm disque:liberer`). Gardé ici :
 * - --essai ne supprime rien et ne lance aucun nettoyage ;
 * - versions de Claude Code : l'actuelle et celles en usage gardées, les autres supprimées ;
 * - worktree fini (travail dans origin/main, rien de modifié, aucun processus dedans) :
 *   listé avec la commande pour le retirer, jamais retiré ; les autres jamais listés.
 *
 * `df`, `docker`, `brew`, `pnpm`, `lsof` sont des faux posés en tête du PATH ; git est réel,
 * dans un dépôt jetable avec un distant.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../liberer-disque.sh');

let racine: string;
let faux: string;
let principal: string;
let versions: string;

const ENV_GIT = {
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'test',
	GIT_AUTHOR_EMAIL: 'test@example.com',
	GIT_COMMITTER_NAME: 'test',
	GIT_COMMITTER_EMAIL: 'test@example.com'
};

function git(cwd: string, ...args: string[]): void {
	const r = spawnSync('git', args, {
		cwd,
		env: { ...process.env, ...ENV_GIT, HOME: racine, GIT_CEILING_DIRECTORIES: dirname(racine) },
		encoding: 'utf8'
	});
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function ecrireFaux(nom: string, corps: string): void {
	const chemin = join(faux, nom);
	writeFileSync(chemin, `#!/bin/bash\n${corps}\n`);
	chmodSync(chemin, 0o755);
}

/** Pose les faux outils ; <enUsage> : fichiers ouverts (lsof -t), <cwd> : dossiers courants. */
function machine(enUsage: string[] = [], cwd: string[] = []): void {
	writeFileSync(join(racine, 'usage.txt'), enUsage.join('\n') + '\n');
	writeFileSync(
		join(racine, 'cwd.txt'),
		['/', ...cwd].map((d) => `p1\nfcwd\nn${d}`).join('\n') + '\n'
	);
	ecrireFaux(
		'df',
		`echo 'Filesystem 1024-blocks Used Available Capacity Mounted on'\necho "/dev/x 1000 500 500 50% $2"`
	);
	ecrireFaux(
		'docker',
		`printf '%s\\n' "docker $*" >>"${racine}/appels.log"; [ "$1" = ps ] && echo supabase_db_test; exit 0`
	);
	ecrireFaux('ps', 'exit 0'); // aucune session Claude
	for (const outil of ['brew', 'pnpm']) {
		ecrireFaux(outil, `printf '%s\\n' "${outil} $*" >>"${racine}/appels.log"; exit 0`);
	}
	ecrireFaux(
		'lsof',
		`case "$*" in *-p*-t*) echo 42; exit 0 ;; *-t*) f="\${@: -1}"; grep -qxF "$f" "${racine}/usage.txt" && echo 42; exit 0 ;; *cwd*) cat "${racine}/cwd.txt" ;; esac`
	);
}

function lancer(args: string[] = []) {
	return spawnSync('bash', [SCRIPT, ...args], {
		cwd: racine,
		env: {
			...process.env,
			...ENV_GIT,
			PATH: `${faux}:${process.env.PATH ?? ''}`,
			HOME: racine,
			GIT_CEILING_DIRECTORIES: dirname(racine),
			SURVEILLANCE_DEPOT: principal,
			SURVEILLANCE_DISQUE: racine,
			BILAN_PREBOOT: racine,
			LIBERER_VERSIONS_CLAUDE: versions,
			LIBERER_LIEN_CLAUDE: join(racine, 'lien-claude'),
			LIBERER_CACHE_VSCODE: join(racine, 'vscode'),
			LIBERER_CACHE_BRAVE: join(racine, 'brave')
		},
		encoding: 'utf8'
	});
}

function appels(): string {
	const f = join(racine, 'appels.log');
	return existsSync(f) ? readFileSync(f, 'utf8') : '';
}

/** Un worktree <nom> parti de main, branche <nom>. */
function worktree(nom: string): string {
	const d = join(racine, `wt-${nom}`);
	git(principal, 'worktree', 'add', '-q', '-b', nom, d, 'main');
	return d;
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'liberer-')));
	faux = join(racine, 'faux');
	mkdirSync(faux);
	principal = join(racine, 'principal');
	mkdirSync(principal);
	git(principal, 'init', '-q', '-b', 'main');
	writeFileSync(join(principal, 'a.txt'), 'a\n');
	git(principal, 'add', 'a.txt');
	git(principal, 'commit', '-q', '-m', 'init');
	git(racine, 'init', '-q', '--bare', join(racine, 'distant.git'));
	git(principal, 'remote', 'add', 'origin', join(racine, 'distant.git'));
	git(principal, 'push', '-q', 'origin', 'main');
	versions = join(racine, 'versions');
	mkdirSync(versions);
	for (const v of ['2.1.1', '2.1.2', '2.1.3', '2.1.4']) writeFileSync(join(versions, v), 'x');
	symlinkSync(join(versions, '2.1.4'), join(racine, 'lien-claude'));
	mkdirSync(join(racine, 'vscode'));
	writeFileSync(join(racine, 'vscode', 'maj.zip'), 'x');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('liberer-disque', () => {
	it('--essai : ne supprime rien, ne lance aucun nettoyage', () => {
		machine();
		const r = lancer(['--essai']);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('(essai)');
		expect(appels()).not.toMatch(/prune|cleanup/); // `docker info` (lecture) seulement
		for (const v of ['2.1.1', '2.1.2', '2.1.3']) expect(existsSync(join(versions, v))).toBe(true);
		expect(existsSync(join(racine, 'vscode', 'maj.zip'))).toBe(true);
	});

	it('nettoie : Docker, Homebrew, pnpm, VS Code, versions de Claude Code inutilisées', () => {
		machine([join(versions, '2.1.2')]);
		const r = lancer();
		expect(r.status).toBe(0);
		expect(appels()).toContain('docker image prune -a -f');
		expect(appels()).toContain('brew cleanup --prune=all');
		expect(appels()).toContain('pnpm store prune');
		expect(existsSync(join(racine, 'vscode', 'maj.zip'))).toBe(false);
		expect(existsSync(join(racine, 'vscode'))).toBe(true);
		// 2.1.4 = actuelle, 2.1.2 = en usage : gardées
		expect(existsSync(join(versions, '2.1.1'))).toBe(false);
		expect(existsSync(join(versions, '2.1.3'))).toBe(false);
		expect(existsSync(join(versions, '2.1.2'))).toBe(true);
		expect(existsSync(join(versions, '2.1.4'))).toBe(true);
		expect(r.stdout).toContain('Claude Code (2 versions : 2.1.1 2.1.3)');
	});

	it('worktrees : seul le fini est listé, avec sa commande, et jamais retiré', () => {
		// fini : un commit à lui, mergé dans main et poussé
		const fini = worktree('fini');
		writeFileSync(join(fini, 'f.txt'), 'f\n');
		git(fini, 'add', 'f.txt');
		git(fini, 'commit', '-q', '-m', 'travail fini');
		git(principal, 'merge', '-q', '--no-ff', '-m', 'merge', 'fini');
		git(principal, 'push', '-q', 'origin', 'main');
		// neuf : créé depuis main, aucun commit — pas fini, à peine commencé
		const neuf = worktree('neuf');
		const modifie = worktree('modifie');
		writeFileSync(join(modifie, 'a.txt'), 'changé\n');
		const enAvance = worktree('en-avance');
		writeFileSync(join(enAvance, 'b.txt'), 'b\n');
		git(enAvance, 'add', 'b.txt');
		git(enAvance, 'commit', '-q', '-m', 'travail');
		const occupe = worktree('occupe');
		machine([], [join(occupe, 'src')]);
		const r = lancer(['--essai']);
		expect(r.stdout).toContain('worktree fini : wt-fini');
		expect(r.stdout).toContain(
			`git -C "${principal}" worktree remove "${fini}" && git -C "${principal}" branch -d fini`
		);
		expect(r.stdout).not.toContain('wt-modifie');
		expect(r.stdout).not.toContain(neuf);
		expect(r.stdout).not.toContain('wt-en-avance');
		expect(r.stdout).not.toContain('wt-occupe');
		lancer();
		expect(existsSync(fini)).toBe(true);
	});

	it('lien vers la version actuelle illisible : aucune version supprimée', () => {
		machine();
		rmSync(join(racine, 'lien-claude'));
		const r = lancer();
		expect(r.stdout).toContain('Claude Code : version actuelle ou lsof illisibles, sauté');
		for (const v of ['2.1.1', '2.1.2', '2.1.3', '2.1.4'])
			expect(existsSync(join(versions, v))).toBe(true);
	});

	it('version la plus récente gardée même si le lien pointe sur une plus ancienne', () => {
		machine();
		rmSync(join(racine, 'lien-claude'));
		symlinkSync(join(versions, '2.1.3'), join(racine, 'lien-claude'));
		lancer();
		expect(existsSync(join(versions, '2.1.4'))).toBe(true);
		expect(existsSync(join(versions, '2.1.3'))).toBe(true);
		expect(existsSync(join(versions, '2.1.1'))).toBe(false);
	});

	it('Docker : pile Supabase arrêtée → images épargnées', () => {
		machine();
		ecrireFaux('docker', `printf '%s\\n' "docker $*" >>"${racine}/appels.log"; exit 0`);
		const r = lancer();
		expect(r.stdout).toContain('pile Supabase arrêtée, sauté');
		expect(appels()).not.toContain('docker image prune');
	});

	it('étape en échec : dit ÉCHEC, pas « 0,0 Go »', () => {
		machine();
		ecrireFaux('brew', 'exit 1');
		expect(lancer().stdout).toMatch(/Homebrew \(cache, anciennes versions\)\s+ÉCHEC/);
	});

	it('refuse un argument inconnu', () => {
		machine();
		expect(lancer(['--tout']).status).toBe(2);
		expect(appels()).toBe('');
	});
});
