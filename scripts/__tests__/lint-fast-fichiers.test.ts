/**
 * Lint rapide : quels fichiers relire
 * ===================================
 *
 * `scripts/lint-fast-fichiers.sh` choisit les fichiers que `lint-fast.sh` relit.
 * Au push (`--push`), seulement ceux des commits qui partent : le dépôt
 * principal est partagé par toutes les sessions, et le brouillon `.ts` non
 * suivi de l'une bloquait le push de doc de toutes les autres (2026-10-18).
 * Gardé ici :
 * - `--push` : fichiers des commits non encore sur origin/main, jamais un non suivi ;
 * - sans option (usage à la main) : les non suivis restent relus ;
 * - `--staged` : l'index seul ;
 * - seulement des `.ts` / `.svelte` qui existent encore.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) : git ne tourne jamais
 * hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../lint-fast-fichiers.sh');

let racine: string;
let depot: string;

function env(): NodeJS.ProcessEnv {
	return {
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
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (reel !== racine && !reel.startsWith(racine + sep))
		throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(...args: string[]): void {
	const r = spawnSync('git', args, { cwd: dansLeBac(depot), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function ecrire(fichier: string): void {
	const chemin = join(depot, fichier);
	mkdirSync(dirname(chemin), { recursive: true });
	writeFileSync(chemin, 'export const x = 1;\n');
}

function commit(fichier: string): void {
	ecrire(fichier);
	git('add', fichier);
	git('commit', '-q', '-m', fichier);
}

/** Les fichiers retenus, triés */
function fichiers(...args: string[]): string[] {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: dansLeBac(depot),
		env: env(),
		encoding: 'utf8'
	});
	if (r.status !== 0) throw new Error(`lint-fast-fichiers → ${r.status}\n${r.stderr}`);
	return r.stdout.split('\n').filter(Boolean).sort();
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'lint-fast-fichiers-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	const github = join(racine, 'github.git');
	depot = join(racine, 'depot');
	mkdirSync(github);
	mkdirSync(depot);
	spawnSync('git', ['init', '-q', '--bare', '-b', 'main', github], { env: env() });
	git('init', '-q', '-b', 'main');
	git('remote', 'add', 'origin', github);
	commit('src/deja-publie.ts');
	git('push', '-q', 'origin', 'main');
});

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('lint-fast-fichiers', () => {
	it('--push : le brouillon non suivi d’une autre session n’est pas relu', () => {
		ecrire('docs/wip/releve.ts');
		commit('docs/wip/ma-doc.md');
		expect(fichiers('--push')).toEqual([]);
	});

	it('--push : un fichier commité qui part est relu', () => {
		ecrire('docs/wip/releve.ts');
		commit('src/nouveau.ts');
		commit('src/Composant.svelte');
		expect(fichiers('--push')).toEqual(['src/Composant.svelte', 'src/nouveau.ts']);
	});

	it('--push : ce qui est déjà sur origin/main n’est pas relu', () => {
		expect(fichiers('--push')).toEqual([]);
	});

	it('--push : un fichier commité puis supprimé n’est pas relu', () => {
		commit('src/ephemere.ts');
		git('rm', '-q', 'src/ephemere.ts');
		git('commit', '-q', '-m', 'retrait');
		expect(fichiers('--push')).toEqual([]);
	});

	it('sans option (à la main) : les non suivis restent relus', () => {
		ecrire('src/tout-neuf.ts');
		commit('src/commite.ts');
		expect(fichiers()).toEqual(['src/commite.ts', 'src/tout-neuf.ts']);
	});

	it('--staged : l’index seul', () => {
		ecrire('src/non-suivi.ts');
		ecrire('src/indexe.ts');
		git('add', 'src/indexe.ts');
		expect(fichiers('--staged')).toEqual(['src/indexe.ts']);
	});
});
