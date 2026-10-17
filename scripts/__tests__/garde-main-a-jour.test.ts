/**
 * Hook pre-commit : pas de commit sur un main en retard
 * =====================================================
 *
 * `scripts/garde-main-a-jour.sh` refuse un commit sur main quand origin/main a
 * des commits que le main local n'a pas : le `git pull --rebase` se fait AVANT
 * le commit (incident du 2026-10-13, main divergé et deploy:prod bloqué).
 * Gardé ici :
 * - main à jour, ou en avance → passe ;
 * - main en retard → refusé, avec le nombre de commits et la marche à suivre ;
 * - branche de chantier en retard → passe (elle suit main par merge) ;
 * - commit qui conclut un merge → passe ;
 * - sans origin, ou en CI → passe : le garde-fou n'empêche pas de travailler.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) : git ne tourne jamais
 * hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../garde-main-a-jour.sh');

let racine: string;
let github: string;
let moi: string;
let autre: string;

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
	// La CI elle-même pose CI=true : sans ce retrait, le script y passerait toujours
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

function commit(cwd: string, fichier: string): void {
	writeFileSync(join(cwd, fichier), `${fichier}\n`);
	git(cwd, 'add', fichier);
	git(cwd, 'commit', '-q', '-m', fichier);
}

function garde(cwd: string, extra: NodeJS.ProcessEnv = {}) {
	const r = spawnSync('bash', [SCRIPT], { cwd: dansLeBac(cwd), env: env(extra), encoding: 'utf8' });
	return { status: r.status, stderr: r.stderr };
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-main-a-jour-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	github = join(racine, 'github.git');
	moi = join(racine, 'moi');
	autre = join(racine, 'autre');
	mkdirSync(github);
	git(github, 'init', '-q', '--bare', '-b', 'main');
	mkdirSync(moi);
	git(moi, 'init', '-q', '-b', 'main');
	git(moi, 'remote', 'add', 'origin', github);
	commit(moi, 'init.md');
	git(moi, 'push', '-q', 'origin', 'main');
	git(racine, 'clone', '-q', github, autre);
});

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('garde-main-a-jour', () => {
	it('main à jour, ou en avance sur origin/main : passe', () => {
		expect(garde(moi).status).toBe(0);
		commit(moi, 'ma-doc.md');
		expect(garde(moi).status).toBe(0);
	});

	it('main en retard : refusé, avec le nombre de commits et la marche à suivre', () => {
		commit(autre, 'doc-autre-1.md');
		commit(autre, 'doc-autre-2.md');
		git(autre, 'push', '-q', 'origin', 'main');
		const r = garde(moi);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/2 commit\(s\) de retard/);
		expect(r.stderr).toMatch(/git pull --rebase/);
		expect(r.stderr).toMatch(/prévenir David/);
	});

	it('après le pull --rebase, le commit passe', () => {
		commit(autre, 'doc-autre.md');
		git(autre, 'push', '-q', 'origin', 'main');
		git(moi, 'pull', '-q', '--rebase', 'origin', 'main');
		expect(garde(moi).status).toBe(0);
	});

	it('branche de chantier en retard : passe', () => {
		commit(autre, 'doc-autre.md');
		git(autre, 'push', '-q', 'origin', 'main');
		git(moi, 'switch', '-q', '-c', 'feat/x');
		expect(garde(moi).status).toBe(0);
	});

	it('le commit qui conclut un merge : passe, même en retard', () => {
		commit(autre, 'doc-autre.md');
		git(autre, 'push', '-q', 'origin', 'main');
		git(moi, 'fetch', '-q', 'origin');
		git(moi, 'merge', '-q', '--no-commit', '--no-ff', 'origin/main');
		expect(garde(moi).status).toBe(0);
	});

	it('sans origin, ou en CI : passe', () => {
		commit(autre, 'doc-autre.md');
		git(autre, 'push', '-q', 'origin', 'main');
		expect(garde(moi, { CI: 'true' }).status).toBe(0);
		git(moi, 'remote', 'remove', 'origin');
		expect(garde(moi).status).toBe(0);
	});
});
