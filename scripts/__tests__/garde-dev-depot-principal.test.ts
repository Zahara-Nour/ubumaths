/**
 * Garde de `pnpm dev` : pas de serveur de dev dans le dépôt principal
 * ===================================================================
 *
 * `scripts/garde-dev-depot-principal.sh` passe devant `vite dev` (incident du
 * 2026-11-19 : un serveur laissé dans le dépôt principal a gelé le Mac mini).
 * Gardé ici :
 * - dépôt principal → refusé, avec la marche à suivre ;
 * - sous-dossier du dépôt principal → refusé aussi ;
 * - worktree lié → passe ;
 * - hors dépôt git, ou en CI → passe.
 *
 * Dépôts jetables : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../garde-dev-depot-principal.sh');

let racine: string;
let principal: string;

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	const base: NodeJS.ProcessEnv = {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com'
	};
	// La CI pose CI=true : sans ce retrait, la garde y passerait toujours
	delete base.CI;
	return { ...base, ...extra };
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (reel !== racine && !reel.startsWith(racine + sep))
		throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): void {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function garde(cwd: string, extra: NodeJS.ProcessEnv = {}) {
	return spawnSync('bash', [SCRIPT], { cwd: dansLeBac(cwd), env: env(extra), encoding: 'utf8' });
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-dev-')));
	principal = join(racine, 'principal');
	mkdirSync(principal);
	git(principal, 'init', '-q', '-b', 'main');
	writeFileSync(join(principal, 'a.txt'), 'a\n');
	git(principal, 'add', 'a.txt');
	git(principal, 'commit', '-q', '-m', 'init');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('garde-dev-depot-principal', () => {
	it('refuse dans le dépôt principal, avec la marche à suivre', () => {
		const r = garde(principal);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('Pas de serveur de dev dans le dépôt principal');
		expect(r.stderr).toContain('worktree');
	});

	it('refuse aussi depuis un sous-dossier du dépôt principal', () => {
		const sous = join(principal, 'src');
		mkdirSync(sous);
		expect(garde(sous).status).toBe(1);
	});

	it('laisse passer dans un worktree lié', () => {
		const lie = join(racine, 'wt');
		git(principal, 'worktree', 'add', '-q', '-b', 'chantier', lie);
		const r = garde(lie);
		expect(r.status).toBe(0);
		expect(r.stderr).toBe('');
	});

	it('laisse passer hors dépôt git', () => {
		const ailleurs = join(racine, 'ailleurs');
		mkdirSync(ailleurs);
		expect(garde(ailleurs).status).toBe(0);
	});

	it('laisse passer en CI', () => {
		expect(garde(principal, { CI: 'true' }).status).toBe(0);
	});
});
