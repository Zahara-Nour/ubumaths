/**
 * `pnpm deploy:prod` — la seule porte vers la prod (ADR 0021)
 * ===========================================================
 *
 * Vercel ne déploie que la branche `production`. Le script l'avance jusqu'au
 * dernier commit de main vérifié par la CI. Ce qui est gardé ici :
 * - seul un commit au « CI Summary » vert part en prod ;
 * - les commits de doc qui le suivent sont enjambés (ils n'ont pas de CI) ;
 * - CI en cours, rouge, ou commit de code sans CI → rien n'est poussé ;
 * - jamais de force-push : une production qui a divergé arrête tout ;
 * - `--essai` ne pousse rien.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) et `gh` remplacé par un
 * bouchon qui lit l'état de la CI de chaque commit dans un fichier. Comme dans
 * vercel-ignore-build.test.ts, git ne tourne jamais hors du dossier jetable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	appendFileSync,
	chmodSync,
	mkdtempSync,
	mkdirSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../deploy-prod.sh');

let racine: string;
let github: string;
let local: string;
let etats: string;
let numero = 0;

function env(): NodeJS.ProcessEnv {
	return {
		...process.env,
		PATH: `${join(racine, 'bin')}:${process.env.PATH}`,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		ETATS_CI: etats
	};
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): string {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
	return r.stdout.trim();
}

/** Un commit poussé sur main ; `ci` = état de « CI Summary » (absent par défaut). */
function pousser(ci: string | null, ...fichiers: string[]): string {
	for (const f of fichiers) {
		mkdirSync(dirname(join(local, f)), { recursive: true });
		writeFileSync(join(local, f), `${f} ${++numero}\n`);
	}
	git(local, 'add', '-A');
	git(local, 'commit', '-q', '-m', fichiers.join(' '));
	git(local, 'push', '-q', 'origin', 'HEAD:main');
	const sha = git(local, 'rev-parse', 'HEAD');
	if (ci) appendFileSync(etats, `${sha} ${ci}\n`);
	return sha;
}

function production(): string | null {
	const r = spawnSync('git', ['rev-parse', '-q', '--verify', 'refs/heads/production'], {
		cwd: dansLeBac(github),
		env: env(),
		encoding: 'utf8'
	});
	return r.status === 0 ? r.stdout.trim() : null;
}

function deployer(...args: string[]) {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: dansLeBac(local),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'deploy-prod-')));
	github = join(racine, 'github.git');
	local = join(racine, 'local');
	etats = join(racine, 'etats-ci');
	writeFileSync(etats, '');
	mkdirSync(github);
	mkdirSync(local);
	mkdirSync(join(racine, 'bin'));
	// Bouchon de `gh api …/commits/<sha>/check-runs` : rend l'état noté pour ce SHA.
	writeFileSync(
		join(racine, 'bin/gh'),
		`#!/bin/bash
sha=$(printf '%s\\n' "$@" | grep -oE 'commits/[0-9a-f]+' | head -1 | cut -d/ -f2)
etat=$(grep "^$sha " "$ETATS_CI" | tail -1 | cut -d' ' -f2)
echo "\${etat:-absent}"
`
	);
	chmodSync(join(racine, 'bin/gh'), 0o755);
	git(github, 'init', '-q', '--bare');
	git(github, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	git(local, 'init', '-q');
	git(local, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	git(local, 'remote', 'add', 'origin', `file://${github}`);
	pousser('success', 'src/app.ts');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('deploy-prod.sh — ce qui part en prod', () => {
	it('crée production sur le dernier commit vert', () => {
		const vert = pousser('success', 'src/a.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('Création de la branche production');
		expect(production()).toBe(vert);
	});

	it('enjambe les commits de doc sans CI qui suivent le dernier commit vert', () => {
		const vert = pousser('success', 'src/a.ts');
		pousser(null, 'docs/wip/journal.md');
		pousser(null, 'CLAUDE.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('enjambé');
		expect(production()).toBe(vert);
	});

	it('avance production en avance rapide et liste ce qui est livré', () => {
		pousser('success', 'src/a.ts');
		deployer();
		const b = pousser('success', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('Livraison de 1 commit(s)');
		expect(r.sortie).toContain('src/b.ts');
		expect(production()).toBe(b);
	});

	it('déjà à jour : rien à livrer', () => {
		pousser('success', 'src/a.ts');
		deployer();
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('déjà');
	});

	it('--essai montre la livraison sans rien pousser', () => {
		pousser('success', 'src/a.ts');
		const r = deployer('--essai');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain("rien n'est poussé");
		expect(production()).toBeNull();
	});
});

describe('deploy-prod.sh — ce qui arrête tout, sans rien pousser', () => {
	it('CI en cours sur la pointe', () => {
		pousser('success', 'src/a.ts');
		pousser('pending', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('CI en cours');
		expect(production()).toBeNull();
	});

	it('CI rouge sur la pointe', () => {
		pousser('success', 'src/a.ts');
		pousser('failure', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('failure');
		expect(production()).toBeNull();
	});

	it('commit de code sans CI', () => {
		pousser('success', 'src/a.ts');
		pousser(null, 'package.json');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Commit de code sans');
		expect(production()).toBeNull();
	});

	it('un article du Shtam (.md sous src/) sans CI n’est pas de la doc', () => {
		pousser('success', 'src/a.ts');
		pousser(null, 'src/lib/server/shtam/articles/32.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Commit de code sans');
	});

	it('production a divergé : jamais de force-push', () => {
		pousser('success', 'src/a.ts');
		git(local, 'push', '-q', 'origin', 'HEAD:refs/heads/production');
		git(local, 'commit', '-q', '--allow-empty', '-m', 'divergent');
		git(local, 'push', '-q', '-f', 'origin', 'HEAD:refs/heads/production');
		const avant = production();
		git(local, 'reset', '-q', '--hard', 'HEAD~1');
		pousser('success', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("n'est pas un ancêtre");
		expect(production()).toBe(avant);
	});
});
